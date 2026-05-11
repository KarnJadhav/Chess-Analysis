import { Chess } from 'chess.js';

export type MoveClassification =
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'miss'
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
  san?: string;
  pv?: string;
  multiPv?: Array<{ move: string; evalCp: number; pv?: string }>;
  multiPvByDepth?: Array<{ depth: number; lines: Array<{ move: string; evalCp: number; pv?: string }> }>;
  previousMoveUci?: string;
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

function setFenTurn(fen: string, turn: 'w' | 'b'): string {
  const parts = fen.split(' ');
  if (parts.length < 2) return fen;
  parts[1] = turn;
  return parts.join(' ');
}

function countOpponentMoves(fen: string, opponent: 'w' | 'b'): number {
  try {
    const chess = new Chess(setFenTurn(fen, opponent));
    return chess.moves().length;
  } catch {
    return 0;
  }
}

function analyzeThreatsAndMobility(
  fen: string,
  mover: 'w' | 'b'
): {
  captureThreats: number;
  checkThreats: number;
  mobility: number;
  forkThreat: boolean;
} {
  try {
    const chess = new Chess(setFenTurn(fen, mover));
    const squares = chess.board();
    let captureThreats = 0;
    let checkThreats = 0;
    let mobility = 0;
    let forkThreat = false;

    for (let r = 0; r < squares.length; r += 1) {
      for (let c = 0; c < squares[r].length; c += 1) {
        const piece = squares[r][c];
        if (!piece || piece.color !== mover) continue;

        const from = String.fromCharCode(97 + c) + String(8 - r);
        const moves = chess.moves({ square: from, verbose: true });
        mobility += moves.length;

        let threatsFromPiece = 0;
        for (const move of moves) {
          const isCapture = move.captured !== undefined;
          if (isCapture) captureThreats += 1;
          if (move.san.includes('+') || move.san.includes('#')) checkThreats += 1;
          if (isCapture || move.san.includes('+') || move.san.includes('#')) {
            const targetValue = move.captured ? (pieceValues[move.captured] ?? 0) : 0;
            if (targetValue >= 300 || move.san.includes('+') || move.san.includes('#')) {
              threatsFromPiece += 1;
            }
          }
        }

        if (threatsFromPiece >= 2) {
          forkThreat = true;
        }
      }
    }

    return { captureThreats, checkThreats, mobility, forkThreat };
  } catch {
    return { captureThreats: 0, checkThreats: 0, mobility: 0, forkThreat: false };
  }
}

function rankFromSquare(square: string): number {
  const rank = parseInt(square[1] ?? '0', 10);
  return Number.isFinite(rank) ? rank : 0;
}

function isRetreatMove(uci: string, isWhiteMove: boolean): boolean {
  if (uci.length < 4) return false;
  const fromRank = rankFromSquare(uci.slice(0, 2));
  const toRank = rankFromSquare(uci.slice(2, 4));
  return isWhiteMove ? toRank < fromRank : toRank > fromRank;
}

function isRecapture(uci: string, san: string | undefined, previousMoveUci: string | undefined): boolean {
  if (!san || !san.includes('x')) return false;
  if (!previousMoveUci || previousMoveUci.length < 4) return false;
  const previousTo = previousMoveUci.slice(2, 4);
  const currentTo = uci.slice(2, 4);
  return previousTo === currentTo;
}

function multiPvRankForMove(
  multiPv: Array<{ move: string; evalCp: number }> | undefined,
  move: string
): number | null {
  if (!multiPv || multiPv.length === 0) return null;
  const sorted = [...multiPv].sort((a, b) => b.evalCp - a.evalCp);
  const idx = sorted.findIndex((line) => line.move === move);
  return idx >= 0 ? idx + 1 : null;
}

function evalForMove(
  multiPv: Array<{ move: string; evalCp: number }> | undefined,
  move: string
): number | null {
  if (!multiPv || multiPv.length === 0) return null;
  const match = multiPv.find((line) => line.move === move);
  return typeof match?.evalCp === 'number' ? match.evalCp : null;
}

