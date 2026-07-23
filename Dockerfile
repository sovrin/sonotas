# Regenerate the Bravura music-font subset using pinned tooling (Node + harfbuzz
# + woff2), then export the result to the host — no local system deps needed.
#
#   docker build --target font --output public/fonts .
#
# writes public/fonts/Bravura.subset.woff2 on the host.
FROM node:24-slim AS build

# hb-subset (libharfbuzz-bin) subsets the CFF outlines; woff2_compress packs the
# result. The wasm harfbuzz ports drop CFF outlines, so we need the real binaries.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libharfbuzz-bin woff2 \
    && rm -rf /var/lib/apt/lists/*

# pnpm ships with the Node image via corepack; activate the pinned version.
RUN corepack enable

WORKDIR /app

# Warm the dependency cache from the workspace manifests before copying sources.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/renderer/package.json ./packages/renderer/package.json
RUN pnpm install --frozen-lockfile --filter renderer

COPY . .
RUN pnpm --filter renderer build-font

# Export-only stage: `--output` copies this stage's filesystem to the host.
FROM scratch AS font
COPY --from=build /app/public/fonts/Bravura.subset.woff2 /
