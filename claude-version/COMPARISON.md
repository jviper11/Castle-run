# claude-version vs reference build — behaviour differences

This file tracks every place where claude-version behaves differently from the reference build
(`../index.html`, `../js/`). It also lists the reference behaviours that were kept even though
they may deserve a decision.

- "Reference" means the code as of commit `038d9a8`.
- "GDD" means `../GDD.md` v0.10.
- Scope: Phases 1–2 — all five heroes and their cards, Floor 1 enemies, combat, and card rewards.
- Phase 2 (the four new heroes) is covered in §F and §G.
- Phase 3 (the castle run) is covered in §H.

Each entry has one of these statuses:

| Status | Meaning |
|---|---|
| **Fixed** | Deliberately differs from the reference, to follow the GDD. |
| **Kept + flagged** | Reference behaviour kept, but it conflicts with the GDD or is ambiguous. Needs an owner decision. |
| **Planned** | An agreed fix for content that does not exist here yet. |
| **Structural** | A different mechanism with the same player-facing result. |
| **V2 design** | New design, deliberately neither the reference's behaviour nor a GDD rule, adopted because the GDD does not cover the case. Decided, not pending. |

---

## A. Fixed

### A1. Iron Archer's Aim: the intent shown is the move that happens
- **Reference:**
  - The displayed intent is a random attack/defend roll.
  - At enemy step 5, Aim overwrites it: on odd turns it forces `defend`, which gains 8 Block; on
    even turns it sets `damage = 20` permanently.
  - So the player sees one move and a different one resolves (`js/data.js:744`).
- **Here:**
  - The intent is planned from the Aim pattern: odd turns show 🎯 *Aiming* and do nothing, even
    turns show and deal 2× damage (20).
  - GDD §8: *"Aim: skips a turn then deals double damage."*
- **Player-visible difference:** the Archer no longer gains 8 Block on its aim turns, and its
  intent is never wrong.

### A2. Intent is a planned move object, for every enemy
- **Reference:** `updateIntent()` and `endTurn()` STEP 6 read the same fields, but specials can
  change those fields between display and resolution (A1 is the Floor 1 case).
- **Here:**
  - `planIntent()` builds one `{ kind, base, hits }` object at the end of each enemy turn.
  - The UI shows that object, and `resolveIntent()` executes the same object.
  - The fuzz suite asserts, over thousands of combats, that the shown per-hit damage equals the
    damage that lands.

### A3. Power stacks add up instead of meaning "upgraded"
- **Reference:**
  - Berserker's Oath checks `stacks === 2 ? 4 : 3` (`js/combat.js` `loseHP`).
  - A second **base** copy therefore behaves like one upgraded copy (4 Block).
  - Three copies also give 3, because 3 ≠ 2.
- **Here:**
  - The status stores its magnitude: base adds 3, upgraded adds 4.
  - Two base copies give 6 Block per HP loss.
- **Applies to:** every "Power status" in the reference that uses the `stacks === 2` convention.
  Phase 1 has only Berserker's Oath; the rest come with their heroes in Phase 2.

### A4. Card text matches the thresholds the code actually uses
- Death Rattle's reference text says *"below 50% HP"*, but the check is `hp <= maxHp * 0.5`.
- Last Stand's reference text says *"Below 30% HP"*, but the check is `hp <= maxHp * 0.3`.
- The text here says "at or below", matching the unchanged behaviour.
- All card text is now generated from the same params the effect uses (see
  IMPLEMENTATION_PLAN.md). Numbers are unchanged from the reference; the wording is tidied, e.g.
  "Deal 10 dmg. Even: deal 16 dmg." becomes "Deal 10 damage. / Even: Deal 16 instead."

---

## B. Planned (agreed fixes, content not in Phase 1)

