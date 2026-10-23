# syntax=docker/dockerfile:1
#
# Image de production en trois étapes. Construction :
#   docker build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#     --build-arg NEXT_PUBLIC_APP_URL=... --build-arg NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=... -t byb-platform .
# Les secrets (clé service_role, Cloudinary, Resend, Turnstile) ne sont JAMAIS passés au build : ils sont fournis
# à l'exécution (variables d'environnement du conteneur) et ne figurent dans aucune couche de l'image.

# ======================================================
# Base
# ======================================================
FROM node:22-alpine AS base

WORKDIR /app

# ======================================================
# Dépendances
# ======================================================
FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci

# ======================================================
# Build
# ======================================================
FROM base AS builder

# Les variables NEXT_PUBLIC_* sont figées dans le JavaScript envoyé au navigateur au moment du build. La politique
# de sécurité (origine Supabase) et les origines autorisées des Server Actions sont calculées au même moment :
# une valeur absente ici donne une image qui démarre mais ne peut pas fonctionner.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_TELEMETRY_DISABLED=1

# Échec immédiat et lisible plutôt qu'une image inutilisable découverte en production.
RUN test -n "$NEXT_PUBLIC_SUPABASE_URL" && test -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" && test -n "$NEXT_PUBLIC_APP_URL" \
    || (echo "Arguments de build manquants : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et NEXT_PUBLIC_APP_URL sont requis." >&2 && exit 1)

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build

# ======================================================
# Exécution
# ======================================================
FROM node:22-alpine AS runner

WORKDIR /app

# HOSTNAME=0.0.0.0 est indispensable : sans lui, le serveur standalone n'écoute que sur l'adresse propre du conteneur
# (Docker y place l'identifiant du conteneur) et la sonde de santé locale ne l'atteint jamais.
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Le serveur tourne sous l'utilisateur `node` fourni par l'image : une faille applicative ne donne pas les droits root.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Cache d'optimisation des images : seul dossier dans lequel le serveur écrit.
RUN mkdir -p .next/cache && chown node:node .next/cache

USER node

EXPOSE 3000

# La sonde vérifie aussi la base : elle répond 503 si Supabase est injoignable. 127.0.0.1 plutôt que localhost,
# que busybox peut résoudre en IPv6 alors que le serveur écoute en IPv4.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
