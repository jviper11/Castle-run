import { emit } from './log.js';
import { int } from './rng.js';
import { stacks } from './statuses.js';
import { rollHooks } from './powers.js';
import { DICE, STARTING_DIE, DIE_MIN_FLOOR } from '../content/dice.js';

// One active die per turn (GDD §4). `c.die` holds all die state for the current combat:
//   sides        — faces on the active die (from the equipped die type; d6 by default)
//   value        — the current result; every card played this turn reads it
//   rerollsLeft  — refilled at the start of each player turn
//   minRoll      — floor on rolls: the highest of the hero's own floor (Gambler: 2) and the
//                  equipped die's (Cursed Die: 3). House Edge raises it further, per roll.
//   forcedMax    — charges: the next N rolls are max (Loaded House). Combat-scoped.
//   fallacyCount — non-max rolls in a row, for Gambler's Fallacy. Combat-scoped.
//   suppressed   — Gambler's Edge downside: the value came from a natural roll of the hero's
//                  affinity maximum, so it does not count as meeting the affinity. Any card or
//                  forced change clears it (forced values are exempt).
//
// Per turn (c.turnState): `dieSet` — the die may be set to a chosen value once per turn (GDD
// §11). Loaded Die, Safe Pull and Void Channel share that limit.
//
// Every change to the value is clamped to 1…sides, so "max" checks stay meaningful.

// `rule` states, for the die actually equipped, which faces meet the affinity. It exists so a
// bigger die cannot leave the UI describing a d6: High is 6+ on every die (GDD §3), which is 1 of
// 6 faces on a d6 but 15 of 20 on a d20, and Max and Extreme move with the die's top face.
export const AFFINITIES = {
  even:    { label: 'Even',    test: (r) => r % 2 === 0,               rule: () => 'an even roll' },
  odd:     { label: 'Odd',     test: (r) => r % 2 !== 0,               rule: () => 'an odd roll' },
  high:    { label: 'High',    test: (r) => r >= 6,                    rule: () => '6 or more' },
  extreme: { label: 'Extreme', test: (r, s) => r === 1 || r === s,     rule: (s) => `1 or ${s}` },
  max:     { label: 'Max',     test: (r, s) => r === s,                rule: (s) => `${s}` },
};

/** How many of the die's faces meet an affinity. Used to describe a die honestly (decision D8). */
export function affinityFaces(affinity, sides) {
  let n = 0;
  for (let v = 1; v <= sides; v++) if (AFFINITIES[affinity].test(v, sides)) n += 1;
  return n;
}

/**
 * The affinity rule stated against the die actually equipped. Bigger dice change it a lot — High
 * is 1 face of 6 on a d6 and 15 of 20 on a d20 — so the count is spelled out rather than left to
 * the player to work out. This is the honest-text half of decision D8.
 */
export function affinityLine(affinity, sides) {
  const a = AFFINITIES[affinity];
  return `${a.label} affinity: ${a.rule(sides)} — ${affinityFaces(affinity, sides)} of ${sides} faces.`;
}

// ── Die types ──

/** The equipped die's definition. Falls back to the starting die for an unknown id. */
export const dieType = (id) => DICE[id] || DICE[STARTING_DIE];

/** A die's description, with its own numbers filled in, so text and effect cannot disagree. */
export function dieText(id) {
  const d = dieType(id);
  return d.text.replace(/\{(\w+)\}/g, (_, k) => d.params[k]);
}

/**
 * The dice a die cache or a shop may offer right now: never the d6 you start with, never the one
 * already equipped, and only once the floor gate is reached (reference showDieReward()). Ordered,
 * not shuffled — every caller picks from it with the run's own RNG.
 */
export function offerableDice(run) {
  return Object.keys(DIE_MIN_FLOOR).filter((id) => id !== run.die && run.floor >= DIE_MIN_FLOOR[id]);
}

/**
 * Die state for one combat. The roll floor is the highest of the hero's and the die's own, which
 * is how the Cursed Die's "below 3 becomes 3" is implemented — as a floor, not a separate branch.
 */