function depthSurpriseScore(
  multiPvByDepth: Array<{ depth: number; lines: Array<{ move: string; evalCp: number }> }> | undefined,
  playedMove: string
): number {
  if (!multiPvByDepth || multiPvByDepth.length < 2) return 0;
  const ordered = [...multiPvByDepth].sort((a, b) => a.depth - b.depth);
  const shallow = ordered[0];
  const deep = ordered[ordered.length - 1];

  const shallowRank = multiPvRankForMove(shallow.lines, playedMove);
  const deepRank = multiPvRankForMove(deep.lines, playedMove);
  const shallowEval = evalForMove(shallow.lines, playedMove);
  const deepEval = evalForMove(deep.lines, playedMove);

  let score = 0;
  if ((shallowRank === null || shallowRank > 2) && deepRank === 1) score += 20;
  if ((shallowRank === null || shallowRank > 2) && deepRank !== null && deepRank <= 2) score += 10;
  if (shallowEval !== null && deepEval !== null && (deepEval - shallowEval) >= 100) score += 10;
  return score;
}

function sacrificeValueCp(fenBefore: string, fenAfter: string, isWhiteMove: boolean): number {
  const beforeScore = getMaterialScoreFromFen(fenBefore);
  const afterScore = getMaterialScoreFromFen(fenAfter);
  const diff = afterScore - beforeScore;
  return Math.abs(isWhiteMove ? diff : -diff);
}

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
  san?: string;
  pv?: string;
  multiPv?: Array<{ move: string; evalCp: number; pv?: string }>;
  multiPvByDepth?: Array<{ depth: number; lines: Array<{ move: string; evalCp: number; pv?: string }> }>;
  previousMoveUci?: string;
  isBestMove?: boolean;
}

function isQuietMove(san: string | undefined): boolean {
  if (!san) return false;
  return !san.includes('x') && !san.includes('+') && !san.includes('#');
}

function extractPvForMove(
  playedMove: string,
  bestMove: string,
  pv: string | undefined,
  multiPv: Array<{ move: string; evalCp: number; pv?: string }> | undefined
): string | undefined {
  if (multiPv && multiPv.length > 0) {
    const match = multiPv.find((line) => line.move === playedMove) || multiPv.find((line) => line.move === bestMove);
    if (match?.pv) return match.pv;
  }
  return pv;
}

function hasTacticalContinuation(fenBefore: string, pv: string | undefined): { tactical: boolean; mate: boolean } {
  if (!pv) return { tactical: false, mate: false };
  try {
    const chess = new Chess(fenBefore);
    const moves = pv.split(/\s+/).filter(Boolean).slice(0, 8);
    let tactical = false;
    let mate = false;

    for (const uci of moves) {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length >= 5 ? uci[4] : undefined,
      });
      if (!move) break;
      if (move.captured || move.san.includes('+')) tactical = true;
      if (move.san.includes('#')) {
        mate = true;
        tactical = true;
        break;
      }
    }

    return { tactical, mate };
  } catch {
    return { tactical: false, mate: false };
  }
}

