# ─── Stage 1: Build & Verify Application ─────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy project source code
COPY . .

# Optional Build Arguments for CI/CD environments where .env.local is not present
ARG VITE_GEMINI_API_KEY
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_APP_ID
ARG VITE_BACKEND_URL

# Populate .env.local from build-args if provided (e.g. Docker Compose or CI/CD pipelines)
RUN touch .env.local && \
    ([ -z "$VITE_GEMINI_API_KEY" ] || echo "VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_API_KEY" ] || echo "VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_AUTH_DOMAIN" ] || echo "VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_PROJECT_ID" ] || echo "VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_STORAGE_BUCKET" ] || echo "VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_MESSAGING_SENDER_ID" ] || echo "VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_APP_ID" ] || echo "VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID" >> .env.local) && \
    ([ -z "$VITE_APP_ID" ] || echo "VITE_APP_ID=$VITE_APP_ID" >> .env.local) && \
    ([ -z "$VITE_BACKEND_URL" ] || echo "VITE_BACKEND_URL=$VITE_BACKEND_URL" >> .env.local)

# Run code linter and automated test suite during build verification
RUN npm run lint
RUN npm run test:fast

# Compile production bundle
RUN npm run build

# ─── Stage 2: Production Nginx Runtime ───────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx static files and config
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom production nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/healthz || exit 1

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
