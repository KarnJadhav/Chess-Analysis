# Vercel Setup

This project is a standard Next.js app, so Vercel can build it without extra adapters.

## Project Settings

- Framework preset: `Next.js`
- Build command: `npm run build`
- Output directory: leave default
- Install command: leave default unless your package manager changes

## Environment Variables

Add these in Vercel for `Production`, `Preview`, and `Development` as appropriate.

### Required

- `MONGODB_URI`
  - Value: your MongoDB Atlas connection string
  - Example: `mongodb+srv://username:password@cluster.mongodb.net/chanakya?retryWrites=true&w=majority`
- `MONGODB_DATABASE`
  - Value: `chanakya`
- `NEXTAUTH_SECRET`
  - Value: a long random secret string
  - Example: generate one with `openssl rand -base64 32`
- `NEXTAUTH_URL`
  - Production: `https://<your-primary-domain>`
  - Preview: `https://<your-preview-deployment>.vercel.app`
  - Development: `http://localhost:3000`

### Optional Stockfish Settings

- `STOCKFISH_MODE`
  - Value: `native` or `wasm`
  - Recommended on Vercel: `wasm`
- `STOCKFISH_PATH`
  - Only used for native server-side Stockfish
  - Example: `stockfish.exe`
- `STOCKFISH_DEPTH`
  - Value: `15`
- `STOCKFISH_TIMEOUT`
  - Value: `10000`
- `NEXT_PUBLIC_STOCKFISH_MODE`
  - Value: `wasm`
- `NEXT_PUBLIC_STOCKFISH_WASM_URL`
  - Value: `https://cdn.jsdelivr.net/npm/stockfish.wasm@12.0/stockfish.wasm.js`

### Other

- `MAX_PGN_SIZE`
  - Value: `1048576`

## Recommended Values by Environment

### Production

- `MONGODB_URI`: your production Atlas connection string
- `MONGODB_DATABASE`: `chanakya`
- `NEXTAUTH_URL`: your custom domain or the production Vercel domain
- `NEXTAUTH_SECRET`: same secret used everywhere unless you intentionally rotate it
- `STOCKFISH_MODE`: `wasm` if you want to avoid native binaries on Vercel

### Preview

- `MONGODB_URI`: usually the same database as production or a separate staging cluster
- `MONGODB_DATABASE`: `chanakya`
- `NEXTAUTH_URL`: the preview URL shown by Vercel for that deployment
- `NEXTAUTH_SECRET`: same secret as production for consistent auth behavior
- `STOCKFISH_MODE`: `wasm`

### Development

- `MONGODB_URI`: local or Atlas connection string
- `MONGODB_DATABASE`: `chanakya`
- `NEXTAUTH_URL`: `http://localhost:3000`
- `NEXTAUTH_SECRET`: local dev secret
- `STOCKFISH_MODE`: `wasm` or `native`

## Deployment Checklist

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Add the variables above in Vercel Project Settings.
4. Deploy once and verify `/api/auth/session` returns JSON.
5. Sign in and confirm `/dashboard` loads and protected routes redirect correctly.
