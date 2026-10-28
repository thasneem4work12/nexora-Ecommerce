# ==============================================================================
# NEXORA Commerce — Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Base Alpine image with libc6-compat for Prisma compatibility
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Stage 3: Build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy DB URL for prisma generate and static compilation
ENV DATABASE_URL="postgresql://nexora:dummy@localhost:5432/dummy"
ENV BETTER_AUTH_SECRET="dummy_secret_for_compilation_at_least_32_characters"
ENV BETTER_AUTH_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
RUN npx prisma generate
RUN npm run build
RUN npx esbuild scripts/worker.ts --bundle --platform=node --target=node20 --packages=external --outfile=dist/worker.js

# Stage 4: Production Runner (Minimal, Non-Root)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged system user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set up public folder and persistent uploads directory
COPY --from=builder /app/public ./public
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Copy standalone build artifacts
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/dist/worker.js ./worker.js

USER nextjs

EXPOSE 3000

# Built-in container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
