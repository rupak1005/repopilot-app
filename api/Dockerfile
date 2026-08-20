FROM node:22-alpine

WORKDIR /repo

# Native addons (tree-sitter) need a compiler on Alpine; git for repo clones.
RUN apk add --no-cache python3 make g++ git ca-certificates \
  && corepack enable

# Install dependencies first (better Docker layer caching).
COPY package.json yarn.lock turbo.json tsconfig*.json ./
COPY api/package.json api/tsconfig.json ./api/
COPY common/package.json common/tsconfig.json ./common/
RUN yarn install --frozen-lockfile

# Build at image-build time — free Render instances OOM if tsc runs at boot.
COPY common/src ./common/src
COPY api ./api
COPY prompts ./prompts
# Raise heap only for the image build (Render free runtime is ~512MB).
RUN NODE_OPTIONS=--max-old-space-size=1536 yarn --cwd common build \
  && yarn --cwd api prisma generate \
  && NODE_OPTIONS=--max-old-space-size=1536 yarn --cwd api build

EXPOSE 3001

# Render injects PORT; migrate then serve. INDEX_INLINE=true runs indexing in-process.
CMD ["sh", "-c", "yarn --cwd api prisma migrate deploy && yarn --cwd api start"]
