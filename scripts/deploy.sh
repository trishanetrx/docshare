#!/bin/bash
# deploy.sh - Full standalone deployment for DocShare
#
# Usage:
#   Option A - run from the server directly (repo already cloned):
#     bash /root/docshare/scripts/deploy.sh
#
#   Option B - bootstrap from GitHub:
#     curl -fsSL https://raw.githubusercontent.com/trishanetrx/docshare/main/scripts/deploy.sh | bash
#
set -e

# ── Config ────────────────────────────────────────────────────────────────────
DOMAIN="clipboard.clipmanz.shop"
EMAIL="admin@clipmanz.shop"
APP_DIR="/root/docshare"
CLIENT_DIR="${APP_DIR}/client"       # frontend source (served by nginx)
DATA_DIR="${APP_DIR}/data"
UPLOADS_DIR="${APP_DIR}/uploads"
NGINX_CONF="/etc/nginx/sites-available/docshare"
REPO_URL="git@github.com:trishanetrx/docshare.git"
BRANCH="main"

# ── System deps ───────────────────────────────────────────────────────────────
echo "==> Updating system packages..."
apt-get update -y
apt-get install -y curl git nginx certbot python3-certbot-nginx

# ── Node.js 20 ────────────────────────────────────────────────────────────────
if ! node -v 2>/dev/null | grep -q "^v20"; then
    echo "==> Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "==> Node.js $(node -v) / npm $(npm -v)"

# ── Clone or update repo ──────────────────────────────────────────────────────
if [ -n "$REPO_URL" ]; then
    if [ -d "${APP_DIR}/.git" ]; then
        echo "==> Pulling latest code..."
        git -C "$APP_DIR" fetch origin
        git -C "$APP_DIR" reset --hard "origin/${BRANCH}"
    else
        echo "==> Cloning repository..."
        git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    fi
else
    echo "==> Skipping git clone - using files already in ${APP_DIR}"
fi

# ── Runtime directories ───────────────────────────────────────────────────────
mkdir -p "$DATA_DIR" "$UPLOADS_DIR"

# Nginx runs as www-data and cannot read /root by default
chmod 755 /root
chmod -R 755 "$CLIENT_DIR"

# ── .env ──────────────────────────────────────────────────────────────────────
if [ ! -f "${APP_DIR}/.env" ]; then
    echo "==> Creating .env from template..."
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s|change-me-to-a-long-random-string|${JWT_SECRET}|g" "${APP_DIR}/.env"
    echo "  .env created — review ${APP_DIR}/.env before going live."
else
    echo "==> .env already exists, skipping generation."
fi

# ── Node deps ─────────────────────────────────────────────────────────────────
echo "==> Installing Node.js dependencies..."
cd "$APP_DIR"
npm install --omit=dev

# ── PM2 ───────────────────────────────────────────────────────────────────────
echo "==> Setting up PM2..."
npm install -g pm2@latest
npm install --save dotenv

cat > "${APP_DIR}/ecosystem.config.js" <<'ECOSYSTEM'
require('dotenv').config();
module.exports = {
    apps: [{
        name: 'clipboard',
        script: './server.js',
        exec_mode: 'fork',
        instances: 1,
        autorestart: true,
        watch: false,
        env_production: {
            NODE_ENV: 'production',
            PORT: 3001
        }
    }]
};
ECOSYSTEM

pm2 stop clipboard 2>/dev/null || true
pm2 delete clipboard 2>/dev/null || true
pm2 stop docshare  2>/dev/null || true
pm2 delete docshare 2>/dev/null || true
pm2 start "${APP_DIR}/ecosystem.config.js" --env production
pm2 save
pm2 startup systemd -u root --hp /root

# ── Nginx — initial HTTP config (only on first deploy) ────────────────────────
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

if [ ! -f "$CERT_PATH" ]; then
    echo "==> Writing HTTP-only Nginx config for cert challenge..."
    cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/docshare
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx

    echo "==> Requesting SSL certificate for ${DOMAIN}..."
    certbot --nginx -d "$DOMAIN" \
        --agree-tos --no-eff-email --email "$EMAIL" \
        --redirect --non-interactive
else
    echo "==> SSL cert already exists, skipping certbot."
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/docshare
fi

# ── Nginx — final HTTPS config (written on every deploy) ─────────────────────
echo "==> Writing final Nginx config..."
cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 2500M;

    # Serve frontend from client/
    root   ${CLIENT_DIR};
    index  index.html;

    # API proxy — must come before static asset rule
    location /api/ {
        proxy_pass              http://127.0.0.1:3001;
        proxy_http_version      1.1;
        proxy_set_header        Host              \$host;
        proxy_set_header        X-Real-IP         \$remote_addr;
        proxy_set_header        X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header        X-Forwarded-Proto \$scheme;
        proxy_set_header        Upgrade           \$http_upgrade;
        proxy_set_header        Connection        'upgrade';
        proxy_cache_bypass      \$http_upgrade;
        proxy_read_timeout      600s;
        proxy_connect_timeout    60s;
        proxy_send_timeout      600s;
    }

    # Static asset caching (excludes /api/ paths)
    location ~* ^(?!/api/).*\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    error_log  /var/log/nginx/${DOMAIN}_error.log;
    access_log /var/log/nginx/${DOMAIN}_access.log;
}
EOF

nginx -t && systemctl reload nginx

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "Done! DocShare deployed at https://${DOMAIN}"
echo ""
echo "Useful commands:"
echo "  pm2 logs clipboard       - live app logs"
echo "  pm2 restart clipboard    - restart after code changes"
echo "  pm2 status               - process status"
echo "  nano ${APP_DIR}/.env     - edit environment variables"
echo "  certbot renew --dry-run  - test SSL auto-renewal"
