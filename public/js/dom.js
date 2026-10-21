export const $ = (selector) => document.querySelector(selector);
 
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
 
export function showError(selector, error) {
  const node = $(selector);
  const detail = error.details?.length ? ` (${error.details.map((d) => `${d.field}: ${d.message}`).join('; ')})` : '';
  node.textContent = `${error.message}${detail}`;
  node.hidden = false;
}
export const clearError = (selector) => { $(selector).hidden = true; };