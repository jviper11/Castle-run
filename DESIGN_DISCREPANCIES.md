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

**Implementation TODO:**
- ✅ RESOLVED (Aug 16, 2026): Core-drop first-time gating. `recordCoreCollected()` in `js/meta.js` writes only on the first-ever defeat of a given companion and returns true only then, backed by `localStorage`. ✅ FOLLOWED UP (Aug 20, 2026): the lore reveal UI is now built too. All five companions have `lore` text on their `BOSSES` entry and `showCoreLoreReveal()` (`js/ui.js`) reads it out once ever, gated on that return value — which until now was discarded at its only call site, so the "first time only" signal existed but nothing consumed it. See the new open question below about re-viewing.
- ✅ RESOLVED (Aug 16, 2026): Challenge-mode fight logic. Eligibility (`isChallengeEligible()`), opt-in at the boss intro, per-hero enforcement, and relic earning on a win all exist in `js/combat.js` / `js/ui.js`. Design questions settled with the project owner this session: the attempt is **opt-in** at the boss-intro screen (not automatic); Denial rules are enforced by **suppressing the effect at its choke point** (`drawCards()` / `gainBlock()`) rather than gating the card, so affinity-conditional grants are handled without a per-card list; Gambler's denial disables the **reroll button only**, leaving card-driven rerolls (Risk Taker, Wild Combo) intact since those cost a card and Energy; a lost attempt is an ordinary run loss with nothing tracked; attempts are unlimited, but a Challenge already earned is **never re-offered**.
- ✅ RESOLVED (Aug 16, 2026): `G.aldricHasRelics` now reads `hasTrueEndingRelics()` (4 of 5 from `META.challengeRelicsEarned`), evaluated once at Aldric fight start exactly as the old check was. It previously read `G.cores.length >= 4`, which was wrong twice over: Cores are a different system, and a per-run count meant beating four floor bosses in one ordinary run unlocked the True Ending — the precise exploit this redesign existed to remove. **The True Ending path is now wired end to end**: Core collected → Challenge unlocked in a later run → Challenge cleared → relic persisted → gate reads it.
- ✅ RESOLVED (Aug 16, 2026): the four named relics (Crown/Sword/Sigil/Vow) are gone from code. `ALDRIC_RELIC_TRIGGERS` keeps its four Phase 3 HP-threshold beats and Aldric's own dialogue, but they are now **unattributed** — no relic names, icons, or ownership claims — pending the deferred design below. The Sword's `G.enemy.damage` halving was confirmed unreachable (`aldricAttackProfile()` hardcodes base 15 for a gate-passed Phase 3 and never reads `G.enemy.damage`) and was deleted; its 75 HP beat remains, since pausing Aldric's attack was its only real contribution.

