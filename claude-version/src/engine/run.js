import { createRng, pick, shuffle, next, randomSeed } from './rng.js';
import { createCombat } from './combat.js';
import { generateMap, mirrorIndex } from './map.js';
import { HEROES } from '../content/heroes.js';
import { FLOOR_POOLS } from '../content/enemies.js';
import { REWARD_POOLS, REWARD_ODDS } from '../content/rewards.js';
import { FLOOR_COUNT, MIRROR_COST } from '../content/map.js';
import { REST, SHOP } from '../content/rooms.js';
import { soulOffers, soulCost, applySoulUpgrade } from './soul.js';
import { createShopStock, itemAvailable, canShopRemove, canUpgrade, upgradeCopy, removeCopy } from './shop.js';

// The run: everything that persists between fights, and the flow between rooms.
//
// The run is a small state machine. `run.state.screen` is always exactly one of:
//   pathSelect → doors → (combat → reward | rest | shop | room) → doors … → boss → reward
//   → soulForge → pathSelect (next floor) … → end
// ('room' is a placeholder for rooms whose content arrives later: events, the die cache.)
// Every player action below checks the current screen and returns false if it is not legal
// there, so the UI cannot drive the run into a state the rules don't allow. The UI only renders
// the current state.
//
// Position: run.floor (0-based), run.path ('A'|'B'|'C'), run.index (the room being played, or the
// next room when on the door screen). The run deck keeps per-copy identity ({ uid, key }).

export const STARTING_GOLD = 30;
export const BOSS_GOLD = 80;
const SOULS = { easy: 1, normal: 1, elite: 2, boss: 3 };

export function createRun({ heroKey = 'barbarian', seed = randomSeed() } = {}) {
  const hero = HEROES[heroKey];
  const rng = createRng(seed);
  const run = {
    seed,
    rng,
    heroKey,
    hp: hero.hp,
    maxHp: hero.hp,
    maxEnergy: 3,
    gold: STARTING_GOLD,
    souls: 0,
    deck: [],
    nextUid: 1,
    rareOffset: 0,
    lastEnemy: null,
    goldSpent: 0,
    // Soul Forge results, read by createCombat() at every fight start.
    soul: {}, // purchases by upgrade id
    startBlock: 0,
    bonusRerolls: 0,
    extraDraw: 0,
    map: generateMap(rng, heroKey),
    floor: 0,
    path: null,
    index: 0,
    combat: null,
    state: { screen: 'pathSelect' },
    visits: [], // every room entered: { floor, path, index, type } — used by tests and the map view
  };
  hero.starterDeck.forEach((key) => addCard(run, key));
  return run;
}

export function addCard(run, key) {
  const card = { uid: run.nextUid++, key };
  run.deck.push(card);
  return card;
}

export const currentFloor = (run) => run.map.floors[run.floor];
export const currentPath = (run) => currentFloor(run).paths[run.path];
const at = (run, screen) => run.state.screen === screen;

// ── Path select ──

export function choosePath(run, key) {
  if (!at(run, 'pathSelect') || !currentFloor(run).paths[key]) return false;
  run.path = key;
  run.index = 0;
  enterRoom(run, currentPath(run)[0]); // the first room is entered directly, as in the reference
  return true;
}

// ── Doors ──

/**
 * What the door screen offers for the next room. `continue` always shows the real room; a
 * Magic Door shows its contents unless hidden. The Mirror is offered at the halfway point, once
 * per floor, and names its destination before you pay (D5).
 */
export function doorOptions(run) {
  const floor = currentFloor(run);
  const path = currentPath(run);
  if (run.index >= path.length) return { boss: floor.boss, options: [{ id: 'boss' }], mirror: null };
  const room = path[run.index];
  const options = [{ id: 'continue', room: room.type }];
  if (room.magic) options.push({ id: 'magic', magic: room.magic });
  let mirror = null;
  if (run.index === mirrorIndex(floor) && !floor.mirrorUsed) {
    const target = floor.mirror[run.path];
    const cost = MIRROR_COST[run.floor];
    mirror = { target, cost, affordable: run.gold >= cost, preview: floor.paths[target].slice(run.index).map((r) => r.type) };
  }
  return { boss: null, options, mirror };
}

