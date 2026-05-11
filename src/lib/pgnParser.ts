// Simple PGN metadata parser for chess games
export interface PGNMetadata {
  result: string;
  date: string;
  opponent: string;
  opening: string;
  whitePlayer: string;
  blackPlayer: string;
}

export function parsePGNMetadata(pgn: string): PGNMetadata {
  // Extract tags from PGN header
  const resultMatch = pgn.match(/\[Result "([^"]+)"\]/);
  const dateMatch = pgn.match(/\[Date "([^"]+)"\]/);
  const whiteMatch = pgn.match(/\[White "([^"]+)"\]/);
  const blackMatch = pgn.match(/\[Black "([^"]+)"\]/);
  const opponentMatch = whiteMatch || blackMatch;
  const openingMatch = pgn.match(/\[Opening "([^"]+)"\]/);

  return {
    result: resultMatch ? resultMatch[1] : '',
    date: dateMatch ? dateMatch[1] : '',
    opponent: opponentMatch ? opponentMatch[1] : '',
    opening: openingMatch ? openingMatch[1] : '',
    whitePlayer: whiteMatch ? whiteMatch[1] : '',
    blackPlayer: blackMatch ? blackMatch[1] : '',
  };
}
