// Enemy content. Data only: behaviour lives in engine/enemies.js, keyed by `pattern` and by
// ability `id`. Ability numbers are declared here and the ability text is generated from them.
//
// Stats match the reference build's js/data.js (EASY_ENEMIES, FLOOR_ENEMIES[1], ELITES[0..1]).
// Floors 2–4 arrive in Phase 3 step 3d.

export const ENEMIES = {
  // ── Floor 1 · easy pool (first two fights) ──
  guardEasy: { name: 'Castle Guard', emoji: '⚔️', hp: 45, block: 0, damage: 8, gold: 8 },
  ratEasy: { name: 'Dungeon Rat', emoji: '🐀', hp: 35, block: 0, damage: 6, gold: 5 },
  skeletonEasy: { name: 'Skeleton', emoji: '💀', hp: 40, block: 0, damage: 7, gold: 6 },

  // ── Floor 1 · standard pool ──
  castleGuard: {
    name: 'Castle Guard', emoji: '⚔️', hp: 55, block: 0, damage: 10, gold: 15,
    abilities: [{ id: 'shieldUp', every: 2, block: 6 }],
  },
  dungeonRat: {
    name: 'Dungeon Rat', emoji: '🐀', hp: 45, block: 0, damage: 7, gold: 12,
    abilities: [{ id: 'swarm', onTurn: 3, heal: 5 }],
  },
  ironArcher: {
    name: 'Iron Archer', emoji: '🏹', hp: 50, block: 0, damage: 10, gold: 14,
    pattern: { id: 'aim', multiplier: 2 },
  },
  skeleton: {
    name: 'Skeleton', emoji: '💀', hp: 48, block: 0, damage: 7, gold: 13,
    abilities: [{ id: 'reassemble', below: 10, heal: 8 }],
  },
  cursedHound: {
    name: 'Cursed Hound', emoji: '🐺', hp: 50, block: 0, damage: 10, gold: 14,
    abilities: [{ id: 'rabid', vulnerable: 1 }],
  },

  // ── Floor 1 · elites ──
  dungeonWarden: {
    name: 'Dungeon Warden', emoji: '🔒', hp: 95, block: 0, damage: 14, gold: 40,
    abilities: [{ id: 'lockdown', every: 3, weak: 1 }],
  },
  armoredKnight: {
    name: 'Armored Knight', emoji: '🛡️', hp: 110, block: 12, damage: 12, gold: 45,
    abilities: [{ id: 'ironStance', block: 6 }],
  },
};

const FLOOR_1 = {
  easy: ['guardEasy', 'ratEasy', 'skeletonEasy'], // the first 2 rooms of Floor 1 only
  standard: ['castleGuard', 'dungeonRat', 'ironArcher', 'skeleton', 'cursedHound'],
  elite: ['dungeonWarden', 'armoredKnight'],
};

// Keyed by floor number (1–4). Floors 2–4 borrow Floor 1's pools until step 3d adds their enemies;
// the combat HUD says so.
export const FLOOR_POOLS = { 1: FLOOR_1, 2: FLOOR_1, 3: FLOOR_1, 4: FLOOR_1 };
export const PLACEHOLDER_POOL_FLOORS = [2, 3, 4];

// ── Companion bosses (reference ../js/data.js BOSSES) ──
// One per floor, drawn from the four heroes you are not playing. Reference stats, which do not
// scale with floor (PHASE3_PLAN.md §5). Generic attack/defend AI, as in the reference;
// Challenges, Cores and lore arrive in Phase 5. Boss Gold is paid by the run (80), not the enemy.
const ASSETS = '../assets/';
Object.assign(ENEMIES, {
  bossBarbarian: { name: 'The Berserker', title: 'Corrupted Barbarian', emoji: '😡', hp: 90, block: 0, damage: 18, gold: 0,
    boss: true, portrait: ASSETS + 'barb_boss_original.jpg' },
  bossMage: { name: 'The Arcanist', title: 'Corrupted Mage', emoji: '🌀', hp: 80, block: 10, damage: 16, gold: 0,
    boss: true, portrait: ASSETS + 'mage_boss_original.png' },
  bossThief: { name: 'The Phantom', title: 'Corrupted Thief', emoji: '🌑', hp: 75, block: 5, damage: 14, gold: 0,
    boss: true, portrait: ASSETS + 'thief_boss_original.jpg' },
  bossGambler: { name: 'The Dealer', title: 'Corrupted Gambler', emoji: '♠️', hp: 85, block: 0, damage: 17, gold: 0,
    boss: true, portrait: ASSETS + 'gambler_boss_original.jpg' },
  bossVampire: { name: 'The Ancient', title: 'Corrupted Vampire', emoji: '🩸', hp: 95, block: 0, damage: 20, gold: 0,
    boss: true, portrait: ASSETS + 'vampire_boss_original.jpg' },
});

export const COMPANION_BOSSES = {
  barbarian: 'bossBarbarian', mage: 'bossMage', thief: 'bossThief', gambler: 'bossGambler', vampire: 'bossVampire',
};
