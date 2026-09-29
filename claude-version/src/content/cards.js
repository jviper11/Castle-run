// Card content. Data only: no functions and no engine imports. One file per hero in ./cards/.
//
// ── Numbers ──
// Every number a card uses is declared once in `params`. Text templates refer to params by
// name, so the text cannot drift from the effect. A param is a number, or a formula over a
// named source (engine/values.js), e.g. { of: 'die', per: 2 } or { of: 'gold', div: 10, max: 15 }.
//
// Resolution, once, as the card is played:
//   params → matching `when` overrides → `onAffinity` → the matching `when`'s `onAffinity`
// `affinity` is the die condition for `onAffinity`: even, odd, high, extreme, or max.
// An upgrade (`key+`) lists only what changes: cost, params, onAffinity, when[i], and — only when
// the upgrade is a different effect — ops, text, gate or exhaust. An upgrade with its own ops
// supplies its complete params. `identicalUpgrade: 'why'` marks an upgrade that changes nothing.
//
// ── Conditions (engine/conditions.js) ──
//   gate: {...}  the card fizzles (Energy refunded, card spent) unless it holds
//   when: [{ if: {...}, params, onAffinity, text }]  param overrides while it holds
//   op-level `if: {...}`  checked when that op runs (e.g. after a reroll inside the card)
//
// ── Ops (engine/ops.js), run in order ──
// A string value is a param name; an op whose amount resolves to 0 is skipped.
//   damage {amount, hits}      block {amount}          heal {amount}
//   loseHp {amount}            selfDamage {amount}     stripBlock {amount}      entrench
//   status {target, status, stacks, data}    multiplyStatus {target, status, factor, max}
//   clearStatus {target, status}             draw {n}     energy {amount, overMax}
//   gainGold {amount}          loseGold {amount}       souls {amount}
//   discountNext / freeNext / freeSkillNext / echo {count}      markBonus {amount}
//   rerollDie   dieAdd {amount}   dieMultiply {factor, set}   dieTo {value}   dieSet {value}   dieBestOf {n}
//   forceMax {count}           chance {p, win: [ops], lose: [ops]}
//   choices: chooseDiscard {n}  chooseFromDiscard {n}  topKeep {look, keep}  chooseDie {min, max}
//
// ── Text ──
// `text` renders with the base params. `affinityText` renders with the affinity params and is
// shown under the affinity label. `when[i].text` renders with that entry's params; inside it,
// `{aff.x}` is the same param with affinity applied. `{n|card}` pluralises. A formula param
// renders in words, plus its current value in combat.
//
// Keys match the reference build's CARDS keys, so the two builds can be compared line by line.

import { SHARED_CARDS } from './cards/shared.js';
import { BARBARIAN_CARDS } from './cards/barbarian.js';
import { THIEF_CARDS } from './cards/thief.js';
import { VAMPIRE_CARDS } from './cards/vampire.js';
import { MAGE_CARDS } from './cards/mage.js';
import { GAMBLER_CARDS } from './cards/gambler.js';

export const CARDS = {
  ...SHARED_CARDS,
  ...BARBARIAN_CARDS,
  ...THIEF_CARDS,
  ...VAMPIRE_CARDS,
  ...MAGE_CARDS,
  ...GAMBLER_CARDS,
};

export const CARDS_BY_HERO = {
  shared: Object.keys(SHARED_CARDS),
  barbarian: Object.keys(BARBARIAN_CARDS),
  thief: Object.keys(THIEF_CARDS),
  vampire: Object.keys(VAMPIRE_CARDS),
  mage: Object.keys(MAGE_CARDS),
  gambler: Object.keys(GAMBLER_CARDS),
};
