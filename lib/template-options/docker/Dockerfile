FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
#{{!postgres}} RUN npm install
#{{postgres}} # postinstall (prisma generate) needs the schema, copied below
#{{postgres}} RUN npm install --ignore-scripts
COPY . .
#{{postgres}} RUN npx prisma generate
# dev dependencies stay in this stage: the compose "migrate" service builds
# this target and needs the prisma CLI
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN npm prune --omit=dev
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
