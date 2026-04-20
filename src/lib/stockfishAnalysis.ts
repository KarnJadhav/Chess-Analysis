import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import clientPromise from '@/lib/mongodb';
import { config } from '@/lib/config';
import { detectOpeningFromMoves } from '@/lib/openings';

export interface AnalysisResult {
  acpl: number;
  blunders: { move: string, evalDrop: number }[];
  mistakes: { move: string, evalDrop: number }[];
  suggestions: string[];
  analysisComplete: boolean;
  endgameReached: boolean;
  acplWhite?: number;
  acplBlack?: number;
  accuracy?: number;
  accuracyWhite?: number;
  accuracyBlack?: number;
  inaccuracies?: { move: string, evalDrop: number }[];
  fullMoves?: number;
  moveEvals: number[];
  criticalPositions?: {
    moveNumber: number;
    playedMove: string;
    bestMove: string;
    evalBefore: number;
    evalAfter: number;
    evalDrop: number;
    classification: 'blunder' | 'mistake' | 'inaccuracy';
    principalVariation?: string;
  }[];
}

interface StockfishSearchResult {
  evalCp: number;
  bestMove: string;
  principalVariation?: string;
}

interface StockfishEngine {
  search: (fen: string) => Promise<StockfishSearchResult>;
  close: () => void;
}

function isEngineUnavailableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return message.includes('enoent') || message.includes('not found') || message.includes('failed to spawn stockfish');
}

function createEngineUnavailableError(originalErr: unknown): Error {
  const detail = originalErr instanceof Error ? originalErr.message : String(originalErr);
  return new Error(
    `Stockfish engine is not available. Set STOCKFISH_PATH to a valid executable path (for example: C:\\stockfish\\stockfish-windows-x86-64-avx2.exe) or install stockfish in PATH. Original error: ${detail}`
  );
}

function normalizeMateToCp(mateScore: number): number {
  const sign = mateScore >= 0 ? 1 : -1;
  const distance = Math.abs(mateScore);
  return sign * (100000 - distance * 1000);
}

function parseUciScore(line: string): number | null {
  const cpMatch = line.match(/score cp (-?\d+)/);
  if (cpMatch) {
    return parseInt(cpMatch[1], 10);
  }

  const mateMatch = line.match(/score mate (-?\d+)/);
  if (mateMatch) {
    return normalizeMateToCp(parseInt(mateMatch[1], 10));
  }

  return null;
}

