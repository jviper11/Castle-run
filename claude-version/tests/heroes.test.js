// Hero-specific card rules: the cards whose behaviour is more than a number.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCombat, giveHand, setRoll } from './helpers.js';
import { playCard, resolveChoice } from '../src/engine/combat.js';
import { cardCost } from '../src/engine/costs.js';

// ── Thief ──

test('Backstab: full damage as the first card; later it fizzles with a refund', () => {
  const c = makeCombat({ hero: 'thief' });
  c.player.energy = 3;
  const [b1, j, b2] = giveHand(c, ['backstab', 'swiftjab', 'backstab']);
  setRoll(c, 2);
  let hp = c.enemy.hp;
  playCard(c, b1);
  assert.equal(hp - c.enemy.hp, 10);
  playCard(c, j);
  hp = c.enemy.hp;
  playCard(c, b2);
  assert.equal(c.enemy.hp, hp);
  assert.equal(c.player.energy, 2);
});

test('Golden Strike scales with Gold: ÷10 (max 15); Odd ÷8 (max 20)', () => {
  const c = makeCombat({ hero: 'thief' });
  c.run.gold = 125;
  const [a, b] = giveHand(c, ['goldenstrike', 'goldenstrike']);
  setRoll(c, 2);
  let hp = c.enemy.hp;
  playCard(c, a);
  assert.equal(hp - c.enemy.hp, 12);
  setRoll(c, 3);
  hp = c.enemy.hp;
  playCard(c, b);
  assert.equal(hp - c.enemy.hp, 15);
});

test('Assassinate hits harder against 5+ Poison', () => {
  const c = makeCombat({ hero: 'thief', enemy: 'armoredKnight' });
  c.player.energy = 4;
  c.enemy.block = 0;
  const [a, b] = giveHand(c, ['assassinate', 'assassinate']);
  setRoll(c, 2);
  let hp = c.enemy.hp;
  playCard(c, a);
  assert.equal(hp - c.enemy.hp, 14);
  c.enemy.statuses.poison = 5;
  hp = c.enemy.hp;
  playCard(c, b);
  assert.equal(hp - c.enemy.hp, 22);
});

test('Death Mark multiplies Poison; the upgrade caps it at 20', () => {
  const c = makeCombat({ hero: 'thief' });
  c.enemy.statuses.poison = 8;
  const [d, u] = giveHand(c, ['deathmark', 'deathmark+']);
  setRoll(c, 3);
  playCard(c, d);
  assert.equal(c.enemy.statuses.poison, 24);
  playCard(c, u);
  assert.equal(c.enemy.statuses.poison, 20);
  assert.equal(c.piles.exhaust.length, 2);
});

test('Disappear: on Odd, the next 2 cards cost 0', () => {
  const c = makeCombat({ hero: 'thief' });
  const [d, a, b, x] = giveHand(c, ['disappear', 'poisonblade', 'poisonblade', 'poisonblade']);
  setRoll(c, 1);
  playCard(c, d);
  assert.equal(cardCost(c, c.piles.hand.find((k) => k.uid === a)), 0);
  playCard(c, a);
  playCard(c, b);
  assert.equal(c.player.energy, 2);
  assert.equal(cardCost(c, c.piles.hand.find((k) => k.uid === x)), 2);
});

test('Smoke Screen asks which card to discard, then draws', () => {
  const c = makeCombat({ hero: 'thief', deck: Array(10).fill('strike') });
  const s = c.piles.hand[0];
  c.piles.hand[0] = { uid: 500, key: 'smokescreen' };
  c.piles.draw.push(s);
  playCard(c, 500);
  assert.equal(c.player.block, 6);
  assert.equal(c.pending.count, 1);
  const victim = c.piles.hand[2].uid;
  resolveChoice(c, [victim]);
  assert.ok(c.piles.discard.some((x) => x.uid === victim));
  assert.equal(c.piles.hand.length, 4);
});

test('Pick Pocket: Odd adds Gold', () => {
  const c = makeCombat({ hero: 'thief', deck: Array(10).fill('strike') });
  const [p] = giveHand(c, ['pickpocket']);
  setRoll(c, 5);
  const gold = c.run.gold;
  playCard(c, p);
  assert.equal(c.run.gold, gold + 5);
});

// ── Vampire ──

test('Drain Life heals half the HP damage dealt; on Extreme, all of it', () => {
  const c = makeCombat({ hero: 'vampire', hp: 40 });
  c.player.energy = 4;
  c.enemy.block = 2;
  const [a, b] = giveHand(c, ['drainlife', 'drainlife']);
  setRoll(c, 3);
  playCard(c, a); // 12 - 2 Block = 10 → heal 5
  assert.equal(c.player.hp, 45);
  setRoll(c, 6);
  playCard(c, b); // 12 → heal 12
  assert.equal(c.player.hp, 57);
});

