import { createRun, addCard } from '../src/engine/run.js';
import { createCombat } from '../src/engine/combat.js';
import { applySoulUpgrade } from '../src/engine/soul.js';
import { drain } from '../src/engine/log.js';

/**
 * A combat with a controlled deck. Options:
 *   enemy  — enemy id (default: the easy Dungeon Rat, which has no abilities)
 *   deck   — card keys (default: the Barbarian starter deck)
 *   hp     — starting player HP
 *   seed   — RNG seed
 *   die    — equipped die type (default: the d6 every run starts on)
 *   soul   — Soul Forge upgrade ids to buy before the fight
 */
export function makeCombat({ enemy = 'ratEasy', deck = null, hp = null, seed = 1, kind = 'normal', hero = 'barbarian',
  die = null, soul = [] } = {}) {
  const run = createRun({ heroKey: hero, seed });
  if (deck) {
    run.deck = [];
    deck.forEach((key) => addCard(run, key));
  }
  if (hp != null) run.hp = hp;
  if (die) run.die = die;
  soul.forEach((id) => applySoulUpgrade(run, id));
  const c = createCombat(run, enemy, { kind });
  drain(c);
  return c;
}

/**
 * A combat whose opening turn-start roll is exactly `value`, found by trying seeds. Turn-start die
 * bonuses fire inside startTurn(), so they cannot be tested by setting the die afterwards.
 */
export function combatRolling(value, opts = {}) {
  for (let seed = 1; seed <= 5000; seed++) {
    const c = makeCombat({ ...opts, seed });
    if (c.die.value === value) return c;
  }
  throw new Error(`no seed in 1..5000 opened on ${value} for ${JSON.stringify(opts)}`);
}

/** Puts specific cards in hand (added fresh, outside the deck) and returns their uids. */
export function giveHand(c, keys) {
  c.piles.hand = keys.map((key, i) => ({ uid: 1000 + i, key }));
  return c.piles.hand.map((card) => card.uid);
}

export function setRoll(c, value) {
  c.die.value = value;
}

export function eventsOf(c, type) {
  return drain(c).filter((e) => !type || e.type === type);
}

/**
 * Forces the enemy's next move. An intent is a list of actions (engine/enemies.js), so a test
 * that wants one specific move says so through this rather than hand-building the wrapper.
 */
export function forceIntent(c, ...actions) {
  c.enemy.intent = { actions };
}

/** The first action of a given kind in a plan from previewIntent(). */
export function actionOf(plan, kind = 'attack') {
  return plan.actions.find((a) => a.kind === kind);
}
