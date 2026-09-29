// Step 3d: Floors 2–4 enemies and elites. One rule test per fix in PHASE3_PLAN §3, plus the
// intent-list, hook and mirroring machinery they run on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCombat, giveHand, setRoll, eventsOf, forceIntent, actionOf } from './helpers.js';
import { playCard, endTurn, startTurn } from '../src/engine/combat.js';
import { previewIntent, planIntent, resolveIntent, createEnemy, describeAbilities, ABILITIES } from '../src/engine/enemies.js';
import { mirrorSnapshot } from '../src/engine/mirror.js';
import { addStatus, stacks } from '../src/engine/statuses.js';
import { hitEnemy, damageEnemyDirect, playerAttackDamage } from '../src/engine/damage.js';
import { cardCost } from '../src/engine/costs.js';
import { FLOOR_POOLS, ENEMIES } from '../src/content/enemies.js';

/** A combat against `enemy` with a harmless hand, parked on the player's turn. */
function vs(enemy, opts = {}) {
  const c = makeCombat({ enemy, hp: 400, ...opts });
  c.player.maxHp = 400;
  return c;
}

/** Ends the turn and returns the HP the player lost. */
function takeTurn(c) {
  const before = c.player.hp;
  endTurn(c);
  return before - c.player.hp;
}

// ── Content ──

