# PROGRESS.md — Castle Run (Browser)
*Last synchronized: August 15, 2026 (design synced through July 25, 2026 session; repository state through July 23, 2026)*
*Platform: HTML/CSS/JS — browser-based, mobile-first*
*Separate from Castle Run: Ascent (Roblox project)*

---

## Current Active Architecture

- The active game is the split build deployed through the repository-root `index.html`.
- `index.html` loads `css/styles.css` and, in order, `js/data.js`, `js/game.js`, `js/combat.js`, `js/ui.js`, and `js/main.js`.
- `castle-run.html` is a legacy/reference snapshot only. It is not the deployed entry point and should not receive routine runtime changes.
- The split build contains the latest mobile combat layout, dice controls, dynamic card preview, status UI, Power-card hooks, and enemy-intent work.
- Implementation means code is present. It does not mean the feature has been fully verified against descriptions, previews, timing rules, or all combat paths.

### Status vocabulary

- **Designed** — intended behavior is documented.
- **Implemented** — relevant runtime code exists, but may not have complete testing.
- **Partially verified** — some code paths or play scenarios have been checked.
- **Verified** — behavior has been deliberately tested against the agreed design.
- **Known issue** — a reproducible defect or direct code contradiction is documented.
- **Deferred** — intentionally postponed.

### Current high-level status

| Area | Current status | Notes |
|---|---|---|
| Story and world | Designed | Ending details still contain documented conflicts. |
| Core combat loop | Implemented / Partially verified | Requires systematic card/combat consistency testing. Exhaust/deck-integrity path fixed and Verified Aug 15, 2026 — see Session Log. |
| Five heroes and starter decks | Implemented | Do not infer every card interaction is verified. |
| Hero reward pools and upgrades | Implemented | Substantially populated; GDD completeness conflicts remain. |
| Status and Power systems | Implemented / Partially verified | Timing, descriptions, previews, and Exhaust need consistency tests. |
| Enemy intent | Implemented / Partially verified | Compare every displayed intent with the action branch that resolves. |
| Relic system | Implemented / Partially verified | Several hooks exist; some relics and reward flows remain Deferred. Start-of-combat Block relics were dead until Aug 15, 2026 — see the Block bug fix in the Session Log. |
| Mobile landscape combat | Implemented / Partially verified | April 16 responsive work landed; short-height/browser-chrome testing remains. |
| Sir Crimson encounter | Designed / Deferred | Not established as active runtime flow. |
| Consumables and meta-progression | Designed / Deferred | Runtime work remains. |

---

## Current Restart Point

- Hero reward pools are substantially implemented.
- Resume work with card/combat consistency testing, not new gameplay expansion.
- Test displayed card cost versus actual Energy spent.
- Test preview damage/effect values versus actual resolved damage/effects.
- Test status application, timing, decrement, tooltip wording, and cleanup.
- Test Power-card activation, ongoing behavior, and Exhaust/return-after-combat behavior.
- Test enemy intent against the exact enemy action that occurs, including special and boss turns.
- After combat verification, continue mobile combat layout polish, especially the hand, selected-card preview, short phone heights, and browser chrome.
- Do not mark these systems Verified merely because their code exists.

See `DESIGN_DISCREPANCIES.md` before changing disputed rules.

---

## Quick Status Overview

> Historical planning snapshot. Labels such as “Complete,” “Built,” and “In prototype” below predate the status vocabulary above and must not be read as verification. The current high-level status and restart point take precedence.

| Area | Design | Built |
|---|---|---|
| Story & World | ✅ Complete | ✅ In prototype |
| Characters (5) | ✅ Complete | ✅ In prototype |
| Floor & Path System | ✅ Complete | ✅ In prototype |
| Combat System | ✅ Complete | ✅ In prototype |
| Cards — Barbarian | ✅ Complete | ✅ All 24 reward cards coded. Pool updated. |
| Cards — Mage | ✅ Complete | ✅ All 27 reward cards coded. Pool updated. |
| Cards — Thief | ✅ Complete | ✅ All 26 reward cards coded. Pool updated. |
| Cards — Vampire | ✅ Complete | ✅ All 28 reward cards coded. Pool updated. |
| Cards — Gambler | ✅ Complete | ✅ All 26 reward cards coded. Pool updated. |
| Card Upgrades | ✅ Complete | ✅ All upgrades coded for all 5 heroes + shared pool |
| Shared Card Pool | ✅ Complete | ✅ In prototype |
| Enemy Roster (all floors) | ✅ Complete | ✅ In prototype. `GDD.md`'s roster tables were re-synced to `js/data.js` on Aug 16, 2026 (stale-doc correction, no code change) and now match exactly — verified by a script that parses the doc back and diffs it against the live data. |
| Boss Debuff System | ✅ Complete | ✅ In prototype |
| Events | ⚠️ 18 designed, 5 built | ❌ Only 5 generic events exist in `js/data.js`. The "18 Complete" claim below was false — confirmed July 25, 2026. None of the 18 named GDD events match the 5 in code. Building toward all 18 over time is the intent; see Session Log. |
| Economy (Gold/Souls) | ✅ Complete (Gold) / ⚠️ Souls redesigned | ✅ Gold in prototype. Souls redesigned July 25 — see Soul system section below, no longer a permanent currency. |
| King Aldric Final Boss | ✅ Complete | ✅ In prototype |
| Floor Boss Hint System | ✅ Complete | ✅ In prototype |
| Sir Crimson — Story Arc | ✅ Complete | ❌ Not built |
| Sir Crimson — Fight | ✅ Complete (today) | ❌ Not built |
| Relics — Common (10) | ✅ Complete | ✅ Built |
| Relics — Uncommon (10) | ✅ Complete | ✅ Built |
| Relics — Rare (10) | ✅ Complete | ✅ Built (void_compass, bone_key, shattered_mirror deferred) |
| Relics — Character (15) | ✅ Complete | ❌ Not built |
| Relics — True Ending (old 4, floor-reward) | ⚠️ Superseded | ❌ Not built. Replaced July 25, 2026 by the 5 per-hero Challenge relics — see `DESIGN_DISCREPANCIES.md`. |
| Relics — Challenge (5, per-hero) | ✅ Complete (design) | ❌ Not built. Barbarian, Vampire, Mage, Thief, Gambler challenges all designed. |
| Boss Reward Relic Screen | ✅ Complete | ❌ Not built |
| Consumables (10) | ✅ Complete | ❌ Not built |
| Soul In-Run Stat Menu | ✅ Complete | ✅ Implemented (Aug 15, 2026). 8 upgrades, offer 3 of 8 after each Floor 1-3 boss. Replaces the old permanent cross-run Soul tree entirely — see Soul system section below. |
| Core Lore / Challenge-Unlock System | ✅ Complete (design) | ❌ Not built. Cores now have a defined job — see Soul system section below. |
| Magic Door Exclusive Pool | ✅ Complete | ✅ Built |
| Card Rarity / Reward Odds | ✅ Complete | ✅ Built |
| Hand Size Decision | ✅ Complete | ✅ Built (5 draw / 8 cap) |

---

## Story — ✅ Locked

- **Setting:** Castle Ashborne — ancient, alive, feeds on grief. The true villain.
- **King Aldric Ashborne** — once a just ruler. Corrupted by grief after betrayal. Victim, not villain.
- **Sir Crimson** — the knight whose desperate act caused everything. Consumed by the castle.
- **The Soldier** — mystery figure. Referenced in Core fragments. Identity revealed across runs.
- **Castle is the villain.** Aldric is its prisoner.

### The Run
- 5 heroes travel together toward the castle
- Castle captures 4 before they arrive — one per floor, corrupted into boss form
- You play as the 5th hero who made it through
- Beat all 4 corrupted companions → face King Aldric

### Two Endings
- **Normal Ending** — defeat Aldric without holding 4 of the 5 Challenge relics. Castle endures. Cycle continues.
- **True Ending** — hold 4 of the 5 per-hero Challenge relics, trigger at 50 HP in Phase 2/3. Aldric freed. Castle destroyed. Sir Crimson appears in true form.
- *(Redesigned July 25, 2026 — see Soul/Core/Challenge system section below and `DESIGN_DISCREPANCIES.md` for why the old floor-reward relic gate was replaced.)*

---

## Characters — ✅ Locked

| Character | Dice Affinity | HP | Playstyle |
|---|---|---|---|
| Barbarian | Even rolls (2, 4, 6...) | 80 | Heavy attacks, Rage stacking, consistent damage |
| Mage | High rolls (6+) | 70 | Spell scaling, Burn, threshold-based power |
| Thief | Odd rolls (1, 3, 5...) | 72 | Poison chains, card cycling, odd-roll combos |
| Vampire | Extreme rolls (1 or max face) | 78 | Lifesteal, high risk/reward, feast or famine |
| Gambler | d6 specialist (min 2, max = Lucky Streak) | 72 | Dice manipulation, high variance, Gold scaling |

