# =============================================================================
# AgentHub — Multi-stage Docker build
# =============================================================================
# Usage:
#   docker build -t agenthub .
#   docker run -p 3000:3000 -v agenthub-data:/app/data agenthub
# =============================================================================

FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1

# --- Stage 1: Install dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./

# Install build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++ && \
    npm ci --ignore-scripts && \
    npm rebuild better-sqlite3

# --- Stage 2: Build the application ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- Stage 3: Production runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/agenthub.db
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone server and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create data directory for SQLite persistence
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
