// Gambler — the die itself is the resource. Cards read the raw roll; their bonus clauses trigger
// on a max roll (affinity 'max'). Numbers from the reference build (../js/data.js CARDS /
// CARD_UPGRADES). Deliberate differences are listed in COMPARISON.md (§F).

const roll = (per = 1) => ({ of: 'die', per });

export const GAMBLER_CARDS = {
  // ── Starters ──
  highorlow: {
    name: 'High or Low', emoji: '🎰', type: 'attack', cost: 1,
    params: { dmg: 5 },
    when: [{ if: { dieAtLeast: 4 }, params: { dmg: 12 }, text: 'If the die shows 4+: deal {dmg} instead.' }],
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.',
    upgrade: { when: [{ params: { dmg: 18 } }] },
  },
  doubldown: {
    name: 'Double Down', emoji: '🃏', type: 'skill', cost: 0,
    params: { factor: 2, drop: 1 },
    ops: [{ op: 'chance', win: [{ op: 'dieMultiply', factor: 'factor' }], lose: [{ op: 'dieTo', value: 'drop' }] }],
    text: 'Flip a coin: multiply the die by {factor}, or drop it to {drop}.',
    upgrade: {
      params: { factor: 3 },
      ops: [{ op: 'chance', win: [{ op: 'dieMultiply', factor: 'factor' }] }],
      text: 'Flip a coin: multiply the die by {factor}, or keep it.',
    },
  },
  luckystrike: {
    name: 'Lucky Strike', emoji: '🍀', type: 'attack', cost: 2, affinity: 'max',
    params: { dmg: 8 }, onAffinity: { dmg: 20 },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 12 }, onAffinity: { dmg: 28 } },
  },
  hedgebet: {
    name: 'Hedge Bet', emoji: '🛡️', type: 'skill', cost: 1,
    params: { block: roll() },
    ops: [{ op: 'block', amount: 'block' }],
    text: 'Gain Block equal to {block}.',
    upgrade: { params: { block: roll(2) } },
  },
  wildcard: {
    name: 'Wild Card', emoji: '🃏', type: 'attack', cost: 1,
    params: { dmg: roll(2) },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal damage equal to {dmg}.',
    upgrade: { params: { dmg: roll(3) } },
  },

  // ── Commons ──
  longshot: {
    name: 'Long Shot', emoji: '🎯', type: 'attack', cost: 1, affinity: 'max',
    params: { dmg: 4 }, onAffinity: { dmg: 16 },
    when: [{ if: { dieAtLeast: 4 }, params: { dmg: 10 }, text: 'If the die shows 4+: deal {dmg} instead.' }],
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal {dmg} damage.', affinityText: 'Deal {dmg} instead.',
    upgrade: { params: { dmg: 6 }, onAffinity: { dmg: 20 }, when: [{ params: { dmg: 13 } }] },
  },
  safepull: {
    name: 'Safe Pull', emoji: '🔒', type: 'skill', cost: 1, affinity: 'max',
    params: { block: 4, to: 4 }, onAffinity: { block: 6, to: 5 },
    ops: [{ op: 'block', amount: 'block' }, { op: 'dieSet', value: 'to' }],
    text: 'Gain {block} Block. Set the die to {to} (if not already set this turn).',
    affinityText: 'Gain {block} Block and set it to {to} instead.',
    upgrade: { params: { block: 6, to: 5 }, onAffinity: { block: 8, to: { of: 'dieMax' } } },
  },
  risktaker: {
    // The Max check reads the new roll, so it is an op-level `if`, not an affinity.
    name: 'Risk Taker', emoji: '🎲', type: 'skill', cost: 0,
    params: { draw: 1, extra: 1, block: 3 },
    ops: [
      { op: 'rerollDie' },
      { op: 'draw', n: 'draw' },
      { op: 'draw', n: 'extra', if: { dieIsMax: true } },
      { op: 'block', amount: 'block', if: { dieIsMax: true } },
    ],
    text: 'Reroll the die. Draw {draw|card}. If the new roll is Max: draw {extra} more and gain {block} Block.',
    upgrade: {
      params: { draw: 2, block: 5 },
      ops: [{ op: 'rerollDie' }, { op: 'draw', n: 'draw' }, { op: 'block', amount: 'block', if: { dieIsMax: true } }],
      text: 'Reroll the die. Draw {draw|card}. If the new roll is Max: gain {block} Block.',
    },
  },
  oddscheck: {
    name: 'Odds Check', emoji: '📊', type: 'skill', cost: 1, affinity: 'max',
    params: { draw: 2, gold: 0 }, onAffinity: { draw: 3, gold: 5 },
    when: [{ if: { dieAtLeast: 4 }, params: { draw: 3 }, text: 'If the die shows 4+: draw {draw} instead.' }],
    ops: [{ op: 'draw', n: 'draw' }, { op: 'gainGold', amount: 'gold' }],
    text: 'Draw {draw|card}.', affinityText: 'Draw {draw} and gain {gold} Gold.',
    upgrade: { cost: 0, onAffinity: { gold: 8 } },
  },
  chipsin: {
    name: 'Chips In', emoji: '🪙', type: 'skill', cost: 1, affinity: 'max',
    params: { gold: 5, draw: 0 }, onAffinity: { draw: 1 },
    ops: [{ op: 'gainGold', amount: 'gold' }, { op: 'draw', n: 'draw' }],
    text: 'Gain {gold} Gold.', affinityText: 'Also draw {draw|card}.',
    upgrade: { cost: 0, params: { gold: 8 } },
  },

  // ── Uncommons ──
  allin: {
    name: 'All In', emoji: '💸', type: 'attack', cost: 2, affinity: 'max',
    params: { dmg: roll(4) }, onAffinity: { dmg: roll(5) },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal damage equal to {dmg}.', affinityText: 'Use {dmg} instead.',
    upgrade: { params: { dmg: roll(5) }, onAffinity: { dmg: roll(7) } },
  },
  loadeddie: {
    name: 'Loaded Die', emoji: '🎲', type: 'skill', cost: 1, affinity: 'max',
    gate: { dieNotSetThisTurn: true },
    params: { lo: 3, hi: 5 }, onAffinity: { hi: { of: 'dieMax' } },
    ops: [{ op: 'chooseDie', min: 'lo', max: 'hi' }],
    text: 'Set the die to any value from {lo} to {hi}.', affinityText: 'Up to {hi} instead.',
    upgrade: { params: { lo: 4, hi: 6 } },
  },
  pocketaces: {
    name: 'Pocket Aces', emoji: '🂡', type: 'skill', cost: 1, affinity: 'max',
    params: { bonus: roll() }, onAffinity: { bonus: roll(2) },
    ops: [{ op: 'markBonus', amount: 'bonus' }],
    text: 'Your next damaging Attack this turn deals extra damage equal to {bonus}.', affinityText: 'Extra damage equal to {bonus} instead.',
    upgrade: { params: { bonus: roll(2) }, onAffinity: { bonus: roll(3) } },
  },
  doubleornothing: {
    name: 'Double or Nothing', emoji: '🪙', type: 'attack', cost: 1, affinity: 'max',
    params: { dmg: 6, bonus: 8, hpCost: 6 }, onAffinity: { bonus: 14, hpCost: 3 },
    ops: [
      { op: 'damage', amount: 'dmg' },
      { op: 'chance', win: [{ op: 'damage', amount: 'bonus' }], lose: [{ op: 'loseHp', amount: 'hpCost' }] },
    ],
    text: 'Deal {dmg} damage. Flip a coin: deal {bonus} more, or lose {hpCost} HP.',
    affinityText: '{bonus} more, or lose {hpCost} HP instead.',
    upgrade: { params: { dmg: 8, bonus: 10, hpCost: 4 }, onAffinity: { bonus: 16, hpCost: 2 } },
  },
  counttheodds: {
    name: 'Count the Odds', emoji: '🧮', type: 'skill', cost: 0, affinity: 'max',
    params: { look: 2, keep: 1 }, onAffinity: { look: 3, keep: 2 },
    ops: [{ op: 'topKeep', look: 'look', keep: 'keep' }],
    text: 'Look at the top {look|card} of your draw pile. Keep {keep}; discard the rest.',
    affinityText: 'Look at {look}, keep {keep} instead.',
    upgrade: { params: { look: 3, keep: 2 }, onAffinity: { look: 4, keep: 3 } },
  },
  highstakes: {
    name: 'High Stakes', emoji: '💰', type: 'skill', cost: 1, affinity: 'max',
    params: { gold: roll(3) }, onAffinity: { gold: roll(5) },
    ops: [{ op: 'gainGold', amount: 'gold' }],
    text: 'Gain Gold equal to {gold}.', affinityText: 'Use {gold} instead.',
    upgrade: { params: { gold: roll(4) }, onAffinity: { gold: roll(7) } },
  },
  bluff: {
    name: 'Bluff', emoji: '🎭', type: 'skill', cost: 1, affinity: 'max',
    params: { weak: 2, vuln: 0 }, onAffinity: { vuln: 1 },
    ops: [
      { op: 'status', target: 'enemy', status: 'weak', stacks: 'weak' },
      { op: 'status', target: 'enemy', status: 'vulnerable', stacks: 'vuln' },
    ],
    text: 'Apply {weak} Weak.', affinityText: 'Also apply {vuln} Vulnerable.',
    upgrade: {
      params: { vuln: 1 }, onAffinity: { weak: 3, vuln: 2 },
      text: 'Apply {weak} Weak and {vuln} Vulnerable.', affinityText: 'Apply {weak} Weak and {vuln} Vulnerable instead.',
    },
  },
  wildcardcombo: {
    name: 'Wild Combo', emoji: '🃏', type: 'attack', cost: 1, affinity: 'max',
    params: { dmg: 3, draw: 1 }, onAffinity: { dmg: 5, draw: 2 },
    ops: [{ op: 'damage', amount: 'dmg' }, { op: 'draw', n: 'draw' }, { op: 'rerollDie' }],
    text: 'Deal {dmg} damage. Draw {draw|card}. Reroll the die.', affinityText: 'Deal {dmg} and draw {draw} instead.',
    upgrade: { params: { dmg: 5 }, onAffinity: { dmg: 7 } },
  },
  pressyourluck: {
    name: 'Press Your Luck', emoji: '🎰', type: 'attack', cost: 2, affinity: 'max',
    params: { dmg: 10, bonus: 6 }, onAffinity: { dmg: 14, bonus: 10 },
    ops: [
      { op: 'damage', amount: 'dmg' },
      { op: 'rerollDie' },
      { op: 'damage', amount: 'bonus', if: { dieAbovePlayRoll: true } },
    ],
    text: 'Deal {dmg} damage. Reroll the die; if the new roll is higher, deal {bonus} more.',
    affinityText: 'Deal {dmg}, and {bonus} more, instead.',
    upgrade: { params: { dmg: 13, bonus: 7 }, onAffinity: { dmg: 18, bonus: 11 } },
  },
  jackpot: {
    name: 'Jackpot', emoji: '💎', type: 'skill', cost: 1, affinity: 'max', exhaust: true,
    params: { gold: roll(4) }, onAffinity: { gold: 40 },
    ops: [{ op: 'gainGold', amount: 'gold' }],
    text: 'Gain Gold equal to {gold}.', affinityText: 'Gain {gold} Gold instead.',
    upgrade: { params: { gold: roll(5) }, onAffinity: { gold: 50 } },
  },

  // ── Rares ──
  houseedge: {
    name: 'House Edge', emoji: '🏠', type: 'power', cost: 2,
    params: { floor: 3 },
    ops: [{ op: 'status', target: 'player', status: 'houseEdge', stacks: 'floor' }],
    text: 'Your die never rolls below {floor}.',
    upgrade: { cost: 1, params: { floor: 4 } },
  },
  luckystreak: {
    name: 'Lucky Streak', emoji: '⭐', type: 'power', cost: 1,
    params: { dmg: 4 },
    ops: [{ op: 'status', target: 'player', status: 'luckyStreak', stacks: 'dmg' }],
    text: 'Whenever the die rolls its max: draw 1 card and deal {dmg} damage, ignoring Block.',
    upgrade: { params: { dmg: 6 } },
  },
  gamblersfallacy: {
    name: "Gambler's Fallacy", emoji: '🎯', type: 'power', cost: 2,
    params: { misses: 3 },
    ops: [{ op: 'status', target: 'player', status: 'gamblerFallacy', stacks: 'misses' }],
    text: 'After {misses} rolls in a row that are not max, the next roll is max.',
    upgrade: { cost: 1, params: { misses: 2 } },
  },
  bettingitall: {
    name: 'Betting It All', emoji: '🎲', type: 'attack', cost: 3, affinity: 'max', exhaust: true,
    params: { dmg: { of: 'gold', div: 5, max: 30 } }, onAffinity: { dmg: { of: 'gold', div: 4, max: 40 } },
    ops: [{ op: 'damage', amount: 'dmg' }],
    text: 'Deal damage equal to {dmg}.', affinityText: 'Use {dmg} instead.',
    upgrade: {
      params: { dmg: { of: 'gold', div: 4, max: 45 } }, onAffinity: { dmg: { of: 'gold', div: 3, max: 60 } },
    },
  },
  loadedhouse: {
    name: 'Loaded House', emoji: '🃏', type: 'skill', cost: 1, affinity: 'max', exhaust: true,
    params: { rolls: 2 }, onAffinity: { rolls: 3 },
    ops: [{ op: 'forceMax', count: 'rolls' }],
    text: 'Your next {rolls|roll} are max.', affinityText: 'Next {rolls} instead.',
    upgrade: {},
    identicalUpgrade: 'The reference and CARD_UPGRADES_MASTER.md both define Loaded House+ exactly as the base card.',
  },
  devilsdeal: {
    name: "Devil's Deal", emoji: '😈', type: 'skill', cost: 1, affinity: 'max',
    params: { energy: 3, gold: { of: 'die', per: 10, min: 1 } }, onAffinity: { gold: { of: 'die', per: 4, min: 1 } },
    ops: [{ op: 'loseGold', amount: 'gold' }, { op: 'energy', amount: 'energy', overMax: 'energy' }],
    text: 'Lose Gold equal to {gold}. Gain {energy} Energy.', affinityText: 'Lose {gold} instead.',
    upgrade: { params: { gold: { of: 'die', per: 6, min: 1 } }, onAffinity: { gold: { of: 'die', per: 3, min: 1 } } },
  },
};
