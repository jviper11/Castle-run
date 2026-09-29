// Phase 3a: map generation and run flow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, choosePath, chooseDoor, useMirror, leaveRoom, leaveDieCache, finishCombat, takeCardReward,
  skipCardReward, doorOptions, currentFloor, currentPath, restOptions, restHeal, restUpgrade, restRemove, shopLeave,
  soulLeave } from '../src/engine/run.js';
import { generateMap, mirrorIndex } from '../src/engine/map.js';
import { createRng } from '../src/engine/rng.js';
import { PATH_TEMPLATES, MAGIC_DOOR, MIRROR_COST, FLOOR_COUNT } from '../src/content/map.js';
import { COMPANION_BOSSES } from '../src/content/enemies.js';

// ── Map ──

test('map properties hold over many seeds', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const map = generateMap(createRng(seed), 'barbarian');
    assert.equal(map.floors.length, FLOOR_COUNT);
    const bosses = map.floors.map((f) => f.boss);
    assert.equal(new Set(bosses).size, 4, 'four different bosses');
    assert.ok(!bosses.includes(COMPANION_BOSSES.barbarian), 'never your own hero');
    map.floors.forEach((floor, f) => {
      assert.ok(floor.length >= 13 && floor.length <= 15);
      for (const [key, rooms] of Object.entries(floor.paths)) {
        assert.equal(rooms.length, floor.length, 'all paths share the floor length');
        assert.equal(rooms[0].type, 'battle');
        rooms.forEach((room, i) => {
          if (i > 0) assert.equal(room.type, PATH_TEMPLATES[key][i], 'template prefix');
          if (i < MAGIC_DOOR.firstIndex) assert.equal(room.magic, null);
          if (room.magic?.hidden) assert.ok(f >= MAGIC_DOOR.hiddenFromFloor, 'hidden only on Floors 3–4');
        });
        assert.notEqual(floor.mirror[key], key, 'the Mirror reflects a different path');
      }
    });
  }
});

test('the same seed generates the same map', () => {
  const a = JSON.stringify(generateMap(createRng(99), 'mage'));
  assert.equal(a, JSON.stringify(generateMap(createRng(99), 'mage')));
});

// ── Flow helpers ──

/** Wins the current fight instantly (sets enemy HP to 0 and ends it through the engine). */
function winFight(run) {
  run.combat.enemy.hp = 0;
  run.combat.phase = 'won';
  assert.ok(finishCombat(run));
}

/** Plays out whatever the current screen is, taking the first option. */
function step(run) {
  switch (run.state.screen) {
    case 'combat': return winFight(run);
    case 'reward': return skipCardReward(run);
    case 'room': return leaveRoom(run);
    case 'dieCache': return leaveDieCache(run);
    case 'rest': return restOptions(run).canHeal ? restHeal(run) : restRemove(run, run.deck[0].uid);
    case 'shop': return shopLeave(run);
    case 'soulForge': return soulLeave(run);
    case 'doors': return chooseDoor(run, doorOptions(run).options[0].id);
    case 'pathSelect': return choosePath(run, 'A');
    default: throw new Error(run.state.screen);
  }
}

// ── Flow ──

test('path select enters room 0 (a battle) directly', () => {
  const run = createRun({ seed: 1 });
  assert.equal(run.state.screen, 'pathSelect');
  assert.equal(chooseDoor(run, 'continue'), false, 'illegal on this screen');
  choosePath(run, 'B');
  assert.equal(run.state.screen, 'combat');
  assert.equal(run.state.kind, 'easy', 'the first two Floor 1 rooms use the easy pool');
});

test('illegal actions are refused on every screen', () => {
  const run = createRun({ seed: 2 });
  choosePath(run, 'A');
  assert.equal(choosePath(run, 'B'), false);
  assert.equal(leaveRoom(run), false);
  assert.equal(takeCardReward(run, 'strike'), false);
  assert.equal(finishCombat(run), false, 'the fight has not ended');
  winFight(run);
  assert.equal(takeCardReward(run, 'not-offered'), false);
  assert.ok(skipCardReward(run));
  assert.equal(run.state.screen, 'doors');
  assert.equal(run.index, 1);
});

test('a full run visits every room of each chosen path exactly once, in order, and ends', () => {
  const run = createRun({ seed: 3 });
  for (let guard = 0; guard < 2000 && run.state.screen !== 'end'; guard++) step(run);
  assert.equal(run.state.result, 'victory');
  for (let f = 0; f < FLOOR_COUNT; f++) {
    const visits = run.visits.filter((v) => v.floor === f && v.type !== 'die').map((v) => v.index);
    assert.deepEqual(visits, [...Array(run.map.floors[f].length).keys()], `floor ${f + 1}`);
  }
});

