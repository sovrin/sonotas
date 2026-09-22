# Production image — prerenders the Nuxt app to static files and serves them
# with static-web-server (no Node at runtime; everything runs in the browser):
#
#   docker compose up -d --build
#
# Regenerate the music font (a Bravura subset renamed to "Sonotas Music") using
# pinned tooling (Node + harfbuzz + woff2 + fontTools), then export the result
# to the host — no local system deps needed:
#
#   docker build --target font --output public/fonts .
#
# writes public/fonts/sonotas-music.woff2 on the host.
FROM node:24-slim AS deps

# pnpm ships with the Node image via corepack; activate the pinned version.
RUN corepack enable

WORKDIR /app

# Warm the dependency cache from the workspace manifests before copying sources.
# Scripts are skipped: `nuxt prepare` (postinstall) needs the sources, and
# `nuxt generate` prepares on its own anyway.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/renderer/package.json ./packages/renderer/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS font-build

# hb-subset (libharfbuzz-bin) subsets the CFF outlines, ttx (fonttools) rewrites
# the internal names away from Bravura's reserved font name, woff2_compress packs
# the result. The wasm harfbuzz ports drop CFF outlines, so we need the real binaries.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libharfbuzz-bin woff2 fonttools \
    && rm -rf /var/lib/apt/lists/*

COPY packages/renderer ./packages/renderer
RUN pnpm --filter renderer build-font

# Export-only stage: `--output` copies this stage's filesystem to the host.
FROM scratch AS font
COPY --from=font-build /app/public/fonts/sonotas-music.woff2 /

FROM deps AS build

COPY . .
# public/fonts is kept out of the build context; use the freshly built subset.
COPY --from=font-build /app/public/fonts/sonotas-music.woff2 ./public/fonts/
RUN pnpm generate

FROM joseluisq/static-web-server:2 AS runtime

ENV SERVER_CONFIG_FILE=/sws.toml

COPY sws.toml /sws.toml
COPY --from=build /app/.output/public /public
# Redistributing alphaTab and mediabunny (MPL-2.0) and the Bravura subset (OFL)
# requires their notices to travel with the image.
COPY --from=build /app/THIRD_PARTY_NOTICES.md /app/LICENSE /public/

EXPOSE 3000
