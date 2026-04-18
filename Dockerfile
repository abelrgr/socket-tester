# ─── Stage 1: Build React frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /build/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# ─── Stage 2: Build NestJS backend ──────────────────────────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /build/backend

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build:backend

# ─── Stage 3: Production runtime ────────────────────────────────────────────
FROM node:20-alpine AS production
LABEL maintainer="socket-tester"

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production deps
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled backend
COPY --from=backend-build /build/backend/dist ./dist
# Copy React build (served as static files from dist/public)
COPY --from=frontend-build /build/client/../public ./public

USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
