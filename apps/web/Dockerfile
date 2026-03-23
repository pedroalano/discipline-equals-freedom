FROM node:20-alpine

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace manifests for dependency installation (layer-cached)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/

# Bake node_modules into this image layer.
# Source is bind-mounted at runtime; the anonymous volume in compose restores these modules.
RUN pnpm install --frozen-lockfile

# File watching polling for Docker on Linux/Mac
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

CMD ["pnpm", "--filter", "web", "run", "dev"]
