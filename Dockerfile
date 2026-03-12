FROM node:25-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@latest

COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:25-slim

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm@latest

COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3000

CMD ["node", "build"]
