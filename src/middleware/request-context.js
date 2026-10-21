'use strict';

const crypto = require('node:crypto');

const SAFE_REQUEST_ID = /^[\w-]{1,64}$/;

/** Assigns a request id (reusing a safe incoming one) and logs each request when it finishes. */
function requestContext(logger) {
  return (req, res, next) => {
    const incoming = req.get('x-request-id');
    req.id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('x-request-id', req.id);

    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      logger.info('request', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
      });
    });
    next();
  };
}

module.exports = { requestContext };
