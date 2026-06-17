# ============================================
# Dockerfile for Drama API
# Multi-stage build for production
# ============================================

# Stage 1: Dependencies
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Stage 3: Production
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 apiuser

# Copy necessary files
COPY --from=builder --chown=apiuser:bunjs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:bunjs /app/prisma ./prisma
COPY --from=builder --chown=apiuser:bunjs /app/src ./src
COPY --from=builder --chown=apiuser:bunjs /app/server.ts ./
COPY --from=builder --chown=apiuser:bunjs /app/package.json ./

# Switch to non-root user
USER apiuser

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:8787/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start server
CMD ["bun", "server.ts"]