Each card has a weak base mode and a strong dice-affinity mode. No global affinity bonus — each card handles it individually.

---

## Floor & Boss Structure — ✅ Locked

- **4 floors** total
- **3 paths per floor** — shown as icons only, no room preview, commit on pick
- **13–15 rooms per path** (random each run)
- **Mirror mechanic** at 60% of path — forced rest/upgrade/remove choice
- Floor boss is a **corrupted version of one of the 4 captured companions**
- Which companion appears on which floor is **random each run**
- **Affinity hints** appear in rooms near the boss — environmental particles matching the boss's character (e.g. magic vapor for Mage, blood mist for Vampire)

### Floor Themes
| Floor | Theme | Boss |
|---|---|---|
| 1 | Castle Dungeon — entrance, guards, creatures | Corrupted companion (random) |
| 2 | Catacombs — undead, decay, darkness | Corrupted companion (random) |
| 3 | Shadow Realm / Void — corrupted magic | Corrupted companion (random) |
| 4 | Throne Room | King Aldric (fixed) |

### Boss Debuff System (Balatro-inspired)
Each corrupted companion boss has a fixed debuff shown before the fight. Debuffs scale per floor:
- **Floor 1** — disables your dice affinity bonus for the fight
- **Floor 2** — card type costs +1 energy
- **Floor 3** — severe mechanical restriction (block resets, draw reduction, etc.)
- **Floor 4** — brutal restriction per character kit

---

## Sir Crimson — ✅ Fully Locked (designed today)

### Story Arc Across the Run
| Point | What Happens |
|---|---|
| Between Floor 1–2 | Appears as a shadowy presence. One line of dialogue. Watching. No fight. |
| Between Floor 2–3 | Confronts you. **The fight happens here.** |
| After the fight | Castle's grip breaks. He's lucid. Gives True Ending hint. Disappears. |
| True Ending cutscene | Appears freed completely. |

### The Fight
- **Type:** Surprise encounter — no reward room beforehand
- **Difficulty:** Full boss-level
- **HP:** 160 | **Base DMG:** 12

**His Moves (rotation):**
| Move | Effect |
|---|---|
| Crimson Strike | Deal 12 damage |
| Iron Guard | Gain 14 block |
| Shatter Step | Deal 8 damage, remove 8 player block |
| Studied Blow | Deal 15 damage + Weak 2 (telegraphed one turn early) |

**Mimic Move — every 3rd turn:**
| Move | Effect |
|---|---|
| Echo | Pulls a random card from your deck and uses it against you at full effect. Always telegraphed. |

Echo mechanic: block cards give him block, damage cards hit you, status cards apply to you. Larger decks are riskier — rewards tight deck building.

**Post-fight dialogue (True Ending hint):**
*"The king... he didn't choose this. None of us did. The castle took everything from him — his grief was the door it walked through. If you want to free him... find what he lost. Four pieces. You'll know them when you see them."*

⚠️ **Needs revisiting (flagged Aug 15, 2026):** this line was written for the old floor-reward relic framing (4 physical royal artifacts). Under the July 25 redesign, the 4 (of 5) relics are earned by out-dueling corrupted companions under Challenge conditions, not found as objects. The hint's wording ("find what he lost... you'll know them when you see them") may need to shift toward something like "prove yourself against the ones who fell" — not rewritten yet, just flagged.

---

## Cards — ✅ Complete

### Universal Starter Cards (all characters)
- Strike (6 dmg, cost 1) / Strike+ (9 dmg)
- Defend (5 Block, cost 1) / Defend+ (8 Block)

### Per-Character Pools
All 5 characters have full 30-card pools designed including upgrades. Each character starts with 10 cards (2 Strike, 2 Defend, 6 class-specific). Reward pools are per-character — only class-appropriate cards appear as rewards.

**Card upgrade rule:** Every card has exactly one upgrade (base → +). Available at rest stops (free), shops (Gold), events (RNG).

---

---

## Card Build Status — Detailed

### What's in the game right now
Every hero has an implemented starter deck and a substantially populated rarity-bucketed reward pool. Card presence and pool membership have not yet been systematically verified against every GDD entry, upgrade description, preview, or combat effect.

### Card Build Status — Implemented, verification pending
All five heroes have implemented starters, reward cards, and upgrades, along with a shared pool. Missing-GDD-card and pool-completeness conflicts remain documented in `DESIGN_DISCREPANCIES.md`.

### Implementation note
Use targeted search before editing. Card definitions and upgrades are in `js/data.js`; active rarity-bucketed `CHAR_REWARD_POOLS` are in `js/ui.js`. Verify relevant hooks in `js/combat.js` and rendering/previews in `js/ui.js` rather than treating any one file as sufficient.

### Card rarity distribution in reward pools
- Common reward cards — appear most frequently
- Uncommon — appear from Floor 2+
- Rare — appear from Floor 3+ or boss rewards only
*(Exact odds not yet designed — see Open Design Items)*

---

## Relics — Designed; partially implemented and partially verified

### ⚠️ SUPERSEDED — True Ending Relics (4, floor-reward)
| Relic | Effect in Aldric fight |
|---|---|
| The Fractured Crown | Aldric loses all Strength permanently |
| The King's Sword | Aldric's damage halved for the fight |
| The Royal Sigil | Fading Light disabled — stop losing HP each turn |
| The Knight's Vow | Aldric stops attacking entirely. Fight ends without killing blow. |

Replaced July 25, 2026 — floor bosses 1-3 are the only relic sources and floor 4 is Aldric himself, so no run could ever hold all 4. See Soul/Core/Challenge system below and `DESIGN_DISCREPANCIES.md`. Aldric's Phase 3 HP-threshold effects (this table) may still inform how the new Challenge relics manifest in the fight, but the specific relic-to-effect mapping needs redesigning against the new 5-relic (need 4 of 5) pool.

### Challenge Relics (5, per-hero) — earned across runs, not picked mid-run
| Hero | Challenge | Type |
|---|---|---|
| Barbarian | +1 Strength every 2 turns, starting turn 2 | Escalation |
| Vampire | Drains 8 HP from you to heal itself, every 3 turns starting turn 3 | Escalation |
| Mage | May never play a card that draws extra cards | Denial |
| Thief | May never gain any Block | Denial |
| Gambler | May never use a reroll | Denial |

Need 4 of 5 to trigger Aldric Phase 3 / True Ending (never your own chosen hero's, since you can't fight yourself). Unlocked by first beating that hero as a corrupted floor boss (Normal Ending run), then re-attempting the fight under Challenge conditions in a later run.

### Common Relics (10) — Any floor, multiple sources
| Relic | Effect |
|---|---|
| Bloodsoaked Rag | Heal 3 HP after each combat win |
| Iron Vambrace | Start every combat with 6 Block |
| Rusted Chain | Enemies start combat with 1 Vulnerable |
| Phantom Blade | First attack each combat deals +8 damage |
| Ivory Die | Add one d8 to your dice pool |
| Ash Pendant | Gain 1 Soul after every battle |
| Cracked Hourglass | Reroll restored at start of every combat |
| Iron Ration | Heal 5 HP after elite fights |
| Lucky Rabbit Foot | Once per run, survive a killing blow at 1 HP |
| Tarnished Coin | Gain 5 bonus gold after every combat |

### Uncommon Relics (10) — Floor 2+
| Relic | Effect |
|---|---|
| Torn Page | Draw 1 extra card at start of each turn |
| Loaded Gauntlet | Minimum dice roll is always 2 |
| Lucky Coin | Roll affinity number exactly → draw 1 card |
| Bone Dice | Reroll result can never be lower than original |
| Grave Robber | Gain 8 Gold after each elite fight |
| Gilded Quill | Every 10th card played deals double damage |
| Scholar's Lens | See 1 extra card option on every reward screen |
| Bone Key | Every 4th room has a chance to contain a hidden chest |
| Twinned Die | Roll twice, take the higher result |
| Soulbound Tome | Gain 1 Energy when you play 3+ cards in one turn |

### Rare Relics (10) — Floor 3+, mix of pure and trade-off
**Pure upside:**
| Relic | Effect |
|---|---|
| Soulbound Gauntlet | First card each turn costs 0 energy |
| Ashen Crown | Gain 1 extra energy at start of every combat |
| Shattered Mirror | When enemy copies/mirrors you, they take 10 damage |
| Void Compass | After every elite, choose 1 of 3 relics instead of 1 |
| Crimson Phylactery | Survive a killing blow at 1 HP once per run |

