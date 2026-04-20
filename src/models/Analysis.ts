export interface Analysis {
  _id?: string;
  gameId: string;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  acpl: number;
  suggestions: string[];
  openingPerformance?: Record<string, number>;
  blunderRateByPhase?: {
    opening: number;
    middlegame: number;
    endgame: number;
  };
}
