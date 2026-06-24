const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const authRoutes      = require('./routes/auth');
const clipboardRoutes = require('./routes/clipboard');
const fileRoutes      = require('./routes/files');
const shareRoutes     = require('./routes/shares');
const { purgeExpiredShares } = require('./utils/shares');

const app = express();

// ── Ensure runtime directories exist ─────────────────────────────────────────
const DATA_DIR    = process.env.DATA_DIR    || path.join(__dirname, '..', 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const PUBLIC_DIR  = path.join(__dirname, '..', 'client');

fs.mkdirSync(DATA_DIR,    { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── CORS (only when CORS_ORIGIN is explicitly set) ────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : null;

if (allowedOrigins) {
    app.use(cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
}

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static frontend ───────────────────────────────────────────────────────────
app.use(express.static(PUBLIC_DIR));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/clipboard', clipboardRoutes);
app.use('/api/files',     fileRoutes);
app.use('/api/shares',    shareRoutes);

// Legacy aliases — keep old frontend JS working without changes
// /api/register  → /api/auth/register
// /api/login     → /api/auth/login
// /api/upload    → /api/files/upload
// /api/share/:pin           → /api/shares/resolve/:pin
// /api/share/:pin/download  → /api/shares/download/:pin
app.use('/api', (req, res, next) => {
    if (req.path === '/register' || req.path === '/login') {
        req.url = '/auth' + req.url;
        return app._router.handle(req, res, next);
    }
    if (req.path === '/upload') {
        req.url = '/files/upload';
        return app._router.handle(req, res, next);
    }
    const pinDownload = req.path.match(/^\/share\/([A-Z0-9]+)\/download$/i);
    if (pinDownload) {
        req.url = `/shares/download/${pinDownload[1]}`;
        return app._router.handle(req, res, next);
    }
    const pinResolve = req.path.match(/^\/share\/([A-Z0-9]+)$/i);
    if (pinResolve) {
        req.url = `/shares/resolve/${pinResolve[1]}`;
        return app._router.handle(req, res, next);
    }
    next();
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ── Purge expired shares on startup + hourly ──────────────────────────────────
const SHARES_FILE = path.join(DATA_DIR, 'shares.json');
purgeExpiredShares(SHARES_FILE);
setInterval(() => purgeExpiredShares(SHARES_FILE), 60 * 60 * 1000);

module.exports = app;
