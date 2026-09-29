// Thief — affinity Odd. Numbers from the reference build (../js/data.js CARDS / CARD_UPGRADES).
// Deliberate differences are listed in COMPARISON.md (§F).

export const THIEF_CARDS = {
  // ── Starters ──
  quickstrike: {
    name: 'Quick Strike', emoji: '💨', type: 'attack', cost: 1, affinity: 'odd',
    params: { dmg: 4 }, onAffinity: { dmg: 5 },
    ops: [{ op: 'damage', amount: 'dmg', hits: 2 }],
    text: 'Deal {dmg} damage twice.', affinityText: 'Deal {dmg} twice instead.',
    upgrade: { params: { dmg: 6 }, onAffinity: { dmg: 8 } },
  },
  shadowstep: {
    name: 'Shadow Step', emoji: '🌑', type: 'skill', cost: 1, affinity: 'odd',
    params: { block: 4, draw: 0 }, onAffinity: { block: 7, draw: 1 },
    ops: [{ op: 'block', amount: 'block' }, { op: 'draw', n: 'draw' }],
    text: 'Gain {block} Block.', affinityText: 'Gain {block} Block and draw {draw|card}.',
    upgrade: { params: { block: 6 }, onAffinity: { block: 10, draw: 2 } },
  },
  poisonblade: {
    name: 'Poison Blade', emoji: '☠️', type: 'attack', cost: 2, affinity: 'odd',
    params: { dmg: 6, poison: 0 }, onAffinity: { poison: 3 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'status', target: 'enemy', status: 'poison', stacks: 'poison' }],
    text: 'Deal {dmg} damage.', affinityText: 'Also apply {poison} Poison.',
    upgrade: { params: { dmg: 9 }, onAffinity: { poison: 5 } },
  },
  pickpocket: {
    name: 'Pick Pocket', emoji: '👛', type: 'skill', cost: 1, affinity: 'odd',
    params: { draw: 2, gold: 0 }, onAffinity: { gold: 5 },
    ops: [{ op: 'draw', n: 'draw' }, { op: 'gainGold', amount: 'gold' }],
    text: 'Draw {draw|card}.', affinityText: 'Also gain {gold} Gold.',
    upgrade: { onAffinity: { gold: 8 } },
  },
  smokescreen: {
    name: 'Smoke Screen', emoji: '💨', type: 'skill', cost: 1,
    params: { block: 6, discard: 1, draw: 1 },
    ops: [{ op: 'block', amount: 'block' }, { op: 'chooseDiscard', n: 'discard' }, { op: 'draw', n: 'draw' }],
    text: 'Gain {block} Block. Discard {discard|card} of your choice, then draw {draw|card}.',
    upgrade: { params: { block: 9 } },
  },

  // ── Commons ──
  swiftjab: {
    name: 'Swift Jab', emoji: '👊', type: 'attack', cost: 0, affinity: 'odd',
    params: { dmg: 3 }, onAffinity: { dmg: 5 },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 4 }, onAffinity: { dmg: 7 } },
  },
  slipaway: {
    name: 'Slip Away', emoji: '🏃', type: 'skill', cost: 0, affinity: 'odd',
    params: { draw: 1, block: 0 }, onAffinity: { block: 2 },
    ops: [{ op: 'draw', n: 'draw' }, { op: 'block', amount: 'block' }],
    text: 'Draw {draw|card}.', affinityText: 'Also gain {block} Block.',
    upgrade: { params: { draw: 2 }, onAffinity: { block: 3 } },
  },
  cheapshot: {
    name: 'Cheap Shot', emoji: '🥊', type: 'attack', cost: 1, affinity: 'odd',
    params: { dmg: 5, weak: 1 }, onAffinity: { weak: 2 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'status', target: 'enemy', status: 'weak', stacks: 'weak' }],
    text: 'Deal {dmg} damage. Apply {weak} Weak.', affinityText: 'Apply {weak} Weak instead.',
    upgrade: { params: { dmg: 7 }, onAffinity: { weak: 3 } },
  },
  coinflick: {
    name: 'Coin Flick', emoji: '🟡', type: 'skill', cost: 1, affinity: 'odd',
    params: { gold: 4, draw: 0 }, onAffinity: { draw: 1 },
    ops: [{ op: 'gainGold', amount: 'gold' }, { op: 'draw', n: 'draw' }],
    text: 'Gain {gold} Gold.', affinityText: 'Also draw {draw|card}.',
    upgrade: { cost: 0, params: { gold: 6 } },
  },
  nimblepace: {
    name: 'Nimble Pace', emoji: '🦶', type: 'skill', cost: 1, affinity: 'odd',
    params: { draw: 2, discard: 1 }, onAffinity: { draw: 3 },
    ops: [{ op: 'draw', n: 'draw' }, { op: 'chooseDiscard', n: 'discard' }],
    text: 'Draw {draw|card}, then discard {discard|card} of your choice.', affinityText: 'Draw {draw} instead.',
    upgrade: { params: { draw: 3 }, onAffinity: { draw: 4 } },
  },

  // ── Uncommons ──
  envenomdagger: {
    name: 'Envenom', emoji: '🗡️', type: 'attack', cost: 1, affinity: 'odd',
    params: { dmg: 4, poison: 2 }, onAffinity: { poison: 4 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'status', target: 'enemy', status: 'poison', stacks: 'poison' }],
    text: 'Deal {dmg} damage. Apply {poison} Poison.', affinityText: 'Apply {poison} Poison instead.',
    upgrade: { params: { dmg: 6, poison: 3 }, onAffinity: { poison: 6 } },
  },
  backstab: {
    name: 'Backstab', emoji: '🔪', type: 'attack', cost: 1, affinity: 'odd',
    gate: { firstCardThisTurn: true },
    params: { dmg: 10 }, onAffinity: { dmg: 14 },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Only as your first card this turn. Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 13 }, onAffinity: { dmg: 18 } },
  },
  cripple: {
    name: 'Cripple', emoji: '🦵', type: 'skill', cost: 1, affinity: 'odd',
    params: { weak: 2, vuln: 1 }, onAffinity: { vuln: 2 },
    ops: [
      { op: 'status', target: 'enemy', status: 'weak', stacks: 'weak' },
      { op: 'status', target: 'enemy', status: 'vulnerable', stacks: 'vuln' },
    ],
    text: 'Apply {weak} Weak and {vuln} Vulnerable.', affinityText: 'Apply {vuln} Vulnerable instead.',
    upgrade: { params: { weak: 3, vuln: 2 }, onAffinity: { vuln: 3 } },
  },
  shadowmark: {
    name: 'Shadow Mark', emoji: '🎯', type: 'skill', cost: 1, affinity: 'odd',
    params: { bonus: 5 }, onAffinity: { bonus: 8 },
    ops: [{ op: 'markBonus', amount: 'bonus' }],
    text: 'Your next damaging Attack this turn deals +{bonus} damage.', affinityText: '+{bonus} instead.',
    upgrade: { params: { bonus: 8 }, onAffinity: { bonus: 12 } },
  },
  poisoncloud: {
    name: 'Poison Cloud', emoji: '🌫️', type: 'skill', cost: 1, affinity: 'odd',
    params: { poison: 4 }, onAffinity: { poison: 6 },
    ops: [{ op: 'status', target: 'enemy', status: 'poison', stacks: 'poison' }],
    text: 'Apply {poison} Poison.', affinityText: 'Apply {poison} instead.',
    upgrade: { params: { poison: 6 }, onAffinity: { poison: 9 } },
  },
  bladedance: {
    name: 'Blade Dance', emoji: '⚔️', type: 'attack', cost: 1, affinity: 'odd',
    params: { dmg: 3 }, onAffinity: { dmg: 4 },
    ops: [{ op: 'damage', amount: 'dmg', hits: 3 }],
    text: 'Deal {dmg} damage three times.', affinityText: 'Deal {dmg} three times instead.',
    upgrade: { params: { dmg: 4 }, onAffinity: { dmg: 6 } },
  },
  disappear: {
    name: 'Disappear', emoji: '🌫️', type: 'skill', cost: 1, affinity: 'odd',
    params: { block: 6, free: 1 }, onAffinity: { free: 2 },
    ops: [{ op: 'block', amount: 'block' }, { op: 'freeNext', count: 'free' }],
    text: 'Gain {block} Block. Next {free|card} you play this turn: cost 0.', affinityText: 'Next {free} instead.',
    upgrade: { cost: 0, params: { block: 8 } },
  },
  concoction: {
    name: 'Concoction', emoji: '🧪', type: 'skill', cost: 1, affinity: 'odd',
    params: { poison: 2, draw: 1 }, onAffinity: { poison: 3, draw: 2 },
    ops: [{ op: 'status', target: 'enemy', status: 'poison', stacks: 'poison' }, { op: 'draw', n: 'draw' }],
    text: 'Apply {poison} Poison. Draw {draw|card}.', affinityText: 'Apply {poison} Poison and draw {draw} instead.',
    upgrade: { params: { poison: 3, draw: 2 }, onAffinity: { poison: 5 } },
  },
  thiefsgambit: {
    name: "Thief's Gambit", emoji: '🎴', type: 'attack', cost: 1, affinity: 'odd',
    params: { dmg: 3, draw: 1, gold: 5 }, onAffinity: { dmg: 5 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'draw', n: 'draw' }, { op: 'gainGold', amount: 'gold' }],
    text: 'Deal {dmg} damage. Draw {draw|card}. Gain {gold} Gold.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 5, gold: 8 }, onAffinity: { dmg: 8 } },
  },
  gutpunch: {
    name: 'Gut Punch', emoji: '🤛', type: 'attack', cost: 1, affinity: 'odd',
    params: { dmg: 4, poison: 1 }, onAffinity: { poison: 2 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'status', target: 'enemy', status: 'poison', stacks: 'poison' }],
    text: 'Deal {dmg} damage. Apply {poison} Poison.', affinityText: 'Apply {poison} Poison instead.',
    upgrade: { params: { dmg: 6, poison: 2 }, onAffinity: { poison: 3 } },
  },

  // ── Rares ──
  deathmark: {
    name: 'Death Mark', emoji: '💀', type: 'skill', cost: 1, affinity: 'odd', exhaust: true,
    params: { factor: 2 }, onAffinity: { factor: 3 },
    ops: [{ op: 'multiplyStatus', target: 'enemy', status: 'poison', factor: 'factor' }],
    text: "Multiply the enemy's Poison by {factor}.", affinityText: 'Multiply by {factor} instead.',
    upgrade: {
      params: { factor: 2, max: 20 },
      ops: [{ op: 'multiplyStatus', target: 'enemy', status: 'poison', factor: 'factor', max: 'max' }],
      text: "Multiply the enemy's Poison by {factor} (max {max}).",
    },
  },
  shadowartist: {
    name: 'Shadow Artist', emoji: '🎭', type: 'power', cost: 2,
    params: {},
    ops: [{ op: 'status', target: 'player', status: 'shadowArtist', stacks: 1 }],
    text: 'The 2nd and 4th card you play each turn cost 0.',
    // Upgrade per CARD_UPGRADES_MASTER.md:28 (fix F3): a different effect, every turn.
    upgrade: {
      cost: 1,
      params: { less: 1 },
      ops: [{ op: 'status', target: 'player', status: 'shadowArtistPlus', stacks: 'less' }],
      text: 'The first 3 cards you play each turn cost {less} less.',
    },
  },
  poisonmaster: {
    name: 'Poison Master', emoji: '☠️', type: 'power', cost: 2,
    params: { bonus: 1 },
    ops: [{ op: 'status', target: 'player', status: 'poisonMaster', stacks: 'bonus' }],
    text: 'Poison deals +{bonus} damage per stack.',
    upgrade: { params: { bonus: 2 } },
  },
  lethalrhythm: {
    name: 'Lethal Rhythm', emoji: '🥁', type: 'power', cost: 1,
    params: { dmg: 3 },
    ops: [{ op: 'status', target: 'player', status: 'lethalRhythm', stacks: 'dmg' }],
    text: 'Every 2nd card you play each turn deals {dmg} damage, ignoring Block.',
    upgrade: { params: { dmg: 5 } },
  },
  assassinate: {
    name: 'Assassinate', emoji: '🗡️', type: 'attack', cost: 2, affinity: 'odd',
    params: { dmg: 14 }, onAffinity: { dmg: 18 },
    when: [{
      if: { enemyHas: { status: 'poison', min: 5 } },
      params: { dmg: 22 }, onAffinity: { dmg: 28 },
      text: 'If the enemy has 5+ Poison: deal {dmg} ({aff.dmg} on Odd).',
    }],
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: {
      params: { dmg: 18 }, onAffinity: { dmg: 22 },
      when: [{ params: { dmg: 28 }, onAffinity: { dmg: 34 } }],
    },
  },
  goldenstrike: {
    name: 'Golden Strike', emoji: '💰', type: 'attack', cost: 1, affinity: 'odd',
    params: { dmg: { of: 'gold', div: 10, max: 15 } }, onAffinity: { dmg: { of: 'gold', div: 8, max: 20 } },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal damage equal to {dmg}.', affinityText: 'Use {dmg} instead.',
    upgrade: {
      params: { dmg: { of: 'gold', div: 8, max: 18 } }, onAffinity: { dmg: { of: 'gold', div: 6, max: 24 } },
    },
  },
};