| # | Fix | Reference location | Phase |
|---|---|---|---|
| B1 | **Holy Wrath** (Sanctum Guardian) doubles damage for that attack only. The reference does `g.enemy.damage *= 2`, which doubles permanently on every trigger. | `js/data.js:840` | 3 |
| B2 | **Dead enemy abilities** made to work. | see below | 3 |
| B3 | **Aldric Phase 2 volley** resolves all three hits in order, before the death check and before the next turn's Block reset. The reference fires hits 2–3 on 200/400 ms timers, after `checkCombatEnd()` and after the 300 ms `startTurn()`. | `js/combat.js:333-335` | 5 |
| B4 | **Aldric intent** shows his real attack. The reference can display a random "Defend" while `processAldricTurn()` always attacks. | `js/combat.js` STEP 10 / `updateIntent` | 5 |
| B5 | **Souls counted once** at run end. The reference adds every gain to `runSouls` and then adds `G.souls` again on defeat. | `js/combat.js:2862`, `:2925` | 5 |

The dead abilities in B2:

| Enemy | Ability | Problem in the reference |
|---|---|---|
| Shadow Wraith | Phase | Sets `_phased`, which nothing reads (`js/data.js:755, 778`) |
| Stone Gargoyle | Stone Skin | Sets `_stoneShield`, which nothing reads (`js/data.js:781`) |
| Bone Golem | Bone Wall | Its `skill` trigger is never dispatched |
| Void Stalker | Curse | Message only |
| Dark Arcanist | Spell Steal | Message only |

The engine already makes all of these impossible to leave half-built: combat has one entry
point, abilities are a registry, and there are no timers in rules.

---

## C. Kept + flagged (needs an owner decision)

### C1. Shield Up and Iron Stance reset the enemy's Block every turn
- **Reference:**
  - `endTurn()` STEP 5 sets `G.enemy.block = 0` before these abilities run.
  - Castle Guard therefore holds 6 Block only on even turns.
  - Armored Knight's Block becomes exactly 6 each turn, and its starting 12 Block is wiped at
    its first turn.
- **Conflict:** GDD §4 says *"Enemy block is persistent"*. Read literally, the Knight would stack
  +6 every turn with no ceiling.
- **Kept as the reference does it.** The ability text shown in-game states the reset honestly.

### C2. Conditional cards refund Energy instead of being unplayable
- Death Rattle above 50% HP can still be played: Energy is refunded and the card goes to the
  discard pile.
- The reference documents this "warning only" contract as deliberate in `CLAUDE.md`
  (`CARD_PLAY_CONDITIONS`).
- **Conflict:** GDD's *"Only playable below 50% HP"* reads as a hard gate.
- **Kept.** It is effectively a free discard, which may or may not be intended.

### C3. Skipping a card reward gives 10 Gold
- The reference `skipReward()` gives +10.
- **Conflict:** GDD §10 and §13 say 50.
- **Kept at 10.** It is a single constant: `REWARD_ODDS.skipGold`.

### C4. Rerolls are per turn
- GDD §4 says rerolls reset each turn, and the reference does this.
- GDD's AI guideline says *"Reroll is limited per combat — does not reset between cards"*.
- **Kept per turn.**

### C5. Dungeon Rat's Swarm heals once, on its 3rd turn
- The reference fires only when `turn === 3`.
- GDD §8: *"heals 5 HP if alive for 3+ turns"* could mean every turn from the 3rd onward.
- **Kept as once.** The in-game text says "On its 3rd turn".

### C6. Other reference details kept as-is
- An enemy's first intent is always an attack. After that it is 65% attack / 35% defend (+8 Block).
- Card rewards leave out cards whose exact key is already in the deck. This rule is not in the
  GDD.
- Rewards use one rarity roll for all three cards: rare 5% (+1% pity per common result, up to
  +30%), uncommon 25%. Elites: 10% / 35%, no pity.
- Battle Trance caps Energy at max + 2.
- Starting Gold is 30.
- Souls: 1 per normal fight, 2 per elite (GDD §15).
- Cursed Reroll's self-damage goes through Block. The HP costs on Blood Price, Reckless Lunge and
  Battle Trance ignore Block and cannot drop you below 1 HP.

---

## D. Structural (same result for the player)

