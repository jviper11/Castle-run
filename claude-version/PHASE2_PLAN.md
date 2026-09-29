# Phase 2 Plan — the remaining four heroes

**Status:** complete — implemented through step 2f and manually validated by the owner (2g). The owner chose the recommendation for all of D1–D5,
adding one rule for D2: bonus damage is spent only when applied to a damaging Attack. Awaiting
the owner's manual playtest (2g). Outcomes are recorded in `COMPARISON.md` §F–§G, and the card
catalogue is `CARDS.md`.

**Corrections found while implementing:**
- **F4 (Spell Echo+) and F5 (Loaded House+) are withdrawn.** The design document gives both
  upgrades the same effect as the base card, so there was nothing to restore. Both are flagged
  (COMPARISON G1).
- **E6's "params per copy" became "magnitude per copy".** A Power's stacks hold its number, and
  copies add. The two Powers whose upgrade adds a different effect use `statusData`:
  - Vampiric Form+ adds Regen.
  - Eternal Hunger+ adds a cap. It defines its own merge rule, because any uncapped copy
    uncaps the whole status.

**Scope:** the Mage, Thief, Vampire and Gambler, each with:
- a starter deck
- a full reward pool (common, uncommon, rare)
- every card and its upgrade
- the Power statuses those cards create

This is about 110 new cards. Floor 1 and the six-fight gauntlet stay exactly as they are.

**Out of scope:**
- curses (Phase 4, with events)
- relic interactions with cards, such as Crimson Lens and Devil's Ledger (Phase 4)
- die types other than d6 (Phase 3/4)

**Sources:**
- the reference `CARDS` / `CARD_UPGRADES` (`../js/data.js:83-510`)
- `CHAR_REWARD_POOLS` (`../js/ui.js:1005`)
- the combat hooks in `../js/combat.js`
- `../CARD_UPGRADES_MASTER.md` for design intent, where code and text disagree

---

## 1. Architecture: extensions only

Phase 1's structure stays as it is. Every item below adds an entry to a registry or a field to
combat state that `createCombat()` builds. No new fight-start path, no timers in rules, and no
change to how the UI talks to the engine.

### E1. Derived values
Many cards scale with something:
- the die (Wild Card: die ×2)
- Gold (Golden Strike: Gold ÷ 10, max 15)
- enemy statuses (Combustion: 3 + Burn stacks)
- a turn counter (Arcane Barrage: 3 + Skills/Powers played)

A param may now be a small formula over a named **source**:

```js
params: { dmg: { flat: 3, per: 1, of: 'spellsThisTurn' } }
params: { dmg: { per: 1, div: 10, of: 'gold', max: 15 } }
```

Every coefficient still lives in one place.
- **Text:** rendered from the formula, e.g. "Deal 3 + 1 per Skill/Power played this turn".
- **Live value:** shown in combat, e.g. **7**.
- **Content lint:** extended to cover formulas.

This replaces the reference's hand-copied Arcane Barrage preview (`../js/ui.js:~2470`).

**Sources:** `die`, `gold`, `enemy.<status>`, `player.<status>`, `spellsThisTurn`,
`cardsPlayedThisTurn`, `damageDealt` (the HP the card's own hits removed; used by Drain Life
and Soul Rend).

### E2. Condition registry additions
Each condition gets a test plus a generated reason string:
- `firstCardThisTurn` (Backstab)
- `enemyHas: { status, min }` (Ice Lance, Assassinate, Frostfire)
- `playerHas` (Shadow Feast)
- `handAtLeast` (Void Channel, Arcane Boost)
- `dieIsMax`, `dieAtLeast`
- `dieNotSetThisTurn` (Loaded Die, Safe Pull)

The Gambler's "Max:" clauses become an affinity-like line labelled **Max**. That keeps the
existing "active clause glows" UI working for them.

### E3. Die operations and roll hooks
`c.die` gains:
- `setThisTurn`
- `forcedMax` (charges, combat-scoped)
- min-roll contributions from statuses

New ops:
- `dieAdd` / `dieMultiply`, both clamped to **1…sides**
- `dieSet` (value or player choice; once per turn)
- `dieRoll` (a mid-turn reroll that runs roll hooks)

`rollDie()` gains an `onRoll` hook pass, used by Lucky Streak, Vampiric Form and Gambler's Fallacy.

### E4. Turn counters in combat state
`spellsThisTurn`, `attacksThisTurn`, `cardsPlayedThisTurn` (already exists) and `setThisTurn`.
All are reset in `startTurn()`, the single place that turn state resets.

### E5. Cost pipeline
`cardCost(c, card)` becomes an ordered list of modifiers, matching the reference order:

> curse tax → next-card discount → positional free (Shadow Artist) → per-turn discount (Shadow
> Artist+) → next-card free → next-Skill free

One-shot discounts are **charges** on `c.flags`. The same function serves display and payment:
it runs with `consume: false` for display and `consume: true` for payment.

