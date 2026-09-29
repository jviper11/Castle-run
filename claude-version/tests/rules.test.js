// Rules tests: damage pipelines, status timing (GDD §4) and the combat loop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCombat, giveHand, setRoll, eventsOf, forceIntent } from './helpers.js';
import { playCard, endTurn, reroll } from '../src/engine/combat.js';
import { playerAttackDamage, predictEnemyHit } from '../src/engine/damage.js';
import { drain } from '../src/engine/log.js';

// ── Damage pipelines ──

test('player attack: Strength, then Weak, then enemy Vulnerable, flooring at each step', () => {
  const c = makeCombat();
  c.player.statuses = { rage: 2, weak: 1 };
  c.enemy.statuses = { vulnerable: 1 };
  // (10 + 2) = 12 → ×0.75 = 9 → ×1.5 = 13.5 → 13
  assert.equal(playerAttackDamage(c, 10), 13);
});

test('enemy attack prediction: Rage, Weak, Chill, then player Vulnerable', () => {
  const c = makeCombat();
  c.enemy.statuses = { rage: 2, weak: 1, chill: 1 };
  c.player.statuses = { vulnerable: 1 };
  // (10 + 2) = 12 → ×0.75 = 9 → ×0.75 = 6 → ×1.5 = 9
  assert.equal(predictEnemyHit(c, 10), 9);
});

test('player Block absorbs before HP; enemy attack resolves the shown intent exactly', () => {
  const c = makeCombat({ enemy: 'ratEasy' });
  c.player.block = 4;
  giveHand(c, []);
  const hpBefore = c.player.hp;
  assert.deepEqual(c.enemy.intent.actions, [{ kind: 'attack', base: 6, hits: 1 }]);
  endTurn(c);
  assert.equal(c.player.hp, hpBefore - 2);
});

// ── Status timing ──

test('Burn ticks before the enemy acts: a lethal tick means the enemy never attacks', () => {
  const c = makeCombat();
  c.enemy.hp = 3;
  c.enemy.statuses = { burn: 5 };
  endTurn(c);
  const events = drain(c);
  assert.equal(c.phase, 'won');
  assert.ok(!events.some((e) => e.type === 'enemyAct'));
});

test('Poison ticks after the enemy acts', () => {
  const c = makeCombat();
  c.enemy.hp = 3;
  c.enemy.statuses = { poison: 5 };
  endTurn(c);
  const types = drain(c).map((e) => e.type);
  assert.equal(c.phase, 'won');
  assert.ok(types.indexOf('enemyAct') < types.indexOf('victory'));
});

test('GDD §4 example: a non-lethal Burn tick does not skip Reassemble (12 → 7 → 15)', () => {
  const c = makeCombat({ enemy: 'skeleton' });
  c.enemy.hp = 12;
  c.enemy.statuses = { burn: 5 };
  endTurn(c);
  assert.equal(c.enemy.hp, 15);
});

test('a lethal Poison tick skips Reassemble', () => {
  const c = makeCombat({ enemy: 'skeleton' });
  c.enemy.hp = 4;
  c.enemy.statuses = { poison: 4 };
  endTurn(c);
  assert.equal(c.phase, 'won');
});

test('a card hit that leaves the Skeleton below 10 triggers Reassemble at once, only once', () => {
  const c = makeCombat({ enemy: 'skeleton', deck: ['strike'] });
  c.enemy.hp = 14;
  const [a, b] = giveHand(c, ['strike', 'strike']);
  playCard(c, a); // 14 → 8 → heals to 16
  assert.equal(c.enemy.hp, 16);
  playCard(c, b); // 16 → 10, already used
  assert.equal(c.enemy.hp, 10);
});

test('a killing card blow does not revive the Skeleton', () => {
  const c = makeCombat({ enemy: 'skeleton' });
  c.enemy.hp = 5;
  const [a] = giveHand(c, ['strike']);
  playCard(c, a);
  assert.equal(c.phase, 'won');
});

test('Chill is used up only when the enemy attacks, not when it defends', () => {
  const c = makeCombat();
  c.enemy.statuses = { chill: 2 };
  forceIntent(c, { kind: 'defend', block: 8 });
  endTurn(c);
  assert.equal(c.enemy.statuses.chill, 2);
  forceIntent(c, { kind: 'attack', base: 6, hits: 1 });
  endTurn(c);
  assert.equal(c.enemy.statuses.chill, 1);
});

test('enemy Weak applied this turn still weakens the attack it was aimed at', () => {
  const c = makeCombat({ enemy: 'ratEasy' });
  const [roar] = giveHand(c, ['ironroar']);
  setRoll(c, 1); // odd: 1 Weak
  playCard(c, roar);
  const hp = c.player.hp;
  endTurn(c); // 6 × 0.75 = 4
  assert.equal(c.player.hp, hp - 4);
  assert.equal(c.enemy.statuses.weak, undefined);
});

test('player Weak lasts through the next player turn, then ticks down at its end', () => {
  const c = makeCombat({ enemy: 'dungeonWarden' });
  c.enemy.turn = 2; // its next turn is the 3rd: Lockdown fires
  forceIntent(c, { kind: 'defend', block: 8 });
  endTurn(c);
  assert.equal(c.player.statuses.weak, 1);
  assert.equal(playerAttackDamage(c, 8), 6);
  endTurn(c);
  assert.equal(c.player.statuses.weak, undefined);
});