| Topic | Reference | Here |
|---|---|---|
| Fight setup | 5 fight-start functions each reset ~25 flags | One `createCombat()` builds fresh state for every fight |
| Timing | `setTimeout` inside rules (volleys, Bone Dice, phase changes) | Rules resolve synchronously and emit events; only the UI waits |
| Randomness | `Math.random()` | Seeded RNG stored on the run (`?seed=` reproduces a run) |
| Card identity | `G.deck` holds bare keys, so copies are indistinguishable | Each card is `{ uid, key }`, so a future upgrade or curse can target one copy |
| Statuses | Emoji-prefixed strings, sometimes matched with `includes()` | Keyed ids (`weak`, `vulnerable`) in a registry |
| Player death during the enemy turn | Poison and step-9 specials still run before the loss is checked at step 11 | Loss is checked right after the enemy acts. The outcome is the same because loss already took priority. |
| Enemy HP | Can go negative | Clamped at 0. The float text shows the HP actually removed. |
| Errors in enemy specials | Swallowed by `try/catch` | Surface normally |

---

## E. Phase 1 scope (not rule differences)

- A fixed six-fight Floor 1 gauntlet stands in for the map. It uses the reference pools:
  easy ×2, standard ×3, elite ×1.
- Rests, shops, events, relics, consumables, Magic Doors, the Mirror, bosses and the Soul Forge
  are not built yet. Gold and Souls accumulate but have no use yet.
- Card upgrades are fully defined and tested, but nothing can apply them until the rest site
  exists (Phase 3).

---

## F. Phase 2 — heroes and cards

Decision numbers (D1–D5) and fix numbers (F1–F11) refer to `PHASE2_PLAN.md`.

### F1. Fixed: cards that did not do what their text says

| Card | Reference | Here |
|---|---|---|
| **Mana Surge+**, **Mana Weave** (High) | `_manaWeaveCount` is written but never read, so only 1 card is discounted | The next 2 cards cost 1 less, as printed |
| **Time Warp** | Its upgrade is keyed `'timewarp+'`, so it registers as `timewarp++` and cannot be reached | Upgradable: draw 2 / gain 2 Energy (High: 4 / 3) |
| **Shadow Artist+** | The discount counter resets every turn start, so it works on one turn only | First 3 cards cost 1 less on every turn (CARD_UPGRADES_MASTER.md:28) |
| **Arcane Boost**, **Void Channel** | The die can go past its max face, which breaks every "max" check | Clamped to 1…sides |
| **Arcane Momentum** (base) | Inactive on the turn it is played (its cap is 0 until the next turn start) | Active immediately; the triggering card previews the raised die |
| **Loaded House**, **Gambler's Fallacy** | Forced-max charges are never reset, so they carry into the next fight | Combat-scoped |
| All **Power statuses** | `stacks === 2` means "upgraded" (see A3) | Magnitude is stored per copy and copies add. House Edge takes the higher floor; Gambler's Fallacy takes the lower threshold. |
| **Void Channel** (base) | Doubles the die without using the once-per-turn set | Counts as the once-per-turn set, as GDD §11 names it. Its hand-size warning now refunds when unmet, like Backstab (extends C2). |

### F2. Decisions applied

**D1 — real choices** replace random picks on:
- Arcane Boost, Smoke Screen, Nimble Pace (which card to discard)
- Arcane Recall (which cards to return)
- Loaded Die (which value)
- Count the Odds (which cards to keep)

Void Channel was already a choice.
- **Count the Odds** now uses the normal draw rules: it reshuffles an empty draw pile and
  respects the 8-card hand limit. The reference popped cards directly.
- **Arcane Recall** respects the hand limit. The reference did not.

**D2 — next-Attack bonuses** (Shadow Mark, Pocket Aces, Blood Rush):
- The bonus adds to the first hit of the next Attack that deals damage, and goes through
  Strength, Weak, Vulnerable and Block.
- It is spent only when applied. Skills, Inferno (an Attack that deals no damage) and a fizzled
  Backstab leave it in place.
- Shadow Mark now **adds** to an existing bonus. The reference overwrote it, wiping a banked
  Pocket Aces or Blood Rush bonus.
- **Lethal Rhythm** and **Lucky Streak** still deal flat damage that ignores Block, but now check
  enemy HP abilities and death immediately.

**D3 — one-shot discounts** (Mana Surge, Disappear, Cursed Veins) are spent only if they
actually lowered the cost.

**D4 — Eternal Hunger:** superseded by the owner's follow-up decision; see G3.

**D5 — Gambler passive:** once per turn, a roll that lands on the die's max grants +1 reroll. The
reference refreshed a reroll only if one was still unused, so it never granted anything.

