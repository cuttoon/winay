import { $, el, showError, clearError } from './dom.js';
import { api } from './api.js';
import { LABELS } from './labels.js';
 
let libraryLoaded = false;
let activeTag = null;
 
function renderLibrary(resources) {
  $('#resource-list').replaceChildren(...resources.map((resource) =>
    el('article', { class: 'card' },
      el('span', { class: 'pill' }, resource.type === 'external' ? `${resource.source.name} · fuente oficial` : 'Guía rápida'),
      el('h3', {}, resource.title),
      el('p', {}, resource.summary),
      resource.steps ? el('details', {}, el('summary', {}, 'Ver pasos'), el('ol', { class: 'steps' }, resource.steps.map((step) => el('li', {}, step)))) : null,
      resource.source.url ? el('p', {}, el('a', { href: resource.source.url, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir en el sitio oficial ↗')) : null)));
}
 
export async function loadLibrary(tag = activeTag) {
  clearError('#library-error');
  try {
    const query = tag ? `?tag=${encodeURIComponent(tag)}` : '';
    const data = await api(`/resources${query}`);
    renderLibrary(data.resources);
    $('#library-source').textContent = `Fuente del contenido: ${data.source === 'azure-blob' ? 'Azure Blob Storage' : 'archivo local'}${data.degraded ? ' (modo respaldo)' : ''}`;
    if (!libraryLoaded) {
      libraryLoaded = true;
      const all = await api('/resources');
      const tags = [...new Set(all.resources.flatMap((resource) => resource.tags))].sort();
      renderTagFilters(tags);
    }
  } catch (error) {
    showError('#library-error', error);
  }
}
 
function renderTagFilters(tags) {
  const make = (label, tag) => el('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(activeTag === tag),
    onclick: () => { activeTag = tag; renderTagFilters(tags); loadLibrary(tag); },
  }, label);
  $('#tag-filters').replaceChildren(make('Todos', null), ...tags.map((tag) => make(LABELS.tag[tag] || tag, tag)));
}