# Playwright's image ships Chromium and its fonts; the npm package version must match the tag.
FROM mcr.microsoft.com/playwright:v1.55.0-noble AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM mcr.microsoft.com/playwright:v1.55.0-noble
ENV NODE_ENV=production PORT=8406
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER pwuser
EXPOSE 8406
CMD ["node", "dist/server.js"]
