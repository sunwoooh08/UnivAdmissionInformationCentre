#!/usr/bin/env bash
#
# 빈 Ubuntu(22.04 / 24.04) 서버에 본 서비스(API + 웹)와 어드민을 설치·배포한다.
#
#   sudo bash deploy.sh
#
# 처음 실행: 패키지 설치 → GitHub 인증 → 클론 → 환경변수 생성 → 빌드 → screen 으로 실행 → nginx 연결
# 다시 실행: 최신 코드 pull → 빌드 → 재시작 (기존 비밀값과 데이터는 유지)
#
set -Eeuo pipefail

# ───────────────────────── 설정 ─────────────────────────
APP_USER="uaic"
BASE="/opt/uaic"
APP_DIR="$BASE/app"
ADMIN_DIR="$BASE/admin"
CONF_DIR="$BASE/config"
DATA_DIR="$BASE/data"
LOG_DIR="$BASE/logs"
NODE_MAJOR=22
API_PORT=4000
WEB_PORT=3000
ADMIN_PORT=3100
DEFAULT_APP_REPO="sunwoooh08/UnivAdmissionInformationCentre"
DEFAULT_ADMIN_REPO="sunwoooh08/UAIC-admin"
DEFAULT_BRANCH="main"

# ───────────────────────── 공통 함수 ─────────────────────────
c_step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
c_info() { printf '    %s\n' "$*"; }
c_warn() { printf '\033[33m[!] %s\033[0m\n' "$*" >&2; }
die() { printf '\033[31m[x] %s\033[0m\n' "$*" >&2; exit 1; }
trap 'die "${BASH_COMMAND} 실행 중 오류 (line ${LINENO})"' ERR

ask() { # ask VAR "질문" "기본값"
  local __var=$1 __q=$2 __def=${3-} __ans
  if [[ -n $__def ]]; then read -r -p "$__q [$__def]: " __ans </dev/tty; else read -r -p "$__q: " __ans </dev/tty; fi
  printf -v "$__var" '%s' "${__ans:-$__def}"
}
ask_secret() { # ask_secret VAR "질문"
  local __var=$1 __q=$2 __ans
  read -r -s -p "$__q: " __ans </dev/tty; echo
  printf -v "$__var" '%s' "$__ans"
}
ask_yn() { # ask_yn "질문" y|n  → 0(yes)/1(no)
  local __ans __def=${2:-n}
  read -r -p "$1 [$([[ $__def == y ]] && echo Y/n || echo y/N)]: " __ans </dev/tty
  __ans=${__ans:-$__def}
  [[ $__ans =~ ^[Yy] ]]
}
rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "${1:-48}"; }
# 실행 계정으로 명령 실행. 현재 디렉터리(/root 등)에 접근 권한이 없을 수 있어 홈에서 시작한다.
as_app() { (cd / && sudo -u "$APP_USER" -H bash -lc "cd ~ && $*"); }

# env 파일에서 기존 값 읽기 (없으면 빈 문자열)
env_get() { [[ -f $1 ]] && sed -n "s/^$2='\(.*\)'$/\1/p" "$1" | tail -1 || true; }

# 작은따옴표로 감싸 저장 (해시에 들어 있는 $ 가 셸에서 풀리지 않도록)
write_env() { # write_env 파일 KEY=VALUE...
  local file=$1; shift
  umask 077
  : >"$file"
  local kv
  for kv in "$@"; do printf "%s='%s'\n" "${kv%%=*}" "${kv#*=}" >>"$file"; done
  chown "$APP_USER:$APP_USER" "$file"
  chmod 600 "$file"
}

