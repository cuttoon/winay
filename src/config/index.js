'use strict';

const path = require('node:path');

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// If a Key Vault reference could not be resolved, App Service passes the raw
// "@Microsoft.KeyVault(...)" string. Treat that as "not configured".
const readSecret = (value) => {
  if (!value || value.startsWith('@Microsoft.KeyVault')) return '';
  return value;
};

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3000),
  version: process.env.APP_VERSION || require('../../package.json').version,
  adminApiKey: readSecret(process.env.ADMIN_API_KEY),
  storage: Object.freeze({
    accountName: process.env.STORAGE_ACCOUNT_NAME || '',
    containerName: process.env.CONTENT_CONTAINER || 'content',
    blobName: process.env.CONTENT_BLOB || 'resources.json',
  }),
  content: Object.freeze({
    localPath: path.join(__dirname, '..', '..', 'data', 'content', 'resources.json'),
    cacheTtlMs: toInt(process.env.CONTENT_CACHE_TTL_MS, 5 * 60 * 1000),
  }),
  rateLimit: Object.freeze({
    windowMs: 60 * 1000,
    max: toInt(process.env.RATE_LIMIT_MAX, 100),
  }),
});

module.exports = config;
