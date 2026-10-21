'use strict';

const crypto = require('node:crypto');
const { AppError } = require('../utils/errors');

const digest = (value) => crypto.createHash('sha256').update(value).digest();

/**
 * Protects admin routes with a shared secret sent in the x-api-key header.
 * In Azure the secret lives in Key Vault and reaches the app through a Key Vault reference.
 * If no key is configured the admin API is disabled instead of left open.
 */
function requireAdminKey(adminApiKey) {
  return (req, _res, next) => {
    if (!adminApiKey) {
      return next(new AppError(503, 'ADMIN_DISABLED', 'The admin API is not configured'));
    }
    const provided = req.get('x-api-key') || '';
    // Comparing fixed-length digests keeps the comparison constant-time.
    if (!crypto.timingSafeEqual(digest(provided), digest(adminApiKey))) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Invalid or missing API key'));
    }
    return next();
  };
}

module.exports = { requireAdminKey };
