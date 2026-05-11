# syntax=docker/dockerfile:1.7
#
# Single-container production image for SussexCountyCAAD.
#
# Stage 1 builds the Vite frontend. VITE_MAPBOX_ACCESS_TOKEN must be passed as
# a build arg because Vite inlines it into the JS bundle at build time —
# changing the token at runtime has no effect on an already-built image.
#
# Stage 2 installs production-only Node deps and copies the built frontend
# alongside backend source. Fastify serves /api/* + /healthz, then static
# files from /app/frontend/dist with a SPA fallback (gated on NODE_ENV).

# ---- Stage 1: build frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_MAPBOX_ACCESS_TOKEN
ENV VITE_MAPBOX_ACCESS_TOKEN=${VITE_MAPBOX_ACCESS_TOKEN}
RUN npm run build

# ---- Stage 2: backend runtime ----
FROM node:20-alpine AS runtime
# better-sqlite3 needs python3/make/g++ to compile its native bindings.
RUN apk add --no-cache python3 make g++ wget \
  && ln -sf python3 /usr/bin/python
WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
ENV CAAD_DB_PATH=/data/caad.sqlite
ENV CALLS_DIR=/calls
ENV LOG_LEVEL=info
ENV API_PORT=3000

# /data and /calls are intended mount points (SQLite DB + read-only audio).
# Chown to node so the unprivileged runtime user can write the WAL files.
RUN mkdir -p /data /calls && chown -R node:node /data /calls /app

EXPOSE 3000
USER node
WORKDIR /app/backend
CMD ["node", "src/index.js"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1
