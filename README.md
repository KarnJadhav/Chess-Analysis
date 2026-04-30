This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

Copy [.env.example](.env.example) to [.env.local](.env.local) and fill in the values before running locally or deploying to Vercel.

Required values:

- `MONGODB_URI`: MongoDB connection string used by auth, uploads, and analysis persistence.
- `NEXTAUTH_URL`: Base URL for NextAuth callbacks, for example `http://localhost:3000` locally or your Vercel domain in production.
- `NEXTAUTH_SECRET`: Long random secret used to sign NextAuth tokens and middleware sessions.

Optional Stockfish values:

- `STOCKFISH_MODE`: `native` or `wasm`.
- `STOCKFISH_PATH`: Path to the native Stockfish binary when using server-side analysis.
- `NEXT_PUBLIC_STOCKFISH_MODE`: Browser-visible Stockfish mode for the WASM client path.
- `NEXT_PUBLIC_STOCKFISH_WASM_URL`: URL for the Stockfish WASM bundle.

Recommended Vercel settings:

- Project type: Next.js
- Build command: `npm run build`
- Output directory: leave default
- Environment: add the required variables above in Production, Preview, and Development as needed

See [VERCEL_SETUP.md](VERCEL_SETUP.md) for the exact values and deployment checklist.
