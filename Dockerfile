# ======================================================
# Base image
# ======================================================
FROM node:22-alpine AS base

WORKDIR /app


# ======================================================
# Dependencies
# ======================================================
FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci

# ======================================================
# Builder
# ======================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build

# ======================================================
# Runner
# ======================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Les images doivent rester disponibles
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]

#HEALTHCHECK

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider http://localhost:3000 || exit 1