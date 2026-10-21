'use strict';

const { analyzeSpending } = require('./spending-analysis.service');
const { buildRecommendations } = require('./recommendation.service');

const RESOURCES_PER_RECOMMENDATION = 2;

/**
 * Orchestrates analysis + rule-based recommendations + learning resources.
 * Nothing is persisted: user data lives only for the duration of the request.
 */
function createInsightsService({ contentService }) {
  return {
    async generate(input) {
      const analysis = analyzeSpending(input);
      const shown = new Set(); // do not repeat the same resource under different recommendations
      const recommendations = [];
      for (const { tags, ...recommendation } of buildRecommendations(analysis)) {
        const resources = await contentService.findByTags(tags, RESOURCES_PER_RECOMMENDATION, { exclude: shown });
        resources.forEach((resource) => shown.add(resource.id));
        recommendations.push({ ...recommendation, resources });
      }
      return { analysis, recommendations };
    },
  };
}

module.exports = { createInsightsService };
