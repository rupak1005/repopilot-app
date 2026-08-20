FROM node:22-alpine

WORKDIR /repo

RUN corepack enable

# Install dependencies first (better Docker layer caching).
COPY package.json turbo.json tsconfig*.json ./
COPY web/package.json web/tsconfig.json web/next.config.js web/pages ./web/
COPY common/package.json common/tsconfig.json common/src ./common/
RUN yarn install --frozen-lockfile

# Copy the rest of the source.
COPY web ./web

EXPOSE 3000

CMD ["sh", "-c", "yarn --cwd web build && yarn --cwd web start"]