### E6. Status hooks
Power statuses gain optional hook functions:

| Hook | Used by |
|---|---|
| `onCardPlayed` | Blood Lord, Lethal Rhythm |
| `onRoll` | Lucky Streak, Vampiric Form, Fallacy |
| `burnTickBonus` | Burning Soul |
| `poisonTickBonus` | Poison Master |
| `chillMultiplier` | Cold Mastery |
| `onRegenTick` | Eternal Hunger |
| `minRoll` | House Edge |
| `costModifier` | Shadow Artist |

The damage pipeline and `endTurn` call these hooks at their existing numbered steps. Phase 4's
relics will register against the same hook points, so this is built once and used twice.

**Upgraded Powers carry their own params.** A status stores `{ stacks, ...params }` rather than
using `stacks === 2` to mean "upgraded". Base and upgraded copies stack predictably. This extends
Phase 1's Berserker's Oath fix (COMPARISON A3).

### E7. Next-Attack effects
`c.flags.echo` (Spell Echo) and `c.flags.markBonus` (Shadow Mark, Pocket Aces, Blood Rush).
- **Echo** re-runs the next Attack's ops with the same resolved params.
- **Mark bonus** is added to the next Attack. Whether that goes through the damage pipeline is
  decision D2.

### E8. Player choices
This is the one genuinely new mechanism. `playCard` may leave a **pending choice** on combat
state:

```js
c.pending = { kind: 'chooseCards', from: 'hand' | 'discard' | 'top', count, then: 'discard' | 'keep' | 'toHand' }
c.pending = { kind: 'chooseDie', min, max }
```

- While a choice is pending, `endTurn` and `playCard` are refused.
- `resolveChoice(c, answer)` finishes the card.
- The UI shows a selection mode over the hand, or a pile viewer or die picker, with a Confirm
  button.
- The reference's Void Channel selection is asynchronous and does not lock End Turn
  (`../js/ui.js:2998`). Here the engine enforces the lock.
- The fuzz agent answers choices at random, so every choice path is fuzzed.

### E9. Other small ops
- `gold` (can be negative, floored at 0)
- `multiplyStatus` (Death Mark, Blood Tide), with a cap param
- `clearStatus` (Frozen Inferno)
- `heal` from `damageDealt`
- `discardRandom`
- `drawFromDiscard`
- `topKeep`

---

## 2. Work order

Each step ends with `npm test` green. A step that adds a hero also runs the headless-Chrome
autoplay for that hero.

| Step | Content | Why this order |
|---|---|---|
| **2a** | E1–E9 plus unit tests, using stand-in cards defined inside the tests only | Mechanics proven before content depends on them |
| **2b** | **Thief** (27 cards) | Uses most of the cost pipeline, Poison, Weak/Vulnerable and first-card conditions; needs only one choice (Smoke Screen / Nimble Pace discard) |
| **2c** | **Vampire** (28) | Regen, Fly, HP costs, heal-from-damage, Blood Lord / Eternal Hunger hooks |
| **2d** | **Mage** (27, incl. Fireball, Blizzard, Time Warp) | Burn/Chill hooks, Spell Echo, die modifiers, the Void Channel choice |
| **2e** | **Gambler** (30) | Heaviest die work: min roll 2, forced max, mid-turn rerolls, die-value damage, Gold |
| **2f** | Hero select unlocks all five. A generated `CARDS.md` catalogue lists every card's text and upgrade, rendered by the engine itself, for owner review. Balance fuzz: each hero's starter deck vs each Floor 1 enemy, win rate and turn count reported. | Review surface for 2g |
| **2g** | Owner manual playtest per hero, recorded in the validation log | Phase exit |

---

## 3. Fixes to apply

These are places where the reference code contradicts its own card text or
`CARD_UPGRADES_MASTER.md`. Each one follows the design text and will be logged in
`COMPARISON.md`.

