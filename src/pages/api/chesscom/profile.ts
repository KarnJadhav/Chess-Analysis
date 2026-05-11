import type { NextApiRequest, NextApiResponse } from 'next';

type ChessComProfileResponse = {
  username: string;
  avatar?: string;
  country?: string;
  title?: string;
  followers?: number;
  joined?: number;
  status?: string;
};

type ChessComStatsRecord = {
  win?: number;
  loss?: number;
  draw?: number;
};

type ChessComStatsResponse = {
  chess_rapid?: { last?: { rating?: number }; record?: ChessComStatsRecord };
  chess_blitz?: { last?: { rating?: number }; record?: ChessComStatsRecord };
  chess_bullet?: { last?: { rating?: number }; record?: ChessComStatsRecord };
};

type ChessComArchivesResponse = {
  archives?: string[];
};

type ChessComGame = {
  url?: string;
  end_time?: number;
  time_class?: string;
  pgn?: string;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
};

type ChessComGamesResponse = {
  games?: ChessComGame[];
};

type CacheEntry = {
  timestamp: number;
  data: unknown;
};

const CACHE_TTL_MS = 1000 * 60 * 30;
const globalForCache = global as typeof globalThis & {
  chesscomProfileCache?: Map<string, CacheEntry>;
};
const chesscomProfileCache = globalForCache.chesscomProfileCache ?? new Map<string, CacheEntry>();
globalForCache.chesscomProfileCache = chesscomProfileCache;

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function getRecordTotals(record?: ChessComStatsRecord) {
  const wins = record?.win ?? 0;
  const losses = record?.loss ?? 0;
  const draws = record?.draw ?? 0;
  const total = wins + losses + draws;
  return { wins, losses, draws, total };
}

function parseFirstMove(pgn?: string): string | null {
  if (!pgn) return null;
  const match = pgn.match(/\n1\.\s*([^\s]+)/);
  return match?.[1] ?? null;
}

function parseFullMoves(pgn?: string): number | null {
  if (!pgn) return null;
  const matches = pgn.match(/\b(\d+)\./g);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const value = Number(last.replace('.', ''));
  return Number.isFinite(value) ? value : null;
}

function classifyGameResult(result?: string): 'win' | 'loss' | 'draw' {
  if (!result) return 'loss';
  if (result === 'win') return 'win';
  const draws = new Set([
    'agreed',
    'repetition',
    'stalemate',
    'insufficient',
    '50move',
    'timevsinsufficient',
    'draw',
  ]);
  return draws.has(result) ? 'draw' : 'loss';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const usernameParam = typeof req.query.username === 'string' ? req.query.username : '';
  const username = normalizeUsername(usernameParam);

  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  const cacheKey = `chesscom:${username}`;
  const cached = chesscomProfileCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json(cached.data);
  }

  try {
    const [profileRes, statsRes, archivesRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`),
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`),
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`),
    ]);

    if (!profileRes.ok) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const profile = (await profileRes.json()) as ChessComProfileResponse;
    const stats = statsRes.ok ? ((await statsRes.json()) as ChessComStatsResponse) : {};

    const ratings = {
      rapid: stats.chess_rapid?.last?.rating ?? null,
      blitz: stats.chess_blitz?.last?.rating ?? null,
      bullet: stats.chess_bullet?.last?.rating ?? null,
    };

    const statsSummary = {
      rapid: stats.chess_rapid?.record ?? null,
      blitz: stats.chess_blitz?.record ?? null,
      bullet: stats.chess_bullet?.record ?? null,
    };

    const archivesPayload = archivesRes.ok ? ((await archivesRes.json()) as ChessComArchivesResponse) : { archives: [] };
    const archives = archivesPayload.archives ?? [];

    let recentGames: ChessComGame[] = [];
    if (archives.length > 0) {
      const latestArchive = archives[archives.length - 1];
      const gamesRes = await fetch(latestArchive);
      if (gamesRes.ok) {
        const gamesPayload = (await gamesRes.json()) as ChessComGamesResponse;
        recentGames = (gamesPayload.games ?? []).slice(-12).reverse();
      }
    }

    const normalizedUsername = profile.username?.toLowerCase() ?? username;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalMoves = 0;
    let movesCounted = 0;
    let opponentRatingTotal = 0;
    let opponentCount = 0;
    const openingCounts = new Map<string, number>();

    const recentGamesSummary = recentGames.map((game) => {
      const isWhite = (game.white?.username ?? '').toLowerCase() === normalizedUsername;
      const player = isWhite ? game.white : game.black;
      const opponent = isWhite ? game.black : game.white;
      const result = classifyGameResult(player?.result);
      const moves = parseFullMoves(game.pgn) ?? undefined;
      const firstMove = parseFirstMove(game.pgn) ?? undefined;

      if (result === 'win') wins += 1;
      if (result === 'loss') losses += 1;
      if (result === 'draw') draws += 1;

      if (typeof opponent?.rating === 'number') {
        opponentRatingTotal += opponent.rating;
        opponentCount += 1;
      }

      if (moves) {
        totalMoves += moves;
        movesCounted += 1;
      }

      if (firstMove) {
        openingCounts.set(firstMove, (openingCounts.get(firstMove) ?? 0) + 1);
      }

      return {
        url: game.url ?? null,
        endTime: game.end_time ?? null,
        timeClass: game.time_class ?? null,
        result,
        opponent: {
          username: opponent?.username ?? null,
          rating: opponent?.rating ?? null,
        },
        side: isWhite ? 'white' : 'black',
        moves: moves ?? null,
      };
    });

    const totalRecent = wins + losses + draws;
    const winRate = totalRecent ? Math.round((wins / totalRecent) * 100) : 0;
    const drawRate = totalRecent ? Math.round((draws / totalRecent) * 100) : 0;
    const lossRate = totalRecent ? Math.round((losses / totalRecent) * 100) : 0;
    const avgMoves = movesCounted ? totalMoves / movesCounted : null;
    const avgOpponentRating = opponentCount ? Math.round(opponentRatingTotal / opponentCount) : null;

    const bestFormat = Object.entries(ratings)
      .filter(([, rating]) => typeof rating === 'number')
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? null;

    const mostPlayedOpening = [...openingCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    let playStyle = 'Balanced';
    if (avgMoves !== null && avgMoves < 25) playStyle = 'Aggressive';
    if (avgMoves !== null && avgMoves > 45) playStyle = 'Positional';
    if (drawRate >= 40) playStyle = 'Solid';

    const insights = {
      playStyle,
      bestFormat,
      winRate,
      drawRate,
      lossRate,
      averageOpponentRating: avgOpponentRating,
      preferredFirstMove: mostPlayedOpening,
      summary:
        totalRecent > 0
          ? `Best format: ${bestFormat ?? 'N/A'} with a ${winRate}% win rate in recent games.`
          : 'Not enough recent games to compute insights yet.',
    };

    const responsePayload = {
      profile: {
        username: profile.username,
        avatar: profile.avatar || null,
        country: profile.country || null,
        title: profile.title || null,
        followers: profile.followers ?? null,
        joined: profile.joined ?? null,
        status: profile.status ?? null,
      },
      ratings,
      stats: statsSummary,
      games: recentGamesSummary,
      insights,
    };

    chesscomProfileCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    return res.status(200).json(responsePayload);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch';
    return res.status(500).json({ error: errorMsg });
  }
}
