import { classifyMove, detectBrilliantMove, isOnlyMove, type MoveClassification } from '@/lib/classifyMoves';

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
  brilliant?: boolean;
  brilliantScore?: number;
  evalDrop: number;
  moveAccuracy: number;
  shortHint: string;
  longHint: string;
  side: 'white' | 'black';
  phase: GamePhase;
  comment: string;
}

export interface TimelinePoint {
  move: number;
  eval: number;
  classification: MoveClassification;
  brilliant?: boolean;
  brilliantScore?: number;
}

export interface PlayerSummaryItem {
  accuracy: number;
  accuracyCp?: number;
  acplCp?: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  misses: number;
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
  pvs: Array<string | undefined>;
  multiPvBefore: Array<Array<{ move: string; evalCp: number; pv?: string }>>;
  multiPvByDepthBefore: Array<Array<{ depth: number; lines: Array<{ move: string; evalCp: number; pv?: string }> }>>;
  openingKnown: boolean;
  acplWhite: number;
  acplBlack: number;
  acplCpWhite?: number;
  acplCpBlack?: number;
}

export interface BuildReviewOutput {
  reviewedMoves: ReviewedMove[];
  timeline: TimelinePoint[];
  playerSummary: PlayerSummary;
  estimatedRating: EstimatedRating;
  reviewSummary: {
    opening: string;
    middlegame: string;
    endgame: string;
  };
}

function computeDrop(evalBefore: number, evalAfter: number, isWhiteMove: boolean): number {
  const MAX_CP = 1000;
  function winProbability(cp: number): number {
    const x = Math.max(-MAX_CP, Math.min(MAX_CP, cp));
    return 1 / (1 + Math.pow(10, -x / 400));
  }

  const beforeWP = winProbability(evalBefore);
  const afterWP = winProbability(evalAfter);
  const loss = Math.abs(beforeWP - afterWP);
  return loss * 100; // humanized ACPL contribution
}

function accuracyFromACPL(avgLossCp: number): number {
  const raw = 100 - avgLossCp * 0.6;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function accuracyFromCpLegacy(avgLossCp: number): number {
  // Legacy exponential mapping used for CP-based accuracy (keeps for research/compatibility)
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
    case 'miss':
      return `${sideName}: A winning continuation was missed (${swing} cp).${captureHint}`;
    case 'inaccuracy':
      return `${sideName}: This is slightly suboptimal (${swing} cp).`;
    case 'best':
      return `${sideName}: This is the strongest move in the position.${checkHint}`;
    case 'great':
      return `${sideName}: Excellent move! You found a strong improvement (${swing} cp).${captureHint}`;
    case 'excellent':
      return `${sideName}: Very precise move that keeps the position under control.`;
    case 'good':
      return `${sideName}: Solid practical move with only minor concessions.`;
    default:
      return `${sideName}: Practical move.`;
  }
}