### F3. Other deliberate differences

| Topic | Reference | Here |
|---|---|---|
| Enemy intent with Fly | Shows unhalved damage | Shows the first hit halved by Fly, which is what lands (see A2) |
| Disappear / Cursed Veins "next card free" | Disappear overwrote the count; Cursed Veins added to it | Both add |
| Cold Mastery | Chill ×0.65 (base) or ×0.50 (upgrade) | Same numbers, stored as extra reduction (+10% / +25%); copies add, total capped at 50% |
| Blood Tide+ "max 15 Regen" | Enforced as 15 | Regen's GDD hard cap of 10 applies first; the text says so |
| Gambler's Fallacy on play | Resets the miss counter | Not reset; the counter is combat-scoped either way |
| Smoke Screen with an empty hand | Skips the draw | Still draws 1 |
| Effects inside a card with a coin flip or reroll (Spell Echo) | Re-runs the whole card, including the random part | Same (kept) |

### F4. Withdrawn from the plan

Planned fixes F4 (Spell Echo+) and F5 (Loaded House+) assumed the design document gave these
upgrades a different effect. It does not: the reference and CARD_UPGRADES_MASTER.md both define
each upgrade exactly as its base card. Both are marked `identicalUpgrade` and listed in
CARDS.md for the owner (see G1).

---

## G. Phase 2 — kept + flagged (needs an owner decision)

### G1. Spell Echo+ and Loaded House+ upgrade nothing — **owner: leave unchanged, flagged**
Upgrading either card changes nothing, and they are left that way on purpose rather than given an
invented upgrade. Both carry `identicalUpgrade` and appear under "Notes for review" in CARDS.md.
Revisit later.

### G2. Arcane Recall+ zero-cost loop — **Fixed (owner decision)**
Two copies of Arcane Recall+ (cost 0) used to return each other from the discard pile forever.
The reference allows the same loop through its random pick.
- **Before:** 74 plays in one turn with no Energy spent. With Lethal Rhythm, that killed a
  110-HP elite in one turn.

**Decision:** Arcane Recall+ stays at 0 Energy, but Arcane Recall (base or upgraded) cannot return
Arcane Recall. The card text says so.
- **After:** the same deck stops after 2 plays.
- Covered by `tests/heroes.test.js`.

### G3. Eternal Hunger — **Fixed (owner decision, replaces D4)**
The reference's base text said "each Regen tick deals 2 dmg", a flat 2, but its code dealt 2 per
Regen stack for both base and upgrade.

**Decision:**
- **Base:** a flat 2 damage per Regen tick.
- **Upgrade:** 2 damage per Regen stack, max 15 per turn.

**Stacking:** the flat parts add, the per-stack parts add, and the lowest cap applies to the
per-stack part. A base plus an upgraded copy with 10 Regen deals 2 + 15 = 17.
- Covered by `tests/mechanics.test.js` and `tests/heroes.test.js`.

### G4. The Mage starter deck struggles against Floor 1 elites — **STILL OPEN**
Kept unchanged after the Phase 2 manual validation. The diagnostic is in the IMPLEMENTATION_PLAN.md
validation log: an isolated starter-deck fight, naive agent, Knight Block absorbing most damage.

**Not resolved by §H6.** The affinity rescale moved these numbers, so the original ones no
longer describe the build, but it did not close the gap and **no compensation has been applied
elsewhere**. Current greedy-agent win rates for the Mage starter deck, against the whole field:

| Elite | Mage (was, fixed 6+) | Mage (now) | Barbarian | Vampire | Gambler | Thief |
|---|---|---|---|---|---|---|
| Dungeon Warden | 24% | **55%** | 100% | 99% | 94% | 85% |
| Armored Knight | 0% | **5%** | 93% | 82% | 32% | 12% |

She is off zero and no longer unable to win at all, but she is **still last of five against both
Floor 1 elites**, and still an outlier against the Knight. So the weakness §G4 records is intact
and the decision is still yours; it has only stopped being absolute. The agent is weak, but the
gap between heroes remains informative.

### G5. Stalemates exist — **owner: unchanged; documented and monitored**
A degenerate deck can loop forever, for example two Strikes plus Blood Lord against an enemy
stacking persistent Block. The fuzz suite measures this and fails if more than 1% of random
combats stalemate. This is inherent to persistent enemy Block (C1). That 1% threshold is the
monitor: if new content pushes the rate up, the suite fails.

