# Stage 1: Build & Verify Application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy project source code
COPY . .

# Build Cloud Functions backend so integration tests can import it
RUN npm --prefix functions ci && npm --prefix functions run build

# Optional Build Arguments for CI/CD environments where .env.local is not present
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_APP_ID
ARG VITE_BACKEND_URL
ARG VITE_BUSINESS_LEGAL_NAME
ARG VITE_SUPPORT_EMAIL
ARG VITE_GRIEVANCE_OFFICER_NAME
ARG VITE_GRIEVANCE_EMAIL
ARG VITE_BUSINESS_ADDRESS
ARG VITE_BUSINESS_JURISDICTION

# Populate .env.local from build-args if provided
RUN touch .env.local && \
    ([ -z "$VITE_FIREBASE_API_KEY" ] || echo "VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_AUTH_DOMAIN" ] || echo "VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_PROJECT_ID" ] || echo "VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_STORAGE_BUCKET" ] || echo "VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_MESSAGING_SENDER_ID" ] || echo "VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID" >> .env.local) && \
    ([ -z "$VITE_FIREBASE_APP_ID" ] || echo "VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID" >> .env.local) && \
    ([ -z "$VITE_APP_ID" ] || echo "VITE_APP_ID=$VITE_APP_ID" >> .env.local) && \
    ([ -z "$VITE_BACKEND_URL" ] || echo "VITE_BACKEND_URL=$VITE_BACKEND_URL" >> .env.local) && \
    ([ -z "$VITE_BUSINESS_LEGAL_NAME" ] || echo "VITE_BUSINESS_LEGAL_NAME=$VITE_BUSINESS_LEGAL_NAME" >> .env.local) && \
    ([ -z "$VITE_SUPPORT_EMAIL" ] || echo "VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL" >> .env.local) && \
    ([ -z "$VITE_GRIEVANCE_OFFICER_NAME" ] || echo "VITE_GRIEVANCE_OFFICER_NAME=$VITE_GRIEVANCE_OFFICER_NAME" >> .env.local) && \
    ([ -z "$VITE_GRIEVANCE_EMAIL" ] || echo "VITE_GRIEVANCE_EMAIL=$VITE_GRIEVANCE_EMAIL" >> .env.local) && \
    ([ -z "$VITE_BUSINESS_ADDRESS" ] || echo "VITE_BUSINESS_ADDRESS=$VITE_BUSINESS_ADDRESS" >> .env.local) && \
    ([ -z "$VITE_BUSINESS_JURISDICTION" ] || echo "VITE_BUSINESS_JURISDICTION=$VITE_BUSINESS_JURISDICTION" >> .env.local)

# Run code linter and automated test suite during build verification
RUN npm run lint
RUN npm run test:fast

# Compile production bundle, scan assets for secrets, verify budget and smoke test
RUN npm run build
RUN npm run scan:secrets
RUN npm run check:bundle
RUN node scripts/performance-test.mjs --smoke

# Stage 2: Production Nginx Runtime
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

# Start nginx daemon in foreground
CMD ["nginx", "-g", "daemon off;"]
