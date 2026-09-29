// Vampire — affinity Extreme (1 or the die's max). Numbers from the reference build
// (../js/data.js CARDS / CARD_UPGRADES). HP costs use loseHp, which never drops you below 1 HP.
// Deliberate differences are listed in COMPARISON.md (§F).

const regen = (stacks) => ({ op: 'status', target: 'player', status: 'regen', stacks });
const fly = { op: 'status', target: 'player', status: 'fly', stacks: 1 };

export const VAMPIRE_CARDS = {
  // ── Starters ──
  blooddrain: {
    name: 'Blood Drain', emoji: '🩸', type: 'attack', cost: 1, affinity: 'extreme',
    params: { dmg: 6, heal: 0 }, onAffinity: { heal: 8 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'heal', amount: 'heal' }],
    text: 'Deal {dmg} damage.', affinityText: 'Also heal {heal} HP.',
    upgrade: { params: { dmg: 9 }, onAffinity: { heal: 13 } },
  },
  nightshroud: {
    name: 'Night Shroud', emoji: '🦇', type: 'skill', cost: 1, affinity: 'extreme',
    params: { block: 5 }, onAffinity: { block: 10 },
    ops: [{ op: 'block', amount: 'block' }],
    text: 'Gain {block} Block.', affinityText: 'Gain {block} instead.',
    upgrade: { params: { block: 7 }, onAffinity: { block: 15 } },
  },
  lifeleech: {
    name: 'Life Leech', emoji: '💜', type: 'attack', cost: 2, affinity: 'extreme',
    params: { dmg: 9, block: 0 }, onAffinity: { block: 12 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'block', amount: 'block' }],
    text: 'Deal {dmg} damage.', affinityText: 'Also gain {block} Block.',
    upgrade: { params: { dmg: 13 }, onAffinity: { block: 18 } },
  },
  crimsonbite: {
    name: 'Crimson Bite', emoji: '🧛', type: 'attack', cost: 1, affinity: 'extreme',
    params: { dmg: 5, poison: 0 }, onAffinity: { poison: 2 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'status', target: 'enemy', status: 'poison', stacks: 'poison' }],
    text: 'Deal {dmg} damage.', affinityText: 'Also apply {poison} Poison.',
    upgrade: { params: { dmg: 7 }, onAffinity: { poison: 3 } },
  },
  darkembrace: {
    name: 'Dark Embrace', emoji: '🖤', type: 'skill', cost: 1,
    params: { hpCost: 4, block: 8 },
    ops: [{ op: 'loseHp', amount: 'hpCost' }, { op: 'block', amount: 'block' }],
    text: 'Lose {hpCost} HP. Gain {block} Block.',
    upgrade: { params: { hpCost: 3, block: 12 } },
  },

  // ── Commons ──
  bloodpulse: {
    name: 'Blood Pulse', emoji: '💓', type: 'skill', cost: 1, affinity: 'extreme',
    params: { regen: 2 }, onAffinity: { regen: 4 },
    ops: [regen('regen')],
    text: 'Gain {regen} Regen.', affinityText: 'Gain {regen} instead.',
    upgrade: { params: { regen: 3 }, onAffinity: { regen: 5 } },
  },
  draintouch: {
    name: 'Drain Touch', emoji: '🤚', type: 'attack', cost: 1, affinity: 'extreme',
    params: { dmg: 5, heal: 0 }, onAffinity: { heal: 5 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'heal', amount: 'heal' }],
    text: 'Deal {dmg} damage.', affinityText: 'Also heal {heal} HP.',
    upgrade: { params: { dmg: 7 }, onAffinity: { heal: 8 } },
  },
  nightveil: {
    name: 'Night Veil', emoji: '🌙', type: 'skill', cost: 1, affinity: 'extreme',
    params: { block: 6, regen: 0 }, onAffinity: { regen: 2 },
    ops: [{ op: 'block', amount: 'block' }, regen('regen')],
    text: 'Gain {block} Block.', affinityText: 'Also gain {regen} Regen.',
    upgrade: { params: { block: 9 }, onAffinity: { regen: 3 } },
  },
  darkblood: {
    name: 'Dark Blood', emoji: '🩸', type: 'skill', cost: 0,
    params: { hpCost: 3, draw: 2 },
    ops: [{ op: 'loseHp', amount: 'hpCost' }, { op: 'draw', n: 'draw' }],
    text: 'Lose {hpCost} HP. Draw {draw|card}.',
    upgrade: { params: { hpCost: 2, draw: 3 } },
  },
  swoopdown: {
    name: 'Swoop Down', emoji: '🦇', type: 'skill', cost: 1, affinity: 'extreme',
    params: { block: 0 }, onAffinity: { block: 4 },
    ops: [fly, { op: 'block', amount: 'block' }],
    text: 'Gain Fly: the next hit you take is halved.', affinityText: 'Also gain {block} Block.',
    upgrade: {
      params: { block: 6, draw: 0 }, onAffinity: { block: 6, draw: 1 }, // complete: the upgrade has its own ops
      ops: [fly, { op: 'block', amount: 'block' }, { op: 'draw', n: 'draw' }],
      text: 'Gain Fly: the next hit you take is halved. Gain {block} Block.', affinityText: 'Also draw {draw|card}.',
    },
  },

  // ── Uncommons ──
  sanguinestrike: {
    name: 'Sanguine Strike', emoji: '🗡️', type: 'attack', cost: 1, affinity: 'extreme',
    params: { dmg: 8, regen: 1 }, onAffinity: { dmg: 10, regen: 3 },
    ops: [{ op: 'damage', amount: 'dmg' }, regen('regen')],
    text: 'Deal {dmg} damage. Gain {regen} Regen.', affinityText: 'Deal {dmg} and gain {regen} Regen instead.',
    upgrade: { params: { dmg: 10, regen: 2 }, onAffinity: { dmg: 13, regen: 4 } },
  },
  crimsonpact: {
    name: 'Crimson Pact', emoji: '📜', type: 'skill', cost: 1, affinity: 'extreme',
    params: { hpCost: 6, regen: 3, draw: 2 }, onAffinity: { hpCost: 4, regen: 5 },
    ops: [{ op: 'loseHp', amount: 'hpCost' }, regen('regen'), { op: 'draw', n: 'draw' }],
    text: 'Lose {hpCost} HP. Gain {regen} Regen. Draw {draw|card}.', affinityText: 'Lose {hpCost} HP and gain {regen} Regen instead.',
    upgrade: { params: { hpCost: 4, regen: 4 }, onAffinity: { hpCost: 2, regen: 6 } },
  },
  bloodbank: {
    name: 'Blood Bank', emoji: '🏦', type: 'skill', cost: 1, affinity: 'extreme',
    params: { hpCost: 10, block: 10 }, onAffinity: { hpCost: 8, block: 14 },
    ops: [{ op: 'loseHp', amount: 'hpCost' }, { op: 'block', amount: 'block' }],
    text: 'Lose {hpCost} HP. Gain {block} Block.', affinityText: 'Lose {hpCost} HP, gain {block} Block instead.',
    upgrade: { params: { hpCost: 8, block: 13 }, onAffinity: { hpCost: 6, block: 18 } },
  },
  drainlife: {
    name: 'Drain Life', emoji: '🩸', type: 'attack', cost: 2, affinity: 'extreme',
    params: { dmg: 12, heal: { of: 'damageDealt', div: 2 } }, onAffinity: { heal: { of: 'damageDealt' } },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'heal', amount: 'heal' }],
    text: 'Deal {dmg} damage. Heal HP equal to {heal}.', affinityText: 'Heal HP equal to {heal} instead.',
    upgrade: {
      params: { dmg: 15, heal: { of: 'damageDealt' } }, onAffinity: { dmg: 20, heal: { of: 'damageDealt' } },
      affinityText: 'Deal {dmg} instead.',
    },
  },
  batform: {
    name: 'Bat Form', emoji: '🦇', type: 'skill', cost: 1, affinity: 'extreme',
    params: { draw: 1, regen: 0 }, onAffinity: { draw: 2, regen: 2 },
    ops: [fly, { op: 'draw', n: 'draw' }, regen('regen')],
    text: 'Gain Fly. Draw {draw|card}.', affinityText: 'Draw {draw} and gain {regen} Regen.',
    upgrade: { params: { draw: 2 }, onAffinity: { regen: 3 }, affinityText: 'Also gain {regen} Regen.' },
  },
  shadowfeast: {
    name: 'Shadow Feast', emoji: '🍷', type: 'attack', cost: 1, affinity: 'extreme',
    params: { dmg: 6 }, onAffinity: { dmg: 12 },
    when: [{
      if: { playerHas: 'regen' },
      params: { dmg: 10 }, onAffinity: { dmg: 15 },
      text: 'If you have Regen: deal {dmg} ({aff.dmg} on Extreme).',
    }],
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: {
      params: { dmg: 8 }, onAffinity: { dmg: 10 },
      when: [{ params: { dmg: 13 }, onAffinity: { dmg: 18 } }],
    },
  },
  darkrite: {
    name: 'Dark Rite', emoji: '🕯️', type: 'skill', cost: 1, affinity: 'extreme',
    params: { hpCost: 8, block: 12, regen: 2 }, onAffinity: { hpCost: 5, block: 16, regen: 3 },
    ops: [{ op: 'loseHp', amount: 'hpCost' }, { op: 'block', amount: 'block' }, regen('regen')],
    text: 'Lose {hpCost} HP. Gain {block} Block and {regen} Regen.',
    affinityText: 'Lose {hpCost} HP, gain {block} Block and {regen} Regen instead.',
    upgrade: { params: { hpCost: 6, block: 16, regen: 3 }, onAffinity: { hpCost: 4, block: 20, regen: 4 } },
  },
  bloodrush: {
    name: 'Blood Rush', emoji: '💉', type: 'skill', cost: 0, affinity: 'extreme',
    params: { hpCost: 5, bonus: 6 }, onAffinity: { hpCost: 3, bonus: 9 },
    ops: [{ op: 'loseHp', amount: 'hpCost' }, { op: 'markBonus', amount: 'bonus' }],
    text: 'Lose {hpCost} HP. Your next damaging Attack this turn deals +{bonus} damage.',
    affinityText: 'Lose {hpCost} HP for +{bonus} instead.',
    upgrade: { params: { hpCost: 3, bonus: 9 }, onAffinity: { hpCost: 2, bonus: 12 } },
  },
  nightstalk: {
    name: 'Night Stalk', emoji: '🐺', type: 'attack', cost: 1, affinity: 'extreme',
    params: { dmg: 5, regen: 0 }, onAffinity: { dmg: 7, regen: 2 },
    ops: [{ op: 'damage', amount: 'dmg', hits: 2 }, regen('regen')],
    text: 'Deal {dmg} damage twice.', affinityText: 'Deal {dmg} twice and gain {regen} Regen.',
    upgrade: { params: { dmg: 7 }, onAffinity: { dmg: 9, regen: 3 } },
  },
  cursedveins: {
    name: 'Cursed Veins', emoji: '🩸', type: 'skill', cost: 1, affinity: 'extreme',
    params: { regen: 3, free: 1, freeSkill: 0 }, onAffinity: { regen: 5, free: 0, freeSkill: 1 },
    ops: [regen('regen'), { op: 'freeNext', count: 'free' }, { op: 'freeSkillNext', count: 'freeSkill' }],
    text: 'Gain {regen} Regen. Next {free|card} you play this turn: cost 0.',
    affinityText: 'Gain {regen} Regen; next {freeSkill|Skill} (not any card) costs 0 instead.',
    upgrade: { params: { regen: 5 }, onAffinity: { regen: 7 } },
  },

  // ── Rares ──
  bloodlord: {
    name: 'Blood Lord', emoji: '👑', type: 'power', cost: 2,
    params: { heal: 2 },
    ops: [{ op: 'status', target: 'player', status: 'bloodLord', stacks: 'heal' }],
    text: 'Heal {heal} HP after each Attack you play.',
    upgrade: { params: { heal: 3 } },
  },
  eternalhunger: {
    // Owner decision (COMPARISON G3): base deals a flat 2 per Regen tick; the upgrade deals 2 per
    // Regen stack, max 15 per turn.
    name: 'Eternal Hunger', emoji: '🦷', type: 'power', cost: 2,
    params: { dmg: 2 },
    ops: [{ op: 'status', target: 'player', status: 'eternalHunger', stacks: 1, data: { flat: 'dmg' } }],
    text: 'When Regen heals you, deal {dmg} damage to the enemy.',
    upgrade: {
      params: { per: 2, cap: 15 },
      ops: [{ op: 'status', target: 'player', status: 'eternalHunger', stacks: 1, data: { perStack: 'per', cap: 'cap' } }],
      text: 'When Regen heals you, deal {per} damage per Regen stack to the enemy (max {cap} per turn).',
    },
  },
  vampiricform: {
    name: 'Vampiric Form', emoji: '🧛', type: 'power', cost: 2,
    params: {},
    ops: [{ op: 'status', target: 'player', status: 'vampiricForm', stacks: 1 }],
    text: 'When the die lands on 1 or its max, gain Fly if you have none.',
    upgrade: {
      cost: 1,
      params: { regen: 2 },
      ops: [{ op: 'status', target: 'player', status: 'vampiricForm', stacks: 1, data: { regen: 'regen' } }],
      text: 'When the die lands on 1 or its max, gain Fly if you have none, and {regen} Regen.',
    },
  },
  darkascension: {
    name: 'Dark Ascension', emoji: '🌑', type: 'skill', cost: 2, affinity: 'extreme',
    params: { hpCost: 15, block: 20, regen: 5 }, onAffinity: { hpCost: 10, block: 28, regen: 7 },
    ops: [{ op: 'loseHp', amount: 'hpCost' }, { op: 'block', amount: 'block' }, regen('regen')],
    text: 'Lose {hpCost} HP. Gain {block} Block and {regen} Regen.',
    affinityText: 'Lose {hpCost} HP, gain {block} Block and {regen} Regen instead.',
    upgrade: { params: { hpCost: 12, block: 25, regen: 6 }, onAffinity: { hpCost: 8, block: 34, regen: 9 } },
  },
  soulrend: {
    name: 'Soul Rend', emoji: '💀', type: 'attack', cost: 2, affinity: 'extreme',
    params: { dmg: 15, heal: { of: 'damageDealt' } }, onAffinity: { dmg: 22 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'heal', amount: 'heal' }],
    text: 'Deal {dmg} damage. Heal HP equal to {heal}.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 20 }, onAffinity: { dmg: 28 } },
  },
  bloodtide: {
    name: 'Blood Tide', emoji: '🌊', type: 'skill', cost: 1, affinity: 'extreme', exhaust: true,
    params: { factor: 2, heal: 0 }, onAffinity: { factor: 3, heal: 5 },
    ops: [{ op: 'multiplyStatus', target: 'player', status: 'regen', factor: 'factor' }, { op: 'heal', amount: 'heal' }],
    text: 'Multiply your Regen by {factor} (Regen max 10).', affinityText: 'Multiply by {factor} and heal {heal} HP.',
    upgrade: { cost: 0, params: { factor: 3 }, onAffinity: { heal: 8 }, affinityText: 'Also heal {heal} HP.' },
  },
};