---

## H. Phase 3 — the castle run

Decision numbers (D1–D8) and fix numbers (X1–X4) refer to `PHASE3_PLAN.md`. §H.1 covers step 3a:
the map and run flow.

### H1. Fixed

| Topic | Reference | Here |
|---|---|---|
| **X1: die cache skips a room** | Taking a die-cache Magic Door leads, via `proceedDoors()`, to the room behind it being marked cleared and passed without being played (`game.js:435-439` → `:220-238`) | The die cache is its own stop; afterwards you face the same room again and play it |
| **X3: Magic Door contents** | Rolled each time the door screen is drawn | Rolled once, with the map, from the run seed |
| **Mirror placement** (D5) | Offered at `ceil(60%)` of the path, only on a screen with no Magic Door | Offered at the halfway room (`floor(length / 2)`), whatever else the door screen shows |
| **Mirror destination** (D5) | Always the first other path (A→B, B→A, C→A), so Path C is unreachable | A seeded random other path per path, fixed with the map and shown (with a room preview) before you pay |
| **Mirror landing** (D5) | Lands at `floor(length / 2)` of the target, usually replaying about 2 rooms | Same room index on the target path; you land on its door screen |
| **Mirror limit** (D5) | Once per path, so A→B then B→A was possible | Once per floor |
| **Mirror you can't afford** | Button greyed but still clickable; the click is refused | Button disabled, with the cost shown |

### H2. Placeholders, and what fills them

| Room or content | Now | Filled by |
|---|---|---|
| Event rooms (D1) | "A Quiet Room": nothing happens; keeps its place in the path | Phase 4 events |
| Die cache | A labelled placeholder screen with Continue | Step 3c |
| Floors 2–4 enemies | Floor 1 pools, labelled in the combat HUD | Step 3d |
| After the Floor 4 boss | The run ends: "King Aldric awaits (Phase 5)" | Phase 5 |

### H3. Same as the reference

- Map generation:
  - the three 15-room templates, cut to one 13–15 length per floor;
  - room 0 is a battle;
  - Magic Doors at 25% from room 2;
  - contents 25% die cache, otherwise a random room type that replaces the next room;
  - hidden 60% on Floors 3–4, with the reference's hint lines.
- Path select enters room 0 directly.
- The first two rooms of Floor 1 use the easy pool.
- Four companion bosses, one per floor, never your own hero, with reference stats and the generic
  AI (D4). Bosses show their portrait from `../assets/*_boss_original.*`.
- Boss rewards:
  - Order: 80 Gold and a full heal, then the card reward, then the Soul Forge (after Floors 1–3).
  - +3 Souls.
- A card offer can have fewer than 3 cards once your deck owns most of your pool, because owned
  cards are excluded.

### H4. Step 3b — rest sites, shops, Soul Forge

**Same as the reference:**
- **Rest:** one action — heal 30% of max HP (rounded down; unavailable at full HP), upgrade a card
  for free, or remove a card for free. Rest removal may take Strike or Defend.
- **Shop:**
  - The fixed stock is Blizzard 60, Hunter Die 55, Life Leech 70 and Iron Wall 65, plus a random
    die at 80. It is the same for every hero (D3, flagged for design review).
  - Removal costs 75 and cannot take Strike or Defend. An upgrade costs 80. Both can be repeated in
    one visit.
- **Soul Forge:**
  - After the Floor 1–3 bosses, 3 random offers from the eligible upgrades: repeatable ones, or
    ones you don't own yet.
  - One purchase, then the next floor. Or leave and keep your Souls.
  - Costs: Vitality 3 (+1 per purchase), Reckless Surge 4, Grit 5, Steady Hand 6, Second Die 6,
    Gambler's Edge 6, Momentum 8, Overdraw 8.
- **Upgrade effects:**
  - **Grit** adds its Block after the turn-1 Block reset, on turn 1 only.
  - **Steady Hand** is a per-combat charge, spent after the turn's own reroll.
  - **Second Die** adds a d2, capped at the max face, once per combat.
  - **Gambler's Edge** sets the die once per combat, using that turn's die set.

