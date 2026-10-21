'use strict';

function createContentController({ contentService }) {
  return {
    async list(req, res) {
      const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
      res.json(await contentService.list({ tag }));
    },

    async refresh(_req, res) {
      res.json(await contentService.refresh());
    },
  };
}

module.exports = { createContentController };
