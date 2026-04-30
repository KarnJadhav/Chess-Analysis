export interface Game {
  _id?: string;
  userId: string;
  pgn: string;
  result: string;
  date: Date;
  opponent: string;
  opening?: string;
  analysisId?: string;
  analysis?: {
    acpl?: number;
    blunders?: unknown[];
    suggestions?: string[];
    endgameReached?: boolean;
    accuracy?: number;
    accuracyWhite?: number;
    accuracyBlack?: number;
    reviewedMoves?: {
      moveNumber: number;
      san: string;
      fenBefore: string;
      fenAfter: string;
      evalBefore: number;
      evalAfter: number;
      bestMove: string;
      classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
      evalDrop: number;
      side: 'white' | 'black';
      phase: 'opening' | 'middlegame' | 'endgame';
      comment: string;
    }[];
    timeline?: {
      move: number;
      eval: number;
      classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
    }[];
    playerSummary?: {
      white: {
        accuracy: number;
        blunders: number;
        mistakes: number;
        inaccuracies: number;
        bestMoves: number;
        greatMoves: number;
        brilliantMoves: number;
      };
      black: {
        accuracy: number;
        blunders: number;
        mistakes: number;
        inaccuracies: number;
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
      reviewedMoves: {
        moveNumber: number;
        san: string;
        fenBefore: string;
        fenAfter: string;
        evalBefore: number;
        evalAfter: number;
        bestMove: string;
        classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
        evalDrop: number;
        side: 'white' | 'black';
        phase: 'opening' | 'middlegame' | 'endgame';
        comment: string;
      }[];
      timeline: {
        move: number;
        eval: number;
        classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
      }[];
      playerSummary: {
        white: {
          accuracy: number;
          blunders: number;
          mistakes: number;
          inaccuracies: number;
          bestMoves: number;
          greatMoves: number;
          brilliantMoves: number;
        };
        black: {
          accuracy: number;
          blunders: number;
          mistakes: number;
          inaccuracies: number;
          bestMoves: number;
          greatMoves: number;
          brilliantMoves: number;
        };
      };
      estimatedRating: {
        white: number;
        black: number;
      };
    };
    [key: string]: unknown;
  };
  analysisStatus?: string;
  analysisError?: string;
  analysisComplete?: boolean;
  endgameReached?: boolean;
}