test("Rabid's Vulnerable survives to amplify the next attack", () => {
  const c = makeCombat({ enemy: 'cursedHound' });
  endTurn(c);
  assert.equal(c.player.statuses.vulnerable, 1);
  forceIntent(c, { kind: 'attack', base: 10, hits: 1 });
  const hp = c.player.hp;
  endTurn(c);
  assert.equal(c.player.hp, hp - 15);
});

test('Regen is capped at 10 stacks', async () => {
  const { addStatus } = await import('../src/engine/statuses.js');
  const c = makeCombat();
  addStatus(c, 'player', 'regen', 8);
  addStatus(c, 'player', 'regen', 8);
  assert.equal(c.player.statuses.regen, 10);
});

// ── Combat loop ──

test('Block resets at turn start, except once after Entrench', () => {
  const c = makeCombat();
  forceIntent(c, { kind: 'defend', block: 8 });
  const [ent] = giveHand(c, ['entrench']);
  setRoll(c, 1);
  playCard(c, ent);
  assert.equal(c.player.block, 8);
  endTurn(c);
  assert.equal(c.player.block, 8, 'carried over once');
  forceIntent(c, { kind: 'defend', block: 8 });
  endTurn(c);
  assert.equal(c.player.block, 0);
});

test('turn start draws 5; draw effects stop at the hand limit of 8', () => {
  const deck = Array(20).fill('defend');
  const c = makeCombat({ deck });
  assert.equal(c.piles.hand.length, 5);
  c.piles.hand.push(...c.piles.draw.splice(0, 2)); // 7 in hand
  c.piles.hand.push({ uid: 999, key: 'battlecry' });
  setRoll(c, 2); // even: draw 2
  c.player.energy = 3;
  playCard(c, 999); // hand 7 after playing → draws to 8 and stops
  assert.equal(c.piles.hand.length, 8);
});

test('the discard pile is reshuffled into the draw pile when it runs out', () => {
  const c = makeCombat({ deck: Array(7).fill('strike') });
  // 5 drawn, 2 left. End turn: 5 discarded, the next turn draws 2, then reshuffles.
  forceIntent(c, { kind: 'defend', block: 8 });
  endTurn(c);
  assert.equal(c.piles.hand.length, 5);
  assert.equal(c.piles.draw.length + c.piles.discard.length, 2);
});

test('Energy is spent, and a card costing more than the remaining Energy is refused', () => {
  const c = makeCombat();
  const [a, b] = giveHand(c, ['heavyblow', 'heavyblow']);
  assert.ok(playCard(c, a));
  assert.equal(c.player.energy, 1);
  assert.equal(playCard(c, b), false);
  assert.equal(c.piles.hand.length, 1);
});

test('Battle Trance: +2 Energy flat, capped at max + 2, HP cost floored at 1', () => {
  const c = makeCombat({ hp: 3 });
  const [bt] = giveHand(c, ['battletrance']);
  setRoll(c, 3);
  playCard(c, bt); // 3 - 1 + 2 = 4 energy; lose 6 HP floored at 1
  assert.equal(c.player.energy, 4);
  assert.equal(c.player.hp, 1);
  assert.equal(c.phase, 'player');
});

test('Death Rattle above 50% HP: Energy refunded, card spent (reference behaviour)', () => {
  const c = makeCombat();
  const [dr] = giveHand(c, ['deathrattle']);
  const hp = c.enemy.hp;
  playCard(c, dr);
  assert.equal(c.enemy.hp, hp);
  assert.equal(c.player.energy, 3);
  assert.equal(c.piles.discard.at(-1).key, 'deathrattle');
});

test('Power cards exhaust; they come back next fight because piles are rebuilt from the deck', () => {
  const c = makeCombat({ deck: ['ragefuel', 'strike'] });
  const power = c.piles.hand.find((x) => x.key === 'ragefuel');
  playCard(c, power.uid);
  assert.equal(c.piles.exhaust.length, 1);
  assert.equal(c.player.statuses.rage, 1);
  assert.equal(c.run.deck.length, 2);
});

test("two base Berserker's Oaths add up (3 + 3), unlike the reference's stacks-as-upgrade", () => {
  const c = makeCombat();
  c.player.energy = 4;
  const [a, b] = giveHand(c, ['berserkersoath', 'berserkersoath']);
  playCard(c, a);
  playCard(c, b);
  assert.equal(c.player.statuses.berserkOath, 6);
  const [lunge] = giveHand(c, ['recklesslunge']);
  c.player.energy = 1;
  setRoll(c, 1);
  playCard(c, lunge);
  assert.equal(c.player.block, 6);
});

test('reroll: one per turn, refilled next turn', () => {
  const c = makeCombat();
  assert.ok(reroll(c));
  assert.equal(reroll(c), false);
  forceIntent(c, { kind: 'defend', block: 8 });
  endTurn(c);
  assert.ok(reroll(c));
});

test('Brutal Swing stops hitting once the enemy is dead', () => {
  const c = makeCombat();
  c.enemy.hp = 4;
  const [bs] = giveHand(c, ['brutalswing']);
  setRoll(c, 1);
  playCard(c, bs);
  const hits = eventsOf(c, 'damage').filter((e) => e.side === 'enemy');
  assert.equal(hits.length, 1);
  assert.equal(c.phase, 'won');
});

test('the player dying ends combat as a loss, even if Poison would also kill the enemy', () => {
  const c = makeCombat({ hp: 1 });
  c.enemy.hp = 1;
  c.enemy.statuses = { poison: 5 };
  forceIntent(c, { kind: 'attack', base: 6, hits: 1 });
  endTurn(c);
  assert.equal(c.phase, 'lost');
});
