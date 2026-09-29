// Die types. Data only; the effects live at the choke points that own them —
//   `minRoll`     engine/dice.js  (folded into the die's roll floor)
//   `oddDamage`   engine/damage.js (the player attack pipeline)
//   `evenEnergy`  engine/combat.js (startTurn, on the turn-start roll only)
//   `maxDraw`     engine/combat.js (startTurn, on the turn-start roll only)
//
// One die is equipped at a time (`run.die`); a new one replaces it. Values are the reference
// build's (../js/data.js DICE_TYPES). The GDD has no die-type system at all — §8 says only
// "each character has one active die (d6 by default)" — so every number here is the reference's
// invention, not design authority. See COMPARISON.md §H5.
//
// `text` is a {param} template over `params`, so a die's description cannot drift from its effect.

export const STARTING_DIE = 'd6';

export const DICE = {
  d4: {
    id: 'd4', sides: 4, emoji: '🔺', name: 'Cursed Die', bonus: 'minRoll',
    params: { minRoll: 3 },
    text: 'Any roll below {minRoll} becomes {minRoll}. A low ceiling on a high floor.',
  },
  d6: {
    // The reference uses '⚀', a text-presentation codepoint that falls back to a tofu box in the
    // status chip on Windows; every other die here uses a real emoji, so this one does too.
    id: 'd6', sides: 6, emoji: '🎲', name: 'Standard Die', bonus: null, params: {},
    text: 'Your starting die. Reliable and familiar.',
  },
  d8: {
    id: 'd8', sides: 8, emoji: '🎱', name: "Hunter's Die", bonus: 'oddDamage',
    params: { damage: 2 },
    text: 'Your attacks deal +{damage} damage while the die shows an odd number.',
  },
  d10: {
    id: 'd10', sides: 10, emoji: '🔷', name: 'Arcane Die', bonus: 'evenEnergy',
    params: { energy: 1 },
    text: 'An even roll at the start of your turn restores {energy} Energy.',
  },
  d12: {
    id: 'd12', sides: 12, emoji: '💠', name: "Titan's Die", bonus: 'maxDraw',
    params: { draw: 1 },
    text: 'Rolling the max face at the start of your turn draws {draw} extra card.',
  },
  d20: {
    id: 'd20', sides: 20, emoji: '🌟', name: 'Legendary Die', bonus: null, params: {},
    // Decision D8: the reference's `legendary` bonus was never read and its "affinity activates on
    // 15+" text was false. Shipped with no bonus and text that describes only what happens.
    text: 'No bonus of its own. A huge spread, so Max and Extreme are rare; High scales with it.',
  },
};

// The floor (zero-based, as `run.floor`) each die can first be offered on, from the reference's
// showDieReward(). d6 is absent because it is never offered — it is only ever the die you start
// with, and a die you already have is filtered out separately.
export const DIE_MIN_FLOOR = { d4: 0, d8: 0, d10: 1, d12: 2, d20: 3 };

export const DIE_CACHE_OFFERS = 2; // reference showDieReward() picks 2
