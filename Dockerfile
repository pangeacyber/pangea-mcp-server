FROM node:24.11.0-alpine@sha256:f36fed0b2129a8492535e2853c64fbdbd2d29dc1219ee3217023ca48aebd3787 AS base

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
