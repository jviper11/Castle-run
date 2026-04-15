# PROGRESS.md — Castle Run (Browser)
*Last updated: April 2026*
*Platform: HTML/CSS/JS — browser-based, mobile-first*
*Separate from Castle Run: Ascent (Roblox project)*

---

## Quick Status Overview

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
| Enemy Roster (all floors) | ✅ Complete | ✅ In prototype |
| Boss Debuff System | ✅ Complete | ✅ In prototype |
| Events (18) | ✅ Complete | ✅ In prototype |
| Economy (Gold/Souls) | ✅ Complete | ✅ In prototype |
| King Aldric Final Boss | ✅ Complete | ✅ In prototype |
| Floor Boss Hint System | ✅ Complete | ✅ In prototype |
| Sir Crimson — Story Arc | ✅ Complete | ❌ Not built |
| Sir Crimson — Fight | ✅ Complete (today) | ❌ Not built |
| Relics — Common (10) | ✅ Complete | ✅ Built |
| Relics — Uncommon (10) | ✅ Complete | ✅ Built |
| Relics — Rare (10) | ✅ Complete | ✅ Built (void_compass, bone_key, shattered_mirror deferred) |
| Relics — Character (15) | ✅ Complete | ❌ Not built |
| Relics — True Ending (4) | ✅ Complete | ❌ Not built |
| Boss Reward Relic Screen | ✅ Complete | ❌ Not built |
| Consumables (10) | ✅ Complete | ❌ Not built |
| Soul Meta-Progression Tree | ✅ Complete (partial) | ❌ Not built |
| Core Passive Bonuses | ❌ Not designed | ❌ Not built |
| Magic Door Exclusive Pool | ✅ Complete | ✅ Built |
| Card Rarity / Reward Odds | ✅ Complete | ✅ Built |
| Hand Size Decision | ❌ Not decided | ❌ Not built |

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
- **Normal Ending** — defeat Aldric without all 4 True Ending Relics. Castle endures. Cycle continues.
- **True Ending** — hold all 4 True Ending Relics, trigger at 50 HP in Phase 2. Aldric freed. Castle destroyed. Sir Crimson appears in true form.

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
Every hero has their **10-card starter deck** coded and working. Thief also has their common reward cards in the pool. Everyone else's reward pools are thin — 4-5 cards that are mostly just duplicates of starter cards.

### Card Build Status — ✅ Complete
All 5 heroes fully coded including starters, reward cards, and upgrades. Shared pool complete.

### Implementation note
When adding cards to the file, use surgical grep approach — never read the full 5k line file. Target only the CARDS object and CHAR_REWARD_POOLS. Add per hero in one session each.

### Card rarity distribution in reward pools
- Common reward cards — appear most frequently
- Uncommon — appear from Floor 2+
- Rare — appear from Floor 3+ or boss rewards only
*(Exact odds not yet designed — see Open Design Items)*

---

## Relics — ✅ Design Complete, ❌ Not Built

### True Ending Relics (4) — Boss rewards on True Ending path
| Relic | Effect in Aldric fight |
|---|---|
| The Fractured Crown | Aldric loses all Strength permanently |
| The King's Sword | Aldric's damage halved for the fight |
| The Royal Sigil | Fading Light disabled — stop losing HP each turn |
| The Knight's Vow | Aldric stops attacking entirely. Fight ends without killing blow. |

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

## Events — ✅ Complete (18 events)

Categories: Gold events, HP-for-Gold trades, Curse card rewards, Risk events, Classic reworked. All implemented in prototype.

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

## Soul Meta-Progression Tree — ✅ Partial Design, ❌ Not Built

3 branches. Shared across all characters (TBD — may go per-character).

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

⚠️ Tree needs expansion — Soul drop rates not yet set.

---

## King Aldric Final Boss — ✅ Design Complete, ✅ Built in prototype

3 phases. Stone Heart mechanic. Dice corruption in Phase 2. True Ending trigger at 50 HP in Phase 2 if all 4 relics held.

---

## Open Design Items — ❌ Still Needed

| Item | Priority | Notes |
|---|---|---|
| Core passive bonuses | Medium | Cores drop on boss defeat — what do they DO mid-run? |
| Magic Door exclusive event pool | Low | Currently pulls from normal room pool |
| Card rarity system (Common/Uncommon/Rare reward odds) | Low | Can tune late |
| Hand size — fixed 5 or per character | Low | Default 5 works as placeholder |

---

## Open Build Items — ❌ Not Yet Implemented

| Item | Notes |
|---|---|
| Sir Crimson encounter | Full fight + dialogue + story beats between floors |
| Boss reward relic choice screen | Pick 1 of 3 after each floor boss |
| Consumable system | Carry/use from inventory during combat |
| Soul meta-progression tree | UI + unlock system |
| Enemy intent bug | Always starts on defend — fix pending |
| Mobile UI polish | Intent overlap, dice area layout, selected card cutoff |

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