# ───────────────────────── 0. 권한 확인 ─────────────────────────
if [[ $EUID -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi
. /etc/os-release
[[ ${ID:-} == ubuntu ]] || c_warn "Ubuntu가 아닌 배포판(${PRETTY_NAME:-unknown})입니다. 계속 진행합니다."

cd /

FIRST_RUN=1
[[ -f $CONF_DIR/api.env ]] && FIRST_RUN=0

# ───────────────────────── 1. 입력 받기 ─────────────────────────
c_step "설정 입력"
ask GH_USER "GitHub 사용자명" "$(sudo -u "$APP_USER" git config --global user.name 2>/dev/null || echo sunwoooh08)"
if [[ -f /home/$APP_USER/.git-credentials ]] && ! ask_yn "저장된 GitHub 토큰이 있습니다. 새로 입력할까요?" n; then
  GH_TOKEN=""
else
  c_info "비공개 저장소라면 repo 읽기 권한이 있는 Personal Access Token 이 필요합니다."
  c_info "(GitHub → Settings → Developer settings → Fine-grained tokens → Contents: Read-only)"
  ask_secret GH_TOKEN "GitHub 토큰 (공개 저장소면 Enter)"
fi
ask APP_REPO "본 서비스 저장소" "$DEFAULT_APP_REPO"
ask ADMIN_REPO "어드민 저장소" "$DEFAULT_ADMIN_REPO"
ask BRANCH "배포할 브랜치" "$DEFAULT_BRANCH"

OLD_DOMAIN=$(env_get "$CONF_DIR/deploy.env" DOMAIN)
ask DOMAIN "도메인 (없으면 Enter → IP로 접속)" "$OLD_DOMAIN"

ADMIN_USERNAME=$(env_get "$CONF_DIR/admin.env" ADMIN_USERNAME)
ADMIN_PASSWORD_HASH=$(env_get "$CONF_DIR/admin.env" ADMIN_PASSWORD_HASH)
ADMIN_PW=""
if [[ -z $ADMIN_PASSWORD_HASH ]] || ask_yn "어드민 계정을 다시 설정할까요?" n; then
  ask ADMIN_USERNAME "어드민 아이디" "${ADMIN_USERNAME:-admin}"
  while :; do
    ask_secret ADMIN_PW "어드민 비밀번호 (10자 이상)"
    ask_secret ADMIN_PW2 "비밀번호 확인"
    [[ ${#ADMIN_PW} -ge 10 && $ADMIN_PW == "$ADMIN_PW2" ]] && break
    c_warn "10자 이상이고 두 번 같게 입력해야 합니다."
  done
fi

OLD_ADMIN_PUBLIC=$(env_get "$CONF_DIR/deploy.env" ADMIN_PUBLIC)
if ask_yn "어드민을 외부에 공개할까요? (아니오 = SSH 터널로만 접속, 권장)" "${OLD_ADMIN_PUBLIC:-n}"; then
  ADMIN_PUBLIC=y
else
  ADMIN_PUBLIC=n
fi

USE_TLS=n
if [[ -n $DOMAIN ]] && ask_yn "Let's Encrypt 로 HTTPS 인증서를 발급할까요? (도메인 DNS가 이 서버를 가리켜야 함)" "$(env_get "$CONF_DIR/deploy.env" USE_TLS || echo n)"; then
  USE_TLS=y
  ask TLS_EMAIL "인증서 알림 받을 이메일" "$(env_get "$CONF_DIR/deploy.env" TLS_EMAIL)"
fi

SETUP_UFW=n
if ask_yn "방화벽(ufw)을 켜고 SSH·HTTP·HTTPS만 열까요?" y; then SETUP_UFW=y; fi

# ───────────────────────── 2. 패키지 설치 ─────────────────────────
c_step "시스템 패키지 설치 (apt)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git screen nginx build-essential openssl cron

if ! command -v node >/dev/null || [[ $(node -p 'process.versions.node.split(".")[0]') -lt $NODE_MAJOR ]]; then
  c_info "Node.js ${NODE_MAJOR}.x 저장소 추가"
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    >/etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
fi
c_info "node $(node -v), npm $(npm -v)"

if [[ $USE_TLS == y ]]; then apt-get install -y certbot python3-certbot-nginx; fi

# ───────────────────────── 3. 실행 계정·디렉터리 ─────────────────────────
c_step "실행 계정(${APP_USER})과 디렉터리 준비"
id "$APP_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" -m 0755 "$BASE" "$LOG_DIR"
install -d -o "$APP_USER" -g "$APP_USER" -m 0700 "$CONF_DIR" "$DATA_DIR"

# ───────────────────────── 4. GitHub 인증 & 코드 받기 ─────────────────────────
c_step "GitHub 인증 정보 저장"
as_app "git config --global user.name '$GH_USER'"
as_app "git config --global credential.helper store"
if [[ -n $GH_TOKEN ]]; then
  umask 077
  printf 'https://%s:%s@github.com\n' "$GH_USER" "$GH_TOKEN" >"/home/$APP_USER/.git-credentials"
  chown "$APP_USER:$APP_USER" "/home/$APP_USER/.git-credentials"
  chmod 600 "/home/$APP_USER/.git-credentials"
  c_info "~${APP_USER}/.git-credentials 에 저장 (권한 600)"
fi
unset GH_TOKEN

sync_repo() { # sync_repo owner/name 경로
  local repo=$1 dir=$2
  if [[ -d $dir/.git ]]; then
    c_info "$repo 업데이트"
    as_app "cd '$dir' && git fetch --prune origin '$BRANCH' && git checkout -q '$BRANCH' && git reset --hard -q 'origin/$BRANCH'"
  else
    c_info "$repo 클론"
    as_app "git clone --branch '$BRANCH' 'https://github.com/$repo.git' '$dir'"
  fi
  as_app "cd '$dir' && git log -1 --format='    %h %s'"
}
c_step "코드 받기"
sync_repo "$APP_REPO" "$APP_DIR"
sync_repo "$ADMIN_REPO" "$ADMIN_DIR"

# ───────────────────────── 5. 환경변수 ─────────────────────────
c_step "환경변수 파일 생성 (${CONF_DIR})"
ADMIN_TOKEN=$(env_get "$CONF_DIR/api.env" ADMIN_TOKEN); [[ ${#ADMIN_TOKEN} -ge 32 ]] || ADMIN_TOKEN=$(rand 64)
SESSION_SECRET=$(env_get "$CONF_DIR/admin.env" SESSION_SECRET); [[ ${#SESSION_SECRET} -ge 32 ]] || SESSION_SECRET=$(rand 64)
LOG_RETENTION_DAYS=$(env_get "$CONF_DIR/api.env" LOG_RETENTION_DAYS); LOG_RETENTION_DAYS=${LOG_RETENTION_DAYS:-90}

if [[ -n $ADMIN_PW ]]; then
  ADMIN_PASSWORD_HASH=$(cd "$ADMIN_DIR" && printf '%s' "$ADMIN_PW" | sudo -u "$APP_USER" -H node scripts/hash-password.mjs)
  unset ADMIN_PW ADMIN_PW2
fi

# 어드민은 항상 127.0.0.1 에만 열고, 외부 공개를 고르면 nginx 가 대신 받는다.
# 어드민 접속은 SSH 터널(http://localhost) 또는 nginx 의 http 포트이므로 Secure 쿠키는 쓰지 않는다.
COOKIE_SECURE=false
ADMIN_HOST=127.0.0.1

write_env "$CONF_DIR/api.env" \
  "NODE_ENV=production" "HOST=127.0.0.1" "PORT=$API_PORT" "DATA_DIR=$DATA_DIR" \
  "ADMIN_TOKEN=$ADMIN_TOKEN" "ADMIN_ALLOWED_IPS=127.0.0.1,::1" \
  "TRUST_PROXY=loopback" "LOG_RETENTION_DAYS=$LOG_RETENTION_DAYS"
write_env "$CONF_DIR/web.env" \
  "NODE_ENV=production" "HOST=127.0.0.1" "PORT=$WEB_PORT" \
  "API_INTERNAL_URL=http://127.0.0.1:$API_PORT" "LOG_RETENTION_DAYS=$LOG_RETENTION_DAYS"
write_env "$CONF_DIR/admin.env" \
  "NODE_ENV=production" "HOST=$ADMIN_HOST" "PORT=$ADMIN_PORT" \
  "API_INTERNAL_URL=http://127.0.0.1:$API_PORT" "ADMIN_TOKEN=$ADMIN_TOKEN" \
  "ADMIN_USERNAME=$ADMIN_USERNAME" "ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH" \
  "SESSION_SECRET=$SESSION_SECRET" "COOKIE_SECURE=$COOKIE_SECURE"
write_env "$CONF_DIR/deploy.env" \
  "DOMAIN=$DOMAIN" "ADMIN_PUBLIC=$ADMIN_PUBLIC" "USE_TLS=$USE_TLS" "TLS_EMAIL=${TLS_EMAIL:-}"

# ───────────────────────── 6. 빌드 ─────────────────────────
c_step "본 서비스 빌드"
as_app "cd '$APP_DIR' && npm ci --no-audit --no-fund && set -a && . '$CONF_DIR/web.env' && set +a && npm run build && npm test"
c_step "어드민 빌드"
as_app "cd '$ADMIN_DIR' && npm ci --no-audit --no-fund && npm run build"

# ───────────────────────── 7. screen 으로 실행 ─────────────────────────
c_step "서비스 실행 (screen)"
cat >"$BASE/start.sh" <<EOF
#!/usr/bin/env bash
# screen 세션 3개(uaic-api, uaic-web, uaic-admin)를 (재)시작한다. ${APP_USER} 계정으로 실행.
set -euo pipefail
run() { # run 이름 디렉터리 env파일 명령
  screen -S "\$1" -X quit >/dev/null 2>&1 || true
  screen -dmS "\$1" bash -c "cd '\$2' && set -a && . '\$3' && set +a && \$4 2>&1 | tee -a '$LOG_DIR/\$1.log'"
}
run uaic-api   '$APP_DIR'   '$CONF_DIR/api.env'   'npm run start -w @susi/api'
sleep 2
run uaic-web   '$APP_DIR'   '$CONF_DIR/web.env'   'npm run start -w @susi/web'
run uaic-admin '$ADMIN_DIR' '$CONF_DIR/admin.env' 'npm run start'
screen -ls || true
EOF
chown "$APP_USER:$APP_USER" "$BASE/start.sh"
chmod 750 "$BASE/start.sh"
as_app "'$BASE/start.sh'"

# 재부팅 시 자동 실행
( crontab -u "$APP_USER" -l 2>/dev/null | grep -v "$BASE/start.sh" || true
  echo "@reboot sleep 15 && $BASE/start.sh >> $LOG_DIR/boot.log 2>&1" ) | crontab -u "$APP_USER" -
if pidof systemd >/dev/null 2>&1; then systemctl enable --now cron >/dev/null 2>&1 || true; else service cron start >/dev/null 2>&1 || true; fi

# 로그 파일 정리 (logrotate)
cat >/etc/logrotate.d/uaic <<EOF
$LOG_DIR/*.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
  copytruncate
}
EOF

# ───────────────────────── 8. nginx ─────────────────────────
c_step "nginx 설정"
SERVER_NAME=${DOMAIN:-_}
cat >/etc/nginx/sites-available/uaic <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $SERVER_NAME;

    client_max_body_size 1m;
    server_tokens off;

    location / {
        proxy_pass http://127.0.0.1:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
if [[ $ADMIN_PUBLIC == y ]]; then
  cat >>/etc/nginx/sites-available/uaic <<EOF

# 어드민 (외부 공개를 선택한 경우에만)
server {
    listen $((ADMIN_PORT + 1000));
    listen [::]:$((ADMIN_PORT + 1000));
    server_name $SERVER_NAME;
    server_tokens off;
    location / {
        proxy_pass http://127.0.0.1:$ADMIN_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
fi
ln -sf /etc/nginx/sites-available/uaic /etc/nginx/sites-enabled/uaic
rm -f /etc/nginx/sites-enabled/default
nginx -t
if pidof systemd >/dev/null 2>&1; then
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl reload nginx || systemctl restart nginx
else
  # systemd 가 없는 환경(일부 컨테이너)
  nginx -s reload 2>/dev/null || nginx
fi

if [[ $USE_TLS == y ]]; then
  c_step "HTTPS 인증서 발급"
  certbot --nginx --non-interactive --agree-tos --redirect -m "$TLS_EMAIL" -d "$DOMAIN" || c_warn "인증서 발급 실패. DNS 설정을 확인한 뒤 다시 실행하세요."
fi

# ───────────────────────── 9. 방화벽 ─────────────────────────
if [[ $SETUP_UFW == y ]]; then
  c_step "방화벽(ufw)"
  apt-get install -y ufw
  ufw allow OpenSSH >/dev/null
  ufw allow 'Nginx Full' >/dev/null
  [[ $ADMIN_PUBLIC == y ]] && ufw allow "$((ADMIN_PORT + 1000))/tcp" >/dev/null
  ufw --force enable >/dev/null
  ufw status | sed 's/^/    /'
fi

# ───────────────────────── 10. 확인 ─────────────────────────
c_step "동작 확인"
check() { # check 이름 URL
  local i
  for i in $(seq 1 30); do
    if curl -fsS -o /dev/null "$2"; then c_info "OK   $1 ($2)"; return 0; fi
    sleep 2
  done
  c_warn "FAIL $1 ($2) — 로그: $LOG_DIR/"
  return 0
}
check "API"   "http://127.0.0.1:$API_PORT/api/health"
check "웹"    "http://127.0.0.1:$WEB_PORT/"
check "어드민" "http://127.0.0.1:$ADMIN_PORT/login"
check "nginx" "http://127.0.0.1/"

PUBLIC_IP=$(curl -fsS -4 --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
SCHEME=http; [[ $USE_TLS == y ]] && SCHEME=https
HOSTPART=${DOMAIN:-$PUBLIC_IP}

c_step "완료"
cat <<EOF
    사이트          $SCHEME://$HOSTPART
EOF
if [[ $ADMIN_PUBLIC == y ]]; then
  echo "    어드민          http://$HOSTPART:$((ADMIN_PORT + 1000))"
else
  cat <<EOF
    어드민          내 PC에서: ssh -L $ADMIN_PORT:127.0.0.1:$ADMIN_PORT <계정>@$HOSTPART
                    그다음 브라우저에서 http://localhost:$ADMIN_PORT
EOF
fi
cat <<EOF

    실행 화면 보기  sudo -u $APP_USER screen -r uaic-api | uaic-web | uaic-admin   (빠져나오기: Ctrl+A, D)
    로그            $LOG_DIR/
    데이터          $DATA_DIR/   (직접 추가한 지원 정보, 접속 기록)
    설정            $CONF_DIR/*.env
    재시작          sudo -u $APP_USER $BASE/start.sh
    업데이트        sudo bash $APP_DIR/deploy/deploy.sh
EOF
[[ $FIRST_RUN == 1 ]] && echo && c_info "재부팅해도 cron(@reboot)으로 자동으로 다시 뜹니다."
exit 0
