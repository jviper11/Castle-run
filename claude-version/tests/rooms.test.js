// Phase 3b: rest sites, shops and the Soul Forge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, addCard, restOptions, restHeal, restUpgrade, restRemove, restLeave, shopBuy, shopRemove, shopUpgrade,
  shopLeave, soulBuy, soulLeave } from '../src/engine/run.js';
import { createCombat, reroll, useSecondDie, useGamblersEdge, endTurn } from '../src/engine/combat.js';
import { soulOffers, soulCost, applySoulUpgrade } from '../src/engine/soul.js';
import { createShopStock } from '../src/engine/shop.js';
import { affinityMet, rollDie, setDie } from '../src/engine/dice.js';
import { SHOP } from '../src/content/rooms.js';

/** A run parked on a given screen, with a small known deck. */
function runAt(screen, { hero = 'barbarian', gold = 500 } = {}) {
  const run = createRun({ seed: 11, heroKey: hero });
  run.deck = [];
  ['strike', 'strike', 'defend', 'heavyblow'].forEach((k) => addCard(run, k));
  run.gold = gold;
  run.path = 'A';
  run.index = 3;
  run.state = screen === 'shop' ? { screen, stock: createShopStock(run) }
    : screen === 'soulForge' ? { screen, offers: soulOffers(run) } : { screen };
  return run;
}

// ── Rest ──

test('rest: heal 30% of max HP (rounded down), then back to the doors facing the next room', () => {
  const run = runAt('rest');
  run.hp = 20;
  assert.equal(restOptions(run).heal, 27);
  assert.ok(restHeal(run));
  assert.equal(run.hp, 47);
  assert.deepEqual([run.state.screen, run.index], ['doors', 4]);
  assert.equal(restHeal(run), false, 'one action per rest');
});

test('rest: healing is unavailable at full HP', () => {
  const run = runAt('rest');
  assert.equal(restOptions(run).canHeal, false);
  assert.equal(restHeal(run), false);
});

test('rest: upgrade and removal change exactly one copy', () => {
  const up = runAt('rest');
  const [s1, s2] = up.deck;
  assert.ok(restUpgrade(up, s2.uid));
  assert.deepEqual([s1.key, s2.key], ['strike', 'strike+']);
  const rm = runAt('rest');
  const target = rm.deck[1].uid;
  assert.ok(restRemove(rm, target));
  assert.equal(rm.deck.length, 3);
  assert.ok(!rm.deck.some((x) => x.uid === target));
  assert.equal(rm.deck.filter((x) => x.key === 'strike').length, 1);
});

test('rest: rest removal may take a Strike; you can only leave when no action is possible', () => {
  const run = runAt('rest');
  assert.equal(restLeave(run), false);
  run.deck = [];
  assert.equal(restOptions(run).canLeave, true);
  assert.ok(restLeave(run));
});

// ── Shop ──

test('shop: the fixed stock plus a die tile; cards bought once at exactly their price (X2)', () => {
  const run = runAt('shop');
  const ids = run.state.stock.map((x) => x.id).sort();
  assert.deepEqual(ids, ['blizzard', 'dieTile', 'hunterDie', 'ironwall', 'lifeleech']);
  const gold = run.gold;
  assert.ok(shopBuy(run, 'ironwall'));
  assert.equal(run.gold, gold - 65);
  assert.equal(run.goldSpent, 65);
  assert.ok(run.deck.some((x) => x.key === 'ironwall'));
  assert.equal(shopBuy(run, 'ironwall'), false, 'sold');
  assert.equal(run.deck.filter((x) => x.key === 'ironwall').length, 1);
});

test('shop: dice cannot be bought until step 3c; too little Gold is refused', () => {
  const run = runAt('shop', { gold: 59 });
  assert.equal(shopBuy(run, 'hunterDie'), false);
  assert.equal(shopBuy(run, 'dieTile'), false);
  assert.equal(shopBuy(run, 'blizzard'), false);
  assert.equal(run.gold, 59);
});

test('shop: removal costs 75, never takes Strike/Defend, and can be repeated', () => {
  const run = runAt('shop');
  const strike = run.deck.find((x) => x.key === 'strike');
  assert.equal(shopRemove(run, strike.uid), false);
  const blow = run.deck.find((x) => x.key === 'heavyblow');
  assert.ok(shopRemove(run, blow.uid));
  assert.equal(run.gold, 500 - SHOP.removePrice);
  addCard(run, 'warshout');
  assert.ok(shopRemove(run, run.deck.at(-1).uid), 'a second removal in the same visit');
});

test('shop: upgrade costs 80 and upgrades one copy; leaving returns to the doors', () => {
  const run = runAt('shop');
  const s = run.deck[0];
  assert.ok(shopUpgrade(run, s.uid));
  assert.equal(s.key, 'strike+');
  assert.equal(run.gold, 420);
  assert.equal(shopUpgrade(run, s.uid), false, 'already upgraded');
  assert.ok(shopLeave(run));
  assert.deepEqual([run.state.screen, run.index], ['doors', 4]);
});

