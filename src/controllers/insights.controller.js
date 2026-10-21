'use strict';

function createInsightsController({ insightsService }) {
  return {
    async spending(req, res) {
      res.json(await insightsService.generate(req.body));
    },
  };
}

module.exports = { createInsightsController };
