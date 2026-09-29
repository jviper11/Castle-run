import { $, h, clear } from './dom.js';
import { cardView } from './cardView.js';
import { STATUSES } from '../engine/statuses.js';
import { AFFINITIES, canReroll, rerollsAvailable } from '../engine/dice.js';
import { previewIntent, describeAbilities, DEFEND_BLOCK } from '../engine/enemies.js';
import { playability } from '../engine/combat.js';
import { currentPath } from '../engine/run.js';
import { PLACEHOLDER_POOL_FLOORS } from '../content/enemies.js';
import { HEROES } from '../content/heroes.js';

// Renders combat state. Pure with respect to the engine: it only reads.
//
// renderFighter() takes a plain { hp, maxHp, block, statuses } unit. During animation the
// animator passes a display snapshot that is replayed event by event; afterwards render() passes
// the real state. The HP bars therefore move in step with the hits, not ahead of them.

const KIND_LABEL = { easy: 'Battle', normal: 'Battle', elite: 'Elite', boss: 'Boss' };

export function render(c, ui) {
  renderHud(c);
  renderFighter('player', c.player);
  renderFighter('enemy', c.enemy);
  renderEnemyStatic(c);
  renderIntent(c);
  renderEnergy(c.player.energy, c.player.maxEnergy);
  renderDie(c, c.die.value);
  renderHand(c, ui);
  $('end-turn-btn').disabled = c.phase !== 'player' || ui.busy || !!c.pending;
}

export function renderHud(c) {
  const run = c.run;
  const len = currentPath(run).length;
  const where = c.kind === 'boss' ? 'Boss' : `Room ${run.index + 1}/${len} · ${KIND_LABEL[c.kind]}`;
  const stand = PLACEHOLDER_POOL_FLOORS.includes(run.floor + 1) && c.kind !== 'boss' ? ' · Floor 1 enemies (placeholder until 3d)' : '';
  $('hud-progress').textContent = `Floor ${run.floor + 1} · ${where}${stand}`;
  $('hud-gold').textContent = run.gold;
  $('hud-souls').textContent = run.souls;
  $('pile-draw').textContent = c.piles.draw.length;
  $('pile-discard').textContent = c.piles.discard.length;
  $('pile-exhaust').textContent = c.piles.exhaust.length;
}

export function renderFighter(side, unit) {
  const root = $(`fighter-${side}`);
  const pct = Math.max(0, (unit.hp / unit.maxHp) * 100);
  root.querySelector('.hpbar-fill').style.width = pct + '%';
  root.querySelector('.hpbar').classList.toggle('low', pct <= 30);
  root.querySelector('.hpbar-text').textContent = `${unit.hp} / ${unit.maxHp}`;
  const badge = $(`${side}-block`);
  badge.hidden = unit.block <= 0;
  badge.querySelector('b').textContent = unit.block;
  root.querySelector('.hpbar').classList.toggle('shielded', unit.block > 0);

  const row = clear($(`${side}-statuses`));
  for (const [id, n] of Object.entries(unit.statuses)) {
    const s = STATUSES[id];
    row.append(h('span', {
      class: `status-chip status-${s.kind}`, dataset: { tipTitle: `${s.emoji} ${s.name}`, tip: `${s.desc(n, unit.statusData?.[id] || {})}\n${typeof s.tick === 'string' ? s.tick : s.tick[side]}` },
      tabindex: 0,
    }, s.emoji, h('b', {}, n)));
  }
}

function renderEnemyStatic(c) {
  const e = c.enemy;
  // Bosses show their portrait; other enemies are an emoji.
  const sprite = clear($('enemy-sprite'));
  sprite.classList.toggle('portrait-sprite', !!e.portrait);
  sprite.append(e.portrait ? h('div', { class: 'portrait' }, h('img', { src: e.portrait, alt: e.name })) : e.emoji);
  $('enemy-name').textContent = e.title ? `${e.name} · ${e.title}` : e.name;
  const hero = HEROES[c.run.heroKey];
  const img = $('player-portrait');
  if (img.getAttribute('src') !== hero.portrait) img.src = hero.portrait;
  img.alt = hero.name;
  $('player-name').textContent = hero.name;
  const abilities = describeAbilities(e);
  const row = clear($('enemy-abilities'));
  for (const a of abilities) {
    row.append(h('span', { class: 'ability-chip', tabindex: 0, dataset: { tipTitle: `⚡ ${a.name}`, tip: a.text } }, '⚡ ', a.name));
  }
  // The ability row is hidden on short screens; the name carries the same text.
  const name = $('enemy-name');
  name.dataset.tipTitle = e.name;
  name.dataset.tip = abilities.length
    ? abilities.map((a) => `⚡ ${a.name}: ${a.text}`).join('\n')
    : `Attacks for ${e.damage} or defends for ${DEFEND_BLOCK} Block. No special abilities.`;
  name.classList.toggle('has-abilities', abilities.length > 0);
}

