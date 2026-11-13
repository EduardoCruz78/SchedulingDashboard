# Production image of the dashboard (used by the end-to-end tests; the demo runs on Vercel).
# Three stages: install, build, then a runtime with only Next.js's standalone output.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# The build needs no secrets: every page reads its data at request time.
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --retries=20 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/login || exit 1
CMD ["node", "server.js"]
