#!/usr/bin/env bash
# Đẩy code + .env lên VPS, dựng Traefik, build image. Chạy TỪ MÁY LOCAL.
#
#   deploy/deploy-app.sh              # rsync + traefik + build (KHÔNG start app)
#   deploy/deploy-app.sh --up         # thêm bước start app
#
# Cố ý TÁCH build khỏi up: `up` làm Traefik xin cert Let's Encrypt ngay. Nếu A
# record chưa trỏ đúng, ACME fail — mà LE giới hạn 5 lần fail/giờ cho mỗi
# hostname. Build trước, chỉ `up` khi DNS đã đúng, thì không đốt hạn mức.

set -euo pipefail

HOST="${HOST:-34.21.149.213}"
USER_="${SSH_USER:-quangbd}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY="$REPO_DIR/.credential/vps-quangbd.key"
ENV_SRC="$REPO_DIR/.credential/env.production"
REMOTE=/opt/iec-web/ww-iec-porfolio

SSH=(ssh -i "$KEY" -o ServerAliveInterval=15 "$USER_@$HOST")
log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }

[ -f "$KEY" ]     || { echo "Thiếu $KEY"; exit 1; }
[ -f "$ENV_SRC" ] || { echo "Thiếu $ENV_SRC"; exit 1; }

log "Traefik"
scp -q -i "$KEY" "$REPO_DIR/deploy/traefik/docker-compose.yml" "$USER_@$HOST:/opt/traefik/"
"${SSH[@]}" 'cd /opt/traefik && sudo docker compose up -d' 2>&1 | tail -2

log "Đồng bộ code (bỏ node_modules, build artifact, credential)"
rsync -az --delete --exclude-from="$REPO_DIR/deploy/rsync-exclude.txt" \
  -e "ssh -i $KEY" "$REPO_DIR/" "$USER_@$HOST:$REMOTE/"

log "Đẩy .env (chmod 600)"
scp -q -i "$KEY" "$ENV_SRC" "$USER_@$HOST:$REMOTE/.env"
"${SSH[@]}" "chmod 600 $REMOTE/.env"

log "Build image (vài phút — Payload query Mongo ngay trong lúc build)"
"${SSH[@]}" "cd $REMOTE && sudo docker compose -f docker-compose.prod.yml build"

if [ "${1:-}" = "--up" ]; then
  log "Start app"
  "${SSH[@]}" "cd $REMOTE && sudo docker compose -f docker-compose.prod.yml up -d"
  sleep 10
  "${SSH[@]}" 'sudo docker ps --format "table {{.Names}}\t{{.Status}}"'
else
  cat <<EOF

Build xong. Chưa start app.

Trước khi start, xác nhận DNS đã trỏ đúng:
  dig +short ww-iec.haleinteractive.vn      # phải ra $HOST

Rồi chạy:
  deploy/deploy-app.sh --up
EOF
fi
