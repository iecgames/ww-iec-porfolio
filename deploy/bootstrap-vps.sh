#!/usr/bin/env bash
# Dựng hạ tầng nền cho VPS trống: Docker + rsync + network `web` + Traefik.
# Chạy TRÊN VPS. Idempotent — chạy lại nhiều lần không hỏng gì.
#
#   scp deploy/bootstrap-vps.sh quangbd@<IP>:/tmp/ && ssh quangbd@<IP> 'bash /tmp/bootstrap-vps.sh'
#
# Image minimal của GCP thiếu cả `gpg` lẫn `rsync` — kể cả bản 22.04. Đó là do
# image minimal, không phải do phiên bản Ubuntu. Cài trước, đừng đoán là có sẵn.

set -euo pipefail

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }

# Boot đầu tiên của image Ubuntu chạy unattended-upgrades, nó giữ lock apt vài
# phút. Không chờ thì script chết với "Could not get lock" — mà đó chỉ là vấn đề
# thời điểm, không phải lỗi thật.
log "Chờ apt rảnh"
for _ in $(seq 1 60); do
  if sudo fuser /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock >/dev/null 2>&1; then
    printf '.'; sleep 10
  else
    break
  fi
done
echo

# Máy bị reboot giữa lúc apt đang chạy sẽ để dpkg ở trạng thái dở, và MỌI lệnh
# apt sau đó fail với "dpkg was interrupted". Dọn trước, rẻ và vô hại khi sạch.
log "Dọn dpkg dở dang (nếu có)"
sudo dpkg --configure -a 2>/dev/null || true

log "Gói nền (gpg cho apt key, rsync cho deploy)"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  ca-certificates curl gnupg rsync >/dev/null

if ! command -v docker >/dev/null 2>&1; then
  log "Docker CE từ repo chính thức"
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null

  # Cho user hiện tại chạy docker không cần sudo. Chỉ có hiệu lực ở PHIÊN ĐĂNG
  # NHẬP SAU — trong chính phiên này vẫn phải sudo.
  sudo usermod -aG docker "$USER"
else
  log "Docker đã có, bỏ qua"
fi

log "Network web (Traefik chỉ định tuyến được tới container cùng network này)"
sudo docker network inspect web >/dev/null 2>&1 || sudo docker network create web

log "Thư mục deploy"
sudo mkdir -p /opt/traefik /opt/iec-web
sudo chown "$USER":"$USER" /opt/traefik /opt/iec-web

log "Kết quả"
docker --version
docker compose version
sudo systemctl is-active docker | sed 's/^/docker service: /'

cat <<'EOF'

Xong phần nền. Bước tiếp theo chạy TỪ MÁY LOCAL:

  deploy/deploy-app.sh <IP>

Nó đẩy compose của traefik, code, .env rồi build + up.
EOF
