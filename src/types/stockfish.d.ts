declare module 'stockfish' {
  const initStockfish: (
    enginePath?: string,
    cb?: (err: unknown, engine: unknown) => void
  ) => Promise<unknown> | unknown;

  export default initStockfish;
}