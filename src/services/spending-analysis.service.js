'use strict';

const { BUCKETS, classify, getCategory, isDelivery } = require('../domain/categories');
const { round1, round2 } = require('../utils/money');

// Reference split popularised as the "50/30/20 rule".
const TARGETS = Object.freeze({ needs: 50, wants: 30, savings: 20 });
const SMALL_PURCHASE_MAX = 20; // soles
const DAY_MS = 24 * 60 * 60 * 1000;

const sum = (items) => round2(items.reduce((total, item) => total + item.amount, 0));

/**
 * Pure function: turns raw transactions into spending metrics.
 * Amounts are positive numbers (expenses). Income is monthly.
 */
function analyzeSpending({ monthlyIncome, transactions }) {
  const items = transactions.map((transaction) => {
    const { category, bucket } = transaction.category
      ? getCategory(transaction.category)
      : classify(transaction.description);
    return { ...transaction, category, bucket, isDelivery: isDelivery(transaction.description) };
  });

  const timestamps = items.map((item) => Date.parse(item.date));
  const from = Math.min(...timestamps);
  const to = Math.max(...timestamps);
  const days = Math.round((to - from) / DAY_MS) + 1;
  const monthsCovered = Math.max(1, Math.round(days / 30));
  const expectedIncome = round2(monthlyIncome * monthsCovered);

  const expenses = items.filter((item) => item.bucket !== BUCKETS.SAVINGS);
  const savingsTransfers = sum(items.filter((item) => item.bucket === BUCKETS.SAVINGS));
  const totalExpenses = sum(expenses);
  const remaining = round2(expectedIncome - totalExpenses);
  const percentOfIncome = (amount) => round1((amount / expectedIncome) * 100);
  const bucketTotal = (bucket) => sum(expenses.filter((item) => item.bucket === bucket));

  const needs = bucketTotal(BUCKETS.NEEDS);
  const wants = bucketTotal(BUCKETS.WANTS);
  const unclassified = bucketTotal(BUCKETS.UNCLASSIFIED);

  const byCategory = new Map();
  for (const item of expenses) {
    const entry = byCategory.get(item.category) || { id: item.category, bucket: item.bucket, amount: 0, count: 0 };
    entry.amount += item.amount;
    entry.count += 1;
    byCategory.set(item.category, entry);
  }
  const categories = [...byCategory.values()]
    .map((entry) => ({
      ...entry,
      amount: round2(entry.amount),
      shareOfExpenses: totalExpenses > 0 ? round1((entry.amount / totalExpenses) * 100) : 0,
      percentOfIncome: percentOfIncome(entry.amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  const delivery = expenses.filter((item) => item.isDelivery);
  const subscriptions = expenses.filter((item) => item.category === 'subscriptions');
  const debt = expenses.filter((item) => item.category === 'debt');
  const smallPurchases = expenses.filter(
    (item) => item.amount <= SMALL_PURCHASE_MAX && item.bucket !== BUCKETS.NEEDS && item.category !== 'subscriptions',
  );

  return {
    period: {
      from: new Date(from).toISOString().slice(0, 10),
      to: new Date(to).toISOString().slice(0, 10),
      days,
      monthsCovered,
    },
    income: { monthly: monthlyIncome, expectedForPeriod: expectedIncome },
    totals: { expenses: totalExpenses, savingsTransfers, remaining },
    savingsRate: round1((remaining / expectedIncome) * 100),
    buckets: {
      needs: { amount: needs, percentOfIncome: percentOfIncome(needs), target: TARGETS.needs },
      wants: { amount: wants, percentOfIncome: percentOfIncome(wants), target: TARGETS.wants },
      savings: {
        amount: Math.max(remaining, 0),
        percentOfIncome: round1(Math.max((remaining / expectedIncome) * 100, 0)),
        target: TARGETS.savings,
      },
      unclassified: { amount: unclassified, percentOfIncome: percentOfIncome(unclassified) },
    },
    categories,
    habits: {
      delivery: { count: delivery.length, amount: sum(delivery), percentOfIncome: percentOfIncome(sum(delivery)) },
      subscriptions: {
        count: subscriptions.length,
        amount: sum(subscriptions),
        percentOfIncome: percentOfIncome(sum(subscriptions)),
      },
      debtService: { amount: sum(debt), percentOfIncome: percentOfIncome(sum(debt)) },
      smallPurchases: { count: smallPurchases.length, amount: sum(smallPurchases), threshold: SMALL_PURCHASE_MAX },
    },
    dataQuality: {
      transactions: items.length,
      unclassifiedShare: totalExpenses > 0 ? round1((unclassified / totalExpenses) * 100) : 0,
    },
  };
}

module.exports = { analyzeSpending, TARGETS };
