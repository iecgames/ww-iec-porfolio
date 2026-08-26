# ============================================================
# Stage 1: base — Node 22 Alpine with pnpm enabled
# ============================================================
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@9 --activate

# ============================================================
# Stage 2: deps — install all dependencies
# ============================================================
FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Build native modules (sharp, esbuild, etc.) for linux/alpine
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: builder — compile the Next.js + Payload app
# ============================================================
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time.
# Pass the production URL via --build-arg when running docker build.
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--no-deprecation

# DATABASE_URL is required by generateStaticParams (Payload queries DB during next build).
# PAYLOAD_SECRET is required by withPayload at build time.
ARG DATABASE_URL
ARG PAYLOAD_SECRET=placeholder-build-secret
ENV DATABASE_URL=$DATABASE_URL
ENV PAYLOAD_SECRET=$PAYLOAD_SECRET

# storagePlugin() throws when GCS_BUCKET is unset, and it loads during `next
# build`. docker-compose already passes this as a build arg, but without the
# ARG declared here Docker discards it and the build fails.
ARG GCS_BUCKET
ENV GCS_BUCKET=$GCS_BUCKET

RUN pnpm run build

# ============================================================
# Stage 4: runner — minimal production image
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--no-deprecation

# Run as non-root for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Next.js standalone bundles everything needed into .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public

# The image optimizer needs sharp at runtime. Next's file tracing pulls in the
# sharp JS package but NOT its native @img/sharp-<platform> binding, which is a
# separate optional dependency resolved at require() time — verified by
# inspecting .next/standalone/node_modules after a build. Installing it here
# fetches the musl build matching this base image.
# Keep the version in step with package.json.
#
# CÀI Ở THƯ MỤC TẠM RỒI COPY, tuyệt đối không `npm install` thẳng trong /app.
# Chạy npm trong /app là bắt nó resolve lại TOÀN BỘ cây phụ thuộc của bản
# standalone — cây đã bị Next cắt tỉa nên npm không dựng lại nổi. Hai kiểu chết
# đã gặp thật, cùng một gốc:
#   - ERESOLVE: `@payloadcms/email-resend` khai "^3.84.1" (chỉ mình nó có dấu ^,
#     các @payloadcms khác ghim chính xác) → npm nhấc lên 3.88.0, đòi peer
#     payload@3.88.0 trong khi payload ghim cứng 3.84.1
#   - "Cannot read properties of null (reading 'isDescendantOf')": npm tự crash
#     khi đối chiếu cây tỉa. `--legacy-peer-deps` KHÔNG cứu được, nó chỉ tắt
#     kiểm tra peer chứ vẫn đụng vào cây.
#
# Chỉ `@img/sharp-<platform>` là thiếu thật. File tracing của Next đã kéo sẵn
# gói JS `sharp` và các dependency của nó vào standalone, nhưng binding native
# là optionalDependency resolve lúc require() nên bị bỏ lại. Cài sharp cùng
# phiên bản ở /tmp để lấy đúng bản musl của @img, copy sang, xong.
# Giữ phiên bản khớp với package.json.
RUN mkdir -p /tmp/sharp-src && cd /tmp/sharp-src \
    && echo '{"name":"sharp-src","private":true}' > package.json \
    && npm install --omit=dev --no-audit --no-fund --no-package-lock sharp@0.34.2 \
    && cp -R /tmp/sharp-src/node_modules/@img /app/node_modules/ \
    && rm -rf /tmp/sharp-src /root/.npm \
    && chown -R nextjs:nodejs /app/node_modules/@img \
    && [ -d /app/node_modules/sharp ] && chown -R nextjs:nodejs /app/node_modules/sharp

# Ensure the media directory exists before the volume is mounted
RUN mkdir -p /app/public/media \
    && chown nextjs:nodejs /app/public/media

# Same for the image optimizer's cache — it is a named volume in
# docker-compose, and the server must be able to write to it as `nextjs`.
RUN mkdir -p /app/.next/cache/images \
    && chown -R nextjs:nodejs /app/.next/cache

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
