export interface User {
  _id?: string;
  username: string;
  email: string;
  passwordHash: string;
  rating?: number;
  lichessAccount?: string;
  chesscomAccount?: string;
}
