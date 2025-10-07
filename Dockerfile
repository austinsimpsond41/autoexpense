##### DEPENDENCIES

FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat pnpm

WORKDIR /app

# Install Prisma Client - remove if not using Prisma

COPY prisma ./

# Install dependencies based on the preferred package manager

COPY package.json pnpm-lock.yaml ./
RUN pnpm i
##### BUILDER

FROM node:22-alpine AS builder
RUN apk add --no-cache pnpm

ENV NEXT_PUBLIC_APP_URL="https://fakeurl.azurewebsites.net"
ENV BETTER_AUTH_URL="https://fakeurl.azurewebsites.net"
ENV BETTER_AUTH_SECRET="buildshim"
ENV AZURE_STORAGE_CONNECTION_STRING="fakeurl"

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN SKIP_ENV_VALIDATION=1 pnpm run build

##### RUNNER
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl graphicsmagick ghostscript
WORKDIR /app

ENV NODE_ENV=production

# ENV NEXT_TELEMETRY_DISABLED 1
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]