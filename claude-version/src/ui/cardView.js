import { h } from './dom.js';
import { getCard, describeCard } from '../engine/cards.js';

const TYPE_LABEL = { attack: 'Attack', skill: 'Skill', power: 'Power' };

/**
 * Builds a card element. Every number comes from describeCard(), which reads the same params
 * the effect resolves with. Pass `c` for live values: modified damage, and which affinity and
 * condition clauses are active right now.
 *
 * opts: { c, cost, affordable, warning, rarity, uid }
 */
export function cardView(key, opts = {}) {
  const def = getCard(key);
  const { c = null, cost = def.cost, affordable = true, warning = null, rarity = null, uid = null } = opts;
  const lines = describeCard(def, c);
  const affinityLine = lines.find((l) => l.kind === 'affinity');

  const classes = ['card', `card-${def.type}`];
  if (def.upgraded) classes.push('upgraded');
  if (c && affinityLine?.active) classes.push('affinity-on');
  if (!affordable) classes.push('unaffordable');
  if (warning) classes.push('gated');
  if (rarity) classes.push(`rarity-${rarity}`);

  const typeLabel = TYPE_LABEL[def.type] + (def.exhausts ? ' · Exhaust' : '') + (rarity && rarity !== 'starter' ? ` · ${cap(rarity)}` : '');

  return h('div', { class: classes.join(' '), dataset: uid != null ? { uid } : {}, 'aria-label': def.name },
    h('div', { class: 'card-cost' + (cost > def.cost ? ' cost-up' : cost < def.cost ? ' cost-down' : '') }, cost),
    h('div', { class: 'card-name' }, def.name),
    h('div', { class: 'card-art' }, def.emoji),
    h('div', { class: 'card-type' }, typeLabel),
    h('div', { class: 'card-text' }, lines.map((line) => lineView(line, c))),
    warning && h('div', { class: 'card-warning' }, warning),
  );
}

function lineView(line, c) {
  const cls = ['line', `line-${line.kind}`];
  // Outside combat there is no die or HP condition to test, so clauses render neutral.
  if (line.kind !== 'base' && c) cls.push(line.active ? 'active' : 'inactive');
  return h('p', { class: cls.join(' ') },
    line.kind === 'affinity' && h('span', { class: 'aff-label' }, line.label),
    line.parts.map((part) => (typeof part === 'string' ? part : numberView(part))),
  );
}

function numberView({ value, base, formula }) {
  // A formula prints in words, with its current value in combat: "your Gold ÷ 10 (max 15) (12)".
  if (formula) return h('span', { class: 'formula' }, base, value != null && h('b', { class: 'num' }, ` (${value})`));
  const cls = value > base ? 'num num-up' : value < base ? 'num num-down' : 'num';
  return h('span', { class: cls, title: value !== base ? `Base ${base}` : null }, value);
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
