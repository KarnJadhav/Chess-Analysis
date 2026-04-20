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
    [key: string]: unknown;
  };
  analysisStatus?: string;
  analysisError?: string;
  analysisComplete?: boolean;
  endgameReached?: boolean;
}
