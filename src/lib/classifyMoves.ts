export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface ClassifyMoveInput {
  drop: number;
  evalBefore: number;
  evalAfter: number;
  bestEval: number;
  isWhiteMove: boolean;
  isBestMove: boolean;
  playedMove: string;
  bestMove: string;
  fenBefore: string;
  fenAfter: string;
}

function sideImprovement(evalBefore: number, evalAfter: number, isWhiteMove: boolean): number {
  return isWhiteMove ? evalAfter - evalBefore : evalBefore - evalAfter;
}

const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

function getMaterialScoreFromFen(fen: string): number {
  const board = fen.split(' ')[0] ?? '';
  let score = 0;

  for (const ch of board) {
    if (ch === '/' || /\d/.test(ch)) continue;
    const value = pieceValues[ch.toLowerCase()] ?? 0;
    score += ch === ch.toUpperCase() ? value : -value;
  }

  return score;
}

function isMaterialSacrifice(fenBefore: string, fenAfter: string, isWhiteMove: boolean): boolean {
  const beforeScore = getMaterialScoreFromFen(fenBefore);
  const afterScore = getMaterialScoreFromFen(fenAfter);
  const diff = afterScore - beforeScore;

  // White move: material loss lowers white-minus-black score.
  // Black move: material loss raises white-minus-black score.
  return isWhiteMove ? diff < -50 : diff > 50;
}

interface BrilliantInput {
  evalBefore: number;
  evalAfter: number;
  bestEval: number;
  playedMove: string;
  bestMove: string;
  fenBefore: string;
  fenAfter: string;
  isWhiteMove: boolean;
}

export function detectBrilliantMove(input: BrilliantInput): boolean {
  const {
    evalBefore,
    evalAfter,
    bestEval,
    playedMove,
    bestMove,
    fenBefore,
    fenAfter,
    isWhiteMove,
  } = input;

  // Rule 1: must not be the top engine move.
  if (playedMove === bestMove) return false;

  // Rule 2: must still be very close to best.
  const evalDiffToBest = Math.abs(bestEval - evalAfter);
  if (evalDiffToBest > 30) return false;

  // Rule 3: cannot be a clear practical drop.
  const drop = isWhiteMove
    ? evalBefore - evalAfter
    : evalAfter - evalBefore;
  if (drop > 50) return false;

  // Rule 4: sacrifice signal is required.
  const sacrifice = isMaterialSacrifice(fenBefore, fenAfter, isWhiteMove);
  if (!sacrifice) return false;

  // Rule 5: position should improve or remain robust.
  const improvement = isWhiteMove
    ? evalAfter >= evalBefore - 20
    : evalAfter <= evalBefore + 20;
  if (!improvement) return false;

  // Optional difficulty filter to avoid over-labeling in simple positions.
  const wasHardPosition = Math.abs(evalBefore) > 150;
  if (!wasHardPosition) return false;

  return true;
}

export function classifyMove(input: ClassifyMoveInput): MoveClassification {
  const {
    drop,
    evalBefore,
    evalAfter,
    bestEval,
    isWhiteMove,
    isBestMove,
    playedMove,
    bestMove,
    fenBefore,
    fenAfter,
  } = input;

  const improvement = sideImprovement(evalBefore, evalAfter, isWhiteMove);
  const previouslyWorse = isWhiteMove ? evalBefore < -80 : evalBefore > 80;

  if (detectBrilliantMove({
    evalBefore,
    evalAfter,
    bestEval,
    playedMove,
    bestMove,
    fenBefore,
    fenAfter,
    isWhiteMove,
  })) {
    return 'brilliant';
  }

  if (isBestMove && improvement > 100 && previouslyWorse) {
    return 'great';
  }

  if (isBestMove || drop <= 10) {
    return 'best';
  }

  if (drop <= 20) {
    return 'excellent';
  }

  if (drop <= 50) {
    return 'good';
  }

  if (drop <= 100) {
    return 'inaccuracy';
  }

  if (drop <= 300) {
    return 'mistake';
  }

  return 'blunder';
}
