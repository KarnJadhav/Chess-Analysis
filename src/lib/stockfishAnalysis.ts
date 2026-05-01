import { Chess } from 'chess.js';
import clientPromise from '@/lib/mongodb';
import { config } from '@/lib/config';
import { detectOpeningFromMoves } from '@/lib/openings';
import {
  buildReview,
  type ReviewedMove,
  type TimelinePoint,
  type PlayerSummary,
  type EstimatedRating,
} from '@/lib/reviewBuilder';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisResult {
  acpl: number;
  acplWhite: number;
  acplBlack: number;
  accuracy: number;
  accuracyWhite: number;
  accuracyBlack: number;
  blunders: MoveAnnotation[];
  mistakes: MoveAnnotation[];
  inaccuracies: MoveAnnotation[];
  suggestions: string[];
  analysisComplete: boolean;
  endgameReached: boolean;
  fullMoves: number;
  moveEvals: number[];       // White-perspective cp after each half-move
  criticalPositions: CriticalPosition[];
  reviewedMoves: ReviewedMove[];
  timeline: TimelinePoint[];
  playerSummary: PlayerSummary;
  estimatedRating: EstimatedRating;
  review: {
    reviewedMoves: ReviewedMove[];
    timeline: TimelinePoint[];
    playerSummary: PlayerSummary;
    estimatedRating: EstimatedRating;
  };
}

interface MoveAnnotation {
  move: string;
  evalDrop: number;
}

interface CriticalPosition {
  moveNumber: number;        // 1-indexed half-move number
  playedMove: string;
  bestMove: string;
  evalBefore: number;        // White-perspective cp before move
  evalAfter: number;         // White-perspective cp after move
  evalDrop: number;          // always positive; magnitude of the error
  side: 'white' | 'black';
  classification: 'blunder' | 'mistake' | 'inaccuracy';
  principalVariation?: string;
}

interface SearchResult {
  evalCp: number;            // raw Stockfish score (side-to-move perspective)
  bestMove: string;
  pv?: string;
}

interface Engine {
  search: (fen: string) => Promise<SearchResult>;
  close: () => void;
}

