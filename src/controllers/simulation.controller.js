'use strict';

const { simulateSavings } = require('../services/savings-simulator.service');

function createSimulationController() {
  return {
    savings(req, res) {
      res.json(simulateSavings(req.body));
    },
  };
}

module.exports = { createSimulationController };
