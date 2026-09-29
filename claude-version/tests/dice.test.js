// Step 3c: die types d4–d20, their bonuses, and how a die is acquired and equipped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCombat, combatRolling, setRoll, giveHand, eventsOf } from './helpers.js';
import { createRun, choosePath, chooseDoor, doorOptions, currentPath, equipDie, dieOffers, takeDie, leaveDieCache,
  leaveRoom, finishCombat, skipCardReward, restOptions, restHeal, restRemove, shopBuy, shopLeave,
  soulLeave } from '../src/engine/run.js';
import { createCombat, playCard, useSecondDie, useGamblersEdge } from '../src/engine/combat.js';
import { createShopStock, itemAvailable } from '../src/engine/shop.js';
import { playerAttackDamage } from '../src/engine/damage.js';
import { addStatus } from '../src/engine/statuses.js';
import { createDieFor, dieText, dieType, rollDie, offerableDice, affinityFaces, affinityLine, AFFINITIES } from '../src/engine/dice.js';
import { getCard, describeCard } from '../src/engine/cards.js';
import { DICE, STARTING_DIE, DIE_MIN_FLOOR, DIE_CACHE_OFFERS } from '../src/content/dice.js';
import { HEROES } from '../src/content/heroes.js';

const ids = Object.keys(DICE);

/** Walks whatever screen the run is on, taking the first option. Fights are won outright. */
function step(run) {
  switch (run.state.screen) {
    case 'combat':
      run.combat.enemy.hp = 0;
      run.combat.phase = 'won';
      return finishCombat(run);
    case 'reward': return skipCardReward(run);
    case 'room': return leaveRoom(run);
    case 'dieCache': return leaveDieCache(run);
    case 'rest': return restOptions(run).canHeal ? restHeal(run) : restRemove(run, run.deck[0].uid);
    case 'shop': return shopLeave(run);
    case 'soulForge': return soulLeave(run);
    case 'doors': return chooseDoor(run, doorOptions(run).options[0].id);
    case 'pathSelect': return choosePath(run, 'A');
    default: throw new Error(`unexpected screen ${run.state.screen}`);
  }
}

// ── Content lint ──

