import { $, isTouch } from './dom.js';

// One tooltip for the whole app. Any element with data-tip (and optionally data-tip-title) gets
// one: on hover with a mouse, on tap with touch. Delegated, so re-rendered elements need no
// wiring.

let current = null;

export function initTooltips() {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'mouse') show(e.target.closest('[data-tip]'));
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'mouse' && current && !current.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-tip]');
    if (!isTouch()) return;
    if (target && target !== current) show(target);
    else hide();
  });
  document.addEventListener('focusin', (e) => show(e.target.closest('[data-tip]')));
  document.addEventListener('focusout', hide);
}

function show(target) {
  if (!target) return hide();
  current = target;
  const tip = $('tooltip');
  tip.replaceChildren();
  if (target.dataset.tipTitle) {
    const title = document.createElement('strong');
    title.textContent = target.dataset.tipTitle;
    tip.append(title);
  }
  for (const line of target.dataset.tip.split('\n')) {
    const p = document.createElement('p');
    p.textContent = line;
    tip.append(p);
  }
  tip.hidden = false;
  const r = target.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const x = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), window.innerWidth - t.width - 8);
  const above = r.top - t.height - 8;
  const y = above > 8 ? above : Math.min(r.bottom + 8, window.innerHeight - t.height - 8);
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

export function hide() {
  current = null;
  $('tooltip').hidden = true;
}
