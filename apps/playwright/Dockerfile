FROM mcr.microsoft.com/playwright:v1.50.0-noble AS base
WORKDIR /usr/src/app

# Copy only the files needed for dependency installation to leverage Docker cache.
COPY ../../package.json ../../bun.lock ../../turbo.json ./frontend/
# Install all dependencies using Bun.
RUN bun install

# Copy the entire monorepo source code into the image.
COPY . ../../

CMD ["bun", "--cwd", "./apps/frontend", "test"]