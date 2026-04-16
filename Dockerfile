# ─── Stage 1: Build Vite frontend ────────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /build/coup-client
COPY coup-client/package*.json ./
RUN npm ci

COPY coup-client/ ./

# Empty string = connect to same origin as page (server serves frontend)
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
RUN npm run build


# ─── Stage 2: Production server ───────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./

# Copy built frontend to the path Express expects: ../coup-client/dist
COPY --from=client-builder /build/coup-client/dist /app/coup-client/dist

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8000/ > /dev/null || exit 1

CMD ["node", "index.js"]
