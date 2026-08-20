FROM node:22-alpine

WORKDIR /repo

RUN corepack enable

# Install dependencies first (better Docker layer caching).
COPY package.json turbo.json tsconfig*.json ./
COPY api/package.json api/tsconfig.json ./api/
COPY common/package.json common/tsconfig.json common/src ./common/
RUN yarn install --frozen-lockfile

# Copy the rest of the source.
COPY api ./api

EXPOSE 3001

CMD ["sh", "-c", "yarn --cwd api prisma generate && yarn --cwd api build && yarn --cwd api prisma migrate deploy && yarn --cwd api start"]

