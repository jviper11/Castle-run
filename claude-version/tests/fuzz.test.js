// Invariant fuzzing: many seeded combats and runs played by a random agent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, choosePath, chooseDoor, useMirror, leaveRoom, finishCombat, takeCardReward, skipCardReward, doorOptions,
  restOptions, restHeal, restUpgrade, restRemove, restLeave, shopBuy, shopRemove, shopUpgrade, shopLeave, soulBuy, soulLeave,
  takeDie, leaveDieCache, faceBoss, leaveFloorClear } from '../src/engine/run.js';
import { soulCost } from '../src/engine/soul.js';
import { createCombat, playCard, endTurn, reroll, playability, resolveChoice } from '../src/engine/combat.js';
import { previewIntent } from '../src/engine/enemies.js';
import { allCards } from '../src/engine/piles.js';
import { drain } from '../src/engine/log.js';
import { createRng, int, chance, pick } from '../src/engine/rng.js';
import { ENEMIES, FLOOR_POOLS, COMPANION_BOSSES } from '../src/content/enemies.js';
import { REWARD_POOLS } from '../src/content/rewards.js';
import { DICE, DIE_CACHE_OFFERS, DIE_MIN_FLOOR } from '../src/content/dice.js';

const MAX_TURNS = 200;
const MAX_ACTIONS_PER_TURN = 80; // 0-cost loops (e.g. two Arcane Recall+) must not hang the fuzz

/** Answers a pending choice at random, sometimes trying an invalid answer first. */
function answer(c, agent) {
  const p = c.pending;
  if (chance(agent, 0.1)) assert.equal(resolveChoice(c, p.kind === 'die' ? p.max + 1 : []), false, 'invalid answer accepted');
  if (p.kind === 'die') return resolveChoice(c, p.min + int(agent, p.max - p.min + 1));
  const pool = p.cards.map((x) => x.uid);
  const picked = [];
  while (picked.length < p.count) picked.push(pool.splice(int(agent, pool.length), 1)[0]);
  return resolveChoice(c, picked);
}

/**
 * Plays one combat to the end with random choices, checking invariants after every action.
 * Returns the final phase, or 'stalemate' if neither side can win: a degenerate random deck
 * (e.g. two Strikes and Blood Lord against an enemy stacking persistent Block) can loop
 * forever, in the reference build too. Callers bound how often that may happen.
 */
function playOut(c, agent) {
  const uids = allCards(c).map((x) => x.uid).sort();
  const check = (where) => {
    for (const side of ['player', 'enemy']) {
      const u = c[side];
      assert.ok(u.hp >= 0 && u.hp <= u.maxHp, `${where}: ${side} hp ${u.hp}`);
      assert.ok(u.block >= 0, `${where}: ${side} block ${u.block}`);
      for (const [id, n] of Object.entries(u.statuses)) assert.ok(n > 0, `${where}: ${side} ${id}=${n}`);
    }
    assert.deepEqual(allCards(c).map((x) => x.uid).sort(), uids, `${where}: card lost or duplicated`);
    assert.ok(c.piles.hand.length <= c.handLimit, `${where}: hand over limit`);
    assert.ok(c.die.value >= 1 && c.die.value <= c.die.sides, `${where}: die ${c.die.value}`);
    assert.ok(c.player.energy >= 0, `${where}: energy ${c.player.energy}`);
    assert.ok(c.run.gold >= 0, `${where}: gold`);
  };

  let actions = 0;
  let turn = c.turn;
  while (c.phase === 'player') {
    if (c.turn > MAX_TURNS) return 'stalemate';
    if (c.turn !== turn) { turn = c.turn; actions = 0; }
    check(`turn ${c.turn}`);
    if (c.pending) {
      assert.ok(answer(c, agent), 'valid answer rejected');
      continue;
    }
    if (chance(agent, 0.1)) reroll(c);
    const playable = c.piles.hand.filter((card) => playability(c, card).ok);
    if (playable.length && actions++ < MAX_ACTIONS_PER_TURN && chance(agent, 0.85)) {
      const card = pick(agent, playable);
      const shownCost = playability(c, card).cost;
      drain(c);
      playCard(c, card.uid);
      const paid = drain(c).find((e) => e.type === 'play');
      assert.equal(paid.cost, shownCost, `${card.key}: displayed cost ${shownCost}, paid ${paid.cost}`);
      continue;
    }
    // Intent is the move: the plan shown before the turn ends must be the plan that resolves,
    // and every number in it must be the number that lands. An intent is a list, so this walks
    // the whole list — Loyal's Strength, a Ritual burst and a Spell Steal are all covered.
    const shown = previewIntent(c);
    drain(c);
    endTurn(c);
    const events = drain(c);
    const act = events.find((e) => e.type === 'enemyAct');
    if (act) {
      assert.deepEqual(act.intent, shown, `turn ${c.turn}: resolved a different move than was shown`);
      // Every damaging action carries `landed`: the exact amounts, in order, already accounting
      // for Fly wherever in the list the turn's first hit falls.
      const expected = shown.actions.flatMap((a) => a.landed || []);
      const landed = events
        .filter((e) => e.type === 'damage' && e.side === 'player' && e.source === 'enemy')
        .map((e) => e.amount);
      // The list is truncated when the player dies part-way through it.
      assert.deepEqual(landed, expected.slice(0, landed.length),
        `turn ${c.turn}: intent showed ${expected}, hits landed for ${landed}`);
      if (c.player.hp > 0) {
        assert.equal(landed.length, expected.length, `turn ${c.turn}: ${expected.length} hits shown, ${landed.length} landed`);
      }
    }
  }
  check('end');
  assert.ok(c.phase === 'won' || c.phase === 'lost');
  return c.phase;
}

