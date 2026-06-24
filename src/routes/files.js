const { Router } = require('express');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const authenticate = require('../middleware/authenticate');
const { readJSON, writeJSON } = require('../utils/store');

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const UPLOADS_DIR = () =>
    process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

const SHARES_FILE = () => path.join(
    process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data'),
    'shares.json'
);

function userUploadDir(username) {
    const dir = path.join(UPLOADS_DIR(), username);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// ── Multer config ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, _file, cb) => cb(null, userUploadDir(req.user.username)),
    filename: (_req, file, cb) => {
        const ext  = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_\-]/g, '_');
        cb(null, `${base}-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 2500) * 1024 * 1024 },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/files/upload  — upload one or more files (up to 20)
router.post('/upload', authenticate, upload.array('files', 20), (req, res) => {
    if (!req.files || req.files.length === 0)
        return res.status(400).json({ message: 'No file(s) uploaded.' });

    res.json({
        message: `${req.files.length} file(s) uploaded successfully.`,
        files: req.files.map(f => f.filename),
    });
});

// GET /api/files  — list the authenticated user's files
router.get('/', authenticate, (req, res) => {
    const dir = userUploadDir(req.user.username);
    fs.readdir(dir, (err, files) => {
        if (err) return res.status(500).json({ message: 'Could not list files.' });
        res.json(files.filter(f => !f.startsWith('.')));
    });
});

// GET /api/files/:filename  — download the authenticated user's file
router.get('/:filename', authenticate, (req, res) => {
    const filePath = path.join(
        userUploadDir(req.user.username),
        path.basename(req.params.filename)
    );

    try {
        const stat = fs.statSync(filePath);
        res.setHeader('Content-Length', stat.size);
    } catch {
        return res.status(404).json({ message: 'File not found.' });
    }

    res.download(filePath, err => {
        if (err && !res.headersSent)
            res.status(404).json({ message: 'File not found.' });
    });
});

// DELETE /api/files/:filename
router.delete('/:filename', authenticate, (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(userUploadDir(req.user.username), filename);

    fs.unlink(filePath, err => {
        if (err) return res.status(404).json({ message: 'File not found.' });

        // Revoke any active shares for this file
        const shares = readJSON(SHARES_FILE(), {});
        for (const pin of Object.keys(shares)) {
            if (shares[pin].owner === req.user.username &&
                shares[pin].filename === filename) {
                delete shares[pin];
            }
        }
        writeJSON(SHARES_FILE(), shares);

        res.json({ message: 'Deleted.' });
    });
});

module.exports = router;
