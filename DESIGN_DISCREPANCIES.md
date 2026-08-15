# Castle Run — Design Discrepancies

This file records unresolved conflicts between design documents, progress notes, active split code, and the legacy monolith. It intentionally does not choose an answer until one has actually been decided. Resolve each item through an explicit design decision, then update the GDD, implementation, previews/tooltips, and progress documentation together.

---

## ⚠️ SUPERSEDED — True Ending requirements (floor-reward relic gate)

**Original question:** Does the True Ending require collecting four companion Cores, four specific True Ending relics, or both?

**Original resolution:** The True Ending was gated by four named relics (The Fractured Crown, The King's Sword, The Royal Sigil, The Knight's Vow) picked as boss-reward choices on Floors 1–3.

**Why this is superseded:** This resolution had a structural hole that made it impossible to satisfy. Floor bosses 1–3 are the only relic sources, and Floor 4 is Aldric himself — so no single run could ever hold all 4 relics walking into the final fight. The gate could never actually be met. See the new resolution below.

---

## ✅ RESOLVED — True Ending requirements (per-hero challenge relics)

**Resolution (decided in session, July 25, 2026):** The True Ending is now gated by **4 of 5 possible per-hero challenge relics**, earned across multiple runs rather than picked mid-run.

**How it works:**
- Each of the 5 heroes has one locked Challenge (Barbarian: +1 Strength every 2 turns from turn 2 — escalation; Vampire: drains 8 HP from the player to heal itself every 3 turns from turn 3 — escalation; Mage: may never play a card that draws extra cards — denial; Thief: may never gain any Block — denial; Gambler: may never use a reroll — denial).
- Beating a corrupted companion for the first time (as a Normal Ending run) drops their **Core**, reveals their lore, and unlocks that hero's Challenge details.
- In any future run where that same companion appears again as a corrupted floor boss, the player can attempt the fight under Challenge conditions. Clearing it earns that hero's **True Ending relic**.
- The player only needs **4 of the 5 relics** — never their own chosen hero's, since you can't fight yourself. Player picks which 4 to chase; the 5th (their main) is always skipped.
- Reach Aldric (Floor 4, fixed boss) holding fewer than 4 relics → Phase 1 + 2 only, **Normal Ending**.
- Reach Aldric holding all 4 relics → **Phase 3 actually triggers**, and at 50 HP the True Ending option appears.

**What this replaces:**
- The old floor-reward relic gate above (structurally broken — see superseded entry).
- Cores go from "mystery collectible, no defined purpose" to a specific job: lore reveal + Challenge-unlock trigger. They are no longer the True Ending gate, and never were meant to be (see original discrepancy question) — but now they're not just narrative filler either.
- The old permanent cross-run Soul meta-progression tree (Power/Knowledge/Fortune branches) is gone. Souls are now an **in-run** resource — earned per floor, spent at a stat-upgrade screen that appears right after each floor boss's relic-reward pick, resets to 0 at run start, no cross-run banking.

**Implementation TODO (not yet started):**
- Core-drop logic needs to check "is this the first time beating this specific corrupted companion" (not just "did a Core drop") to gate the lore + Challenge-detail unlock correctly.
- Challenge-mode fight logic: detect when the player is attempting a hero's Challenge (their chosen hero must differ from the boss hero) and enforce the Challenge's constraint (denial or escalation) for that fight.
- `G.aldricHasRelics` (or its renamed equivalent) needs to check "player holds 4 of the 5 Challenge relics," not the old 4-named-relic set.
- The 4 old True Ending relics (Crown/Sword/Sigil/Vow) and their planned per-relic debuffs are dropped entirely — replaced by the 5 Challenge relics above. No debuff mechanic carries over; Challenge relics are earned through difficulty, not opportunity cost.
- Soul-spend menu contents/costs need to be finalized (draft exists, see PROGRESS.md Soul section) and built as an in-run screen, replacing the old permanent-tree UI concept.
- All of GDD.md's Two Endings / Relic System sections and PROGRESS.md's True Ending / Soul tracker rows need rewriting to match — currently still describe the superseded floor-reward-relic-gate system.

