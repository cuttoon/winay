'use strict';

function createHealthController({ config, contentService }) {
  return {
    get(_req, res) {
      res.json({
        status: 'ok',
        version: config.version,
        environment: config.env,
        uptimeSeconds: Math.round(process.uptime()),
        content: contentService.status(),
      });
    },
  };
}

module.exports = { createHealthController };
