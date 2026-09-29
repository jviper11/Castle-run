import { shuffle } from './rng.js';
import { SHOP } from '../content/rooms.js';
import { baseKey, isUpgraded, getCard } from './cards.js';

// Shop stock and deck services. Stock is rolled once when you enter the shop and kept in the run
// state; a bought item is marked sold and cannot be bought again (PHASE3_PLAN X2).

// Dice are equipped from step 3c; until then die items are shown but cannot be bought.
export const DICE_AVAILABLE = false;

export function createShopStock(run) {
  const shelf = shuffle(run.rng, SHOP.items).slice(0, SHOP.shelfSize).map((item) => ({ ...item, sold: false }));
  shelf.push({ id: 'dieTile', kind: 'dieRandom', price: SHOP.dieTilePrice, sold: false });
  return shelf;
}

export function itemAvailable(item) {
  return !item.sold && (DICE_AVAILABLE || (item.kind !== 'die' && item.kind !== 'dieRandom'));
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
