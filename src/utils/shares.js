const { readJSON, writeJSON } = require('./store');

/**
 * Delete all expired share entries from the shares store.
 * @param {string} sharesFile  Absolute path to shares.json
 */
function purgeExpiredShares(sharesFile) {
    const shares = readJSON(sharesFile, {});
    const now = Date.now();
    let changed = false;

    for (const pin of Object.keys(shares)) {
        if (shares[pin].expiresAt < now) {
            delete shares[pin];
            changed = true;
        }
    }

    if (changed) writeJSON(sharesFile, shares);
}

module.exports = { purgeExpiredShares };
