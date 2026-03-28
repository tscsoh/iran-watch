# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first (layer cached until package*.json changes)
COPY package*.json ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure nginx worker (runs as 'nginx' user) can read all static files
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 7474