export function chooseDoor(run, id) {
  if (!at(run, 'doors')) return false;
  const floor = currentFloor(run);
  const path = currentPath(run);
  if (id === 'boss') {
    if (run.index < path.length) return false;
    startFight(run, 'boss', floor.boss);
    return true;
  }
  const room = path[run.index];
  if (!room) return false;
  if (id === 'continue') {
    room.magic = null;
    enterRoom(run, room);
    return true;
  }
  if (id === 'magic' && room.magic) {
    const magic = room.magic;
    room.magic = null;
    if (magic.type === 'die') {
      // A die cache is its own stop; the room behind the door is still played (fix X1).
      run.state = { screen: 'room', room: 'die', returnTo: 'doors' };
      run.visits.push({ floor: run.floor, path: run.path, index: run.index, type: 'die' });
      return true;
    }
    path[run.index] = { type: magic.type, magic: null };
    enterRoom(run, path[run.index]);
    return true;
  }
  return false;
}

/** Pays for the Mirror and switches to the reflected path at the same room index (D5). */
export function useMirror(run) {
  if (!at(run, 'doors')) return false;
  const offer = doorOptions(run).mirror;
  if (!offer || !offer.affordable) return false;
  run.gold -= offer.cost;
  currentFloor(run).mirrorUsed = true;
  run.path = offer.target;
  return true; // still on the door screen, now showing the new path's next room
}

// ── Rooms ──

function enterRoom(run, room) {
  run.visits.push({ floor: run.floor, path: run.path, index: run.index, type: room.type });
  if (room.type === 'battle' || room.type === 'elite') {
    const easy = run.floor === 0 && run.index < 2 && room.type === 'battle';
    const kind = room.type === 'elite' ? 'elite' : easy ? 'easy' : 'normal';
    const pools = FLOOR_POOLS[run.floor + 1];
    const pool = kind === 'elite' ? pools.elite : kind === 'easy' ? pools.easy : pools.standard;
    const options = pool.length > 1 ? pool.filter((id) => id !== run.lastEnemy) : pool;
    startFight(run, kind, pick(run.rng, options));
    return;
  }
  if (room.type === 'rest') run.state = { screen: 'rest' };
  else if (room.type === 'shop') run.state = { screen: 'shop', stock: createShopStock(run) };
  // Event rooms are quiet-room placeholders until Phase 4 (content/map.js).
  else run.state = { screen: 'room', room: room.type, returnTo: 'next' };
}

/** Back to the door screen, facing the room after the one just finished. */
function roomDone(run) {
  run.index += 1;
  run.state = { screen: 'doors' };
  return true;
}

function startFight(run, kind, enemyId) {
  run.lastEnemy = enemyId;
  run.combat = createCombat(run, enemyId, { kind });
  run.state = { screen: 'combat', kind };
}

/** Leaves a placeholder room (quiet room, die cache). */
export function leaveRoom(run) {
  if (!at(run, 'room')) return false;
  if (run.state.returnTo === 'next') return roomDone(run);
  run.state = { screen: 'doors' }; // a die cache: the room behind the door is still ahead
  return true;
}

// ── Rest site: exactly one action (reference). ──

export function restOptions(run) {
  const heal = Math.floor((run.maxHp * REST.healPct) / 100);
  const canHeal = run.hp < run.maxHp;
  const upgradable = run.deck.some(canUpgrade);
  const removable = run.deck.length > 0;
  // The reference has no way to leave without acting, which soft-locks at full HP with nothing to
  // upgrade and an empty deck. Leaving is offered only in that case (COMPARISON §H).
  return { heal, canHeal, upgradable, removable, canLeave: !canHeal && !upgradable && !removable };
}

export function restHeal(run) {
  if (!at(run, 'rest') || !restOptions(run).canHeal) return false;
  run.hp = Math.min(run.maxHp, run.hp + restOptions(run).heal);
  return roomDone(run);
}

export function restUpgrade(run, uid) {
  if (!at(run, 'rest') || !upgradeCopy(run, uid)) return false;
  return roomDone(run);
}

export function restRemove(run, uid) {
  if (!at(run, 'rest') || !removeCopy(run, uid)) return false;
  return roomDone(run);
}

export function restLeave(run) {
  if (!at(run, 'rest') || !restOptions(run).canLeave) return false;
  return roomDone(run);
}

// ── Shop: buy any number of things, then leave. ──

function spend(run, amount) {
  if (run.gold < amount) return false;
  run.gold -= amount;
  run.goldSpent += amount;
  return true;
}

export function shopBuy(run, itemId) {
  if (!at(run, 'shop')) return false;
  const item = run.state.stock.find((x) => x.id === itemId);
  if (!item || !itemAvailable(item) || !spend(run, item.price)) return false;
  item.sold = true;
  if (item.kind === 'card') addCard(run, item.key);
  return true;
}

export function shopRemove(run, uid) {
  if (!at(run, 'shop')) return false;
  const card = run.deck.find((x) => x.uid === uid);
  if (!card || !canShopRemove(card) || run.gold < SHOP.removePrice) return false;
  spend(run, SHOP.removePrice);
  return removeCopy(run, uid);
}