**Fixed / different:**

| Topic | Reference | Here |
|---|---|---|
| **X2: shop re-buy** | A bought tile only gets a `.sold` CSS class; its click handler still works, so a card, consumable or die could be bought again | Bought items are marked sold in engine state; buying again is refused |
| Rest site with nothing to do | No way to leave. At full HP, with nothing left to upgrade and an empty deck, the run soft-locks. | A Leave option appears only in that case |
| Upgrade / remove target | "The first matching key" in `G.deck` | The exact copy chosen (per-copy identity) |
| Gambler's Edge downside | Suppresses a natural roll equal to the **die's** max. On a d6 that is 6, which is never odd, so the downside does nothing for the Thief. Forced maxes (Loaded House, Gambler's Fallacy) were also suppressed. | Suppresses a natural roll of **the hero's own affinity maximum** (GDD §15: "its own affinity max"): Thief 5, Barbarian 6, Mage 6, Vampire 6, Gambler 6. Forced and card-set values are exempt, as the upgrade's own note promises. |
| Shop relic shelf, shop consumables | Present | Phase 4 |

### H5. Step 3c — die types

**No GDD authority.** GDD §8 says only that "each character has one active die (d6 by default)";
there is no die-type table anywhere in v0.10, and no die prices in §13. Every number below is the
reference build's invention, carried over so the run plays the same. Flagged for design.

**Same as the reference:**
- Six dice, with the reference's faces and bonuses: d4 Cursed Die (rolls below 3 become 3),
  d6 Standard, d8 Hunter's Die (+2 damage on an odd roll), d10 Arcane Die (+1 Energy on an even
  turn-start roll), d12 Titan's Die (a max turn-start roll draws 1 extra card), d20 Legendary Die.
- One die equipped at a time; a new one replaces it. Every hero starts on the d6.
- A die cache offers **2**, never the d6 and never the die you already carry, gated by floor:
  d4 and d8 from Floor 1, d10 from Floor 2, d12 from Floor 3, d20 from Floor 4.
- The Hunter's Die's +2 is a flat term beside Strength, so Weak and Vulnerable both apply to it
  (`../js/combat.js:2349`).
- The Arcane Die's Energy may sit one over the maximum, and no more.
- The shop's fixed Hunter Die tile at 55 Gold.

**Fixed / different:**

| Topic | Reference | Here |
|---|---|---|
| **D8: the d20** | Its `legendary` bonus is declared but never read, and its text claims "affinity activates on rolls 15+", which nothing implements — High stays a flat 6+ on every die | No bonus, and text that describes only what happens. Every screen that names a die also states what the hero's affinity means **on that die** — "High affinity: 14 or more — 7 of 20 faces" — with the threshold itself now scaling (§H6) |
| Die bonuses on a reroll | The Arcane Die's Energy and the Titan's Die's card are applied in the turn-start block, after that turn's roll | Unchanged in effect, but stated as a rule: only the turn-start roll pays, so rerolling into an even number does not re-pay the Arcane Die. Covered by a test |
| The Cursed Die's floor | A separate `min3` branch after the hero's own floor and House Edge | The same number, expressed as the die's roll floor and combined with the hero's (`max`). One floor, not two rules; the Gambler on a d4 floors at 3 |
| Die reward on a Magic Door | A die cache **skips** the room behind the door (X1), and re-rolls its two offers every time the screen is drawn | Its own stop, with offers fixed when it is entered. Skipping it keeps your die and still plays the room the door guarded |
| A die you already have | The shop's Hunter Die can be bought again at 55 Gold when you are already on a d8 | Shown, labelled "Already equipped", and refused |
| Where dice are read | `G.activeDie` / `G.diceMax` are written directly by purchases and by Loaded Coat mid-fight | `run.die`, read once by `createCombat()` like every other run modifier. A die bought mid-run applies from the next fight |

**Added, not in the reference:**
- A second shop die tile at 80 Gold, floor-gated like a cache's offers and naming the die it
  sells before purchase. The reference shop stocks only the fixed Hunter Die. Flagged with D3.

**Resolved by §H6:** "High is 6+" did not survive a change of die — a d20 made High near-certain
(15 of 20 faces) and a d4 made it impossible (0 of 4). High now scales with the die instead.