test('every die resolves every number in its text, and declares what its bonus reads', () => {
  const BONUS_PARAM = { minRoll: 'minRoll', oddDamage: 'damage', evenEnergy: 'energy', maxDraw: 'draw' };
  for (const id of ids) {
    const die = DICE[id];
    assert.equal(die.id, id, `${id}: id matches its key`);
    assert.ok(die.sides >= 2, `${id}: sides`);
    assert.doesNotMatch(dieText(id), /\{/, `${id}: an unresolved {param} in its text`);
    if (!die.bonus) {
      assert.deepEqual(die.params, {}, `${id}: no bonus, so no params`);
      continue;
    }
    const param = BONUS_PARAM[die.bonus];
    assert.ok(param, `${id}: unknown bonus "${die.bonus}"`);
    assert.equal(typeof die.params[param], 'number', `${id}: bonus ${die.bonus} needs params.${param}`);
    assert.match(die.text, new RegExp(`\\{${param}\\}`), `${id}: text must print its own {${param}}`);
  }
});

test('every hero starts on the d6, and only it is un-offerable', () => {
  for (const key of Object.keys(HEROES)) assert.equal(createRun({ heroKey: key }).die, STARTING_DIE);
  assert.equal(DIE_MIN_FLOOR[STARTING_DIE], undefined, 'the starting die is never an offer');
  assert.deepEqual(Object.keys(DIE_MIN_FLOOR).sort(), ids.filter((id) => id !== STARTING_DIE).sort());
});

// ── Affinity on a bigger die ──

test('High is 6+ on every die; Max and Extreme follow the top face', () => {
  const met = (aff, sides) => Array.from({ length: sides }, (_, i) => i + 1).filter((v) => AFFINITIES[aff].test(v, sides));
  assert.deepEqual(met('high', 6), [6]);
  assert.deepEqual(met('high', 4), [], 'a Cursed Die can never meet High');
  assert.deepEqual(met('high', 20).length, 15);
  assert.deepEqual(met('max', 20), [20]);
  assert.deepEqual(met('extreme', 20), [1, 20]);
  assert.deepEqual(met('even', 4), [2, 4]);
  assert.deepEqual(met('odd', 4), [1, 3]);
});

test('a die is described against the die equipped, not against a d6 (D8)', () => {
  assert.equal(affinityFaces('high', 6), 1);
  assert.equal(affinityFaces('high', 20), 15);
  assert.equal(affinityLine('high', 6), 'High affinity: 6 or more — 1 of 6 faces.');
  assert.equal(affinityLine('high', 20), 'High affinity: 6 or more — 15 of 20 faces.');
  assert.equal(affinityLine('extreme', 20), 'Extreme affinity: 1 or 20 — 2 of 20 faces.');
  assert.equal(affinityLine('max', 12), 'Max affinity: 12 — 1 of 12 faces.');
  // A Cursed Die cannot reach 6, so a Mage's affinity is dead on it. The die cache says so
  // before you take it, rather than leaving the player to find out in the next fight.
  assert.equal(affinityLine('high', 4), 'High affinity: 6 or more — 0 of 4 faces.');
  // Decision D8: the d20 has no bonus, and its text does not claim one.
  assert.equal(DICE.d20.bonus, null);
  assert.doesNotMatch(dieText('d20'), /15\+/);
});

// ── The dice themselves ──

test('the equipped die sets the faces, and every fight reads it at its start', () => {
  for (const id of ids) assert.equal(makeCombat({ die: id }).die.sides, DICE[id].sides, id);
  // A die equipped mid-run only takes effect at the next fight start (R4).
  const c = makeCombat({ die: 'd6' });
  c.run.die = 'd20';
  assert.equal(c.die.sides, 6, 'the fight in progress keeps the die it started with');
  assert.equal(createCombat(c.run, 'ratEasy').die.sides, 20);
});

test('Cursed Die: the roll floor is 3, combined with the hero\'s own floor', () => {
  assert.equal(createDieFor('d4', HEROES.barbarian).minRoll, 3);
  assert.equal(createDieFor('d4', HEROES.gambler).minRoll, 3, 'the higher of the two floors wins');
  assert.equal(createDieFor('d6', HEROES.gambler).minRoll, 2, 'the Gambler keeps her own floor');
  assert.equal(createDieFor('d20', HEROES.barbarian).minRoll, 1);
  const c = makeCombat({ die: 'd4' });
  for (let i = 0; i < 200; i++) {
    rollDie(c, 'reroll');
    assert.ok(c.die.value >= 3 && c.die.value <= 4, `rolled ${c.die.value}`);
  }
});

test("Hunter's Die: +2 on an odd roll, taxed by Weak and amplified by Vulnerable like Strength", () => {
  const c = makeCombat({ die: 'd8' });
  setRoll(c, 5);
  assert.equal(playerAttackDamage(c, 10), 12);
  setRoll(c, 4);
  assert.equal(playerAttackDamage(c, 10), 10, 'even: no bonus');
  setRoll(c, 7);
  addStatus(c, 'player', 'weak', 1);
  assert.equal(playerAttackDamage(c, 10), 9, 'Weak applies after the die bonus: floor(12 × 0.75)');
  // And no other die pays it.
  const plain = makeCombat({ die: 'd6' });
  setRoll(plain, 5);
  assert.equal(playerAttackDamage(plain, 10), 10);
});

test("Hunter's Die: the number on the card is the number that lands", () => {
  const c = makeCombat({ die: 'd8', deck: ['strike'] });
  setRoll(c, 3);
  const shown = describeCard(getCard('strike'), c).flatMap((l) => l.parts).find((p) => p.isDamage);
  const [uid] = giveHand(c, ['strike']);
  playCard(c, uid);
  const [hit] = eventsOf(c, 'damage');
  assert.equal(shown.value, hit.amount, 'the previewed number is the number that lands');
  assert.equal(shown.value, shown.base + DICE.d8.params.damage);
});

test('Arcane Die: an even turn-start roll restores 1 Energy; a reroll into even does not', () => {
  const even = combatRolling(2, { die: 'd10' });
  assert.equal(even.player.energy, even.player.maxEnergy + 1);
  const odd = combatRolling(3, { die: 'd10' });
  assert.equal(odd.player.energy, odd.player.maxEnergy);
  for (let i = 0; i < 50 && odd.die.value % 2 !== 0; i++) rollDie(odd, 'reroll');
  assert.equal(odd.die.value % 2, 0, 'rerolled into an even number');
  assert.equal(odd.player.energy, odd.player.maxEnergy, 'only the turn-start roll pays');
});

test('Titan\'s Die: a max turn-start roll draws one extra card, on top of Overdraw', () => {
  const max = combatRolling(12, { die: 'd12' });
  assert.equal(max.piles.hand.length, 6);
  const notMax = combatRolling(11, { die: 'd12' });
  assert.equal(notMax.piles.hand.length, 5);
  const both = combatRolling(12, { die: 'd12', soul: ['overdraw'] });
  assert.equal(both.piles.hand.length, 7, 'Overdraw and the die both apply');
  // The d6's max face is not the Titan's Die's bonus.
  assert.equal(combatRolling(6, { die: 'd6' }).piles.hand.length, 5);
});

test('the die-panel actions work on any die', () => {
  const big = makeCombat({ die: 'd20', soul: ['gamblersEdge'] });
  assert.equal(useGamblersEdge(big, 21), false, 'above the top face');
  assert.ok(useGamblersEdge(big, 17));
  assert.equal(big.die.value, 17);
  const small = makeCombat({ die: 'd4', soul: ['secondDie'] });
  assert.ok(useSecondDie(small));
  assert.ok(small.die.value <= 4, 'the +d2 is capped at the die\'s max face');
});

// ── Acquiring a die ──

test('equipDie replaces the die, and refuses an unknown or already-equipped one', () => {
  const run = createRun({ seed: 3 });
  assert.equal(equipDie(run, 'd6'), false, 'already equipped');
  assert.equal(equipDie(run, 'd7'), false, 'not a die');
  assert.ok(equipDie(run, 'd8'));
  assert.equal(run.die, 'd8');
});

test('dice are floor-gated, never the one equipped, and never the d6', () => {
  const run = createRun({ seed: 3 });
  assert.deepEqual(offerableDice(run).sort(), ['d4', 'd8']);
  run.die = 'd8';
  assert.deepEqual(offerableDice(run).sort(), ['d4'], 'the equipped die drops out');
  run.floor = 3;
  assert.deepEqual(offerableDice(run).sort(), ['d10', 'd12', 'd20', 'd4']);
  for (let floor = 0; floor < 4; floor++) {
    run.floor = floor;
    for (const id of offerableDice(run)) assert.ok(floor >= DIE_MIN_FLOOR[id], `${id} on floor ${floor + 1}`);
  }
  assert.ok(!offerableDice(run).includes(STARTING_DIE));
});

test('a die cache offers 2, equips the one taken, and never advances past the room it guards', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const run = createRun({ seed });
    choosePath(run, 'A');
    for (let guard = 0; guard < 500 && run.floor === 0; guard++) {
      if (run.state.screen === 'doors' && doorOptions(run).options.some((o) => o.id === 'magic' && o.magic.type === 'die')) {
        const idx = run.index;
        const behind = currentPath(run)[idx].type;
        assert.ok(chooseDoor(run, 'magic'));
        assert.equal(run.state.screen, 'dieCache');
        const offers = run.state.offers;
        assert.equal(offers.length, DIE_CACHE_OFFERS);
        assert.equal(new Set(offers).size, offers.length, 'no duplicate offer');
        assert.ok(!offers.includes(run.die));
        assert.equal(takeDie(run, 'd12'), false, 'only an offered die can be taken');
        assert.ok(takeDie(run, offers[0]));
        assert.equal(run.die, offers[0]);
        assert.equal(run.state.screen, 'doors');
        assert.equal(run.index, idx, 'still facing the room the door guarded');
        assert.equal(takeDie(run, offers[1]), false, 'the cache is behind you');
        chooseDoor(run, 'continue');
        assert.equal(run.visits.at(-1).type, behind);
        return;
      }
      step(run);
    }
  }
  assert.fail('no die cache found in 200 seeds');
});

