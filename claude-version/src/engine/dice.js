import { emit } from './log.js';
import { int } from './rng.js';
import { stacks } from './statuses.js';
import { rollHooks } from './powers.js';

// One active die per turn (GDD §4). `c.die` holds all die state for the current combat:
//   sides        — faces on the active die (d6 by default)
//   value        — the current result; every card played this turn reads it
//   rerollsLeft  — refilled at the start of each player turn
//   minRoll      — floor on rolls (Gambler: 2); House Edge can raise it
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

export const AFFINITIES = {
  even:    { label: 'Even',    test: (r) => r % 2 === 0 },
  odd:     { label: 'Odd',     test: (r) => r % 2 !== 0 },
  high:    { label: 'High',    test: (r) => r >= 6 },
  extreme: { label: 'Extreme', test: (r, sides) => r === 1 || r === sides },
  max:     { label: 'Max',     test: (r, sides) => r === sides },
};

export function createDie({ sides = 6, minRoll = 1 } = {}) {
  return { sides, value: null, rerollsLeft: 0, minRoll, forcedMax: 0, fallacyCount: 0 };
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
