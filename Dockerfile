# Debian slim (not alpine): Prisma's OpenSSL detection is reliable here, avoiding
# the musl/libssl mismatch. `openssl` is required by the Prisma query engine.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
# Fail the build loudly if the entrypoint didn't land where the runtime expects
# (guards against a stale-config build emitting dist/src/main.js).
RUN test -f dist/main.js || (echo "ERROR: dist/main.js missing after build" && ls -R dist && exit 1)

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
EXPOSE 3000
# Sync the DB schema to prisma/schema.prisma on boot. This project uses `db push`
# (not migration files), so a code deploy that adds columns must also push, or
# every query selecting the new columns 500s. Idempotent — a no-op once the DB
# matches. --accept-data-loss is required for non-interactive column drops (only
# ever the RankingConfig weight columns; player/match/training data is untouched).
# On failure we still start so a transient DB blip doesn't take the API down.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss || echo 'prisma db push failed; starting anyway'; node dist/main.js"]
