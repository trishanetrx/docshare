const fs = require('fs');

/**
 * Read a JSON file, returning `fallback` on any error.
 * @param {string} file
 * @param {*} fallback
 */
function readJSON(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return fallback; }
}

/**
 * Write data to a JSON file (pretty-printed, UTF-8).
 * @param {string} file
 * @param {*} data
 */
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readJSON, writeJSON };
