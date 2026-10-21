'use strict';

const { z } = require('zod');

const savingsSimulationSchema = z.object({
  monthlyContribution: z.number().positive().max(1_000_000),
  annualRate: z.number().min(0).max(100),
  months: z.number().int().min(1).max(600),
  initialAmount: z.number().min(0).max(100_000_000).default(0),
  goalAmount: z.number().positive().max(1_000_000_000).optional(),
});

module.exports = { savingsSimulationSchema };
