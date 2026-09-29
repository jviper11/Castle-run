import { createRun, addCard } from '../src/engine/run.js';
import { createCombat } from '../src/engine/combat.js';
import { drain } from '../src/engine/log.js';

/**
 * A combat with a controlled deck. Options:
 *   enemy  — enemy id (default: the easy Dungeon Rat, which has no abilities)
 *   deck   — card keys (default: the Barbarian starter deck)
 *   hp     — starting player HP
 *   seed   — RNG seed
 */
export function makeCombat({ enemy = 'ratEasy', deck = null, hp = null, seed = 1, kind = 'normal', hero = 'barbarian' } = {}) {
  const run = createRun({ heroKey: hero, seed });
  if (deck) {
    run.deck = [];
    deck.forEach((key) => addCard(run, key));
  }
  if (hp != null) run.hp = hp;
  const c = createCombat(run, enemy, { kind });
  drain(c);
  return c;
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
