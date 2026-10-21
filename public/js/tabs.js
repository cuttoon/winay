import { loadLibrary } from './library.js';
 
export function activateTab(name) {
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== `tab-${name}`; });
  if (name === 'library') loadLibrary();
}
 
export function initTabs() {
  document.querySelectorAll('[role="tab"]').forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));
}