test('Soul Rend heals exactly the HP damage it dealt, capped by the enemy HP left', () => {
  const c = makeCombat({ hero: 'vampire', hp: 30 });
  c.enemy.hp = 9;
  const [s] = giveHand(c, ['soulrend']);
  setRoll(c, 3);
  playCard(c, s);
  assert.equal(c.player.hp, 39);
  assert.equal(c.phase, 'won');
});

test('Shadow Feast hits harder while you have Regen', () => {
  const c = makeCombat({ hero: 'vampire' });
  const [a, b] = giveHand(c, ['shadowfeast', 'shadowfeast']);
  setRoll(c, 3);
  let hp = c.enemy.hp;
  playCard(c, a);
  assert.equal(hp - c.enemy.hp, 6);
  c.player.statuses.regen = 2;
  hp = c.enemy.hp;
  playCard(c, b);
  assert.equal(hp - c.enemy.hp, 10);
});

test('Blood Tide multiplies Regen but never past the Regen cap of 10', () => {
  const c = makeCombat({ hero: 'vampire' });
  c.player.statuses.regen = 4;
  const [t] = giveHand(c, ['bloodtide']);
  setRoll(c, 1); // Extreme: ×3 → 12, capped to 10
  playCard(c, t);
  assert.equal(c.player.statuses.regen, 10);
  assert.equal(c.piles.exhaust.length, 1);
});

test('Swoop Down: Fly halves the next hit, and the intent shows the halved number', async () => {
  const { previewIntent } = await import('../src/engine/enemies.js');
  const { endTurn } = await import('../src/engine/combat.js');
  const c = makeCombat({ hero: 'vampire', enemy: 'castleGuard' });
  const [s] = giveHand(c, ['swoopdown']);
  setRoll(c, 3);
  playCard(c, s);
  assert.equal(previewIntent(c).firstHit, 5);
  const hp = c.player.hp;
  endTurn(c);
  assert.equal(hp - c.player.hp, 5);
  assert.equal(c.player.statuses.fly, undefined);
});

test('Cursed Veins: next card free; on Extreme, the next Skill instead', () => {
  const c = makeCombat({ hero: 'vampire' });
  const [v, atk] = giveHand(c, ['cursedveins', 'lifeleech']);
  setRoll(c, 1);
  playCard(c, v);
  assert.equal(cardCost(c, c.piles.hand.find((x) => x.uid === atk)), 2, 'an Attack is not a Skill');
  const d = makeCombat({ hero: 'vampire' });
  const [v2, atk2] = giveHand(d, ['cursedveins', 'lifeleech']);
  setRoll(d, 3);
  playCard(d, v2);
  assert.equal(cardCost(d, d.piles.hand.find((x) => x.uid === atk2)), 0);
});

test('Eternal Hunger: base + upgrade stack as flat 2 plus 2 per Regen stack (max 15)', async () => {
  const { endTurn } = await import('../src/engine/combat.js');
  const c = makeCombat({ hero: 'vampire', enemy: 'armoredKnight' });
  c.player.energy = 4;
  const [base, up] = giveHand(c, ['eternalhunger', 'eternalhunger+']);
  playCard(c, base);
  playCard(c, up);
  assert.equal(c.player.statuses.eternalHunger, 2);
  c.player.statuses.regen = 10;
  c.enemy.intent = { kind: 'defend', block: 8 };
  const hp = c.enemy.hp;
  endTurn(c);
  assert.equal(hp - c.enemy.hp, 2 + 15);
});

test('Arcane Recall cannot return Arcane Recall, which closes the zero-cost loop', () => {
  const c = makeCombat({ hero: 'mage', deck: Array(10).fill('strike') });
  c.piles.discard.push({ uid: 900, key: 'arcanerecall+' }, { uid: 901, key: 'arcanerecall' }, { uid: 902, key: 'spark' });
  const [r] = giveHand(c, ['arcanerecall+']);
  setRoll(c, 3);
  playCard(c, r);
  assert.equal(c.pending, null, 'only one legal card, so it resolves itself');
  assert.ok(c.piles.hand.some((x) => x.uid === 902));
  assert.ok(!c.piles.hand.some((x) => x.uid === 900 || x.uid === 901));
});

// ── Mage ──

