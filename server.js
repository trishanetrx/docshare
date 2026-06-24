const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load .env file if present (development and standalone production)
try { require('dotenv').config(); } catch { /* dotenv optional in dev */ }

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// ── Paths ─────────────────────────────────────────────────────────────────────
const DATA_DIR    = process.env.DATA_DIR    || path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const PUBLIC_DIR  = path.join(__dirname, 'public');

fs.mkdirSync(DATA_DIR,    { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Persistence ───────────────────────────────────────────────────────────────
const USERS_FILE     = path.join(DATA_DIR, 'users.json');
const CLIPBOARD_FILE = path.join(DATA_DIR, 'clipboard.json');
const SHARES_FILE    = path.join(DATA_DIR, 'shares.json');

function readJSON(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return fallback; }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── Per-user upload directory ─────────────────────────────────────────────────
function userUploadDir(username) {
    const dir = path.join(UPLOADS_DIR, username);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// ── PIN generation ────────────────────────────────────────────────────────────
function generatePin() {
    // 6 uppercase alphanumeric characters, crypto-random
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed ambiguous 0/O/1/I
    let pin = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
        pin += chars[bytes[i] % chars.length];
    }
    return pin;
}

// ── Expire old shares (run on startup and periodically) ──────────────────────
function purgeExpiredShares() {
    const shares = readJSON(SHARES_FILE, {});
    const now = Date.now();
    let changed = false;
    for (const pin of Object.keys(shares)) {
        if (shares[pin].expiresAt < now) {
            delete shares[pin];
            changed = true;
        }
    }
    if (changed) writeJSON(SHARES_FILE, shares);
}
purgeExpiredShares();
setInterval(purgeExpiredShares, 60 * 60 * 1000); // hourly

// ── Middleware ────────────────────────────────────────────────────────────────
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

// ── File upload config ────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, _file, cb) => cb(null, userUploadDir(req.user.username)),
    filename: (_req, file, cb) => {
        const ext  = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
        cb(null, `${base}-${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 2500) * 1024 * 1024 }
});

// ── Auth middleware ───────────────────────────────────────────────────────────
function authenticate(req, res, next) {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ message: 'No token, authorization denied.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
}

// ── API Routes ────────────────────────────────────────────────────────────────
const router = express.Router();

// POST /api/register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ message: 'Username and password are required.' });

    const users = readJSON(USERS_FILE, []);
    if (users.find(u => u.username === username))
        return res.status(409).json({ message: 'Username already taken.' });

    const hashed = await bcrypt.hash(password, 10);
    users.push({ username, password: hashed });
    writeJSON(USERS_FILE, users);
    res.status(201).json({ message: 'Registered successfully.' });
});

// POST /api/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = readJSON(USERS_FILE, []);
    const user  = users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ message: 'Invalid username or password.' });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ message: 'Login successful.', token });
});

// ── Clipboard ─────────────────────────────────────────────────────────────────
router.get('/clipboard', authenticate, (req, res) => {
    const data = readJSON(CLIPBOARD_FILE, {});
    res.json(data[req.user.username] || []);
});

router.post('/clipboard', authenticate, (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Text is required.' });

    const data = readJSON(CLIPBOARD_FILE, {});
    if (!data[req.user.username]) data[req.user.username] = [];
    data[req.user.username].push(text);
    writeJSON(CLIPBOARD_FILE, data);
    res.status(201).json({ message: 'Saved.', data: data[req.user.username] });
});

router.delete('/clipboard', authenticate, (req, res) => {
    const data = readJSON(CLIPBOARD_FILE, {});
    data[req.user.username] = [];
    writeJSON(CLIPBOARD_FILE, data);
    res.json({ message: 'Clipboard cleared.' });
});

// ── Files (per-user) ──────────────────────────────────────────────────────────

// POST /api/upload  (supports single or multiple files via field name "files")
router.post('/upload', authenticate, upload.array('files', 20), (req, res) => {
    if (!req.files || req.files.length === 0)
        return res.status(400).json({ message: 'No file(s) uploaded.' });
    res.json({
        message: `${req.files.length} file(s) uploaded successfully.`,
        files: req.files.map(f => f.filename),
    });
});

// GET /api/files — list only the requesting user's files
router.get('/files', authenticate, (req, res) => {
    const dir = userUploadDir(req.user.username);
    fs.readdir(dir, (err, files) => {
        if (err) return res.status(500).json({ message: 'Could not list files.' });
        // filter out hidden files
        res.json(files.filter(f => !f.startsWith('.')));
    });
});

// GET /api/files/:filename — download own file
router.get('/files/:filename', authenticate, (req, res) => {
    const filePath = path.join(userUploadDir(req.user.username), path.basename(req.params.filename));
    try {
        const stat = fs.statSync(filePath);
        res.setHeader('Content-Length', stat.size);
    } catch {
        return res.status(404).json({ message: 'File not found.' });
    }
    res.download(filePath, err => {
        if (err && !res.headersSent) res.status(404).json({ message: 'File not found.' });
    });
});

// DELETE /api/files/:filename
router.delete('/files/:filename', authenticate, (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(userUploadDir(req.user.username), filename);
    fs.unlink(filePath, err => {
        if (err) return res.status(404).json({ message: 'File not found.' });
        // Also revoke any shares for this file
        const shares = readJSON(SHARES_FILE, {});
        for (const pin of Object.keys(shares)) {
            if (shares[pin].owner === req.user.username && shares[pin].filename === filename) {
                delete shares[pin];
            }
        }
        writeJSON(SHARES_FILE, shares);
        res.json({ message: 'Deleted.' });
    });
});

// ── Share PIN system ──────────────────────────────────────────────────────────
const SHARE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours default

// POST /api/shares — create a share PIN for a file
router.post('/shares', authenticate, (req, res) => {
    const { filename, ttlHours } = req.body;
    if (!filename) return res.status(400).json({ message: 'filename is required.' });

    const filePath = path.join(userUploadDir(req.user.username), path.basename(filename));
    if (!fs.existsSync(filePath))
        return res.status(404).json({ message: 'File not found.' });

    const shares = readJSON(SHARES_FILE, {});

    // Check if a valid share already exists for this file+owner — reuse it
    for (const [pin, share] of Object.entries(shares)) {
        if (share.owner === req.user.username &&
            share.filename === path.basename(filename) &&
            share.expiresAt > Date.now()) {
            return res.json({ pin, expiresAt: share.expiresAt });
        }
    }

    // Generate a unique PIN
    let pin;
    let attempts = 0;
    do {
        pin = generatePin();
        attempts++;
        if (attempts > 100) return res.status(500).json({ message: 'Could not generate unique PIN.' });
    } while (shares[pin]);

    const ttl = Math.min(Math.max(Number(ttlHours) || 24, 1), 168); // 1h–7d
    const expiresAt = Date.now() + ttl * 60 * 60 * 1000;

    shares[pin] = {
        filename: path.basename(filename),
        owner: req.user.username,
        createdAt: Date.now(),
        expiresAt,
    };
    writeJSON(SHARES_FILE, shares);

    res.status(201).json({ pin, expiresAt });
});

// GET /api/shares — list the requesting user's active shares
router.get('/shares', authenticate, (req, res) => {
    const shares = readJSON(SHARES_FILE, {});
    const now    = Date.now();
    const result = [];
    for (const [pin, share] of Object.entries(shares)) {
        if (share.owner === req.user.username && share.expiresAt > now) {
            result.push({ pin, filename: share.filename, expiresAt: share.expiresAt });
        }
    }
    res.json(result);
});

// DELETE /api/shares/:pin — revoke a share
router.delete('/shares/:pin', authenticate, (req, res) => {
    const shares = readJSON(SHARES_FILE, {});
    const pin    = req.params.pin.toUpperCase();
    if (!shares[pin]) return res.status(404).json({ message: 'Share not found.' });
    if (shares[pin].owner !== req.user.username)
        return res.status(403).json({ message: 'Not your share.' });
    delete shares[pin];
    writeJSON(SHARES_FILE, shares);
    res.json({ message: 'Share revoked.' });
});

// GET /api/share/:pin — resolve PIN info (no auth required)
router.get('/share/:pin', (req, res) => {
    const shares = readJSON(SHARES_FILE, {});
    const pin    = req.params.pin.toUpperCase();
    const share  = shares[pin];

    if (!share)                       return res.status(404).json({ message: 'Invalid PIN.' });
    if (share.expiresAt < Date.now()) return res.status(410).json({ message: 'This share has expired.' });

    res.json({
        filename:  share.filename,
        owner:     share.owner,
        expiresAt: share.expiresAt,
    });
});

// GET /api/share/:pin/download — download via PIN (no auth required)
router.get('/share/:pin/download', (req, res) => {
    const shares = readJSON(SHARES_FILE, {});
    const pin    = req.params.pin.toUpperCase();
    const share  = shares[pin];

    if (!share)                       return res.status(404).json({ message: 'Invalid PIN.' });
    if (share.expiresAt < Date.now()) return res.status(410).json({ message: 'This share has expired.' });

    const filePath = path.join(UPLOADS_DIR, share.owner, path.basename(share.filename));
    try {
        const stat = fs.statSync(filePath);
        res.setHeader('Content-Length', stat.size);
    } catch {
        return res.status(404).json({ message: 'File no longer exists.' });
    }
    res.download(filePath, share.filename, err => {
        if (err && !res.headersSent) res.status(500).json({ message: 'Download failed.' });
    });
});

app.use('/api', router);

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`DocShare running on http://localhost:${PORT}`));
