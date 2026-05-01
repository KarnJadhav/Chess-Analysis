/**
 * Configuration file for environment variables and constants
 */

export const config = {
  // Stockfish configuration
  stockfish: {
    path: process.env.STOCKFISH_PATH || (process.platform === 'win32' ? 'stockfish.exe' : 'stockfish'),
    // mode: 'native' | 'wasm'
    mode: process.env.STOCKFISH_MODE || process.env.NEXT_PUBLIC_STOCKFISH_MODE || 'native',
    depth: parseInt(process.env.STOCKFISH_DEPTH || '15', 10),
    timeout: parseInt(process.env.STOCKFISH_TIMEOUT || '10000', 10), // 10 seconds
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    database: process.env.MONGODB_DATABASE || 'chanakya',
  },

  // Analysis thresholds (centipawns)
  analysis: {
    blunderThreshold: 300,
    mistakeThreshold: 100,
    inaccuracyThreshold: 50,
  },

  // API
  api: {
    maxPGNSize: parseInt(process.env.MAX_PGN_SIZE || '1048576', 10), // 1MB
  },

  // Password validation
  password: {
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
};

// Validate critical environment variables
export function validateConfig() {
  if (!config.mongodb.uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
}