test('X1: a die cache does not skip the room behind the door', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const run = createRun({ seed });
    choosePath(run, 'A');
    for (let guard = 0; guard < 500 && run.state.screen !== 'end' && run.floor === 0; guard++) {
      if (run.state.screen === 'doors') {
        const opts = doorOptions(run).options;
        const magic = opts.find((o) => o.id === 'magic' && o.magic.type === 'die');
        if (magic) {
          const idx = run.index;
          const type = currentPath(run)[idx].type;
          chooseDoor(run, 'magic');
          assert.equal(run.state.screen, 'dieCache');
          leaveDieCache(run);
          assert.equal(run.index, idx, 'still facing the same room');
          chooseDoor(run, 'continue');
          assert.equal(run.visits.at(-1).index, idx);
          assert.equal(run.visits.at(-1).type, type);
          return;
        }
      }
      step(run);
    }
  }
  assert.fail('no die cache found in 200 seeds');
});

test('a non-die Magic Door replaces the next room with its type', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const run = createRun({ seed });
    choosePath(run, 'A');
    for (let guard = 0; guard < 300 && run.floor === 0 && run.state.screen !== 'end'; guard++) {
      if (run.state.screen === 'doors') {
        const magic = doorOptions(run).options.find((o) => o.id === 'magic' && o.magic.type !== 'die');
        if (magic) {
          chooseDoor(run, 'magic');
          assert.equal(run.visits.at(-1).type, magic.magic.type);
          return;
        }
      }
      step(run);
    }
  }
  assert.fail('no magic room door found');
});

test('Mirror: offered once per floor at the halfway point, shows its target, keeps the room index', () => {
  const run = createRun({ seed: 4 });
  run.gold = 1000;
  choosePath(run, 'C');
  const floor = currentFloor(run);
  while (!(run.state.screen === 'doors' && run.index === mirrorIndex(floor))) step(run);
  const offer = doorOptions(run).mirror;
  assert.equal(offer.target, floor.mirror.C);
  assert.equal(offer.cost, MIRROR_COST[0]);
  assert.deepEqual(offer.preview, floor.paths[offer.target].slice(run.index).map((r) => r.type));
  const index = run.index;
  const gold = run.gold;
  assert.ok(useMirror(run));
  assert.equal(run.path, offer.target);
  assert.equal(run.index, index, 'same room index on the new path');
  assert.equal(run.gold, gold - MIRROR_COST[0]);
  assert.equal(doorOptions(run).mirror, null, 'once per floor');
  assert.equal(useMirror(run), false);
});

test('Mirror cannot be used without enough Gold', () => {
  const run = createRun({ seed: 4 });
  choosePath(run, 'A');
  const floor = currentFloor(run);
  while (!(run.state.screen === 'doors' && run.index === mirrorIndex(floor))) step(run);
  run.gold = MIRROR_COST[0] - 1;
  assert.equal(doorOptions(run).mirror.affordable, false);
  assert.equal(useMirror(run), false);
  assert.equal(run.path, 'A');
});

test('the boss door follows the last room; a floor boss pays 80 Gold, heals fully, then the Soul Forge', () => {
  const run = createRun({ seed: 5 });
  choosePath(run, 'A');
  while (!(run.state.screen === 'doors' && doorOptions(run).options[0].id === 'boss')) step(run);
  assert.equal(run.index, currentPath(run).length);
  chooseDoor(run, 'boss');
  assert.equal(run.state.kind, 'boss');
  assert.equal(run.combat.enemy.id, currentFloor(run).boss);
  run.combat.player.hp = 10;
  const gold = run.gold;
  winFight(run);
  assert.equal(run.hp, run.maxHp);
  assert.equal(run.gold, gold + 80);
  assert.equal(run.state.reward.souls, 3);
  skipCardReward(run);
  assert.equal(run.state.screen, 'soulForge');
  assert.equal(run.state.offers.length, 3);
  soulLeave(run);
  assert.equal(run.state.screen, 'pathSelect');
  assert.equal(run.floor, 1);
});

test('dying ends the run with a defeat', () => {
  const run = createRun({ seed: 6 });
  choosePath(run, 'A');
  run.combat.player.hp = 0;
  run.combat.phase = 'lost';
  finishCombat(run);
  assert.deepEqual([run.state.screen, run.state.result], ['end', 'defeat']);
  assert.equal(run.hp, 0);
});

test('quiet rooms (event placeholders) are passed through and keep their pacing slot', () => {
  const run = createRun({ seed: 7 });
  choosePath(run, 'C'); // Path C: event at index 2
  while (!(run.state.screen === 'room' && run.state.room === 'event')) step(run);
  const idx = run.index;
  leaveRoom(run);
  assert.equal(run.index, idx + 1);
  assert.equal(run.state.screen, 'doors');
});
