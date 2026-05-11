# Use a stable Node base for building
FROM node:18-bullseye AS builder
WORKDIR /app

# Copy package metadata first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install all deps for build
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Runtime image: slim + system Stockfish binary
FROM node:18-bullseye-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates stockfish \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV STOCKFISH_PATH=/usr/bin/stockfish

# Copy app from builder
COPY --from=builder /app /app

# Install only production deps (fresh inside runtime)
RUN npm ci --only=production

EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "start"]