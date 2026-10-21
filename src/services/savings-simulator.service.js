'use strict';

const { round2 } = require('../utils/money');

const MAX_MONTHS_TO_GOAL = 1200; // 100 years: stops the search for unreachable goals

/** TEA (annual effective rate, %) -> TEM (monthly effective rate, as a fraction). */
const annualToMonthlyRate = (annualRatePercent) => Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1;

/**
 * Savings with a fixed contribution at the end of each month.
 * Optionally estimates how many months are needed to reach a goal.
 */
function simulateSavings({ monthlyContribution, annualRate, months, initialAmount = 0, goalAmount }) {
  const monthlyRate = annualToMonthlyRate(annualRate);

  const evolution = [];
  let balance = initialAmount;
  for (let month = 1; month <= months; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    evolution.push({ month, balance: round2(balance) });
  }

  const totalContributed = round2(monthlyContribution * months + initialAmount);
  const finalBalance = round2(balance);

  const result = {
    finalBalance,
    totalContributed,
    interestEarned: round2(finalBalance - totalContributed),
    monthlyRate: Number((monthlyRate * 100).toFixed(4)),
    evolution,
  };

  if (goalAmount !== undefined) {
    result.goal = { amount: goalAmount, ...estimateMonthsToGoal({ monthlyContribution, monthlyRate, initialAmount, goalAmount }) };
  }

  return result;
}

function estimateMonthsToGoal({ monthlyContribution, monthlyRate, initialAmount, goalAmount }) {
  let balance = initialAmount;
  for (let month = 1; month <= MAX_MONTHS_TO_GOAL; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    if (balance >= goalAmount) return { monthsNeeded: month, reachable: true };
  }
  return { monthsNeeded: null, reachable: false };
}

module.exports = { simulateSavings, annualToMonthlyRate };