### H6. High scales with the die — **V2 design decision**

**Status: deliberate V2 design, approved. Not a reproduction of the reference, not a GDD rule.**

The GDD fixes the Mage's affinity at "High rolls (6+)" (§3) and never revisits it, because v0.10
only ever describes a d6 — there is no die-type table in the document at all, so **the GDD does
not define multi-die affinity scaling**. Read literally against the dice the reference build
ships, a fixed 6+ makes the Mage's entire identity a function of which die she happens to carry:
impossible on a d4, near-certain on a d20.

**The rule now:** High is the die's **upper third** — the first face strictly above its lower two
thirds, `floor(sides × 2/3) + 1`. Max (highest face only), Extreme (minimum or maximum face) and
Odd/Even are **unchanged**.

`floor(·) + 1` rather than `ceil(·)`: where 3 divides the die evenly, `ceil` returns the boundary
face itself and puts it inside High, making a d6 4+ — a full half, not an upper third. Adding one
keeps the threshold strictly above the lower two thirds on every die.

| Die | High is | Faces | Share | Fixed 6+ was | `ceil` would be |
|---|---|---|---|---|---|
| d4 | 3+ | 2 of 4 | 50% | 0 of 4 — impossible | 3+ (same) |
| **d6** | **5+** | **2 of 6** | **33%** | **1 of 6 — 17%** | 4+ — 3 of 6 |
| d8 | 6+ | 3 of 8 | 38% | 3 of 8 — unchanged | 6+ (same) |
| d10 | 7+ | 4 of 10 | 40% | 5 of 10 | 7+ (same) |
| d12 | 9+ | 4 of 12 | 33% | 7 of 12 | 8+ — 5 of 12 |
| d20 | 14+ | 7 of 20 | 35% | 15 of 20 — 75% | 14+ (same) |

High's share now sits in a 33–40% band, against 17–75% under a fixed 6+. The d4 is the one
outlier at 50%, because a third of four faces cannot be expressed more finely; the formula, not
a special case, produces it.

**Consequences, all Mage-only.** High is used by 20 cards and every one of them is in the Mage
pool; no shared card and no other hero's card uses it. The other four heroes' balance rows in
CARDS.md are byte-identical under all three rules.

- On the **baseline d6** the Mage's affinity fires twice as often as before (2 faces, not 1).
- **No die leaves any affinity unreachable** any more, on any hero, so no die needs to be
  withheld from a hero: the d4 is offered to the Mage like any other. A test asserts this holds
  for every affinity × every die.
- **G4 stays open.** The rescale does not resolve the Mage's elite weakness — it moves her off
  0% against the Armored Knight to 5%, still last of five. Measurements are in
  IMPLEMENTATION_PLAN.md under "Phase 3c‑a"; no compensation has been applied elsewhere.
- A d20 is now a *downgrade* for High relative to a d6 (35% of faces against 33%… marginally up,
  but far below the 75% a fixed 6+ handed out). The Mage no longer has one strictly best die.

Every die preview and every equipped-die label states the exact active rule and the eligible-face
count for the hero carrying it — "High affinity: 5 or more — 2 of 6 faces" — so the threshold is
never something the player has to infer.

**Open:** whether an upper third is the right share at all. It is one reading of "high rolls";
above the midpoint (d6 → 4+) or a fixed quarter (d6 → 5+, d20 → 16+) are others, and each moves
the Mage again. The threshold is one exported function, `highThreshold()` in `engine/dice.js`, so
changing it is a one-line change plus regenerating CARDS.md.

### H7. Step 3d — Floors 2–4 enemies, elites and the intent list

**Same as the reference:** every stat. 15 new standard enemies (5 per floor), 6 new elites
(2 per floor), with the reference's HP, Block, damage and Gold, and its floor pools. Floor names
come from the reference's own section comments.

#### Dead or self-contradicting abilities, now working (PHASE3_PLAN §3)

