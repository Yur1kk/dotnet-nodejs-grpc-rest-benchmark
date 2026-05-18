# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
# Proto files must be available at runtime (NestJS gRPC reads them dynamically)
COPY proto ./proto

EXPOSE 3001
RUN npm install -g pm2
CMD ["pm2-runtime", "start", "dist/main.js", "-i", "2"]
