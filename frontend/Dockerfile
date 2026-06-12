FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS deps
RUN npm ci

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM deps AS build
ARG VITE_DISCORD_API_URL=http://localhost:3001
ARG VITE_REALTIME_DEBUG=false
ENV VITE_DISCORD_API_URL=$VITE_DISCORD_API_URL
ENV VITE_REALTIME_DEBUG=$VITE_REALTIME_DEBUG
COPY . .
RUN npm run build

FROM deps AS prod
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY . .
EXPOSE 3000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
