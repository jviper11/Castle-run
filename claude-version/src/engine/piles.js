import { emit } from './log.js';
import { shuffle } from './rng.js';

// Card piles for one combat. Each card is an instance { uid, key }, so every copy has its own
// identity. The run deck is never modified by combat: exhaust is combat-scoped because the piles
// are rebuilt from the run deck at the start of every fight.

export function createPiles(c, deck) {
  return {
    draw: shuffle(c.run.rng, deck.map((card) => ({ ...card }))),
    hand: [],
    discard: [],
    exhaust: [],
  };
}

/** Draws up to `n` cards. Stops at the hand limit; reshuffles the discard when the draw pile runs out. */
export function drawCards(c, n) {
  const piles = c.piles;
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (piles.hand.length >= c.handLimit) {
      emit(c, 'handFull', { limit: c.handLimit });
      break;
    }
    if (!piles.draw.length) {
      if (!piles.discard.length) break;
      piles.draw = shuffle(c.run.rng, piles.discard);
      piles.discard = [];
      emit(c, 'reshuffle', { count: piles.draw.length });
    }
    const card = piles.draw.pop();
    piles.hand.push(card);
    drawn.push(card.uid);
  }
  if (drawn.length) emit(c, 'draw', { uids: drawn });
  return drawn.length;
}

export function discardHand(c) {
  const { hand, discard } = c.piles;
  if (!hand.length) return;
  emit(c, 'discardHand', { uids: hand.map((card) => card.uid) });
  discard.push(...hand);
  c.piles.hand = [];
}

export function takeFromHand(c, uid) {
  const i = c.piles.hand.findIndex((card) => card.uid === uid);
  if (i < 0) return null;
  return c.piles.hand.splice(i, 1)[0];
}

/** Removes up to `n` cards from the top of the draw pile, reshuffling the discard if needed. */
export function takeTop(c, n) {
  const piles = c.piles;
  const out = [];
  for (let i = 0; i < n; i++) {
    if (!piles.draw.length) {
      if (!piles.discard.length) break;
      piles.draw = shuffle(c.run.rng, piles.discard);
      piles.discard = [];
      emit(c, 'reshuffle', { count: piles.draw.length });
    }
    out.push(piles.draw.pop());
  }
  return out;
}

/**
 * Every card in the combat — used by integrity tests. Includes the card being resolved and
 * cards revealed by a pending choice, which are briefly in no pile.
 */
export function allCards(c) {
  const { draw, hand, discard, exhaust } = c.piles;
  const inFlight = [c.resolving?.card, ...(c.pending?.held ? c.pending.cards : [])].filter(Boolean);
  return [...draw, ...hand, ...discard, ...exhaust, ...inFlight];
}
