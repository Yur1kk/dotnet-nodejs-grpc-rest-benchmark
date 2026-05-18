# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

# Install ALL deps (dev included) so NestJS CLI + Prisma can build
RUN npm ci

# Generate Prisma Client for linux-musl
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN npx prisma generate

# Copy source and compile TypeScript
COPY . .
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

# Copy production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts + Prisma engine + schema/migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY tsconfig.json ./
COPY prisma ./prisma

# Entrypoint runs prisma migrate deploy then starts app
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_OPTIONS="--dns-result-order=ipv4first"
EXPOSE 3002
RUN npm install -g pm2
ENTRYPOINT ["./entrypoint.sh"]
