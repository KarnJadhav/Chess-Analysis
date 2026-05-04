import 'bootstrap/dist/css/bootstrap.min.css';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Game } from '@/models/Game';
import { loadWasmStockfish, evaluateFenWithWasm } from '@/lib/wasmStockfish';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';

type SelectedGameAnalysis = {
  moveEvals?: number[];
  accuracyWhite?: number;
  accuracyBlack?: number;
  timeline?: {
    move: number;
    eval: number;
    classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
  }[];
  criticalPositions?: {
    moveNumber: number;
    classification?: 'blunder' | 'mistake' | 'inaccuracy' | string;
  }[];
  misses?: number[];
  reviewedMoves?: {
    moveNumber: number;
    san: string;
    bestMove: string;
    evalBefore: number;
    evalAfter: number;
    evalDrop: number;
    side: 'white' | 'black';
    phase: 'opening' | 'middlegame' | 'endgame';
    classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
    comment: string;
    aiComment?: string;
  }[];
  reviewSummary?: {
    opening: string;
    middlegame: string;
    endgame: string;
  };
  playerSummary?: {
    white: {
      accuracy: number;
      blunders: number;
      mistakes: number;
      inaccuracies: number;
      misses: number;
      bestMoves: number;
      greatMoves: number;
      brilliantMoves: number;
    };
    black: {
      accuracy: number;
      blunders: number;
      mistakes: number;
      inaccuracies: number;
      misses: number;
      bestMoves: number;
      greatMoves: number;
      brilliantMoves: number;
    };
  };
  estimatedRating?: {
    white: number;
    black: number;
  };
  review?: {
    timeline?: {
      move: number;
      eval: number;
      classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
    }[];
    reviewedMoves?: {
      moveNumber: number;
      san: string;
      bestMove: string;
      evalBefore: number;
      evalAfter: number;
      evalDrop: number;
      side: 'white' | 'black';
      phase: 'opening' | 'middlegame' | 'endgame';
      classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
      comment: string;
      aiComment?: string;
    }[];
    reviewSummary?: {
      opening: string;
      middlegame: string;
      endgame: string;
    };
    playerSummary?: {
      white: {
        accuracy: number;
        blunders: number;
        mistakes: number;
        inaccuracies: number;
        misses: number;
        bestMoves: number;
        greatMoves: number;
        brilliantMoves: number;
      };
      black: {
        accuracy: number;
        blunders: number;
        mistakes: number;
        inaccuracies: number;
        misses: number;
        bestMoves: number;
        greatMoves: number;
        brilliantMoves: number;
      };
    };
    estimatedRating?: {
      white: number;
      black: number;
    };
  };
  aiReview?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    turningPoints: string[];
    improvementSuggestions: string[];
    coachMessage?: string;
  };
  aiReviewStatus?: string;
  aiReviewError?: string;
};

function normalizeEvalCpToPawns(evalCp: number): number {
  const pawns = evalCp / 100;
  return Math.max(-10, Math.min(10, pawns));
}

function getPieceUnicode(piece: { type: string; color: 'w' | 'b' }): string {
  const map: Record<string, string> = {
    p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
    P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔',
  };
  const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
  return map[key] || '';
}

function uciToSan(chess: Chess, uci: string): string {
  if (!uci || uci.length < 4) return '';
  try {
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length >= 5 ? uci[4] : undefined,
    });
    const san = move?.san || '';
    chess.undo();
    return san;
  } catch {
    return '';
  }
}

type ViewerMove = {
  from: string;
  to: string;
  san: string;
};
type ChessComProfile = {
  username: string;
  avatar?: string | null;
  country?: string | null;
  title?: string | null;
  ratings?: {
    rapid?: number | null;
    blitz?: number | null;
    bullet?: number | null;
  };
};
function normalizeChessComUsername(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

const classificationColors: Record<string, string> = {
  brilliant: '#20c997',
  great: '#198754',
  best: '#0d6efd',
  excellent: '#2f80ed',
  good: '#0dcaf0',
  inaccuracy: '#ffc107',
  mistake: '#fd7e14',
  miss: '#f59f00',
  blunder: '#dc3545',
};

const classificationIcons: Record<string, string> = {
  brilliant: '!!',
  great: '!',
  best: '✓',
  excellent: '✓',
  good: '·',
  inaccuracy: '?!',
  mistake: '?',
  miss: 'x',
  blunder: '??',
};

type MoveClassification = 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';

function isBrilliantMove(evalBefore: number, evalAfter: number, drop: number, side: 'white' | 'black'): boolean {
  const evalBeforeSide = side === 'white' ? evalBefore : -evalBefore;
  const evalAfterSide = side === 'white' ? evalAfter : -evalAfter;
  const improvement = evalAfterSide - evalBeforeSide;
  return drop < 20 && improvement > 200 && evalBeforeSide < 100 && evalAfterSide > 300;
}

function classifyMove(
  drop: number,
  evalBefore: number,
  evalAfter: number,
  side: 'white' | 'black',
  isBest: boolean
): MoveClassification {
  const evalBeforeSide = side === 'white' ? evalBefore : -evalBefore;
  const evalAfterSide = side === 'white' ? evalAfter : -evalAfter;

  if (evalAfterSide <= -25000) return 'blunder';

  // Missed a winning continuation.
  if (evalBeforeSide >= 200 && evalAfterSide <= 100 && !isBest) return 'miss';

  if (drop >= 300) return 'blunder';
  if (drop >= 150) return 'mistake';
  if (drop >= 80) return evalBeforeSide >= 200 ? 'mistake' : 'miss';

  if (isBrilliantMove(evalBefore, evalAfter, drop, side)) return 'brilliant';

  if (evalBeforeSide > 800 && evalAfterSide < 200) return 'miss';

  if (isBest && drop < 10) return 'best';
  if (drop < 40) return 'excellent';
  if (drop < 90) return 'good';
  if (drop < 200) return 'inaccuracy';
  if (drop < 400) return 'mistake';
  return 'blunder';
}

function getClassificationLabel(classification: MoveClassification): string {
  switch (classification) {
    case 'brilliant':
      return 'Brilliant';
    case 'great':
      return 'Great';
    case 'best':
      return 'Best';
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'inaccuracy':
      return 'Inaccuracy';
    case 'mistake':
      return 'Mistake';
    case 'miss':
      return 'Miss';
    case 'blunder':
      return 'Blunder';
    default:
      return classification;
  }
}

function calcAccuracyFromAcpl(acpl: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - acpl / 4)));
}

