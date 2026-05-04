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
    misses?: unknown[];
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
      classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
      evalDrop: number;
      side: 'white' | 'black';
      phase: 'opening' | 'middlegame' | 'endgame';
      comment: string;
      aiComment?: string;
    }[];
    timeline?: {
      move: number;
      eval: number;
      classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
    }[];
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
    reviewSummary?: {
      opening: string;
      middlegame: string;
      endgame: string;
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
        classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
        evalDrop: number;
        side: 'white' | 'black';
        phase: 'opening' | 'middlegame' | 'endgame';
        comment: string;
        aiComment?: string;
      }[];
      timeline: {
        move: number;
        eval: number;
        classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
      }[];
      playerSummary: {
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
      estimatedRating: {
        white: number;
        black: number;
      };
      reviewSummary?: {
        opening: string;
        middlegame: string;
        endgame: string;
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
    [key: string]: unknown;
  };
  analysisStatus?: string;
  analysisError?: string;
  analysisComplete?: boolean;
  endgameReached?: boolean;
}
