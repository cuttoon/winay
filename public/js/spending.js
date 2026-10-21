import { $, el, showError, clearError } from './dom.js';
import { money, percent } from './format.js';
import { api } from './api.js';
import { LABELS, SAMPLE_INCOME } from './labels.js';
import { meter, metric, resourceLink } from './components.js';
import { parseTransactions } from './csv.js';
import { expenses, renderExpenses, initExpenseEntry } from './expenses.js';
 
function renderSpending({ analysis, recommendations }) {
  const { income, totals, savingsRate, buckets, categories, period } = analysis;
 
  const summary = el('div', { class: 'metrics' },
    metric('Ingreso del periodo', money(income.expectedForPeriod)),
    metric('Gastos', money(totals.expenses)),
    metric(totals.remaining >= 0 ? 'Te queda' : 'Te falta', money(Math.abs(totals.remaining)), totals.remaining >= 0 ? 'positive' : 'negative'),
    metric('Tasa de ahorro', percent(savingsRate), savingsRate >= 20 ? 'positive' : savingsRate < 0 ? 'negative' : ''),
  );
 
  const bucketRows = ['needs', 'wants', 'savings'].map((key) => {
    const bucket = buckets[key];
    const overTarget = key !== 'savings' && bucket.percentOfIncome > bucket.target;
    const belowTarget = key === 'savings' && bucket.percentOfIncome < bucket.target;
    const tone = overTarget || belowTarget ? 'warn' : 'ok';
    return el('div', {},
      el('div', { class: 'row-head' },
        el('strong', {}, LABELS.bucket[key]),
        el('span', {}, `${money(bucket.amount)} · ${percent(bucket.percentOfIncome)} de tu ingreso · meta ${bucket.target}%`)),
      meter({ value: bucket.percentOfIncome, target: bucket.target, tone, label: `${LABELS.bucket[key]}: ${percent(bucket.percentOfIncome)}` }));
  });
 
  const topAmount = categories[0]?.amount || 1;
  const categoryRows = categories.map((category) =>
    el('div', {},
      el('div', { class: 'row-head' },
        el('strong', {}, LABELS.category[category.id] || category.id),
        el('span', {}, `${money(category.amount)} · ${category.count} ${category.count === 1 ? 'gasto' : 'gastos'}`)),
      meter({ value: category.amount, max: topAmount, label: `${LABELS.category[category.id]}: ${money(category.amount)}` })));
 
  const recoCards = recommendations.map((reco) =>
    el('article', { class: `card reco ${reco.severity}` },
      el('span', { class: `pill ${reco.severity}` }, LABELS.severity[reco.severity]),
      el('h3', {}, reco.title),
      el('p', {}, reco.message),
      el('ul', {}, reco.actions.map((action) => el('li', {}, action))),
      reco.resources.length ? el('div', { class: 'resources' }, reco.resources.map(resourceLink)) : null));
 
  $('#spending-result').replaceChildren(
    summary,
    el('section', { class: 'panel alt' },
      el('h2', {}, 'Tu distribución 50/30/20'),
      el('p', { class: 'muted' }, `Periodo analizado: ${period.from} al ${period.to}. La línea vertical marca la meta de referencia.`),
      el('div', { class: 'rows' }, bucketRows)),
    el('section', { class: 'panel alt2' }, el('h2', {}, 'En qué gastas'), el('div', { class: 'rows' }, categoryRows)),
    el('h2', { class: 'section-title' }, 'Consejos ', el('span', {}, 'para ti')),
    el('div', { class: 'cards' }, recoCards),
  );
  $('#spending-result').hidden = false;
}
 
async function onSpendingSubmit(event) {
  event.preventDefault();
  clearError('#spending-error');
  const monthlyIncome = Number($('#income').value);
  const transactions = expenses.map(({ date, description, amount }) => ({ date, description, amount }));
 
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
    return showError('#spending-error', new Error('Ingresa tu ingreso mensual (mayor que 0).'));
  }
  if (!transactions.length) return showError('#spending-error', new Error('Agrega al menos un gasto o carga el ejemplo.'));
 
  try {
    renderSpending(await api('/insights/spending', { method: 'POST', body: { monthlyIncome, transactions } }));
    $('#spending-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    showError('#spending-error', error);
  }
  return undefined;
}
 
async function loadSample() {
  clearError('#spending-error');
  try {
    const response = await fetch('/sample-transactions.csv');
    if (!response.ok) throw new Error('No se pudo cargar el ejemplo');
    const { transactions, errors } = parseTransactions(await response.text());
    if (errors.length) throw new Error(errors[0]);
    expenses.length = 0;
    expenses.push(...transactions);
    renderExpenses();
    $('#income').value = SAMPLE_INCOME;
  } catch (error) {
    showError('#spending-error', error);
  }
}
 
export function initSpending() {
  $('#spending-form').addEventListener('submit', onSpendingSubmit);
  $('#load-sample').addEventListener('click', loadSample);
  initExpenseEntry();
}