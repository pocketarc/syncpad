# Stage 1: Build the Next.js application
FROM oven/bun:1.2.17-slim AS builder
WORKDIR /usr/src/build

# Copy package files and install dependencies.
COPY package.json bun.lock tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/frontend/tsconfig.json ./apps/frontend/

# Explicitly not using the `--production` flag here, as we want to include dev dependencies for building.
RUN bun install

# Declare build-time arguments.
ARG NEXT_PUBLIC_WEBSOCKET_URI

# Set environment variables for building.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_WEBSOCKET_URI=$NEXT_PUBLIC_WEBSOCKET_URI

# Copy frontend source and build.
COPY apps/frontend ./apps/frontend
COPY packages/shared/src ./packages/shared/src
RUN cd apps/frontend && bun run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Copy the built application from the builder stage
COPY --from=builder /usr/src/build/apps/frontend/out .

# Copy the Nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/nginx.conf

# Expose port and start Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
