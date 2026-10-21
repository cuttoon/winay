import { $, el, showError, clearError } from './dom.js';
import { money } from './format.js';
import { api } from './api.js';
import { metric } from './components.js';
 
function renderChart({ evolution, monthlyContribution, initialAmount }) {
  const NS = 'http://www.w3.org/2000/svg';
  const width = 600;
  const height = 180;
  const max = Math.max(...evolution.map((point) => point.balance));
  const slot = width / evolution.length;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'chart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Evolución mensual del ahorro: aportes e intereses');
 
  evolution.forEach((point, index) => {
    const contributed = Math.min(initialAmount + monthlyContribution * point.month, point.balance);
    const contributedHeight = (contributed / max) * (height - 6);
    const totalHeight = (point.balance / max) * (height - 6);
    const x = index * slot;
    const barWidth = Math.max(slot - 1, 0.6);
    [[contributedHeight, 'var(--green)', 0], [totalHeight - contributedHeight, 'var(--magenta)', contributedHeight]].forEach(([h, fill, offset]) => {
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', x.toFixed(2));
      rect.setAttribute('y', (height - offset - h).toFixed(2));
      rect.setAttribute('width', barWidth.toFixed(2));
      rect.setAttribute('height', Math.max(h, 0).toFixed(2));
      rect.setAttribute('fill', fill);
      svg.append(rect);
    });
    const title = document.createElementNS(NS, 'title');
    title.textContent = `Mes ${point.month}: ${money(point.balance)}`;
    svg.lastChild.append(title);
  });
  return svg;
}
 
function describeGoal(goal, months) {
  if (!goal.reachable) return 'Con este aporte no alcanzarías la meta en un plazo razonable. Prueba aumentar el aporte.';
  const years = Math.floor(goal.monthsNeeded / 12);
  const rest = goal.monthsNeeded % 12;
  const readable = [years ? `${years} ${years === 1 ? 'año' : 'años'}` : '', rest ? `${rest} ${rest === 1 ? 'mes' : 'meses'}` : ''].filter(Boolean).join(' y ');
  return goal.monthsNeeded <= months
    ? `Alcanzarías tu meta de ${money(goal.amount)} en ${readable}, dentro de tu plazo.`
    : `Alcanzarías tu meta de ${money(goal.amount)} en ${readable}, más allá del plazo que elegiste.`;
}
 
function renderSimulation(result, input) {
  $('#simulator-result').replaceChildren(
    el('div', { class: 'metrics' },
      metric('Total al final', money(result.finalBalance), 'positive'),
      metric('Lo que tú aportas', money(result.totalContributed)),
      metric('Interés ganado', money(result.interestEarned)),
    ),
    el('section', { class: 'panel alt2' },
      result.goal ? el('p', {}, el('strong', {}, describeGoal(result.goal, input.months))) : null,
      el('div', { class: 'legend' },
        el('span', {}, el('i', { class: 'sw sw-green' }), 'Tus aportes'),
        el('span', {}, el('i', { class: 'sw sw-magenta' }), 'Intereses')),
      renderChart({ evolution: result.evolution, monthlyContribution: input.monthlyContribution, initialAmount: input.initialAmount }),
      el('p', { class: 'muted small' }, `Tasa mensual equivalente: ${result.monthlyRate}%. Simulación referencial, no es una oferta financiera.`)),
  );
  $('#simulator-result').hidden = false;
}
 
async function onSimulatorSubmit(event) {
  event.preventDefault();
  clearError('#simulator-error');
  const goal = $('#sim-goal').value;
  const body = {
    monthlyContribution: Number($('#sim-contribution').value),
    annualRate: Number($('#sim-rate').value),
    months: Number($('#sim-months').value),
    initialAmount: Number($('#sim-initial').value || 0),
    ...(goal ? { goalAmount: Number(goal) } : {}),
  };
  try {
    renderSimulation(await api('/simulations/savings', { method: 'POST', body }), body);
  } catch (error) {
    showError('#simulator-error', error);
  }
}
 
export function initSimulator() {
  $('#simulator-form').addEventListener('submit', onSimulatorSubmit);
}