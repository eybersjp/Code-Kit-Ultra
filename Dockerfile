# ---- Builder Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/control-service/ ./apps/control-service/
COPY tsconfig.json ./

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build packages in dependency order
RUN pnpm --filter shared build 2>/dev/null || true
RUN pnpm --filter core build 2>/dev/null || true
RUN pnpm --filter auth build 2>/dev/null || true
RUN pnpm --filter audit build 2>/dev/null || true
RUN pnpm --filter governance build 2>/dev/null || true
RUN pnpm --filter orchestrator build 2>/dev/null || true
RUN pnpm --filter control-service build 2>/dev/null || true

# ---- Production Stage ----
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -S cku && adduser -S cku -G cku

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./

# Copy only production packages
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/control-service/ ./apps/control-service/

# Install production deps only
RUN pnpm install --prod --frozen-lockfile

# Copy database migrations
COPY db/ ./db/

# Use non-root user
USER cku

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "--experimental-specifier-resolution=node", "apps/control-service/src/index.ts"]
