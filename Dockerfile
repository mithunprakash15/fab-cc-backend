FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
# Fail the build loudly if the entrypoint didn't land where the runtime expects
# (guards against a stale-config build emitting dist/src/main.js).
RUN test -f dist/main.js || (echo "ERROR: dist/main.js missing after build" && ls -R dist && exit 1)

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