---

## ✅ RESOLVED — Burn damage

**Original question:** Does each Burn stack deal 1 damage or 2 damage before modifiers such as Burning Soul?

**Resolution:** Code is source of truth — `js/combat.js` line ~752 does `G.enemy.hp -= burn.stacks` (stacks × 1), matching PROGRESS.md's note that Burn was changed to match Poison.

**Remaining bug (not yet fixed):** `js/ui.js`'s `STATUS_DESCRIPTIONS` tooltip still reads *"Takes stacks × 2 damage at end of turn. Ticks down."* — this is stale and displays incorrect information to the player. Needs to be corrected to match actual (×1) behavior.

---

## ✅ RESOLVED — Mobile orientation

**Original question:** Must mobile play support portrait, or is mobile intentionally landscape-only/landscape-enforced?

**Resolution:** Code is source of truth — `checkOrientation()` in `js/ui.js` is a hard block, not a suggestion. It shows a full-screen rotate overlay whenever a mobile user agent is detected in portrait orientation, and re-checks on `resize`/`orientationchange`. This matches `AGENTS.md`'s "landscape-first" priority.

**Remaining doc conflict:** `GDD.md` still says "playable in landscape or portrait on phone" — needs correcting to reflect landscape-enforced behavior, unless portrait support is later decided as a real feature (in which case the code, not just the doc, needs to change).

**Minor copy mismatch:** `index.html`'s overlay text reads *"Castle Run is best played in landscape"* (soft suggestion wording) despite the actual behavior being a hard lock. Low priority — only matters if portrait ever gets built.

---

## ✅ RESOLVED — Weak timing

**Original question:** Does Weak lose duration per enemy/player attack, per damage instance, or once per turn?

**Resolution (fixed + verified in-game):** Weak was ticking down **per hit** — the decrement lived inside `calculatePlayerAttackDamage()`, which multi-hit Attack cards call once per hit, so a 2-/3-hit card drained the whole Weak stack in one play. The decrement was moved out of `calculatePlayerAttackDamage()` into `endTurn()` (STEP 2b), alongside Vulnerable's, so Weak now ticks down **exactly once per turn**. `calculatePlayerAttackDamage()` still applies the 25% damage reduction but no longer decays the stack. Confirmed by in-game test: a 3-hit card left Weak surviving with only 1 stack consumed at end of turn, not 3.

---

## ✅ RESOLVED — Mirror behavior

**Original question:** Is the Mirror a paid path-switch mechanic, or a forced rest/upgrade/remove event?

**Resolution:** Code is source of truth — `useMirror()` in `js/game.js`. The Mirror is an **optional, paid path-switch** that appears at the halfway point of a path: it reflects another path's rooms and lets the player *Step Through* (pay 30/50/70/100 Gold by floor) to switch to that path, or *Walk Away* for free. It is NOT a forced rest/upgrade/remove event, and NOT a shadow-deck skill-check fight.

**Doc correction applied:** `GDD.md`'s Mirror Mechanic section was rewritten to match (it previously described a shadow-copy Mirror fight). `PROGRESS.md`'s older forced-event framing is superseded by this entry.

---

## ✅ RESOLVED — Normal ending castle outcome

**Original question:** In the Normal Ending, does the castle endure and continue the cycle, or crumble when Aldric is defeated?

**Resolution:** The castle **endures** — the cycle continues; the Normal Ending is an incomplete victory that invites a replay toward the True Ending. Code is source of truth: `showAldricEnding()` in `js/ui.js` reads *"Aldric dissipates into shadow. The castle endures. You were not ready. Return when you are."* The contrast is intentional — only the **True** Ending destroys the castle (you use the relics to shatter its hold and free Aldric); the Normal Ending leaves the castle standing.

**Doc correction applied:** `GDD.md`'s Two Endings section previously said the castle "crumbles" in the Normal Ending — rewritten to match the in-game endures/cycle-continues framing. `PROGRESS.md`'s Two Endings line already said "Castle endures. Cycle continues." (no change needed there).

---

## ✅ RESOLVED — Blood Lord trigger frequency

