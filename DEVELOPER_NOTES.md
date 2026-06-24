# Developer Notes
> Last updated: June 2026  
> Author: VentiqoTech  
> Projects: `docshare` (production) · `docshare-v2` (next version, local)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [docshare — Production App](#3-docshare--production-app)
4. [docshare-v2 — Next Version](#4-docshare-v2--next-version)
5. [Server & Infrastructure](#5-server--infrastructure)
6. [Deployment](#6-deployment)
7. [Security Model](#7-security-model)
8. [API Reference](#8-api-reference)
9. [Data Storage](#9-data-storage)
10. [Known Limitations & Future Work](#10-known-limitations--future-work)
11. [Common Commands Cheatsheet](#11-common-commands-cheatsheet)

---

## 1. Project Overview

**ClipShare / DocShare** is a self-hosted clipboard and file sharing web app.

### Core features
| Feature | Description |
|---|---|
| Clipboard sync | Save text snippets, access from any device |
| File upload | Multi-file upload, up to 20 files × 2500 MB each |
| File download | Authenticated streaming download with progress bar |
| PIN sharing | Share any file via a 6-char PIN (no login needed to download) |
| Auth | JWT (8h expiry) + bcrypt password hashing |

### Live URL
```
https://clipboard.clipmanz.shop
```

### Server
```
Provider : Oracle Cloud (always-free tier)
IP       : 140.245.103.63
OS       : Ubuntu 24.04 LTS
SSH user : ubuntu  (sudo access)
SSH key  : stored locally at  F:\My -Github-Projects\docshare\testserver
           NEVER commit this key — it is in .gitignore
```

---

## 2. Repository Structure

```
F:\My -Github-Projects\
├── docshare\          ← Production app (vanilla JS frontend)
├── docshare-v2\       ← Next version (React + Vite frontend)
└── DEVELOPER_NOTES.md ← This file
```

---

## 3. docshare — Production App

### Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 20 |
| Framework | Express 4 |
| Auth | jsonwebtoken 9 + bcryptjs 2 |
| File upload | multer 2 |
| Config | dotenv 16 |
| Process manager | PM2 (production) |
| Web server | Nginx (reverse proxy + SSL) |
| SSL | Let's Encrypt via Certbot |
| Frontend | Vanilla HTML / CSS / JS (no build step) |

### Folder layout
```
docshare/
├── server.js                  ← Entry point — loads .env, starts app on PORT
├── src/
│   ├── app.js                 ← Express app factory (no listen call here)
│   ├── middleware/
│   │   └── authenticate.js    ← JWT Bearer token middleware
│   ├── routes/
│   │   ├── auth.js            ← POST /api/auth/register  POST /api/auth/login
│   │   ├── clipboard.js       ← GET/POST/DELETE /api/clipboard
│   │   ├── files.js           ← POST /api/files/upload  GET/DELETE /api/files/:filename
│   │   └── shares.js          ← CRUD /api/shares  +  public resolve/download
│   └── utils/
│       ├── store.js           ← readJSON() / writeJSON() helpers
│       ├── pin.js             ← crypto-random 6-char PIN generator
│       └── shares.js          ← purgeExpiredShares() — runs hourly
├── client/                    ← All frontend assets (served as static)
│   ├── index.html             ← Landing page
│   ├── clipboard.html         ← Main app (clipboard + files + shares)
│   ├── login.html
│   ├── register.html
│   ├── share.html             ← Public PIN redeem page
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── script.js          ← Main app logic
│   │   ├── login.js
│   │   └── register.js
│   └── images/
├── scripts/
│   ├── deploy.sh              ← Full server deploy script (git pull + pm2 + nginx)
│   ├── harden.sh              ← UFW + fail2ban + SSH hardening
│   ├── fix-nginx.sh
│   ├── nginxsetup.sh
│   ├── whitelist-slt.sh       ← Whitelist SLT ISP ranges in fail2ban
│   └── backend-deployment.sh  ← Legacy — kept for reference only
├── .env.example               ← Template — copy to .env and fill in values
├── .gitignore
└── package.json               ← v3.0.0
```

### Environment variables (`.env`)
```dotenv
PORT=3001                        # Express listens on this port
JWT_SECRET=<32-byte hex string>  # Generate: openssl rand -hex 32
DATA_DIR=/root/docshare/data     # Where users.json / clipboard.json / shares.json live
UPLOADS_DIR=/root/docshare/uploads  # Where uploaded files are stored
MAX_FILE_SIZE_MB=2500            # Per-file upload limit
CORS_ORIGIN=                     # Leave blank for same-origin (recommended)
```

> **Important:** `.env` is in `.gitignore`. On the server it lives at `/root/docshare/.env`.  
> The deploy script auto-generates it with a random JWT_SECRET on first deploy.

### Legacy API aliases
The frontend JS still calls the old URL patterns (`/api/register`, `/api/upload`, `/api/share/:pin`).  
`src/app.js` contains a middleware block that rewrites these to the new routes:

| Old URL | Rewrites to |
|---|---|
| `POST /api/register` | `POST /api/auth/register` |
| `POST /api/login` | `POST /api/auth/login` |
| `POST /api/upload` | `POST /api/files/upload` |
| `GET /api/share/:pin` | `GET /api/shares/resolve/:pin` |
| `GET /api/share/:pin/download` | `GET /api/shares/download/:pin` |

This keeps backward compatibility without touching the frontend JS files.

---

## 4. docshare-v2 — Next Version

### Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 20 |
| Backend framework | Express 4 (same `src/` as docshare) |
| Frontend | React 18 + Vite 5 |
| Routing | React Router DOM 7 |
| Icons | lucide-react |
| Styling | Custom CSS (glassmorphism design system in `index.css`) |
| Build tool | Vite — outputs to `frontend/dist/` |

### Folder layout
```
docshare-v2/
├── server.js                  ← Entry point (identical to docshare)
├── src/                       ← Backend (copy of docshare/src — keep in sync)
│   ├── app.js                 ← PUBLIC_DIR points to frontend/dist
│   ├── middleware/
│   ├── routes/
│   └── utils/
├── frontend/
│   ├── vite.config.js         ← Dev proxy: /api → localhost:3000
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx            ← Router, auth state, toast provider
│   │   ├── api.js             ← All fetch calls — NO hardcoded URLs
│   │   ├── index.css          ← Full design system (tokens, glass, buttons, inputs…)
│   │   ├── hooks/
│   │   │   └── useToast.js    ← Toast state hook
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── Toast.jsx
│   │   └── pages/
│   │       ├── Home.jsx       ← Landing page
│   │       ├── Login.jsx      ← Sign in (show/hide password)
│   │       ├── Register.jsx   ← Create account (validation)
│   │       ├── Dashboard.jsx  ← 3 tabs: Clipboard / Files / Redeem PIN
│   │       └── Redeem.jsx     ← Public PIN download page (/redeem?pin=XXXXXX)
│   └── dist/                  ← Production build output (gitignored)
├── .env.example
├── .gitignore
└── package.json               ← v2.0.0
```

### Running locally

```bash
# 1. Start the backend
cd docshare-v2
npm install
node server.js          # runs on :3000

# 2. In a second terminal — start the frontend dev server
cd docshare-v2/frontend
npm install
npm run dev             # runs on :5173, proxies /api to :3000
```

Open `http://localhost:5173`

### Building for production

```bash
cd docshare-v2/frontend
npm run build           # outputs to frontend/dist/

# Then start the backend — it serves dist/ as static files
cd ..
node server.js
```

### Key design decisions in v2

- **No hardcoded URLs.** `api.js` uses relative `/api/*` paths. Vite proxies in dev, Express serves directly in prod.
- **`useToast` hook** — toast state lives in `App.jsx` and is passed as a `toast` prop to every page. No global context needed for this scale.
- **Dashboard tabs** — Clipboard / Files / Redeem are all in one component file (`Dashboard.jsx`) split into sub-components. If they grow, split into separate files under `pages/`.
- **`src/app.js` difference from docshare** — `PUBLIC_DIR` points to `frontend/dist` instead of `client/`.

---

## 5. Server & Infrastructure

### What's running on the server

```
PM2 processes:
  clipboard  → /root/docshare/server.js  (port 3001)  ← DocShare production
  ChatSite   → (separate chat project)   (port varies)
```

### Nginx sites (at `/etc/nginx/sites-available/`)
```
docshare                → clipboard.clipmanz.shop  → proxies to :3001
loans.copythingz.shop   → (loans app)
n8n.zanzo.casino        → (n8n automation)
```

### Nginx config highlights for docshare
```nginx
client_max_body_size 2500M;     # Must match MAX_FILE_SIZE_MB

location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_read_timeout    600s;  # Long timeout for large file uploads
    proxy_send_timeout    600s;
}

# Static assets cached 7 days
location ~* ^(?!/api/).*\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}

# NOTE: /uploads/ location block was intentionally REMOVED (security fix)
# All file access goes through /api/files/:filename (authenticated)
```

### Security hardening (applied via `scripts/harden.sh`)
- **UFW firewall** — only ports 22, 80, 443 open
- **fail2ban** — SSH: ban 24h after 4 failed attempts; Nginx bot protection
- **SSH config** — `PermitRootLogin no`, `PasswordAuthentication no`, `MaxAuthTries 3`
- **Nginx** — `server_tokens off`, security headers (`X-Frame-Options`, `HSTS`, etc.)
- **.env** — `chmod 600`

### SSL
- Cert provider: Let's Encrypt
- Auto-renewal via certbot systemd timer
- Test renewal: `certbot renew --dry-run`

---

## 6. Deployment

### Deploying docshare (production)

```bash
# From your local machine — SSH in and run the deploy script
ssh -i "F:\My -Github-Projects\docshare\testserver" ubuntu@140.245.103.63

# On the server:
sudo bash /root/docshare/scripts/deploy.sh
```

Or trigger it remotely in one command:
```bash
ssh -i "F:\My -Github-Projects\docshare\testserver" \
    -o StrictHostKeyChecking=no ubuntu@140.245.103.63 \
    "sudo bash /root/docshare/scripts/deploy.sh 2>&1"
```

### What `deploy.sh` does
1. `apt-get update` + installs curl, git, nginx, certbot if missing
2. Installs Node.js 20.x if not present
3. `git fetch origin && git reset --hard origin/main` (pulls latest)
4. Creates `data/` and `uploads/` directories
5. Generates `.env` with a random `JWT_SECRET` on first run (skips if exists)
6. `npm install --omit=dev`
7. Installs/updates PM2 globally
8. Writes `ecosystem.config.js` and restarts the `clipboard` PM2 process
9. Writes the final Nginx HTTPS config and reloads nginx
10. Skips certbot if SSL cert already exists

### First-time deploy to a fresh server
```bash
curl -fsSL https://raw.githubusercontent.com/trishanetrx/docshare/main/scripts/deploy.sh | bash
```

### After pushing code changes
```bash
# Just push to main — then run deploy remotely
git push origin main
ssh -i "F:\My -Github-Projects\docshare\testserver" ubuntu@140.245.103.63 \
    "sudo bash /root/docshare/scripts/deploy.sh 2>&1"
```

### Deploying docshare-v2 (when ready)
docshare-v2 does not have a deploy script yet. Steps when needed:
1. Build the frontend: `npm run build` inside `frontend/`
2. Commit the `frontend/dist/` folder (or build on server)
3. Write a new `scripts/deploy.sh` modelled after docshare's — point `CLIENT_DIR` to `frontend/dist`
4. Set up a new Nginx site and PM2 process on a different port

---

## 7. Security Model

### Authentication flow
```
Client                          Server
  |                               |
  |-- POST /api/auth/login ------>|
  |                               |  bcrypt.compare(password, hash)
  |<-- { token } ----------------|  jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' })
  |                               |
  |-- GET /api/files ------------>|
  |   Authorization: Bearer <jwt> |  jwt.verify(token, JWT_SECRET) → req.user
  |<-- [ filenames ] -------------|
```

### File access security
- All file downloads go through `GET /api/files/:filename` which requires a valid JWT
- The Nginx `/uploads/` static route was removed — there is **no way to access a file by guessing its URL**
- Files are stored in per-user subdirectories: `uploads/<username>/filename-<timestamp>.ext`
- Filenames are sanitized: `replace(/[^a-zA-Z0-9_\-]/g, '_')` before saving

### PIN share security
- PINs are 6 characters, alphanumeric, generated with `crypto.randomBytes` (cryptographically random)
- Ambiguous characters (0, O, 1, I) excluded from PIN alphabet
- Default TTL: 24 hours (configurable 1h–168h)
- Reuses existing valid PIN if one already exists for the same file + owner
- Anyone with the PIN can download — no account needed (intentional, it's a share link)
- Owner can revoke a PIN at any time
- Expired PINs are purged automatically on startup and every hour

### Password security
- bcrypt with salt rounds = 10
- Passwords are never stored in plain text
- JWT secret should be a 32-byte random hex string (generated on first deploy)

---

## 8. API Reference

### Base URL
```
Production : https://clipboard.clipmanz.shop/api
Local      : http://localhost:3000/api  (or :3001 on server)
```

### Auth routes (no token needed)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ username, password }` | `201 { message }` |
| POST | `/auth/login` | `{ username, password }` | `200 { message, token }` |

### Clipboard (JWT required)
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/clipboard` | — | `200 [ "text1", "text2", ... ]` |
| POST | `/clipboard` | `{ text }` | `201 { message, data: [...] }` |
| DELETE | `/clipboard` | — | `200 { message }` |

### Files (JWT required)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/files/upload` | `multipart/form-data` field: `files` (up to 20) | `200 { message, files: [...] }` |
| GET | `/files` | — | `200 [ "filename1.ext", ... ]` |
| GET | `/files/:filename` | — | Binary file stream |
| DELETE | `/files/:filename` | — | `200 { message }` |

### Shares (JWT required for management)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/shares` | `{ filename, ttlHours }` | `201 { pin, expiresAt }` |
| GET | `/shares` | — | `200 [ { pin, filename, expiresAt }, ... ]` |
| DELETE | `/shares/:pin` | — | `200 { message }` |

### Shares (public — no JWT)
| Method | Path | Response |
|---|---|---|
| GET | `/shares/resolve/:pin` | `200 { filename, owner, expiresAt }` |
| GET | `/shares/download/:pin` | Binary file stream |

### Error responses
All errors return JSON: `{ message: "..." }` with appropriate HTTP status codes.

---

## 9. Data Storage

All data is stored as JSON files on disk (no database). Simple, portable, zero config.

```
/root/docshare/
├── data/
│   ├── users.json      ← [ { username, password: "$2b$..." }, ... ]
│   ├── clipboard.json  ← { "username": [ "text1", "text2" ], ... }
│   └── shares.json     ← { "PIN123": { filename, owner, createdAt, expiresAt }, ... }
└── uploads/
    ├── alice/
    │   ├── report-1719000000000.pdf
    │   └── photo-1719000001000.jpg
    └── bob/
        └── notes-1719000002000.txt
```

### Backup
There is no automated backup. To back up manually:
```bash
# From local machine
scp -i "F:\My -Github-Projects\docshare\testserver" -r \
    ubuntu@140.245.103.63:/root/docshare/data ./backup-data
scp -i "F:\My -Github-Projects\docshare\testserver" -r \
    ubuntu@140.245.103.63:/root/docshare/uploads ./backup-uploads
```

### Migrating to a database (future)
When user count or file volume grows, replace `src/utils/store.js` with a database adapter (SQLite or PostgreSQL). The route files only call `readJSON()` / `writeJSON()` — swap those two functions and nothing else needs to change.

---

## 10. Known Limitations & Future Work

### Current limitations
| Area | Limitation |
|---|---|
| Storage | JSON flat files — not suitable for many concurrent writes |
| Uploads | No per-user storage quota |
| Files | No file type validation (any MIME type accepted) |
| Shares | Only file-level sharing — no folder or clipboard sharing |
| Auth | No password reset, no email verification |
| Clipboard | Items can only be deleted all-at-once, not individually |
| Search | No search across files or clipboard items |

### Planned / nice-to-have
- [ ] Deploy docshare-v2 (React frontend) to replace the vanilla JS version
- [ ] Per-user storage quota (configurable in `.env`)
- [ ] Individual clipboard item deletion
- [ ] File preview in browser (images, PDFs, text)
- [ ] Folder upload support
- [ ] Password reset via email (requires SMTP config)
- [ ] Admin panel (user management, storage overview)
- [ ] SQLite backend (drop-in replacement for JSON files)
- [ ] S3 / object storage for uploads (for scale)
- [ ] Rate limiting on auth routes (prevent brute force)

---

## 11. Common Commands Cheatsheet

### Local development
```bash
# Run docshare backend in dev mode (auto-restart on file change)
cd "F:\My -Github-Projects\docshare"
npm run dev

# Run docshare-v2 (backend + frontend)
cd "F:\My -Github-Projects\docshare-v2"
node server.js                    # backend on :3000

cd frontend
npm run dev                       # frontend on :5173 with /api proxy

# Build docshare-v2 frontend for production
cd "F:\My -Github-Projects\docshare-v2\frontend"
npm run build
```

### Git
```bash
# Push and deploy docshare
git -C "F:\My -Github-Projects\docshare" add -A
git -C "F:\My -Github-Projects\docshare" commit -m "your message"
git -C "F:\My -Github-Projects\docshare" push origin main
```

### SSH into server
```bash
ssh -i "F:\My -Github-Projects\docshare\testserver" ubuntu@140.245.103.63
```

### Server PM2 management
```bash
pm2 status                        # show all processes
pm2 logs clipboard                # live logs for the docshare app
pm2 restart clipboard             # restart after manual changes
pm2 save                          # persist process list across reboots
```

### Server Nginx
```bash
sudo nginx -t                     # test config syntax
sudo systemctl reload nginx       # apply config changes
sudo tail -f /var/log/nginx/clipboard.clipmanz.shop_error.log
```

### SSL
```bash
sudo certbot renew --dry-run      # test auto-renewal
sudo certbot certificates         # list all certs and expiry dates
```

### Fail2ban
```bash
sudo fail2ban-client status       # list active jails
sudo fail2ban-client status sshd  # show banned IPs for SSH
sudo fail2ban-client set sshd unbanip <IP>   # unban an IP
```

### Logs
```bash
pm2 logs clipboard --lines 100    # last 100 lines of app logs
sudo journalctl -u nginx          # nginx system logs
```

---

*Keep this file updated whenever you make significant changes to the architecture, server config, or API.*
