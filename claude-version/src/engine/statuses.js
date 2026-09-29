import { emit } from './log.js';

// Status registry. `unit.statuses` is a plain { id: stacks } map, so there are no emoji-string
// lookups anywhere. When a status ticks is not stored here: it is a fixed step in
// combat.endTurn(), numbered to match GDD §4. `tick` describes that step for tooltips; it is
// either one string or { player, enemy } when the step differs by side.
//
// Stacking (`stack`):
//   'add' (default) — a new application adds its stacks
//   'max' / 'min'   — the stronger single value wins (House Edge floor, Fallacy threshold)
//
// Power statuses store their magnitude as stacks (Blood Lord: HP healed per Attack), so a second
// copy adds to it. Stacks never mean "upgraded" — see COMPARISON.md A3. The rare Power whose
// upgrade adds a different effect keeps it in `unit.statusData[id]`. By default its numeric
// fields add across copies; a status can define `mergeData(old, new)` instead.
//
// Behaviour for Powers lives in engine/powers.js; numeric modifiers (Cold Mastery, Burning Soul,
// Poison Master) are read where the number is computed.

export const STATUSES = {
  // ── Common statuses ──
  rage: {
    name: 'Strength', emoji: '💢', kind: 'buff',
    tick: 'Lasts the whole combat.',
    desc: (n) => `Attacks deal +${n} damage.`,
  },
  weak: {
    name: 'Weak', emoji: '😵', kind: 'debuff',
    tick: { player: 'Ticks down at the end of your turn.', enemy: 'Ticks down after its next action.' },
    desc: (n) => `Attacks deal 25% less damage. ${turns(n)}.`,
  },
  vulnerable: {
    name: 'Vulnerable', emoji: '🫗', kind: 'debuff',
    tick: { player: 'Ticks down after the enemy acts.', enemy: 'Ticks down at the end of your turn.' },
    desc: (n) => `Takes 50% more attack damage. ${turns(n)}.`,
  },
  burn: {
    name: 'Burn', emoji: '🔥', kind: 'debuff',
    tick: 'Ticks at the end of your turn, before the enemy acts.',
    desc: (n) => `Takes ${n} damage before acting, ignoring Block. Then loses 1 stack.`,
  },
  poison: {
    name: 'Poison', emoji: '☠️', kind: 'debuff',
    tick: 'Ticks after the enemy acts.', // the same on both sides, now that you can carry it too
    desc: (n) => `Takes ${n} damage after acting, ignoring Block. Then loses 1 stack.`,
  },
  chill: {
    name: 'Chill', emoji: '❄️', kind: 'debuff',
    tick: 'Not used up on turns it defends.',
    desc: (n) => `Attacks deal 25% less damage. Loses 1 stack each time it attacks (${n} left).`,
  },
  regen: {
    name: 'Regen', emoji: '💚', kind: 'buff', cap: 10,
    tick: 'Ticks at the end of your turn, before the enemy acts.',
    desc: (n) => `Heals ${n} HP at the end of your turn, then loses 1 stack. Max 10.`,
  },
  fly: {
    name: 'Fly', emoji: '🦇', kind: 'buff', stack: 'max',
    tick: 'Used up by the next hit, or at the end of the enemy turn.',
    desc: () => 'The next hit you take is halved.',
  },

  // ── Powers ──
  berserkOath: {
    name: "Berserker's Oath", emoji: '🔥', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n) => `Each time you lose HP, gain ${n} Block.`,
  },
  lethalRhythm: {
    name: 'Lethal Rhythm', emoji: '🥁', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n) => `Every 2nd card you play each turn deals ${n} damage to the enemy, ignoring Block.`,
  },
  poisonMaster: {
    name: 'Poison Master', emoji: '☠️', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n) => `Poison deals +${n} damage per stack.`,
  },
  shadowArtist: {
    name: 'Shadow Artist', emoji: '🎭', kind: 'power', stack: 'max', tick: 'Lasts the whole combat.',
    desc: () => 'The 2nd and 4th card you play each turn cost 0.',
  },
  shadowArtistPlus: {
    name: 'Shadow Artist+', emoji: '🎭', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n) => `The first 3 cards you play each turn cost ${n} less.`,
  },
  bloodLord: {
    name: 'Blood Lord', emoji: '👑', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n) => `Heal ${n} HP after each Attack you play.`,
  },
  eternalHunger: {
    // Stacks count copies. data.flat: damage per Regen tick (base card). data.perStack: damage per
    // Regen stack (upgrade), limited to data.cap per turn. Copies add; the lowest cap wins.
    name: 'Eternal Hunger', emoji: '🦷', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n, d) => 'When Regen heals you, deal ' + [
      d.flat ? `${d.flat} damage` : '',
      d.perStack ? `${d.perStack} damage per Regen stack${d.cap ? ` (max ${d.cap} per turn)` : ''}` : '',
    ].filter(Boolean).join(' plus ') + ' to the enemy.',
    mergeData: (a, b) => ({
      flat: (a.flat || 0) + (b.flat || 0),
      perStack: (a.perStack || 0) + (b.perStack || 0),
      cap: a.cap && b.cap ? Math.min(a.cap, b.cap) : a.cap || b.cap || 0,
    }),
  },
  vampiricForm: {
    name: 'Vampiric Form', emoji: '🧛', kind: 'power', stack: 'max', tick: 'Lasts the whole combat.',
    desc: (n, d) => `When the die lands on 1 or its max, gain Fly if you have none` +
      (d.regen ? ` and ${d.regen} Regen.` : '.'),
  },
  momentum: {
    name: 'Arcane Momentum', emoji: '✨', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n) => `Each Skill or Power you play adds ${n} to the die (max +3 per turn, up to its max face).`,
  },
  coldMastery: {
    name: 'Cold Mastery', emoji: '❄️', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n) => `Chill reduces enemy attacks by ${chillReductionPct(n)}% instead of 25%.`,
  },
  burningSoul: {
    name: 'Burning Soul', emoji: '🔥', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n) => `Burn deals +${n} damage per stack.`,
  },
  houseEdge: {
    name: 'House Edge', emoji: '🏠', kind: 'power', stack: 'max', tick: 'Lasts the whole combat.',
    desc: (n) => `Your die never rolls below ${n}.`,
  },
  luckyStreak: {
    name: 'Lucky Streak', emoji: '⭐', kind: 'power', tick: 'Lasts the whole combat.',
    desc: (n) => `Whenever the die rolls its max, draw 1 card and deal ${n} damage, ignoring Block.`,
  },
  gamblerFallacy: {
    name: "Gambler's Fallacy", emoji: '🎯', kind: 'power', stack: 'min', tick: 'Lasts the whole combat.',
    desc: (n) => `After ${n} rolls in a row that are not max, the next roll is max.`,
  },
};