- ✅ RESOLVED (Aug 17, 2026): GDD §9's Challenge relic in-fight effects, and GDD §1's 50 HP mercy choice, are both built. `ALDRIC_HERO_BEAT_EFFECTS` (`js/combat.js`) gives each of the 5 heroes a distinct beat effect (Barbarian: strips Aldric's Strength; Vampire: drains 8 HP from Aldric to the player — the Vampire Challenge boss's own escalation number and mechanic, turned back on him; Mage: +1 card draw persisting for the rest of the fight; Thief: flat +15 Block; Gambler: infinite Reroll — the same as before, since it already matched the relic's theme). `computeAldricRelicAssignment()` maps whichever 4 of the 5 relics are held onto the four HP thresholds in a fixed priority order (Barbarian, Vampire, Mage, Thief, Gambler), skipping and compacting around whichever one relic is missing; if a player has somehow earned all 5 across past runs as other heroes, their current hero's own relic is excluded first so exactly 4 remain. The mercy choice itself (`showAldricMercyChoice()`/`acceptAldricMercy()`/`declineAldricMercy()`) is offered alongside the 50 HP beat's own effect, not instead of it — accepting ends the fight immediately with the True Ending; declining continues toward a real kill. **This is a real behavior change, not just an addition**: `showAldricEnding()` now gates on a new `G.aldricMercyChosen` flag instead of `G.aldricHasRelics` directly — holding the relic gate is necessary but no longer sufficient. A kill while holding 4+ relics, without ever accepting mercy, now correctly yields the Normal Ending. The old, unattributed 25 HP "Aldric stops attacking for the rest of the fight" beat is retired — none of the five hero effects do that, so it wasn't kept as a sixth generic behavior.
- The 4 old True Ending relics (Crown/Sword/Sigil/Vow) and their planned per-relic debuffs are dropped entirely — replaced by the 5 Challenge relics above. No debuff mechanic carries over; Challenge relics are earned through difficulty, not opportunity cost.
- Soul-spend menu contents/costs need to be finalized (draft exists, see PROGRESS.md Soul section) and built as an in-run screen, replacing the old permanent-tree UI concept.
- All of GDD.md's Two Endings / Relic System sections and PROGRESS.md's True Ending / Soul tracker rows need rewriting to match — currently still describe the superseded floor-reward-relic-gate system.

---

## ✅ RESOLVED — Burn damage

**Original question:** Does each Burn stack deal 1 damage or 2 damage before modifiers such as Burning Soul?

**Resolution:** Code is source of truth — `js/combat.js` line ~752 does `G.enemy.hp -= burn.stacks` (stacks × 1), matching PROGRESS.md's note that Burn was changed to match Poison.

**Tooltip:** corrected — `js/ui.js`'s `STATUS_DESCRIPTIONS` Burn tooltip now reads *"Takes stacks damage at end of turn. Ticks down."* (×1), matching the actual behavior. (The earlier stale *"× 2"* wording has been removed.)

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

**Amendment (Aug 15, 2026) — this resolution only ever covered PLAYER Weak.** A later report of enemy Weak sticking at its peak looked like a regression of the above, but was not: STEP 2b was intact and still correct, and the multi-hit no-drain rule still held (re-verified). The gap was that **enemy** Weak was read nowhere in the combat loop — it neither decayed nor applied its 25% reduction, despite 12 card effects applying it. Confirmed to predate the split-build session work by re-running the repro against `git show HEAD:js/combat.js`. Now fixed: `enemyAttackDamage()` in `js/combat.js` is the single source of truth for a basic enemy attack (Rage → Weak → Chill), shared by `endTurn()` STEP 6 and `updateIntent()`, and **STEP 6b** ticks enemy Weak *after* the enemy acts.

**Timing note — the two sides tick at different points, deliberately.** Weak reduces the attacks of whoever carries it, so each side's stack must survive until the attack it was meant to weaken has resolved:
- **Player Weak** → STEP 2b (the player's attacks already resolved during their turn).
- **Enemy Weak** → STEP 6b, after the enemy's STEP 6 attack. Ticking it in STEP 2b would strip a Weak 1 before the very attack it was played to weaken.

**Player Vulnerable — same defect, now also fixed (Aug 15, 2026).** Applied by Cursed Hound's rabid bite and read nowhere, so it neither increased damage taken nor decayed. `git log -S` traced it to the **same migration** that lost enemy Weak: commit `90c74a0` had a `getModifiedIncomingDamage()` helper reading player Vulnerable and Fly, and it did not survive the re-split in `bb85760`. Both halves of the Weak/Vulnerable pair were lost in one move; this closes that gap. Now applied by `applyPlayerVulnerable()` in `js/combat.js` inside the shared `resolveEnemyAttack()` pipeline (so it covers basic attacks, enemy specials and Aldric, matching the breadth enemy Vulnerable gets from `calculatePlayerAttackDamage()`), and ticked in STEP 6b.

**Multiplier — ×1.5, not the ×1.25 the lost helper used.** GDD.md's status table ("Target takes 50% more damage") and the shared in-game tooltip ("Takes 50% more damage from attacks") both state one symmetric rule, and the live enemy-side path already uses ×1.5. The historical ×1.25 disagreed with the GDD before it was lost, so it was not restored — noted here in case that asymmetry was once intentional and someone wants it back as a deliberate design choice.

**Timing:** player Vulnerable ticks in **STEP 6b**, not STEP 2b with player Weak. It modifies the damage of the enemy's STEP 6 attack, so like enemy Weak it must survive until that attack resolves. Cursed Hound applies it from an `attack`-trigger special in STEP 9 — after the tick — so a freshly applied stack correctly survives to amplify the following turn rather than being consumed on arrival.

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

## ✅ CONFIRMED — Chill tick cadence (verified, no behaviour change)

**Original question:** Does Chill tick once per turn like Weak/Vulnerable, or only when the enemy actually attacks?

**Verified Aug 15, 2026 — the code already matched the GDD; nothing was changed.** Chill has exactly one decrement site, inside `enemyAttackDamage(g, consumeChill)` in `js/combat.js`, and `consumeChill` is true only on the attack branch of `endTurn()` STEP 6. Observed: 3 stacks survived 4 consecutive defend turns unchanged (`3 → 3 → 3 → 3 → 3`), survived 20 defend turns intact, and an interleaved run of 7 turns containing 3 attacks consumed exactly 3 stacks. Rendering the intent preview does not consume a stack.

**Weak and Vulnerable are deliberately different, and also correct.** Both tick on a plain per-turn cadence regardless of the enemy's action, matching the GDD's "-1 stack at end of turn" (which carries no attack qualifier, unlike Chill's entry). Observed across defend turns: enemy Weak `4 → 3 → 2 → 1`, player Vulnerable `4 → 3 → 2 → 1`, player Weak `3 → 2 → 1`. So Chill is the only status in the game with an action-conditional cadence.

**One inconsistency found and fixed:** the in-game Chill tooltip read "Ticks down each turn," contradicting both the GDD and the verified behaviour. Corrected to "Ticks down only when the enemy attacks." Behaviour untouched; the tooltip was the only thing wrong.

---

## ✅ RESOLVED — Does a damaging enemy *special* count as an "attack" for Chill? (Aug 18, 2026)

**Question:** GDD.md says Chill is "-1 stack per enemy attack" and reduces "the enemy's attack damage." Observed behaviour (Aug 15, 2026): only the **basic attack action** counted. A turn-trigger special that deals damage through `resolveEnemyAttack()` (Ritual-style) on a defend-intent turn neither consumed a Chill stack nor had its own damage reduced — it dealt its full 12 rather than 9.

This is self-consistent and arguably correct if "attack" means the basic attack action, but it means Chill is dead weight against enemies whose damage comes mostly from specials. Same question applied to enemy Weak, which likewise only modified the basic attack.

**Resolution: the two halves of the question get different answers, and that is the point.**

- **Reducible: yes.** All three damaging specials — Ritual (Blood Cultist), Arcane Overload (Royal Sorcerer) and Collapse (Void Colossus) — now route their damage through `enemyAttackDamage()` before `dealDamage()`, so Rage, Weak and Chill all apply, exactly as they already did for basic attacks and for Aldric's Fractured Strike. The deciding argument is the same one that settled the Aldric case above: a player who spends cards on Weak against the Royal Sorcerer should not watch his headline 25-damage ability ignore it.
- **Consuming: no.** Every one of the three passes `consumeChill = false`, because the stack is spent once per enemy turn by the basic attack in `endTurn()` STEP 6. Ritual and Arcane Overload are `turn` triggers firing in STEP 5, *before* that; Collapse is an `attack` trigger firing in STEP 9, *after* it, and only on turns the enemy attacked — so for Collapse a `true` would double-spend on literally every activation. This preserves the invariant Fractured Strike established: **one enemy turn spends exactly one Chill stack, however many damage instances that turn contains.** Verified with three instances in one turn (special + basic attack + Collapse) consuming exactly one stack while all three were reduced.

Fractured Strike keeps `consumeChill = true` and is *not* inconsistent with this: `processAldricTurn()` **replaces** the basic attack, so its 3-hit volley is that turn's only attack. These three specials **ride alongside** the basic attack instead.

**Consequence on defend turns:** a Ritual or Arcane Overload landing on a defend-intent turn is now Chill-*reduced* while consuming nothing — Chill can therefore reduce more damage than it has stacks for. That is deliberate, and it matches GDD.md's "Chill only consumes a stack when the enemy attacks (not on defend turns)" more closely than the alternative would.

Each special's `showMsg` now reports the **resolved** number rather than its base, so Arcane Overload no longer announces "25 damage" while 13 lands.

---

## ✅ RESOLVED — Enemy debuffs do nothing to Aldric, but Weak still drains

**Original question:** Aldric resolved all his damage by calling `resolveEnemyAttack()` directly with hardcoded values, bypassing `enemyAttackDamage()`. Rage, Weak and Chill did not modify his damage at all, yet enemy Weak still decremented every Aldric turn (`3 → 2`) while having no effect — a player spending cards on Weak against the final boss watched it drain away for nothing.

**Resolution (Aug 15, 2026): fixed — Aldric now routes through `enemyAttackDamage()` like every other enemy.** The deciding argument was not whether debuff-immunity is good design, but that the game was *lying*: stacks visibly ticked down while doing nothing. Nothing in `GDD.md`'s Aldric section assumes independent damage calculation; the only intentional immunity is Phase 3's "Unbreakable," which is expressed by clearing `G.statuses.enemy` and is preserved unchanged.

A shared `aldricAttackProfile(g)` supplies the phase-specific base and hit count, used by both `processAldricTurn()` and `updateIntent()` so his displayed intent cannot drift from the volley he throws. Measured: Phase 1 `15 → 11` under Weak, `21` under Rage 6, `15` under Rage 6 + Weak; Phase 2 per-hit `8 → 6` under Weak with the Poison/Burn amplification (`8 → 12`) intact; Phase 3 relic branch `15 → 11`. Phase 3 without relics still deals a flat 20 through any debuff. A 3-hit Fractured Strike volley consumes **one** Chill stack, not three, matching the multi-hit rule established for Weak.

**Noted while in this code, not changed:** the Sword relic trigger halves `G.enemy.damage`, but the Phase 3 relic branch has always used an explicit 15 and never read it, so that halving has never had any effect. It belongs to the superseded True Ending relic system (see the entries above) and should be revisited when that system is redesigned. Separately, `GDD.md` line 333 says Fractured Strike "doubles" with Poison/Burn while the code uses ×1.5 — a pre-existing text/code disagreement, left alone.

---

## ✅ RESOLVED — Enemy roster: `GDD.md` and `js/data.js` had diverged wholesale

**Raised Aug 16, 2026** by a player report of a Floor 2 "Cursed Knight" (75 HP, 13 damage, Undying) that matched no single GDD entry. Investigated: **this is a doc-sync issue, not a code bug.** `js/data.js` is internally consistent and the player fought exactly what it defines — name, HP, damage and ability all come from one definition in `FLOOR_ENEMIES[2]`:

```
{ name:'Cursed Knight', emoji:'🗡️', hp:75, block:8, damage:13, reward:25, souls:4,
  special:{ name:'Undying', desc:'Revives once with 15 HP', trigger:'hp', ... } }
```

Nothing is mis-wired: no wrong display name pulling from another definition, no ability attached to the wrong key. The drift is between the doc and the code, and it is **not limited to one enemy** — the Floor 2 and Floor 3 rosters barely overlap at all:

| | `GDD.md` | `js/data.js` (live) |
|---|---|---|
| Floor 2 pool | Skeleton Warrior, Crypt Wraith, Bone Archer, Grave Crawler | Shadow Wraith, Bone Archer, **Cursed Knight**, Crypt Crawler, Blood Bat |
| Floor 3 pool | Dark Scholar, Arcane Construct, **Cursed Knight**, Tome Guardian | Dark Sorcerer, Corrupted Priest, Shadow Wraith+, Stone Gargoyle, Void Stalker |
| Cursed Knight | Floor 3 standard, 58 HP, 13 dmg, *Hexed Blade* | Floor 2 standard, 75 HP + 8 Block, 13 dmg, *Undying* |
| Skeleton Warrior | Floor 2, 45 HP, Undying "revives at 1 HP" | **does not exist** |
| Hexed Blade | Cursed Knight's ability | **does not exist anywhere** |
| Undying revive HP | "revives once at 1 HP" | revives once at **15 HP** |
| Cursed Knight+ | not in the doc | Floor 4, 100 HP, *Undying+* — revives **twice** at 20 HP |

Even the one shared name disagrees: Bone Archer is 35 HP / 9 dmg / Volley in the doc and 65 HP / 12 dmg / Poison Arrow in code. Several code enemies look like renamed doc entries (Crypt Wraith → Shadow Wraith, Grave Crawler → Crypt Crawler), which suggests a deliberate rebalance the doc never caught up with rather than accidental corruption.

**Resolved Aug 16, 2026 — `GDD.md` rewritten to match `js/data.js`; no code changed.** The three open questions were decided as follows:
1. Cursed Knight **stays on Floor 2 with Undying**, paired with the Floor 4 Cursed Knight+.
2. **Skeleton Warrior and Hexed Blade are dropped for good** and removed from the doc, along with the other 18 phantom enemies and 5 phantom abilities that never existed in the shipped build.
3. Undying revives at **15 HP** (code); the doc's "at 1 HP" was wrong and is corrected. Undying+ is documented as twice at 20 HP.

All four floors were rewritten wholesale rather than patched — **Floor 1 and Floor 4 proved just as stale as Floors 2-3**, so limiting the sync to 2-3 would have left the doc self-contradictory (Cursed Knight+ lives on Floor 4). A Block column was added, since several enemies carry Block the doc never recorded, and the elite-to-floor pairing from `startCombat()`'s `floorEliteMap` is now stated. Tables were generated from `js/data.js` and then verified by parsing the rewritten doc back out and diffing every field against the live data — 0 mismatches. **This was a stale-doc correction, not a rebalance.**

---

## ✅ CONFIRMED — Undying revive cadence (verified, no code change)

**Original question:** Does Undying fire only once per combat, as "revives once" implies, or can it repeat?

**Verified Aug 16, 2026 — once per combat, exactly as intended.** Implementation is gated on a per-instance flag: `if (!g.enemy._revived && g.enemy.hp <= 0) { g.enemy.hp = 15; g.enemy._revived = true; }`, fired from the `trigger:'hp'` hook in `dealDamage()` and `endTurn()` STEP 9. Observed against the real enemy definition: 1st killing blow → revives at 15 HP with the fight continuing; 2nd → dies for real and the win resolves; 3rd and 4th → stays dead. The flag survives turn boundaries (three turns later it still cannot revive again) and does not leak between combats, since `startCombat()` spawns a fresh instance copy. Cursed Knight+ correctly allows exactly two revives at 20 HP each before the third blow is final. The cadence is keyed to the enemy instance, not the name, so it behaves identically regardless of which enemy carries the ability.

**✅ Sub-finding resolved (Aug 16, 2026) — DoT kills bypassing HP-threshold abilities is now a stated design rule, kept as-is.** Burn and Poison subtract HP directly in `endTurn()` STEPS 1 and 7, and STEPS 4 and 8 call `checkCombatEnd()` *before* STEP 9 runs the `hp` trigger, so a lethal tick kills outright and the threshold ability never fires. Decision: **keep the ordering, document the consequence.** Written into `GDD.md` §5 Status Effects (with a short cross-reference in the AI Development Guidelines' Status Timing Rules) rather than left as an implicit side effect of step ordering, because it silently governs every `trigger:'hp'` ability, not just Undying.

Scope established by inspection and test rather than assumed:
- **Exactly four abilities are affected**, all self-preservation: Reassemble (Skeleton), Undying (Cursed Knight), Dark Blessing (Corrupted Priest), Undying+ (Cursed Knight+). **None of them damage the player**, so the rule is uniformly a player advantage — DoT can skip an enemy's survival tool but can never let the player dodge a punish.
- **The bypass is lethal-only.** Non-lethal DoT still fires the trigger in the same turn (verified: a Skeleton dropped 12 → 7 by Burn still Reassembles to 15; a Corrupted Priest pushed below its 50% line by Poison still heals). Only the killing tick skips it.
- **Card killing blows always trigger normally**, so DoT is the sole route around these abilities.
- **Collapse is unaffected and was never at risk.** It belongs to **Void Colossus** (Floor 4 elite) with `trigger:'attack'`, not to Bone Golem — whose live ability is Bone Wall (`trigger:'skill'`). The "Bone Golem: Collapse — deals 20 damage when broken below 50% HP" pairing existed only in the pre-sync `GDD.md` roster and never in code. Denying Collapse by killing the enemy before it attacks is ordinary racing, available to any damage type, not a DoT-specific loophole.

**Revisit if** an HP-threshold ability that *harms* the player is ever added — under this ordering, players could avoid its damage by finishing with poison or burn. That is the one case where this rule would stop being harmless, and it is flagged in the GDD text.

---

## ✅ RESOLVED — Three events promised things they did not deliver (Aug 16, 2026)

Found while investigating a "Magic Door gave me a reward with no confirmation" report. All three
were text-vs-behaviour mismatches rather than broken mechanics, and all three are now fixed.

- **Gambler's Curse — "Next 3 Magic Doors are hidden" did nothing.** `G.mapBlind += 3` was written
  and never read anywhere, so the advertised risk was decoration and the offer was pure upside.
  Now implemented in `showDoors()`. Note the baseline is narrower than GDD §"Always hidden"
  implies: `isHidden` requires `G.currentFloor >= 2`, so Magic Doors are **always revealed on
  Floors 1-2** and only ~60% hidden on Floors 3-4 — and hidden ones still show a room-identifying
  hint. A blinded door is therefore forced hidden **and** stripped of the hint, charged once per
  Magic Door actually reached. **If GDD.md's "Always hidden" wording is meant literally, the code
  has never matched it and that is a separate open question.**
- **Gambler's Curse — "a powerful reward" could be a downgrade.** The unseen die grant could roll
  the d4 Cursed Die (max 4), worse than the starting d6. d4 is now excluded from that pool only;
  it remains available in the Magic Door chooser, where the player sees the die before taking it.
- **Hidden Cache — promised an item that does not exist.** "Take it all (25 Gold + item)" and
  "a stash of gold and something extra" granted Gold only. There was no consumable or item-grant
  path in the codebase (Consumables designed, unbuilt), so the text was corrected on both the
  choice and the description rather than inventing an item system for one event.
  **Superseded Aug 18, 2026 — the original promise is now kept, not trimmed.** Consumables gained
  real acquisition paths, so both the description and the "+ item" label are restored and the
  choice calls `giveReward(g,'consumable')`, drawing from GDD §12's Event pool with floor gating.
  The interim text change is no longer in the code.

**✅ RESOLVED (Aug 16, 2026):** `die_reward` was absent from `roomEmoji()`, `roomLabel()` and
`getMagicHint()`, so a *revealed* die-reward door fell through to `🚪` / "Unknown" and looked
identical to a hidden one. Now `🎲` / "Dice Cache", with the hint "A faint rattle, like dice
waiting to be claimed." matching the other hints' one-sentence style. **Label wording was not
specified in the request** — `Dice Cache` was chosen to sit alongside Battle / Elite Fight /
Strange Event / Merchant / Rest Stop and to echo the hint; trivially changed if another noun
phrase is preferred.

---

## ✅ RESOLVED — GDD's "Magic Door: Always hidden" never matched the code (Aug 16, 2026)

The Room Types table claimed Magic Doors are "Always hidden". The code has never done that:
`isHidden = G.currentFloor >= 2 ? Math.random() < 0.6 : false`. With `G.currentFloor`
zero-indexed, that is **revealed on Floors 1-2, and a 60% per-door roll on Floors 3-4**.

Resolved as **doc-wrong, code-right** by owner decision: the early-game reveal is intentional
easing, so `isHidden` is unchanged and GDD.md was corrected to state the exact threshold and
probability, quote the condition, and note the zero-indexing so "Floor 3-4" cannot be misread as
"index 3-4". The Gambler's Curse override (forced hidden *and* hint stripped, charged per Magic
Door reached) is documented alongside it so the two entries agree with each other and the code.

---

## ✅ RESOLVED — Relic offer pools ignored rarity/floor gating and sold unimplemented relics (Aug 16, 2026)

`renderShopRelics()` and `showEliteRelicReward()` each inlined
`Object.entries(RELICS).filter(([k]) => !G.relics.includes(k))`. The only rule was "not already
owned", so:

- **No rarity or floor gating existed**, contradicting GDD §9 (Common any floor, Uncommon
  Floor 2+, Rare Floor 3+). A Floor 1 shop could sell King's Debt. The shop carried a comment
  claiming a common-only Floor 1-2 pool that the code never implemented.
- **Relics with no implementation were offered.** A hook audit of all 30 keys found exactly two
  dead: `bone_key` (no room hook) and `shattered_mirror` (no enemy card-copy mechanic). Both
  granted a no-op on purchase.

Both now route through one shared `offerableRelics()` helper, so the two pools cannot drift
apart again. Unimplemented relics sit in a named `UNIMPLEMENTED_RELICS` list with the reason per
key; **delete an entry there when its behaviour lands or the relic stays unobtainable.**

**Stale doc claims corrected by the same audit:**

- `void_compass` was recorded as deferred in PROGRESS.md. It **is** implemented and drives the
  1-of-3 elite relic screen. Only two relics are genuinely deferred.
- `ivory_die` and `loaded_gauntlet` have no `hasRelic()` call and would score as dead on a naive
  grep — they are live, implemented as pickup side-effects inside `acquireRelic()`.
- All **15 Character relics** were absent from every `.js`/`.html`/`.css` file at the time of this
  audit (Aug 16, 2026). The docs carried display names only ("Warlord's Bandage"), with no key
  naming convention yet. **Superseded (Aug 17, 2026):** all 15 are now implemented, one batch per
  hero, keyed as `warlords_bandage`/`battle_drum`/`berserkers_scar` (Barbarian),
  `stone_grimoire`/`frost_seal`/`ley_line_crystal` (Mage),
  `assassins_edge`/`shadow_wrap`/`venomfang` (Thief),
  `midnight_hunger`/`crimson_lens`/`blood_pact` (Vampire), and
  `devils_ledger`/`house_always_wins`/`loaded_coat` (Gambler). See the Session Log in
  `PROGRESS.md` for each batch.

---

## ✅ RESOLVED — King's Debt did not inflate card upgrades, and two modals lied about their price (Aug 18, 2026)

King's Debt reads "Shop prices now cost 25% more", implemented as `shopCost(n)`. Every shop spend
routed through it — card removal, relics, dice, and the newer consumable stock — **except card
upgrades**, which charged a flat `80` at all three points (the affordability gate, the
not-enough-gold message, and `spendGold`). Now `const cost = shopCost(80)`, resolved once and used
by all three, so the relic's downside has no hole.

**Two display bugs found in the same surface and fixed with it.** Both modals hardcoded their price
in `index.html` — "Cost: 80 🪙" and "Cost: 75 🪙" — while the code charged `shopCost(...)`. Card
removal's gate and charge were already King's-Debt aware, so under the relic its modal advertised 75
and took 94. Both strings now have ids and are written from the same resolved `cost` the click
spends. (The removal *button* label was already dynamic; only the modal copy was stale.)

**Found while fixing this:** `showShopUpgrade()` had **no caller anywhere in the active build** —
the modal markup and the function were complete, but the shop's "Card services" row held only
`#shop-remove-btn`, so the pricing asymmetry above was latent rather than player-visible.

**Resolved Aug 18, 2026 — the service is now reachable.** `#shop-upgrade-btn` sits beside
`#shop-remove-btn` in that row, styled identically (`class="btn"`, `flex:1`, same font size), and
both labels are priced live from `shopCost()` in `showShop()` so King's Debt is visible on the button
rather than only surfacing at the till.

Wiring it up exposed two things in the previously-dead handler, both fixed:

- **It duplicated the upgrade mechanic.** The Rest stop calls the shared `upgradeCard()`
  (`js/data.js`); the shop did its own `G.deck.splice(idx, 1, key + '+')`, which skipped
  `upgradeCard()`'s `G.drawPile`/`G.hand` sync. Harmless in a shop (`shuffleDeck()` rebuilds both
  next combat) but it meant "upgrade a card" had two definitions. The shop now calls
  `upgradeCard()`, so there is one.
- **It charged before it acted.** `spendGold()` ran unconditionally, then spliced blind. Had the key
  been absent from the deck, `G.deck.splice(-1, 1, ...)` would have **replaced the last card in the
  deck instead** — and charged for it. Unreachable through the UI, but paid-for-nothing by
  construction. Gold is now spent only after `upgradeCard()` returns true.

The Rest-stop path (`startRestPick('upgrade')`, free) is unchanged and remains the other entry point.
The two eligibility tests differ in form but are equivalent by construction: the shop filters on
`CARDS[k + '+']`, the Rest stop on `CARD_UPGRADES[k]`, and `js/data.js` registers the former from
the latter.

---

## ⚠️ PARTIAL — Boss Reward Flow's documented composition cannot be built as written (Aug 16, 2026)

GDD's Boss Reward Flow says: *"After each floor boss: choose 1 of 3 relics — 1 Common, 1 Rare,
1 Character-specific."* The screen is now built (`showBossRelicReward()`), but that composition is
only partially satisfiable:

- **The Character slot has no content.** Zero of the 15 Character relics exist in `RELICS`, and
  GDD §9 lists their only source as "Floor 3+, Boss reward only" — so the slot cannot be filled
  from anywhere else.
- **A guaranteed Rare after *every* floor boss contradicts GDD §9's own Rare = Floor 3+ rule.**
  Honouring the sentence literally would re-open the shop/boss inconsistency that
  `offerableRelics()` closed.

**Implemented behaviour:** the composition is an ordered rarity list (`BOSS_REWARD_SLOTS`) filled
from whatever `offerableRelics()` says is eligible; any slot with no content is backfilled from
the remaining pool so the player always sees three real choices. Rare therefore appears from
Floor 3 onward rather than always, and the Character slot is backfilled today. Adding Character
relics with `rarity:'character'` plus a `RELIC_RARITY_MIN_FLOOR` entry makes that slot start
working with no change to the screen.

**Open for the owner:** whether to reword the GDD sentence to describe the gated/backfilled
behaviour, or to treat "1 Common, 1 Rare, 1 Character" as a target state to reach once Character
relics ship. The doc and code currently differ on the Rare slot, deliberately and knowingly.

**Update (Aug 16, 2026) — Barbarian now hits the documented composition, with a side effect.**
With the first Character batch built, a Barbarian at Floor 3+ fills all three slots from pass 1,
so the backfill never runs and **Uncommon relics no longer appear in Barbarian boss rewards**
(reachable set: 10 Common + 9 Rare + 3 Character = 22). This is the literal documented
composition working as written, and Uncommons remain available from shops and the Void Compass
screen — but it is a real change to what that hero sees, and it will repeat for each hero as
their batch lands. Heroes without Character relics still backfill and reach all 28. Flagged in
case "Uncommon absent from boss rewards" is not the intended end state.

**Update (Aug 17, 2026) — all 5 heroes now hit the documented composition; the Character-slot gap
is closed.** Gambler's Loaded Coat was the 15th and final Character relic (all 5 heroes now have
3/3). The side effect noted above for Barbarian therefore now applies to every hero: a Floor 3+
boss reward for any of the 5 heroes fills all three slots from pass 1 (10 Common + 9 Rare +
3 Character = 22 reachable), and Uncommon relics no longer appear there for anyone. Uncommons
remain available from shops and the Void Compass screen. The "Character slot has no content"
half of this discrepancy is now fully resolved; the Rare-slot wording gap above (Open for the
owner) is unaffected and still stands.

---

## ✅ RESOLVED — Sir Crimson's story-beat dialogue was placeholder pending a content pass (Aug 17, 2026)

Batch 5a built the trigger placement for Sir Crimson's two mid-run story beats (shadow between
Floor 1-2, confrontation between Floor 2-3) and the post-fight outro screen with placeholder
dialogue in all three (`SIR_CRIMSON_SHADOW_LINE`/`SIR_CRIMSON_CONFRONTATION_LINE`/
`SIR_CRIMSON_OUTRO_LINE` in `js/ui.js`), since GDD.md gave no text at all for the shadow/
confrontation beats and its post-fight line was already known-stale (written for the pre-July-25
floor-reward relic system).