function randomDeck(agent, hero) {
  const pool = REWARD_POOLS[hero];
  const keys = [...pool.common, ...pool.uncommon, ...pool.rare];
  const deck = ['strike', 'strike', 'defend', 'defend'];
  const extra = 4 + int(agent, 16);
  for (let i = 0; i < extra; i++) deck.push(pick(agent, keys) + (chance(agent, 0.3) ? '+' : ''));
  return deck;
}

const HEROES_WITH_CARDS = Object.keys(REWARD_POOLS);

test('every hero × every enemy × 150 random combats ends, with all invariants held', () => {
  let stalemates = 0;
  let total = 0;
  for (const hero of HEROES_WITH_CARDS) for (const enemyId of Object.keys(ENEMIES)) {
    for (let seed = 1; seed <= 150; seed++) {
      const agent = createRng(seed * 7919);
      const run = createRun({ seed, heroKey: hero });
      run.deck = randomDeck(agent, hero).map((key, i) => ({ uid: i + 1, key }));
      if (chance(agent, 0.3)) run.hp = 1 + int(agent, run.maxHp);
      // Any die may be equipped by this point in a run, so every invariant below — the intent
      // matching the hit, the die staying within its faces, Energy never going negative — is
      // checked against d4–d20 as well as the d6.
      if (chance(agent, 0.5)) run.die = pick(agent, Object.keys(DICE));
      const c = createCombat(run, enemyId);
      if (playOut(c, agent) === 'stalemate') stalemates += 1;
      total += 1;
    }
  }
  assert.ok(stalemates / total < 0.01, `${stalemates} of ${total} combats stalemated`);
});

/**
 * Plays a whole run with random choices: paths, doors (including Magic Doors), the Mirror when
 * affordable, card rewards, and every combat through playOut(). Returns 'end' or 'stalemate'.
 */
function playRun(run, agent, fought = null) {
  for (let guard = 0; guard < 5000; guard++) {
    assert.ok(run.gold >= 0 && run.souls >= 0, 'Gold and Souls never negative');
    assert.equal(new Set(run.deck.map((x) => x.uid)).size, run.deck.length, 'deck uids unique');
    switch (run.state.screen) {
      case 'end':
        return 'end';
      case 'pathSelect':
        assert.ok(choosePath(run, pick(agent, ['A', 'B', 'C'])));
        break;
      case 'doors': {
        const doors = doorOptions(run);
        if (doors.mirror?.affordable && chance(agent, 0.3)) assert.ok(useMirror(run));
        else assert.ok(chooseDoor(run, pick(agent, doors.options).id));
        break;
      }
      case 'combat':
        fought?.add(run.combat.enemy.id);
        if (playOut(run.combat, agent) === 'stalemate') return 'stalemate';
        assert.ok(finishCombat(run));
        break;
      case 'reward':
        // Up to 3: owned cards are excluded, so a well-fed deck can exhaust its pool (reference rule).
        assert.ok(run.state.reward.cards.length <= 3);
        if (run.state.reward.cards.length && chance(agent, 0.8)) assert.ok(takeCardReward(run, pick(agent, run.state.reward.cards).key));
        else assert.ok(skipCardReward(run));
        break;
      case 'room':
        assert.ok(leaveRoom(run));
        break;
      case 'bossIntro':
        assert.equal(run.combat, null, 'the intro comes before the fight');
        assert.ok(faceBoss(run));
        break;
      case 'floorClear':
        assert.equal(run.state.record, run.cleared.at(-1));
        assert.equal(run.cleared.length, run.floor + 1, 'one record per floor cleared');
        assert.ok(leaveFloorClear(run));
        break;
      case 'dieCache': {
        // Take an offered die, or leave it. Either way the room the door guarded is still ahead.
        const offers = run.state.offers;
        assert.ok(offers.length && offers.length <= DIE_CACHE_OFFERS, `die cache offers ${offers}`);
        assert.ok(!offers.includes(run.die), 'never offers the die already equipped');
        assert.ok(offers.every((id) => run.floor >= DIE_MIN_FLOOR[id]), `floor-gated: ${offers} on floor ${run.floor}`);
        if (chance(agent, 0.7)) assert.ok(takeDie(run, pick(agent, offers)));
        else assert.ok(leaveDieCache(run));
        break;
      }
      case 'rest': {
        const o = restOptions(run);
        const acts = [];
        if (o.canHeal) acts.push(() => restHeal(run));
        if (o.upgradable) acts.push(() => restUpgrade(run, pick(agent, run.deck.filter((x) => !x.key.endsWith('+'))).uid));
        if (o.removable && run.deck.length > 6) acts.push(() => restRemove(run, pick(agent, run.deck).uid));
        if (!acts.length) acts.push(o.canLeave ? () => restLeave(run) : () => restRemove(run, pick(agent, run.deck).uid));
        assert.ok(pick(agent, acts)(), 'a legal rest action');
        break;
      }
      case 'shop': {
        const goldBefore = run.gold;
        const item = pick(agent, run.state.stock);
        const bought = shopBuy(run, item.id);
        if (bought) assert.equal(run.gold, goldBefore - item.price, 'exact price paid');
        assert.equal(shopBuy(run, item.id), false, 'a bought or unavailable item cannot be bought (again)');
        if (chance(agent, 0.3) && run.deck.length > 6) shopRemove(run, pick(agent, run.deck).uid);
        if (chance(agent, 0.3)) shopUpgrade(run, pick(agent, run.deck).uid);
        if (chance(agent, 0.5)) assert.ok(shopLeave(run));
        break;
      }
      case 'soulForge': {
        const affordable = run.state.offers.filter((id) => soulCost(run, id) <= run.souls);
        if (affordable.length && chance(agent, 0.8)) assert.ok(soulBuy(run, pick(agent, affordable)));
        else assert.ok(soulLeave(run));
        break;
      }
      default:
        assert.fail(`unknown screen ${run.state.screen}`);
    }
  }
  assert.fail('run did not end');
}