**Trade-offs:**
| Relic | Effect | Cost |
|---|---|---|
| Cursed Hourglass | Draw 2 extra cards per turn | Hand limit drops from 5 to 4 |
| Hollow Throne | Start every combat with 20 Block | Lose 8 max HP permanently |
| The Pale Contract | All cards deal +4 damage | Healing is 50% less effective |
| Fractured Die | Roll twice, take higher result | Lose reroll for the rest of the run |
| King's Debt | Gain 60 gold immediately | Every shop costs 25% more all run |

### Character Relics (15 total, 3 per character) — Floor 3+, Boss reward only
*Design philosophy: give each character something they're missing*

**Barbarian** (missing: healing, card draw, odd-roll value)
| Relic | Effect |
|---|---|
| Warlord's Bandage | Heal 4 HP every time you play an Attack on an odd roll |
| Battle Drum | Draw 1 extra card at turn start if last roll was odd |
| Berserker's Scar | Taking damage grants 1 Rage stack |

**Mage** (missing: block, low-roll value, survivability)
| Relic | Effect |
|---|---|
| Stone Grimoire | Gain 4 Block every time you cast a spell, regardless of roll |
| Frost Seal | Low rolls (3 or under) apply Chill 1 to enemy instead of nothing |
| Ley Line Crystal | Once per combat, set your dice roll to 6 |

**Thief** (missing: burst damage, block generation)
| Relic | Effect |
|---|---|
| Assassin's Edge | Every 4th card played in a turn deals double damage |
| Shadow Wrap | Start every combat with 5 Block |
| Venomfang | Poison stacks deal 1 extra damage per tick |

**Vampire** (missing: middle-roll consistency)
| Relic | Effect |
|---|---|
| Crimson Lens | Middle rolls (2–5) count as half-affinity — lifesteal at 50% value |
| Blood Pact | Spending HP to play cards counts as a drain — triggers lifesteal |
| Midnight Hunger | If you didn't hit affinity this turn, next roll gets +2 added |

**Gambler** (missing: damage scaling, non-d6 options)
| Relic | Effect |
|---|---|
| Loaded Coat | Once per combat, swap active die for any die type |
| Devil's Ledger | Every 20 gold spent adds +1 damage this run, cap at +8 |
| The House Always Wins | Roll max 2 turns in a row → next card costs 0. Shows streak tracker. |

### Boss Reward Flow
After each floor boss: choose 1 of 3 relics — 1 Common, 1 Rare, 1 Character-specific.

---

## Enemies — ✅ Complete

Full roster across all 4 floors designed. Mix of classic fantasy and corrupted castle aesthetics. Floor 1 enemies are exclusive; some mid-tier enemies carry into Floor 2. Each enemy has HP, damage, and one special ability.

---

## Events — ⚠️ 18 designed, only 5 built (corrected July 25, 2026)

Categories: Gold events, HP-for-Gold trades, Curse card rewards, Risk events, Classic reworked.

**Correction:** this section previously read "✅ Complete (18 events) — all implemented in prototype." That was false — confirmed by direct code inspection: only **5 generic events** exist in `js/data.js`, and none of them match the 18 named events actually designed in `GDD.md`. This was a design-only gap, not a migration loss — the legacy monolith `castle-run.html` never had the 18 events either.

Building toward all 18 over time is the intent (larger pool keeps outcomes unpredictable; comeback tools should exist by chance, not by the system detecting player struggle). The `bone_key` relic is paused (removed from shop/reward pools, definition preserved) because it depends on "The Locked Chest" event, which doesn't exist yet — see `DESIGN_DISCREPANCIES.md`.

---

## Economy — ✅ Design Complete, ✅ Built

**Two currencies:**
- 🪙 **Gold** — in-run only, starts at 30, resets each run
- 💀 **Souls** — permanent, earned every battle, spent on meta-progression

**Gold income:** 12–40 per regular battle (scales per floor), 40–90 elites, 80 per boss
**Gold sinks:** Shop items 50–120 Gold, card removal 75–100, relics 80–150

---

## Consumables — ✅ Design Complete, ❌ Not Built

10 consumables. Carry up to 3 at a time. Found in shops, events, magic doors, chests.

| Item | Effect | Floor |
|---|---|---|
| Health Potion | Heal 20 HP | Any |
| Smoke Vial | Apply Weak to enemy 2 turns | Any |
| Fire Flask | Apply 4 Burn | Any |
| Poison Vial | Apply 5 Poison | Any |
| Energy Crystal | Gain 2 Energy this turn | Floor 2+ |
| Scroll of Draw | Draw 3 cards immediately | Any |
| Dice Stabilizer | Lock die at current result for 2 turns | Floor 2+ |
| Gold Pouch | Gain 40 gold | Any |
| Block Stone | Gain 15 Block immediately | Any |
| Chaos Potion | Random status on enemy | Floor 3+ |

---

## Soul / Core / Challenge System — ✅ Redesigned July 25, 2026; Souls Implemented Aug 15, 2026, Cores/Challenges ❌ Not Built

This entire section replaces the old permanent cross-run Soul meta-progression tree below it (kept struck-through for history — see `DESIGN_DISCREPANCIES.md` for the full resolution).

**Souls (redesigned — now in-run only):**
- Earned per floor, no longer a permanent cross-run currency.
- Spent at a stat-upgrade screen that appears right after each floor boss's relic-reward pick (Floors 1-3 only).
- Carries forward to the next floor checkpoint if saved; resets to 0 at the start of every run.
- No cross-run banking — this replaces the old Power/Knowledge/Fortune branches entirely.

**Soul-spend menu — ✅ Finalized August 15, 2026, ✅ Implemented August 15, 2026:** 8 options, offer 3 at random per spend window. Built around tradeoffs (stronger effects cost more or carry a downside) with two dice-native options rather than pure stat boosts throughout.

| Upgrade | Effect | Cost | Repeatable? |
|---|---|---|---|
| Vitality | +6 Max HP, heals to new max | 3 Souls (rises +1 each rebuy) | Yes |
| Grit | +5 Block at the start of every combat, rest of the run | 5 Souls | No |
| Steady Hand | +1 reroll charge per combat, rest of the run | 6 Souls | No |
| Second Die | Once per combat: after your roll, optionally add a d2 to it | 6 Souls | No |
| Momentum | +1 Energy per turn, rest of the run | 8 Souls | No |
| Overdraw | Draw +1 card at turn start, rest of the run | 8 Souls | No |
| Reckless Surge | +1 Energy per turn, rest of the run — but −5 Max HP permanently this run | 4 Souls | No |
| Gambler's Edge | Once per combat, force your die to any value — but die can never roll its own affinity max on a natural roll for the rest of the run | 6 Souls | No |

Soul income per floor: 1 (regular win), 2 (elite), 3 (boss — triggers the spend screen), +1 per battle if Ash Pendant is held.