**Original question:** Does Blood Lord heal once per Attack card played or once per damage instance/hit?

**Resolution:** Code is source of truth — the Blood Lord heal in `playCard()` (`js/combat.js`) fires once per Attack **card** played (gated on `card.type === 'Attack'`), NOT per damage instance, matching `CARD_UPGRADES_MASTER.md`'s lock. Multi-hit cards (Blade Dance, Night Stalk) heal only once. Unlike Weak (see above), it did **not** inherit the per-hit firing pattern. The only defect was the base card **description** implying per-hit ("each time you deal damage"), which has been corrected to reflect once-per-Attack-card.

---

## ✅ RESOLVED — Missing GDD cards and pool completeness

**Original question:** Are hero pools considered complete without the GDD cards listed as uncoded, or must those cards be implemented or formally removed from the design?

**Resolution (implemented):** All 7 previously-uncoded GDD cards were implemented — base + upgrade in `CARD_UPGRADES` (`js/data.js`) and added to their hero reward pools (`CHAR_REWARD_POOLS`, `js/ui.js`): **Thief's Gambit, Gut Punch, Golden Strike** (Thief); **Cursed Veins** (Vampire); **Wild Combo, Press Your Luck, Jackpot** (Gambler). `CARD_UPGRADES_MASTER.md`'s "cards in GDD but NOT yet coded" list has been cleared (marked none, implemented 2026-07-23).

---

## ✅ RESOLVED — `curseddice`

**Original question:** Is `curseddice` intentionally removed from the game and design, or should it be restored?

**Resolution (restored):** `curseddice` is restored. Its **display name** was changed to **Cursed Reroll** / **Cursed Reroll+** to resolve a collision with the d4 die also named "Cursed Die" (min roll 3, max 4) — the internal key `curseddice` is unchanged so existing lookups/docs still work. It is a Shared-Pool card, now added to every hero's `uncommon` reward bucket (alongside `soulsteal`/`stealheal`/`ironwall`). Its previously-missing `+` upgrade was added to `CARD_UPGRADES` (reroll + take **1** damage, vs the base's **3**), matching `CARD_UPGRADES_MASTER.md`'s spec, and is now pickable via the normal upgrade UI.

---

## ✅ RESOLVED — Battle reward wording and die rewards

**Original question:** Are normal battle rewards card-only, or should they still offer a card-or-die choice?

**Resolution (fixed):** Combat-victory rewards are **card-only**. The stale "card or die" subtitle was a shared element with the Magic Door die-reward screen. The reward subtitle is now set **dynamically** in `js/ui.js` — `showReward()` sets it to "Choose your reward — a card", and `showDieReward()` uses its own die header — so the wording always matches the active reward. Dice come from the shop, Magic Doors, and events only.

---

## Session Notes

*Session [date to fill in]:* Reviewed `js/ui.js` and `js/combat.js` in full. Resolved 3 discrepancies via direct code inspection (Burn damage, Mobile orientation, True Ending requirements — the latter via new design decision rather than existing-code confirmation). Advanced Weak timing to "needs playtest" status. Found one unrelated bug in passing: core-collection message in `checkCombatEnd()` displays `G.char.name` (player's own character) instead of the boss's name. `js/game.js` and `js/data.js` not yet reviewed — Mirror behavior, Blood Lord frequency, missing cards, and `curseddice` all require those files to resolve.

*Session July 25, 2026:* Full redesign of the True Ending / Souls / Cores system, prompted by discovering the floor-reward relic gate was structurally impossible to satisfy (see superseded entry above). New system: per-hero Challenge relics (need 4 of 5), Cores as lore + Challenge-unlock triggers, Souls as an in-run resource instead of a permanent cross-run tree. All 5 hero Challenges fully designed. Soul-spend menu drafted (see PROGRESS.md). None of this is implemented yet — design-only session.

*Session August 15, 2026:* Synced this file against the July 25 redesign — the True Ending entry above was still describing the superseded floor-reward-relic-gate system as current. GDD.md and PROGRESS.md are still out of date and need the same treatment next.