async function createStockfishEngine(): Promise<StockfishEngine> {
  const stockfishPath = config.stockfish.path;

  if ((stockfishPath.includes('/') || stockfishPath.includes('\\')) && !existsSync(stockfishPath)) {
    throw new Error(`Stockfish executable not found at: ${stockfishPath}`);
  }

  let stockfish: ReturnType<typeof spawn>;
  try {
    stockfish = spawn(stockfishPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (spawnErr) {
    const msg = spawnErr instanceof Error ? spawnErr.message : String(spawnErr);
    throw new Error(`Failed to spawn Stockfish: ${msg}`);
  }

  let buffer = '';
  let ready = false;
  let closed = false;

  type QueueItem = {
    fen: string;
    resolve: (value: StockfishSearchResult) => void;
    reject: (reason?: unknown) => void;
  };

  let current:
    | {
        resolve: QueueItem['resolve'];
        reject: QueueItem['reject'];
        timer: NodeJS.Timeout;
        lastEval: number;
        bestMove: string;
        principalVariation?: string;
      }
    | null = null;

  const queue: QueueItem[] = [];

  let resolveReady: (() => void) | null = null;
  let rejectReady: ((reason?: unknown) => void) | null = null;

  const readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const readyTimeout = setTimeout(() => {
    rejectReady?.(new Error(`Stockfish engine startup timeout (${config.stockfish.timeout}ms)`));
  }, config.stockfish.timeout);

  const failAll = (err: Error) => {
    if (closed) return;
    closed = true;
    clearTimeout(readyTimeout);

    if (!ready) {
      rejectReady?.(err);
    }

    if (current) {
      clearTimeout(current.timer);
      current.reject(err);
      current = null;
    }

    while (queue.length > 0) {
      const item = queue.shift();
      item?.reject(err);
    }
  };

  const pump = () => {
    if (!ready || closed || current || queue.length === 0) {
      return;
    }

    const next = queue.shift();
    if (!next) return;

    const timer = setTimeout(() => {
      if (!current) return;
      const timeoutErr = new Error(`Stockfish timeout after ${config.stockfish.timeout}ms for FEN: ${next.fen}`);
      current.reject(timeoutErr);
      current = null;
      pump();
    }, config.stockfish.timeout);

    current = {
      resolve: next.resolve,
      reject: next.reject,
      timer,
      lastEval: 0,
      bestMove: '(none)',
    };

    try {
      stockfish.stdin?.write(`position fen ${next.fen}\n`);
      stockfish.stdin?.write(`go depth ${config.stockfish.depth}\n`);
    } catch (err) {
      clearTimeout(timer);
      current = null;
      const msg = err instanceof Error ? err.message : String(err);
      next.reject(new Error(`Failed to write search command to Stockfish: ${msg}`));
      pump();
    }
  };

  stockfish.on('error', (err) => {
    failAll(new Error(`Stockfish process error: ${err.message}`));
  });

  stockfish.on('exit', (code) => {
    if (!closed) {
      failAll(new Error(`Stockfish exited unexpectedly with code ${code}`));
    }
  });

  stockfish.stdout?.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed === 'uciok') {
        stockfish.stdin?.write('isready\n');
        continue;
      }

      if (trimmed === 'readyok') {
        if (!ready) {
          ready = true;
          clearTimeout(readyTimeout);
          resolveReady?.();
          pump();
        }
        continue;
      }

      if (!current) {
        continue;
      }

      if (trimmed.startsWith('info') && trimmed.includes(' score ')) {
        const score = parseUciScore(trimmed);
        if (score !== null) {
          current.lastEval = score;
        }

        const pvMatch = trimmed.match(/\spv\s(.+)$/);
        if (pvMatch) {
          current.principalVariation = pvMatch[1]?.trim();
        }
        continue;
      }

      if (trimmed.startsWith('bestmove')) {
        const parts = trimmed.split(/\s+/);
        current.bestMove = parts[1] || '(none)';

        const result: StockfishSearchResult = {
          evalCp: current.lastEval,
          bestMove: current.bestMove,
          principalVariation: current.principalVariation,
        };

        clearTimeout(current.timer);
        current.resolve(result);
        current = null;
        pump();
      }
    }
  });

  stockfish.stderr?.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) {
      console.warn(`Stockfish stderr: ${msg}`);
    }
  });

  try {
    stockfish.stdin?.write('uci\n');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failAll(new Error(`Failed to write to Stockfish stdin: ${msg}`));
  }

  await readyPromise;

  return {
    search: (fen: string) =>
      new Promise<StockfishSearchResult>((resolve, reject) => {
        if (closed) {
          reject(new Error('Stockfish engine is closed'));
          return;
        }

        queue.push({ fen, resolve, reject });
        pump();
      }),
    close: () => {
      if (closed) return;
      closed = true;
      clearTimeout(readyTimeout);
      try {
        stockfish.stdin?.write('quit\n');
      } catch {
        // no-op
      }
      stockfish.kill();
    },
  };
}

function toWhitePerspective(evalCp: number, turn: 'w' | 'b'): number {
  return turn === 'w' ? evalCp : -evalCp;
}

