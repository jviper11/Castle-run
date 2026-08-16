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
- ✅ RESOLVED (Aug 16, 2026): Core-drop first-time gating. `recordCoreCollected()` in `js/meta.js` writes only on the first-ever defeat of a given companion and returns true only then, backed by `localStorage`. The lore *reveal* UI is still unbuilt — only the unlock state is tracked.
- ✅ RESOLVED (Aug 16, 2026): Challenge-mode fight logic. Eligibility (`isChallengeEligible()`), opt-in at the boss intro, per-hero enforcement, and relic earning on a win all exist in `js/combat.js` / `js/ui.js`. Design questions settled with the project owner this session: the attempt is **opt-in** at the boss-intro screen (not automatic); Denial rules are enforced by **suppressing the effect at its choke point** (`drawCards()` / `gainBlock()`) rather than gating the card, so affinity-conditional grants are handled without a per-card list; Gambler's denial disables the **reroll button only**, leaving card-driven rerolls (Risk Taker, Wild Combo) intact since those cost a card and Energy; a lost attempt is an ordinary run loss with nothing tracked; attempts are unlimited, but a Challenge already earned is **never re-offered**.
- ✅ RESOLVED (Aug 16, 2026): `G.aldricHasRelics` now reads `hasTrueEndingRelics()` (4 of 5 from `META.challengeRelicsEarned`), evaluated once at Aldric fight start exactly as the old check was. It previously read `G.cores.length >= 4`, which was wrong twice over: Cores are a different system, and a per-run count meant beating four floor bosses in one ordinary run unlocked the True Ending — the precise exploit this redesign existed to remove. **The True Ending path is now wired end to end**: Core collected → Challenge unlocked in a later run → Challenge cleared → relic persisted → gate reads it.
- ✅ RESOLVED (Aug 16, 2026): the four named relics (Crown/Sword/Sigil/Vow) are gone from code. `ALDRIC_RELIC_TRIGGERS` keeps its four Phase 3 HP-threshold beats and Aldric's own dialogue, but they are now **unattributed** — no relic names, icons, or ownership claims — pending the deferred design below. The Sword's `G.enemy.damage` halving was confirmed unreachable (`aldricAttackProfile()` hardcodes base 15 for a gate-passed Phase 3 and never reads `G.enemy.damage`) and was deleted; its 75 HP beat remains, since pausing Aldric's attack was its only real contribution.

**Still deferred (design, not bugs):**
- ⚠ GDD §9 leaves unspecified what the five Challenge relics actually DO inside the Aldric fight. They are currently **earn-and-store only**: holding 4 opens Phase 3 and the True Ending, but no relic has an individual effect. The four unattributed threshold beats are placeholders holding the fight's pacing until this is designed.
- ⚠ GDD §1 describes "at 50 HP you're given the option to use the relics instead of the killing blow." **That choice does not exist in code.** The True Ending currently fires when Aldric is killed with the gate passed; the 50 HP beat grants infinite rerolls instead. The path is wired, but not yet told the way the GDD describes it.
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

## ⚠️ OPEN — Does a damaging enemy *special* count as an "attack" for Chill?

**Question:** GDD.md says Chill is "-1 stack per enemy attack" and reduces "the enemy's attack damage." Observed behaviour (Aug 15, 2026): only the **basic attack action** counts. A turn-trigger special that deals damage through `resolveEnemyAttack()` (Ritual-style) on a defend-intent turn neither consumed a Chill stack nor had its own damage reduced — it dealt its full 12 rather than 9.

This is self-consistent and arguably correct if "attack" means the basic attack action, but it means Chill is dead weight against enemies whose damage comes mostly from specials. Not changed — needs a design decision on whether special damage should be Chill-reducible (and therefore Chill-consuming). Same question applies to enemy Weak, which likewise only modifies the basic attack.

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
  "a stash of gold and something extra" granted Gold only. There is no consumable or item-grant
  path in the codebase (Consumables designed, unbuilt), so the text was corrected on both the
  choice and the description rather than inventing an item system for one event.

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
- All **15 Character relics** are absent from every `.js`/`.html`/`.css` file. The docs carry
  display names only ("Warlord's Bandage"), so no key naming convention exists for them yet.

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

---

## Session Notes

*Session [date to fill in]:* Reviewed `js/ui.js` and `js/combat.js` in full. Resolved 3 discrepancies via direct code inspection (Burn damage, Mobile orientation, True Ending requirements — the latter via new design decision rather than existing-code confirmation). Advanced Weak timing to "needs playtest" status. Found one unrelated bug in passing: core-collection message in `checkCombatEnd()` displays `G.char.name` (player's own character) instead of the boss's name. `js/game.js` and `js/data.js` not yet reviewed — Mirror behavior, Blood Lord frequency, missing cards, and `curseddice` all require those files to resolve.

*Session July 25, 2026:* Full redesign of the True Ending / Souls / Cores system, prompted by discovering the floor-reward relic gate was structurally impossible to satisfy (see superseded entry above). New system: per-hero Challenge relics (need 4 of 5), Cores as lore + Challenge-unlock triggers, Souls as an in-run resource instead of a permanent cross-run tree. All 5 hero Challenges fully designed. Soul-spend menu drafted (see PROGRESS.md). None of this is implemented yet — design-only session.

*Session August 15, 2026:* Synced this file against the July 25 redesign — the True Ending entry above was still describing the superseded floor-reward-relic-gate system as current. GDD.md and PROGRESS.md are still out of date and need the same treatment next.