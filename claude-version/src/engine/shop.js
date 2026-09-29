import { shuffle, pick } from './rng.js';
import { SHOP } from '../content/rooms.js';
import { offerableDice } from './dice.js';
import { baseKey, isUpgraded, getCard } from './cards.js';

// Shop stock and deck services. Stock is rolled once when you enter the shop and kept in the run
// state; a bought item is marked sold and cannot be bought again (PHASE3_PLAN X2).

export function createShopStock(run) {
  const shelf = shuffle(run.rng, SHOP.items).slice(0, SHOP.shelfSize).map((item) => ({ ...item, sold: false }));
  // The random die tile names the die it sells, rolled with the stock rather than at purchase, for
  // the same reason Magic Door contents are rolled with the map (X3): what is shown is what is
  // bought. It is dropped when there is nothing left to offer.
  const spare = offerableDice(run).filter((id) => !shelf.some((item) => item.die === id));
  if (spare.length) shelf.push({ id: 'dieTile', kind: 'die', die: pick(run.rng, spare), price: SHOP.dieTilePrice, sold: false });
  return shelf;
}

/** A die you already have equipped is shown, but is not a purchase worth allowing. */
export function itemAvailable(item, run) {
  return !item.sold && !(item.kind === 'die' && item.die === run.die);
}

export const canShopRemove = (card) => !SHOP.unremovable.includes(baseKey(card.key));
export const canUpgrade = (card) => !isUpgraded(card.key) && !!getCard(card.key);

/** Upgrades exactly one copy, by uid. */
export function upgradeCopy(run, uid) {
  const card = run.deck.find((x) => x.uid === uid);
  if (!card || !canUpgrade(card)) return false;
  card.key += '+';
  return true;
}

/** Removes exactly one copy, by uid. */
export function removeCopy(run, uid) {
  const i = run.deck.findIndex((x) => x.uid === uid);
  if (i < 0) return false;
  run.deck.splice(i, 1);
  return true;
}
