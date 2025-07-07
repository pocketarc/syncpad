FROM oven/bun:1.2.17-slim
WORKDIR /usr/src/app

COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

RUN bun install --production --no-cache --no-save --frozen-lockfile

# Copy the backend source code.
COPY apps/backend/src ./src

# Set the default port.
EXPOSE 8080

# Set the environment variable for production.
ENV NODE_ENV=production

# The command to start the WebSocket server.
CMD ["bun", "run", "src/index.ts"]