type EngineEval = {
  cp: number;
  bestMove: string;
  mate?: number;
};

function toEngineScore(result: { cp?: number; mate?: number }): number {
  if (typeof result.cp === 'number') {
    return result.cp;
  }
  if (typeof result.mate === 'number') {
    return result.mate > 0 ? 30000 : -30000;
  }
  return 0;
}

async function evaluatePositionsWithPool(
  positions: { fen: string; sideToMove: 'w' | 'b' }[],
  enginePool: Awaited<ReturnType<typeof loadWasmStockfish>>[],
  depth: number,
  timeout: number,
  onProgress?: (done: number, total: number) => void
) {
  const results: EngineEval[] = new Array(positions.length);
  let cursor = 0;
  let completed = 0;

  await Promise.all(
    enginePool.map(async (engine) => {
      while (true) {
        const currentIndex = cursor;
        cursor += 1;
        if (currentIndex >= positions.length) {
          break;
        }

        const result = await evaluateFenWithWasm(engine, positions[currentIndex].fen, depth, timeout);
        const scoreFromSide = toEngineScore(result);
        results[currentIndex] = {
          cp: positions[currentIndex].sideToMove === 'w' ? scoreFromSide : -scoreFromSide,
          bestMove: result.best || '',
          mate: result.mate,
        };

        completed += 1;
        onProgress?.(completed, positions.length);
      }
    })
  );

  return results;
}

