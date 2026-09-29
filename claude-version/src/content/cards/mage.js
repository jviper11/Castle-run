// Mage — affinity High (the die's upper third; 5+ on a d6, see engine/dice.js). Numbers from the reference build (../js/data.js CARDS /
// CARD_UPGRADES). Fireball, Blizzard and Time Warp are generic in the reference but only the Mage
// pool offers them, so they live here. Deliberate differences are listed in COMPARISON.md (§F).

const burn = (stacks) => ({ op: 'status', target: 'enemy', status: 'burn', stacks });
const chill = (stacks) => ({ op: 'status', target: 'enemy', status: 'chill', stacks });

export const MAGE_CARDS = {
  // ── Starters ──
  frostbolt: {
    name: 'Frost Bolt', emoji: '❄️', type: 'attack', cost: 1, affinity: 'high',
    params: { dmg: 5, chill: 0 }, onAffinity: { dmg: 9, chill: 1 },
    ops: [{ op: 'damage', amount: 'dmg' }, chill('chill')],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} and apply {chill} Chill.',
    upgrade: { params: { dmg: 7 }, onAffinity: { dmg: 13, chill: 2 } },
  },
  arcanebarrier: {
    name: 'Arcane Shield', emoji: '🔷', type: 'skill', cost: 1, affinity: 'high',
    params: { block: 4 }, onAffinity: { block: 9 },
    ops: [{ op: 'block', amount: 'block' }],
    text: 'Gain {block} Block.', affinityText: 'Gain {block} instead.',
    upgrade: { params: { block: 6 }, onAffinity: { block: 13 } },
  },
  manasurge: {
    name: 'Mana Surge', emoji: '⚡', type: 'skill', cost: 0,
    params: { cards: 1 },
    ops: [{ op: 'discountNext', count: 'cards' }],
    text: 'Next {cards|card} you play this turn: cost 1 less.',
    upgrade: { params: { cards: 2 } }, // fix F1: the reference printed 2 but discounted 1
  },
  arcaneboost: {
    name: 'Arcane Boost', emoji: '🔼', type: 'skill', cost: 1,
    gate: { handAtLeast: 1 },
    params: { discard: 1, add: 1 },
    ops: [{ op: 'chooseDiscard', n: 'discard' }, { op: 'dieAdd', amount: 'add' }],
    text: 'Discard {discard|card} of your choice. Add {add} to the die.',
    upgrade: { cost: 0, params: { add: 2 } },
  },
  voidchannel: {
    name: 'Void Channel', emoji: '🌀', type: 'skill', cost: 1,
    gate: { handAtLeast: 2, dieNotSetThisTurn: true },
    params: { discard: 2, factor: 2 },
    ops: [{ op: 'chooseDiscard', n: 'discard' }, { op: 'dieMultiply', factor: 'factor', set: true }],
    text: 'Discard {discard|card} of your choice. Multiply the die by {factor} (sets the die).',
    // CARD_UPGRADES_MASTER.md:31 — a different effect: roll 3 times, keep the highest.
    upgrade: {
      params: { discard: 2, rolls: 3 },
      ops: [{ op: 'chooseDiscard', n: 'discard' }, { op: 'dieBestOf', n: 'rolls' }],
      text: 'Discard {discard|card} of your choice. Roll {rolls} times and keep the highest (sets the die).',
    },
  },

  // ── Commons ──
  spark: {
    name: 'Spark', emoji: '✨', type: 'attack', cost: 1, affinity: 'high',
    params: { dmg: 4, burn: 0 }, onAffinity: { dmg: 7, burn: 1 },
    ops: [{ op: 'damage', amount: 'dmg' }, burn('burn')],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} and apply {burn} Burn.',
    upgrade: { params: { dmg: 6 }, onAffinity: { dmg: 10, burn: 2 } },
  },
  flametouch: {
    name: 'Flame Touch', emoji: '🔥', type: 'attack', cost: 1, affinity: 'high',
    params: { dmg: 5, burn: 1 }, onAffinity: { burn: 3 },
    ops: [{ op: 'damage', amount: 'dmg' }, burn('burn')],
    text: 'Deal {dmg} damage. Apply {burn} Burn.', affinityText: 'Apply {burn} Burn instead.',
    upgrade: { params: { dmg: 7, burn: 2 }, onAffinity: { burn: 5 } },
  },
  meditate: {
    name: 'Meditate', emoji: '🧘', type: 'skill', cost: 1, affinity: 'high',
    params: { draw: 2 }, onAffinity: { draw: 3 },
    ops: [{ op: 'draw', n: 'draw' }],
    text: 'Draw {draw|card}.', affinityText: 'Draw {draw} instead.',
    upgrade: { cost: 0 },
  },
  channelfocus: {
    name: 'Channel Focus', emoji: '🔮', type: 'skill', cost: 0, affinity: 'high',
    // Energy is flat per affinity branch (GDD §11); it may exceed max by the amount gained.
    params: { energy: 1, draw: 0 }, onAffinity: { draw: 1 },
    ops: [{ op: 'energy', amount: 'energy', overMax: 'energy' }, { op: 'draw', n: 'draw' }],
    text: 'Gain {energy} Energy.', affinityText: 'Also draw {draw|card}.',
    upgrade: {
      params: { draw: 1 }, onAffinity: { energy: 2 },
      text: 'Gain {energy} Energy. Draw {draw|card}.', affinityText: 'Gain {energy} Energy instead.',
    },
  },
  fireball: {
    name: 'Fireball', emoji: '🔥', type: 'attack', cost: 2, affinity: 'high',
    params: { dmg: 8, burn: 0 }, onAffinity: { dmg: 15, burn: 2 },
    ops: [{ op: 'damage', amount: 'dmg' }, burn('burn')],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} and apply {burn} Burn.',
    upgrade: { params: { dmg: 11 }, onAffinity: { dmg: 20, burn: 3 } },
  },
  blizzard: {
    name: 'Blizzard', emoji: '🌨️', type: 'attack', cost: 2,
    params: { dmg: 5 },
    ops: [{ op: 'damage', amount: 'dmg', hits: 3 }],
    text: 'Deal {dmg} damage three times.',
    upgrade: { params: { dmg: 8 } },
  },

  // ── Uncommons ──
  icelance: {
    name: 'Ice Lance', emoji: '🧊', type: 'attack', cost: 1, affinity: 'high',
    params: { dmg: 7 },
    when: [{
      if: { enemyHas: 'chill' },
      onAffinity: { dmg: 13 },
      text: 'On High, if the enemy has Chill: deal {aff.dmg} instead.',
    }],
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.',
    upgrade: { params: { dmg: 9 }, when: [{ onAffinity: { dmg: 16 } }] },
  },
  combustion: {
    name: 'Combustion', emoji: '💥', type: 'attack', cost: 1, affinity: 'high',
    params: { dmg: { flat: 3, of: 'enemy.burn' } }, onAffinity: { dmg: { flat: 5, per: 2, of: 'enemy.burn' } },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal damage equal to {dmg}.', affinityText: 'Use {dmg} instead.',
    upgrade: {
      params: { dmg: { flat: 4, per: 2, of: 'enemy.burn' } }, onAffinity: { dmg: { flat: 6, per: 2, of: 'enemy.burn' } },
    },
  },
  chainbolt: {
    name: 'Chain Bolt', emoji: '⚡', type: 'attack', cost: 1, affinity: 'high',
    params: { dmg: 5, again: 0 }, onAffinity: { again: 5 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'damage', amount: 'again' }],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {again} damage again.',
    upgrade: { params: { dmg: 7 }, onAffinity: { again: 7 } },
  },
  ignite: {
    name: 'Ignite', emoji: '🕯️', type: 'skill', cost: 1, affinity: 'high',
    params: { burn: 3 }, onAffinity: { burn: 5 },
    ops: [burn('burn')],
    text: 'Apply {burn} Burn.', affinityText: 'Apply {burn} instead.',
    upgrade: { params: { burn: 4 }, onAffinity: { burn: 7 } },
  },
  arcanerecall: {
    name: 'Arcane Recall', emoji: '📜', type: 'skill', cost: 1, affinity: 'high',
    params: { cards: 1 }, onAffinity: { cards: 2 },
    // Owner decision (COMPARISON G2): it cannot return Arcane Recall, which closes the 0-cost loop.
    ops: [{ op: 'chooseFromDiscard', n: 'cards', exclude: ['arcanerecall'] }],
    text: 'Return {cards|card} of your choice (not Arcane Recall) from your discard pile to your hand.', affinityText: 'Return {cards} instead.',
    upgrade: { cost: 0 },
  },
  manaweave: {
    name: 'Mana Weave', emoji: '🧶', type: 'skill', cost: 1, affinity: 'high',
    params: { cards: 1 }, onAffinity: { cards: 2 },
    ops: [{ op: 'discountNext', count: 'cards' }],
    text: 'Next {cards|card} you play this turn: cost 1 less.', affinityText: 'Next {cards} instead.',
    upgrade: { cost: 0 },
  },
  frostfire: {
    // Both checks read the enemy as the card is played, before either status is added.
    name: 'Frost Fire', emoji: '🌗', type: 'attack', cost: 2, affinity: 'high',
    params: { dmg: 10, chill: 0, burn: 0 }, onAffinity: { dmg: 14 },
    when: [
      { if: { enemyHas: 'burn' }, params: { chill: 2 }, text: 'If the enemy has Burn: apply {chill} Chill.' },
      { if: { enemyHas: 'chill' }, params: { burn: 2 }, text: 'If the enemy has Chill: apply {burn} Burn.' },
    ],
    ops: [{ op: 'damage', amount: 'dmg' }, chill('chill'), burn('burn')],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: {
      params: { dmg: 13 }, onAffinity: { dmg: 18 },
      when: [{ params: { chill: 3 } }, { params: { burn: 3 } }],
    },
  },
  arcanebarrage: {
    name: 'Arcane Barrage', emoji: '🌠', type: 'attack', cost: 1, affinity: 'high',
    params: { dmg: { flat: 3, of: 'spellsThisTurn' } }, onAffinity: { dmg: { flat: 5, of: 'spellsThisTurn' } },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal damage equal to {dmg}.', affinityText: 'Use {dmg} instead.',
    upgrade: {
      params: { dmg: { flat: 4, per: 2, of: 'spellsThisTurn' } }, onAffinity: { dmg: { flat: 6, per: 2, of: 'spellsThisTurn' } },
    },
  },
  arcanesight: {
    name: 'Arcane Sight', emoji: '👁️', type: 'skill', cost: 1, affinity: 'high',
    params: { draw: 2 }, onAffinity: { draw: 3 },
    ops: [{ op: 'draw', n: 'draw' }],
    text: 'Draw {draw|card}.', affinityText: 'Draw {draw} instead.',
    upgrade: { cost: 0, onAffinity: { draw: 4 } },
  },
  arcanemomentum: {
    name: 'Arcane Momentum', emoji: '✨', type: 'power', cost: 1,
    params: { add: 1 },
    ops: [{ op: 'status', target: 'player', status: 'momentum', stacks: 'add' }],
    text: 'Each Skill or Power you play adds {add} to the die (max +3 per turn).',
    upgrade: { cost: 0 },
  },

  // ── Rares ──
  frozeninferno: {
    name: 'Frozen Inferno', emoji: '☄️', type: 'attack', cost: 3, affinity: 'high',
    params: { dmg: 18 }, onAffinity: { dmg: 26 },
    ops: [
      { op: 'damage', amount: 'dmg' },
      { op: 'clearStatus', target: 'enemy', status: 'burn' },
      { op: 'clearStatus', target: 'enemy', status: 'chill' },
    ],
    text: "Deal {dmg} damage. Remove all of the enemy's Burn and Chill.", affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 24 }, onAffinity: { dmg: 34 } },
  },
  inferno: {
    // An Attack that deals no direct damage: it can be echoed, but never spends a mark bonus.
    name: 'Inferno', emoji: '🌋', type: 'attack', cost: 2, affinity: 'high',
    params: { burn: 6 }, onAffinity: { burn: 10 },
    ops: [burn('burn')],
    text: 'Apply {burn} Burn.', affinityText: 'Apply {burn} instead.',
    upgrade: { params: { burn: 8 }, onAffinity: { burn: 13 } },
  },
  timewarp: {
    // Energy is uncapped, as in the reference. Fix F2: the upgrade is now reachable.
    name: 'Time Warp', emoji: '⏳', type: 'skill', cost: 1, affinity: 'high',
    params: { draw: 2, energy: 1 }, onAffinity: { draw: 3, energy: 2 },
    ops: [{ op: 'draw', n: 'draw' }, { op: 'energy', amount: 'energy', overMax: 99 }],
    text: 'Draw {draw|card}. Gain {energy} Energy.', affinityText: 'Draw {draw} and gain {energy} Energy instead.',
    upgrade: { params: { energy: 2 }, onAffinity: { draw: 4, energy: 3 } },
  },
  spellecho: {
    name: 'Spell Echo', emoji: '🔁', type: 'skill', cost: 1, affinity: 'high', exhaust: true,
    params: { attacks: 1 }, onAffinity: { attacks: 2 },
    ops: [{ op: 'echo', count: 'attacks' }],
    text: 'Next {attacks|Attack} you play this turn: trigger twice.', affinityText: 'Next {attacks} instead.',
    upgrade: {},
    identicalUpgrade: 'The reference and CARD_UPGRADES_MASTER.md both define Spell Echo+ exactly as the base card.',
  },
  coldmastery: {
    name: 'Cold Mastery', emoji: '❄️', type: 'power', cost: 2,
    params: { extra: 10 },
    ops: [{ op: 'status', target: 'player', status: 'coldMastery', stacks: 'extra' }],
    text: 'Chill reduces enemy attacks by {extra}% more (max 50% in total).',
    upgrade: { cost: 1, params: { extra: 25 } },
  },
  burningsoul: {
    name: 'Burning Soul', emoji: '🔥', type: 'power', cost: 2,
    params: { bonus: 1 },
    ops: [{ op: 'status', target: 'player', status: 'burningSoul', stacks: 'bonus' }],
    text: 'Burn deals +{bonus} damage per stack.',
    upgrade: { cost: 1, params: { bonus: 2 } },
  },
};