function accuracyFromAvgLoss(avgLossCp: number): number {
  // 10cp average loss ~= 1 accuracy point.
  const raw = 100 - (avgLossCp / 10);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export async function analyzePGNAndSave({
  pgn,
  userId,
  gameId,
}: {
  pgn: string;
  userId: string;
  gameId: string;
}) {
  if (Array.isArray(pgn)) pgn = (pgn as string[]).join(' ');
  if (typeof pgn !== 'string') throw new Error('Invalid PGN format: must be a string');

  const games = pgn.split(/\n(?=\[Event )/).map(g => g.trim()).filter(Boolean);
  const allResults: AnalysisResult[] = [];
  let fatalAnalysisError: Error | null = null;
  let latestDetectedOpening = 'Unknown Opening';

  for (const gamePgn of games) {
    try {
      console.log(`[Analysis] Parsing PGN (${gamePgn.length} chars)...`);
      const chess = new Chess();
      chess.loadPgn(gamePgn);
      const moves = chess.history();
      latestDetectedOpening = detectOpeningFromMoves(moves);
      console.log(`[Analysis] ${moves.length} half-moves to evaluate`);
      const engine = await createStockfishEngine();

      const blunders: AnalysisResult['blunders'] = [];
      const mistakes: AnalysisResult['mistakes'] = [];
      const inaccuracies: NonNullable<AnalysisResult['inaccuracies']> = [];
      const suggestions: string[] = [];
      const moveEvals: number[] = [];
      const criticalPositions: NonNullable<AnalysisResult['criticalPositions']> = [];

      let endgameReached = false;
      let whiteLossSum = 0;
      let blackLossSum = 0;

      const evalsBefore: number[] = [];
      const bestMoves: string[] = [];
      const pvs: (string | undefined)[] = [];

      const fens: string[] = [];
      const sideToMoveAtFen: ('w' | 'b')[] = [];
      {
        const walker = new Chess();
        fens.push(walker.fen());
        sideToMoveAtFen.push(walker.turn());
        for (const move of moves) {
          walker.move(move);
          fens.push(walker.fen());
          sideToMoveAtFen.push(walker.turn());
        }
      }

      try {
        for (let i = 0; i < moves.length; i++) {
          let result: StockfishSearchResult;
          try {
            result = await engine.search(fens[i]);
          } catch (err) {
            if (isEngineUnavailableError(err)) {
              throw createEngineUnavailableError(err);
            }
            console.warn(`[Analysis] Stockfish failed on move ${i + 1} (${moves[i]}):`, err);
            const lastEval = evalsBefore.length > 0 ? evalsBefore[i - 1] : 0;
            const fallbackRaw = sideToMoveAtFen[i] === 'w' ? lastEval : -lastEval;
            result = {
              evalCp: fallbackRaw,
              bestMove: '(none)',
            };
          }

          const evalWhite = toWhitePerspective(result.evalCp, sideToMoveAtFen[i]);
          evalsBefore.push(evalWhite);
          bestMoves.push(result.bestMove);
          pvs.push(result.principalVariation);
          console.log(`[Analysis] Move ${i + 1}: Eval ${evalWhite}`);
        }
      } finally {
        engine.close();
      }

      let evalAfterLast = 0;
      try {
        const finalEngine = await createStockfishEngine();
        try {
          const lastResult = await finalEngine.search(fens[moves.length]);
          evalAfterLast = toWhitePerspective(lastResult.evalCp, sideToMoveAtFen[moves.length]);
        } finally {
          finalEngine.close();
        }
      } catch (err) {
        if (isEngineUnavailableError(err)) {
          throw createEngineUnavailableError(err);
        }
        console.warn('[Analysis] Stockfish failed on final position:', err);
        evalAfterLast = evalsBefore[moves.length - 1] ?? 0;
      }

      const evalsAfter: number[] = [...evalsBefore.slice(1), evalAfterLast];

      const { blunderThreshold, mistakeThreshold, inaccuracyThreshold } = config.analysis;

      for (let i = 0; i < moves.length; i++) {
        const evalBefore = evalsBefore[i];
        const evalAfter = evalsAfter[i];
        const isWhiteMove = i % 2 === 0;

        moveEvals.push(evalAfter);

        let drop = 0;
        if (isWhiteMove) {
          drop = Math.max(0, evalBefore - evalAfter);
          if (drop > 0) whiteLossSum += drop;
        } else {
          drop = Math.max(0, evalAfter - evalBefore);
          if (drop > 0) blackLossSum += drop;
        }

        let classification: 'blunder' | 'mistake' | 'inaccuracy' | null = null;
        if (drop >= blunderThreshold) {
          blunders.push({ move: moves[i], evalDrop: drop });
          classification = 'blunder';
        } else if (drop >= mistakeThreshold) {
          mistakes.push({ move: moves[i], evalDrop: drop });
          classification = 'mistake';
        } else if (drop >= inaccuracyThreshold) {
          inaccuracies.push({ move: moves[i], evalDrop: drop });
          classification = 'inaccuracy';
        }

        if (classification) {
          criticalPositions.push({
            moveNumber: i + 1,
            playedMove: moves[i],
            bestMove: bestMoves[i],
            evalBefore,
            evalAfter,
            evalDrop: drop,
            classification,
            principalVariation: pvs[i],
          });
        }
      }

      {
        const checker = new Chess();
        checker.loadPgn(gamePgn);
        endgameReached = checker.isCheckmate() || checker.isStalemate() || checker.isInsufficientMaterial();
      }

      const whiteMoves = Math.ceil(moves.length / 2);
      const blackMoves = Math.floor(moves.length / 2);
      const acplWhite = whiteMoves ? Math.round(whiteLossSum / whiteMoves) : 0;
      const acplBlack = blackMoves ? Math.round(blackLossSum / blackMoves) : 0;
      const acpl = Math.round((acplWhite + acplBlack) / 2);
      const avgLossOverall = moves.length ? (whiteLossSum + blackLossSum) / moves.length : 0;
      const accuracy = accuracyFromAvgLoss(avgLossOverall);
      const accuracyWhite = accuracyFromAvgLoss(whiteMoves ? whiteLossSum / whiteMoves : 0);
      const accuracyBlack = accuracyFromAvgLoss(blackMoves ? blackLossSum / blackMoves : 0);
      const fullMoves = Math.ceil(moves.length / 2);

      console.log(
        `[Analysis] Done: ACPL=${acpl} (W:${acplWhite} B:${acplBlack}) ` +
        `Accuracy=${accuracy}% (W:${accuracyWhite}% B:${accuracyBlack}%) ` +
        `Blunders=${blunders.length} Mistakes=${mistakes.length} ` +
        `Inaccuracies=${inaccuracies.length} Half-moves=${moves.length}`
      );

      if (acpl > 120) suggestions.push('Practice accuracy with slow games.');
      if (acplWhite > 150) suggestions.push('White side: work on calculation and avoiding oversights.');
      if (acplBlack > 150) suggestions.push('Black side: work on calculation and avoiding oversights.');
      if (blunders.length > 3) suggestions.push('Do tactics training to reduce blunders.');
      if (mistakes.length > 5) suggestions.push('Study opening principles and middlegame strategies.');
      if (endgameReached) suggestions.push('Review endgame strategies and techniques.');
      if (criticalPositions.length > 0) {
        suggestions.push(`Review ${criticalPositions.length} critical position(s) where better moves were available.`);
      }

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
      });
    } catch (err) {
      console.error('[Analysis] Error analyzing game:', err);
      if (isEngineUnavailableError(err) || (err instanceof Error && err.message.includes('Stockfish engine is not available'))) {
        fatalAnalysisError = err instanceof Error ? err : new Error(String(err));
        break;
      }
      continue;
    }
  }

  if (allResults.length === 0) {
    if (fatalAnalysisError) {
      throw fatalAnalysisError;
    }
    console.warn('[Analysis] No results generated for gameId:', gameId);
    return null;
  }

  const analysisData = allResults[allResults.length - 1];
  const client = await clientPromise;
  const db = client.db();
  const { ObjectId } = await import('mongodb');

  const updateFields: Record<string, unknown> = {
    analysis: analysisData,
    analysisComplete: true,
    endgameReached: analysisData.endgameReached,
  };

  if (latestDetectedOpening && latestDetectedOpening !== 'Unknown Opening') {
    updateFields.opening = latestDetectedOpening;
  }

  await db.collection('games').updateOne(
    { _id: new ObjectId(gameId), userId },
    {
      $set: updateFields,
    }
  );

  console.log('[Analysis] Saved to MongoDB for gameId:', gameId);
  return analysisData;
}


