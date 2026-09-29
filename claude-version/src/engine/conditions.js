import { stacks, STATUSES } from './statuses.js';

// Named conditions used by cards: in `gate` (can it resolve?), in `when` (which params apply)
// and in op-level `if` (evaluated when that op runs, e.g. after a mid-card reroll).
//
// Gates and `when` are evaluated once, as the card is played, against the state the player
// saw — the card still in hand and not yet counted. That is the same state the hand display
// renders from, so "what you see is what you get". Op-level `if` sees the state at that op.
//
// A condition value is a plain argument: { hpPctAtMost: 50 }, { enemyHas: 'chill' },
// { enemyHas: { status: 'poison', min: 5 } }. Several keys in one object must all hold.

const statusArg = (v) => (typeof v === 'string' ? { status: v, min: 1 } : { min: 1, ...v });

export const CONDITIONS = {
  hpPctAtMost: {
    test: (c, pct) => c.player.hp <= (c.player.maxHp * pct) / 100,
    text: (pct) => `at or below ${pct}% HP`,
  },
  firstCardThisTurn: {
    test: (c) => c.turnState.cardsPlayed === 0,
    text: () => 'it is the first card you play this turn',
  },
  handAtLeast: {
    // Counts the other cards in hand; the card being played is still in hand when checked.
    test: (c, n) => c.piles.hand.length - 1 >= n,
    text: (n) => `you hold ${n} other card${n === 1 ? '' : 's'}`,
  },
  enemyHas: {
    test: (c, v) => stacks(c.enemy, statusArg(v).status) >= statusArg(v).min,
    text: (v) => {
      const { status, min } = statusArg(v);
      return `the enemy has ${min > 1 ? min + '+ ' : ''}${STATUSES[status].name}`;
    },
  },
  playerHas: {
    test: (c, v) => stacks(c.player, statusArg(v).status) >= statusArg(v).min,
    text: (v) => `you have ${STATUSES[statusArg(v).status].name}`,
  },
  dieAtLeast: {
    test: (c, n) => c.die.value >= n,
    text: (n) => `the die shows ${n}+`,
  },
  dieIsMax: {
    test: (c) => c.die.value === c.die.sides,
    text: () => 'the die shows its max',
  },
  dieNotSetThisTurn: {
    test: (c) => !c.turnState.dieSet,
    text: () => 'the die has not been set this turn',
  },
  dieAbovePlayRoll: {
    // Only meaningful at op time, after the card rerolled.
    test: (c, _v, ctx) => c.die.value > ctx.playRoll,
    text: () => 'the new roll is higher',
  },
};

export function conditionMet(c, cond, ctx = null) {
  return Object.entries(cond).every(([k, v]) => {
    const def = CONDITIONS[k];
    if (!def) throw new Error(`Unknown condition: ${k}`);
    return def.test(c, v, ctx);
  });
}

export function conditionText(cond) {
  return Object.entries(cond).map(([k, v]) => CONDITIONS[k].text(v)).join(' and ');
}
