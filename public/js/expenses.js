import { $, el, showError, clearError } from './dom.js';
import { money } from './format.js';
 
const PRESET_DESCRIPTIONS = [
  'Delivery', 'Yape', 'Gastos hormiga', 'Menú almuerzo', 'Café', 'Alquiler', 'Recibo de luz', 'Recibo de agua',
  'Internet', 'Supermercado', 'Pasaje', 'Uber', 'Farmacia', 'Netflix', 'Spotify', 'Salida a un bar',
  'Ropa', 'Cuota tarjeta de crédito', 'Pensión universidad', 'Ahorro',
];
const CUSTOM_KEY = 'winay.customDescriptions';
export const expenses = [];
 
function loadCustomDescriptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(0, 30) : [];
  } catch { return []; }
}
 
function saveCustomDescription(text) {
  const known = [...PRESET_DESCRIPTIONS, ...loadCustomDescriptions()].map((item) => item.toLowerCase());
  if (known.includes(text.toLowerCase())) return;
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify([...loadCustomDescriptions(), text].slice(-30))); } catch { /* storage unavailable */ }
}
 
function renderDescriptionOptions() {
  $('#description-options').replaceChildren(...[...PRESET_DESCRIPTIONS, ...loadCustomDescriptions()].map((item) => el('option', { value: item })));
}
 
const pad = (n) => String(n).padStart(2, '0');
const isoToDisplay = (iso) => iso.split('-').reverse().join('-');
 
function displayToIso(text) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid = date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
  return valid ? `${year}-${month}-${day}` : null;
}
 
function todayDisplay() {
  const now = new Date();
  return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
}
 
function maskDateInput(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  event.target.value = parts.join('-');
}
 
function openCalendar() {
  const picker = $('#expense-date-picker');
  picker.value = displayToIso($('#expense-date').value) || '';
  if (typeof picker.showPicker === 'function') picker.showPicker();
  else picker.focus();
}
 
export function renderExpenses() {
  const list = $('#expense-list');
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  list.replaceChildren(...sorted.map((item) => el('li', { class: 'expense-item' },
    el('span', {}, isoToDisplay(item.date)),
    el('span', {}, item.description),
    el('span', { class: 'amount' }, money(item.amount)),
    el('button', {
      type: 'button', 'aria-label': `Quitar ${item.description}`,
      onclick: () => { expenses.splice(expenses.indexOf(item), 1); renderExpenses(); },
    }, '×'))));
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  $('#expense-count').textContent = expenses.length ? `${expenses.length} ${expenses.length === 1 ? 'gasto agregado' : 'gastos agregados'}` : 'Aún no agregas gastos';
  $('#expense-total').textContent = expenses.length ? `Total: ${money(total)}` : '';
}
 
function addExpense() {
  clearError('#spending-error');
  const date = displayToIso($('#expense-date').value);
  const description = $('#expense-description').value.trim().replace(/\s+/g, ' ');
  const amount = Number($('#expense-amount').value);
  if (!date) return showError('#spending-error', new Error('La fecha debe tener el formato dd-mm-aaaa y ser una fecha real (usa el calendario 📅).'));
  if (!description) return showError('#spending-error', new Error('Elige o escribe una descripción.'));
  if (!Number.isFinite(amount) || amount <= 0) return showError('#spending-error', new Error('Ingresa un monto mayor que 0.'));
  expenses.push({ date, description, amount });
  saveCustomDescription(description);
  renderDescriptionOptions();
  renderExpenses();
  $('#expense-description').value = '';
  $('#expense-amount').value = '';
  $('#expense-description').focus();
  return undefined;
}
 
export function initExpenseEntry() {
  $('#expense-date').value = todayDisplay();
  $('#expense-date').addEventListener('input', maskDateInput);
  $('#expense-date-btn').addEventListener('click', openCalendar);
  $('#expense-date-picker').addEventListener('change', (event) => { if (event.target.value) $('#expense-date').value = isoToDisplay(event.target.value); });
  $('#add-expense').addEventListener('click', addExpense);
  ['#expense-date', '#expense-description', '#expense-amount'].forEach((selector) => $(selector).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); addExpense(); }
  }));
  $('#clear-expenses').addEventListener('click', () => { expenses.length = 0; renderExpenses(); });
  renderDescriptionOptions();
  renderExpenses();
}