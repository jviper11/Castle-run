// Phase 2a mechanics, tested with stand-in cards before any hero content depends on them.
// node --test runs each file in its own process, so the stand-ins never reach other suites.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../src/content/cards.js';
import { makeCombat, giveHand, setRoll, eventsOf, forceIntent } from './helpers.js';
import { playCard, endTurn, reroll, resolveChoice, playability, createCombat } from '../src/engine/combat.js';
import { cardCost } from '../src/engine/costs.js';
import { rollDie } from '../src/engine/dice.js';
import { addStatus } from '../src/engine/statuses.js';
import { describeCard, getCard } from '../src/engine/cards.js';
import { allCards } from '../src/engine/piles.js';

const atk = (params, ops, extra = {}) => ({ name: 'T', emoji: '·', type: 'attack', cost: 1, params, ops, text: 'x', ...extra });
const skl = (params, ops, extra = {}) => ({ name: 'T', emoji: '·', type: 'skill', cost: 1, params, ops, text: 'x', ...extra });
Object.assign(CARDS, {
  t_wild: atk({ dmg: { of: 'die', per: 2 } }, [{ op: 'damage', amount: 'dmg' }], { text: 'Deal {dmg} damage.' }),
  t_barrage: atk({ dmg: { flat: 3, of: 'spellsThisTurn' } }, [{ op: 'damage', amount: 'dmg' }]),
  t_surge: skl({ n: 2 }, [{ op: 'discountNext', count: 'n' }], { cost: 0 }),
  t_free: skl({ n: 1 }, [{ op: 'freeNext', count: 'n' }], { cost: 0 }),
  t_echo: skl({ n: 1 }, [{ op: 'echo', count: 'n' }], { cost: 0 }),
  t_mark: skl({ n: 5 }, [{ op: 'markBonus', amount: 'n' }], { cost: 0 }),
  t_nodmg: atk({ b: 6 }, [{ op: 'status', target: 'enemy', status: 'burn', stacks: 'b' }], { cost: 0 }),
  t_hit: atk({ dmg: 4 }, [{ op: 'damage', amount: 'dmg' }], { cost: 0 }),
  t_skill: skl({ b: 1 }, [{ op: 'block', amount: 'b' }], { cost: 1 }),
  t_boost: skl({ n: 1, add: 1 }, [{ op: 'chooseDiscard', n: 'n' }, { op: 'dieAdd', amount: 'add' }], { cost: 0 }),
  t_double: skl({ f: 2 }, [{ op: 'dieMultiply', factor: 'f' }], { cost: 0 }),
  t_count: skl({ look: 3, keep: 1 }, [{ op: 'topKeep', look: 'look', keep: 'keep' }], { cost: 0 }),
  t_loaded: skl({ lo: 3, hi: { of: 'dieMax' } }, [{ op: 'chooseDie', min: 'lo', max: 'hi' }],
    { cost: 1, gate: { dieNotSetThisTurn: true } }),
  t_house: skl({ n: 2 }, [{ op: 'forceMax', count: 'n' }], { cost: 0 }),
  t_coin: skl({ w: 7, l: 3 }, [{ op: 'chance', p: 1, win: [{ op: 'block', amount: 'w' }], lose: [{ op: 'block', amount: 'l' }] }], { cost: 0 }),
  t_drain: atk({ dmg: 10, h: { of: 'damageDealt', div: 2 } }, [{ op: 'damage', amount: 'dmg' }, { op: 'heal', amount: 'h' }], { cost: 0 }),
  t_first: atk({ dmg: 10 }, [{ op: 'damage', amount: 'dmg' }], { cost: 1, gate: { firstCardThisTurn: true } }),
});

test('formula params: damage = 2× the roll, shown live and resolved identically', () => {
  const c = makeCombat();
  const [w] = giveHand(c, ['t_wild']);
  setRoll(c, 4);
  const token = describeCard(getCard('t_wild'), c)[0].parts.find((p) => typeof p === 'object');
  assert.equal(token.base, '2× your roll');
  assert.equal(token.value, 8);
  const hp = c.enemy.hp;
  playCard(c, w);
  assert.equal(hp - c.enemy.hp, 8);
});

test('spell counter: Skills/Powers played this turn feed a formula', () => {
  const c = makeCombat();
  c.player.energy = 5;
  const [s1, s2, b] = giveHand(c, ['t_skill', 't_skill', 't_barrage']);
  playCard(c, s1);
  playCard(c, s2);
  const hp = c.enemy.hp;
  playCard(c, b);
  assert.equal(hp - c.enemy.hp, 5);
});

