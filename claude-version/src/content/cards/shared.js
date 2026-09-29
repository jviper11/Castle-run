// Cards every hero can hold: the universal starters and the generic reward cards.
// Numbers from the reference build (../js/data.js CARDS / CARD_UPGRADES).

export const SHARED_CARDS = {
  // ── Shared starters ──
  strike: {
    name: 'Strike', emoji: '⚔️', type: 'attack', cost: 1,
    params: { dmg: 6 },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.',
    upgrade: { params: { dmg: 9 } },
  },
  defend: {
    name: 'Defend', emoji: '🛡️', type: 'skill', cost: 1,
    params: { block: 5 },
    ops: [{ op: 'block', amount: 'block' }],
    text: 'Gain {block} Block.',
    upgrade: { params: { block: 8 } },
  },

  // ── Shared reward cards (appear in the Barbarian pool) ──
  soulsteal: {
    name: 'Soul Steal', emoji: '👻', type: 'attack', cost: 1,
    params: { dmg: 7, souls: 1 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'souls', amount: 'souls' }],
    text: 'Deal {dmg} damage. Gain {souls|Soul}.',
    upgrade: { params: { dmg: 10, souls: 2 } },
  },
  stealheal: {
    name: 'Steal & Heal', emoji: '💉', type: 'attack', cost: 2,
    params: { dmg: 10, heal: 5 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'heal', amount: 'heal' }],
    text: 'Deal {dmg} damage. Heal {heal} HP.',
    upgrade: { params: { dmg: 14, heal: 9 } },
  },
  ironwall: {
    name: 'Iron Wall', emoji: '🧱', type: 'skill', cost: 2,
    params: { block: 14 },
    ops: [{ op: 'block', amount: 'block' }],
    text: 'Gain {block} Block.',
    upgrade: { params: { block: 20 } },
  },
  curseddice: {
    name: 'Cursed Reroll', emoji: '🎴', type: 'skill', cost: 0,
    params: { self: 3 },
    ops: [{ op: 'selfDamage', amount: 'self' }, { op: 'rerollDie' }],
    text: 'Take {self} damage. Reroll the die.',
    upgrade: { params: { self: 1 } },
  },
  ragefuel: {
    name: 'Rage Fuel', emoji: '💢', type: 'power', cost: 1,
    params: { str: 1 },
    ops: [{ op: 'status', target: 'player', status: 'rage', stacks: 'str' }],
    text: 'Gain {str} Strength.',
    upgrade: { params: { str: 2 } },
  },

};