test('random full runs for every hero end in victory or defeat, never skipping a room', () => {
  let stalemates = 0;
  let total = 0;
  const results = { victory: 0, defeat: 0 };
  const fought = new Set();
  const perHero = Object.fromEntries(HEROES_WITH_CARDS.map((h) => [h, { victories: 0, floors: new Set() }]));
  for (const hero of HEROES_WITH_CARDS) for (let seed = 1; seed <= 40; seed++) {
    const agent = createRng(seed * 104729);
    const run = createRun({ seed, heroKey: hero });
    // Half the runs get a huge HP pool so the random agent reaches Floors 2–4 and the run's end;
    // the other half play at normal HP, so defeat is exercised too.
    if (seed % 2) { run.hp = 2000; run.maxHp = 2000; }
    total += 1;
    if (playRun(run, agent, fought) === 'stalemate') { stalemates += 1; continue; }
    results[run.state.result] += 1;
    if (run.state.result === 'victory') perHero[hero].victories += 1;
    for (let f = 0; f <= run.floor; f++) perHero[hero].floors.add(f);
    // Per floor, rooms were entered at consecutive indices (a die cache repeats the index it guards).
    for (let f = 0; f <= run.floor; f++) {
      const idx = run.visits.filter((v) => v.floor === f && v.type !== 'die').map((v) => v.index);
      idx.forEach((v, i) => assert.equal(v, i, `${hero} seed ${seed} floor ${f + 1}: rooms ${idx}`));
    }
  }
  assert.ok(results.victory > 0 && results.defeat > 0, JSON.stringify(results));
  assert.ok(stalemates / total < 0.02, `${stalemates} of ${total} runs stalemated`);
  // Step 3f: coverage, not just survival. Every hero plays all four floors and finishes the castle
  // at least once, and every enemy, elite and companion boss is actually fought.
  for (const [hero, r] of Object.entries(perHero)) {
    assert.equal(r.floors.size, 4, `${hero} only reached floors ${[...r.floors].map((f) => f + 1)}`);
    assert.ok(r.victories > 0, `${hero} never cleared Floor 4`);
  }
  const everyone = [...Object.values(FLOOR_POOLS).flatMap((p) => [...(p.easy || []), ...p.standard, ...p.elite]),
    ...Object.values(COMPANION_BOSSES)];
  const missed = everyone.filter((id) => !fought.has(id));
  assert.deepEqual(missed, [], `never fought: ${missed.join(', ')}`);
});

test('the same seed replays the same run', () => {
  const trace = (seed) => {
    const run = createRun({ seed });
    const agent = createRng(5);
    playRun(run, agent);
    return JSON.stringify([run.state, run.floor, run.hp, run.gold, run.visits.length]);
  };
  assert.equal(trace(42), trace(42));
});