export function isOnlyMove(multiPv: Array<{ move: string; evalCp: number }> | undefined): boolean {
  if (!multiPv || multiPv.length < 2) return false;
  const sorted = [...multiPv].sort((a, b) => b.evalCp - a.evalCp);
  const best = sorted[0]?.evalCp ?? 0;
  const second = sorted[1]?.evalCp ?? best;
  return (best - second) >= 200;
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
    san,
    pv,
    multiPv,
    multiPvByDepth,
    previousMoveUci,
  } = input;

  // Stage 1: engine approval gate.
  const evalDiffToBest = Math.abs(bestEval - evalAfter);
  const deepRank = multiPvRankForMove(multiPv, playedMove);
  const nearTop = evalDiffToBest <= 20 || (deepRank !== null && deepRank <= 2 && evalDiffToBest <= 80);
  if (!nearTop) return false;

  // Use Win Probability Loss for human-facing gating.
  const MAX_CP = 1000;
  function winProbability(cp: number): number {
    const x = Math.max(-MAX_CP, Math.min(MAX_CP, cp));
    return 1 / (1 + Math.pow(10, -x / 400));
  }
  const beforeWP = winProbability(evalBefore);
  const afterWP = winProbability(evalAfter);
  const dropHuman = Math.abs(beforeWP - afterWP) * 100; // percent-like
  if (dropHuman > 20) return false;

  // Stage 2: tactical/strategic signals.
  let score = 0;

  const sacrifice = isMaterialSacrifice(fenBefore, fenAfter, isWhiteMove);
  if (sacrifice) {
    score += 30;
    const lossCp = sacrificeValueCp(fenBefore, fenAfter, isWhiteMove);
    if (lossCp >= 900) score += 20;
    else if (lossCp >= 500) score += 12;
    else if (lossCp >= 300) score += 8;
  }

  const pvLine = extractPvForMove(playedMove, bestMove, pv, multiPv);
  const tactics = hasTacticalContinuation(fenBefore, pvLine);
  if (tactics.tactical) score += 20;
  if (tactics.mate) score += 25;

  if (isOnlyMove(multiPv)) score += 25;

  const mover = isWhiteMove ? 'w' : 'b';
  const beforeThreats = analyzeThreatsAndMobility(fenBefore, mover);
  const afterThreats = analyzeThreatsAndMobility(fenAfter, mover);
  const threatIncrease = (afterThreats.captureThreats + afterThreats.checkThreats)
    - (beforeThreats.captureThreats + beforeThreats.checkThreats);
  if (threatIncrease >= 2) score += 15;

  const mobilityGain = afterThreats.mobility - beforeThreats.mobility;
  if (mobilityGain >= 4) score += 10;

  if (afterThreats.forkThreat) score += 15;

  const opponent = isWhiteMove ? 'b' : 'w';
  const opponentMovesBefore = countOpponentMoves(fenBefore, opponent);
  const opponentMovesAfter = countOpponentMoves(fenAfter, opponent);
  if (opponentMovesAfter > 0 && opponentMovesAfter <= opponentMovesBefore - 5) score += 10;
  const depthSurprise = depthSurpriseScore(multiPvByDepth, playedMove);
  score += depthSurprise;

  // Prefer not to boost simple best-move cases unless they also show human-surprise signals
  if (playedMove === bestMove && !sacrifice) {
    const strongTactical = tactics.mate || threatIncrease >= 3 || mobilityGain >= 6 || isOnlyMove(multiPv);
    if (!(depthSurprise >= 15 && strongTactical)) {
      return false;
    }
    // require higher score when promoting a best-move to brilliant
    // we'll continue scoring and check threshold later
  }

  // Stage 3: human surprise heuristics.
  if (isQuietMove(san)) score += 15;
  if (isRetreatMove(playedMove, isWhiteMove)) score += 10;

  const isRecap = isRecapture(playedMove, san, previousMoveUci);
  if (isRecap) score -= 10;
  if (san?.includes('x')) score -= 5;
  if (san?.includes('+') || san?.includes('#')) score -= 5;

  if (Math.abs(evalBefore) > 80) score += 10;

  // Require either a sacrifice or a deep tactical idea.
  const deepIdea = tactics.tactical || isOnlyMove(multiPv) || depthSurprise >= 10;
  if (!sacrifice && !deepIdea) return false;

  if (playedMove === bestMove && !sacrifice) {
    return score >= 90;
  }

  return score >= 75;
}

export function classifyMove(input: ClassifyMoveInput): MoveClassification {
  const {
    drop,
    evalBefore,
    evalAfter,
    isWhiteMove,
    isBestMove,
  } = input;
  // `drop` is humanized loss (humanLoss = WPL * 100). Use human thresholds.
  const wpBefore = (function wp(cp: number) {
    const MAX_CP = 1000;
    const x = Math.max(-MAX_CP, Math.min(MAX_CP, cp));
    return 1 / (1 + Math.pow(10, -x / 400));
  })(evalBefore);
  const wpAfter = (function wp(cp: number) {
    const MAX_CP = 1000;
    const x = Math.max(-MAX_CP, Math.min(MAX_CP, cp));
    return 1 / (1 + Math.pow(10, -x / 400));
  })(evalAfter);

  const improvementWP = isWhiteMove ? wpAfter - wpBefore : wpBefore - wpAfter;
  const previouslyWorse = isWhiteMove ? wpBefore < 0.35 : wpBefore > 0.65;
  const sideWasWinning = isWhiteMove ? wpBefore > 0.85 : wpBefore < 0.15;
  const stillWinning = isWhiteMove ? wpAfter > 0.75 : wpAfter < 0.25;

  if (isBestMove && improvementWP > 0.10 && previouslyWorse) {
    return 'great';
  }

  if (isBestMove || drop <= 1) return 'best';
  if (drop <= 3) return 'excellent';
  if (drop <= 5) return 'good';

  if (sideWasWinning && stillWinning && drop <= 20) return 'miss';

  if (drop <= 10) return 'inaccuracy';
  if (drop <= 20) return 'mistake';
  return 'blunder';
}