| Enemy | Reference | Here |
|---|---|---|
| **Phase** (Shadow Wraith) | Sets `_phased`, which nothing reads | Untouchable on alternate **player** turns — keyed to the turn the immunity is felt, so it can be seen and planned around. Blocks every damage source, that turn's Burn tick included (D7). Turn 1 is always solid, so a fight never opens untouchable |
| **Phase+** (Shadow Wraith+) | Phase dead; "attacks twice" never implemented | Phase as above, and two hits on the turns it is solid |
| **Poison Arrow** (Bone Archer) | Applied player Poison, which never ticked | Applies it, and player Poison now ticks (D2) |
| **Acid Touch / Drain / Void Drain** | Stripped your Block **after** the hit, when it was spent and about to reset — so it did nothing | Part of the attack, landing before the damage, and shown on the intent |
| **Undying / Undying+** | An `hp` trigger that also ran after ordinary hits | A death hook. A lethal Burn or Poison tick is final (GDD §4) |
| **Arcane Burn** (Dark Sorcerer) | Applied player Burn, which never ticked | Applies it, and player Burn now ticks (D2) |
| **Stone Skin** (Gargoyle) | Sets `_stoneShield`; nothing reads it | Absorbs the first 5 damage of each of your turns |
| **Curse** (Void Stalker) | A message only | One random card in hand costs +2 that turn, through the one cost pipeline, so the card shows the raised number |
| **Soul Drain** (Death Knight) | Took 1 Energy at the enemy's turn 1; the next turn start refilled it, so it cost nothing | Your first turn starts with 1 less Energy |
| **Bone Wall** (Bone Golem) | Its `skill` trigger was never dispatched | Gains Block when you play a Skill — see the balance note below |
| **Holy Wrath** (Sanctum Guardian) | `damage *= 2` permanently, compounding every turn the condition held | Doubles **that attack only**, while you hold 15+ Block. The intent shows the doubled number while it holds |
| **Spell Steal** (Dark Arcanist) | A message only | Casts the last card you played that turn back at you (D6, and R7's mirroring) |
| **Unbreakable** (King's Champion) | Wiped statuses at its turn start, so a Burn or Vulnerable still worked for a full turn | Nothing can be applied to it at all, and the attempt is reported so a card can say "immune" |
| **Collapse** (Void Colossus) | Read your Block *after* step 6 had already spent it | Extra damage equal to your Block as the attack lands, bypassing Block, and shown on the intent |
| **Ritual / Arcane Overload** | Worked | Kept, now as their own action in the intent list |

#### Fixed / different beyond the reference

| Topic | Reference | Here |
|---|---|---|
| **Intent** | One move: an attack, or a defend | A **list of actions** resolved in order (R5). `previewIntent()` resolves every number and `resolveIntent()` executes exactly the plan it returns, so a displayed number and a landed number cannot diverge. An ability that changes the same turn's attack damage is an action *in* the list — Throne Guard's Loyal is shown as "+2 Strength, then 18", never as 16 followed by an 18 |
| **Bone Wall** | Never fired | +8 Block on the **first Skill each turn**, and its Block **resets each of its turns** — not +8 per Skill. Per Skill with no reset is an unbounded ratchet: the fuzz agent made it unkillable in 23 of 200 runs. Since the reference's version never ran, there is no behaviour being changed here, but the bound is a design choice and is flagged |
| **Phase timing** | `_phased` was set on even *enemy* turns | Even **player** turns, because that is when the immunity applies and when it has to be legible |
| **Spell Steal's copy** | — | Snapshotted as the card is cast, not looked up at resolution. A card whose damage reads live state (Combustion reads the enemy's Burn, which step 1 ticks down) would otherwise show one number and land another. The enemy's own modifiers still apply live |
| **Card mirroring** | — | Damage hits you, Block and healing go to the enemy, a debuff meant for it lands on you and a buff meant for you goes to it. Powers and everything else (draw, Energy, the die, choices) do not mirror; a card with nothing to mirror is skipped and the enemy attacks normally instead |
| **Player Poison and Burn** (D2) | Applied but never ticked | Burn ticks at the end of your turn, Poison after the enemy acts, both ignoring Block and losing a stack — mirroring the enemy's timing. They route through the normal HP-loss path, so Berserker's Oath sees them, as its text promises |

**Still open:** the Bone Wall bound above is the one number in this step that is neither the
reference's nor the GDD's. If you would rather it scaled with Skills, it needs a different cap
(a per-turn maximum, or Block that decays) — not no cap.