export function shopUpgrade(run, uid) {
  if (!at(run, 'shop')) return false;
  const card = run.deck.find((x) => x.uid === uid);
  if (!card || !canUpgrade(card) || run.gold < SHOP.upgradePrice) return false;
  spend(run, SHOP.upgradePrice);
  return upgradeCopy(run, uid);
}

export function shopLeave(run) {
  if (!at(run, 'shop')) return false;
  return roomDone(run);
}

// ── Soul Forge: after the Floor 1–3 bosses. One purchase, or leave with your Souls. ──

export function soulBuy(run, id) {
  if (!at(run, 'soulForge') || !run.state.offers.includes(id)) return false;
  const cost = soulCost(run, id);
  if (run.souls < cost) return false;
  run.souls -= cost;
  applySoulUpgrade(run, id);
  return startNextFloor(run);
}

export function soulLeave(run) {
  if (!at(run, 'soulForge')) return false;
  return startNextFloor(run);
}

// ── Combat results and rewards ──

/** Call once the combat has ended. Writes results back and moves to the reward or end screen. */
export function finishCombat(run) {
  const c = run.combat;
  if (!at(run, 'combat') || !c || (c.phase !== 'won' && c.phase !== 'lost')) return false;
  run.hp = c.player.hp;
  run.combat = null;
  if (c.phase === 'lost') {
    run.state = { screen: 'end', result: 'defeat', enemy: c.enemy.name };
    return true;
  }
  const kind = run.state.kind;
  const reward = { gold: c.enemy.gold, souls: SOULS[kind], boss: kind === 'boss', cards: null };
  if (kind === 'boss') {
    // Reference order: boss Gold and a full heal, then the card reward.
    reward.gold += BOSS_GOLD;
    reward.healed = run.maxHp - run.hp;
    run.hp = run.maxHp;
  }
  run.gold += reward.gold;
  run.souls += reward.souls;
  reward.cards = rollCardReward(run, { elite: kind === 'elite' });
  run.state = { screen: 'reward', reward };
  return true;
}

export function takeCardReward(run, key) {
  if (!at(run, 'reward') || !run.state.reward.cards.some((c) => c.key === key)) return false;
  addCard(run, key);
  return afterReward(run);
}

export function skipCardReward(run) {
  if (!at(run, 'reward')) return false;
  run.gold += REWARD_ODDS.skipGold;
  return afterReward(run);
}

function afterReward(run) {
  if (!run.state.reward.boss) return roomDone(run);
  // Floor cleared. The last floor's boss ends this build's run (Aldric arrives in Phase 5).
  if (run.floor === FLOOR_COUNT - 1) run.state = { screen: 'end', result: 'victory' };
  else run.state = { screen: 'soulForge', offers: soulOffers(run) };
  return true;
}

function startNextFloor(run) {
  run.floor += 1;
  run.path = null;
  run.index = 0;
  run.state = { screen: 'pathSelect' };
  return true;
}

// ── Card rewards ──

/**
 * Reference behaviour (js/ui.js showReward): one rarity roll for the whole offer, cards already
 * in the deck are excluded, and a thin bucket is topped up from the other rarities.
 */
export function rollCardReward(run, { elite = false } = {}) {
  const odds = elite ? REWARD_ODDS.elite : REWARD_ODDS.normal;
  const pool = REWARD_POOLS[run.heroKey];
  const rareChance = odds.rare + (elite ? 0 : Math.min(run.rareOffset, REWARD_ODDS.pityCap));
  const roll = next(run.rng) * 100;
  let rarity;
  if (roll < rareChance) {
    rarity = 'rare';
    if (!elite) run.rareOffset = 0;
  } else if (roll < rareChance + odds.uncommon) {
    rarity = 'uncommon';
  } else {
    rarity = 'common';
    if (!elite) run.rareOffset += 1;
  }
  const owned = new Set(run.deck.map((card) => card.key));
  const eligible = (r) => pool[r].filter((key) => !owned.has(key));
  let bucket = eligible(rarity);
  if (bucket.length < REWARD_ODDS.choices) {
    const rest = ['common', 'uncommon', 'rare'].filter((r) => r !== rarity).flatMap(eligible);
    bucket = [...new Set([...bucket, ...rest])];
  }
  return shuffle(run.rng, bucket).slice(0, REWARD_ODDS.choices).map((key) => ({ key, rarity: rarityOf(run.heroKey, key) }));
}

export function rarityOf(heroKey, key) {
  const pool = REWARD_POOLS[heroKey];
  return ['rare', 'uncommon', 'common'].find((r) => pool[r].includes(key)) ?? 'starter';
}
