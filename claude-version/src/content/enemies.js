// Enemy content. Data only: behaviour lives in engine/enemies.js, keyed by `pattern` and by
// ability `id`. Ability numbers are declared here and the ability text is generated from them.
//
// Stats match the reference build's js/data.js (EASY_ENEMIES, FLOOR_ENEMIES[1–4], ELITES[0..7]).
// Where the reference's ability was dead or self-contradicting, the fix is listed in
// PHASE3_PLAN.md §3 and COMPARISON.md §H7; the numbers here are still the reference's.

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
  // ── Floor 2 · Catacombs ──
  shadowWraith: {
    name: 'Shadow Wraith', emoji: '👻', hp: 60, block: 0, damage: 10, gold: 20,
    abilities: [{ id: 'phase' }],
  },
  boneArcher: {
    name: 'Bone Archer', emoji: '🦴', hp: 65, block: 0, damage: 12, gold: 20,
    abilities: [{ id: 'onHitStatus', status: 'poison', stacks: 2, label: 'Poison Arrow' }],
  },
  cursedKnight: {
    name: 'Cursed Knight', emoji: '🗡️', hp: 75, block: 8, damage: 13, gold: 25,
    abilities: [{ id: 'undying', hp: 15, times: 1 }],
  },
  cryptCrawler: {
    name: 'Crypt Crawler', emoji: '🦂', hp: 58, block: 0, damage: 8, gold: 18,
    abilities: [{ id: 'onHitBlock', amount: 4, label: 'Acid Touch' }],
  },
  bloodBat: {
    name: 'Blood Bat', emoji: '🦇', hp: 45, block: 0, damage: 8, gold: 16,
    abilities: [{ id: 'onHitBlock', amount: 3, steal: true, label: 'Drain' }],
  },

  // ── Floor 3 · Inner Sanctum ──
  darkSorcerer: {
    name: 'Dark Sorcerer', emoji: '🧙', hp: 75, block: 0, damage: 11, gold: 28,
    abilities: [{ id: 'applyEachTurn', status: 'burn', stacks: 2, label: 'Arcane Burn' }],
  },
  corruptedPriest: {
    name: 'Corrupted Priest', emoji: '🙏', hp: 78, block: 0, damage: 10, gold: 26,
    abilities: [{ id: 'darkBlessing', belowPct: 50, heal: 8 }],
  },
  shadowWraithPlus: {
    name: 'Shadow Wraith+', emoji: '👻', hp: 72, block: 0, damage: 14, gold: 28,
    abilities: [{ id: 'phase', hitsWhenSolid: 2 }],
  },
  stoneGargoyle: {
    name: 'Stone Gargoyle', emoji: '🗿', hp: 85, block: 0, damage: 11, gold: 26,
    abilities: [{ id: 'stoneSkin', amount: 5 }],
  },
  voidStalker: {
    name: 'Void Stalker', emoji: '🌑', hp: 70, block: 0, damage: 12, gold: 24,
    abilities: [{ id: 'curseCard', amount: 2 }],
  },

  // ── Floor 4 · Throne Room ──
  throneGuard: {
    name: 'Throne Guard', emoji: '👑', hp: 95, block: 0, damage: 16, gold: 38,
    abilities: [{ id: 'loyal', rage: 2 }],
  },
  bloodCultist: {
    name: 'Blood Cultist', emoji: '🩸', hp: 85, block: 0, damage: 14, gold: 35,
    abilities: [{ id: 'burst', onTurn: 4, damage: 20, label: 'Ritual' }],
  },
  royalSorcerer: {
    name: 'Royal Sorcerer', emoji: '🔮', hp: 90, block: 0, damage: 13, gold: 35,
    abilities: [{ id: 'burst', every: 3, damage: 25, label: 'Arcane Overload' }],
  },
  voidWraith: {
    name: 'Void Wraith', emoji: '🫥', hp: 88, block: 0, damage: 15, gold: 35,
    abilities: [{ id: 'onHitBlock', amount: 2, drain: true, label: 'Void Drain' }],
  },
  cursedKnightPlus: {
    name: 'Cursed Knight+', emoji: '⚔️', hp: 100, block: 8, damage: 18, gold: 40,
    abilities: [{ id: 'undying', hp: 20, times: 2 }],
  },

  // ── Elites · Floor 2 ──
  deathKnight: {
    name: 'Death Knight', emoji: '⚰️', hp: 120, block: 5, damage: 16, gold: 55,
    abilities: [{ id: 'soulDrain', energy: 1 }],
  },
  boneGolem: {
    name: 'Bone Golem', emoji: '🦴', hp: 130, block: 0, damage: 13, gold: 55,
    abilities: [{ id: 'boneWall', block: 8 }],
  },

  // ── Elites · Floor 3 ──
  sanctumGuardian: {
    name: 'Sanctum Guardian', emoji: '⛪', hp: 140, block: 0, damage: 17, gold: 70,
    abilities: [{ id: 'holyWrath', blockAtLeast: 15, multiplier: 2 }],
  },
  darkArcanist: {
    name: 'Dark Arcanist', emoji: '🌀', hp: 130, block: 0, damage: 15, gold: 70,
    abilities: [{ id: 'spellSteal' }],
  },

  // ── Elites · Floor 4 ──
  kingsChampion: {
    name: "King's Champion", emoji: '👑', hp: 160, block: 0, damage: 20, gold: 90,
    abilities: [{ id: 'unbreakable' }],
  },
  voidColossus: {
    name: 'Void Colossus', emoji: '🌌', hp: 170, block: 0, damage: 18, gold: 90,
    abilities: [{ id: 'collapse' }],
  },
};

const FLOOR_1 = {
  easy: ['guardEasy', 'ratEasy', 'skeletonEasy'], // the first 2 rooms of Floor 1 only
  standard: ['castleGuard', 'dungeonRat', 'ironArcher', 'skeleton', 'cursedHound'],
  elite: ['dungeonWarden', 'armoredKnight'],
};

// Keyed by floor number (1–4). Only Floor 1 has an easy pool: it is the opening two rooms of the
// run, and the reference has no equivalent on later floors.
export const FLOOR_POOLS = {
  1: FLOOR_1,
  2: {
    standard: ['shadowWraith', 'boneArcher', 'cursedKnight', 'cryptCrawler', 'bloodBat'],
    elite: ['deathKnight', 'boneGolem'],
  },
  3: {
    standard: ['darkSorcerer', 'corruptedPriest', 'shadowWraithPlus', 'stoneGargoyle', 'voidStalker'],
    elite: ['sanctumGuardian', 'darkArcanist'],
  },
  4: {
    standard: ['throneGuard', 'bloodCultist', 'royalSorcerer', 'voidWraith', 'cursedKnightPlus'],
    elite: ['kingsChampion', 'voidColossus'],
  },
};

export const FLOOR_NAMES = { 1: 'Castle Entrance', 2: 'Catacombs', 3: 'Inner Sanctum', 4: 'Throne Room' };

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
