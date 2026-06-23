#!/bin/bash
# Fix Nginx config - move /api/ block BEFORE the static asset regex
# so DELETE/PUT requests to /api/files/*.ext aren't blocked by Nginx
cat > /etc/nginx/sites-available/docshare << 'EOF'
server {
    listen 80;
    server_name clipboard.clipmanz.shop;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name clipboard.clipmanz.shop;

    ssl_certificate     /etc/letsencrypt/live/clipboard.clipmanz.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clipboard.clipmanz.shop/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 2500M;

    root   /root/docshare/public;
    index  index.html;

    # API proxy MUST come before the static asset regex
    # so /api/files/photo.jpg DELETE isn't caught by the regex below
    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout    600s;
        proxy_connect_timeout  60s;
        proxy_send_timeout    600s;
    }

    # Static asset caching (only applies to non-API paths now)
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /uploads/ {
        alias  /root/docshare/uploads/;
        try_files $uri =404;
        add_header Cache-Control "public, max-age=3600";
    }

    error_log  /var/log/nginx/clipboard.clipmanz.shop_error.log;
    access_log /var/log/nginx/clipboard.clipmanz.shop_access.log;
}
EOF

nginx -t && systemctl reload nginx && echo "Nginx fixed and reloaded"
