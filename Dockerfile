# syntax=docker/dockerfile:1

# --- Stage 1: build della PWA ---------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Le variabili VITE_* sono inlined a build time. Di default VITE_PB_URL è
# vuoto: l'app parla con PocketBase sulla PROPRIA origin (/api/...), che nginx
# inoltra al container PocketBase (vedi nginx.conf.template). Va valorizzata
# solo per puntare a un backend esterno:
#   docker build --build-arg VITE_PB_URL=https://...
ARG VITE_PB_URL=
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
# (template: l'entrypoint di nginx lo espande in conf.d/default.conf).
# PB_UPSTREAM = host:porta del container PocketBase sulla rete Docker (nome del
# servizio nel compose); NGINX_RESOLVER = DNS interno di Docker.
ENV PB_UPSTREAM=pocketbase:8090 \
    NGINX_RESOLVER=127.0.0.11
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Solo l'output della build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck semplice sull'index
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
