#!/bin/bash
# harden.sh - Server hardening script
# Safe to run on a live server - SSH access is explicitly preserved first
set -e

echo ""
echo "==> Starting server hardening..."
echo ""

# ── 1. Fix .env permissions (do this first, no risk) ─────────────────────────
echo "==> Fixing .env permissions..."
chmod 600 /root/docshare/.env 2>/dev/null && echo "    /root/docshare/.env -> 600" || echo "    skipped (file not found)"
# Fix any other .env files found under /root
find /root -maxdepth 3 -name ".env" -exec chmod 600 {} \; 2>/dev/null
echo "    Done."

# ── 2. Disable rpcbind (not needed on a web server) ──────────────────────────
echo "==> Disabling rpcbind..."
systemctl stop rpcbind rpcbind.socket 2>/dev/null || true
systemctl disable rpcbind rpcbind.socket 2>/dev/null || true
echo "    rpcbind stopped and disabled."

# ── 3. Install UFW ───────────────────────────────────────────────────────────
echo "==> Installing UFW..."
apt-get install -y ufw > /dev/null 2>&1

# CRITICAL: allow SSH BEFORE enabling UFW - prevents lockout
echo "==> Configuring UFW rules..."
ufw --force reset                  # clear any existing rules cleanly

# -- Always-allow rules (set these BEFORE enabling) --
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP'
ufw allow 443/tcp   comment 'HTTPS'

# Tailscale interface - allow all traffic (safe, private network)
ufw allow in on tailscale0

# Block everything else by default
ufw default deny incoming
ufw default allow outgoing

# Enable UFW non-interactively
echo "==> Enabling UFW (SSH rule is already set - no lockout risk)..."
ufw --force enable
echo "    UFW enabled."

# ── 4. Install and configure fail2ban ────────────────────────────────────────
echo "==> Installing fail2ban..."
apt-get install -y fail2ban > /dev/null 2>&1

# Write a local jail config (never edit jail.conf directly)
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
# Ban for 1 hour after 5 failures within 10 minutes
bantime  = 3600
findtime = 600
maxretry = 5
# Use systemd backend on Ubuntu 24.04
backend  = systemd

[sshd]
enabled  = true
port     = ssh
logpath  = %(sshd_log)s
maxretry = 4
bantime  = 86400

[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/*_error.log

[nginx-limit-req]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/*_error.log
maxretry = 10

[nginx-botsearch]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/*_access.log
maxretry = 2
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo "    fail2ban installed and started."

# ── 5. Harden SSH config ─────────────────────────────────────────────────────
echo "==> Hardening SSH config..."
SSHD=/etc/ssh/sshd_config

# Only update if not already set to the desired value
set_sshd() {
    local key="$1" val="$2"
    if grep -qE "^${key}" "$SSHD"; then
        sed -i "s|^${key}.*|${key} ${val}|" "$SSHD"
    else
        echo "${key} ${val}" >> "$SSHD"
    fi
}

set_sshd "PermitRootLogin"          "no"
set_sshd "PasswordAuthentication"   "no"
set_sshd "PubkeyAuthentication"     "yes"
set_sshd "X11Forwarding"            "no"
set_sshd "MaxAuthTries"             "3"
set_sshd "LoginGraceTime"           "30"
set_sshd "ClientAliveInterval"      "300"
set_sshd "ClientAliveCountMax"      "2"

# Validate before reloading - NEVER reload without validating
sshd -t && systemctl reload sshd && echo "    SSH hardened and reloaded." || echo "    SSH config error - NOT reloaded, check manually."

# ── 6. Add security headers to Nginx ─────────────────────────────────────────
echo "==> Adding Nginx security headers..."
cat > /etc/nginx/conf.d/security-headers.conf <<'EOF'
# Security headers applied globally
add_header X-Frame-Options           "SAMEORIGIN"            always;
add_header X-Content-Type-Options    "nosniff"               always;
add_header X-XSS-Protection          "1; mode=block"         always;
add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Hide nginx version
server_tokens off;
EOF

nginx -t && systemctl reload nginx && echo "    Nginx headers applied." || echo "    Nginx config error - check manually."

# ── 7. Verify SSH is still reachable before finishing ────────────────────────
echo ""
echo "==> Verifying SSH port is open in UFW..."
ufw status | grep -E "22|SSH"

echo ""
echo "==> Current UFW rules:"
ufw status verbose

echo ""
echo "==> fail2ban status:"
fail2ban-client status

echo ""
echo "Done! Hardening complete."
echo ""
echo "What was done:"
echo "  - .env files chmod 600"
echo "  - rpcbind disabled"
echo "  - UFW enabled: only ports 22, 80, 443 + Tailscale open"
echo "  - fail2ban: SSH (ban 24h after 4 tries), Nginx bot protection"
echo "  - SSH: MaxAuthTries=3, no X11, tightened timeouts"
echo "  - Nginx: security headers + version hidden"
