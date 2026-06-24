const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const path   = require('path');
const { readJSON, writeJSON } = require('../utils/store');

const router = Router();

const USERS_FILE = () => path.join(
    process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data'),
    'users.json'
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ message: 'Username and password are required.' });

    const users = readJSON(USERS_FILE(), []);
    if (users.find(u => u.username === username))
        return res.status(409).json({ message: 'Username already taken.' });

    const hashed = await bcrypt.hash(password, 10);
    users.push({ username, password: hashed });
    writeJSON(USERS_FILE(), users);

    res.status(201).json({ message: 'Registered successfully.' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = readJSON(USERS_FILE(), []);
    const user  = users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ message: 'Invalid username or password.' });

    const token = jwt.sign(
        { username },
        process.env.JWT_SECRET || 'change-me-in-production',
        { expiresIn: '8h' }
    );

    res.json({ message: 'Login successful.', token });
});

module.exports = router;
