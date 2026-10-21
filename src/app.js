'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { requestContext } = require('./middleware/request-context');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');
const { createApiRouter } = require('./routes');

/** App factory: all dependencies are injected, so tests can build an app with fakes. */
function createApp({ config, contentService, insightsService, logger }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // App Service terminates TLS in front of the app

  app.use(requestContext(logger));
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        // Not needed here and breaks plain-http localhost in some browsers.
        directives: { 'upgrade-insecure-requests': null },
      },
    }),
  );
  app.use(express.json({ limit: '200kb' }));

  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      limit: config.rateLimit.max,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
    }),
  );

  app.use('/api/v1', createApiRouter({ config, contentService, insightsService }));
  app.use('/api', notFoundHandler);

  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

  app.use(errorHandler(logger));
  return app;
}

module.exports = { createApp };
