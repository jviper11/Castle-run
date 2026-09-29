import { $, h, clear } from './dom.js';
import { cardView } from './cardView.js';
import { STATUSES } from '../engine/statuses.js';
import { AFFINITIES, canReroll, rerollsAvailable, dieText, affinityLine } from '../engine/dice.js';
import { previewIntent, describeAbilities, DEFEND_BLOCK } from '../engine/enemies.js';
import { playability } from '../engine/combat.js';
import { currentPath } from '../engine/run.js';
import { FLOOR_NAMES } from '../content/enemies.js';
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
  $('hud-progress').textContent = `Floor ${run.floor + 1} · ${FLOOR_NAMES[run.floor + 1]} · ${where}`;
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

/**
 * An intent is a list of actions (engine/enemies.js), so this renders one chip per action, in the
 * order they will resolve. Every number comes from the plan, which is the same plan the engine
 * executes — so the widget cannot show a number the fight does not deal.
 */
export function renderIntent(c) {
  const el = $('enemy-intent');
  el.replaceChildren();
  if (c.phase === 'won' || c.phase === 'lost') {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const plan = previewIntent(c);
  const tips = [];
  el.className = 'intent' + (plan.phased ? ' intent-phased' : '');
  if (plan.phased) {
    el.append(h('span', { class: 'intent-part intent-ghost' }, '👻'));
    tips.push('Phased: nothing you do this turn can damage it.');
  }
  for (const a of plan.actions) el.append(...intentPart(c, a, tips));
  el.dataset.tipTitle = plan.phased ? 'Untouchable this turn' : 'What it will do next';
  el.dataset.tip = tips.join('\n');
}

function intentPart(c, a, tips) {
  const part = (cls, ...kids) => [h('span', { class: `intent-part ${cls}` }, ...kids)];
  if (a.kind === 'attack') {
    const changed = a.firstHit !== a.base;
    const out = [h('span', { class: 'intent-icon' }, '⚔️'), h('b', {}, a.firstHit)];
    if (a.hits > 1) out.push(`×${a.hits}`);
    if (changed) out.push(h('s', {}, a.base));
    tips.push(`Attacks for ${a.landed.join(' + ')} before your Block.` +
      (changed ? ` Base ${a.base}, changed by statuses${a.firstHit !== a.perHit ? ' and Fly' : ''}.` : ''));
    if (a.doubled) tips.push('Holy Wrath: doubled while you hold that much Block.');
    if (a.strip) tips.push(`${a.strip.label}: strips ${a.strip.taken} of your Block as it hits.`);
    if (a.onHit) tips.push(`Each hit applies ${a.onHit.stacks} ${STATUSES[a.onHit.status].name}.`);
    if (a.collapse) tips.push(`Collapse: ${a.collapse} more, ignoring Block.`);
    return part('intent-attack', ...out);
  }
  if (a.kind === 'defend') {
    tips.push(`Gains ${a.block} Block.`);
    return part('intent-defend', h('span', { class: 'intent-icon' }, '🛡'), h('b', {}, a.block));
  }
  if (a.kind === 'aim') {
    tips.push(`Does nothing this turn. Its next attack deals ${c.enemy.pattern.multiplier}× damage.`);
    return part('intent-aim', h('span', { class: 'intent-icon' }, '🎯'), h('b', {}, 'Aiming'));
  }
  if (a.kind === 'buff') {
    tips.push(a.blocked ? 'It cannot be buffed.' : `Gains ${a.n} ${STATUSES[a.status].name} first.`);
    return part('intent-buff', h('span', { class: 'intent-icon' }, STATUSES[a.status].emoji), h('b', {}, `+${a.n}`));
  }
  if (a.kind === 'burst') {
    tips.push(`${a.label}: ${a.landed[0]} extra damage.`);
    return part('intent-burst', h('span', { class: 'intent-icon' }, '💥'), h('b', {}, a.landed[0]));
  }
  if (a.kind === 'mirror') {
    const bits = [`Spell Steal: it casts your ${a.name} back at you.`];
    if (a.damage) bits.push(`${a.landed[0]} damage to you.`);
    if (a.block) bits.push(`${a.block} Block for it.`);
    if (a.heal) bits.push(`Heals ${a.heal}.`);
    for (const st of a.statuses) bits.push(`${st.n} ${STATUSES[st.id].name} on ${st.side === 'player' ? 'you' : 'it'}.`);
    tips.push(bits.join(' '));
    return part('intent-mirror', h('span', { class: 'intent-icon' }, '🌀'),
      h('b', {}, a.damage ? a.landed[0] : a.name));
  }
  return [];
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
  // The die's own name and rules: with d4–d20 equippable, "d6, High" is not a safe assumption.
  aff.dataset.tipTitle = `${c.dieType.emoji} ${c.dieType.name} (${c.dieType.id})`;
  aff.dataset.tip = [
    dieText(c.dieType.id),
    affinityLine(hero.affinity, c.die.sides),
    'Cards with a matching affinity line gain their bonus while the die shows an affinity roll.',
  ].join('\n');
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
