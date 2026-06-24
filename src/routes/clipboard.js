const { Router } = require('express');
const path = require('path');
const authenticate = require('../middleware/authenticate');
const { readJSON, writeJSON } = require('../utils/store');

const router = Router();

const CLIPBOARD_FILE = () => path.join(
    process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data'),
    'clipboard.json'
);

// GET /api/clipboard
router.get('/', authenticate, (req, res) => {
    const data = readJSON(CLIPBOARD_FILE(), {});
    res.json(data[req.user.username] || []);
});

// POST /api/clipboard
router.post('/', authenticate, (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Text is required.' });

    const data = readJSON(CLIPBOARD_FILE(), {});
    if (!data[req.user.username]) data[req.user.username] = [];
    data[req.user.username].push(text);
    writeJSON(CLIPBOARD_FILE(), data);

    res.status(201).json({ message: 'Saved.', data: data[req.user.username] });
});

// DELETE /api/clipboard
router.delete('/', authenticate, (req, res) => {
    const data = readJSON(CLIPBOARD_FILE(), {});
    data[req.user.username] = [];
    writeJSON(CLIPBOARD_FILE(), data);
    res.json({ message: 'Clipboard cleared.' });
});

module.exports = router;
