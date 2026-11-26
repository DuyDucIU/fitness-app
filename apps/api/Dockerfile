# syntax=docker/dockerfile:1
# Build context = thư mục gốc repo (monorepo npm workspaces):
#   docker build -f apps/api/Dockerfile .
# Một Dockerfile, nhiều target:
#   build   -> có đủ devDependencies + Prisma CLI (dùng cho service `migrate`)
#   runtime -> image nhỏ chỉ có code đã biên dịch (dùng cho `api` và `worker`)

FROM node:24-alpine AS base
WORKDIR /repo

# ---- build: cài đủ dependency rồi biên dịch contract + engine + api ----
FROM base AS build
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contract/package.json packages/contract/
COPY packages/engine/package.json packages/engine/
COPY packages/programs/package.json packages/programs/
RUN npm ci --workspace @fitness/api --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/contract packages/contract
COPY packages/engine packages/engine
COPY apps/api apps/api
RUN npm run build -w @fitness/contract \
 && npm run build -w @fitness/engine \
 && cd apps/api \
 && npx prisma generate \
 && npx nest build
WORKDIR /repo/apps/api

# ---- prod-deps: chỉ dependency chạy thật ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contract/package.json packages/contract/
COPY packages/engine/package.json packages/engine/
COPY packages/programs/package.json packages/programs/
RUN npm ci --omit=dev --workspace @fitness/api --include-workspace-root \
 && mkdir -p apps/api/node_modules

# ---- runtime ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules ./node_modules
# Một số dependency của api bị npm đặt lồng (vd @nestjs/config cần dotenv 16, gốc dùng dotenv 17).
COPY --from=prod-deps /repo/apps/api/node_modules apps/api/node_modules
COPY --from=build /repo/packages/contract/package.json packages/contract/package.json
COPY --from=build /repo/packages/contract/dist packages/contract/dist
COPY --from=build /repo/packages/engine/package.json packages/engine/package.json
COPY --from=build /repo/packages/engine/dist packages/engine/dist
COPY --from=build /repo/apps/api/package.json apps/api/package.json
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
# api: node dist/main.js · worker: node dist/worker.js (ghi đè `command` trong compose)
CMD ["node", "dist/main.js"]
