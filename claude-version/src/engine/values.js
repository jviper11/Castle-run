import { stacks, STATUSES } from './statuses.js';

// Derived values. A card param is either a number or a formula over one named source:
//
//   { of: 'die', per: 2 }                          → 2× your roll
//   { of: 'gold', div: 10, max: 15 }               → your Gold ÷ 10 (max 15)
//   { flat: 3, of: 'enemy.burn' }                  → 3 + 1 per Burn stack on the enemy
//
//   value = clamp(flat + floor(source × per ÷ div), min, max)
//
// Formulas are evaluated when their op runs, so `damageDealt` can read the damage the card's
// own earlier hits did. Card text renders the formula in words, plus the current value in combat.

const SOURCES = {
  die: { name: 'your roll', read: (c) => c.die.value ?? 0 },
  dieMax: { name: "the die's max", read: (c) => c.die.sides },
  gold: { name: 'your Gold', read: (c) => c.run.gold },
  spellsThisTurn: { unit: 'Skill or Power played this turn', read: (c) => c.turnState.spells },
  damageDealt: { name: 'the HP damage dealt', read: (c, ctx) => ctx?.damageDealt ?? null },
};

function source(of) {
  if (SOURCES[of]) return SOURCES[of];
  const [side, id] = of.split('.');
  if ((side !== 'enemy' && side !== 'player') || !STATUSES[id]) throw new Error(`Unknown value source: ${of}`);
  return {
    unit: `${STATUSES[id].name} stack${side === 'enemy' ? ' on the enemy' : ''}`,
    read: (c) => stacks(c[side], id),
  };
}

export const isFormula = (v) => typeof v === 'object' && v !== null;

/** The number a param resolves to, or null if its source is not available yet. */
export function evaluate(v, c, ctx = null) {
  if (!isFormula(v)) return v;
  if (!c) return null;
  const raw = source(v.of).read(c, ctx);
  if (raw == null) return null;
  let n = (v.flat ?? 0) + Math.floor((raw * (v.per ?? 1)) / (v.div ?? 1));
  if (v.max != null) n = Math.min(v.max, n);
  if (v.min != null) n = Math.max(v.min, n);
  return n;
}

/** The formula in words: "2× your roll", "3 + 1 per Burn stack on the enemy". */
export function formulaText(v) {
  const s = source(v.of);
  const per = v.per ?? 1;
  let term;
  if (s.unit) {
    term = `${per} per ${s.unit}`;
    if (v.flat) term = `${v.flat} + ${term}`;
  } else {
    term = per === 1 ? s.name : `${per}× ${s.name}`;
    if (v.div) term += ` ÷ ${v.div}`;
    if (v.flat) term = `${v.flat} + ${term}`;
  }
  if (v.max != null) term += ` (max ${v.max})`;
  if (v.min != null) term += ` (min ${v.min})`;
  return term;
}

/** Every source name, for the content lint. */
export function validateFormula(v) {
  source(v.of);
}