test('Frost Fire: both checks read the enemy before either status is added', () => {
  const c = makeCombat({ hero: 'mage', enemy: 'armoredKnight' });
  c.enemy.statuses = { burn: 1 };
  const [f] = giveHand(c, ['frostfire']);
  setRoll(c, 3);
  playCard(c, f);
  assert.equal(c.enemy.statuses.chill, 2);
  assert.equal(c.enemy.statuses.burn, 1, 'the fresh Chill does not trigger the Burn clause');
});

test('Void Channel: discard 2, double the die, and it uses the once-per-turn set', () => {
  const c = makeCombat({ hero: 'mage', deck: Array(10).fill('strike') });
  c.piles.hand[0] = { uid: 700, key: 'voidchannel' };
  c.piles.hand[1] = { uid: 701, key: 'voidchannel' };
  setRoll(c, 3);
  playCard(c, 700);
  resolveChoice(c, c.pending.cards.slice(0, 2).map((x) => x.uid));
  assert.equal(c.die.value, 6);
  assert.equal(c.turnState.dieSet, true);
  playCard(c, 701); // gated now: fizzles with a refund
  assert.equal(c.pending, null);
  assert.equal(c.player.energy, 2);
});

test('Void Channel+: roll 3 times, keep the highest', () => {
  const c = makeCombat({ hero: 'mage', deck: Array(10).fill('strike'), seed: 9 });
  c.piles.hand[0] = { uid: 700, key: 'voidchannel+' };
  playCard(c, 700);
  resolveChoice(c, c.pending.cards.slice(0, 2).map((x) => x.uid));
  assert.ok(c.die.value >= 1 && c.die.value <= 6);
  assert.equal(c.turnState.dieSet, true);
});

test('Arcane Recall returns a chosen card from the discard pile', () => {
  const c = makeCombat({ hero: 'mage', deck: Array(10).fill('strike') });
  c.piles.discard.push({ uid: 900, key: 'fireball' }, { uid: 901, key: 'spark' });
  const [r] = giveHand(c, ['arcanerecall']);
  setRoll(c, 3);
  playCard(c, r);
  resolveChoice(c, [901]);
  assert.ok(c.piles.hand.some((x) => x.uid === 901));
  assert.ok(c.piles.discard.some((x) => x.uid === 900));
});

test('Combustion scales with Burn; Arcane Barrage with Skills/Powers played', () => {
  const c = makeCombat({ hero: 'mage' });
  c.player.energy = 5;
  c.enemy.statuses = { burn: 4 };
  const [co, s, b] = giveHand(c, ['combustion', 'meditate', 'arcanebarrage']);
  setRoll(c, 3);
  let hp = c.enemy.hp;
  playCard(c, co); // 3 + 4
  assert.equal(hp - c.enemy.hp, 7);
  playCard(c, s);
  hp = c.enemy.hp;
  playCard(c, b); // 3 + 1
  assert.equal(hp - c.enemy.hp, 4);
});

test('Ice Lance needs both High and Chill for its big hit', () => {
  const c = makeCombat({ hero: 'mage', enemy: 'armoredKnight' });
  c.enemy.block = 0;
  const [a, b] = giveHand(c, ['icelance', 'icelance']);
  setRoll(c, 6);
  let hp = c.enemy.hp;
  playCard(c, a);
  assert.equal(hp - c.enemy.hp, 7);
  c.enemy.statuses = { chill: 1 };
  hp = c.enemy.hp;
  playCard(c, b);
  assert.equal(hp - c.enemy.hp, 13);
});

test('Frozen Inferno removes Burn and Chill; Inferno is echoed but leaves a mark unspent', () => {
  const c = makeCombat({ hero: 'mage', enemy: 'armoredKnight' });
  c.player.energy = 9;
  const [m, e, i, f] = giveHand(c, ['bloodrush', 'spellecho', 'inferno', 'frozeninferno']);
  setRoll(c, 3);
  playCard(c, m);
  playCard(c, e);
  playCard(c, i);
  assert.equal(c.enemy.statuses.burn, 12, 'echoed: 6 + 6');
  assert.equal(c.turnState.markBonus, 6, 'a no-damage Attack does not spend the mark');
  c.enemy.statuses.chill = 2;
  playCard(c, f);
  assert.equal(c.enemy.statuses.burn, undefined);
  assert.equal(c.enemy.statuses.chill, undefined);
  assert.equal(c.turnState.markBonus, 0);
});

test('Channel Focus+ on High: +2 Energy, allowed to exceed max by 2', () => {
  const c = makeCombat({ hero: 'mage', deck: Array(10).fill('strike') });
  const [f] = giveHand(c, ['channelfocus+']);
  setRoll(c, 6);
  playCard(c, f);
  assert.equal(c.player.energy, 5);
});

