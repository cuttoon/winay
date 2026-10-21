'use strict';

const { z } = require('zod');
const { CATEGORY_IDS } = require('../domain/categories');

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, 'Invalid calendar date');

const transactionSchema = z.object({
  date: isoDate,
  description: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(10_000_000),
  category: z.enum(CATEGORY_IDS).optional(),
});

const spendingInsightsSchema = z.object({
  monthlyIncome: z.number().positive().max(10_000_000),
  transactions: z.array(transactionSchema).min(1).max(1000),
});

module.exports = { spendingInsightsSchema };
