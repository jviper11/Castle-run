import { ENEMIES } from '../content/enemies.js';
import { emit } from './log.js';
import { chance } from './rng.js';
import { enemyAttackDamage, incomingToPlayer, predictEnemyHit, hitPlayer, gainBlock, heal } from './damage.js';
import { addStatus, reduceStatus, stacks } from './statuses.js';

// Enemy behaviour.
//
// Intent is the move. At the end of each enemy turn, `planIntent` builds a concrete intent
// object for the next turn. The UI displays it and `resolveIntent` executes that same object.
// Nothing between planning and resolution may swap it for a different move.

export const DEFEND_BLOCK = 8;
const ATTACK_CHANCE = 0.65;

const attack = (base, hits = 1) => ({ kind: 'attack', base, hits });

// Intent patterns. `plan` receives the number of the enemy turn being planned (1-based).
export const PATTERNS = {
  standard: {
    // Reference behaviour: the first move is always an attack, then 65% attack / 35% defend.
    plan: (c, e, turn) =>
      turn === 1 || chance(c.run.rng, ATTACK_CHANCE) ? attack(e.damage) : { kind: 'defend', block: DEFEND_BLOCK },
  },
  aim: {
    name: 'Aim',
    text: (p) => `Spends a turn aiming, then attacks for ${p.multiplier}× damage. Repeats.`,
    plan: (c, e, turn, p) => (turn % 2 === 1 ? { kind: 'aim' } : attack(e.damage * p.multiplier)),
  },
};

// Abilities. Triggers:
//   turnStart   — enemy turn, before it acts (endTurn step 5)
//   afterAttack — after an attack resolves (step 9)
//   hp          — after the enemy takes card damage while still alive, and again at step 9.
//                 A lethal Burn/Poison tick ends combat before step 9, so it skips these (GDD §4).
// `resetsBlock` zeroes the enemy's Block at the start of its turn, as the reference does for
// these abilities. See COMPARISON.md.
export const ABILITIES = {
  shieldUp: {
    name: 'Shield Up', trigger: 'turnStart', resetsBlock: true,
    text: (p) => `Its Block resets each turn. Every ${every(p.every)} turn it gains ${p.block} Block.`,
    run: (c, p, turn) => {
      if (turn % p.every === 0) gainBlock(c, 'enemy', p.block, 'ability');
      return turn % p.every === 0;
    },
  },
  ironStance: {
    name: 'Iron Stance', trigger: 'turnStart', resetsBlock: true,
    text: (p) => `Its Block resets to ${p.block} at the start of each of its turns.`,
    run: (c, p) => {
      gainBlock(c, 'enemy', p.block, 'ability');
      return true;
    },
  },
  swarm: {
    name: 'Swarm', trigger: 'turnStart',
    text: (p) => `On its ${ordinal(p.onTurn)} turn, heals ${p.heal} HP.`,
    run: (c, p, turn) => {
      if (turn !== p.onTurn) return false;
      heal(c, 'enemy', p.heal, 'ability');
      return true;
    },
  },
  lockdown: {
    name: 'Lockdown', trigger: 'turnStart',
    text: (p) => `Every ${every(p.every)} turn, applies ${p.weak} Weak to you.`,
    run: (c, p, turn) => {
      if (turn % p.every !== 0) return false;
      addStatus(c, 'player', 'weak', p.weak);
      return true;
    },
  },
  rabid: {
    name: 'Rabid', trigger: 'afterAttack',
    text: (p) => `Each attack applies ${p.vulnerable} Vulnerable to you.`,
    run: (c, p) => {
      addStatus(c, 'player', 'vulnerable', p.vulnerable);
      return true;
    },
  },
  reassemble: {
    name: 'Reassemble', trigger: 'hp',
    text: (p) => `Once, when first below ${p.below} HP, heals ${p.heal} HP.`,
    run: (c, p) => {
      const e = c.enemy;
      if (e.flags.reassembled || e.hp <= 0 || e.hp >= p.below) return false;
      e.flags.reassembled = true;
      heal(c, 'enemy', p.heal, 'ability');
      return true;
    },
  },
};

