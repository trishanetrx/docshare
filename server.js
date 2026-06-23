const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Ensure data & upload directories exist
fs.mkdirSync(DATA_DIR,    { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Simple JSON file-based persistence ───────────────────────────────────────
const USERS_FILE     = path.join(DATA_DIR, 'users.json');
const CLIPBOARD_FILE = path.join(DATA_DIR, 'clipboard.json');

function readJSON(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return fallback;
    }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── Middleware ────────────────────────────────────────────────────────────────
// When running standalone (no separate frontend origin) CORS can be relaxed.
// If you still want to allow an external origin during testing, set CORS_ORIGIN env var.
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : null; // null = same-origin only (no CORS header needed)

if (allowedOrigins) {
    app.use(cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve frontend static files (standalone deployment)
app.use(express.static(PUBLIC_DIR));

// ── File upload config ────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
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
    } catch (err) {
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
    const user = users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ message: 'Invalid username or password.' });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ message: 'Login successful.', token });
});

// GET  /api/clipboard
router.get('/clipboard', authenticate, (req, res) => {
    const data = readJSON(CLIPBOARD_FILE, {});
    res.json(data[req.user.username] || []);
});

// POST /api/clipboard
router.post('/clipboard', authenticate, (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Text is required.' });

    const data = readJSON(CLIPBOARD_FILE, {});
    if (!data[req.user.username]) data[req.user.username] = [];
    data[req.user.username].push(text);
    writeJSON(CLIPBOARD_FILE, data);

    res.status(201).json({ message: 'Saved.', data: data[req.user.username] });
});

// DELETE /api/clipboard
router.delete('/clipboard', authenticate, (req, res) => {
    const data = readJSON(CLIPBOARD_FILE, {});
    data[req.user.username] = [];
    writeJSON(CLIPBOARD_FILE, data);
    res.json({ message: 'Clipboard cleared.' });
});

// POST /api/upload
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    res.json({ message: 'Uploaded successfully.', file: req.file.filename });
});

// GET /api/files
router.get('/files', authenticate, (_req, res) => {
    fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) return res.status(500).json({ message: 'Could not list files.' });
        res.json(files);
    });
});

// GET /api/files/:filename  (download)
router.get('/files/:filename', authenticate, (req, res) => {
    const filePath = path.join(UPLOADS_DIR, path.basename(req.params.filename));
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
    const filePath = path.join(UPLOADS_DIR, path.basename(req.params.filename));
    fs.unlink(filePath, err => {
        if (err) return res.status(404).json({ message: 'File not found.' });
        res.json({ message: 'Deleted.' });
    });
});

app.use('/api', router);

// ── SPA fallback — serve index.html for any unmatched route ──────────────────
app.get('*', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`DocShare running on http://localhost:${PORT}`));
