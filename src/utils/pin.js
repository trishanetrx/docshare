const crypto = require('crypto');

// Characters chosen to avoid visually ambiguous pairs (0/O, 1/I)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a cryptographically-random 6-character alphanumeric PIN.
 * @returns {string}
 */
function generatePin() {
    const bytes = crypto.randomBytes(6);
    let pin = '';
    for (let i = 0; i < 6; i++) {
        pin += CHARS[bytes[i] % CHARS.length];
    }
    return pin;
}

module.exports = { generatePin };
