#!/bin/bash
# deploy.sh â€” Full standalone deployment for DocShare
# Serves frontend + backend from the same server (no Netlify)
#
# Usage (two options):
#   Option A â€” run directly from the project directory already on the server:
#     bash deploy.sh
#
#   Option B â€” pull from GitHub (set REPO_URL below):
#     curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/docshare/main/deploy.sh | bash
#
set -e

# â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DOMAIN="clipboard.clipmanz.shop"
EMAIL="admin@clipmanz.shop"
APP_DIR="/root/docshare"
PUBLIC_DIR="${APP_DIR}/public"
DATA_DIR="${APP_DIR}/data"
UPLOADS_DIR="${APP_DIR}/uploads"
NGINX_CONF="/etc/nginx/sites-available/docshare"
REPO_URL="git@github.com:trishanetrx/docshare.git"
BRANCH="main"

# â”€â”€ System deps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
echo "==> Updating system packages..."
apt-get update -y
apt-get install -y curl git nginx certbot python3-certbot-nginx

# â”€â”€ Node.js 20 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if ! node -v 2>/dev/null | grep -q "^v20"; then
    echo "==> Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "==> Node.js $(node -v) / npm $(npm -v)"

# â”€â”€ Clone or update repo (only if REPO_URL is set) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    echo "==> Skipping git clone (REPO_URL not set â€” using files already in ${APP_DIR})"
    # If running via curl|bash the script itself is in /tmp; copy it to APP_DIR if needed
    mkdir -p "$APP_DIR"
fi

# â”€â”€ Directory structure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
mkdir -p "$PUBLIC_DIR" "$DATA_DIR" "$UPLOADS_DIR"

# Copy all frontend assets into public/
echo "==> Copying frontend assets to public/..."
cp "${APP_DIR}"/*.html "$PUBLIC_DIR/"
cp "${APP_DIR}"/*.css  "$PUBLIC_DIR/"
# JS â€” copy client-side files only, exclude server.js
for f in "${APP_DIR}"/*.js; do
    [[ "$(basename "$f")" == "server.js" ]] && continue
    cp "$f" "$PUBLIC_DIR/"
done
# Images / icons
find "${APP_DIR}" -maxdepth 1 -name "*.png" -o -name "*.ico" | xargs -I{} cp {} "$PUBLIC_DIR/" 2>/dev/null || true
[ -d "${APP_DIR}/images" ] && cp -r "${APP_DIR}/images" "$PUBLIC_DIR/"

echo "==> Frontend assets copied to ${PUBLIC_DIR}"

# â”€â”€ .env â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if [ ! -f "${APP_DIR}/.env" ]; then
    echo "==> Creating .env from template..."
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"

    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s|change-me-to-a-long-random-string|${JWT_SECRET}|g" "${APP_DIR}/.env"

    echo ""
    echo "  âš   .env created with a generated JWT_SECRET."
    echo "     Review ${APP_DIR}/.env before going to production."
    echo ""
else
    echo "==> .env already exists, skipping generation."
fi

# â”€â”€ Install Node deps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
echo "==> Installing Node.js dependencies..."
cd "$APP_DIR"
npm install --omit=dev

# â”€â”€ PM2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
echo "==> Setting up PM2..."
npm install -g pm2@latest

# PM2 ecosystem file â€” loads .env via env block and sets NODE_ENV
cat > "${APP_DIR}/ecosystem.config.js" <<'ECOSYSTEM'
require('dotenv').config();   // reads .env into process.env before PM2 forks
module.exports = {
    apps: [{
        name: 'docshare',
        script: './server.js',
        instances: 1,
        autorestart: true,
        watch: false,
        env_production: {
            NODE_ENV: 'production'
        }
    }]
};
ECOSYSTEM

# Install dotenv for the ecosystem loader (small, no other deps)
npm install --save dotenv

pm2 stop docshare   2>/dev/null || true
pm2 delete docshare 2>/dev/null || true
pm2 start "${APP_DIR}/ecosystem.config.js" --env production
pm2 save
pm2 startup systemd -u root --hp /root

# â”€â”€ Nginx â€” initial HTTP-only config for Certbot challenge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
echo "==> Writing initial Nginx config (HTTP only for cert challenge)..."
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
nginx -t
systemctl reload nginx

# â”€â”€ SSL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
echo "==> Requesting SSL certificate for ${DOMAIN}..."
certbot --nginx -d "$DOMAIN" \
    --agree-tos --no-eff-email --email "$EMAIL" \
    --redirect --non-interactive

# â”€â”€ Nginx â€” final HTTPS config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
echo "==> Writing final Nginx config (HTTPS + static files + API proxy)..."
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

    # Allow large file uploads
    client_max_body_size 2500M;

    # â”€â”€ Static frontend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    root   ${PUBLIC_DIR};
    index  index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # â”€â”€ API â†’ Express (localhost:3000) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_cache_bypass \$http_upgrade;

        # Generous timeouts for large uploads/downloads
        proxy_read_timeout    600s;
        proxy_connect_timeout  60s;
        proxy_send_timeout    600s;
    }

    # â”€â”€ Uploaded files served directly by Nginx â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    location /uploads/ {
        alias  ${UPLOADS_DIR}/;
        try_files \$uri =404;
        add_header Cache-Control "public, max-age=3600";
    }

    error_log  /var/log/nginx/${DOMAIN}_error.log;
    access_log /var/log/nginx/${DOMAIN}_access.log;
}
EOF

nginx -t
systemctl reload nginx

# â”€â”€ Done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
echo ""
echo "âœ…  DocShare deployed successfully!"
echo "    https://${DOMAIN}"
echo ""
echo "Useful commands:"
echo "  pm2 logs docshare        â€” live app logs"
echo "  pm2 restart docshare     â€” restart after code changes"
echo "  pm2 status               â€” process status"
echo "  nano ${APP_DIR}/.env     â€” edit environment variables"
echo "  certbot renew --dry-run  â€” test SSL auto-renewal"