| # | Card | Reference behaviour | Fix, per design text |
|---|---|---|---|
| F1 | Mana Surge+, Mana Weave (High) | `_manaWeaveCount` is written and never read, so only 1 card is discounted (`../js/data.js:147, 315, 325`) | Discounts the next 2 cards, as printed (MASTER:96, :113) |
| F2 | Time Warp | The upgrade is keyed `'timewarp+'`, so it registers as `timewarp++` and can never be reached (`../js/data.js:330`) | Upgrade is reachable: "Draw 2, gain 2 Energy. High: draw 4 + 3 Energy" (MASTER:125) |
| F3 | Shadow Artist+ | Its discount counter is zeroed every `startTurn` (`../js/combat.js:1156`), so it works on one turn only | "First 3 cards each turn cost 1 less", every turn (MASTER:28, :172) |
| F4 | Spell Echo+ | Identical to the base card | "High: next 2 Attacks trigger twice" (MASTER:126) |
| F5 | Loaded House+ | Identical to the base card | Base: 2 forced max rolls. Upgraded: 2, or 3 on a Max roll (MASTER:32, :268) |
| F6 | Arcane Boost, Void Channel | The die can exceed its max face (`../js/data.js:129`, `../js/ui.js:3025`), breaking every `=== max` check | Clamped to the die's faces |
| F7 | Arcane Momentum (base) | Its cap is 0 until the next `startTurn`, so it does nothing on the turn it is played | Active immediately, cap 3 per turn |
| F8 | Loaded House / Gambler's Fallacy | `_guaranteedMax` is never reset, so leftover charges carry into the next fight | Combat-scoped (free with `createCombat()`) |
| F9 | Eternal Hunger(+) | Base and upgrade behave identically, and the code (2 × Regen stacks, max 15) disagrees with the base text ("2 dmg") | **Decision D4** |
| F10 | Power statuses | `stacks === 2` means upgraded; base + upgraded (3) falls back to base, and 2 × Shadow Artist turns it off | Params per copy (E6) |
| F11 | Descriptions | lifeleech, frostfire, devilsdeal, highorlow, fireball/frostbolt, swoopdown/batform omit or misstate numbers | Text is generated from params, so this is fixed automatically |

## 4. Kept + flagged (reference behaviour kept)

- **Discount consumption:** when an earlier rule has already made a card free, the reference
  still spends every one-shot discount on it (e.g. Mana Surge and Disappear both used on one
  card). **Decision D3.**
- **Refunds on failed conditions:** Backstab and Loaded Die refund; Void Channel and Arcane Boost
  do not (they only warn). This extends Phase 1's C2. The plan applies the **refund rule to all
  four** for consistency, and logs that as a difference.
- **Spell Echo re-runs the whole card**, including coin flips and rerolls inside it (Double or
  Nothing, Press Your Luck). Kept.
- **Frostfire's status checks** happen before its own statuses are applied. Kept.
- **Crimson Lens exclusion** on Drain Life and Soul Rend is noted for Phase 4 relics.

## 5. Tests added in Phase 2

- **Unit tests:** one per mechanic E1–E9, plus each fix F1–F10 asserted against its design
  text.
- **Content lint:**
  - Formula params render.
  - Every `when` condition exists.
  - Every status an op names exists.
  - Every card in a pool or starter deck exists.
  - Every Power has a status definition.
- **Fuzz:**
  - All five heroes, random decks from their pools with random upgrades, against every Floor 1
    enemy.
  - New invariants: the die stays within 1…sides; Energy is never negative; a pending choice
    always resolves; the displayed cost equals the Energy actually paid.
- **Browser:** headless autoplay of a full gauntlet for each hero, including the choice UIs, at
  desktop and 844×390.

---

## 6. Decisions needed before coding

Each has a recommendation. Anything not listed follows §3 and §4.

**D1. Cards whose text promises a choice but whose reference code picks at random:** Arcane
Boost, Smoke Screen, Nimble Pace, Arcane Recall, Loaded Die, Count the Odds. Void Channel is
already a real choice.
- **Recommendation: make them real choices** through E8. Both the card text and
  CARD_UPGRADES_MASTER (e.g. "Set die to any value 4-6", "Keep 2 discard 1") describe a choice.
- The alternative is to keep random resolution and reword the text to say "random".

**D2. Next-Attack and passive bonus damage (Shadow Mark, Pocket Aces, Blood Rush, Lethal Rhythm,
Lucky Streak):** the reference subtracts HP directly. That ignores Block, Vulnerable, Weak and
Strength, and Shadow Mark is used up by Inferno (an Attack that deals no damage) and by a failed
Backstab.
- **Recommendation:** Shadow Mark-type bonuses add to the next damaging Attack's first hit, so
  they go through the pipeline and Block. Lethal Rhythm and Lucky Streak stay flat "true damage"
  but check for death immediately.
- The alternative is to keep all five as raw HP loss.

**D3. One-shot discounts on a card that is already free:**
- **Recommendation:** a discount is spent only if it lowered the cost.
- The alternative is to keep the reference, which spends them all.

**D4. Eternal Hunger:** the code deals 2 × Regen stacks per tick, max 15 per turn, identically
for base and upgrade. MASTER:27 says "+ deals 2 dmg (not 4), capped at 15", which suggests
base = 4 per tick and + = 2 with the cap.
- **Recommendation:** base deals 2 × Regen stacks with no cap; + adds the 15-per-turn cap. This
  keeps the code's formula and makes the upgrade different.
- If you know the intended numbers, those win.

**D5. The Gambler's passive "Lucky Streak on max":** the reference only refreshes a reroll when
you still have one (`../js/combat.js:2017`), so it never grants anything.
- **Recommendation:** a max roll grants +1 reroll this turn.
- The alternative is to drop the passive. Either way it will be logged.
