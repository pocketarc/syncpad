FROM oven/bun:1.2.17-slim AS base
WORKDIR /usr/src/app

# ---- Install Dependencies ----
# This stage installs all dependencies needed for the build.
FROM base AS deps
COPY package.json bun.lockb turbo.json ./
RUN bun install

# ---- Builder ----
# This stage builds the static Next.js application.
FROM base AS builder
# Copy installed dependencies.
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy all source code.
COPY . .
# Run the build command for the frontend app only.
RUN bun --cwd ./apps/frontend run build

# ---- Final Production Image ----
# This is a tiny image that just serves the static files.
FROM oven/bun:1.2.17-slim AS final
WORKDIR /app

# Copy the static build output from the builder stage.
COPY --from=builder /usr/src/app/apps/frontend/out .

# Expose the port for the static server.
EXPOSE 3000

# Run a minimal Bun HTTP server to serve the static files.
CMD ["bun", "./**/*.html"]