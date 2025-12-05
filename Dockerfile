FROM node:24.11.1-alpine@sha256:682368d8253e0c3364b803956085c456a612d738bd635926d73fa24db3ce53d7 AS base

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
