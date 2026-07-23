FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS deps
RUN npm ci

FROM deps AS build
COPY package.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

FROM deps AS dev
COPY package.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh && npx prisma generate
EXPOSE 3001
CMD ["./docker-entrypoint.sh", "npm", "run", "dev"]

FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=dev /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY package.json ./package.json
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3001
CMD ["./docker-entrypoint.sh", "node", "dist/server.js"]
