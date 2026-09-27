# syntax=docker/dockerfile:1.7
# Next.js storefront (standalone output), built from the monorepo root:
#   docker build -f infra/docker/storefront.Dockerfile \
#     --build-arg NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.example.ma \
#     --build-arg NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_... \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://example.ma \
#     -t essadrati-storefront .
ARG NODE_VERSION=22.23.3

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.4 prune @nocido/storefront --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
# Public values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=@nocido/storefront...

FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache tini
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=builder --chown=node:node /repo/apps/storefront/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder --chown=node:node /repo/apps/storefront/public ./apps/storefront/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/storefront/server.js"]
