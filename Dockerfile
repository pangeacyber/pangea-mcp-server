FROM node:24.13.0-alpine@sha256:931d7d57f8c1fd0e2179dbff7cc7da4c9dd100998bc2b32afc85142d8efbc213 AS base

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
