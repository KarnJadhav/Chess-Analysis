import { classifyMove, type MoveClassification } from '@/lib/classifyMoves';

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

export interface ReviewedMove {
  moveNumber: number;
  san: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number;
  evalAfter: number;
  bestMove: string;
  classification: MoveClassification;
  evalDrop: number;
  side: 'white' | 'black';
  phase: GamePhase;
  comment: string;
}

export interface TimelinePoint {
  move: number;
  eval: number;
  classification: MoveClassification;
}

export interface PlayerSummaryItem {
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  bestMoves: number;
  greatMoves: number;
  brilliantMoves: number;
}

export interface PlayerSummary {
  white: PlayerSummaryItem;
  black: PlayerSummaryItem;
}

export interface EstimatedRating {
  white: number;
  black: number;
}

export interface BuildReviewInput {
  movesSan: string[];
  moveUcis: string[];
  fens: string[];
  evalsWhite: number[];
  bestMoves: string[];
  openingKnown: boolean;
  acplWhite: number;
  acplBlack: number;
}

export interface BuildReviewOutput {
  reviewedMoves: ReviewedMove[];
  timeline: TimelinePoint[];
  playerSummary: PlayerSummary;
  estimatedRating: EstimatedRating;
}

function computeDrop(evalBefore: number, evalAfter: number, isWhiteMove: boolean): number {
  return isWhiteMove
    ? Math.max(0, evalBefore - evalAfter)
    : Math.max(0, evalAfter - evalBefore);
}

function accuracyFromACPL(avgLossCp: number): number {
  const raw = 103.1668 * Math.exp(-0.04354 * avgLossCp) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function estimatedRatingFromAccuracy(accuracy: number): number {
  const raw = Math.round(800 + accuracy * 10);
  return Math.max(100, Math.min(3000, raw));
}

function detectPhase(fenAfter: string, moveIndex: number, openingKnown: boolean): GamePhase {
  const board = fenAfter.split(' ')[0] ?? '';

  let whiteQueens = 0;
  let blackQueens = 0;
  let nonPawnMaterial = 0;

  for (const ch of board) {
    if (ch === '/' || /\d/.test(ch)) continue;
    const piece = ch.toLowerCase();
    if (piece === 'q') {
      if (ch === ch.toUpperCase()) whiteQueens += 1;
      else blackQueens += 1;
    }
    if (piece !== 'p' && piece !== 'k') {
      nonPawnMaterial += piece === 'q' ? 9 : piece === 'r' ? 5 : 3;
    }
  }

  if (whiteQueens === 0 && blackQueens === 0) {
    return 'endgame';
  }

  if (nonPawnMaterial <= 18) {
    return 'endgame';
  }

  const openingHalfMoves = openingKnown ? 30 : 20;
  if (moveIndex < openingHalfMoves) {
    return 'opening';
  }

  return 'middlegame';
}

function buildComment(
  cls: MoveClassification,
  evalBefore: number,
  evalAfter: number,
  san: string,
  side: 'white' | 'black'
): string {
  const swing = Math.round(Math.abs(evalAfter - evalBefore));
  const checkHint = san.includes('#')
    ? ' It creates a mating finish.'
    : san.includes('+')
      ? ' It also applies direct king pressure.'
      : '';
  const captureHint = san.includes('x') ? ' The capture helps piece activity.' : '';
  const sideName = side === 'white' ? 'White' : 'Black';

  switch (cls) {
    case 'blunder':
      return `${sideName}: This move loses significant material or position (${swing} cp swing).${checkHint}`;
    case 'mistake':
      return `${sideName}: This move weakens your position (${swing} cp).${captureHint}`;
    case 'inaccuracy':
      return `${sideName}: This is slightly suboptimal (${swing} cp).`;
    case 'best':
      return `${sideName}: This is the strongest move in the position.${checkHint}`;
    case 'great':
      return `${sideName}: Excellent move! You found a strong improvement (${swing} cp).${captureHint}`;
    case 'brilliant':
      return `${sideName}: Brilliant move! A difficult and highly accurate idea with a sacrifice.${checkHint}`;
    case 'excellent':
      return `${sideName}: Very precise move that keeps the position under control.`;
    case 'good':
      return `${sideName}: Solid practical move with only minor concessions.`;
    default:
      return `${sideName}: Practical move.`;
  }
}

function createSummaryBucket(): PlayerSummaryItem {
  return {
    accuracy: 0,
    blunders: 0,
    mistakes: 0,
    inaccuracies: 0,
    bestMoves: 0,
    greatMoves: 0,
    brilliantMoves: 0,
  };
}

function incrementSummary(summary: PlayerSummaryItem, cls: MoveClassification): void {
  if (cls === 'blunder') summary.blunders += 1;
  if (cls === 'mistake') summary.mistakes += 1;
  if (cls === 'inaccuracy') summary.inaccuracies += 1;
  if (cls === 'best') summary.bestMoves += 1;
  if (cls === 'great') summary.greatMoves += 1;
  if (cls === 'brilliant') summary.brilliantMoves += 1;
}

export function buildReview(input: BuildReviewInput): BuildReviewOutput {
  const {
    movesSan,
    moveUcis,
    fens,
    evalsWhite,
    bestMoves,
    openingKnown,
    acplWhite,
    acplBlack,
  } = input;

  const reviewedMoves: ReviewedMove[] = [];
  const timeline: TimelinePoint[] = [];

  const whiteSummary = createSummaryBucket();
  const blackSummary = createSummaryBucket();

  for (let i = 0; i < movesSan.length; i++) {
    const side: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black';
    const isWhiteMove = side === 'white';
    const evalBefore = evalsWhite[i] ?? 0;
    const evalAfter = evalsWhite[i + 1] ?? evalBefore;
    const drop = computeDrop(evalBefore, evalAfter, isWhiteMove);
    const bestMove = bestMoves[i] ?? '(none)';
    const playedUci = moveUcis[i] ?? '';
    const isBestMove = playedUci !== '' && playedUci === bestMove;
    const playedMove = moveUcis[i] ?? '';
    const classification = classifyMove({
      drop,
      evalBefore,
      evalAfter,
      bestEval: evalBefore,
      isWhiteMove,
      isBestMove,
      playedMove,
      bestMove,
      fenBefore: fens[i] ?? '',
      fenAfter: fens[i + 1] ?? '',
    });
    const phase = detectPhase(fens[i + 1] ?? '', i, openingKnown);

    reviewedMoves.push({
      moveNumber: i + 1,
      san: movesSan[i] ?? '',
      fenBefore: fens[i] ?? '',
      fenAfter: fens[i + 1] ?? '',
      evalBefore,
      evalAfter,
      bestMove,
      classification,
      evalDrop: drop,
      side,
      phase,
      comment: buildComment(classification, evalBefore, evalAfter, movesSan[i] ?? '', side),
    });

    timeline.push({
      move: i + 1,
      eval: evalAfter,
      classification,
    });

    incrementSummary(side === 'white' ? whiteSummary : blackSummary, classification);
  }

  whiteSummary.accuracy = accuracyFromACPL(acplWhite);
  blackSummary.accuracy = accuracyFromACPL(acplBlack);

  return {
    reviewedMoves,
    timeline,
    playerSummary: {
      white: whiteSummary,
      black: blackSummary,
    },
    estimatedRating: {
      white: estimatedRatingFromAccuracy(whiteSummary.accuracy),
      black: estimatedRatingFromAccuracy(blackSummary.accuracy),
    },
  };
}
