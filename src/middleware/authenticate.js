const jwt = require('jsonwebtoken');

/**
 * Express middleware — validates the Bearer token in the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 */
function authenticate(req, res, next) {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-production');
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
}

module.exports = authenticate;
