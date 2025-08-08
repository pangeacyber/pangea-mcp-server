FROM node:22.17.0-alpine AS builder

WORKDIR /app
ADD . /app

RUN --mount=type=cache,target=/root/.npm npm install
RUN npm run build

FROM node:22.17.0-alpine AS release

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

WORKDIR /app

RUN npm ci --ignore-scripts --omit=dev

ENTRYPOINT ["node", "dist/index.js"]