function every(n) {
  return n === 2 ? 'other' : ordinal(n);
}

function ordinal(n) {
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10];
  return n + (suffix && Math.floor(n / 10) % 10 !== 1 ? suffix : 'th');
}

export function createEnemy(id) {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  return {
    id,
    name: def.name,
    emoji: def.emoji,
    hp: def.hp,
    maxHp: def.hp,
    block: def.block,
    damage: def.damage,
    gold: def.gold,
    boss: !!def.boss,
    title: def.title ?? null,
    portrait: def.portrait ?? null,
    pattern: def.pattern || { id: 'standard' },
    abilities: def.abilities || [],
    statuses: {},
    turn: 0, // enemy turns taken; the turn being planned is turn + 1
    flags: {},
    intent: null,
  };
}

/** Name and rules text for everything the enemy does beyond basic attack/defend. */
export function describeAbilities(enemy) {
  const out = [];
  const pattern = PATTERNS[enemy.pattern.id];
  if (pattern.name) out.push({ name: pattern.name, text: pattern.text(enemy.pattern) });
  for (const a of enemy.abilities) out.push({ name: ABILITIES[a.id].name, text: ABILITIES[a.id].text(a) });
  return out;
}

export function planIntent(c) {
  const e = c.enemy;
  e.intent = PATTERNS[e.pattern.id].plan(c, e, e.turn + 1, e.pattern);
  emit(c, 'intent', { intent: e.intent });
}

/**
 * What the current intent will do if it resolved right now. The UI and tests both read this.
 * perHit is each hit before Fly; firstHit is the first hit after Fly halves it (Fly is used up
 * by that hit, so later hits land at perHit).
 */
export function previewIntent(c) {
  const intent = c.enemy.intent;
  if (intent.kind !== 'attack') return { ...intent };
  const perHit = predictEnemyHit(c, intent.base);
  const firstHit = stacks(c.player, 'fly') ? Math.floor(perHit / 2) : perHit;
  return { ...intent, perHit, firstHit };
}

function runAbilities(c, trigger) {
  const e = c.enemy;
  for (const a of e.abilities) {
    const def = ABILITIES[a.id];
    if (def.trigger !== trigger) continue;
    if (def.run(c, a, e.turn)) emit(c, 'ability', { side: 'enemy', name: def.name });
  }
}

/** Step 5: the enemy's turn begins. */
export function enemyTurnStart(c) {
  const e = c.enemy;
  e.turn += 1;
  if (e.block > 0 && e.abilities.some((a) => ABILITIES[a.id].resetsBlock)) {
    e.block = 0;
    emit(c, 'blockReset', { side: 'enemy' });
  }
  runAbilities(c, 'turnStart');
}

/** Step 6: execute the planned intent. Returns true if the enemy attacked. */
export function resolveIntent(c) {
  const e = c.enemy;
  const intent = e.intent;
  emit(c, 'enemyAct', { intent });
  if (intent.kind === 'attack') {
    // Modifiers are resolved once per attack, so a multi-hit attack uses up one Chill stack.
    const perHit = enemyAttackDamage(c, intent.base);
    if (stacks(e, 'chill')) reduceStatus(c, 'enemy', 'chill');
    for (let i = 0; i < intent.hits && c.player.hp > 0; i++) {
      hitPlayer(c, incomingToPlayer(c, perHit), 'enemy');
    }
    return true;
  }
  if (intent.kind === 'defend') gainBlock(c, 'enemy', intent.block, 'defend');
  return false;
}

/** Step 9. */
export function afterEnemyAction(c, attacked) {
  if (attacked) runAbilities(c, 'afterAttack');
  runAbilities(c, 'hp');
}

/** Called after card damage lands on a living enemy. */
export function onEnemyDamaged(c) {
  if (c.enemy.hp > 0) runAbilities(c, 'hp');
}