test('F2: Time Warp+ exists and draws/energises per its text', async () => {
  const { getCard, cardTextPlain } = await import('../src/engine/cards.js');
  assert.equal(cardTextPlain(getCard('timewarp+')), 'Draw 2 cards. Gain 2 Energy. High: Draw 4 and gain 3 Energy instead.');
});

// ── Gambler ──

test('Gambler never rolls below 2', async () => {
  const { rollDie } = await import('../src/engine/dice.js');
  const c = makeCombat({ hero: 'gambler', deck: Array(10).fill('strike') });
  for (let i = 0; i < 200; i++) assert.ok(rollDie(c, 'reroll') >= 2);
});

test('Long Shot: 4, 10 on a 4+, 16 on Max', () => {
  const c = makeCombat({ hero: 'gambler', enemy: 'armoredKnight' });
  c.enemy.block = 0;
  const hits = [];
  for (const [roll] of [[3], [5], [6]]) {
    const [l] = giveHand(c, ['longshot']);
    c.player.energy = 3;
    setRoll(c, roll);
    const hp = c.enemy.hp;
    playCard(c, l);
    hits.push(hp - c.enemy.hp);
  }
  assert.deepEqual(hits, [4, 10, 16]);
});

test('Double Down: the die doubles (clamped) or drops to 1', () => {
  const outcomes = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const c = makeCombat({ hero: 'gambler', seed, deck: Array(10).fill('strike') });
    const [d] = giveHand(c, ['doubldown']);
    setRoll(c, 4);
    playCard(c, d);
    outcomes.add(c.die.value);
  }
  assert.deepEqual([...outcomes].sort(), [1, 6]);
});

test('Loaded Die: choose 3–5, or up to the die max on a Max roll', () => {
  const c = makeCombat({ hero: 'gambler', deck: Array(10).fill('strike') });
  const [l] = giveHand(c, ['loadeddie']);
  setRoll(c, 6);
  playCard(c, l);
  assert.deepEqual([c.pending.min, c.pending.max], [3, 6]);
  resolveChoice(c, 5);
  assert.equal(c.die.value, 5);
});

test('Press Your Luck compares the new roll with the roll it was played on', () => {
  let higher = 0;
  let other = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const c = makeCombat({ hero: 'gambler', seed, enemy: 'armoredKnight' });
    c.enemy.block = 0;
    const [p] = giveHand(c, ['pressyourluck']);
    setRoll(c, 3);
    const hp = c.enemy.hp;
    playCard(c, p);
    const dealt = hp - c.enemy.hp;
    if (c.die.value > 3) { assert.equal(dealt, 16); higher++; } else { assert.equal(dealt, 10); other++; }
  }
  assert.ok(higher && other, 'both branches seen');
});

test("Devil's Deal: +3 Energy, lose Gold = roll × 10 (Max: × 4)", () => {
  const c = makeCombat({ hero: 'gambler', deck: Array(10).fill('strike') });
  c.run.gold = 100;
  const [d, e] = giveHand(c, ['devilsdeal', 'devilsdeal']);
  setRoll(c, 3);
  playCard(c, d);
  assert.equal(c.run.gold, 70);
  assert.equal(c.player.energy, 5);
  setRoll(c, 6);
  playCard(c, e);
  assert.equal(c.run.gold, 46);
});

test('Count the Odds: look at 2, keep the chosen 1', () => {
  const c = makeCombat({ hero: 'gambler', deck: Array(12).fill('strike') });
  const [k] = giveHand(c, ['counttheodds']);
  setRoll(c, 3);
  playCard(c, k);
  assert.equal(c.pending.cards.length, 2);
  const keep = c.pending.cards[1].uid;
  resolveChoice(c, [keep]);
  assert.ok(c.piles.hand.some((x) => x.uid === keep));
});

test('Pocket Aces adds the roll to the next damaging Attack', () => {
  const c = makeCombat({ hero: 'gambler', enemy: 'armoredKnight' });
  c.enemy.block = 0;
  const [p, s] = giveHand(c, ['pocketaces', 'strike']);
  setRoll(c, 4);
  playCard(c, p);
  const hp = c.enemy.hp;
  playCard(c, s);
  assert.equal(hp - c.enemy.hp, 10);
});

test('Risk Taker rerolls first, then checks the new roll for Max', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const c = makeCombat({ hero: 'gambler', seed, deck: Array(20).fill('strike') });
    const [r] = giveHand(c, ['risktaker']);
    playCard(c, r);
    const max = c.die.value === 6;
    assert.equal(c.player.block, max ? 3 : 0, `seed ${seed}`);
    assert.equal(c.piles.hand.length, max ? 2 : 1);
  }
});