interface StockfishEngine {
  listener?: (line: string) => void;
  sendCommand: (cmd: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mateToCp(mateIn: number): number {
  return Math.sign(mateIn) * (100_000 - Math.abs(mateIn) * 1_000);
}

function parseScore(line: string): number | null {
  const cp = line.match(/score cp (-?\d+)/);
  if (cp) return parseInt(cp[1], 10);
  const mate = line.match(/score mate (-?\d+)/);
  if (mate) return mateToCp(parseInt(mate[1], 10));
  return null;
}

/**
 * Convert a Stockfish eval (always from side-to-move perspective) to an
 * absolute White-perspective score.
 *
 * Stockfish always reports: positive = good for the side about to move.
 * After White moves it is Black's turn → raw score is Black-centric.
 * We need every number on one axis (positive = White ahead) so a drop
 * always means White lost ground.
 */
function toWhite(evalCp: number, turn: 'w' | 'b'): number {
  return turn === 'w' ? evalCp : -evalCp;
}

/**
 * Accuracy from average centipawn loss.
 * Uses the same exponential model as Chess.com / Lichess.
 */
function accuracyFromACPL(avgLossCp: number): number {
  const raw = 103.1668 * Math.exp(-0.04354 * avgLossCp) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ─── Engine factory ───────────────────────────────────────────────────────────

/**
 * Creates ONE long-lived Stockfish process and wraps it in a promise-based
 * serial job queue.  Only one `go` command is in-flight at a time; subsequent
 * calls are queued and dispatched as each `bestmove` arrives.
 *
 * This is the correct architecture: spawning a new process per position causes
 * timeouts on long games and defeats UCI's design purpose.
 */
async function createEngine(): Promise<Engine> {
  const stockfishModule = await import('stockfish');
  const initStockfish = stockfishModule.default as unknown as (enginePath?: string, cb?: (err: unknown, engine: StockfishEngine) => void) => Promise<StockfishEngine> | StockfishEngine;

  let buf = '';
  let closed = false;
  let engineReady = false;

  interface Job {
    fen: string;
    resolve: (r: SearchResult) => void;
    reject: (e: unknown) => void;
  }

  interface Active {
    job: Job;
    timer: NodeJS.Timeout;
    lastEval: number;
    bestMove: string;
    pv?: string;
  }

  const queue: Job[] = [];
  let active: Active | null = null;
  let engine: StockfishEngine | null = null;

  let onReady: (() => void) | null = null;
  let onReadyErr: ((e: unknown) => void) | null = null;
  const readyPromise = new Promise<void>((res, rej) => { onReady = res; onReadyErr = rej; });

  const startupTimeout = setTimeout(() => {
    onReadyErr?.(new Error('Stockfish startup timeout'));
  }, config.stockfish.timeout);

  const pump = () => {
    if (!engineReady || closed || active || queue.length === 0 || !engine) return;
    const job = queue.shift();
    if (!job) return;

    const timer = setTimeout(() => {
      if (!active) return;
      const err = new Error(`Stockfish search timeout for FEN: ${job.fen}`);
      active.job.reject(err);
      active = null;
      pump();
    }, config.stockfish.timeout);

    active = { job, timer, lastEval: 0, bestMove: '(none)' };

    try {
      engine.sendCommand(`position fen ${job.fen}`);
      engine.sendCommand(`go depth ${config.stockfish.depth}`);
    } catch (e) {
      clearTimeout(timer);
      active = null;
      job.reject(new Error(`Stockfish write error: ${e instanceof Error ? e.message : e}`));
      pump();
    }
  };

  const handleOutput = (chunk: string) => {
    buf += chunk.toString();
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      if (line === 'uciok') {
        engine?.sendCommand('isready');
        continue;
      }

      if (line === 'readyok') {
        if (!engineReady) {
          engineReady = true;
          clearTimeout(startupTimeout);
          onReady?.();
          pump();
        }
        continue;
      }

      if (!active) continue;

      if (line.startsWith('info') && line.includes(' score ')) {
        const score = parseScore(line);
        if (score !== null) active.lastEval = score;
        const pv = line.match(/\spv\s(.+)$/);
        if (pv) active.pv = pv[1].trim();
        continue;
      }

      if (line.startsWith('bestmove')) {
        active.bestMove = line.split(/\s+/)[1] ?? '(none)';
        clearTimeout(active.timer);
        active.job.resolve({ evalCp: active.lastEval, bestMove: active.bestMove, pv: active.pv });
        active = null;
        pump();
      }
    }
  };

  await new Promise<void>((resolve, reject) => {
    const pendingEngine = initStockfish('lite-single', (err, createdEngine) => {
      if (err) {
        reject(err);
        return;
      }

      engine = createdEngine;
      engine.listener = handleOutput;
      resolve();
    }) as StockfishEngine;

    pendingEngine.listener = handleOutput;
  });

  if (!engine) {
    throw new Error('Failed to initialize Stockfish engine');
  }

  const readyEngine = engine as StockfishEngine;
  readyEngine.sendCommand('uci');
  await readyPromise;

  return {
    search: (fen) => new Promise<SearchResult>((resolve, reject) => {
      if (closed) {
        reject(new Error('Engine is closed'));
        return;
      }
      queue.push({ fen, resolve, reject });
      pump();
    }),
    close: () => {
      if (closed) return;
      closed = true;
      try {
        engine?.sendCommand('quit');
      } catch {
        // ignore shutdown errors
      }
    },
  };
}

// ─── Drop logic ───────────────────────────────────────────────────────────────

/**
 * How many centipawns did the moving side throw away?
 *
 * All evals are White-perspective (positive = White ahead).
 *
 *   White just moved:
 *     Well played  → evalAfter >= evalBefore  (White maintained/improved)
 *     Poorly played → evalAfter < evalBefore  (White lost ground)
 *     drop = max(0, evalBefore − evalAfter)
 *
 *   Black just moved:
 *     Well played  → evalAfter <= evalBefore  (eval fell = Black improved)
 *     Poorly played → evalAfter > evalBefore  (eval rose = Black lost ground)
 *     drop = max(0, evalAfter − evalBefore)
 */
function computeDrop(evalBefore: number, evalAfter: number, isWhiteMove: boolean): number {
  return isWhiteMove
    ? Math.max(0, evalBefore - evalAfter)
    : Math.max(0, evalAfter - evalBefore);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function analyzePGNAndSave({
  pgn,
  userId,
  gameId,
}: {
  pgn: string;
  userId: string;
  gameId: string;
}): Promise<AnalysisResult | null> {
  if (Array.isArray(pgn)) pgn = (pgn as string[]).join(' ');
  if (typeof pgn !== 'string') throw new Error('PGN must be a string');

  const games = pgn.split(/\n(?=\[Event )/).map(g => g.trim()).filter(Boolean);
  const allResults: AnalysisResult[] = [];
  let detectedOpening = 'Unknown Opening';

  for (const gamePgn of games) {
    let engine: Engine | null = null;

    try {
      console.log(`[Analysis] Parsing PGN (${gamePgn.length} chars)...`);
      const chess = new Chess();
      chess.loadPgn(gamePgn);
      const verboseMoves = chess.history({ verbose: true });
      const movesSan = verboseMoves.map((m) => m.san);
      const moveUcis = verboseMoves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
      console.log(`[Analysis] ${movesSan.length} half-moves to evaluate`);
      detectedOpening = detectOpeningFromMoves(movesSan);

      // ── Build position list ──────────────────────────────────────────────
      // fens[i]      = position before move i     (i = 0..N-1)
      // fens[N]      = final position
      // sideAtFen[i] = side to move at fens[i]
      //
      // We evaluate ALL N+1 positions so that:
      //   evalsBefore[i] = evalsWhite[i]
      //   evalsAfter[i]  = evalsWhite[i+1]
      // No position is evaluated twice.

      const fens: string[] = [];
      const sideAtFen: ('w' | 'b')[] = [];
      {
        const walker = new Chess();
        fens.push(walker.fen());
        sideAtFen.push(walker.turn());
        for (const move of verboseMoves) {
          walker.move({ from: move.from, to: move.to, promotion: move.promotion });
          fens.push(walker.fen());
          sideAtFen.push(walker.turn());
        }
      }

      // ── Evaluate with single engine instance ─────────────────────────────
      engine = await createEngine();

      const evalsWhite: number[] = [];   // length = moves.length + 1
      const bestMoves: string[] = [];    // length = movesSan.length (only pre-move positions)
      const pvs: (string | undefined)[] = [];

      for (let i = 0; i <= movesSan.length; i++) {
        let result: SearchResult;
        try {
          result = await engine.search(fens[i]);
        } catch (err) {
          console.warn(`[Analysis] Engine failed on position ${i}:`, err);
          const lastWhite = evalsWhite.at(-1) ?? 0;
          result = {
            evalCp: sideAtFen[i] === 'w' ? lastWhite : -lastWhite,
            bestMove: '(none)',
          };
        }

        evalsWhite.push(toWhite(result.evalCp, sideAtFen[i]));

        // bestMove and pv are only meaningful pre-move (positions 0..N-1)
        if (i < movesSan.length) {
          bestMoves.push(result.bestMove);
          pvs.push(result.pv);
          console.log(`[Analysis] Move ${i + 1} (${movesSan[i]}): before=${evalsWhite.at(-1)}`);
        }
      }

      engine.close();
      engine = null;

      // ── Classify ─────────────────────────────────────────────────────────
      let whiteLossSum = 0;
      let blackLossSum = 0;

      for (let i = 0; i < movesSan.length; i++) {
        const evalBefore = evalsWhite[i];
        const evalAfter = evalsWhite[i + 1];
        const isWhiteMove = (i % 2) === 0;   // move 0 = White's e4, move 1 = Black's c5, …

        const drop = computeDrop(evalBefore, evalAfter, isWhiteMove);
        if (isWhiteMove) whiteLossSum += drop;
        else blackLossSum += drop;
      }

      // ── Metrics ───────────────────────────────────────────────────────────
      const whiteMoveCount = Math.ceil(movesSan.length / 2);
      const blackMoveCount = Math.floor(movesSan.length / 2);

      const acplWhite = whiteMoveCount ? Math.round(whiteLossSum / whiteMoveCount) : 0;
      const acplBlack = blackMoveCount ? Math.round(blackLossSum / blackMoveCount) : 0;
      const acpl = movesSan.length ? Math.round((whiteLossSum + blackLossSum) / movesSan.length) : 0;

      const reviewData = buildReview({
        movesSan,
        moveUcis,
        fens,
        evalsWhite,
        bestMoves,
        openingKnown: detectedOpening !== 'Unknown Opening',
        acplWhite,
        acplBlack,
      });

      const moveEvals = reviewData.timeline.map((point) => point.eval);
      const blunders = reviewData.reviewedMoves
        .filter((m) => m.classification === 'blunder')
        .map((m) => ({ move: m.san, evalDrop: m.evalDrop }));
      const mistakes = reviewData.reviewedMoves
        .filter((m) => m.classification === 'mistake')
        .map((m) => ({ move: m.san, evalDrop: m.evalDrop }));
      const inaccuracies = reviewData.reviewedMoves
        .filter((m) => m.classification === 'inaccuracy')
        .map((m) => ({ move: m.san, evalDrop: m.evalDrop }));
      const criticalPositions: CriticalPosition[] = reviewData.reviewedMoves
        .filter((m) => m.classification === 'blunder' || m.classification === 'mistake' || m.classification === 'inaccuracy')
        .map((m) => ({
          moveNumber: m.moveNumber,
          playedMove: m.san,
          bestMove: m.bestMove,
          evalBefore: m.evalBefore,
          evalAfter: m.evalAfter,
          evalDrop: m.evalDrop,
          side: m.side,
          classification: m.classification as 'blunder' | 'mistake' | 'inaccuracy',
          principalVariation: pvs[m.moveNumber - 1],
        }));

      const accuracyWhite = reviewData.playerSummary.white.accuracy;
      const accuracyBlack = reviewData.playerSummary.black.accuracy;
      const accuracy = accuracyFromACPL(acpl);
      const fullMoves = whiteMoveCount;

      // ── Endgame ───────────────────────────────────────────────────────────
      const finalChess = new Chess();
      finalChess.loadPgn(gamePgn);
      const endgameReached =
        finalChess.isCheckmate() ||
        finalChess.isStalemate() ||
        finalChess.isInsufficientMaterial() ||
        finalChess.isDraw();

      console.log(
        `[Analysis] Done: ACPL=${acpl} (W:${acplWhite} B:${acplBlack}) ` +
        `Accuracy=${accuracy}% (W:${accuracyWhite}% B:${accuracyBlack}%) ` +
        `Blunders=${blunders.length} Mistakes=${mistakes.length} ` +
        `Inaccuracies=${inaccuracies.length} Half-moves=${movesSan.length}`
      );

      // ── Suggestions ───────────────────────────────────────────────────────
      const suggestions: string[] = [];
      if (acplWhite > 100) suggestions.push('White: reduce errors with slow, deliberate calculation.');
      if (acplBlack > 100) suggestions.push('Black: reduce errors with slow, deliberate calculation.');
      if (blunders.length > 2) suggestions.push('Tactics training needed - too many blunders.');
      if (mistakes.length > 4) suggestions.push('Study middlegame patterns to reduce mistakes.');
      if (endgameReached) suggestions.push('Review endgame theory and technique.');
      if (criticalPositions.length > 0) {
        const wCrit = criticalPositions.filter(p => p.side === 'white').length;
        const bCrit = criticalPositions.filter(p => p.side === 'black').length;
        suggestions.push(`Review ${wCrit} critical White move(s) and ${bCrit} critical Black move(s).`);
      }

      const review = {
        reviewedMoves: reviewData.reviewedMoves,
        timeline: reviewData.timeline,
        playerSummary: reviewData.playerSummary,
        estimatedRating: reviewData.estimatedRating,
      };

      allResults.push({
        acpl,
        acplWhite,
        acplBlack,
        accuracy,
        accuracyWhite,
        accuracyBlack,
        blunders,
        mistakes,
        inaccuracies,
        suggestions,
        analysisComplete: true,
        endgameReached,
        fullMoves,
        moveEvals,
        criticalPositions,
        reviewedMoves: reviewData.reviewedMoves,
        timeline: reviewData.timeline,
        playerSummary: reviewData.playerSummary,
        estimatedRating: reviewData.estimatedRating,
        review,
      });

    } catch (err) {
      engine?.close();
      engine = null;
      console.error('[Analysis] Fatal error:', err);
      continue;
    }
  }

  if (allResults.length === 0) {
    console.warn('[Analysis] No results for gameId:', gameId);
    return null;
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  const result = allResults.at(-1);
  if (!result) {
    console.warn('[Analysis] No final result object for gameId:', gameId);
    return null;
  }
  const client = await clientPromise;
  const db = client.db();
  const { ObjectId } = await import('mongodb');

  const update: Record<string, unknown> = {
    analysis: result,
    analysisComplete: true,
    endgameReached: result.endgameReached,
  };
  if (detectedOpening !== 'Unknown Opening') update.opening = detectedOpening;

  await db.collection('games').updateOne(
    { _id: new ObjectId(gameId), userId },
    { $set: update }
  );

  console.log('[Analysis] Saved to MongoDB:', gameId);
  return result;
}