// ── Soul Forge ──

test('Soul Forge: 3 offers from the eligible upgrades; owned one-time upgrades are not offered again', () => {
  const run = runAt('soulForge');
  assert.equal(run.state.offers.length, 3);
  applySoulUpgrade(run, 'grit');
  for (let i = 0; i < 50; i++) assert.ok(!soulOffers(run).includes('grit'));
  assert.equal(soulOffers(run).length, 3);
});

test('Soul Forge: Vitality costs 3, then 4, then 5; buying one moves on to the next floor', () => {
  const run = runAt('soulForge');
  run.souls = 20;
  assert.equal(soulCost(run, 'vitality'), 3);
  run.state.offers = ['vitality', 'grit', 'momentum'];
  run.hp = 10;
  assert.ok(soulBuy(run, 'vitality'));
  assert.deepEqual([run.maxHp, run.hp, run.souls], [96, 96, 17]);
  assert.equal(soulCost(run, 'vitality'), 4);
  assert.deepEqual([run.state.screen, run.floor], ['pathSelect', 1]);
});

test('Soul Forge: an upgrade you cannot afford is refused; leaving keeps your Souls', () => {
  const run = runAt('soulForge');
  run.souls = 4;
  run.state.offers = ['momentum', 'overdraw', 'grit'];
  assert.equal(soulBuy(run, 'momentum'), false);
  assert.equal(soulBuy(run, 'vitality'), false, 'not on offer');
  assert.ok(soulLeave(run));
  assert.equal(run.souls, 4);
});

// ── Soul upgrades in combat ──

function fight(setup, hero = 'barbarian') {
  const run = createRun({ seed: 3, heroKey: hero });
  run.deck = [];
  Array(12).fill('defend').forEach((k) => addCard(run, k));
  setup.forEach((id) => applySoulUpgrade(run, id));
  return createCombat(run, 'ratEasy');
}

test('Grit: +5 Block on turn 1 only; Momentum / Reckless Surge: +1 Energy each; Overdraw: draw 6', () => {
  const c = fight(['grit', 'momentum', 'recklessSurge', 'overdraw']);
  assert.equal(c.player.block, 5);
  assert.equal(c.player.energy, 5);
  assert.equal(c.piles.hand.length, 6);
  assert.equal(c.run.maxHp, 85, 'Reckless Surge: −5 Max HP');
  c.enemy.intent = { kind: 'defend', block: 8 };
  endTurn(c);
  assert.equal(c.player.block, 0, 'Grit is not repeated on turn 2');
});

test('Steady Hand: one extra reroll per combat, used after the turn\'s own', () => {
  const c = fight(['steadyHand']);
  assert.ok(reroll(c));
  assert.ok(reroll(c));
  assert.equal(reroll(c), false);
  c.enemy.intent = { kind: 'defend', block: 8 };
  endTurn(c);
  assert.ok(reroll(c));
  assert.equal(reroll(c), false, 'the bonus charge does not refresh');
});

test('Second Die: once per combat, +1 or +2, capped at the max face', () => {
  const c = fight(['secondDie']);
  c.die.value = 5;
  assert.ok(useSecondDie(c));
  assert.equal(c.die.value, 6);
  assert.equal(useSecondDie(c), false);
  assert.equal(useSecondDie(fight([])), false, 'needs the upgrade');
});

test("Gambler's Edge: once per combat, uses the once-per-turn set", () => {
  const c = fight(['gamblersEdge']);
  setDie(c, 3);
  assert.equal(useGamblersEdge(c, 6), false, 'the die was already set this turn');
  c.enemy.intent = { kind: 'defend', block: 8 };
  endTurn(c);
  assert.ok(useGamblersEdge(c, 4));
  assert.equal(c.die.value, 4);
  c.enemy.intent = { kind: 'defend', block: 8 };
  endTurn(c);
  assert.equal(useGamblersEdge(c, 4), false, 'once per combat');
});

test("Gambler's Edge downside: a natural roll of your affinity max does not meet the affinity", () => {
  let seen = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const run = createRun({ seed, heroKey: 'thief' });
    applySoulUpgrade(run, 'gamblersEdge');
    const c = createCombat(run, 'ratEasy');
    for (let i = 0; i < 10; i++) {
      rollDie(c, 'reroll');
      if (c.die.value === 5) { // the Thief's (Odd) affinity maximum on a d6
        seen += 1;
        assert.equal(affinityMet(c, 'odd'), false);
        setDie(c, 5); // a forced 5 is exempt
        assert.equal(affinityMet(c, 'odd'), true);
        break;
      }
      if (c.die.value === 3) assert.equal(affinityMet(c, 'odd'), true, 'other odd rolls are unaffected');
    }
  }
  assert.ok(seen > 5);
});
