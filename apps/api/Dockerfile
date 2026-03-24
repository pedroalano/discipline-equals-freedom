FROM node:20-alpine

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace manifests for dependency installation (layer-cached)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

# Bake node_modules into this image layer.
# Source is bind-mounted at runtime; the anonymous volume in compose restores these modules.
RUN pnpm install --frozen-lockfile

CMD ["sh", "-c", "pnpm --filter @zenfocus/types build && pnpm --filter api exec prisma generate && pnpm --filter api run dev"]
