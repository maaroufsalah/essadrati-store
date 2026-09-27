# syntax=docker/dockerfile:1.7
# Medusa backend (API + admin dashboard), built from the monorepo root:
#   docker build -f infra/docker/backend.Dockerfile -t essadrati-backend .
ARG NODE_VERSION=22.23.3

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# 1. Keep only the backend and the workspace packages it depends on.
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.4 prune @nocido/backend --docker

# 2. Install with a cache-friendly layer, then build.
FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo run build --filter=@nocido/backend...
# Self-contained production node_modules, workspace packages included.
RUN pnpm --filter @nocido/backend deploy --legacy --prod /deploy \
 && cp -R apps/backend/.medusa/server/. /deploy/

# 3. Minimal runtime, non-root.
FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache tini
ENV NODE_ENV=production \
    PORT=9000
WORKDIR /app
COPY --from=builder --chown=node:node /deploy ./
COPY --chmod=755 infra/docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 9000
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://127.0.0.1:9000/health || exit 1
ENTRYPOINT ["/sbin/tini", "--", "backend-entrypoint.sh"]
CMD ["npx", "medusa", "start"]
