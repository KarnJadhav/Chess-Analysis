import React, { useState } from 'react';
import { config } from '../lib/config';
import { loadWasmStockfish, evaluateFenWithWasm, EvalResult } from '../lib/wasmStockfish';

type Props = {
  fen: string;
  depth?: number;
};

export default function WasmAnalyzeButton({ fen, depth = 12 }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);

  async function run() {
    setLoading(true);
    try {
      const engine = await loadWasmStockfish(config.stockfish.wasm.url);
      const r = await evaluateFenWithWasm(engine, fen, depth, 8000);
      setResult(r);
    } catch (err) {
      // surface error for debugging
      // eslint-disable-next-line no-console
      console.error(err);
      setResult({});
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <button onClick={run} disabled={loading} className="btn btn-sm btn-outline-primary">
        {loading ? 'Analyzing…' : 'Run client analysis'}
      </button>
      {result && (
        <div style={{ marginTop: 6 }}>
          <strong>Best:</strong> {result.best || '—'} {result.cp ? `(${result.cp} cp)` : ''}
        </div>
      )}
    </div>
  );
}