Cut during design: **True Roll** (min-roll floor — conflicted with Mage's Frost Seal, Gambler's low-roll cards, and Thief's odd affinity all caring about natural 1s) and **Twinned Roll** (roll twice, sum or take higher — trivialized Mage's high-roll threshold, dead for Vampire's exact-value check, and overlapped with the existing Twinned Die/Fractured Die relics). Second Die replaced them — bounded, optional, ~50% parity-flip odds instead of a guarantee. Full reasoning in `GDD.md` §15.

**Cores (redesigned — now have a defined job):**
- Beating a corrupted companion for the first time drops their Core.
- This reveals their lore in the menu/hero-select AND unlocks that hero's Challenge details simultaneously.
- Cores are not spent or consumed — they're a permanent lore/unlock record, viewable anytime.

**Challenges (new system):**
- See the Challenge Relics table above for all 5 designed challenges.
- A Challenge is only attemptable once its Core has been collected (i.e., you've beaten that hero once as a corrupted boss).
- Clearing a Challenge fight earns that hero's True Ending relic.

✅ Resolved Aug 15, 2026: costs/numbers finalized and built; the spend screen reuses the shared reward screen and fires after the floor boss's card reward. Souls income is now flat per fight type (1/2/3, +1 Ash Pendant) — the per-enemy `souls` values still sitting in `js/data.js` belong to the superseded permanent-Soul design and are no longer read.

⚠️ Still open: the boss relic-choice screen (1 of 3) is still unbuilt, so the Soul screen currently follows the boss **card** reward. When the relic screen lands it belongs between the two, leaving the Soul screen last as designed.

---

### ⚠️ SUPERSEDED — old permanent Soul Meta-Progression Tree

3 branches. Shared across all characters. **Replaced entirely July 25, 2026 by the in-run system above — kept here for history only, do not implement.**

**Power Branch**
- Start each run with +5 max HP (2 Souls)
- Start each run with +1 Energy on turn 1 (3 Souls)
- Starter deck includes 1 additional class card (4 Souls)

**Knowledge Branch**
- See room types 1 room ahead on path (2 Souls)
- Shop shows 1 extra item per visit (3 Souls)
- Card rewards show 4 options instead of 3 (5 Souls)

**Fortune Branch**
- Start each run with 30 bonus gold (2 Souls)
- Elite fights drop 1 consumable in addition to normal reward (3 Souls)
- Once per run, reroll a relic choice for free (4 Souls)

---

## King Aldric Final Boss — Designed and implemented; verification incomplete

3 phases. Stone Heart mechanic. Dice corruption in Phase 2. Phase 3 (and the True Ending trigger at 50 HP) only fires if 4 of 5 Challenge relics are held — redesigned July 25, 2026, see Soul/Core/Challenge System section above.

---

## Open Design Items — ❌ Still Needed

| Item | Priority | Notes |
|---|---|---|
| Soul in-run stat menu | Done | ✅ Design finalized Aug 15, 2026 and ✅ Implemented the same day — see Soul/Core/Challenge section. |
| 13 remaining events (of 18 designed) | Medium | Only 5 generic events exist in code; corrected July 25, 2026 — see Events section. |
| Magic Door exclusive event pool | Low | Currently pulls from normal room pool |
| Card rarity system (Common/Uncommon/Rare reward odds) | Low | Can tune late |

---

## Open Build Items — ❌ Not Yet Implemented

| Item | Notes |
|---|---|
| Sir Crimson encounter | Full fight + dialogue + story beats between floors. Post-fight dialogue needs a rewrite pass — flagged above, written for the old relic framing. |
| Boss reward relic choice screen | Pick 1 of 3 after each floor boss |
| Consumable system | Carry/use from inventory during combat |
| ~~Soul in-run stat-upgrade screen~~ | ✅ Implemented Aug 15, 2026 — `SOUL_UPGRADES` (js/data.js), `buySoulUpgrade`/`soulUpgradeOffer`/`soulUpgradeCost` (js/game.js), `showSoulSpend` (js/ui.js), combat hooks (js/combat.js). Headless-tested; in-app device/browser verification still outstanding. |
| Challenge-mode fight logic | Detect a Challenge attempt (chosen hero ≠ boss hero, Core already unlocked) and enforce the Challenge's constraint for that fight |
| Core-drop "first time" gating | Core-drop logic needs to check first-time-beating-this-companion, not just Core-drop-happened, to gate lore + Challenge-unlock correctly |
| 13 remaining events | Build out the 18-event pool designed in GDD.md; only 5 generic events currently exist |
| Enemy intent consistency testing | Intent logic received April 16 improvements; verify displayed intent against actual actions before recording a Known issue. |
| Mobile UI polish | April 16 responsive, dice, preview, and overlap work landed; continue short-height and browser-chrome verification. |

---

## Session Log

| Date | Work Done |
|---|---|
| Early 2026 | Game concept locked. 5 characters, 4 floors, corrupted companions as bosses. Dice affinity system. Two currencies. |
| Early 2026 | Full card pools for all 5 characters (30 cards each including upgrades). |
| Early 2026 | Enemy roster all 4 floors. Boss debuff system. 18 events. Economy. Consumables. |
| Early 2026 | King Aldric 3-phase fight. True Ending relic system. Two endings locked. |
| Early 2026 | GDD v0.5 → v0.7. Floor hint system. Sir Crimson story arc early design. |
| April 2026 | Sir Crimson full arc locked. Rare relics (10) + Character relics (15) designed. PROGRESS.md created. All 5 hero card pools coded (Barbarian 24, Mage 27, Thief 26, Vampire 28, Gambler 26). All upgrade versions coded for all 5 heroes. Reward pool fix — now shows full card variety. Status display system overhauled — Rage/Weak/Vulnerable/Chill all update card preview numbers with color coding. Status tooltip system added — tap icon to see description. Exhaust pile viewer added to deck overlay. Exhaust cards return to deck after combat. Burn changed to stacks × 1 (matching Poison). Burn/Poison timing split — Burn before enemy acts, Poison after. Chill only ticks on attack turns. Cold Mastery correctly reduces Chill percentage. Entrench block carry fixed. Energy display changed to single number. Time Warp redesigned as draw-focused card. rollDice() updated with full Gambler mechanics. Vulnerable per-turn tick (not per-hit). Card Rarity System — CHAR_REWARD_POOLS restructured into common/uncommon/rare buckets for all 5 characters. Shared cards distributed correctly. curseddice removed. Pity timer added (G.rareOffset, caps at 35%). Elite rewards use separate odds 55/35/10. Scholar's Lens shows 4 reward options. Relic System — Full RELICS object built with 30 relics. hasRelic() helper added. All common and most uncommon/rare hooks wired into combat. healPlayer() routes all healing for pale_contract. shopCost() applies King's Debt multiplier. Deferred: bone_key, shattered_mirror, void_compass. Shop Overhaul — Relics section (2 relics, floor-gated by rarity). Die section (1 die, 80 gold). Card removal service (75 gold). Upgrade Card moved to rest stop only. Die Progression — Die removed from reward screen. Dice now from shop, Magic Door (25% chance, floor-gated), and events only. File Split — castle-run.html split into index.html + css/styles.css + js/data.js + js/combat.js + js/ui.js + js/game.js + js/main.js. GitHub Pages confirmed working. Mobile confirmed playable. |
| April 16, 2026 | Split-build follow-up: mobile selected-card preview fixes; deferred re-render so previews reflect status changes; intent overlap and enemy-intent presentation improvements; boss-intro scrolling and card-lift fixes; dice contrast and compact mobile dice controls; extensive responsive landscape layout, hand spacing, sprite sizing, and short-phone-height work. These changes are Implemented and require continued device/browser verification. |
| July 25, 2026 | Design-only session, nothing implemented. Full redesign of the True Ending / Souls / Cores system after discovering the old floor-reward relic gate was structurally impossible (floors 1-3 are the only relic sources, floor 4 is Aldric — no run could ever hold all 4). New system: 5 per-hero Challenge relics (need 4 of 5, never your own), Cores repurposed as lore + Challenge-unlock triggers, Souls converted from a permanent cross-run tree to an in-run resource spent at a per-floor stat-upgrade screen. All 5 Challenges fully designed (Barbarian, Vampire, Mage, Thief, Gambler). Also resolved this session: confirmed only 5 of the 18 designed events exist in code (PROGRESS.md's old "18 Complete" claim was false); fixed a live `lastFightWasElite` stale-flag bug causing `iron_ration`/`grave_robber` to misfire after boss fights following an elite; corrected the Normal Ending castle-outcome and two stale Hand Size Decision entries; fixed an inaccurate Burn tooltip. |
| August 15, 2026 | Doc sync only, nothing implemented. Propagated the July 25 redesign into `DESIGN_DISCREPANCIES.md`, `PROGRESS.md` (this file), and flagged the affected sections of `GDD.md` for the same treatment. Old True Ending Relics (4, floor-reward), permanent Soul tree, and "Events 18 Complete" all marked superseded/corrected rather than deleted, for history. Later same day: finalized the Soul-spend menu — 8 options (Vitality, Grit, Steady Hand, Second Die, Momentum, Overdraw, Reckless Surge, Gambler's Edge), offer 3 at random per spend window, built around explicit tradeoffs rather than pure stat boosts. Two options considered and cut during design: True Roll (min-roll floor — conflicted with Mage/Gambler/Thief all caring about natural 1s) and Twinned Roll (roll-twice-and-sum — broke Mage's and Vampire's affinity checks in opposite directions, overlapped with existing Twinned Die/Fractured Die relics). Second Die (optional +d2, ~50% parity-flip odds) replaced them. Design-only — Soul-spend screen UI/logic not yet built. |
| August 16, 2026 (bug fix — shop card tiles) | **Shop card-purchase tiles now show real card detail; "Sharp Card" mislabel fixed.** Three of the four top-row tiles showed a generic "Add X to deck" line instead of card info, and one was titled "Sharp Card" while its body advertised Blizzard. **Diagnosis: neither a per-slot generic heading nor a mismatched card lookup — there was no card lookup at all.** Each `SHOP_ITEMS` entry hardcoded its own `name`/`emoji`/`desc` strings, with the actual card key buried inside its `effect` closure, so the title and body were two independent literals and one had gone stale ("Sharp Card" was a leftover label; the card sold is `blizzard`, real name **Blizzard**). The emoji was wrong too — 🗡️ on the tile versus the card's own 🌨️. Fixed by making card stock data-driven: the three entries now declare only `{ card:'<key>', cost }`, and `showShop()` reads name, emoji, type, rarity, Energy cost and effect text live from `CARDS`, so a tile can no longer disagree with what it sells. The rarity lookup that `showReward()` had inline was extracted to a shared `getCardRarity()` used by both screens — with a fallback across all hero pools, since the shop can sell a card outside the current hero's pool (Blizzard is a Mage card any hero can buy) and the hero-scoped rule alone would have mislabelled it. Purchase now uses the same grant the reward screen performs. Result: Blizzard "Attack · Common · ⚡2 — Deal 5 dmg to enemy 3 times", Life Leech "Attack · Common · ⚡2 — Deal 9 dmg. Extreme: drain 12 Block", Iron Wall "Skill · Uncommon · ⚡2 — Gain 14 Block". **Scope confirmed:** Hunter Die and Healing Potion keep their original `name`/`desc`/`effect` shape and rendering path untouched (both re-verified working), and the Dice, Relic and card-removal sections were not modified. Swept the full shop rendering code for other uses of the generic pattern — there were none; the only remaining "added to deck" string is a `showMsg` toast, not a tile. One new CSS class (`.shop-item-type`) mirrors `.reward-card-type`. Verified by a 35-assertion test rendering the shop 70+ times across heroes: every card tile shows real name/type/rarity/Energy/effect, title and body agree, no placeholder survives, buying grants exactly the declared key, and non-card stock still functions. **Implemented** — in-app visual check of the tile layout still recommended. |
| August 16, 2026 (doc rule — no code change) | **DoT-kills-bypass-HP-triggers promoted from implicit step-ordering consequence to a stated `GDD.md` rule. Ordering deliberately unchanged.** Written into §5 Status Effects with a cross-reference in the AI Development Guidelines' Status Timing Rules, since it silently governs every `trigger:'hp'` ability rather than just Undying. Scope was established by inspection and test, not assumed: **exactly four abilities are affected** — Reassemble (Skeleton), Undying (Cursed Knight), Dark Blessing (Corrupted Priest), Undying+ (Cursed Knight+) — and **all four are self-preservation effects; none damage the player**, so the rule is uniformly a player advantage that can never let the player dodge a punish. Two precisions the rule needed and now states: the bypass is **lethal-only** (a Skeleton dropped 12 → 7 by Burn still Reassembles to 15 that turn; a Corrupted Priest pushed below its 50% line by Poison still heals), and **card killing blows always trigger normally**, making DoT the sole route around these abilities. **On the Bone Golem / Collapse question specifically: no such interaction exists.** Collapse belongs to **Void Colossus** (Floor 4 elite) with `trigger:'attack'`; Bone Golem's live ability is Bone Wall (`trigger:'skill'`). The "Bone Golem: Collapse, deals 20 damage when broken below 50% HP" pairing existed only in the pre-sync GDD roster removed in the row below, never in code — so there is no free pass on Collapse damage via poison/burn. Killing an enemy before it attacks denies Collapse regardless of damage type, which is ordinary racing. Flagged for the future: if an HP-threshold ability that harms the player is ever added, this rule stops being harmless and needs revisiting — noted in both the GDD text and `DESIGN_DISCREPANCIES.md`. Verified by a 10-assertion test covering the lethal/non-lethal boundary, card-vs-DoT contrast, and a scan confirming no hp-triggered special damages the player. |
| August 16, 2026 (doc sync — no code change) | **`GDD.md` enemy roster re-synced to `js/data.js`. This was a stale-doc correction, NOT a rebalance — no enemy stat, ability or pool assignment was changed in code.** Follow-up to the investigation in the row below. All four floors were rewritten wholesale rather than patched row by row, because the drift touched nearly every entry: **Floor 1 and Floor 4 turned out to be just as stale as Floors 2-3** (Floor 1's documented Armored Guard / Dungeon Hound / Cursed Statue / Skeleton Archer and Floor 4's Royal Guard / Corrupted Paladin / Shadow Demon / Castle Shade exist nowhere in code, and every elite pair differed), so Floor 4 was included despite the original request naming only 1-3 — leaving it stale would have left the doc self-contradictory, since Cursed Knight+ and its Undying+ ability live there and are directly tied to the Undying wording being corrected. As directed: Cursed Knight stays on Floor 2 with Undying; Skeleton Warrior and Hexed Blade are removed as confirmed dropped; Undying's revive is corrected from "at 1 HP" to **15 HP** (and Undying+ documented as twice at 20 HP). 19 phantom enemies and 6 phantom abilities that never existed in the shipped build are gone from the doc. A **Block** column was added since several code enemies carry non-zero Block (Cursed Knight 8, Armored Knight 12, Death Knight 5, Cursed Knight+ 8) that the doc never recorded, and the elite-to-floor pairing is now stated explicitly (`startCombat()`'s `floorEliteMap`). Checked first that none of the 19 removed names were referenced anywhere else in `GDD.md` — they were confined to the roster section. Tables were generated from `js/data.js` rather than transcribed, then **verified by a script that parses the rewritten doc back out and diffs every name, HP, Block, damage, ability name and ability description against the live data — 0 mismatches**. One deliberate deviation: the Void Colossus row mirrors the code's ability text verbatim, with the `bypassBlock` detail moved to a footnote so the table stays a faithful mirror. The `DESIGN_DISCREPANCIES.md` roster entry is updated from OPEN to RESOLVED. |
| August 16, 2026 (investigation — no code change) | **Floor 2 "Cursed Knight" identity mismatch investigated: doc-sync issue, not a code bug. Undying's once-per-combat cadence confirmed correct.** A player reported a Floor 2 enemy (Cursed Knight, 75 HP, 13 dmg, Undying) matching no single `GDD.md` entry. Checked the data before assuming a side was wrong: `js/data.js` `FLOOR_ENEMIES[2]` defines exactly that enemy, with name, HP, damage and ability all from one coherent definition — nothing mis-wired, and the player fought precisely what the code specifies. The drift is doc-vs-code and far wider than one enemy: the GDD's Floor 2 and Floor 3 rosters barely overlap with the code's, `Skeleton Warrior` and `Hexed Blade` do not exist in code at all, the GDD's Cursed Knight is a Floor 3 standard (58 HP, Hexed Blade) rather than a Floor 3 *elite* as the report assumed, and even the one shared name (Bone Archer) has different stats and a different ability on each side. Recorded as an OPEN entry in `DESIGN_DISCREPANCIES.md` rather than reconciled, because the direction is ambiguous — the Floor 2 Cursed Knight / Floor 4 Cursed Knight+ pairing looks like a deliberate rebalance, so rewriting ~20 GDD roster rows needs confirmation first. **Undying: Verified.** Gated on a per-instance `_revived` flag; observed 1st killing blow → revives at 15 HP with the fight continuing, 2nd → dies for real and the win resolves, 3rd/4th → stays dead; flag survives turn boundaries and does not leak into the next combat; Cursed Knight+ allows exactly two revives at 20 HP each. Note the GDD says Undying revives "at 1 HP" while code uses 15 HP. **Sub-finding, not fixed:** Burn/Poison killing blows bypass Undying entirely — DoT subtracts HP in `endTurn()` STEPS 1/7 and `checkCombatEnd()` runs at STEPS 4/8, before STEP 9's `hp` trigger, so the enemy dies with `_revived` never set. Same ordering skips any `trigger:'hp'` special. Logged for a design call. No runtime code was changed in this session entry. |
| August 15, 2026 (bug fix — Aldric debuffs) | **Aldric's damage now routes through the shared `enemyAttackDamage()` helper, so Rage / Weak / Chill apply to him like any other enemy.** Closes the OPEN item raised by the status-cadence verification in the row below. Every phase previously called `resolveEnemyAttack()` with a hardcoded number (15 / 8×3 / 20 / 15), bypassing the shared modifier path — yet `endTurn()` STEP 6b still drained a Weak stack per Aldric turn, so the player watched Weak tick down against the final boss while it did nothing. The correctness argument, not the balance one, decided it: visible stacks that do nothing are the game lying to the player. Checked `GDD.md`'s Aldric section first — nothing there assumes independent damage calculation, and the one intentional immunity (Phase 3 "Unbreakable") is expressed by clearing `G.statuses.enemy`, which is preserved. A new `aldricAttackProfile(g)` supplies each phase's base damage and hit count and is shared by `processAldricTurn()` and `updateIntent()`, so his intent cannot drift from the volley he throws — the same unification applied to regular enemies earlier this session; the phase-2 preview now also advertises the 3-hit volley as "×3", which it never did. Measured before → after: **Phase 1** 15 → 11 with Weak, 21 with Rage 6, 15 with Rage 6 + Weak; **Phase 2** per-hit 8 → 6 with Weak, Poison/Burn amplification preserved (8 → 12), and a 3-hit volley consumes **one** Chill stack rather than three (matching the multi-hit rule established for Weak); **Phase 3** no-relics still a flat 20 through Weak+Chill with statuses wiped as before, relic branch 15 → 11 with Weak. Player Vulnerable still amplifies him (15 → 22) and composes correctly with Weak (→ 16). Verified by headless test (30 assertions, stable across 3 runs) including phase-mechanic guards: Stone Heart still restores block, Grieving Ground still adds its curse, phase-2 boss dice still rolls, and the phase-3 relic trigger still fires at the 50 HP threshold and skips that turn's attack. **Noted, not changed:** the Sword relic trigger halves `G.enemy.damage`, but the phase-3 relic branch has always used an explicit 15 and never read it — dead code belonging to the superseded True Ending relic system; and `GDD.md` says Fractured Strike "doubles" with Poison/Burn while the code uses ×1.5. Both recorded in `DESIGN_DISCREPANCIES.md`. **Verified.** |
| August 15, 2026 (verification — status cadences) | **Chill's attack-conditional tick confirmed correct — no behaviour change needed.** Verification task, not a bug report, and the verification came back clean: Chill has exactly one decrement site (`enemyAttackDamage(g, consumeChill)`, with `consumeChill` true only on `endTurn()` STEP 6's attack branch). Observed across 15 assertions: 3 stacks unchanged over 4 consecutive defend turns (`3 → 3 → 3 → 3 → 3`), intact after 20 defend turns, and exactly 3 stacks consumed by an interleaved 7-turn run containing 3 attacks; the attack that consumes a stack is correctly reduced 25%; intent previews do not consume stacks. **Weak and Vulnerable confirmed to use the different, plain per-turn cadence — as the GDD specifies and as expected, not a bug:** on defend turns, enemy Weak `4 → 3 → 2 → 1`, player Vulnerable `4 → 3 → 2 → 1`, player Weak `3 → 2 → 1`. Chill is the only action-conditional status in the game. **One real inconsistency found and fixed:** the in-game Chill tooltip claimed "Ticks down each turn," contradicting both the GDD and the verified behaviour — corrected to "Ticks down only when the enemy attacks." Text only; no combat code touched. Two adjacent findings recorded as OPEN design questions in `DESIGN_DISCREPANCIES.md` rather than changed: (1) damaging enemy *specials* neither consume Chill nor have their damage reduced by it (only the basic attack action counts), making Chill weak against special-heavy enemies; (2) Aldric bypasses `enemyAttackDamage()` entirely, so Rage/Weak/Chill never modify his damage — yet enemy Weak still drains a stack per Aldric turn while doing nothing. **Verified** (Chill/Weak/Vulnerable cadences); tooltip fix is Implemented pending an in-app read. |
| August 15, 2026 (bug fix — player Vulnerable) | **Player Vulnerable wired up — closes the Weak/Vulnerable migration gap opened in the split-build history.** The exact mirror of the enemy-Weak defect fixed in the row below: Cursed Hound's rabid bite applies Vulnerable to the player, but nothing read it, so it neither increased damage taken nor decayed — it stuck forever doing nothing. Confirmed scope first: exactly one source in the entire game (`js/data.js`, Cursed Hound's `trigger:'attack'` special) and zero reads anywhere in the combat loop. **Historical record:** `git log -S` shows both halves of this pair were lost in the *same* migration — commit `90c74a0` carried a `getModifiedIncomingDamage()` helper that read player Vulnerable and Fly, and it did not survive the re-split in `bb85760` ("Re-split castle-run.html into separate CSS and JS files"), the same commit family that dropped the enemy-Weak branch. So this was one migration loss with two symptoms, now both closed. Fixed via `applyPlayerVulnerable()` in `js/combat.js`, applied inside the shared `resolveEnemyAttack()` pipeline so it covers basic attacks, enemy specials and Aldric — the same breadth enemy Vulnerable gets from `calculatePlayerAttackDamage()` — and ticked in **STEP 6b**. **Timing was re-derived, not assumed:** STEP 2b (where player Weak lives) would be wrong, because player Vulnerable modifies the enemy's STEP 6 attack, so ticking it earlier would strip a 1-stack application before the attack it amplifies. STEP 9's attack-trigger specials run after the tick, so Cursed Hound's fresh stack correctly survives to hit the following turn. **Multiplier ×1.5, matching the one rule the game states in both places it is defined** (GDD.md's status table "takes 50% more damage" and the shared in-game tooltip) and the live enemy-side convention; the lost helper's ×1.25 already disagreed with the GDD, so it was not restored — flagged in `DESIGN_DISCREPANCIES.md` in case that asymmetry was once deliberate. `updateIntent()` now composes both helpers, so the previewed number includes Vulnerable and cannot drift from the landed hit the way Rage did. Verified by headless test (40 assertions, stable across 5 consecutive runs): stacks `5 → 4 → 3 → 2 → 1` then removed at 0; a 20-damage hit lands for 30 while Vulnerable and returns to 20 on expiry; Vulnerable 1 amplifies the very next attack then expires; the Cursed Hound sequence deals 10 then 15; intent equals damage dealt across six status combinations (Vuln, +enemy Weak, +Rage, +Chill, +Rage+Weak, +player Weak); enemy specials are amplified too; Block absorbs the amplified hit correctly; and an unafflicted hit is unchanged. One flaky assertion surfaced and was fixed in the harness, not the game — `endTurn()` randomizes the next intent (65% attack), so any damage measured after a prior turn read 0 on a defend turn; measured turns now force `intent='attack'`. **Verified.** |
| August 15, 2026 (bug fix — enemy Weak) | **Enemy Weak fixed: it never ticked down AND never did anything. Reported as a regression from this session — it is not; it predates the session and was proven so.** Evidence: this session's `git diff` of `js/combat.js` touches no line of `endTurn()`, and re-running the repro against `git show HEAD:js/combat.js` (the committed code, before any session work) reproduces it exactly — stacks `6 → 6 → 6 → 6 → 6 → 6` and a Weak-6 enemy still hitting for its full 20. **The previously-resolved "Weak timing" fix in `DESIGN_DISCREPANCIES.md` also did not regress** — STEP 2b is present, correct, and running; it only ever decremented *player* Weak, and `calculatePlayerAttackDamage()` still correctly refrains from decaying the stack (a 3-hit card consumes exactly 1 stack at end of turn, re-verified). The real defect is that **enemy** Weak was read nowhere in the combat loop: 12 card effects apply it (Skull Crack, Iron Roar, War Call, Cheap Shot, Cripple, Bluff + upgrades), and nothing consumed it or applied its 25% reduction, so it stuck at its peak forever as a purely cosmetic status while the player spent cards on a no-op. `git log -S` shows the enemy-side Weak branch existed in commit `90c74a0`'s damage helper and was lost when the monolith was split into `js/*.js` — a migration gap, not a recent break. Fixed by extracting `enemyAttackDamage(g, consumeChill)` as the single source of truth for a basic enemy attack (Rage, then Weak ×0.75, then Chill), used by both `endTurn()` STEP 6 and `updateIntent()` so displayed intent and resolved damage cannot drift; and by adding **STEP 6b**, which ticks enemy Weak *after* the enemy acts. The placement is deliberate and not symmetric with player Weak: player Weak reduces the player's own attacks (already resolved by then, so STEP 2b is right), whereas enemy Weak reduces the enemy's STEP 6 attack — ticking it in STEP 2b would strip a Weak 1 before the very attack it was played to weaken. **Also fixed in passing:** `updateIntent()` previously read raw `e.damage` and applied only Chill, so it understated incoming damage whenever the enemy had Rage; intent now matches the landed hit in all six tested combinations. Verified by headless test (22 assertions) with before/after stack trails — enemy Weak `6 → 5 → 4 → 3 → 2 → 1` then removed at 0; a 20-damage enemy hits for 15 under Weak; Weak 1 still weakens the next attack then expires; intent equals damage dealt for plain / Weak / Rage / Rage+Weak / Chill / Weak+Chill; previewing the intent does not consume a Chill stack; player Weak, enemy Vulnerable, and the multi-hit no-drain rule all unchanged. **Still open, deliberately not changed — same defect, mirror image:** player Vulnerable (applied by Cursed Hound's rabid bite) is likewise never read — it neither increases damage taken nor decays. Making it live would raise difficulty, so it is a design call, not a correction. **Verified.** |
| August 15, 2026 (bug fix — rejection refunds) | **Loaded Die and Death Rattle rejection refunds fixed — same defect class as the Backstab Energy-refund bug in the row below, not a new one.** All of these cards refund your Energy when their hard gate rejects the play, but each refunded a *hardcoded printed cost* rather than the cost actually paid: `g.energy += 1` (Loaded Die / Loaded Die+) and `g.energy += 2` (Death Rattle / Death Rattle+), exactly as Backstab did with its `+= 1`. Whenever the printed and paid costs differ — Shadow Artist making the 2nd/4th card of a turn free, or Mana Surge discounting it — a rejected play returned more Energy than it consumed, minting Energy on demand. All four sites now call the same `refundCardCost()` helper added with the Backstab fix, which returns `G._lastCardCostPaid`. Six rejection paths in `js/data.js` now share one refund path and zero hardcoded amounts remain (Time Warp's `g.energy +=` is a genuine card effect, not a refund, and was left alone). Verified by headless test (48 assertions in the play-condition suite): every gated card is Energy-neutral on rejection both at full cost and while Shadow Artist makes it free. Test sensitivity was confirmed by re-installing the pre-fix effects and re-running the same scenario — the old code mints +1 (Loaded Die) and +2 (Death Rattle), so the assertions genuinely detect the defect rather than passing vacuously. **Still open, deliberately not changed:** Void Channel and Arcane Boost reject with no refund at all, so a blocked play there costs full Energy for nothing. That is a different question from refunding the wrong *amount* — adding a refund where none existed is a design call, not a correction, so it is flagged rather than fixed. **Verified.** |
| August 15, 2026 (UI) | **Unplayable-condition indicator in hand — additive UI, no play logic touched.** Cards with a hard play gate now dim and show a red border plus a "⚠ <reason>" line while their condition is unmet, instead of looking identical to a playable card until the player wastes the play on a rejection. Built generally, not just for Backstab: `CARD_PLAY_CONDITIONS` in `js/data.js` declares each gate as `{ met(g), reason }`, keyed by BASE card key so `+` upgrades inherit it and future cards get the treatment by adding one line. `getCardBlockReason()` resolves it; `renderHand()` applies a `.condition-unmet` class, the reason label, and a `title` tooltip for desktop hover, and swaps the mobile preview's hint slot to the reason (the compressed tile hides its text, so that is where a phone player reads it). **Scope sweep found 5 gated families, not 1** — Backstab (first card only), Death Rattle (below 50% HP), Loaded Die (die already set this turn), Void Channel (needs 2 other cards in hand), Arcane Boost (needs another card to discard) — 10 card entries with upgrades. Roll-conditional bonus branches were deliberately excluded; they always resolve and the dynamic preview already covers them. The indicator is a **warning, not a block**: the card keeps its click handler and `effect()` still delivers the real rejection, so no new invariant. Distinct from the existing `.unplayable` (cannot afford) state, which dims harder and removes the handler. Hand-side checks are off by one from their effect-side twins — the card is still in hand when they run — so `wouldBeFirstCardThisTurn()` was added alongside the verified `isFirstCardThisTurn()` rather than modifying it, and the pairing is documented in both files plus `CLAUDE.md`'s card checklist (new item 7). Verified by headless test (36 assertions), the central one being that the indicator agrees with reality: for all 10 gated cards, in both states, "flagged" matches "actually rejected on play". Also verified: Backstab clear at turn start → flagged the instant another card is played → clear again next turn, across turns 2-5; no false positives across the entire `CARDS` pool; Void Channel / Arcane Boost count the card itself correctly; Void Channel discard mode rendering untouched. **Mobile:** the label is `display:none` on `.mobile-compressed` tiles (registered in the existing compressed rules, no new breakpoints), so compressed-tile layout is structurally unchanged — but this is a structural guarantee, not a device check; short landscape heights still want an eyes-on pass. **Implemented** (not Verified — no in-app render yet). |
| August 15, 2026 (bug fix — Backstab) | **Backstab's "first card this turn" check fixed. Pre-existing, and a DIFFERENT failure class from the July 23 stale-flag bugs (House Edge / Gambler's Fallacy) despite looking like one.** Reported as a stale per-turn flag; it is not. `G._cardsPlayedThisTurn` resets correctly in `startTurn()` — measured 0 at the start of turns 1-4 and at combat start. The actual cause is ordering inside `playCard()`: the counter is incremented (`js/combat.js`, before the Gilded Quill / Soulbound Tome / Lethal Rhythm hooks) but `card.effect()` does not run until ~40 lines later, so **by the time any effect executes the counter already includes its own card**. Backstab checked `(g._cardsPlayedThisTurn||0) > 0`, which is therefore always true — it rejected itself on every turn of every fight and has never once dealt damage. Measured before the fix: 0 damage on turns 2, 3 and 4 played as the literal first card, both base and `+`. Fixed with an `isFirstCardThisTurn(g)` helper in `js/combat.js` that encapsulates the off-by-one, used by both Backstab versions, with a comment directing future "first card" effects to it rather than to the raw counter. **Second defect in the same effect**: the rejection path refunded a hardcoded `g.energy += 1` (the printed cost) rather than the cost actually paid — with Shadow Artist making the 2nd card free, playing Backstab out of position as card 2 cost 0 and refunded 1, minting Energy (reproduced: 3 → 4). `playCard()` now records `G._lastCardCostPaid` and a `refundCardCost()` helper returns exactly that. **Cross-checked every other card-position effect for the same hazard — all clean, and now covered by tests across turns 2-4**: Shadow Artist base (2nd & 4th card free — reads the counter *before* the increment and adds 1, correct), Shadow Artist+ (`_shadowArtistDiscount`, reset per turn), Lethal Rhythm (every 2nd card), Soulbound Tome (3rd card, once per turn), Soulbound Gauntlet (`_firstCardFree`, reset per turn), Gilded Quill (combat-scoped counter). Arcane Barrage reads `_spellsThisTurn` but is an Attack, and that counter only increments for Skill/Power, so it never counts itself. Backstab was the only effect reading a per-turn counter from inside `effect()`. Verified by headless repro (27 assertions): rejection still fires correctly when genuinely out of position; as the first card it now deals 10 (even) / 14 (odd), and Backstab+ 13 / 18, on three consecutive turns each. Note: a rejected Backstab is still spent (it goes to the discard pile and consumes its play) — unchanged, and consistent with the card text. **Verified.** |
| August 15, 2026 (bug fix — deck integrity) | **Exhaust card-duplication bug fixed. Pre-existing and unrelated to the Soul-menu work in the rows below — it predates that system entirely and shares no code with it.** Player report: one reward pick of Berserker's Oath became 4 copies in the deck, and the Deck viewer's header total disagreed with its pile counts. Traced, not assumed — cards are plain string KEYS and `G.deck` is a persistent master list that playing or exhausting a card never removes from; `G.exhaustedPile` is only a this-combat exclusion list. Three linked defects found: **(1)** `showReward()` did `G.deck.push(...G.exhaustedPile)` before clearing the pile — the "return to deck" step re-added cards that had never left, so every exhaust permanently added a duplicate copy. **(2)** `playCard()` pushed Powers onto `G.exhaustedPile` even though ~25 Exhaust cards in `js/data.js` already push their own key inside `effect()` — so a Power was exhausted twice per play, and defect 1 then added **2** copies per fight (measured: 1 → 3 → 5 → 7 → 9 across four wins). **(3)** self-exhausting non-Powers (Spell Echo, Jackpot, Betting It All, Loaded House) landed in the exhausted pile AND the discard pile, so they could be redrawn during the very combat they "exhausted" — 1 duplicate per fight. Fixes: the return step now just clears the pile; `playCard()` detects (by key count taken before `effect()`) whether the card exhausted itself and places it in exactly one pile, trimming surplus entries if Spell Echo repeated an Attack's effect; a Power whose effect does not self-place still exhausts. Separately, the reshuffle inside `drawCards()` filtered the discard pile with `!exh.includes(k)`, which deleted **every other copy** of an exhausted card's key from circulation while `G.deck` still counted them — this was the deck-viewer count mismatch, and it now recycles the discard pile as-is (an exhausted card can no longer be in it). `shuffleDeck()` keeps an instance-accurate `excludeExhausted()` helper as a guard. Verified by headless repro (32 assertions): deck size and per-card copy counts unchanged across 4 and 10 consecutive wins, exhausted cards still unavailable for the rest of their own combat (including after a forced mid-combat reshuffle) and available again the next fight, normal cards still discard, two copies of the same Exhaust card behave independently, boss-fight path clean, and `G.deck.length === draw + hand + discard + exhausted` holds at every step. **Verified** for the card-count invariant; in-app Deck viewer read-through still recommended. |
| August 15, 2026 (bug fix) | **Start-of-combat Block bug fixed — this is a pre-existing relic bug, NOT a Soul-menu balance change.** `startTurn()` zeroes `G.block` on the first turn of every combat, and it runs *after* the combat-start hooks in `startCombat()`/`startBossFight()`. Every start-of-combat Block grant was therefore wiped before the player ever saw it: **Iron Vambrace** ("Start every combat with 6 Block") granted nothing, and **Hollow Throne** ("Start every combat with 20 Block. Lose 8 max HP") shipped as pure downside — the player paid 8 max HP for Block that never arrived. Confirmed by direct test, then fixed: `stageCombatStartBlock()` stages the total into `G._pendingCombatBlock`, and `startTurn()` applies it immediately after its turn-1 reset. Iron Vambrace (6), Hollow Throne (20) and the Soul upgrade Grit (5) all route through it and stack correctly (31 with all three). **Read the relic numbers as restored-to-spec, not buffed** — 6 and 20 are the values their descriptions have always advertised, and if start-of-combat Block ever looks strong in testing, that is these two relics finally working, not Grit being overtuned. Grit's own 5 is unchanged from the finalized design. The Aldric fight still skips relic start-of-combat hooks entirely (a separate pre-existing gap — `torn_page`, `rusted_chain` and `ashen_crown` are missing there too); Grit does apply there, since the Floor 3 spend window precedes that fight. Thief's `shadow_wrap` (5 Block) is still unbuilt and should be routed through the same field when it lands. |
| August 15, 2026 (build) | **Soul-spend menu built** (split build) — the first implementation pass on the July 25 in-run Soul redesign. **Income converted to the GDD §15 flat rate**: 1 regular win / 2 elite / 3 floor boss, +1 per battle with Ash Pendant, replacing the per-enemy `souls` values in `js/data.js` (bosses paid 15, which would have made a 3-8 Soul menu meaningless); the data fields are left in place but no longer read. `G.souls` already reset to 0 per run via `newGame()` — confirmed, not changed. **8 upgrades added** as `SOUL_UPGRADES` in `js/data.js` (Vitality, Grit, Steady Hand, Second Die, Momentum, Overdraw, Reckless Surge, Gambler's Edge) at the finalized costs. **Spend screen** (`showSoulSpend()`, `js/ui.js`) reuses the shared reward screen and its `.reward-card` tiles, the same way the Void Compass relic pick does; it offers 3 of 8 chosen by the existing shuffle-then-slice pattern, never duplicates, never re-offers an owned non-repeatable, dims what you can't afford, and always exposes a "Keep your Souls" decline so a broke player is never stuck. Fires from `proceedAfterCardReward()` after a Floor 1-3 boss only — Aldric is excluded, and the Floor 4 boss never reaches the reward flow at all. Because the **boss relic-choice screen is still unbuilt**, the Soul screen currently follows the boss *card* reward; when the relic screen lands it slots in between. `buySoulUpgrade()`/`soulUpgradeCost()`/`soulUpgradeOffer()` live in `js/game.js`; Vitality's rebuy price escalates through `G._vitalityBuys` (3→4→5…) while every other upgrade is once per run. **Reroll converted from a boolean to a charge counter** (`G.rerollsLeft`, base allowance from `rerollAllowance()` = 1 per turn) with `G.rerollUsed` kept in sync as "no charges left at all" for existing call sites. **Steady Hand is a separate combat-long pool** (`G._bonusRerolls`), granted once at combat start and deliberately NOT refreshed at turn boundaries — one scarce extra reroll for the whole fight, per GDD §15's "+1 reroll charge per combat". The base per-turn reroll cadence is untouched, and `useReroll()` spends the per-turn charge first so the bonus is only consumed once the normal reroll is gone. Unspent bonus does not carry or stack into the next combat. **Two new dice controls** float above the dice panel, visible only while owned and unspent this combat: Second Die (+d2, sum capped at the die's max face) and Gambler's Edge (force any value, respects the one-forced-value-per-turn rule via `_dieSetThisTurn`). Both reset every combat, not every run. Gambler's Edge's downside suppresses affinity on a **natural** max only — `rollDice()` stamps `G._naturalDieValue`, so any card that forces the die afterwards makes the stamp disagree and the roll counts normally; applied in `checkAffinity()`, Lucky Streak, Lucky Coin, and the max-face half of Vampiric Form's extreme check, while cards' own `Max:` bonus branches are untouched. Also noted: the Soul Market event's "buy a soul — permanent +5 max HP" flavor still describes the dead permanent-Soul design (GDD-side only — no such event exists in `js/data.js`, which has just 5 generic events). Verified with a headless harness (106 assertions) driving the real `js/*.js` against a DOM stub: income across a full floor, run reset, offer distinctness across 400 draws, Vitality rebuy escalation, can't-afford dismissal, per-combat flag resets, natural-vs-forced max suppression, and Grit/Overdraw/Momentum reaching turn 1. **Implemented — in-app device/browser verification (especially the new dice buttons at landscape phone heights) still outstanding.** |
| July 23, 2026 | Card/combat consistency + systems session (split build). **7 missing GDD cards implemented** (base + upgrade, added to hero reward pools): Thief's Gambit, Gut Punch, Golden Strike (Thief); Cursed Veins (Vampire); Wild Combo, Press Your Luck, Jackpot (Gambler). **8 dormant Power-card hooks wired up**: Berserker's Oath (Block on HP loss), Burning Soul (+dmg per Burn stack), Poison Master (+dmg per Poison stack), Lethal Rhythm (dmg every 2 cards played), House Edge (min-roll floor), Gambler's Fallacy (guaranteed max after N non-max rolls), Vampiric Form (auto-Fly on extreme roll), and Shadow Artist base (2nd & 4th card each turn cost 0) — the base variant was previously a no-op. **2 bugs found + fixed along the way**: (1) House Edge / Gambler's Fallacy leaked across combats via persistent `_minRoll` / `_fallacyThreshold` flags — converted to status-gated so the effect clears with the exhausted card at combat end; (2) Fly's damage-halving was defined only as a tooltip and never wired into the enemy-attack calc — now applied (halves the hit, then clears). **Enemy-damage pipeline unified**: extracted `resolveEnemyAttack()` (Fly → Block → `loseHP` → on-HP-loss effects) shared by regular enemies AND Aldric (Aldric previously used a separate `dealDamage('player')` path, so it missed Fly); enemy specials (Ritual, Arcane Overload, Collapse) tagged enemy-direct and routed through the same pipeline so Fly halves them too (self-damage/DoT deliberately excluded). Collapse additionally got an opt-in `bypassBlock` flag on `resolveEnemyAttack()`: its damage equals the player's current Block, so the normal Block step made it net ~0 HP every time — bypassBlock sends it straight to HP (Fly still halves it first), so it now deals real damage that punishes defensive play. The flag is per-attack — only Collapse passes it; basic/Aldric/Ritual/Arcane Overload still respect Block. Survive-killing-blow relics (Rabbit Foot, Phylactery) centralized in `loseHP` so they now cover the basic attack, not just `dealDamage` sources. Berserker's Oath now fires on ALL player HP loss (enemy attacks, enemy specials, and self-damage cards) through the shared `loseHP` chokepoint. Also fixed an earlier draw-order bug where a card's own draw effect ran before the card left the hand, so in-turn draws hit the hand cap one slot early (e.g. Blood Price drew 0 at a full hand). **Hand size rule changed**: split the single `handLimit` into `startingDrawCount` (5) and `maxHandSize` (8) — turn-start draw stays exactly 5, while in-turn draw effects can now fill the hand up to 8 (excess draws blocked). **`curseddice` restored + renamed**: display name → Cursed Reroll / Cursed Reroll+ to resolve a collision with the d4 die also named "Cursed Die" (key unchanged); added to every hero's uncommon reward pool; its previously-missing `+` upgrade added (reroll, take 1 damage instead of 3). **Void Compass implemented**: after a non-boss elite, if the relic is held, offers a choice of 3 relics (via a shared `acquireRelic()` grant path reused by the shop); fires once per fight, otherwise elites behave as before (card reward only). **UI fixes**: relic display added (`renderRelics()`), shop "Leave Shop" sticky-footer fix, card width adjustment. All code changes are Implemented and were unit-tested via a headless harness against the real `js/data.js` / `js/combat.js` / `js/ui.js`; in-app device/browser verification still recommended. |