test('F1: a 2-card discount applies to the next two cards, then stops', () => {
  const c = makeCombat();
  c.player.energy = 3;
  const [s, a, b, d] = giveHand(c, ['t_surge', 't_skill', 't_skill', 't_skill']);
  playCard(c, s);
  assert.equal(cardCost(c, c.piles.hand[0]), 0);
  playCard(c, a);
  playCard(c, b);
  assert.equal(c.player.energy, 3);
  assert.equal(cardCost(c, c.piles.hand.find((x) => x.uid === d)), 1);
});

test('D3: a discount is not spent on a card that is already free', () => {
  const c = makeCombat();
  const [f, s, z, k] = giveHand(c, ['t_free', 't_surge', 't_hit', 't_skill']);
  playCard(c, s); // 2 discounts
  playCard(c, z); // cost 0 already: nothing spent
  assert.equal(c.turnState.discountNext, 2);
  playCard(c, f);
  playCard(c, k); // free-next makes it 0; the -1 discount lowered it first and was spent
  assert.equal(c.player.energy, 3);
  assert.equal(c.turnState.discountNext, 1);
  assert.equal(c.turnState.freeNext, 1, 'free charge not needed once the discount made it 0');
});

test('F3: Shadow Artist+ discounts the first 3 cards on every turn, not just the first', () => {
  const c = makeCombat({ deck: Array(12).fill('defend') });
  addStatus(c, 'player', 'shadowArtistPlus', 1);
  for (let turn = 0; turn < 2; turn++) {
    const costs = [];
    for (let i = 0; i < 4; i++) {
      const card = c.piles.hand[0];
      costs.push(cardCost(c, card));
      playCard(c, card.uid);
    }
    assert.deepEqual(costs, [0, 0, 0, 1], `turn ${turn + 1}`);
    forceIntent(c, { kind: 'defend', block: 8 });
    endTurn(c);
  }
});

test('Shadow Artist: the 2nd and 4th card each turn cost 0', () => {
  const c = makeCombat({ deck: Array(12).fill('defend') });
  addStatus(c, 'player', 'shadowArtist', 1);
  c.player.energy = 9;
  const costs = [];
  for (let i = 0; i < 5; i++) {
    const card = c.piles.hand[0];
    costs.push(cardCost(c, card));
    playCard(c, card.uid);
  }
  assert.deepEqual(costs, [1, 0, 1, 0, 1]);
});

test('Echo: the next Attack resolves twice', () => {
  const c = makeCombat();
  const [e, h] = giveHand(c, ['t_echo', 't_hit']);
  playCard(c, e);
  const hp = c.enemy.hp;
  playCard(c, h);
  assert.equal(hp - c.enemy.hp, 8);
  assert.equal(c.turnState.echo, 0);
});

test('D2: a mark bonus waits for a damaging Attack, then goes through Vulnerable', () => {
  const c = makeCombat();
  const [m, sk, nd, h] = giveHand(c, ['t_mark', 't_skill', 't_nodmg', 't_hit']);
  playCard(c, m);
  playCard(c, sk);
  playCard(c, nd);
  assert.equal(c.turnState.markBonus, 5, 'not spent by a Skill or a no-damage Attack');
  c.enemy.statuses.vulnerable = 1;
  const hp = c.enemy.hp;
  playCard(c, h); // (4 + 5) × 1.5 = 13
  assert.equal(hp - c.enemy.hp, 13);
  assert.equal(c.turnState.markBonus, 0);
});

test('D2: a mark bonus survives a failed gated Attack', () => {
  const c = makeCombat();
  c.player.energy = 5;
  const [m, s, f] = giveHand(c, ['t_mark', 't_skill', 't_first']);
  playCard(c, m);
  playCard(c, s);
  playCard(c, f); // not the first card: fizzles
  assert.equal(c.turnState.markBonus, 5);
});

test('choices: a pending discard locks the turn until answered, then the card resumes', () => {
  const c = makeCombat();
  const [boost, a, b] = giveHand(c, ['t_boost', 'strike', 'strike']);
  setRoll(c, 3);
  playCard(c, boost);
  assert.equal(c.pending.kind, 'cards');
  assert.equal(endTurn(c), false);
  assert.equal(playability(c, c.piles.hand[0]).ok, false);
  assert.equal(reroll(c), false);
  assert.equal(resolveChoice(c, [a, b]), false, 'wrong count rejected');
  assert.ok(resolveChoice(c, [b]));
  assert.equal(c.pending, null);
  assert.equal(c.die.value, 4, 'the op after the choice ran');
  assert.deepEqual(c.piles.hand.map((x) => x.uid), [a]);
  assert.ok(c.piles.discard.some((x) => x.uid === b));
});

