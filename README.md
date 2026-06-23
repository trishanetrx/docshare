# DocShare — Online Clipboard & File Sharing

A standalone web app that lets authenticated users share clipboard text and files across devices. Built by **VentiqoTech**.

🌐 Live: [copythingz.shop](https://copythingz.shop)

---

## Architecture

Everything runs on a single server — no Netlify or external CDN required.

```
Browser
  │
  ▼
Nginx (port 443 / SSL)
  ├── /* → serves static files from /root/docshare/public/
  └── /api/* → proxies to Express on localhost:3000
                    └── /uploads/* → served directly by Nginx
```

- **Frontend** — plain HTML + TailwindCSS + Vanilla JS, served as static files by Nginx
- **Backend** — Node.js / Express, managed by PM2
- **Storage** — JSON files for users & clipboard data, local disk for uploads
- **Auth** — JWT (8h expiry), bcrypt password hashing

---

## Features

- User registration & login
- Per-user clipboard with syntax highlighting (Prism.js)
- File upload / download / delete (up to 2500 MB)
- Real-time upload progress bar
- Fully self-hosted — no third-party frontend hosting

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | HTML, TailwindCSS, Vanilla JS       |
| Backend  | Node.js 20, Express 4               |
| Auth     | JWT (`jsonwebtoken`), `bcryptjs`    |
| Upload   | `multer` (disk storage)             |
| Process  | PM2                                 |
| Web      | Nginx + SSL (Let's Encrypt)         |

---

## Project Structure

```
docshare/
├── server.js               # Express backend
├── package.json
├── .env.example            # Environment variable template
├── deploy.sh               # Full standalone deployment script
├── nginxsetup.sh           # Legacy nginx-only setup
├── backend-deployment.sh   # Legacy backend-only deployment
│
├── index.html              # Landing page
├── login.html              # Login page
├── login.js
├── register.html           # Registration page
├── register.js
├── clipboard.html          # Main app (clipboard + files)
├── script.js               # Clipboard & file upload logic
├── styles.css
│
├── images/                 # Background images
├── public/                 # ← Created on deploy (static files served here)
├── data/                   # ← Created on deploy (users.json, clipboard.json)
├── uploads/                # ← Created on deploy (user-uploaded files)
└── certificates/           # SSL cert references (managed by certbot)
```

---

## API Reference

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint    | Body                        | Auth | Description             |
|--------|-------------|-----------------------------|------|-------------------------|
| POST   | `/register` | `{ username, password }`    | No   | Create account          |
| POST   | `/login`    | `{ username, password }`    | No   | Returns JWT token       |

### Clipboard

| Method | Endpoint     | Body          | Auth | Description                    |
|--------|--------------|---------------|------|--------------------------------|
| GET    | `/clipboard` | —             | Yes  | Get current user's saved items |
| POST   | `/clipboard` | `{ text }`    | Yes  | Add a text item                |
| DELETE | `/clipboard` | —             | Yes  | Clear all items                |

### Files

| Method | Endpoint            | Body   | Auth | Description         |
|--------|---------------------|--------|------|---------------------|
| POST   | `/upload`           | `file` | Yes  | Upload a file       |
| GET    | `/files`            | —      | Yes  | List uploaded files |
| GET    | `/files/:filename`  | —      | Yes  | Download a file     |
| DELETE | `/files/:filename`  | —      | Yes  | Delete a file       |

---

## Deployment

### First-time deploy

1. Push your code to GitHub and update `REPO_URL` in `deploy.sh`
2. SSH into your server as root
3. Run:

```bash
curl -fsSL https://raw.githubusercontent.com/your-username/docshare/main/deploy.sh | bash
```

Or clone and run directly:

```bash
git clone https://github.com/your-username/docshare.git /root/docshare
bash /root/docshare/deploy.sh
```

The script will:
- Install Node.js 20, Nginx, Certbot
- Clone/pull the latest code
- Copy frontend assets to `public/`
- Generate a `.env` with a random JWT secret
- Install Node dependencies
- Start the app with PM2 (auto-restarts on crash/reboot)
- Configure Nginx with SSL

### Updating after changes

```bash
cd /root/docshare
git pull
# Re-copy frontend assets
cp *.html *.js *.css public/ && cp -r images public/
rm -f public/server.js
pm2 restart docshare
```

### Useful PM2 commands

```bash
pm2 logs docshare        # live logs
pm2 restart docshare     # restart app
pm2 status               # process status
```

---

## Local Development

```bash
git clone https://github.com/your-username/docshare.git
cd docshare
cp .env.example .env     # set JWT_SECRET
npm install
```

Move frontend files into `public/` for the static file server:

```bash
mkdir -p public
cp *.html *.js *.css public/
cp -r images public/
rm -f public/server.js
```

Then start the server:

```bash
npm run dev    # uses nodemon for auto-reload
# or
npm start
```

Open `http://localhost:3000`.

---

## Environment Variables

| Variable          | Default                   | Description                            |
|-------------------|---------------------------|----------------------------------------|
| `PORT`            | `3000`                    | Port Express listens on                |
| `JWT_SECRET`      | *(must set in production)*| Secret for signing JWTs                |
| `DATA_DIR`        | `./data`                  | Directory for JSON data files          |
| `UPLOADS_DIR`     | `./uploads`               | Directory for uploaded files           |
| `MAX_FILE_SIZE_MB`| `2500`                    | Max upload size in MB                  |
| `CORS_ORIGIN`     | *(unset)*                 | Comma-separated allowed origins (optional) |

Copy `.env.example` → `.env` and fill in the values before deploying.

---

## Security Notes

- Set a strong `JWT_SECRET` — never use the default
- User data and clipboard are stored as plain JSON; add a real DB for scale
- `path.basename()` is used on all file routes to prevent path traversal attacks
- CORS is same-origin by default in standalone mode (no `CORS_ORIGIN` needed)

---

## License

© 2024 VentiqoTech. All rights reserved.
