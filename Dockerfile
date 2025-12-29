FROM node:24.12.0-alpine@sha256:c921b97d4b74f51744057454b306b418cf693865e73b8100559189605f6955b8 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder

WORKDIR /app
ADD . /app

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm deploy --filter=@pangeacyber/mcp-server --prod /prod/mcp-server

FROM base AS release

COPY --from=builder /prod/mcp-server /prod/mcp-server
WORKDIR /prod/mcp-server

ENTRYPOINT ["node", "/prod/mcp-server/dist/index.js"]