export function renderIntent(c) {
  const el = $('enemy-intent');
  el.replaceChildren();
  if (c.phase === 'won' || c.phase === 'lost') {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const i = previewIntent(c);
  el.className = `intent intent-${i.kind}`;
  if (i.kind === 'attack') {
    // firstHit includes Fly, which halves only the first hit.
    const changed = i.firstHit !== i.base;
    el.append(h('span', { class: 'intent-icon' }, '⚔️'), h('b', {}, i.firstHit));
    if (i.hits > 1) el.append(`×${i.hits}`);
    if (changed) el.append(h('s', {}, i.base));
    el.dataset.tipTitle = 'Intends to attack';
    el.dataset.tip = `Deals ${i.firstHit} damage${i.hits > 1 ? `, then ${i.perHit} × ${i.hits - 1}` : ''} before your Block.` +
      (changed ? `\nBase ${i.base}, changed by statuses${i.firstHit !== i.perHit ? ' and Fly' : ''}.` : '');
  } else if (i.kind === 'defend') {
    el.append(h('span', { class: 'intent-icon' }, '🛡'), h('b', {}, i.block));
    el.dataset.tipTitle = 'Intends to defend';
    el.dataset.tip = `Gains ${i.block} Block.`;
  } else if (i.kind === 'aim') {
    el.append(h('span', { class: 'intent-icon' }, '🎯'), h('b', {}, 'Aiming'));
    el.dataset.tipTitle = 'Aiming';
    el.dataset.tip = `Does nothing this turn. Its next attack deals ${c.enemy.pattern.multiplier}× damage.`;
  }
}

export function renderEnergy(energy, max) {
  const el = $('energy');
  el.querySelector('b').textContent = energy;
  el.querySelector('small').textContent = `/${max}`;
  el.classList.toggle('empty', energy <= 0);
}

export function renderDie(c, value, rolling = false) {
  const hero = HEROES[c.run.heroKey];
  const die = $('die');
  die.textContent = value ?? '–';
  die.classList.toggle('rolling', rolling);
  const met = !rolling && value != null && AFFINITIES[hero.affinity].test(value, c.die.sides);
  die.classList.toggle('met', met);
  const aff = $('die-affinity');
  aff.textContent = `${AFFINITIES[hero.affinity].label} ${met ? '✓' : '✗'}`;
  aff.classList.toggle('met', met);
  aff.dataset.tipTitle = `d${c.die.sides} · ${hero.name} affinity: ${AFFINITIES[hero.affinity].label}`;
  aff.dataset.tip = 'Cards with a matching affinity line gain their bonus while the die shows an affinity roll.';
  const btn = $('reroll-btn');
  btn.disabled = !canReroll(c);
  btn.querySelector('span').textContent = `(${rerollsAvailable(c)})`;
  // Soul Forge die actions: shown only while still available this combat.
  const canAct = c.phase === 'player' && !c.pending;
  $('second-die-btn').hidden = !c.oncePerCombat.secondDie;
  $('second-die-btn').disabled = !canAct;
  $('edge-btn').hidden = !c.oncePerCombat.gamblersEdge;
  $('edge-btn').disabled = !canAct || c.turnState.dieSet;
}

export function renderHand(c, ui) {
  const hand = clear($('hand'));
  const n = c.piles.hand.length;
  hand.style.setProperty('--n', n);
  c.piles.hand.forEach((card, i) => {
    const check = playability(c, card);
    const el = cardView(card.key, {
      c, uid: card.uid,
      cost: check.cost ?? undefined,
      affordable: check.ok || check.reason !== 'Not enough Energy',
      warning: check.warning,
    });
    el.style.setProperty('--i', i);
    el.dataset.hotkey = i + 1;
    if (ui.selected === card.uid) el.classList.add('selected');
    if (ui.justDrawn?.has(card.uid)) el.classList.add('drawn');
    hand.append(el);
  });
  renderPreview(c, ui);
}

/** Touch devices: an unobstructed, full-size copy of the selected card above the hand. */
export function renderPreview(c, ui) {
  const box = $('card-preview');
  const card = c.piles.hand.find((x) => x.uid === ui.selected);
  if (!card) {
    box.hidden = true;
    return;
  }
  const check = playability(c, card);
  clear(box).append(
    cardView(card.key, { c, cost: check.cost, affordable: check.ok || check.reason !== 'Not enough Energy', warning: check.warning }),
    h('p', { class: 'preview-hint' }, check.ok ? 'Tap again to play' : check.reason),
  );
  box.hidden = false;
}
