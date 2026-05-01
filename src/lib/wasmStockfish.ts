/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
// Lightweight wrapper to load a Stockfish WASM engine in the browser and evaluate FENs.
type StockfishWorker = Worker | any;

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${url}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.setAttribute('data-src', url);
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

export async function loadWasmStockfish(wasmUrl: string): Promise<StockfishWorker> {
  // Many stockfish wasm bundles expose a global `Stockfish` constructor/factory.
  // Try to load the script and then instantiate.
  if (typeof window === 'undefined') throw new Error('WASM Stockfish only available in browser');
  if ((window as any).Stockfish || (window as any).stockfish) {
    // already present
    // @ts-ignore
    return createFromGlobal();
  }

  await loadScript(wasmUrl);
  // wait a tick for the script to initialize
  await new Promise((r) => setTimeout(r, 50));

  if ((window as any).Stockfish || (window as any).stockfish) {
    return createFromGlobal();
  }

  throw new Error('Failed to load Stockfish WASM from ' + wasmUrl);
}

function createFromGlobal(): StockfishWorker {
  // @ts-ignore
  const S = (window as any).Stockfish || (window as any).stockfish;
  // Some bundles expose a factory function returning a Worker-like interface
  try {
    // @ts-ignore
    const inst = typeof S === 'function' ? new S() : S();
    return inst;
  } catch (e) {
    // @ts-ignore
    return S;
  }
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
    const onmessage = (e: MessageEvent) => {
      const data = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
      // parse lines like: info depth 12 seldepth 18 score cp 13 ... pv e2e4 ...
      if (typeof data !== 'string') return;
      const line = data.toString().trim();
      if (!line) return;
      if (line.startsWith('bestmove')) {
        // bestmove e2e4 ponder d7d5
        const parts = line.split(' ');
        const best = parts[1];
        result.best = best;
        if (!resolved) {
          resolved = true;
          engine.onmessage = null;
          resolve(result);
        }
      }

      if (line.indexOf('score') !== -1) {
        const m = /score\s+(cp|mate)\s+(-?\d+)/.exec(line);
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

    // Fallback simplistic flow: send UCI commands and wait for bestmove or timeout
    try {
      engine.onmessage = onmessage;
      engine.postMessage('uci');
      engine.postMessage('ucinewgame');
      engine.postMessage('position fen ' + fen);
      engine.postMessage('go depth ' + depth);
    } catch (err) {
      // some bundles use send()/postMessage differences
      try {
        // @ts-ignore
        engine.send('uci');
        // @ts-ignore
        engine.send('ucinewgame');
        // @ts-ignore
        engine.send('position fen ' + fen);
        // @ts-ignore
        engine.send('go depth ' + depth);
      } catch (e) {
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
          engine.postMessage('stop');
          engine.onmessage = null;
        } catch (_) {}
        resolve(result);
      }
    }, timeout);
  });
}