test('choices: with exactly as many options as required, the choice resolves itself', () => {
  const c = makeCombat();
  const [boost, a] = giveHand(c, ['t_boost', 'strike']);
  playCard(c, boost);
  assert.equal(c.pending, null);
  assert.ok(c.piles.discard.some((x) => x.uid === a));
});

test('look at the top 3, keep 1: the rest are discarded and no card is lost', () => {
  const c = makeCombat({ deck: Array(10).fill('defend') });
  const card = c.piles.hand[0];
  c.piles.hand[0] = { uid: 999, key: 't_count' };
  c.piles.draw.push(card);
  const before = allCards(c).length;
  const drawBefore = c.piles.draw.length;
  playCard(c, 999);
  assert.equal(c.pending.cards.length, 3);
  assert.equal(allCards(c).length, before, 'revealed cards are tracked while pending');
  resolveChoice(c, [c.pending.cards[1].uid]);
  assert.equal(c.piles.draw.length, drawBefore - 3);
  assert.equal(c.piles.hand.length, 5);
  assert.equal(allCards(c).length, before);
});

test('choose a die value; the once-per-turn set limit gates a second set', () => {
  const c = makeCombat();
  c.player.energy = 3;
  const [l1, l2] = giveHand(c, ['t_loaded', 't_loaded']);
  playCard(c, l1);
  assert.deepEqual([c.pending.min, c.pending.max], [3, 6]);
  assert.equal(resolveChoice(c, 7), false);
  resolveChoice(c, 5);
  assert.equal(c.die.value, 5);
  playCard(c, l2); // die already set: fizzles, Energy refunded
  assert.equal(c.pending, null);
  assert.equal(c.player.energy, 2);
});

test('F6: die changes are clamped to the die faces', () => {
  const c = makeCombat();
  const [d] = giveHand(c, ['t_double']);
  setRoll(c, 5);
  playCard(c, d);
  assert.equal(c.die.value, 6);
});

test('F8: forced-max charges end with the combat', () => {
  const c = makeCombat();
  const [h] = giveHand(c, ['t_house']);
  playCard(c, h);
  assert.equal(rollDie(c, 'reroll'), 6);
  assert.equal(c.die.forcedMax, 1);
  const next = createCombat(c.run, 'ratEasy');
  assert.equal(next.die.forcedMax, 0);
});

test("House Edge raises the floor; Gambler's Fallacy forces a max after N misses", () => {
  const c = makeCombat({ seed: 3 });
  addStatus(c, 'player', 'houseEdge', 4);
  for (let i = 0; i < 50; i++) assert.ok(rollDie(c, 'reroll') >= 4);
  const f = makeCombat({ seed: 3 });
  addStatus(f, 'player', 'gamblerFallacy', 2);
  let misses = 0;
  for (let i = 0; i < 200; i++) {
    const v = rollDie(f, 'reroll');
    misses = v === 6 ? 0 : misses + 1;
    assert.ok(misses < 2, 'never two non-max rolls in a row');
  }
});

test('Lucky Streak: a max roll draws 1 and deals true damage', () => {
  const c = makeCombat({ deck: Array(10).fill('defend') });
  addStatus(c, 'player', 'luckyStreak', 4);
  c.die.forcedMax = 1;
  const hand = c.piles.hand.length;
  const hp = c.enemy.hp;
  c.enemy.block = 10;
  rollDie(c, 'reroll');
  assert.equal(c.piles.hand.length, hand + 1);
  assert.equal(hp - c.enemy.hp, 4, 'ignores Block');
});

test('Vampiric Form: a 1 or max grants Fly (and Regen from the upgrade data)', () => {
  const c = makeCombat();
  addStatus(c, 'player', 'vampiricForm', 1, { regen: 2 });
  c.die.forcedMax = 1;
  rollDie(c, 'reroll');
  assert.equal(c.player.statuses.fly, 1);
  assert.equal(c.player.statuses.regen, 2);
});

