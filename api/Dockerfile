FROM node:22-alpine

WORKDIR /repo

RUN corepack enable

# Install dependencies first (better Docker layer caching).
COPY package.json yarn.lock turbo.json tsconfig*.json ./
COPY api/package.json api/tsconfig.json ./api/
COPY common/package.json common/tsconfig.json ./common/
RUN yarn install --frozen-lockfile

# Copy sources and build workspace packages the API needs.
COPY common/src ./common/src
COPY api ./api
RUN yarn --cwd common build \
  && yarn --cwd api prisma generate \
  && yarn --cwd api build

EXPOSE 3001

# Render injects PORT; migrate then serve. INDEX_INLINE=true runs indexing in-process.
CMD ["sh", "-c", "yarn --cwd api prisma migrate deploy && yarn --cwd api start"]
