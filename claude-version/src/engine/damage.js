import { emit } from './log.js';
import { stacks, reduceStatus, chillReductionPct } from './statuses.js';

// The two damage pipelines. Card previews and intent displays call these same functions, so a
// displayed number can only differ from the resolved number if the state changes in between.
//
// Rounding floors at every multiplier, matching the reference build.

/**
 * Player attack: base → +Strength → +the die's own bonus → Weak ×0.75 → enemy Vulnerable ×1.5.
 * Block is applied later.
 */
export function playerAttackDamage(c, base) {
  let amount = base + stacks(c.player, 'rage') + dieAttackBonus(c);
  if (stacks(c.player, 'weak')) amount = Math.floor(amount * 0.75);
  if (stacks(c.enemy, 'vulnerable')) amount = Math.floor(amount * 1.5);
  return Math.max(0, amount);
}

/**
 * Hunter's Die: +2 while the die shows an odd number. A flat term beside Strength, so Weak and
 * Vulnerable both apply to it afterwards — the reference's placement (../js/combat.js:2349).
 * Card previews call playerAttackDamage() too, so the bonus shows on the card before it is played.
 */
function dieAttackBonus(c) {
  const d = c.dieType;
  return d?.bonus === 'oddDamage' && c.die.value % 2 !== 0 ? d.params.damage : 0;
}

/**
 * Enemy attack before the player's defences: base → +Rage → Weak ×0.75 → Chill (×0.75, or less
 * with Cold Mastery).
 */
export function enemyAttackDamage(c, base) {
  let amount = base + stacks(c.enemy, 'rage');
  if (stacks(c.enemy, 'weak')) amount = Math.floor(amount * 0.75);
  if (stacks(c.enemy, 'chill')) {
    amount = Math.floor((amount * (100 - chillReductionPct(stacks(c.player, 'coldMastery')))) / 100);
  }
  return Math.max(0, amount);
}

/** Burn and Poison tick damage: stacks, plus the matching Power's bonus per stack. */
export function burnTick(c) {
  const n = stacks(c.enemy, 'burn');
  return n + n * stacks(c.player, 'burningSoul');
}

export function poisonTick(c) {
  const n = stacks(c.enemy, 'poison');
  return n + n * stacks(c.player, 'poisonMaster');
}

/** Player-side multipliers on an incoming hit (Vulnerable). Fly and Block apply at impact. */
export function incomingToPlayer(c, amount) {
  return stacks(c.player, 'vulnerable') ? Math.floor(amount * 1.5) : amount;
}

/** What an enemy attack of `base` will deal per hit before Fly and Block. Intents display this. */
export function predictEnemyHit(c, base) {
  return incomingToPlayer(c, enemyAttackDamage(c, base));
}

/** Applies an already-computed hit to the enemy: Block first, then HP. Returns HP lost. */
export function hitEnemy(c, amount, source) {
  const e = c.enemy;
  const blocked = Math.min(e.block, amount);
  e.block -= blocked;
  const lost = Math.min(e.hp, amount - blocked);
  e.hp -= lost;
  emit(c, 'damage', { side: 'enemy', amount, blocked, lost, hp: e.hp, block: e.block, source });
  return lost;
}

/** Burn and Poison: straight to HP, ignoring Block. */
export function damageEnemyDirect(c, amount, source) {
  const e = c.enemy;
  const lost = Math.min(e.hp, amount);
  e.hp -= lost;
  emit(c, 'damage', { side: 'enemy', amount, blocked: 0, lost, hp: e.hp, block: e.block, source });
  return lost;
}

/**
 * Applies an incoming hit to the player: Fly halves it (and is used up), then Block, then HP.
 * `source: 'self'` is self-inflicted damage that still respects Block (Cursed Reroll).
 */
export function hitPlayer(c, amount, source) {
  const p = c.player;
  if (stacks(p, 'fly')) {
    amount = Math.floor(amount / 2);
    reduceStatus(c, 'player', 'fly', stacks(p, 'fly'));
  }
  const blocked = Math.min(p.block, amount);
  p.block -= blocked;
  const lost = takeHp(p, amount - blocked);
  emit(c, 'damage', { side: 'player', amount, blocked, lost, hp: p.hp, block: p.block, source });
  onPlayerHpLost(c, lost);
  return lost;
}

/**
 * Player HP loss that skips Block (Blood Price, Reckless Lunge…). `floorAt` caps the loss so HP
 * cannot drop below that value.
 */
export function loseHp(c, amount, { floorAt = null, source } = {}) {
  const p = c.player;
  if (floorAt != null) amount = Math.min(amount, Math.max(0, p.hp - floorAt));
  const lost = takeHp(p, amount);
  if (!lost) return 0;
  emit(c, 'hpLoss', { side: 'player', amount: lost, hp: p.hp, source });
  onPlayerHpLost(c, lost);
  return lost;
}

function takeHp(unit, amount) {
  const lost = Math.max(0, Math.min(unit.hp, amount));
  unit.hp -= lost;
  return lost;
}

// Every reaction to the player losing HP goes here. Relic hooks will be added here in Phase 4.
function onPlayerHpLost(c, lost) {
  if (lost <= 0) return;
  const oath = stacks(c.player, 'berserkOath');
  if (oath) gainBlock(c, 'player', oath, 'berserkOath');
}

export function gainBlock(c, side, amount, source) {
  if (amount <= 0) return;
  c[side].block += amount;
  emit(c, 'block', { side, amount, block: c[side].block, source });
}

export function heal(c, side, amount, source) {
  const u = c[side];
  const healed = Math.min(amount, u.maxHp - u.hp);
  u.hp += healed;
  emit(c, 'heal', { side, amount: healed, hp: u.hp, source });
  return healed;
}