function moveAccuracyFromDrop(drop: number, evalBefore: number): number {
  // Map humanLoss to per-move accuracy: linear mapping consistent with overall accuracy
  const raw = 100 - drop * 0.6;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function buildShortHint(cls: MoveClassification, san: string): string {
  const isCheck = san.includes('+') || san.includes('#');
  const isCapture = san.includes('x');

  switch (cls) {
    case 'blunder':
      return 'Drops material or position.';
    case 'mistake':
      return 'Lets the advantage slip.';
    case 'miss':
      return 'Missed a stronger idea.';
    case 'inaccuracy':
      return 'Slightly imprecise.';
    case 'great':
      return 'Strong improvement.';
    case 'best':
      return isCheck ? 'Best with tempo.' : 'Best move.';
    case 'excellent':
      return isCapture ? 'Sharp but sound.' : 'Very solid.';
    case 'good':
      return isCapture ? 'Practical capture.' : 'Solid choice.';
    default:
      return 'Practical move.';
  }
}

function buildLongHint(
  cls: MoveClassification,
  evalBefore: number,
  evalAfter: number,
  san: string,
  side: 'white' | 'black'
): string {
  const swing = Math.round(Math.abs(evalAfter - evalBefore));
  const sideName = side === 'white' ? 'White' : 'Black';
  const checkHint = san.includes('#')
    ? ' It creates a mating finish.'
    : san.includes('+')
      ? ' It applies immediate king pressure.'
      : '';

  switch (cls) {
    case 'blunder':
      return `${sideName}: This is a major error, swinging the eval by ${swing} cp.${checkHint}`;
    case 'mistake':
      return `${sideName}: A clear inaccuracy that concedes ${swing} cp.${checkHint}`;
    case 'miss':
      return `${sideName}: A strong continuation was missed (${swing} cp).${checkHint}`;
    case 'inaccuracy':
      return `${sideName}: Slightly inaccurate; it gives up about ${swing} cp.`;
    case 'great':
      return `${sideName}: Great practical improvement (${swing} cp gain).`;
    case 'best':
      return `${sideName}: Best move in the position.${checkHint}`;
    case 'excellent':
      return `${sideName}: Very precise with minimal concessions.`;
    case 'good':
      return `${sideName}: Solid and keeps the position stable.`;
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
    misses: 0,
    bestMoves: 0,
    greatMoves: 0,
    brilliantMoves: 0,
  };
}

function incrementSummary(summary: PlayerSummaryItem, cls: MoveClassification, brilliant?: boolean): void {
  if (cls === 'blunder') summary.blunders += 1;
  if (cls === 'mistake') summary.mistakes += 1;
  if (cls === 'inaccuracy') summary.inaccuracies += 1;
  if (cls === 'miss') summary.misses += 1;
  if (cls === 'best') summary.bestMoves += 1;
  if (cls === 'great') summary.greatMoves += 1;
  if (brilliant) summary.brilliantMoves += 1;
}

export function buildReview(input: BuildReviewInput): BuildReviewOutput {
  const {
    movesSan,
    moveUcis,
    fens,
    evalsWhite,
    bestMoves,
    pvs,
    multiPvBefore,
    multiPvByDepthBefore,
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
    // raw cp loss
    const rawCpLoss = isWhiteMove ? Math.max(0, evalBefore - evalAfter) : Math.max(0, evalAfter - evalBefore);

    // win probability -> humanLoss
    const MAX_CP_LOCAL = 1000;
    const winProbability = (cp: number) => {
      const x = Math.max(-MAX_CP_LOCAL, Math.min(MAX_CP_LOCAL, cp));
      return 1 / (1 + Math.pow(10, -x / 400));
    };
    const beforeWP = winProbability(evalBefore);
    const afterWP = winProbability(evalAfter);
    const humanLoss = Math.abs(beforeWP - afterWP) * 100;

    // Contextual weight (punish equal positions harder)
    const contextDist = Math.abs(beforeWP - 0.5) * 2; // 0..1
    const contextWeight = Math.max(0.2, 1 - 0.8 * contextDist * contextDist);

    // tactical amplifiers
    const pv = pvs[i];
    const multiPv = multiPvBefore[i];
    let tacticalPenalty = 0;
    if (pv && (pv.includes('+') || pv.includes('#') || pv.includes('x'))) tacticalPenalty += 12;
    if (isOnlyMove(multiPv)) tacticalPenalty += 10;
    if (rawCpLoss >= 300) tacticalPenalty += 8;
    if (Math.abs(evalBefore) >= MAX_CP_LOCAL || Math.abs(evalAfter) >= MAX_CP_LOCAL) tacticalPenalty += 30;

    const finalSeverity = humanLoss * contextWeight + tacticalPenalty;

    const drop = finalSeverity; // pass severity to classifiers
    const bestMove = bestMoves[i] ?? '(none)';
    const playedUci = moveUcis[i] ?? '';
    const isBestMove = playedUci !== '' && playedUci === bestMove;
    const playedMove = moveUcis[i] ?? '';
    const multiPvByDepth = multiPvByDepthBefore[i];
    const previousMoveUci = i > 0 ? moveUcis[i - 1] ?? '' : undefined;
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
      san: movesSan[i] ?? '',
      pv,
      multiPv,
      multiPvByDepth,
      previousMoveUci,
    });

    const brilliant = detectBrilliantMove({
      evalBefore,
      evalAfter,
      bestEval: evalBefore,
      playedMove,
      bestMove,
      fenBefore: fens[i] ?? '',
      fenAfter: fens[i + 1] ?? '',
      isWhiteMove,
      san: movesSan[i] ?? '',
      pv,
      multiPv,
      multiPvByDepth,
      previousMoveUci,
      isBestMove,
    });

    const brilliantScore = brilliant
      ? 100
      : 0;

    const baseShortHint = buildShortHint(classification, movesSan[i] ?? '');
    const baseLongHint = buildLongHint(classification, evalBefore, evalAfter, movesSan[i] ?? '', side);
    const baseComment = buildComment(classification, evalBefore, evalAfter, movesSan[i] ?? '', side);

    const shortHint = brilliant ? `Brilliant: ${baseShortHint}` : baseShortHint;
    const longHint = brilliant ? `Brilliant move that stands out as hard to find. ${baseLongHint}` : baseLongHint;
    const comment = brilliant ? `Brilliant! ${baseComment}` : baseComment;
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
      brilliant,
      brilliantScore,
      evalDrop: rawCpLoss,
      moveAccuracy: moveAccuracyFromDrop(drop, evalBefore),
      shortHint,
      longHint,
      side,
      phase,
      comment,
    });

    timeline.push({
      move: i + 1,
      eval: evalAfter,
      classification,
      brilliant,
      brilliantScore,
    });

    incrementSummary(side === 'white' ? whiteSummary : blackSummary, classification, brilliant);
  }

  whiteSummary.accuracy = accuracyFromACPL(acplWhite);
  blackSummary.accuracy = accuracyFromACPL(acplBlack);
  // Attach raw-CP ACPL and legacy CP-based accuracy for compatibility / research
  if (typeof (acplWhite) === 'number' && typeof (acplCpWhite) === 'number') {
    whiteSummary.acplCp = acplCpWhite;
    whiteSummary.accuracyCp = accuracyFromCpLegacy(acplCpWhite);
  }
  if (typeof (acplBlack) === 'number' && typeof (acplCpBlack) === 'number') {
    blackSummary.acplCp = acplCpBlack;
    blackSummary.accuracyCp = accuracyFromCpLegacy(acplCpBlack);
  }

  const phaseBuckets = {
    opening: reviewedMoves.filter((m) => m.phase === 'opening'),
    middlegame: reviewedMoves.filter((m) => m.phase === 'middlegame'),
    endgame: reviewedMoves.filter((m) => m.phase === 'endgame'),
  };

  const describePhase = (phaseMoves: ReviewedMove[]): string => {
    if (phaseMoves.length === 0) return 'N/A';
    const blunders = phaseMoves.filter((m) => m.classification === 'blunder').length;
    const mistakes = phaseMoves.filter((m) => m.classification === 'mistake').length;
    const misses = phaseMoves.filter((m) => m.classification === 'miss').length;
    const brilliants = phaseMoves.filter((m) => m.classification === 'brilliant').length;
    const greats = phaseMoves.filter((m) => m.classification === 'great').length;

    if (blunders > 0) return 'Needs work';
    if (mistakes + misses >= 2) return 'Unstable';
    if (brilliants > 0 || greats >= 2) return 'Strong';
    return 'Solid';
  };

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
    reviewSummary: {
      opening: describePhase(phaseBuckets.opening),
      middlegame: describePhase(phaseBuckets.middlegame),
      endgame: describePhase(phaseBuckets.endgame),
    },
  };
}
