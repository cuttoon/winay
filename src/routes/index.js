'use strict';

const express = require('express');
const { asyncHandler } = require('../utils/async-handler');
const { validateBody } = require('../middleware/validate');
const { requireAdminKey } = require('../middleware/admin-auth');
const { spendingInsightsSchema } = require('../schemas/insights.schema');
const { savingsSimulationSchema } = require('../schemas/simulation.schema');
const { createHealthController } = require('../controllers/health.controller');
const { createInsightsController } = require('../controllers/insights.controller');
const { createSimulationController } = require('../controllers/simulation.controller');
const { createContentController } = require('../controllers/content.controller');

/** API v1 routes. Controllers receive their dependencies explicitly (easy to fake in tests). */
function createApiRouter({ config, contentService, insightsService }) {
  const router = express.Router();

  const health = createHealthController({ config, contentService });
  const insights = createInsightsController({ insightsService });
  const simulation = createSimulationController();
  const content = createContentController({ contentService });

  router.get('/health', health.get);
  router.get('/resources', asyncHandler(content.list));
  router.post('/insights/spending', validateBody(spendingInsightsSchema), asyncHandler(insights.spending));
  router.post('/simulations/savings', validateBody(savingsSimulationSchema), simulation.savings);
  router.post('/admin/content/refresh', requireAdminKey(config.adminApiKey), asyncHandler(content.refresh));

  return router;
}

module.exports = { createApiRouter };