export function createDie({ sides = 6, minRoll = 1 } = {}) {
  return { sides, value: null, rerollsLeft: 0, minRoll, forcedMax: 0, fallacyCount: 0 };
}

/** Builds the die a fight starts with, from the equipped type and the hero's own floor. */
export function createDieFor(dieId, hero) {
  const def = dieType(dieId);
  return createDie({ sides: def.sides, minRoll: Math.max(hero.minRoll || 1, def.params.minRoll || 1) });
}

/** `value` defaults to the current die; pass one to test a value the card will see (Momentum). */
export function affinityMet(c, affinity, value = c.die.value) {
  if (!affinity || value == null) return false;
  if (c.die.suppressed && value === c.die.value) return false;
  return AFFINITIES[affinity].test(value, c.die.sides);
}

/** The highest face that meets the hero's own affinity (Odd on a d6: 5). */
export function affinityMaxFace(c) {
  for (let v = c.die.sides; v >= 1; v--) if (AFFINITIES[c.hero.affinity].test(v, c.die.sides)) return v;
  return null;
}

export const isMax = (c) => c.die.value === c.die.sides;
const clamp = (c, v) => Math.max(1, Math.min(c.die.sides, v));

/** Rolls the active die. `reason` is 'turn', 'reroll' or 'card'. */
export function rollDie(c, reason) {
  const d = c.die;
  const natural = int(c.run.rng, d.sides) + 1;
  let value = natural;
  if (d.forcedMax > 0) {
    value = d.sides;
    d.forcedMax -= 1;
  }
  value = Math.max(value, d.minRoll, stacks(c.player, 'houseEdge'));
  const fallacy = stacks(c.player, 'gamblerFallacy');
  if (value === d.sides) {
    d.fallacyCount = 0;
  } else if (fallacy) {
    d.fallacyCount += 1;
    if (d.fallacyCount >= fallacy) {
      value = d.sides;
      d.fallacyCount = 0;
    }
  }
  d.value = clamp(c, value);
  d.suppressed = !!c.run.soul?.gamblersEdge && d.value === natural && d.value === affinityMaxFace(c);
  emit(c, 'roll', { value: d.value, sides: d.sides, reason, suppressed: d.suppressed });
  afterDieLands(c);
  return d.value;
}

/** Hooks that react to the die landing on a new value by a roll. */
function afterDieLands(c) {
  if (isMax(c) && !c.die.suppressed && c.hero.maxRollReroll && !c.turnState.maxRollRerollUsed) {
    // Gambler passive (decision D5): once per turn, a max roll grants a bonus reroll.
    c.turnState.maxRollRerollUsed = true;
    c.die.rerollsLeft += 1;
    emit(c, 'message', { text: 'Max roll! Bonus reroll.' });
  }
  rollHooks(c);
}

/** Changes the die by a card effect that is not a roll: add, multiply or set. */
export function changeDie(c, value, how) {
  const before = c.die.value;
  c.die.value = clamp(c, value);
  c.die.suppressed = false;
  emit(c, 'roll', { value: c.die.value, sides: c.die.sides, reason: 'card', how, from: before });
}

/** Sets the die to a chosen value. Once per turn; returns false if already used. */
export function setDie(c, value) {
  if (c.turnState.dieSet) return false;
  c.turnState.dieSet = true;
  changeDie(c, value, 'set');
  return true;
}

/** Rerolls available now: this turn's, plus Steady Hand's per-combat charge. */
export const rerollsAvailable = (c) => c.die.rerollsLeft + (c.bonusRerolls || 0);

export function canReroll(c) {
  return c.phase === 'player' && !c.pending && rerollsAvailable(c) > 0;
}

export function reroll(c) {
  if (!canReroll(c)) return false;
  if (c.die.rerollsLeft > 0) c.die.rerollsLeft -= 1;
  else c.bonusRerolls -= 1;
  rollDie(c, 'reroll');
  return true;
}
