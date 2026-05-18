# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN npx prisma generate

COPY . .
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY tsconfig.json ./
COPY prisma ./prisma

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_OPTIONS="--dns-result-order=ipv4first"
EXPOSE 3004
RUN npm install -g pm2
ENTRYPOINT ["./entrypoint.sh"]
