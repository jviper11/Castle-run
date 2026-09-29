import { CARDS } from '../content/cards.js';
import { affinityMet, AFFINITIES } from './dice.js';
import { playerAttackDamage } from './damage.js';
import { stacks } from './statuses.js';
import { conditionMet, conditionText } from './conditions.js';
import { evaluate, formulaText, isFormula } from './values.js';

// Card definitions, parameter resolution and generated text. The card schema is documented at
// the top of content/cards.js; the ops themselves live in engine/ops.js.

// ── Definitions ──

const cache = new Map();

export const baseKey = (key) => key.replace(/\+$/, '');
export const isUpgraded = (key) => key.endsWith('+');

/** Resolves a card key (`strike` or `strike+`) to its full definition. */
export function getCard(key) {
  if (cache.has(key)) return cache.get(key);
  const base = CARDS[baseKey(key)];
  if (!base) throw new Error(`Unknown card: ${key}`);
  const def = isUpgraded(key) ? applyUpgrade(base) : { ...base };
  def.key = key;
  def.upgraded = isUpgraded(key);
  def.exhausts = def.type === 'power' || !!def.exhaust;
  def.damageParams = new Set(allOps(def.ops).filter((o) => o.op === 'damage').map((o) => o.amount));
  cache.set(key, Object.freeze(def));
  return def;
}

function applyUpgrade(base) {
  const u = base.upgrade || {};
  return {
    ...base,
    name: base.name + '+',
    cost: u.cost ?? base.cost,
    ops: u.ops ?? base.ops,
    exhaust: u.exhaust ?? base.exhaust,
    gate: u.gate ?? base.gate,
    text: u.text ?? base.text,
    affinityText: u.affinityText ?? base.affinityText,
    // An upgrade that is a different effect (its own ops) brings its complete param set.
    params: u.ops ? { ...u.params } : { ...base.params, ...u.params },
    onAffinity: { ...base.onAffinity, ...u.onAffinity },
    when: base.when?.map((w, i) => ({
      ...w,
      text: u.when?.[i]?.text ?? w.text,
      params: { ...w.params, ...u.when?.[i]?.params },
      onAffinity: { ...w.onAffinity, ...u.when?.[i]?.onAffinity },
    })),
  };
}

/** Every op in a list, including those nested in `chance`. */
export function allOps(ops) {
  return ops.flatMap((o) => [o, ...allOps(o.win || []), ...allOps(o.lose || [])]);
}

// ── Gates ──

/** For a card with a `gate`: null if it would resolve now, otherwise the reason. */
export function gateReason(c, def) {
  if (!def.gate || conditionMet(c, def.gate)) return null;
  return `Only works if ${conditionText(def.gate)}`;
}

// ── Params ──

/**
 * The die value this card will see. Arcane Momentum raises the die as a Skill or Power is
 * played, before it resolves (reference order), so those cards preview the raised value.
 */
export function dieForCard(c, def) {
  const m = stacks(c.player, 'momentum');
  if (!m || (def.type !== 'skill' && def.type !== 'power') || c.die.value == null) return c.die.value;
  const bump = Math.min(m, 3 - c.turnState.momentumUsed);
  return Math.min(c.die.sides, c.die.value + Math.max(0, bump));
}

/**
 * The param set the card would resolve with right now. `c` may be null when there is no
 * combat, e.g. on the reward screen; then nothing conditional is active. Formula params stay
 * formulas here; they are evaluated when their op runs (engine/ops.js).
 */
export function resolveParams(c, def) {
  const aff = !!c && !!def.affinity && affinityMet(c, def.affinity, dieForCard(c, def));
  const whenActive = (def.when || []).map((w) => !!c && conditionMet(c, w.if));
  const p = { ...def.params };
  def.when?.forEach((w, i) => whenActive[i] && Object.assign(p, w.params));
  if (aff) {
    Object.assign(p, def.onAffinity);
    def.when?.forEach((w, i) => whenActive[i] && Object.assign(p, w.onAffinity));
  }
  return { params: p, affinity: aff, whenActive };
}

// ── Text ──

/**
 * Card text as structured lines, so the UI can highlight live values and active clauses.
 * Each line is { kind: 'base'|'when'|'affinity', label?, active, parts }. A part is either a
 * string or a token { value, base, param, isDamage, formula }. `base` is the printed number
 * (or, for a formula, its words); `value` is the live number in combat, or null.
 */
export function describeCard(def, c = null) {
  const resolved = resolveParams(c, def);
  const lines = [{ kind: 'base', active: true, parts: render(def, def.text, def.params, c) }];

  def.when?.forEach((w, i) => {
    const scope = { ...def.params, ...w.params };
    const affScope = { ...scope, ...def.onAffinity, ...w.onAffinity };
    lines.push({ kind: 'when', active: resolved.whenActive[i], parts: render(def, w.text, scope, c, affScope) });
  });

  if (def.affinityText) {
    const scope = { ...def.params };
    def.when?.forEach((w, i) => resolved.whenActive[i] && Object.assign(scope, w.params));
    Object.assign(scope, def.onAffinity);
    def.when?.forEach((w, i) => resolved.whenActive[i] && Object.assign(scope, w.onAffinity));
    lines.push({
      kind: 'affinity',
      label: AFFINITIES[def.affinity].label,
      active: resolved.affinity,
      parts: render(def, def.affinityText, scope, c),
    });
  }
  return lines;
}

/** Plain-text version, e.g. for the card catalogue and tests. */
export function cardTextPlain(def) {
  return describeCard(def)
    .map((l) => (l.kind === 'affinity' ? `${l.label}: ` : '') + l.parts.map((x) => (typeof x === 'string' ? x : x.base)).join(''))
    .join(' ');
}

const TOKEN = /\{(aff\.)?(\w+)(?:\|(\w+))?\}/g;

function render(def, template, scope, c, affScope = scope) {
  const parts = [];
  let last = 0;
  for (const m of template.matchAll(TOKEN)) {
    parts.push(template.slice(last, m.index));
    const [, aff, param, noun] = m;
    const source = aff ? affScope : scope;
    if (!(param in source)) throw new Error(`Card ${def.key}: text references unknown param "${param}"`);
    const raw = source[param];
    const isDamage = def.damageParams.has(param);
    const formula = isFormula(raw);
    let value = formula ? evaluate(raw, c) : raw;
    if (isDamage && c && value != null) value = playerAttackDamage(c, value);
    parts.push({ value: c || !formula ? value : null, base: formula ? formulaText(raw) : raw, param, isDamage, formula });
    if (noun) parts.push(' ' + noun + (!formula && raw === 1 ? '' : 's'));
    last = m.index + m[0].length;
  }
  parts.push(template.slice(last));
  return parts.filter((x) => x !== '');
}

/** Every param name a template references. Used by the content lint. */
export function templateParams(template) {
  return [...template.matchAll(TOKEN)].map((m) => m[2]);
}
