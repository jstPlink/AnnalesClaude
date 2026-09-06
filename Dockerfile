# syntax=docker/dockerfile:1

# --- Stage 1: build della PWA ---------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Le variabili VITE_* sono inlined a build time: si possono sovrascrivere con
#   docker build --build-arg VITE_PB_URL=https://...
# Default: il PocketBase bundled avviato da docker-compose.yml.
ARG VITE_PB_URL=http://localhost:8090
ENV VITE_PB_URL=$VITE_PB_URL

# Installa le dipendenze sfruttando la cache dei layer
COPY package.json package-lock.json ./
RUN npm ci

# Copia il resto e genera dist/
COPY . .
RUN npm run build

# --- Stage 2: server statico --------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Config con fallback SPA e header di cache corretti
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Solo l'output della build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck semplice sull'index
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
