// Tiny DOM helpers. Elements are built with h() instead of innerHTML strings, so markup and
// data never mix and there is nothing to escape.

export const $ = (id) => document.getElementById(id);

/**
 * h('div', { class: 'x', onclick: fn, dataset: { a: 1 } }, child, 'text', [more])
 * `null`, `false` and `undefined` children are skipped.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : String(child));
  }
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Restarts a CSS animation class on an element. */
export function flash(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export const isTouch = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;
