const { Router } = require('express');
const path = require('path');
const fs   = require('fs');
const authenticate = require('../middleware/authenticate');
const { readJSON, writeJSON } = require('../utils/store');
const { generatePin } = require('../utils/pin');

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

// ── Authenticated share management ───────────────────────────────────────────

// POST /api/shares  — create (or reuse) a PIN share for a file
router.post('/', authenticate, (req, res) => {
    const { filename, ttlHours } = req.body;
    if (!filename) return res.status(400).json({ message: 'filename is required.' });

    const filePath = path.join(
        userUploadDir(req.user.username),
        path.basename(filename)
    );
    if (!fs.existsSync(filePath))
        return res.status(404).json({ message: 'File not found.' });

    const shares = readJSON(SHARES_FILE(), {});

    // Reuse an existing valid share for the same file + owner
    for (const [pin, share] of Object.entries(shares)) {
        if (share.owner === req.user.username &&
            share.filename === path.basename(filename) &&
            share.expiresAt > Date.now()) {
            return res.json({ pin, expiresAt: share.expiresAt });
        }
    }

    // Generate a unique PIN (max 100 attempts)
    let pin;
    let attempts = 0;
    do {
        pin = generatePin();
        if (++attempts > 100)
            return res.status(500).json({ message: 'Could not generate unique PIN.' });
    } while (shares[pin]);

    const ttl       = Math.min(Math.max(Number(ttlHours) || 24, 1), 168); // 1h–7d
    const expiresAt = Date.now() + ttl * 60 * 60 * 1000;

    shares[pin] = {
        filename:  path.basename(filename),
        owner:     req.user.username,
        createdAt: Date.now(),
        expiresAt,
    };
    writeJSON(SHARES_FILE(), shares);

    res.status(201).json({ pin, expiresAt });
});

// GET /api/shares  — list the authenticated user's active shares
router.get('/', authenticate, (req, res) => {
    const shares = readJSON(SHARES_FILE(), {});
    const now    = Date.now();
    const result = [];

    for (const [pin, share] of Object.entries(shares)) {
        if (share.owner === req.user.username && share.expiresAt > now) {
            result.push({ pin, filename: share.filename, expiresAt: share.expiresAt });
        }
    }

    res.json(result);
});

// DELETE /api/shares/:pin  — revoke a share
router.delete('/:pin', authenticate, (req, res) => {
    const shares = readJSON(SHARES_FILE(), {});
    const pin    = req.params.pin.toUpperCase();

    if (!shares[pin])
        return res.status(404).json({ message: 'Share not found.' });
    if (shares[pin].owner !== req.user.username)
        return res.status(403).json({ message: 'Not your share.' });

    delete shares[pin];
    writeJSON(SHARES_FILE(), shares);
    res.json({ message: 'Share revoked.' });
});

// ── Public share resolution & download (no auth) ─────────────────────────────

// GET /api/shares/resolve/:pin  — look up PIN metadata
router.get('/resolve/:pin', (req, res) => {
    const shares = readJSON(SHARES_FILE(), {});
    const pin    = req.params.pin.toUpperCase();
    const share  = shares[pin];

    if (!share)
        return res.status(404).json({ message: 'Invalid PIN.' });
    if (share.expiresAt < Date.now())
        return res.status(410).json({ message: 'This share has expired.' });

    res.json({
        filename:  share.filename,
        owner:     share.owner,
        expiresAt: share.expiresAt,
    });
});

// GET /api/shares/download/:pin  — download file via PIN
router.get('/download/:pin', (req, res) => {
    const shares = readJSON(SHARES_FILE(), {});
    const pin    = req.params.pin.toUpperCase();
    const share  = shares[pin];

    if (!share)
        return res.status(404).json({ message: 'Invalid PIN.' });
    if (share.expiresAt < Date.now())
        return res.status(410).json({ message: 'This share has expired.' });

    const filePath = path.join(UPLOADS_DIR(), share.owner, path.basename(share.filename));

    try {
        const stat = fs.statSync(filePath);
        res.setHeader('Content-Length', stat.size);
    } catch {
        return res.status(404).json({ message: 'File no longer exists.' });
    }

    res.download(filePath, share.filename, err => {
        if (err && !res.headersSent)
            res.status(500).json({ message: 'Download failed.' });
    });
});

module.exports = router;
