/**
 * Configuration file for environment variables and constants
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */

export const config = {
  // Stockfish configuration
  stockfish: {
    path: process.env.STOCKFISH_PATH || (process.platform === 'win32' ? 'stockfish.exe' : 'stockfish'),
    // mode: 'native' | 'wasm'
    mode: process.env.STOCKFISH_MODE || process.env.NEXT_PUBLIC_STOCKFISH_MODE || 'native',
    depth: parseInt(process.env.STOCKFISH_DEPTH || '15', 10),
    timeout: parseInt(process.env.STOCKFISH_TIMEOUT || '10000', 10), // 10 seconds
    // WASM-specific defaults (used by client-side loader)
    wasm: {
      // a CDN-hosted Stockfish WASM wrapper; can be overridden with NEXT_PUBLIC_STOCKFISH_WASM_URL
      url: process.env.NEXT_PUBLIC_STOCKFISH_WASM_URL || 'https://cdn.jsdelivr.net/npm/stockfish.wasm@12.0/stockfish.wasm.js',
    },
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

// simple wrapper using the stockfish npm package
export function createWasmEngine() {
  // This is a very small helper that attempts to create a Stockfish WASM instance
  // If the global `Stockfish` object exists (from a script or bundle), instantiate it.
  // Returns null if not available; callers should lazily load the WASM bundle.
  // @ts-ignore
  if (typeof window === 'undefined') return null;
  // @ts-ignore
  const StockfishCtor = (window as any).Stockfish || (window as any).stockfish;
  if (!StockfishCtor) return null;
  try {
    // Some wrappers export a factory function, others a constructor
    // Try both invocation patterns.
    // @ts-ignore
    const maybe = typeof StockfishCtor === 'function' ? new StockfishCtor() : StockfishCtor();
    return maybe;
  } catch (e) {
    try {
      // fallback: call as a factory
      // @ts-ignore
      return StockfishCtor();
    } catch (err) {
      return null;
    }
  }
}
