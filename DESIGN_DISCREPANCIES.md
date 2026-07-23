# Castle Run — Design Discrepancies

This file records unresolved conflicts between design documents, progress notes, active split code, and the legacy monolith. It intentionally does not choose an answer until one has actually been decided. Resolve each item through an explicit design decision, then update the GDD, implementation, previews/tooltips, and progress documentation together.

---

## ✅ RESOLVED — True Ending requirements

**Original question:** Does the True Ending require collecting four companion Cores, four specific True Ending relics, or both?

**Resolution (decided in session, [date to fill in]):** The True Ending is gated by the **four named True Ending Relics** (The Fractured Crown, The King's Sword, The Royal Sigil, The Knight's Vow) — NOT by Cores.

**Why:** Cores are collected automatically from every floor boss (Floors 1–3) as a mandatory story beat — every run that reaches Aldric has the same Core count, so Cores can never function as a meaningful gate. Relics are optional reward-screen picks (1 of 3 choices per floor boss), so gating on relics preserves an actual in-run decision.

**New design addition:** Each of the 4 True Ending relics will carry a real debuff, not just a passive opportunity cost. Player must weigh "take a strong build-supporting relic" vs. "take this relic, accept a debuff, and move toward the True Ending." Specific debuff values are still TBD — to be designed per relic, ideally thematically tied to what the relic undoes in the Aldric fight (e.g. a relic that strips Aldric's Strength might cost the player max HP).

**Implementation TODO:**
- Change `G.aldricHasRelics` in `js/combat.js` (currently `G.cores.length >= 4`) to check `G.relics` for all 4 True Ending relic keys via the existing `hasRelic()` helper.
- Rename the variable if practical — `aldricHasRelics` is currently misleading since it checks Cores, not relics.
- Cores remain in the game but are no longer the True Ending gate — open question whether they get repurposed (e.g. as fodder for a future Soul-adjacent system) or just remain narrative/UI collectibles.
- Design and implement the 4 relic debuffs.
- Decide whether debuffs stack fully if a player collects all 4, or whether there's a combined cap.

**Deferred, not yet decided:** A meta-progression branch (Soul-based) to reduce relic debuffs over multiple runs was discussed as a future system, but is explicitly lower priority than core gameplay/combat consistency work and Sir Crimson's build-out. Do not implement until those are stable. See PROGRESS.md priority order.

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

## 🔍 IN PROGRESS — Weak timing

**Question:** Does Weak lose duration per enemy/player attack, per damage instance, or once per turn?

**Findings so far:** `calculatePlayerAttackDamage()` in `js/combat.js` decrements Weak's stack count inside the same call that applies damage (`consume: true`), and multi-hit Attack cards call this once per hit (via `dealDamage`). This suggests Weak may be ticking down **per hit**, not **once per turn** as `GDD.md`'s Status Timing Summary describes.

**Still needed:** Actual playtest — play a 2-hit or 3-hit Attack card (e.g. Vampire's Night Stalk, Thief's Blade Dance) while Weak is active on the player and confirm whether it clears mid-card instead of surviving to end of turn.

**Relevant files:**
- `GDD.md` — status table and status-timing rules.
- `js/combat.js` — `calculatePlayerAttackDamage()`, `dealDamage()`.
- `js/ui.js` — status tooltip and displayed description.
- `castle-run.html` — legacy behavior for comparison only.

---

## Mirror behavior

**Question:** Is the Mirror a paid path-switch mechanic, or a forced rest/upgrade/remove event?

**Relevant files:**

- `GDD.md` — Mirror design descriptions.
- `PROGRESS.md` — describes a forced rest/upgrade/remove choice.
- `js/game.js` — active Mirror flow and path navigation. *(not yet reviewed this session)*
- `js/ui.js` — Mirror UI where applicable.
- `castle-run.html` — legacy behavior for comparison only.

---

## Normal ending castle outcome

**Question:** In the Normal Ending, does the castle endure and continue the cycle, or crumble when Aldric is defeated?

**Partial finding:** `showAldricEnding()` in `js/ui.js` sets the Normal Ending text to *"Aldric dissipates into shadow. The castle endures. You were not ready. Return when you are."* — this directly contradicts `GDD.md`'s narrative description, which says the castle crumbles in the Normal Ending. In-code text currently says the castle **endures**, matching the "cycle continues" framing rather than the "castle crumbles" framing.

**Still needed:** A decision on which is actually intended, then align GDD.md and the in-code ending text.

**Relevant files:**

- `GDD.md` — Normal Ending narrative.
- `PROGRESS.md` — Two Endings narrative.
- `js/ui.js` — `showAldricEnding()` ending text.
- `js/combat.js` — ending trigger flow.
- `castle-run.html` — legacy ending text for comparison only.

---

## Blood Lord trigger frequency

**Question:** Does Blood Lord heal once per Attack card played or once per damage instance/hit?

**Relevant files:**

- `CARD_UPGRADES_MASTER.md` — locks once per Attack card and calls out multi-hit cards.
- `js/data.js` — base and upgraded descriptions. *(not yet reviewed this session)*
- `js/combat.js` — Attack-card and damage hooks. *(not yet cross-checked against Blood Lord specifically)*
- `js/ui.js` — displayed/previewed descriptions.
- `PROGRESS.md` — implementation history.

**Note:** Given the Weak-timing finding above (damage resolution firing per-hit inside `dealDamage`), it's worth checking whether Blood Lord's heal hook is wired at the per-card level or accidentally inherits the same per-hit firing pattern.

---

## Missing GDD cards and pool completeness

**Question:** Are hero pools considered complete without the GDD cards listed as uncoded, or must those cards be implemented or formally removed from the design?

**Relevant files:**

- `GDD.md` — designed card pools.
- `CARD_UPGRADES_MASTER.md` — simultaneously marks pools complete and lists missing cards: Thief's Gambit, Gut Punch, Golden Strike (Thief); Cursed Veins (Vampire); Wild Combo, Press Your Luck, Jackpot (Gambler).
- `PROGRESS.md` — implemented pool counts/status.
- `js/data.js` — implemented cards and upgrades. *(not yet reviewed this session)*
- `js/ui.js` — active reward pools.

---

## `curseddice`

**Question:** Is `curseddice` intentionally removed from the game and design, or should it be restored?

**Relevant files:**

- `PROGRESS.md` — records its removal.
- `CARD_UPGRADES_MASTER.md` — still documents its upgrade.
- `js/data.js` / `js/ui.js` — active card and reward data. *(not yet reviewed this session)*
- `castle-run.html` — legacy implementation.

---

## Battle reward wording and die rewards

**Question:** Are normal battle rewards card-only, or should they still offer a card-or-die choice?

**Confirmed still present:** `index.html`'s reward screen subtitle literally says *"Choose your reward — card or die"* while `PROGRESS.md` says dice were removed from combat rewards and moved to shops, Magic Doors, and events only. This is a live, user-facing wording bug regardless of which behavior is correct — the subtitle should be updated to match whichever system is actually active.

**Relevant files:**

- `index.html` — reward subtitle says "card or die."
- `PROGRESS.md` — says dice were removed from combat rewards and moved to shops, Magic Doors, and events.
- `js/ui.js` — active reward generation. *(reward-screen rendering not yet fully traced this session)*
- `js/data.js` / `js/game.js` — die acquisition sources.
- `castle-run.html` — legacy reward wording/behavior.

---

## Session Notes

*Session [date to fill in]:* Reviewed `js/ui.js` and `js/combat.js` in full. Resolved 3 discrepancies via direct code inspection (Burn damage, Mobile orientation, True Ending requirements — the latter via new design decision rather than existing-code confirmation). Advanced Weak timing to "needs playtest" status. Found one unrelated bug in passing: core-collection message in `checkCombatEnd()` displays `G.char.name` (player's own character) instead of the boss's name. `js/game.js` and `js/data.js` not yet reviewed — Mirror behavior, Blood Lord frequency, missing cards, and `curseddice` all require those files to resolve.