**Resolution (batch 5d, Aug 17, 2026):** final dialogue supplied by the owner for all three beats.
`js/ui.js`'s post-fight line and `GDD.md:289`'s True Ending hint now read identically — the
"four pieces" wording is gone from both, replaced with text that matches the Challenge-relic
redesign ("Four others wear his grief the way I wore mine"), the same "doc and code agree again"
fix already applied to the Cores/True-Ending-gate discrepancy above. The shadow and confrontation
lines remain code-only (`js/ui.js`) — GDD's Story Arc table (`GDD.md:259-264`) describes what
happens at each beat, not a literal transcript, consistent with how the post-fight line is the
only one of the three GDD ever specified in full.

---

## ⚠️ OPEN — Is Core lore re-viewable, or a one-time beat?

**Question:** Once a companion's Core lore has been revealed, can the player read it again?

**Why this is a conflict:** the two documents describe different features.

- `GDD.md` §1/§7/§9 only ever say the first defeat "reveals their lore" — a moment, satisfied by a one-shot reveal.
- `PROGRESS.md`'s Cores bullets go further: lore is revealed *"in the menu/hero-select"*, and Cores are *"a permanent lore/unlock record, **viewable anytime**"*.

**What is built (Aug 20, 2026):** only the moment. `showCoreLoreReveal()` fires once, on the first-ever defeat, as an overlay in the post-boss flow. There is no menu or hero-select surface that displays `BOSSES[].lore`, so in practice each companion's lore is readable exactly **once, ever, per browser profile** — `META.coresCollected` makes sure of it. Nothing is lost data-wise (the text is static in `js/data.js` and the collected set is persisted), so a re-viewer can be added later without a migration.

