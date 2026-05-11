import { Chess } from 'chess.js';
import { spawn } from 'child_process';
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
import { isOnlyMove } from '@/lib/classifyMoves';

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
  reviewSummary: {
    opening: string;
    middlegame: string;
    endgame: string;
  };
  review: {
    reviewedMoves: ReviewedMove[];
    timeline: TimelinePoint[];
    playerSummary: PlayerSummary;
    estimatedRating: EstimatedRating;
    reviewSummary: {
      opening: string;
      middlegame: string;
      endgame: string;
    };
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
  multiPv?: Array<{ evalCp: number; pv?: string; bestMove: string; multipv: number }>;
}

interface Engine {
  search: (fen: string, depthOverride?: number) => Promise<SearchResult>;
  close: () => void;
}

interface StockfishEngine {
  listener?: (line: string) => void;
  sendCommand: (cmd: string) => void;
}

async function createNativeEngine(): Promise<StockfishEngine> {
  return await new Promise((resolve, reject) => {
    const process = spawn(config.stockfish.path, [], { stdio: 'pipe' });
    const engine: StockfishEngine = {
      sendCommand: (cmd: string) => {
        process.stdin.write(cmd + '\n');
      },
      listener: undefined,
    };

    process.stdout.on('data', (chunk) => {
      engine.listener?.(chunk.toString());
    });

    process.stderr.on('data', (chunk) => {
      console.warn('[Stockfish stderr]', chunk.toString());
    });

    process.once('error', (err) => {
      reject(err);
    });

    process.once('spawn', () => {
      resolve(engine);
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_CP = 1000;

function mateToCp(mateIn: number): number {
  return Math.sign(mateIn) * MAX_CP;
}

function parseScore(line: string): number | null {
  const cpMatch = line.match(/score cp (-?\d+)/);
  if (cpMatch) {
    const raw = parseInt(cpMatch[1], 10);
    return Math.max(-MAX_CP, Math.min(MAX_CP, raw));
  }
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
 * Convert humanized ACPL (avg humanLoss per move) to accuracy.
 * New professional mapping: accuracy = 100 - (acpl * 0.6)
 */
function accuracyFromACPL(avgLossCp: number): number {
  const raw = 100 - avgLossCp * 0.6;
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
  const useNative = config.stockfish.mode === 'native';
  let initStockfish: ((enginePath?: string, cb?: (err: unknown, engine: StockfishEngine) => void) => Promise<StockfishEngine> | StockfishEngine) | null = null;
  if (!useNative) {
    const stockfishModule = await import('stockfish');
    initStockfish = stockfishModule.default as unknown as (enginePath?: string, cb?: (err: unknown, engine: StockfishEngine) => void) => Promise<StockfishEngine> | StockfishEngine;
  }

  let buf = '';
  let closed = false;
  let engineReady = false;

  interface Job {
    fen: string;
    depth?: number;
    resolve: (r: SearchResult) => void;
    reject: (e: unknown) => void;
  }

  interface Active {
    job: Job;
    timer: NodeJS.Timeout;
    lastEval: number;
    bestMove: string;
    pv?: string;
    multiPv: Record<number, { evalCp: number; pv?: string; bestMove: string; multipv: number }>;
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

    active = { job, timer, lastEval: 0, bestMove: '(none)', multiPv: {} };

    try {
      engine.sendCommand(`position fen ${job.fen}`);
      engine.sendCommand(`go depth ${job.depth ?? config.stockfish.depth}`);
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
        if (config.stockfish.multiPv > 1) {
          engine?.sendCommand(`setoption name MultiPV value ${config.stockfish.multiPv}`);
        }
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
        const multipvMatch = line.match(/\smultipv\s(\d+)/);
        const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
        if (score !== null && active) {
          if (multipv === 1) active.lastEval = score;
          const existing = active.multiPv[multipv] || { evalCp: score, bestMove: '(none)', multipv };
          existing.evalCp = score;
          const pv = line.match(/\spv\s(.+)$/);
          if (pv) {
            existing.pv = pv[1].trim();
            existing.bestMove = existing.pv.split(/\s+/)[0] ?? existing.bestMove;
            if (multipv === 1) active.pv = existing.pv;
          }
          active.multiPv[multipv] = existing;
        }
        continue;
      }

      if (line.startsWith('bestmove')) {
        active.bestMove = line.split(/\s+/)[1] ?? '(none)';
        clearTimeout(active.timer);
        const multiPv = Object.values(active.multiPv).sort((a, b) => a.multipv - b.multipv);
        active.job.resolve({
          evalCp: active.lastEval,
          bestMove: active.bestMove,
          pv: active.pv,
          multiPv: multiPv.length > 0 ? multiPv : undefined,
        });
        active = null;
        pump();
      }
    }
  };

  if (useNative) {
    engine = await createNativeEngine();
    engine.listener = handleOutput;
  } else {
    await new Promise<void>((resolve, reject) => {
      const pendingEngine = initStockfish?.('lite-single', (err, createdEngine) => {
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
  }

  if (!engine) {
    throw new Error('Failed to initialize Stockfish engine');
  }

  const readyEngine = engine as StockfishEngine;
  readyEngine.sendCommand('uci');
  await readyPromise;

  return {
    search: (fen, depthOverride) => new Promise<SearchResult>((resolve, reject) => {
      if (closed) {
        reject(new Error('Engine is closed'));
        return;
      }
      queue.push({ fen, depth: depthOverride, resolve, reject });
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
  // Win probability pipeline:
  // 1) Clamp CPs to ±MAX_CP and convert to win probability
  // 2) Compute absolute win-probability loss
  // 3) Scale to humanized ACPL contribution (loss * 100)
  function winProbability(cp: number): number {
    const x = Math.max(-MAX_CP, Math.min(MAX_CP, cp));
    return 1 / (1 + Math.pow(10, -x / 400));
  }

  const beforeWP = winProbability(evalBefore);
  const afterWP = winProbability(evalAfter);
  const loss = Math.abs(beforeWP - afterWP);
  return loss * 100;
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
      const multiPvBefore: Array<Array<{ move: string; evalCp: number; pv?: string }>> = [];
      const multiPvByDepthBefore: Array<Array<{ depth: number; lines: Array<{ move: string; evalCp: number; pv?: string }> }>> = [];
      const surpriseDepths = config.stockfish.surpriseDepths.filter((depth) => depth !== config.stockfish.depth);

      for (let i = 0; i <= movesSan.length; i++) {
        let result: SearchResult;
        try {
          result = await engine.search(fens[i], config.stockfish.depth);
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
          const rawMultiPv = (result.multiPv ?? []).map((line) => ({
            move: line.bestMove,
            evalCp: line.evalCp,
            pv: line.pv,
          }));
          if (rawMultiPv.length === 0 && result.bestMove) {
            rawMultiPv.push({ move: result.bestMove, evalCp: result.evalCp, pv: result.pv });
          }
          multiPvBefore.push(rawMultiPv);

          const depthLines: Array<{ depth: number; lines: Array<{ move: string; evalCp: number; pv?: string }> }> = [];
          for (const depth of surpriseDepths) {
            try {
              const shallow = await engine.search(fens[i], depth);
              const shallowLines = (shallow.multiPv ?? []).map((line) => ({
                move: line.bestMove,
                evalCp: line.evalCp,
                pv: line.pv,
              }));
              if (shallowLines.length === 0 && shallow.bestMove) {
                shallowLines.push({ move: shallow.bestMove, evalCp: shallow.evalCp, pv: shallow.pv });
              }
              depthLines.push({ depth, lines: shallowLines });
            } catch (err) {
              console.warn(`[Analysis] Surprise depth ${depth} failed on position ${i}:`, err);
            }
          }
          depthLines.push({ depth: config.stockfish.depth, lines: rawMultiPv });
          multiPvByDepthBefore.push(depthLines);
          console.log(`[Analysis] Move ${i + 1} (${movesSan[i]}): before=${evalsWhite.at(-1)}`);
        }
      }

      engine.close();
      engine = null;

      // ── Classify ─────────────────────────────────────────────────────────
      let whiteLossSum = 0;   // humanized severity sum
      let blackLossSum = 0;   // humanized severity sum
      let whiteCpLossSum = 0; // raw centipawn loss sum
      let blackCpLossSum = 0; // raw centipawn loss sum
      const cpBlunders: Array<{ moveIndex: number; move: string; lossCp: number }> = [];

      for (let i = 0; i < movesSan.length; i++) {
        const evalBefore = evalsWhite[i];
        const evalAfter = evalsWhite[i + 1];
        const isWhiteMove = (i % 2) === 0;   // move 0 = White's e4, move 1 = Black's c5, …

        // raw centipawn loss (white-perspective)
        const rawCpLoss = isWhiteMove ? Math.max(0, evalBefore - evalAfter) : Math.max(0, evalAfter - evalBefore);
        // track raw sums and blunders per classic definition
        if (isWhiteMove) whiteCpLossSum += rawCpLoss; else blackCpLossSum += rawCpLoss;
        if (rawCpLoss > 200) {
          cpBlunders.push({ moveIndex: i + 1, move: movesSan[i], lossCp: rawCpLoss });
        }

        // Win-probability based human loss
        const MAX_CP_LOCAL = MAX_CP;
        const winProbability = (cp: number) => {
          const x = Math.max(-MAX_CP_LOCAL, Math.min(MAX_CP_LOCAL, cp));
          return 1 / (1 + Math.pow(10, -x / 400));
        };
        const beforeWP = winProbability(evalBefore);
        const afterWP = winProbability(evalAfter);
        const humanLoss = Math.abs(beforeWP - afterWP) * 100;

        // Contextual weight: punish more near-equal positions, reduce at extremes
        const contextDist = Math.abs(beforeWP - 0.5) * 2; // 0..1
        const contextWeight = Math.max(0.2, 1 - 0.8 * contextDist * contextDist);

        // Tactical amplifiers
        const pv = pvs[i];
        const multiPv = multiPvBefore[i];
        let tacticalPenalty = 0;
        if (pv && (pv.includes('+') || pv.includes('#') || pv.includes('x'))) tacticalPenalty += 12;
        if (isOnlyMove(multiPv)) tacticalPenalty += 10;
        if (rawCpLoss >= 300) tacticalPenalty += 8;
        if (Math.abs(evalBefore) >= MAX_CP_LOCAL || Math.abs(evalAfter) >= MAX_CP_LOCAL) tacticalPenalty += 30; // mate-related

        const finalSeverity = humanLoss * contextWeight + tacticalPenalty;

        if (isWhiteMove) whiteLossSum += finalSeverity;
        else blackLossSum += finalSeverity;
      }

      // ── Metrics ───────────────────────────────────────────────────────────
      const whiteMoveCount = Math.ceil(movesSan.length / 2);
      const blackMoveCount = Math.floor(movesSan.length / 2);

      // humanized ACPL (our WPL-based severity)
      const acplWhite = whiteMoveCount ? Math.round(whiteLossSum / whiteMoveCount) : 0;
      const acplBlack = blackMoveCount ? Math.round(blackLossSum / blackMoveCount) : 0;
      const acpl = movesSan.length ? Math.round((whiteLossSum + blackLossSum) / movesSan.length) : 0;

      // raw centipawn ACPL (classic)
      const acplCpWhite = whiteMoveCount ? Math.round(whiteCpLossSum / whiteMoveCount) : 0;
      const acplCpBlack = blackMoveCount ? Math.round(blackCpLossSum / blackMoveCount) : 0;
      const acplCp = movesSan.length ? Math.round((whiteCpLossSum + blackCpLossSum) / movesSan.length) : 0;

      const reviewData = buildReview({
        movesSan,
        moveUcis,
        fens,
        evalsWhite,
        bestMoves,
        pvs,
        multiPvBefore,
        multiPvByDepthBefore,
        openingKnown: detectedOpening !== 'Unknown Opening',
        acplWhite,
        acplBlack,
        acplCpWhite,
        acplCpBlack,
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
        `[Analysis] Done: ACPL(human)=${acpl} (W:${acplWhite} B:${acplBlack}) ` +
        `ACPL(cp)=${acplCp} (W:${acplCpWhite} B:${acplCpBlack}) ` +
        `Accuracy=${accuracy}% (W:${accuracyWhite}% B:${accuracyBlack}%) ` +
        `Blunders=${blunders.length} CP_Blunders=${cpBlunders.length} Mistakes=${mistakes.length} ` +
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
        reviewSummary: reviewData.reviewSummary,
      };

      allResults.push({
        acpl,
        acplWhite,
        acplBlack,
        // raw centipawn metrics
        acplCp,
        acplCpWhite,
        acplCpBlack,
        cpBlunders,
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
        reviewSummary: reviewData.reviewSummary,
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


