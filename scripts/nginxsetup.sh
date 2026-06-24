#!/bin/bash

# === CONFIG ===
DOMAIN="copythingz.shop"
EMAIL="you@example.com"  # <-- Change this to your real email
NGINX_CONF="/etc/nginx/sites-available/clipboard-backend"

# === Create NGINX HTTP config for Let's Encrypt challenge ===
echo "Creating temporary NGINX config for HTTP challenge..."

sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

# Enable site and reload NGINX
echo "Enabling NGINX config and reloading..."
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo nginx -t || { echo "NGINX config test failed!"; exit 1; }
sudo systemctl reload nginx

# === Obtain SSL certificate ===
echo "Requesting SSL certificate via Certbot..."
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
    --agree-tos --no-eff-email --email "$EMAIL" || {
    echo "Certbot failed. Aborting."; exit 1;
}

# === Write final HTTPS config ===
echo "Writing final HTTPS config to $NGINX_CONF..."

sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 700M;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;

        if (\$request_method = OPTIONS) {
            add_header 'Access-Control-Allow-Origin' \$http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain';
            return 204;
        }
    }

    location /uploads/ {
        alias /root/clipboard-backend/uploads;
        try_files \$uri \$uri/ =404;
        add_header Cache-Control "public, max-age=3600";
    }

    error_log /var/log/nginx/${DOMAIN}_error.log;
    access_log /var/log/nginx/${DOMAIN}_access.log;
}
EOF

# Reload NGINX
echo "Reloading NGINX with HTTPS config..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ SSL and NGINX setup completed successfully for $DOMAIN!"