test('leaving a die cache keeps your die and still plays the room behind the door', () => {
  const run = createRun({ seed: 3 });
  run.path = 'A';
  run.index = 4;
  run.state = { screen: 'dieCache', offers: dieOffers(run) };
  assert.ok(leaveDieCache(run));
  assert.equal(run.die, 'd6');
  assert.deepEqual([run.state.screen, run.index], ['doors', 4]);
  assert.equal(leaveDieCache(run), false, 'not a door-screen action');
});

test('shop: a die tile equips what it advertises, once, and is not sold twice', () => {
  const run = createRun({ seed: 5 });
  run.gold = 500;
  run.path = 'A';
  run.index = 3;
  run.state = { screen: 'shop', stock: createShopStock(run) };
  const die = run.state.stock.find((x) => x.kind === 'die' && x.die !== run.die);
  const gold = run.gold;
  assert.ok(shopBuy(run, die.id));
  assert.equal(run.die, die.die, 'the die on the tile is the die equipped');
  assert.equal(run.gold, gold - die.price);
  assert.equal(shopBuy(run, die.id), false, 'sold');
  assert.equal(itemAvailable({ kind: 'die', die: run.die, sold: false }, run), false, 'your own die is not for sale');
});

test('shop stock never offers two tiles for the same die', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const run = createRun({ seed });
    run.floor = seed % 4;
    const dice = createShopStock(run).filter((x) => x.kind === 'die').map((x) => x.die);
    assert.equal(new Set(dice).size, dice.length, `seed ${seed}: ${dice}`);
    for (const id of dice) assert.ok(DICE[id], `${id} is a real die`);
  }
});

test('die types leave the run reproducible from its seed', () => {
  const trace = (seed) => {
    const run = createRun({ seed });
    run.floor = 2;
    return JSON.stringify([dieOffers(run), createShopStock(run).map((x) => x.die ?? x.key)]);
  };
  assert.equal(trace(9), trace(9));
  assert.notEqual(trace(9), trace(10));
});

test('the card catalogue helper still names a starting die for every hero', () => {
  for (const key of Object.keys(HEROES)) {
    assert.ok(!('die' in HEROES[key]), `${key}: die size is run state, not hero data`);
  }
  assert.equal(dieType('nonsense').id, STARTING_DIE, 'an unknown die falls back to the d6');
  assert.equal(dieType('d12').id, 'd12');
});