**Not decided here.** The two candidate readings need an explicit call:
1. One-time beat is correct — drop "viewable anytime" from `PROGRESS.md` as stale drafting.
2. The re-viewer is real and still owed — build a lore panel on the character-select or an in-run Cores display, keyed off `hasCoreCollected(charKey)`.

Reading 2 also raises a follow-on: hero-select happens before a run exists, so such a panel must read `META` directly and never `G.cores`, the same distinction that already bit the True Ending gate above.

---

## Session Notes

*Session [date to fill in]:* Reviewed `js/ui.js` and `js/combat.js` in full. Resolved 3 discrepancies via direct code inspection (Burn damage, Mobile orientation, True Ending requirements — the latter via new design decision rather than existing-code confirmation). Advanced Weak timing to "needs playtest" status. Found one unrelated bug in passing: core-collection message in `checkCombatEnd()` displays `G.char.name` (player's own character) instead of the boss's name. `js/game.js` and `js/data.js` not yet reviewed — Mirror behavior, Blood Lord frequency, missing cards, and `curseddice` all require those files to resolve.

*Session July 25, 2026:* Full redesign of the True Ending / Souls / Cores system, prompted by discovering the floor-reward relic gate was structurally impossible to satisfy (see superseded entry above). New system: per-hero Challenge relics (need 4 of 5), Cores as lore + Challenge-unlock triggers, Souls as an in-run resource instead of a permanent cross-run tree. All 5 hero Challenges fully designed. Soul-spend menu drafted (see PROGRESS.md). None of this is implemented yet — design-only session.

*Session August 15, 2026:* Synced this file against the July 25 redesign — the True Ending entry above was still describing the superseded floor-reward-relic-gate system as current. GDD.md and PROGRESS.md are still out of date and need the same treatment next.