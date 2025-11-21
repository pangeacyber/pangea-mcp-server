FROM node:24.11.1-alpine@sha256:2867d550cf9d8bb50059a0fff528741f11a84d985c732e60e19e8e75c7239c43 AS base

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
