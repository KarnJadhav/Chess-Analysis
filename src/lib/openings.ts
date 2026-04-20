import { Chess } from 'chess.js';

export type OpeningPattern = {
  moves: string;
  name: string;
};

export const OPENINGS: OpeningPattern[] = [
  { moves: 'e4 c5', name: 'Sicilian Defense' },
  { moves: 'e4 e5', name: 'Open Game' },
  { moves: 'e4 e6', name: 'French Defense' },
  { moves: 'e4 c6', name: 'Caro-Kann Defense' },
  { moves: 'd4 Nf6 c4 g6', name: "King's Indian Defense" },
  { moves: 'd4 d5 c4', name: "Queen's Gambit" },
  { moves: 'd4 d5 Nf3 Nf6', name: "Queen's Pawn Game" },
  { moves: 'c4', name: 'English Opening' },
  { moves: 'Nf3', name: 'Reti Opening' },
];

function sortedOpeningsBySpecificity(): OpeningPattern[] {
  // Longest move prefixes first to prefer specific lines over generic ones.
  return [...OPENINGS].sort((a, b) => b.moves.split(' ').length - a.moves.split(' ').length);
}

export function detectOpeningFromMoves(moves: string[], maxHalfMoves = 10): string {
  if (!moves.length) {
    return 'Unknown Opening';
  }

  const moveString = moves.slice(0, maxHalfMoves).join(' ');
  for (const opening of sortedOpeningsBySpecificity()) {
    if (moveString.startsWith(opening.moves)) {
      return opening.name;
    }
  }

  return 'Unknown Opening';
}

export function detectOpeningFromPgn(pgn: string, maxHalfMoves = 10): string {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const moves = chess.history();
    return detectOpeningFromMoves(moves, maxHalfMoves);
  } catch {
    return 'Unknown Opening';
  }
}
