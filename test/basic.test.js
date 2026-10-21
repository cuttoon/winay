'use strict';

process.env.NODE_ENV = 'test'; // silences the logger

const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config');
const { logger } = require('../src/utils/logger');
const { createApp } = require('../src/app');
const { classify } = require('../src/domain/categories');
const { analyzeSpending } = require('../src/services/spending-analysis.service');
const { simulateSavings } = require('../src/services/savings-simulator.service');
const { createContentService } = require('../src/services/content.service');
const { createInsightsService } = require('../src/services/insights.service');
const { createLocalContentRepository } = require('../src/repositories/local-content.repository');

test('classifies a spending by merchant', () => {
  assert.equal(classify('Rappi pedido').category, 'dining_out');
  assert.equal(classify('Alquiler cuarto').category, 'housing');
});

test('calculates how much is left of the income', () => {
  const result = analyzeSpending({
    monthlyIncome: 2000,
    transactions: [
      { date: '2026-09-01', description: 'Alquiler cuarto', amount: 800 },
      { date: '2026-09-10', description: 'Cineplanet entradas', amount: 100 },
    ],
  });
  assert.equal(result.totals.expenses, 900);
  assert.equal(result.totals.remaining, 1100);
});

test('savings simulator applies compound interest', () => {
  const result = simulateSavings({ monthlyContribution: 200, annualRate: 5, months: 24 });
  assert.equal(result.totalContributed, 4800);
  assert.equal(result.finalBalance, 5031.76);
});

test('API answers on /health and /simulations/savings', async () => {
  const contentService = createContentService({
    primaryRepository: createLocalContentRepository({ filePath: config.content.localPath }),
    ttlMs: 1000,
    logger,
  });
  const app = createApp({ config, contentService, insightsService: createInsightsService({ contentService }), logger });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');

    const simulation = await fetch(`${baseUrl}/simulations/savings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ monthlyContribution: 100, annualRate: 0, months: 12 }),
    });
    assert.equal(simulation.status, 200);
    assert.equal((await simulation.json()).finalBalance, 1200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
