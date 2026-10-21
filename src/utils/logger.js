'use strict';

// Minimal structured logger: one JSON object per line.
// App Service captures stdout/stderr, and Log Analytics / Application Insights can query it.

const write = (level, message, meta = {}) => {
  if (process.env.NODE_ENV === 'test') return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta });
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
};

const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};

module.exports = { logger };
