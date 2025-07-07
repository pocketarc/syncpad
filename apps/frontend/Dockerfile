FROM oven/bun:1.2.17-slim
WORKDIR /usr/src/build

# Copy package files and install dependencies.
COPY package.json bun.lock tsconfig.json ./
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
RUN cd apps/frontend && bun run build

# Move the built files to where we want to serve them.
RUN mv apps/frontend/out /usr/src/app

# Clean up what we don't need.
RUN rm -rf /usr/src/build

WORKDIR /usr/src/app

# Expose port and serve.
EXPOSE 3000

# Run a minimal Bun HTTP server to serve the static files
# The --single flag ensures SPA routing works by serving index.html for unknown paths
CMD ["bunx", "serve", ".", "--single"]