async function analyzePgnInBrowser(
  pgn: string,
  onProgress?: (done: number, total: number) => void
) {
  const quickDepth = 12;
  const deepDepth = 20;
  const quickTimeout = 6000;
  const deepTimeout = 10000;

  const chess = new Chess();
  chess.loadPgn(pgn);
  const verboseMoves = chess.history({ verbose: true });

  const replay = new Chess();
  replay.loadPgn(pgn);
  replay.reset();

  const fens: string[] = [replay.fen()];
  const sideToMove: Array<'w' | 'b'> = [replay.turn()];
  const sans: string[] = [];
  for (const mv of verboseMoves) {
    sans.push(mv.san);
    replay.move(mv);
    fens.push(replay.fen());
    sideToMove.push(replay.turn());
  }

  const enginePoolSize = typeof navigator !== 'undefined'
    ? Math.max(2, Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)))
    : 2;

  const engines = await Promise.all(
    Array.from({ length: enginePoolSize }, () => loadWasmStockfish())
  );

  try {
    const positions = fens.map((fen, index) => ({ fen, sideToMove: sideToMove[index] }));

    // Fast scan: low depth across all positions, parallelized across a small engine pool.
    const quickPass = await evaluatePositionsWithPool(positions, engines, quickDepth, quickTimeout, onProgress);

    const criticalIndices = new Set<number>();
    for (let i = 0; i < sans.length; i++) {
      const evalBefore = quickPass[i].cp;
      const evalAfter = quickPass[i + 1].cp;
      const evalDrop = i % 2 === 0 ? Math.max(0, evalBefore - evalAfter) : Math.max(0, evalAfter - evalBefore);
      const isEndgame = i >= Math.max(0, sans.length - 8);
      const isOpening = i < 8;
      if (isOpening || isEndgame || evalDrop >= 35 || quickPass[i].mate !== undefined || quickPass[i + 1].mate !== undefined) {
        criticalIndices.add(i);
        criticalIndices.add(i + 1);
      }
    }

    // Deep scan only on positions that actually matter.
    const refinedPositions = Array.from(criticalIndices)
      .sort((left, right) => left - right)
      .map((index) => positions[index]);
    const refinedEvals = refinedPositions.length > 0
      ? await evaluatePositionsWithPool(refinedPositions, engines, deepDepth, deepTimeout)
      : [];

    const refinedByFen = new Map<string, EngineEval>();
    refinedPositions.forEach((position, index) => {
      const refined = refinedEvals[index];
      if (refined) {
        refinedByFen.set(position.fen, refined);
      }
    });

    const positionEvals = quickPass.map((entry, index) => {
      const refined = refinedByFen.get(positions[index].fen);
      return refined || entry;
    });

    const reviewedMoves: Array<{
    moveNumber: number;
    san: string;
    bestMove: string;
    evalBefore: number;
    evalAfter: number;
    evalDrop: number;
    side: 'white' | 'black';
    phase: 'opening' | 'middlegame' | 'endgame';
    classification: MoveClassification;
    comment: string;
  }> = [];

    const timeline: Array<{ move: number; eval: number; classification: MoveClassification }> = [];
    const criticalPositions: Array<{ moveNumber: number; classification: string }> = [];
    const blunders: number[] = [];
    const mistakes: number[] = [];
    const inaccuracies: number[] = [];
    const misses: number[] = [];

    let whiteDropSum = 0;
    let blackDropSum = 0;
    let whiteMoves = 0;
    let blackMoves = 0;

    const chessBefore = new Chess();
    chessBefore.loadPgn(pgn);
    chessBefore.reset();

    for (let i = 0; i < sans.length; i++) {
      const side = i % 2 === 0 ? 'white' : 'black';
      const evalBefore = positionEvals[i].cp;
      const evalAfter = positionEvals[i + 1].cp;
      const evalDrop = side === 'white' ? Math.max(0, evalBefore - evalAfter) : Math.max(0, evalAfter - evalBefore);
      const bestMoveSan = uciToSan(chessBefore, positionEvals[i].bestMove || '');
      const isBest = bestMoveSan !== '' && bestMoveSan === sans[i];
      const classification = classifyMove(evalDrop, evalBefore, evalAfter, side, isBest);

      if (side === 'white') {
        whiteDropSum += evalDrop;
        whiteMoves++;
      } else {
        blackDropSum += evalDrop;
        blackMoves++;
      }

      if (classification === 'blunder') blunders.push(i + 1);
      if (classification === 'mistake') mistakes.push(i + 1);
      if (classification === 'inaccuracy') inaccuracies.push(i + 1);
      if (classification === 'miss') misses.push(i + 1);
      if (classification === 'blunder' || classification === 'mistake' || classification === 'inaccuracy' || classification === 'miss') {
        criticalPositions.push({ moveNumber: i + 1, classification });
      }

      const moveRatio = (i + 1) / Math.max(1, sans.length);
      const phase = moveRatio <= 0.25 ? 'opening' : moveRatio >= 0.75 ? 'endgame' : 'middlegame';
      reviewedMoves.push({
        moveNumber: i + 1,
        san: sans[i],
        bestMove: bestMoveSan || positionEvals[i].bestMove || 'N/A',
        evalBefore,
        evalAfter,
        evalDrop,
        side,
        phase,
        classification,
        comment:
          classification === 'blunder'
            ? 'Large evaluation swing after this move.'
            : classification === 'mistake'
              ? 'Significant error that cost advantage.'
              : classification === 'miss'
                ? 'You missed a stronger continuation here.'
                : classification === 'inaccuracy'
                  ? 'Small but meaningful loss of position value.'
                  : classification === 'brilliant'
                    ? 'Creative and strong move that improves the position.'
                    : classification === 'great'
                      ? 'Strong move that keeps or increases advantage.'
                      : 'Solid move with limited loss.',
      });

      timeline.push({
        move: i + 1,
        eval: evalAfter,
        classification,
      });

      try {
        chessBefore.move(sans[i]);
      } catch {
        // ignore SAN sync issues
      }
    }

    const whiteAcpl = whiteMoves > 0 ? Math.round(whiteDropSum / whiteMoves) : 0;
    const blackAcpl = blackMoves > 0 ? Math.round(blackDropSum / blackMoves) : 0;
    const accuracyWhite = calcAccuracyFromAcpl(Math.max(10, whiteAcpl));
    const accuracyBlack = calcAccuracyFromAcpl(Math.max(10, blackAcpl));
    const accuracy = Math.round((accuracyWhite + accuracyBlack) / 2);

    const playerSummary = {
      white: {
        accuracy: accuracyWhite,
        blunders: reviewedMoves.filter((m) => m.side === 'white' && m.classification === 'blunder').length,
        mistakes: reviewedMoves.filter((m) => m.side === 'white' && m.classification === 'mistake').length,
        inaccuracies: reviewedMoves.filter((m) => m.side === 'white' && m.classification === 'inaccuracy').length,
        misses: reviewedMoves.filter((m) => m.side === 'white' && m.classification === 'miss').length,
        bestMoves: reviewedMoves.filter((m) => m.side === 'white' && m.classification === 'best').length,
        greatMoves: reviewedMoves.filter((m) => m.side === 'white' && (m.classification === 'great' || m.classification === 'excellent')).length,
        brilliantMoves: reviewedMoves.filter((m) => m.side === 'white' && m.classification === 'brilliant').length,
      },
      black: {
        accuracy: accuracyBlack,
        blunders: reviewedMoves.filter((m) => m.side === 'black' && m.classification === 'blunder').length,
        mistakes: reviewedMoves.filter((m) => m.side === 'black' && m.classification === 'mistake').length,
        inaccuracies: reviewedMoves.filter((m) => m.side === 'black' && m.classification === 'inaccuracy').length,
        misses: reviewedMoves.filter((m) => m.side === 'black' && m.classification === 'miss').length,
        bestMoves: reviewedMoves.filter((m) => m.side === 'black' && m.classification === 'best').length,
        greatMoves: reviewedMoves.filter((m) => m.side === 'black' && (m.classification === 'great' || m.classification === 'excellent')).length,
        brilliantMoves: reviewedMoves.filter((m) => m.side === 'black' && m.classification === 'brilliant').length,
      },
    };

    const phaseSummary = {
      opening: reviewedMoves.filter((m) => m.phase === 'opening'),
      middlegame: reviewedMoves.filter((m) => m.phase === 'middlegame'),
      endgame: reviewedMoves.filter((m) => m.phase === 'endgame'),
    };

    const describePhase = (phaseMoves: typeof reviewedMoves): string => {
      if (phaseMoves.length === 0) return 'N/A';
      const blundersInPhase = phaseMoves.filter((m) => m.classification === 'blunder').length;
      const mistakesInPhase = phaseMoves.filter((m) => m.classification === 'mistake' || m.classification === 'miss').length;
      const brilliantInPhase = phaseMoves.filter((m) => m.classification === 'brilliant').length;
      const greatInPhase = phaseMoves.filter((m) => m.classification === 'great').length;

      if (blundersInPhase > 0) return 'Needs work';
      if (mistakesInPhase > 1) return 'Unstable';
      if (brilliantInPhase > 0 || greatInPhase > 1) return 'Strong';
      return 'Solid';
    };

    const reviewSummary = {
      opening: describePhase(phaseSummary.opening),
      middlegame: describePhase(phaseSummary.middlegame),
      endgame: describePhase(phaseSummary.endgame),
    };

    const suggestions: string[] = [];
    if (blunders.length > 0) suggestions.push(`Reduce blunders (${blunders.length}) by checking tactical threats before moving.`);
    if (mistakes.length > 0) suggestions.push(`Review strategic decisions around mistake moves (${mistakes.length}).`);
    if (inaccuracies.length > 0) suggestions.push(`Improve precision in calm positions (${inaccuracies.length} inaccuracies).`);
    if (misses.length > 0) suggestions.push(`Look for tactical chances (${misses.length} missed opportunities).`);
    if (suggestions.length === 0) suggestions.push('Strong game quality. Keep reviewing move consistency.');

    return {
      moveEvals: positionEvals.slice(1).map((p) => p.cp),
      acpl: Math.round((whiteAcpl + blackAcpl) / 2),
      accuracy,
      accuracyWhite,
      accuracyBlack,
      blunders,
      mistakes,
      inaccuracies,
      misses,
      criticalPositions,
      reviewedMoves,
      timeline,
      reviewSummary,
      playerSummary,
      estimatedRating: {
        white: Math.max(600, Math.min(2900, Math.round(600 + accuracyWhite * 20))),
        black: Math.max(600, Math.min(2900, Math.round(600 + accuracyBlack * 20))),
      },
      suggestions,
      review: {
        timeline,
        reviewedMoves,
        reviewSummary,
        playerSummary,
        estimatedRating: {
          white: Math.max(600, Math.min(2900, Math.round(600 + accuracyWhite * 20))),
          black: Math.max(600, Math.min(2900, Math.round(600 + accuracyBlack * 20))),
        },
      },
    };
  } finally {
    engines.forEach((engine) => {
      try {
        engine?.terminate?.();
      } catch {
        // ignore cleanup issues
      }
    });
  }
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [pgn, setPgn] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Game list and filters
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [loadingGames, setLoadingGames] = useState(false);
  // Game viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);
  const [moves, setMoves] = useState<ViewerMove[]>([]);
  const [regeneratingAi, setRegeneratingAi] = useState(false);
  const movesListRef = useRef<HTMLDivElement>(null);
  const [whiteProfile, setWhiteProfile] = useState<ChessComProfile | null>(null);
  const [blackProfile, setBlackProfile] = useState<ChessComProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const whiteName = session?.user?.name || session?.user?.email || 'White';
  const blackName = selectedGame?.opponent || 'Black';

  // Profile dropdown logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Performance metrics state
  const [metrics, setMetrics] = useState({
    gamesPlayed: 0,
    winRate: 0,
    avgAcpl: 0,
    avgBlunders: 0,
    avgAccuracy: 0,
  });

  useEffect(() => {
    async function fetchMetrics() {
      if (!session) return;
      // Fetch all analyses for user's games
      const res = await fetch('/api/games/list?analysis=true', { credentials: 'include' });
      const data = await res.json();
      const games = data.games || [];
      let wins = 0;
      let acplSum = 0;
      let blunderSum = 0;
      let accuracySum = 0;
      let analyzedGames = 0;
      games.forEach((g: Game) => {
        if (g.result === '1-0') wins++;
        if (g.analysis && typeof g.analysis.acpl === 'number') {
          acplSum += g.analysis.acpl;
          blunderSum += (g.analysis as unknown as { blunders?: unknown[] }).blunders?.length || 0;
          accuracySum += (g.analysis as unknown as { accuracy?: number }).accuracy ?? 0;
          analyzedGames++;
        }
      });
      setMetrics({
        gamesPlayed: games.length,
        winRate: games.length ? Math.round((wins / games.length) * 100) : 0,
        avgAcpl: analyzedGames ? Math.round(acplSum / analyzedGames) : 0,
        avgBlunders: analyzedGames ? Math.round(blunderSum / analyzedGames) : 0,
        avgAccuracy: analyzedGames ? Math.round(accuracySum / analyzedGames) : 0,
      });
    }
    fetchMetrics();
  }, [session, games]);

  useEffect(() => {
    async function fetchGames() {
      setLoadingGames(true);
      let query = '';
      if (search) query += `search=${encodeURIComponent(search)}`;
      if (dateFilter) query += `${query ? '&' : ''}date=${encodeURIComponent(dateFilter)}`;
      if (resultFilter) query += `${query ? '&' : ''}result=${encodeURIComponent(resultFilter)}`;
      const res = await fetch(`/api/games/list${query ? '?' + query : ''}`, { credentials: 'include' });
      const data = await res.json();
      setGames(data.games || []);
      setLoadingGames(false);
    }
    if (session) fetchGames();
  }, [session, search, dateFilter, resultFilter]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfiles() {
      if (!viewerOpen || !selectedGame) return;
      setProfileError(null);

      const whiteHandle = normalizeChessComUsername(whiteName);
      const blackHandle = normalizeChessComUsername(blackName);

      if (!whiteHandle && !blackHandle) {
        setWhiteProfile(null);
        setBlackProfile(null);
        return;
      }

      try {
        const [whiteRes, blackRes] = await Promise.all([
          whiteHandle ? fetch(`/api/chesscom/profile?username=${encodeURIComponent(whiteHandle)}`) : Promise.resolve(null),
          blackHandle ? fetch(`/api/chesscom/profile?username=${encodeURIComponent(blackHandle)}`) : Promise.resolve(null),
        ]);

        const whiteData = whiteRes ? await whiteRes.json() : null;
        const blackData = blackRes ? await blackRes.json() : null;

        if (cancelled) return;

        setWhiteProfile(whiteData?.error ? null : whiteData);
        setBlackProfile(blackData?.error ? null : blackData);

        if ((whiteData && whiteData.error) || (blackData && blackData.error)) {
          setProfileError('Chess.com profile not found for one or more players.');
        }
      } catch (err) {
        if (!cancelled) {
          setProfileError('Failed to load Chess.com profiles.');
        }
      }
    }

    fetchProfiles();

    return () => {
      cancelled = true;
    };
  }, [viewerOpen, selectedGame, whiteName, blackName]);

  useEffect(() => {
    const container = movesListRef.current;
    if (!container || moveIndex === 0) return;
    const active = container.querySelector(`[data-move-index="${moveIndex}"]`);
    if (active && active instanceof HTMLElement) {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [moveIndex, viewerOpen]);

  if (!session) {
    return <div className="d-flex align-items-center justify-content-center min-vh-100 bg-primary text-white fw-bold fs-4">You must be signed in to view this page.</div>;
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setMessage('');
    try {
      const res = await fetch('/api/games/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn }),
        credentials: 'include',
      });
      const data = await res.json();

      if (data.error) {
        setMessage(data.error);
        return;
      }

      const uploadedGameId = typeof data.gameId === 'string' ? data.gameId : String(data.gameId || '');
      if (!uploadedGameId) {
        setMessage('Upload succeeded, but no game ID was returned.');
        return;
      }

      setAnalyzing(true);
      setMessage('Game uploaded. Running analysis in your browser...');

      const analysis = await analyzePgnInBrowser(pgn, (done, total) => {
        setMessage(`Analyzing with Stockfish (${done}/${total} positions)...`);
      });

      const saveRes = await fetch(`/api/games/analysis?gameId=${encodeURIComponent(uploadedGameId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gameId: uploadedGameId, analysis }),
      });
      const saveData = await saveRes.json();
      if (saveData.error) {
        throw new Error(saveData.error);
      }

      setMessage('Analysis complete and saved.');
      setPgn('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setMessage(`Analysis failed: ${errorMessage}`);
    } finally {
      setUploading(false);
      setAnalyzing(false);

      const gamesRes = await fetch('/api/games/list?analysis=true', { credentials: 'include' });
      const gamesData = await gamesRes.json();
      setGames(gamesData.games || []);
    }
  }

  // Deduplicate suggestions using Set to avoid repeats
  const uniqueSuggestions = [...new Set(games.flatMap((g: Game) => (g.analysis as unknown as { suggestions?: string[] })?.suggestions || []))];

  const selectedAnalysis = (selectedGame?.analysis as SelectedGameAnalysis | undefined) ?? undefined;
  const reviewTimeline = selectedAnalysis?.review?.timeline ?? selectedAnalysis?.timeline ?? [];
  const reviewedMoves = selectedAnalysis?.review?.reviewedMoves ?? selectedAnalysis?.reviewedMoves ?? [];
  const playerSummary = selectedAnalysis?.review?.playerSummary ?? selectedAnalysis?.playerSummary;
  const estimatedRating = selectedAnalysis?.review?.estimatedRating ?? selectedAnalysis?.estimatedRating;
  const reviewSummary = selectedAnalysis?.review?.reviewSummary ?? selectedAnalysis?.reviewSummary;

  const criticalMoveSet = new Set(
    reviewedMoves
      .filter((move) => ['blunder', 'mistake', 'miss'].includes(move.classification) || move.evalDrop >= 200)
      .map((move) => move.moveNumber)
  );

  const chartData = reviewTimeline.length > 0
    ? reviewTimeline.map((point) => ({
      move: point.move,
      eval: normalizeEvalCpToPawns(point.eval),
      classification: point.classification,
      dotColor: classificationColors[point.classification] ?? '#0d6efd',
      isCritical: criticalMoveSet.has(point.move),
    }))
    : (selectedAnalysis?.moveEvals ?? []).map((evalScore, index) => ({
      move: index + 1,
      eval: normalizeEvalCpToPawns(evalScore),
      classification: 'good',
      dotColor: classificationColors.good,
      isCritical: criticalMoveSet.has(index + 1),
    }));

  const activeReviewedMove = moveIndex > 0 ? reviewedMoves[moveIndex - 1] : undefined;
  const turningPoint = reviewedMoves
    .slice()
    .sort((left, right) => right.evalDrop - left.evalDrop)[0];
  const aiReview = selectedAnalysis?.aiReview;
  const aiReviewStatus = selectedAnalysis?.aiReviewStatus;
  const aiReviewError = selectedAnalysis?.aiReviewError;
  const aiReviewMessage = (() => {
    if (!aiReviewError) return null;
    const normalized = aiReviewError.toLowerCase();
    if (normalized.includes('status code 402') || normalized.includes(' 402')) {
      return 'AI review unavailable: OpenRouter credits or model access required.';
    }
    if (normalized.includes('status code 404') || normalized.includes(' 404')) {
      return 'AI review unavailable: model not found. Check OPENROUTER_MODELS.';
    }
    return null;
  })();

  const latestAiReviewGame = games.find((game: Game) => (game.analysis as SelectedGameAnalysis | undefined)?.aiReview);
  const latestAiReview = (latestAiReviewGame?.analysis as SelectedGameAnalysis | undefined)?.aiReview;

  function initialsFromName(name: string): string {
    const chunks = name.split(/\s+/).filter(Boolean);
    if (chunks.length === 0) return 'U';
    if (chunks.length === 1) return chunks[0].slice(0, 1).toUpperCase();
    return (chunks[0][0] + chunks[1][0]).toUpperCase();
  }

  const boardSquares = (() => {
    if (!selectedGame) {
      return [] as {
        piece: { type: string; color: 'w' | 'b' } | null;
        square: string;
      }[];
    }

    const tempChess = new Chess();
    try {
      tempChess.loadPgn(selectedGame.pgn);
    } catch (err) {
      console.error('PGN load error:', selectedGame.pgn, err);
    }

    tempChess.reset();
    for (let i = 0; i < moveIndex; i++) {
      tempChess.move(moves[i]?.san);
    }

    const board = tempChess.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const squares: {
      piece: { type: string; color: 'w' | 'b' } | null;
      square: string;
    }[] = [];

    for (let renderRow = 0; renderRow < 8; renderRow++) {
      for (let renderCol = 0; renderCol < 8; renderCol++) {
        const sourceRow = isFlipped ? 7 - renderRow : renderRow;
        const sourceCol = isFlipped ? 7 - renderCol : renderCol;
        const piece = board[sourceRow][sourceCol];
        const square = `${files[sourceCol]}${8 - sourceRow}`;

        squares.push({
          piece: piece ? { type: piece.type, color: piece.color } : null,
          square,
        });
      }
    }

    return squares;
  })();

  const lastMove = moveIndex > 0 ? moves[moveIndex - 1] : null;

  function findNextCriticalMove(currentIndex: number): number | null {
    for (let i = currentIndex; i < reviewedMoves.length; i++) {
      const classification = reviewedMoves[i]?.classification;
      if (classification === 'blunder' || classification === 'mistake' || classification === 'miss' || classification === 'inaccuracy') {
        return i + 1;
      }
    }
    return null;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPgn(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  }

  function handleDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPgn(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  }

  async function handleRegenerateAi() {
    if (!selectedGame?._id) return;
    setRegeneratingAi(true);
    try {
      const response = await fetch(`/api/games/analysis?gameId=${encodeURIComponent(selectedGame._id)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ gameId: selectedGame._id, generateAi: true, forceAi: true, useStoredAnalysis: true }),
        }
      );
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      const gamesRes = await fetch('/api/games/list?analysis=true', { credentials: 'include' });
      const gamesData = await gamesRes.json();
      setGames(gamesData.games || []);
      const updated = (gamesData.games || []).find((g: Game) => g._id === selectedGame._id) || null;
      if (updated) {
        setSelectedGame(updated);
      }
    } catch (err) {
      console.error('Failed to regenerate AI review:', err);
    } finally {
      setRegeneratingAi(false);
    }
  }

  // Wrap all dashboard JSX in a single parent element
  return (
    <div className="dashboard-root">
      {/* Analysis Progress Bar */}
      {analyzing && (
        <div className="progress my-3" style={{ height: 24 }}>
          <div className="progress-bar progress-bar-striped progress-bar-animated bg-info" style={{ width: '100%' }}>
            Analyzing game... Please wait
          </div>
        </div>
      )}
      {/* Profile Dropdown */}
      <div className="d-flex justify-content-end mb-4">
        <div className="position-relative" ref={dropdownRef}>
          <button
            className="btn btn-outline-primary fw-semibold rounded-pill px-4 py-2"
            onClick={() => setDropdownOpen((open) => !open)}
          >
            {session?.user?.email || 'Profile'} <span className="ms-2">▼</span>
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu show position-absolute end-0 mt-2 shadow rounded-3 p-3" style={{ minWidth: 220, zIndex: 100 }}>
              <div className="fw-semibold mb-2">Signed in as:</div>
              <div className="mb-3 text-break text-primary fw-bold">{session?.user?.email}</div>
              <button className="btn btn-outline-danger w-100 fw-semibold" onClick={() => signOut()}>Logout</button>
            </div>
          )}
        </div>
      </div>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            {/* Upload & Analyze Game */}
            <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 mb-4">
              <h2 className="fw-bold mb-4 text-primary text-center">Upload & Analyze Game</h2>
              <form onSubmit={handleUpload}>
                <div
                  className={`mb-3 border rounded-3 p-3 text-center ${dragActive ? 'bg-light border-primary' : 'bg-white'}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="file"
                    id="pgnFile"
                    accept=".pgn"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <label htmlFor="pgnFile" className="fw-semibold text-secondary" style={{ cursor: 'pointer' }}>
                    Drag & drop PGN file here or <span className="text-primary text-decoration-underline">choose file</span>
                  </label>
                </div>
                <label className="form-label fw-semibold">Or paste PGN</label>
                <textarea className="form-control mb-3" rows={6} value={pgn} onChange={e => setPgn(e.target.value)} required />
                <button className="btn btn-primary w-100 py-2 fw-bold" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload & Analyze'}</button>
              </form>
              {message && <div className="text-success fw-semibold text-center mt-3">{message}</div>}
            </div>
            {/* Game List */}
            <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 mb-4">
              <h2 className="fw-bold mb-4 text-primary text-center">Game List</h2>
              <div className="row mb-3">
                <div className="col-md-4 mb-2 mb-md-0">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by opponent, opening..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-4 mb-2 mb-md-0">
                  <input
                    type="date"
                    className="form-control"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={resultFilter}
                    onChange={e => setResultFilter(e.target.value)}
                  >
                    <option value="">All Results</option>
                    <option value="1-0">Win</option>
                    <option value="1/2-1/2">Draw</option>
                    <option value="0-1">Loss</option>
                  </select>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Opponent</th>
                      <th>Result</th>
                      <th>Opening</th>
                      <th>Analysis</th>
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingGames ? (
                      <tr><td colSpan={6} className="text-center">Loading...</td></tr>
                    ) : games.length === 0 ? (
                      <tr><td colSpan={6} className="text-center">No games found.</td></tr>
                    ) : (
                      games.map((game: Game) => (
                        <tr key={game._id}>
                          <td>{game.date ? new Date(game.date).toLocaleDateString() : ''}</td>
                          <td>{game.opponent}</td>
                          <td>{game.result}</td>
                          <td>{game.opening || '-'}</td>
                          <td>{game.analysisComplete ? 'Analyzed' : 'Pending'}</td>
                          <td>
                            <button
                              className="btn btn-outline-primary btn-sm me-2"
                              onClick={() => {
                                setSelectedGame(game);
                                const chessInstance = new Chess();
                                try {
                                  chessInstance.loadPgn(game.pgn);
                                } catch (err) {
                                  console.error('PGN load error:', game.pgn, err);
                                }
                                // Ensure moves are extracted from PGN
                                const allMoves = chessInstance.history({ verbose: true }).map((m) => ({
                                  from: m.from,
                                  to: m.to,
                                  san: m.san,
                                }));
                                setMoves(allMoves);
                                setMoveIndex(0);
                                setIsFlipped(false);
                                setViewerOpen(true);
                              }}
                            >View</button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={async () => {
                                if (!window.confirm('Are you sure you want to delete this game?')) return;
                                const res = await fetch(`/api/games/delete?id=${game._id}`, { method: 'DELETE', credentials: 'include' });
                                if (res.ok) {
                                  setGames(games.filter((g: Game) => g._id !== game._id));
                                } else {
                                  alert('Failed to delete game.');
                                }
                              }}
                            >Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Game Viewer Modal */}
            {viewerOpen && selectedGame && (
              <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                <div className="modal-dialog modal-lg modal-dialog-centered">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">Game Viewer</h5>
                      <button type="button" className="btn-close" onClick={() => setViewerOpen(false)}></button>
                    </div>
                    <div className="modal-body">
                      <div className="viewer-container">
                        <div className="board-container">
                          <div className="chess-board">
                            {boardSquares.map((squareData, index) => {
                              const isLight = (Math.floor(index / 8) + (index % 8)) % 2 === 0;
                              const isLastMoveSquare =
                                !!lastMove && (squareData.square === lastMove.from || squareData.square === lastMove.to);

                              return (
                                <div
                                  key={index}
                                  className="square"
                                  style={{
                                    backgroundColor: isLastMoveSquare ? '#f7ec59' : (isLight ? '#f0d9b5' : '#b58863'),
                                  }}
                                >
                                  {squareData.piece ? getPieceUnicode(squareData.piece) : ''}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="info-container">
                          <div className="game-info">
                            <div className="mb-2 fw-semibold">Opponent: {selectedGame.opponent}</div>
                            <div className="mb-2 fw-semibold">Result: {selectedGame.result}</div>
                            <div className="mb-2 fw-semibold">Opening: {selectedGame.opening}</div>
                            <div className="mb-2 fw-semibold">Date: {selectedGame.date ? new Date(selectedGame.date).toLocaleDateString() : ''}</div>
                          </div>

                          <div className="bg-dark text-white rounded-3 p-3 mb-3">
                            <div className="fw-semibold mb-2">AI Coach Summary</div>
                            {aiReview ? (
                              <>
                                {aiReview.coachMessage && (
                                  <div className="mb-2">{aiReview.coachMessage}</div>
                                )}
                                <div className="small">{aiReview.summary}</div>
                                {aiReview.improvementSuggestions?.length > 0 && (
                                  <ul className="small mt-2 mb-0">
                                    {aiReview.improvementSuggestions.slice(0, 3).map((tip, idx) => (
                                      <li key={idx}>{tip}</li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            ) : aiReviewStatus === 'failed' ? (
                              <div className="small text-warning">{aiReviewMessage || `AI review failed: ${aiReviewError || 'Unknown error'}`}</div>
                            ) : aiReviewStatus === 'skipped' ? (
                              <div className="small text-white-50">AI review skipped (missing API key).</div>
                            ) : (
                              <div className="small text-white-50">AI review unavailable. Add OpenRouter credits and click Regenerate.</div>
                            )}
                            <button
                              type="button"
                              className="btn btn-outline-light btn-sm mt-2"
                              onClick={handleRegenerateAi}
                              disabled={regeneratingAi}
                            >
                              {regeneratingAi ? 'Regenerating...' : 'Regenerate AI Review'}
                            </button>
                          </div>

                          <div className="review-summary bg-light rounded-3 p-3 border">
                            <div className="fw-semibold mb-2">Game Review</div>
                            {profileError && (
                              <div className="small text-warning mb-2">{profileError}</div>
                            )}
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-2">
                                {whiteProfile?.avatar ? (
                                  <img
                                    src={whiteProfile.avatar}
                                    alt={whiteProfile.username}
                                    width={32}
                                    height={32}
                                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                    {initialsFromName(whiteName)}
                                  </div>
                                )}
                                <div>
                                  <div className="fw-semibold">
                                    {whiteProfile?.title ? `${whiteProfile.title} ` : ''}{whiteName}
                                  </div>
                                  <div className="small text-muted">White</div>
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="fw-bold text-success">{playerSummary?.white.accuracy ?? selectedAnalysis?.accuracyWhite ?? '-'}%</div>
                                <div className="small text-muted">
                                  Rating: {whiteProfile?.ratings?.rapid ?? estimatedRating?.white ?? '-'}
                                </div>
                              </div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-2">
                                {blackProfile?.avatar ? (
                                  <img
                                    src={blackProfile.avatar}
                                    alt={blackProfile.username}
                                    width={32}
                                    height={32}
                                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                    {initialsFromName(blackName)}
                                  </div>
                                )}
                                <div>
                                  <div className="fw-semibold">
                                    {blackProfile?.title ? `${blackProfile.title} ` : ''}{blackName}
                                  </div>
                                  <div className="small text-muted">Black</div>
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="fw-bold text-success">{playerSummary?.black.accuracy ?? selectedAnalysis?.accuracyBlack ?? '-'}%</div>
                                <div className="small text-muted">
                                  Rating: {blackProfile?.ratings?.rapid ?? estimatedRating?.black ?? '-'}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="fw-semibold mb-2">Move Classifications</div>
                              <div className="d-flex justify-content-between small fw-semibold">
                                <span>Type</span>
                                <span>{whiteName}</span>
                                <span>{blackName}</span>
                              </div>
                              {[
                                { label: 'Brilliant', key: 'brilliantMoves', icon: classificationIcons.brilliant, color: classificationColors.brilliant },
                                { label: 'Great', key: 'greatMoves', icon: classificationIcons.great, color: classificationColors.great },
                                { label: 'Best', key: 'bestMoves', icon: classificationIcons.best, color: classificationColors.best },
                                { label: 'Miss', key: 'misses', icon: classificationIcons.miss, color: classificationColors.miss },
                                { label: 'Mistake', key: 'mistakes', icon: classificationIcons.mistake, color: classificationColors.mistake },
                                { label: 'Blunder', key: 'blunders', icon: classificationIcons.blunder, color: classificationColors.blunder },
                              ].map((row) => (
                                <div key={row.key} className="d-flex justify-content-between align-items-center small">
                                  <span style={{ color: row.color }}>{row.icon} {row.label}</span>
                                  <span>{(playerSummary?.white as Record<string, number> | undefined)?.[row.key] ?? 0}</span>
                                  <span>{(playerSummary?.black as Record<string, number> | undefined)?.[row.key] ?? 0}</span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3">
                              <div className="fw-semibold mb-2">Phase Feedback</div>
                              <div className="d-flex justify-content-between small">
                                <span>Opening</span>
                                <span>{reviewSummary?.opening ?? 'N/A'}</span>
                              </div>
                              <div className="d-flex justify-content-between small">
                                <span>Middlegame</span>
                                <span>{reviewSummary?.middlegame ?? 'N/A'}</span>
                              </div>
                              <div className="d-flex justify-content-between small">
                                <span>Endgame</span>
                                <span>{reviewSummary?.endgame ?? 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mb-1">
                            <button className="btn btn-outline-secondary me-2" disabled={moveIndex === 0} onClick={() => setMoveIndex(0)}>⏮️</button>
                            <button className="btn btn-outline-secondary me-2" disabled={moveIndex === 0} onClick={() => setMoveIndex(moveIndex - 1)}>◀️</button>
                            <span className="fw-bold">Move {moveIndex} / {moves.length}</span>
                            <button className="btn btn-outline-secondary ms-2" disabled={moveIndex === moves.length} onClick={() => setMoveIndex(moveIndex + 1)}>▶️</button>
                            <button className="btn btn-outline-secondary ms-2" disabled={moveIndex === moves.length} onClick={() => setMoveIndex(moves.length)}>⏭️</button>
                            <button
                              className="btn btn-outline-danger ms-2 mt-2 mt-lg-0"
                              onClick={() => {
                                const next = findNextCriticalMove(moveIndex);
                                if (next) setMoveIndex(next);
                              }}
                              disabled={reviewedMoves.length === 0}
                            >
                              Next Mistake
                            </button>
                            <button className="btn btn-outline-primary ms-2 mt-2 mt-lg-0" onClick={() => setIsFlipped((v) => !v)}>
                              {isFlipped ? 'White View' : 'Black View'}
                            </button>
                          </div>

                          <div className="moves-list" ref={movesListRef}>
                            <ol className="mb-0">
                              {moves.map((move, idx) => {
                                const moveNumber = Math.floor(idx / 2) + 1;
                                const isWhite = idx % 2 === 0;
                                const notation = `${isWhite ? moveNumber + '.' : ''} ${move.san}`;
                                const reviewMove = reviewedMoves[idx];
                                const icon = classificationIcons[reviewMove?.classification ?? 'good'] ?? '·';
                                const iconColor = classificationColors[reviewMove?.classification ?? 'good'] ?? '#0d6efd';
                                return (
                                  <li key={idx} data-move-index={idx + 1} className={idx === moveIndex - 1 ? 'fw-bold text-primary' : ''}>
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-decoration-none"
                                      onClick={() => setMoveIndex(idx + 1)}
                                    >
                                      <span className="me-2 fw-bold" style={{ color: iconColor }}>{icon}</span>
                                      <span className="text-dark">{notation}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>

                          <div className="bg-white border rounded-3 p-2">
                            <div className="fw-semibold mb-1">Move Insight</div>
                            {activeReviewedMove ? (
                              <>
                                <div className="small mb-1">
                                  <span className="badge bg-secondary me-2">{activeReviewedMove.phase}</span>
                                  <span className="badge" style={{ backgroundColor: classificationColors[activeReviewedMove.classification] ?? '#6c757d' }}>
                                    {activeReviewedMove.classification}
                                  </span>
                                </div>
                                <div className="small text-muted mb-1">Best move: {activeReviewedMove.bestMove} | Eval drop: {activeReviewedMove.evalDrop} cp</div>
                                <div className="small">{activeReviewedMove.comment}</div>
                                {activeReviewedMove.aiComment && (
                                  <div className="small mt-2">
                                    <span className="fw-semibold">AI Coach:</span> {activeReviewedMove.aiComment}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="small text-muted">Select a move to see review feedback.</div>
                            )}
                          </div>

                          <div className="graph bg-light rounded-3 p-3 shadow-sm">
                            <span className="fw-semibold">Evaluation Graph</span>
                            {chartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="move" />
                                  <YAxis domain={[-10, 10]} />
                                  <ReferenceLine y={0} stroke="#6c757d" strokeDasharray="4 4" />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="eval" stroke="#0d6efd" strokeWidth={2} dot={false} />
                                  {chartData.map((point) => (
                                    <ReferenceDot
                                      key={`review-${point.move}`}
                                      x={point.move}
                                      y={point.eval}
                                      r={4}
                                      fill={point.dotColor}
                                      stroke={point.dotColor}
                                    />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="text-muted mt-2">No evaluation data available yet.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Performance Metrics */}
            <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 mb-4">
              <h2 className="fw-bold mb-4 text-primary text-center">Performance Metrics</h2>
              <div className="row text-center">
                <div className="col-6 col-md-3 mb-3">
                  <div className="fw-bold fs-4">{metrics.gamesPlayed}</div>
                  <div className="text-secondary">Games Played</div>
                </div>
                <div className="col-6 col-md-3 mb-3">
                  <div className="fw-bold fs-4">{metrics.winRate}%</div>
                  <div className="text-secondary">Win Rate</div>
                </div>
                <div className="col-6 col-md-3 mb-3">
                  <div className="fw-bold fs-4">{metrics.avgAcpl}</div>
                  <div className="text-secondary">Avg ACPL</div>
                </div>
                <div className="col-6 col-md-3 mb-3">
                  <div className="fw-bold fs-4">{metrics.avgBlunders}</div>
                  <div className="text-secondary">Blunders/Game</div>
                </div>
              </div>
              <div className="row text-center">
                <div className="col-12 mb-2">
                  <div className="fw-bold fs-4">{metrics.avgAccuracy}%</div>
                  <div className="text-secondary">Avg Accuracy</div>
                </div>
              </div>
            </div>
            {/* Analytics & Suggestions */}
            <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 mb-4">
              <h2 className="fw-bold mb-4 text-primary text-center">Analytics & Suggestions</h2>
              <div className="row">
                <div className="col-12 col-md-4 mb-3">
                  <div className="bg-info bg-opacity-10 border border-info rounded-3 p-4 shadow-sm" style={{ minHeight: '200px' }}>
                    <h5 className="fw-bold text-info mb-3">📊 ACPL & Blunders</h5>
                    <ul className="mb-0 text-dark" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {games.length === 0 ? (
                        <li className="text-muted">No games analyzed yet.</li>
                      ) : (
                        games.map((g: Game, idx: number) => (
                          <li key={idx} className="mb-2">
                            <strong>Game {idx + 1}:</strong> ACPL: <span className="text-danger fw-bold">{(g.analysis as unknown as { acpl?: number })?.acpl ?? '-'}</span>, Accuracy: <span className="text-success fw-bold">{(g.analysis as unknown as { accuracy?: number })?.accuracy ?? '-'}%</span>, Blunders: <span className="text-warning fw-bold">{((g.analysis as unknown as { blunders?: unknown[] })?.blunders?.length) ?? 0}</span>
                            <div className="small text-muted">
                              White: {(g.analysis as unknown as { accuracyWhite?: number })?.accuracyWhite ?? '-'}% | Black: {(g.analysis as unknown as { accuracyBlack?: number })?.accuracyBlack ?? '-'}%
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
                <div className="col-12 col-md-4 mb-3">
                  <div className="bg-success bg-opacity-10 border border-success rounded-3 p-4 shadow-sm" style={{ minHeight: '200px' }}>
                    <h5 className="fw-bold text-success mb-3">💡 Suggestions</h5>
                    {latestAiReview ? (
                      <div className="mb-3">
                        <div className="small fw-semibold text-dark">AI Coach</div>
                        <div className="small text-muted">{latestAiReview.summary}</div>
                        {latestAiReview.improvementSuggestions?.length > 0 && (
                          <ul className="small mt-2 mb-0">
                            {latestAiReview.improvementSuggestions.slice(0, 3).map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                    <ul className="mb-0 text-dark" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {games.length === 0 ? (
                        <li className="text-muted">No suggestions yet.</li>
                      ) : uniqueSuggestions.length === 0 ? (
                        <li className="text-muted">No suggestions yet.</li>
                      ) : (
                        uniqueSuggestions.map((s: string, idx: number) => (
                          <li key={idx} className="mb-2">✓ {s}</li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
                <div className="col-12 col-md-4 mb-3">
                  <div className="bg-warning bg-opacity-10 border border-warning rounded-3 p-4 shadow-sm" style={{ minHeight: '200px' }}>
                    <h5 className="fw-bold text-warning mb-3">🏁 Endgame Insights</h5>
                    <ul className="mb-0 text-dark" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {games.length === 0 ? (
                        <li className="text-muted">No endgame insights yet.</li>
                      ) : (
                        games.map((g: Game, idx: number) => (
                          <li key={idx} className="mb-2">
                            Game {idx + 1}: {(g.analysis as unknown as { endgameReached?: boolean })?.endgameReached ? <span className="badge bg-warning text-dark">Endgame reached</span> : <span className="badge bg-secondary">No endgame</span>}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