/** Chill's damage reduction in percent, given Cold Mastery stacks. Base 25%, capped at 50%. */
export function chillReductionPct(coldMastery) {
  return Math.min(50, 25 + coldMastery);
}

function turns(n) {
  return n === 1 ? '1 turn left' : `${n} turns left`;
}

export function stacks(unit, id) {
  return unit.statuses[id] || 0;
}

export function statusData(unit, id) {
  return unit.statusData?.[id] || {};
}

/**
 * Applies `n` stacks. `data` holds extra numeric fields for Powers whose upgrade adds a
 * different effect; those fields add across copies.
 */
export function addStatus(c, side, id, n, data = null) {
  if (!n) return;
  const def = STATUSES[id];
  if (!def) throw new Error(`Unknown status: ${id}`);
  const unit = c[side];
  // King's Champion's Unbreakable. Nothing lands at all, and the card that tried says so — the
  // reference wiped statuses at its turn start instead, leaving them working for a full turn.
  if (unit.statusImmune) {
    emit(c, 'immune', { side, id });
    return;
  }
  const before = stacks(unit, id);
  let after;
  if (!before || !def.stack || def.stack === 'add') after = before + n;
  else after = def.stack === 'max' ? Math.max(before, n) : Math.min(before, n);
  if (def.cap) after = Math.min(def.cap, after);
  if (data) {
    unit.statusData ??= {};
    const old = unit.statusData[id];
    let merged;
    if (!old) merged = { ...data };
    else if (def.mergeData) merged = def.mergeData(old, data);
    else {
      merged = { ...old };
      for (const [k, v] of Object.entries(data)) merged[k] = (merged[k] || 0) + v;
    }
    unit.statusData[id] = merged;
  }
  if (after === before && !data) return;
  unit.statuses[id] = after;
  emit(c, 'status', { side, id, stacks: after, delta: after - before });
}

/** Removes one stack (or `n`), deleting the entry at zero. */
export function reduceStatus(c, side, id, n = 1) {
  const unit = c[side];
  const before = stacks(unit, id);
  if (!before) return;
  const after = Math.max(0, before - n);
  if (after) unit.statuses[id] = after;
  else {
    delete unit.statuses[id];
    if (unit.statusData) delete unit.statusData[id];
  }
  emit(c, 'status', { side, id, stacks: after, delta: after - before });
}

export function clearStatus(c, side, id) {
  reduceStatus(c, side, id, stacks(c[side], id));
}

/** Sets stacks to an exact value (Death Mark, Blood Tide). */
export function setStatus(c, side, id, value) {
  const def = STATUSES[id];
  if (def.cap) value = Math.min(def.cap, value);
  const before = stacks(c[side], id);
  if (value <= 0) return clearStatus(c, side, id);
  if (value === before) return;
  c[side].statuses[id] = value;
  emit(c, 'status', { side, id, stacks: value, delta: value - before });
}