test('every Floor 2–4 enemy and elite describes itself without a hole in the text', () => {
  for (const [floor, pool] of Object.entries(FLOOR_POOLS)) {
    for (const id of [...pool.standard, ...pool.elite]) {
      const e = createEnemy(id);
      const described = describeAbilities(e);
      assert.equal(described.length, e.abilities.length + (e.pattern.id === 'standard' ? 0 : 1), id);
      for (const d of described) {
        assert.ok(d.name && !/undefined|NaN/.test(d.name), `${id}: ability name "${d.name}"`);
        assert.doesNotMatch(d.text, /undefined|NaN|\[object/, `floor ${floor} ${id}: ${d.text}`);
      }
    }
  }
});

test('every ability an enemy declares is wired to something that can run', () => {
  for (const [id, def] of Object.entries(ENEMIES)) {
    for (const a of def.abilities || []) {
      const spec = ABILITIES[a.id];
      const wired = spec.trigger || spec.guard || spec.onDeath || spec.action || spec.rider || spec.statusImmune;
      assert.ok(wired, `${id}: ability "${a.id}" is declared but nothing dispatches it`);
      if (spec.trigger) assert.equal(typeof spec.run, 'function', `${id}: ${a.id} has a trigger but no run()`);
    }
  }
});

// ── Intent lists (R5) ──

test('Loyal is an action in the intent, so the attack behind it already shows the Strength', () => {
  const c = vs('throneGuard');
  const plan = previewIntent(c);
  assert.deepEqual(plan.actions.map((a) => a.kind), ['buff', 'attack']);
  assert.equal(plan.actions[0].n, 2);
  // 16 base + 2 Strength it is about to gain = 18, not 16.
  assert.equal(actionOf(plan).perHit, 18);
  assert.equal(takeTurn(c), 18);
  assert.equal(stacks(c.enemy, 'rage'), 2);
  // Second turn: the 2 it already has, plus the 2 it is about to gain.
  assert.equal(actionOf(previewIntent(c)).perHit, 20);
  assert.equal(takeTurn(c), 20);
});

test("Ritual and Arcane Overload are extra actions, on the turns they fire", () => {
  const c = vs('bloodCultist');
  for (let i = 0; i < 3; i++) {
    assert.ok(!previewIntent(c).actions.some((a) => a.kind === 'burst'), `turn ${i + 1}`);
    endTurn(c);
  }
  const burst = previewIntent(c).actions.find((a) => a.kind === 'burst');
  assert.equal(burst.label, 'Ritual');
  assert.equal(burst.amount, 20);
  const lost = takeTurn(c);
  assert.equal(lost, previewIntent(c) && 14 + 20, 'the attack and the Ritual both land');

  const r = vs('royalSorcerer');
  endTurn(r); endTurn(r);
  const over = previewIntent(r).actions.find((a) => a.kind === 'burst');
  assert.equal(over.label, 'Arcane Overload');
  assert.equal(over.amount, 25);
});

test('a burst goes through the enemy pipeline, so Weak and Chill reduce it', () => {
  const c = vs('royalSorcerer');
  endTurn(c); endTurn(c);
  addStatus(c, 'enemy', 'weak', 1);
  const over = previewIntent(c).actions.find((a) => a.kind === 'burst');
  assert.equal(over.amount, Math.floor(25 * 0.75));
});

// ── Floor 2 ──

test('Phase: untouchable on alternate turns, to every damage source, and shown on the intent', () => {
  const c = vs('shadowWraith');
  assert.equal(previewIntent(c).phased, false, 'turn 1 is always solid');
  assert.equal(hitEnemy(c, 10, 'card'), 10);
  endTurn(c); // now player turn 2
  assert.equal(c.turn, 2);
  assert.equal(previewIntent(c).phased, true);
  assert.equal(hitEnemy(c, 10, 'card'), 0, 'card damage');
  assert.equal(damageEnemyDirect(c, 10, 'burn'), 0, 'a Burn tick too (decision D7)');
  endTurn(c);
  assert.equal(previewIntent(c).phased, false);
  assert.equal(hitEnemy(c, 10, 'card'), 10);
});

test('Phase+: two hits on the turns it is solid, one on the turns it is not', () => {
  const c = vs('shadowWraithPlus');
  assert.equal(actionOf(previewIntent(c)).hits, 2, 'player turn 1 is solid');
  endTurn(c);
  assert.equal(previewIntent(c).phased, true);
  assert.equal(actionOf(previewIntent(c)).hits, 1);
});

test('Poison Arrow applies Poison per hit, and the intent says so', () => {
  const c = vs('boneArcher');
  assert.deepEqual(actionOf(previewIntent(c)).onHit, { status: 'poison', stacks: 2 });
  const hp = c.player.hp;
  endTurn(c);
  // Step 6 lands the hit and the 2 Poison; step 7 ticks it in the same turn and drops a stack —
  // the same timing the enemy's own Poison has always had, now that the player can carry it.
  assert.equal(hp - c.player.hp, 12 + 2, 'the hit, then the first Poison tick');
  assert.equal(stacks(c.player, 'poison'), 1);
});

test('Acid Touch strips Block before the hit, not after it is spent', () => {
  const c = vs('cryptCrawler');
  c.player.block = 10;
  const plan = actionOf(previewIntent(c));
  assert.equal(plan.strip.taken, 4);
  const lost = takeTurn(c);
  // 10 Block, 4 stripped, 6 left absorbs 6 of the 8 damage: 2 reaches HP.
  assert.equal(lost, 2);
});

test("Blood Bat's Drain gains the Block it strips; Void Drain heals for it instead", () => {
  const bat = vs('bloodBat');
  bat.player.block = 10;
  endTurn(bat);
  assert.equal(bat.enemy.block, 3);

  const wraith = vs('voidWraith');
  wraith.player.block = 10;
  wraith.enemy.hp = 50;
  endTurn(wraith);
  assert.equal(wraith.enemy.hp, 52);
});

test('Undying revives from a hit, but never from a Burn or Poison tick', () => {
  const c = vs('cursedKnight');
  c.enemy.block = 0;
  hitEnemy(c, 500, 'card');
  assert.equal(c.enemy.hp, 15, 'revived once');
  hitEnemy(c, 500, 'card');
  assert.equal(c.enemy.hp, 0, 'only once');

  const burned = vs('cursedKnight');
  burned.enemy.block = 0;
  damageEnemyDirect(burned, 500, 'burn');
  assert.equal(burned.enemy.hp, 0, 'a killing Burn tick is final (GDD §4)');

  const plus = vs('cursedKnightPlus');
  plus.enemy.block = 0;
  hitEnemy(plus, 500, 'card');
  assert.equal(plus.enemy.hp, 20);
  hitEnemy(plus, 500, 'card');
  assert.equal(plus.enemy.hp, 20, 'twice');
  hitEnemy(plus, 500, 'card');
  assert.equal(plus.enemy.hp, 0);
});

// ── Floor 3 ──

test('Arcane Burn applies player Burn every turn, and it ticks (decision D2)', () => {
  const c = vs('darkSorcerer');
  endTurn(c);
  assert.equal(stacks(c.player, 'burn'), 2, 'applied at its turn start');
  const hp = c.player.hp;
  c.player.block = 50; // Burn ignores Block
  endTurn(c);
  // Its own turn applies 2 more; this turn's tick took 2 and dropped a stack.
  assert.equal(c.player.hp, hp - 2 - 0, 'the Burn tick ignored Block');
  assert.equal(stacks(c.player, 'burn'), 3);
});

test('player Poison ticks after the enemy acts, ignoring Block', () => {
  const c = vs('castleGuard');
  addStatus(c, 'player', 'poison', 3);
  c.player.block = 50;
  const hp = c.player.hp;
  endTurn(c);
  assert.equal(hp - c.player.hp, 3);
  assert.equal(stacks(c.player, 'poison'), 2);
});

test('Stone Skin absorbs the first 5 damage of each of your turns', () => {
  const c = vs('stoneGargoyle');
  const hp = c.enemy.hp;
  hitEnemy(c, 3, 'card');
  assert.equal(c.enemy.hp, hp, 'fully absorbed');
  hitEnemy(c, 10, 'card');
  assert.equal(c.enemy.hp, hp - 8, 'the remaining 2 of the pool absorbed, 8 landed');
  hitEnemy(c, 10, 'card');
  assert.equal(c.enemy.hp, hp - 18, 'the pool is spent for this turn');
  endTurn(c);
  hitEnemy(c, 10, 'card');
  assert.equal(c.enemy.hp, hp - 23, 'refilled at the start of your next turn');
});

test('Dark Blessing heals once, the first time it drops below half', () => {
  const c = vs('corruptedPriest');
  c.enemy.hp = 40; // above 39
  endTurn(c);
  assert.equal(c.enemy.hp, 40);
  c.enemy.hp = 30;
  endTurn(c);
  assert.equal(c.enemy.hp, 38, 'healed 8');
  c.enemy.hp = 10;
  endTurn(c);
  assert.equal(c.enemy.hp, 10, 'only once');
});

test("Void Stalker's Curse raises one card in hand, for that turn only", () => {
  const c = vs('voidStalker', { deck: Array(10).fill('strike') });
  assert.ok(c.turnState.cursedUid, 'a card was cursed at turn start');
  const cursed = c.piles.hand.find((x) => x.uid === c.turnState.cursedUid);
  const other = c.piles.hand.find((x) => x.uid !== c.turnState.cursedUid);
  assert.equal(cardCost(c, cursed), cardCost(c, other) + 2, 'the hand shows the raised cost');
  const uid = c.turnState.cursedUid;
  endTurn(c);
  assert.notEqual(c.turnState.cursedUid, uid, 'a fresh pick, or none, next turn');
});

// ── Elites ──

test('Soul Drain costs an Energy on your first turn only', () => {
  const c = vs('deathKnight');
  assert.equal(c.player.energy, c.player.maxEnergy - 1);
  endTurn(c);
  assert.equal(c.player.energy, c.player.maxEnergy);
});

test('Bone Wall answers a Skill with Block, once per turn, and resets it each of its turns', () => {
  const c = vs('boneGolem', { deck: Array(10).fill('defend') });
  const [a, b] = giveHand(c, ['defend', 'defend']);
  playCard(c, a);
  assert.equal(c.enemy.block, 8);
  playCard(c, b);
  assert.equal(c.enemy.block, 8, 'once per turn, not once per Skill — it would be unkillable');
  endTurn(c);
  assert.equal(c.enemy.block, 0, 'reset at its own turn start');
});

test('Bone Wall ignores Attacks', () => {
  const c = vs('boneGolem', { deck: Array(10).fill('strike') });
  const [s] = giveHand(c, ['strike']);
  playCard(c, s);
  assert.equal(c.enemy.block, 0);
});

test('Holy Wrath doubles that attack only while you hold the Block, and never compounds', () => {
  const c = vs('sanctumGuardian');
  assert.equal(actionOf(previewIntent(c)).perHit, 17);
  c.player.block = 15;
  const plan = actionOf(previewIntent(c));
  assert.equal(plan.doubled, true);
  assert.equal(plan.perHit, 34, 'the intent shows the doubled number while it holds');
  endTurn(c);
  assert.equal(c.enemy.damage, 17, 'its damage was not permanently changed');
  c.player.block = 0;
  assert.equal(actionOf(previewIntent(c)).perHit, 17, 'back to base once the Block is gone');
});

test('Unbreakable refuses every status, from either side', () => {
  const c = vs('kingsChampion');
  addStatus(c, 'enemy', 'vulnerable', 3);
  addStatus(c, 'enemy', 'burn', 5);
  assert.deepEqual(c.enemy.statuses, {});
  assert.ok(eventsOf(c, 'immune').length >= 2, 'the attempt is reported, so a card can say "immune"');
  addStatus(c, 'player', 'weak', 1);
  assert.equal(stacks(c.player, 'weak'), 1, 'the player is unaffected by its immunity');
});

test('Collapse adds your Block as damage that ignores Block, read before the hit', () => {
  const c = vs('voidColossus');
  c.player.block = 12;
  const plan = actionOf(previewIntent(c));
  assert.equal(plan.collapse, 12);
  const lost = takeTurn(c);
  // 18 damage into 12 Block leaves 6, plus 12 Collapse straight to HP.
  assert.equal(lost, 6 + 12);
});

test('Collapse adds nothing when you hold no Block', () => {
  const c = vs('voidColossus');
  assert.equal(actionOf(previewIntent(c)).collapse, undefined);
  assert.equal(takeTurn(c), 18);
});

// ── Spell Steal and card mirroring (R7, D6) ──

test('Spell Steal casts the last card you played back at you', () => {
  const c = vs('darkArcanist', { deck: Array(10).fill('strike') });
  const [s] = giveHand(c, ['strike']);
  playCard(c, s);
  const mirror = previewIntent(c).actions.find((a) => a.kind === 'mirror');
  assert.equal(mirror.name, 'Strike');
  assert.equal(mirror.damage, 6, "Strike's 6, through the enemy's pipeline");
  assert.equal(takeTurn(c), 6);
});

test('Spell Steal falls back to a normal attack when you played nothing', () => {
  const c = vs('darkArcanist');
  assert.equal(actionOf(previewIntent(c)).perHit, 15);
  assert.equal(takeTurn(c), 15);
});

test('a mirrored card sends Block to the enemy and debuffs to you', () => {
  const c = vs('darkArcanist', { hero: 'mage', deck: Array(10).fill('strike') });
  c.player.maxHp = 400;
  c.player.hp = 400;
  const [d] = giveHand(c, ['defend']);
  playCard(c, d);
  const mirror = previewIntent(c).actions.find((a) => a.kind === 'mirror');
  assert.equal(mirror.block, 5, "your Defend's Block goes to it");
  assert.equal(mirror.damage, 0);
  endTurn(c);
  assert.equal(c.enemy.block, 5);
});

test('mirroring skips a card with nothing to mirror, and the intent falls back', () => {
  // Arcane Boost is die manipulation and a discard: nothing about it points at a player.
  assert.equal(mirrorSnapshot(makeCombat({ hero: 'mage' }), 'arcaneboost'), null);
  const c = vs('darkArcanist', { hero: 'mage', deck: Array(10).fill('strike') });
  const [b] = giveHand(c, ['arcaneboost', 'strike']);
  playCard(c, b);
  assert.equal(previewIntent(c).actions.find((a) => a.kind === 'mirror'), undefined);
  assert.ok(actionOf(previewIntent(c)), 'it attacks instead');
});

test('a stolen card is frozen as it was cast, so the intent cannot drift', () => {
  // Combustion scales with the enemy's Burn, which step 1 ticks down before the enemy acts.
  const c = vs('darkArcanist', { hero: 'mage', deck: Array(10).fill('strike') });
  addStatus(c, 'enemy', 'burn', 6);
  const [x] = giveHand(c, ['combustion']);
  setRoll(c, 6);
  playCard(c, x);
  const shown = previewIntent(c).actions.find((a) => a.kind === 'mirror').damage;
  const hp = c.player.hp;
  endTurn(c);
  assert.equal(hp - c.player.hp, shown, 'the number shown is the number that lands');
});

test('Spell Steal forgets last turn: it only copies a card from the turn it fires', () => {
  const c = vs('darkArcanist', { deck: Array(10).fill('strike') });
  const [s] = giveHand(c, ['strike']);
  playCard(c, s);
  endTurn(c);
  assert.equal(previewIntent(c).actions.find((a) => a.kind === 'mirror'), undefined);
});
