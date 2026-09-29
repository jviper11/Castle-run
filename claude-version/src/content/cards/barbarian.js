// Barbarian — affinity Even. Numbers from the reference build (../js/data.js CARDS / CARD_UPGRADES).

export const BARBARIAN_CARDS = {
  // ── Barbarian starters ──
  heavyblow: {
    name: 'Heavy Blow', emoji: '🪓', type: 'attack', cost: 2, affinity: 'even',
    params: { dmg: 10 }, onAffinity: { dmg: 16 },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 13 }, onAffinity: { dmg: 21 } },
  },
  warshout: {
    name: 'War Shout', emoji: '😤', type: 'skill', cost: 1, affinity: 'even',
    params: { block: 6 }, onAffinity: { block: 10 },
    ops: [{ op: 'block', amount: 'block' }],
    text: 'Gain {block} Block.', affinityText: 'Gain {block} instead.',
    upgrade: { params: { block: 8 }, onAffinity: { block: 14 } },
  },
  ironbash: {
    name: 'Iron Bash', emoji: '🔨', type: 'attack', cost: 1, affinity: 'even',
    params: { dmg: 7, vuln: 0 }, onAffinity: { vuln: 1 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'status', target: 'enemy', status: 'vulnerable', stacks: 'vuln' }],
    text: 'Deal {dmg} damage.', affinityText: 'Also apply {vuln} Vulnerable.',
    upgrade: { params: { dmg: 10 }, onAffinity: { vuln: 2 } },
  },

  // ── Barbarian commons ──
  brutalswing: {
    name: 'Brutal Swing', emoji: '⚔️', type: 'attack', cost: 1, affinity: 'even',
    params: { dmg: 5 }, onAffinity: { dmg: 7 },
    ops: [{ op: 'damage', amount: 'dmg', hits: 2 }],
    text: 'Deal {dmg} damage twice.', affinityText: 'Deal {dmg} twice instead.',
    upgrade: { params: { dmg: 7 }, onAffinity: { dmg: 8 } },
  },
  shieldbreaker: {
    name: 'Shield Breaker', emoji: '🪓', type: 'attack', cost: 1, affinity: 'even',
    params: { dmg: 6, strip: 0 }, onAffinity: { strip: 5 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'stripBlock', amount: 'strip' }],
    text: 'Deal {dmg} damage.', affinityText: 'Also remove {strip} enemy Block.',
    upgrade: { params: { dmg: 9 }, onAffinity: { strip: 8 } },
  },
  warcry: {
    name: 'War Cry', emoji: '📣', type: 'skill', cost: 0, affinity: 'even',
    params: { block: 3, draw: 0 }, onAffinity: { draw: 1 },
    ops: [{ op: 'block', amount: 'block' }, { op: 'draw', n: 'draw' }],
    text: 'Gain {block} Block.', affinityText: 'Also draw {draw|card}.',
    upgrade: { params: { block: 5 } },
  },
  toughhide: {
    name: 'Tough Hide', emoji: '🛡️', type: 'skill', cost: 1, affinity: 'even',
    params: { block: 7 }, onAffinity: { block: 11 },
    ops: [{ op: 'block', amount: 'block' }],
    text: 'Gain {block} Block.', affinityText: 'Gain {block} instead.',
    upgrade: { params: { block: 9 }, onAffinity: { block: 13 } },
  },
  bloodprice: {
    name: 'Blood Price', emoji: '🩸', type: 'skill', cost: 0, affinity: 'even',
    params: { hpCost: 5, draw: 2 }, onAffinity: { hpCost: 3 },
    ops: [{ op: 'loseHp', amount: 'hpCost' }, { op: 'draw', n: 'draw' }],
    text: 'Lose {hpCost} HP. Draw {draw|card}.', affinityText: 'Lose {hpCost} HP instead.',
    upgrade: { params: { hpCost: 3 }, onAffinity: { hpCost: 1 } },
  },

  // ── Barbarian uncommons ──
  haymaker: {
    name: 'Haymaker', emoji: '👊', type: 'attack', cost: 2, affinity: 'even',
    params: { dmg: 14 }, onAffinity: { dmg: 20 },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 17 }, onAffinity: { dmg: 24 } },
  },
  skullcrack: {
    name: 'Skull Crack', emoji: '💥', type: 'attack', cost: 1, affinity: 'even',
    params: { dmg: 8, weak: 1 }, onAffinity: { weak: 2 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'status', target: 'enemy', status: 'weak', stacks: 'weak' }],
    text: 'Deal {dmg} damage. Apply {weak} Weak.', affinityText: 'Apply {weak} Weak instead.',
    upgrade: { params: { dmg: 11 }, onAffinity: { weak: 3 } },
  },
  recklesslunge: {
    name: 'Reckless Lunge', emoji: '⚡', type: 'attack', cost: 1, affinity: 'even',
    params: { dmg: 10, hpCost: 3 }, onAffinity: { dmg: 16 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'loseHp', amount: 'hpCost' }],
    text: 'Deal {dmg} damage. Lose {hpCost} HP.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 13, hpCost: 2 }, onAffinity: { dmg: 19 } },
  },
  battlecry: {
    name: 'Battle Cry', emoji: '😤', type: 'skill', cost: 1, affinity: 'even',
    params: { block: 6, draw: 0 }, onAffinity: { draw: 2 },
    ops: [{ op: 'block', amount: 'block' }, { op: 'draw', n: 'draw' }],
    text: 'Gain {block} Block.', affinityText: 'Also draw {draw|card}.',
    upgrade: { params: { block: 8 } },
  },
  ironroar: {
    name: 'Iron Roar', emoji: '🔊', type: 'skill', cost: 0, affinity: 'even',
    params: { weak: 1 }, onAffinity: { weak: 2 },
    ops: [{ op: 'status', target: 'enemy', status: 'weak', stacks: 'weak' }],
    text: 'Apply {weak} Weak.', affinityText: 'Apply {weak} Weak instead.',
    upgrade: { params: { weak: 2 }, onAffinity: { weak: 3 } },
  },
  bloodlust: {
    name: 'Blood Lust', emoji: '❤️', type: 'skill', cost: 1, affinity: 'even',
    params: { heal: 4 }, onAffinity: { heal: 8 },
    ops: [{ op: 'heal', amount: 'heal' }],
    text: 'Heal {heal} HP.', affinityText: 'Heal {heal} instead.',
    upgrade: { params: { heal: 6 }, onAffinity: { heal: 11 } },
  },
  entrench: {
    name: 'Entrench', emoji: '⚓', type: 'skill', cost: 1, affinity: 'even',
    params: { block: 8 }, onAffinity: { block: 13 },
    ops: [{ op: 'block', amount: 'block' }, { op: 'entrench' }],
    text: 'Gain {block} Block. Your Block carries over to next turn.', affinityText: 'Gain {block} instead.',
    upgrade: { params: { block: 11 }, onAffinity: { block: 17 } },
  },
  overpowerattack: {
    name: 'Overpower', emoji: '💪', type: 'attack', cost: 1, affinity: 'even',
    params: { dmg: 8, vuln: 0 }, onAffinity: { vuln: 2 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'status', target: 'enemy', status: 'vulnerable', stacks: 'vuln' }],
    text: 'Deal {dmg} damage.', affinityText: 'Also apply {vuln} Vulnerable.',
    upgrade: { params: { dmg: 11 }, onAffinity: { vuln: 3 } },
  },
  crushingblow: {
    name: 'Crushing Blow', emoji: '🔨', type: 'attack', cost: 2, affinity: 'even',
    params: { strip: 8, dmg: 12 }, onAffinity: { dmg: 18 },
    ops: [{ op: 'stripBlock', amount: 'strip' }, { op: 'damage', amount: 'dmg' }],
    text: 'Remove {strip} enemy Block, then deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { strip: 12, dmg: 15 }, onAffinity: { dmg: 21 } },
  },
  warcallecho: {
    name: 'War Call', emoji: '📢', type: 'skill', cost: 0, affinity: 'even',
    params: { draw: 1, weak: 0 }, onAffinity: { weak: 1 },
    ops: [{ op: 'draw', n: 'draw' }, { op: 'status', target: 'enemy', status: 'weak', stacks: 'weak' }],
    text: 'Draw {draw|card}.', affinityText: 'Also apply {weak} Weak.',
    upgrade: { params: { draw: 2 } },
  },

  // ── Barbarian rares ──
  berserkersoath: {
    name: "Berserker's Oath", emoji: '🔥', type: 'power', cost: 2,
    params: { block: 3 },
    ops: [{ op: 'status', target: 'player', status: 'berserkOath', stacks: 'block' }],
    text: 'Each time you lose HP, gain {block} Block.',
    upgrade: { params: { block: 4 } },
  },
  warlordspresence: {
    name: "Warlord's Presence", emoji: '👑', type: 'power', cost: 2,
    params: { str: 2 },
    ops: [{ op: 'status', target: 'player', status: 'rage', stacks: 'str' }],
    text: 'Gain {str} Strength.',
    upgrade: { params: { str: 3 } },
  },
  deathrattle: {
    name: 'Death Rattle', emoji: '💀', type: 'attack', cost: 2, affinity: 'even',
    gate: { hpPctAtMost: 50 },
    params: { dmg: 16 }, onAffinity: { dmg: 24 },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Only at or below 50% HP. Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 20 }, onAffinity: { dmg: 26 } },
  },
  laststand: {
    name: 'Last Stand', emoji: '🛡️', type: 'skill', cost: 1, affinity: 'even',
    params: { block: 10 }, onAffinity: { block: 14 },
    when: [{
      if: { hpPctAtMost: 30 },
      params: { block: 20 }, onAffinity: { block: 28 },
      text: 'At or below 30% HP: gain {block} ({aff.block} on Even).',
    }],
    ops: [{ op: 'block', amount: 'block' }],
    text: 'Gain {block} Block.', affinityText: 'Gain {block} instead.',
    upgrade: {
      params: { block: 12 }, onAffinity: { block: 16 },
      when: [{ params: { block: 24 }, onAffinity: { block: 32 } }],
    },
  },
  battletrance: {
    name: 'Battle Trance', emoji: '⚡', type: 'skill', cost: 1, affinity: 'even',
    // Energy is flat by GDD rule; only the HP cost changes with affinity.
    params: { energy: 2, hpCost: 6 }, onAffinity: { hpCost: 4 },
    ops: [{ op: 'energy', amount: 'energy', overMax: 2 }, { op: 'loseHp', amount: 'hpCost' }],
    text: 'Gain {energy} Energy. Lose {hpCost} HP.', affinityText: 'Lose {hpCost} HP instead.',
    upgrade: { params: { hpCost: 4 }, onAffinity: { hpCost: 2 } },
  },
};