test('F7: Arcane Momentum works on the turn it is played, and previews the raised die', () => {
  const c = makeCombat();
  addStatus(c, 'player', 'momentum', 1);
  setRoll(c, 5);
  const [s] = giveHand(c, ['t_skill']);
  playCard(c, s);
  assert.equal(c.die.value, 6);
  const [ws] = giveHand(c, ['warshout']); // even affinity: previews 6+1 → 6 (clamped), even
  assert.equal(describeCard(getCard('warshout'), c).find((l) => l.kind === 'affinity').active, true);
  assert.ok(ws);
});

test('Blood Lord heals after an Attack; Lethal Rhythm hits on every 2nd card', () => {
  const c = makeCombat({ hp: 50 });
  addStatus(c, 'player', 'bloodLord', 2);
  addStatus(c, 'player', 'lethalRhythm', 3);
  const [a, b] = giveHand(c, ['t_hit', 't_hit']);
  const hp = c.enemy.hp;
  playCard(c, a);
  playCard(c, b);
  assert.equal(hp - c.enemy.hp, 4 + 4 + 3);
  assert.equal(c.player.hp, 54);
});

test('Eternal Hunger: base is a flat 2 per tick; the upgrade is 2 per stack, max 15 per turn', () => {
  const run = (data) => {
    const c = makeCombat({ enemy: 'armoredKnight' });
    addStatus(c, 'player', 'eternalHunger', 1, data);
    addStatus(c, 'player', 'regen', 10);
    const hp = c.enemy.hp;
    forceIntent(c, { kind: 'defend', block: 8 });
    endTurn(c);
    return hp - c.enemy.hp;
  };
  assert.equal(run({ flat: 2 }), 2);
  assert.equal(run({ perStack: 2, cap: 15 }), 15);
  assert.equal(run({ perStack: 2 }), 20, 'uncapped per-stack, for reference');
});

test('Burning Soul / Poison Master add per stack; Cold Mastery deepens Chill', async () => {
  const { burnTick, poisonTick, enemyAttackDamage } = await import('../src/engine/damage.js');
  const c = makeCombat();
  c.enemy.statuses = { burn: 4, poison: 3, chill: 1 };
  c.player.statuses = { burningSoul: 1, poisonMaster: 2, coldMastery: 25 };
  assert.equal(burnTick(c), 8);
  assert.equal(poisonTick(c), 9);
  assert.equal(enemyAttackDamage(c, 10), 5);
});

test('chance ops run the matching branch', () => {
  const c = makeCombat();
  const [coin] = giveHand(c, ['t_coin']);
  playCard(c, coin);
  assert.equal(c.player.block, 7);
});

test('damageDealt: a heal can read the HP damage its own hits did (after Block)', () => {
  const c = makeCombat({ hp: 50 });
  c.enemy.block = 4;
  const [d] = giveHand(c, ['t_drain']);
  playCard(c, d); // 10 - 4 Block = 6 HP → heal 3
  assert.equal(c.player.hp, 53);
});

test('D5: a max roll grants the Gambler one bonus reroll, once per turn', () => {
  const c = makeCombat({ hero: 'gambler', deck: Array(10).fill('defend') });
  c.die.forcedMax = 2;
  c.die.rerollsLeft = 1;
  c.turnState.maxRollRerollUsed = false; // the opening roll may already have been a max
  rollDie(c, 'reroll');
  assert.equal(c.die.rerollsLeft, 2);
  rollDie(c, 'reroll');
  assert.equal(c.die.rerollsLeft, 2, 'once per turn');
  const barb = makeCombat({ deck: Array(10).fill('defend') });
  barb.die.forcedMax = 1;
  barb.die.rerollsLeft = 1;
  rollDie(barb, 'reroll');
  assert.equal(barb.die.rerollsLeft, 1, 'Gambler only');
});

test('multiplyStatus respects its cap and the Regen hard cap', async () => {
  const { OPS } = await import('../src/engine/ops.js');
  const c = makeCombat();
  addStatus(c, 'enemy', 'poison', 8);
  OPS.multiplyStatus.run({ c, params: {} }, { target: 'enemy', status: 'poison', max: 20 }, 3);
  assert.equal(c.enemy.statuses.poison, 20);
  addStatus(c, 'player', 'regen', 6);
  OPS.multiplyStatus.run({ c, params: {} }, { target: 'player', status: 'regen' }, 3);
  assert.equal(c.player.statuses.regen, 10);
  assert.ok(eventsOf(c).length > 0);
});
