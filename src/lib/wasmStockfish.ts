// Lightweight wrapper to load a Stockfish engine in the browser and evaluate FENs.
type StockfishWorker = {
  listener?: ((data: string) => void) | null;
  sendCommand?: (command: string) => void;
  postMessage?: (command: string) => void;
  send?: (command: string) => void;
  terminate?: () => void;
  onmessage?: ((event: MessageEvent) => void) | null;
};

type StockfishFactory = {
  new (): StockfishWorker;
  (...args: unknown[]): StockfishWorker | Promise<StockfishWorker>;
};

type StockfishGlobal = Window & {
  Stockfish?: StockfishFactory;
  stockfish?: StockfishFactory;
};

const DEFAULT_STOCKFISH_ASSET_VERSION = '18.0.7';
const DEFAULT_STOCKFISH_URL = `/stockfish/stockfish-18-lite-single.js?v=${DEFAULT_STOCKFISH_ASSET_VERSION}`;
const DEFAULT_STOCKFISH_WASM_URL = `/stockfish/stockfish-18-lite-single.wasm?v=${DEFAULT_STOCKFISH_ASSET_VERSION}`;

async function createFromGlobal(): Promise<StockfishWorker> {
  const stockfishWindow = window as StockfishGlobal;
  const globalStockfish = stockfishWindow.Stockfish || stockfishWindow.stockfish;
  if (!globalStockfish) {
    throw new Error('Stockfish global not found after script load');
  }

  const factory = globalStockfish as StockfishFactory;
  try {
    return await Promise.resolve(new factory());
  } catch {
    return await Promise.resolve(factory());
  }
}

function createWorker(scriptUrl: string, wasmUrl: string): StockfishWorker {
  if (typeof Worker === 'undefined') {
    throw new Error('Web Worker support is required for browser Stockfish');
  }

  const workerUrl = `${scriptUrl}#${encodeURIComponent(wasmUrl)},worker`;
  return new Worker(workerUrl);
}

function sendCommand(engine: StockfishWorker, command: string) {
  if (typeof engine.sendCommand === 'function') {
    engine.sendCommand(command);
    return;
  }
  if (typeof engine.postMessage === 'function') {
    engine.postMessage(command);
    return;
  }
  if (typeof engine.send === 'function') {
    engine.send(command);
  }
}

function attachListener(engine: StockfishWorker, listener: (data: string) => void) {
  if ('listener' in engine) {
    engine.listener = listener;
    return;
  }
  if ('onmessage' in engine) {
    engine.onmessage = (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : (event.data && event.data.data) || '';
      if (typeof data === 'string') {
        listener(data);
      }
    };
  }
}

export async function loadWasmStockfish(scriptUrl: string = DEFAULT_STOCKFISH_URL): Promise<StockfishWorker> {
  if (typeof window === 'undefined') throw new Error('WASM Stockfish only available in browser');

  const stockfishWindow = window as StockfishGlobal;
  if (stockfishWindow.Stockfish || stockfishWindow.stockfish) {
    return await createFromGlobal();
  }

  return createWorker(scriptUrl, DEFAULT_STOCKFISH_WASM_URL);
}

export interface EvalResult {
  cp?: number; // centipawns
  mate?: number; // mate in N
  best?: string; // best move
}

export async function evaluateFenWithWasm(engine: StockfishWorker, fen: string, depth = 12, timeout = 5000): Promise<EvalResult> {
  return new Promise((resolve) => {
    let resolved = false;
    const result: EvalResult = {};
    const onLine = (line: string) => {
      const normalized = line.trim();
      if (!normalized) return;
      if (normalized.startsWith('bestmove')) {
        const parts = normalized.split(' ');
        result.best = parts[1];
        if (!resolved) {
          resolved = true;
          attachListener(engine, () => {});
          resolve(result);
        }
        return;
      }

      if (normalized.includes(' score ')) {
        const m = /score\s+(cp|mate)\s+(-?\d+)/.exec(normalized);
        if (m) {
          const kind = m[1];
          const val = parseInt(m[2], 10);
          if (kind === 'cp') {
            result.cp = val;
            delete result.mate;
          } else {
            result.mate = val;
            delete result.cp;
          }
        }
      }
    };

    // Support both the stockfish npm package protocol (listener/sendCommand)
    // and generic worker-like protocols for older bundles.
    try {
      attachListener(engine, (data: string) => {
        const lines = String(data).split(/\r?\n/);
        for (const line of lines) {
          onLine(line);
        }
      });
      sendCommand(engine, 'uci');
      sendCommand(engine, 'ucinewgame');
      sendCommand(engine, 'position fen ' + fen);
      sendCommand(engine, 'go depth ' + depth);
    } catch {
      try {
        sendCommand(engine, 'uci');
        sendCommand(engine, 'ucinewgame');
        sendCommand(engine, 'position fen ' + fen);
        sendCommand(engine, 'go depth ' + depth);
      } catch {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      }
    }

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          sendCommand(engine, 'stop');
          attachListener(engine, () => {});
        } catch {}
        resolve(result);
      }
    }, timeout);
  });
}
