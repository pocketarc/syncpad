FROM mcr.microsoft.com/playwright:v1.53.1-noble
WORKDIR /usr/src/app

# Install prerequisites for Bun.
RUN apt-get update && apt-get install -y \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files.
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install Bun and then use it to install dependencies.
RUN curl -fsSL https://bun.sh/install | bash
RUN /root/.bun/bin/bun install

# Copy frontend source (including tests).
COPY apps/frontend ./apps/frontend
COPY packages/shared/src ./packages/shared/src

# Set environment variables for Playwright
ENV CI=true
ENV PLAYWRIGHT_BASE_URL=http://frontend:80

# Run the tests.
CMD ["/root/.bun/bin/bun", "--cwd", "apps/frontend", "test"]