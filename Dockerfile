FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /app

# Copy dependency manifests and install
COPY package.json package-lock.json* ./
RUN npm ci

# Copy framework source
COPY . .

# Default: run all tests
CMD ["npx", "playwright", "test"]
