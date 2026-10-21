'use strict';

const config = require('./config');
const { logger } = require('./utils/logger');
const { createApp } = require('./app');
const { createContentRepositories } = require('./repositories');
const { createContentService } = require('./services/content.service');
const { createInsightsService } = require('./services/insights.service');

// Composition root: the only place where concrete implementations are wired together.
const contentService = createContentService({
  ...createContentRepositories(config),
  ttlMs: config.content.cacheTtlMs,
  logger,
});
const insightsService = createInsightsService({ contentService });
const app = createApp({ config, contentService, insightsService, logger });

const server = app.listen(config.port, () => {
  logger.info('Server started', { port: config.port, environment: config.env, version: config.version });
  // Warm the cache without blocking startup; requests will retry if this fails.
  contentService.refresh().catch((error) => logger.warn('Initial content load failed', { error: error.message }));
});

function shutdown(signal) {
  logger.info('Shutting down', { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
