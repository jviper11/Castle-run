// Rest site, shop and Soul Forge content. Data only. Values from the reference build
// (../js/ui.js showRestStop / showShop, ../js/data.js SHOP_ITEMS / SOUL_UPGRADES).

export const REST = {
  healPct: 30, // of max HP, rounded down
};

export const SHOP = {
  // Fixed stock for every hero, as in the reference (PHASE3_PLAN D3; flagged for design review).
  // In the reference the shelf is 4 of these plus 2 consumables; consumables arrive in Phase 4.
  items: [
    { id: 'blizzard', kind: 'card', key: 'blizzard', price: 60 },
    { id: 'hunterDie', kind: 'die', die: 'd8', name: 'Hunter Die', price: 55 },
    { id: 'lifeleech', kind: 'card', key: 'lifeleech', price: 70 },
    { id: 'ironwall', kind: 'card', key: 'ironwall', price: 65 },
  ],
  shelfSize: 4,
  dieTilePrice: 80, // a random die, gated by floor (step 3c)
  removePrice: 75, // GDD §13 says 100 (COMPARISON §H)
  upgradePrice: 80,
  // Shop removal cannot take the starter basics (reference ../js/ui.js:816). Rest removal can.
  unremovable: ['strike', 'defend'],
};

// GDD §15 Soul-spend menu. `cost` in Souls; Vitality's cost rises by `costStep` per purchase.
// Effects are applied by engine/soul.js and read at combat start. `text` uses {param} templates.
export const SOUL_UPGRADES = {
  vitality: {
    name: 'Vitality', emoji: '❤️', cost: 3, costStep: 1, repeatable: true,
    text: '+{maxHp} Max HP, and heal to full.', params: { maxHp: 6 },
  },
  grit: {
    name: 'Grit', emoji: '🛡️', cost: 5,
    text: 'Start every combat with {block} Block.', params: { block: 5 },
  },
  steadyHand: {
    name: 'Steady Hand', emoji: '✋', cost: 6,
    text: '+{rerolls} reroll per combat. It does not refresh each turn; your normal reroll is used first.',
    params: { rerolls: 1 },
  },
  secondDie: {
    name: 'Second Die', emoji: '🎲', cost: 6,
    text: 'Once per combat, after your roll, you may add a d2 (1–2) to the die, up to its max face.',
    params: {},
  },
  momentum: {
    name: 'Momentum', emoji: '⚡', cost: 8,
    text: '+{energy} Energy per turn.', params: { energy: 1 },
  },
  overdraw: {
    name: 'Overdraw', emoji: '🃏', cost: 8,
    text: 'Draw +{draw} card at the start of every turn.', params: { draw: 1 },
  },
  recklessSurge: {
    name: 'Reckless Surge', emoji: '💥', cost: 4,
    text: '+{energy} Energy per turn, but lose {maxHp} Max HP now (for the rest of the run).',
    params: { energy: 1, maxHp: 5 },
  },
  gamblersEdge: {
    name: "Gambler's Edge", emoji: '♠️', cost: 6,
    text: 'Once per combat, set the die to any value (counts as your once-per-turn set). ' +
      'Downside: a natural roll of your affinity maximum no longer counts as meeting your affinity.',
    params: {},
  },
};

export const SOUL_FORGE = { offers: 3 };
