import { getCard } from './cards.js';
import { stacks } from './statuses.js';

// Card cost. One function serves the hand display (consume: false) and payment (consume: true),
// so the number on the card is always the Energy that will be spent.
//
// Modifiers run in the reference build's order (../js/combat.js getCardEnergyCost). One-shot
// discounts are charges in c.turnState. A charge is spent only if it actually lowered the cost
// (decision D3), so an already-free card never wastes a Mana Surge.
// The Void Stalker's Curse is a surcharge, so it is applied to the base cost **before** the
// discount list below, never after: the discounts include hard overrides to 0, and taxing after
// one of those would resurrect a card the game had just shown as free.
// Player-side Curse cards will join it there in Phase 4.

const MODIFIERS = [
  { // Mana Surge / Mana Weave: next N cards cost 1 less.
    charge: 'discountNext',
    apply: (cost) => cost - 1,
  },
  { // Shadow Artist: the 2nd and 4th card each turn cost 0.
    applies: (c, def, position) => stacks(c.player, 'shadowArtist') && (position === 2 || position === 4),
    apply: () => 0,
  },
  { // Shadow Artist+: the first 3 cards each turn cost less.
    applies: (c, def, position) => stacks(c.player, 'shadowArtistPlus') && position <= 3,
    apply: (cost, c) => cost - stacks(c.player, 'shadowArtistPlus'),
  },
  { // Disappear / Cursed Veins: next N cards cost 0.
    charge: 'freeNext',
    apply: () => 0,
  },
  { // Cursed Veins (Extreme): next Skill costs 0.
    charge: 'freeSkillNext',
    applies: (c, def) => def.type === 'skill',
    apply: () => 0,
  },
];

export function cardCost(c, card, { consume = false } = {}) {
  const def = getCard(card.key);
  const position = c.turnState.cardsPlayed + 1;
  let cost = def.cost + (c.turnState.cursedUid === card.uid ? c.turnState.cursedAmount : 0);
  for (const m of MODIFIERS) {
    if (m.charge && !(c.turnState[m.charge] > 0)) continue;
    if (m.applies && !m.applies(c, def, position)) continue;
    const next = Math.max(0, m.apply(cost, c));
    if (next >= cost) continue;
    cost = next;
    if (consume && m.charge) c.turnState[m.charge] -= 1;
  }
  return cost;
}
