FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
#{{!postgres}} RUN npm install
#{{postgres}} # postinstall (prisma generate) needs the schema, copied below
#{{postgres}} RUN npm install --ignore-scripts
COPY . .
#{{postgres}} RUN npx prisma generate
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# winston writes ./logs at runtime; the non-root user must own /app
RUN chown node:node /app
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
