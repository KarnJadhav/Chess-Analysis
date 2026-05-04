import type { NextApiRequest, NextApiResponse } from 'next';

type ChessComProfileResponse = {
  username: string;
  avatar?: string;
  country?: string;
  title?: string;
};

type ChessComStatsResponse = {
  chess_rapid?: { last?: { rating?: number } };
  chess_blitz?: { last?: { rating?: number } };
  chess_bullet?: { last?: { rating?: number } };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const usernameParam = typeof req.query.username === 'string' ? req.query.username : '';
  const username = usernameParam.trim().toLowerCase();

  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  try {
    const [profileRes, statsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`),
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`),
    ]);

    if (!profileRes.ok) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const profile = (await profileRes.json()) as ChessComProfileResponse;
    const stats = statsRes.ok ? ((await statsRes.json()) as ChessComStatsResponse) : {};

    return res.status(200).json({
      username: profile.username,
      avatar: profile.avatar || null,
      country: profile.country || null,
      title: profile.title || null,
      ratings: {
        rapid: stats.chess_rapid?.last?.rating ?? null,
        blitz: stats.chess_blitz?.last?.rating ?? null,
        bullet: stats.chess_bullet?.last?.rating ?? null,
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch';
    return res.status(500).json({ error: errorMsg });
  }
}
