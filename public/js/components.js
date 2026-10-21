import { el } from './dom.js';
 
export function meter({ value, max = 100, target, tone = 'primary', label }) {
  const track = el('div', { class: 'meter', role: 'img', 'aria-label': label });
  const fill = el('div', { class: `meter-fill tone-${tone}` });
  fill.style.width = `${Math.max(0, Math.min((value / max) * 100, 100))}%`;
  track.append(fill);
  if (target !== undefined) {
    const mark = el('div', { class: 'meter-target', title: `Meta: ${target}%` });
    mark.style.left = `${(target / max) * 100}%`;
    track.append(mark);
  }
  return track;
}
 
export function metric(label, value, tone) {
  return el('div', { class: `metric ${tone || ''}` }, el('span', {}, label), el('strong', {}, value));
}
 
export function resourceLink(resource) {
  const text = resource.type === 'external' ? `${resource.title} ↗` : resource.title;
  if (resource.url && resource.url.startsWith('https://')) {
    return el('a', { class: 'resource-link', href: resource.url, target: '_blank', rel: 'noopener noreferrer' }, text);
  }
  return el('span', { class: 'resource-link' }, text);
}