# CASTLE RUN — Game Design Document
⚔ CASTLE RUN
Game Design Document — v0.9
Turn-based deck-building roguelite
Save your companions. Storm the castle. Free the king.

*Last updated: April 2026*

---

## 1. Vision & Story

### Design Goal
Castle Run is a gothic deck-building roguelite where a band of five heroes storms a cursed castle to break an ancient curse and free a corrupted king. The game blends strategic turn-based card combat with a layered mystery that unfolds across multiple runs. Every floor boss is a fallen friend — or something wearing their face. Every Core collected brings the player closer to the truth.

The experience should feel like Castlevania in tone: dark atmosphere, escalating dread, a castle that grows more dangerous with every floor. But the emotional core is personal — you are not just fighting monsters, you are uncovering a tragedy one piece at a time.

### The Castle
The castle is not just a place — it is alive. It feeds on grief, despair, and broken bonds. It has corrupted rulers before King Aldric Ashborne and will continue to do so unless destroyed. The castle is the true villain of Castle Run. The king is its victim.

### King Aldric Ashborne
Aldric Ashborne was once a just and beloved ruler. His kingdom prospered under his care. When a plague swept through his lands he gave everything — his treasury, his health, his peace of mind — to save his people. The castle found him at his lowest and offered him power in exchange for his soul.

He accepted. He thought he was saving his kingdom. He was wrong. Now he rules from a throne of stone, a puppet for an ancient evil, trapped inside a body he can no longer control. He is both the king you came to save and the final boss you must defeat.

### The Story
Five heroes answer the call to storm Castle Ashborne. Before they reach the gates, the castle acts: it captures four of them, pulling each into a different floor, corrupting them into something that wears their face.

You play as the fifth hero — the one who made it through. Floor by floor you fight your way up, facing corrupted versions of your companions as floor bosses. Defeating them doesn't kill them — it releases the Core they were carrying, a fragment of their true self.

With all four Cores, you face King Aldric Ashborne himself. What happens next depends on whether you've uncovered the truth — or simply fought your way to the top.

### Sir Crimson
Sir Crimson is not one of your companions. He was the king's most trusted knight — the man whose desperate act of loyalty set everything in motion. Consumed by the castle long before the events of Castle Run, he now serves as its enforcer and gatekeeper between floors.

He appears as a shadowy presence between Floor 1 and Floor 2, watching. Between Floor 2 and Floor 3 he confronts you — and the fight happens. After his defeat, the castle's grip briefly breaks. He becomes lucid, gives you the True Ending hint, and disappears.

In the True Ending, he appears freed completely.

### The Two Endings

**Normal Ending — The Slayer**
Defeat King Aldric without all four True Ending Relics. You kill the king and break the castle's hold on him. The castle crumbles. Your companions are freed but changed. The kingdom survives, but without its king.

**True Ending — The Liberator**
Collect all four True Ending Relics (The Fractured Crown, The King's Sword, The Royal Sigil, The Knight's Vow) and defeat King Aldric. In Phase 3, instead of killing him you use the relics to shatter the castle's hold on his soul. Aldric is freed. The castle is destroyed. The king lives.

---

## 2. Game Overview

### Core Loop
- Choose a character and enter the castle
- Navigate a path of rooms across 4 floors
- Fight enemies with your deck of cards, aided by your dice
- Collect rewards — cards, relics, gold, consumables
- Face the corrupted floor boss and collect their Core
- Reach the King and determine the ending

### Platform
Web browser (HTML/CSS/JS). Designed for mobile-first play — playable in landscape or portrait on phone. Keyboard support for desktop.

### Visual Style
Dark gothic aesthetic. Inspired by Castlevania and Slay the Spire. Character art is hand-illustrated with transparent backgrounds. Combat is side-view: player on the left, enemy on the right. Floor backgrounds shift in tone per floor — dungeon, crypt, throne antechamber, throne room.

### Characters (5 total)

| Character | Dice Affinity | Playstyle |
|---|---|---|
| Barbarian | Even rolls (2, 4, 6) | Heavy hits, consistent damage, self-damage builds |
| Mage | High rolls (6+) | Scaling spell damage, Burn/Chill synergy |
| Thief | Odd rolls (1, 3, 5) | Poison DoT, combo chains, card cycling |
| Vampire | Extreme rolls (1 or max) | Lifesteal, Regen stacking, self-damage |
| Gambler | d6 Specialist (min 2, max = lucky streak) | Dice manipulation, high variance, Gold scaling |

---

## 3. Path & Floor System

### Floor Structure
- 4 floors total
- Each floor has 3 paths, fully visible at floor start (room types only)
- Player selects one path and is committed for the entire floor
- Each floor contains 13–15 rooms, randomly determined per run
- Boss room appears at the end of each floor

### Path Identity

**Path A (Combat Heavy)**
- High number of battles
- 2 Elite fights
- 2 Rest sites
- No shop

**Path B (Balanced)**
- Mix of battles, events, and rests
- 1 Elite fight
- 2 Shops

**Path C (Events / Utility)**
- Higher number of events
- 1 Elite fight
- 1 Shop

### Room Types

| Room | Icon | Description | Visibility |
|---|---|---|---|
| Battle | ⚔ | Standard enemy fight | Always shown |
| Elite | ☠ | Harder enemy, better reward | Always shown |
| Rest | 🔥 | Heal HP or upgrade a card | Always shown |
| Shop | 💰 | Buy cards, relics, consumables | Always shown |
| Event | ? | Random event with choices | Hidden on Floor 3-4 |
| Magic Door | 🪄 | High risk / high reward mystery | Always hidden |

### Mirror Mechanic
At approximately 60% through each path, a Mirror Room appears. The castle shows you a reflection of what you've built. The Mirror fight uses a shadow copy of your deck and dice — a skill check on your own build.

### Floor Themes & Boss

| Floor | Theme | Boss |
|---|---|---|
| 1 | Castle Dungeon | Corrupted companion (random) |
| 2 | Catacombs | Corrupted companion (random) |
| 3 | Shadow Realm / Void | Corrupted companion (random) |
| 4 | Throne Room | King Aldric (fixed) |

### Boss Debuff System (Balatro-inspired)
Each corrupted companion boss has a fixed debuff shown before the fight. Debuffs scale per floor:
- Floor 1 — disables your dice affinity bonus for the fight
- Floor 2 — card type costs +1 energy
- Floor 3 — severe mechanical restriction (block resets, draw reduction, etc.)
- Floor 4 — brutal restriction per character kit

---

## 4. Combat System

### Turn Structure
1. Player draws 5 cards at the start of their turn
2. Player rolls their active die (result determines affinity and card bonus effects)
3. Player plays cards spending Energy (3 Energy per turn base)
4. Player ends turn — unused cards are discarded, enemy acts
5. Repeat until combat ends

### Energy
Players start each turn with 3 Energy. Cards cost 0, 1, or 2 Energy. Unused Energy does not carry over. Some relics and cards modify max Energy temporarily. Energy is displayed as a single number — it can go above max temporarily from cards like Time Warp or Battle Trance.

> ⚠ DESIGN RULE: Cards that generate Energy have flat fixed values. Affinity rolls cannot modify Energy gain. Draw effects may still be affinity-gated.

### Block System
- Player block resets to 0 at the start of each player turn (unless Entrench is active)
- Entrench exception: if Entrench was played, leftover block carries to the next turn once
- Enemy block is persistent — must be broken through over multiple turns
- Block absorbs damage before HP

### Dice System
Each character has one active die (d6 by default). At the start of their turn they roll it. The result determines whether each card's affinity bonus activates when played.

- Players get 1 reroll per turn
- Reroll resets at the start of each player turn
- Some relics grant additional rerolls
- Die can only be set (forced to a specific value) once per turn
- Twinned Die relic applies to initial roll only — not rerolls

### Character Affinities

| Character | Affinity | How Cards Trigger |
|---|---|---|
| Barbarian | Even (2, 4, 6) | Cards gain stronger damage or block on even rolls |
| Mage | High (6+) | Spells gain enhanced effects — more damage, status, or draw |
| Thief | Odd (1, 3, 5) | Cards trigger combo bonuses — extra hits, draw, or poison |
| Vampire | Extreme (1 or max face) | Cards gain lifesteal or enhanced effects on extreme rolls |
| Gambler | d6 Specialist | Cards read the actual die value — min roll 2, max roll = lucky streak |

> Note: Gambler cards read the actual numeric die result, not a yes/no affinity check. The number itself matters.

### Status Effects

| Status | Type | Effect | Timing | Clears |
|---|---|---|---|---|
| 🔥 Burn | DoT | Deals damage equal to stacks | Before enemy acts (end of player turn) | -1 stack per turn |
| ☠️ Poison | DoT | Deals damage equal to stacks | After enemy acts | -1 stack per turn |
| ❄️ Chill | Debuff | Reduces enemy's attack damage by 25% (more with Cold Mastery) | Applies on enemy attack turns only | -1 stack per enemy attack |
| 😵 Weak | Debuff | Target deals 25% less damage | Applied immediately | -1 stack at end of turn |
| 🫗 Vulnerable | Debuff | Target takes 50% more damage | Applied immediately | -1 stack at end of turn |
| 💢 Rage/Strength | Buff | +N damage to all attacks | Applied immediately | Permanent until combat ends |
| 💚 Regen | Buff | Heal N HP at end of player turn before enemy acts | End of player turn | -1 stack per turn. Max 10 stacks |
| 🦇 Fly | Buff | Damage taken reduced by 50% | Next damage taken | Clears after triggering or end of turn |

**Status Timing Summary:**
- Burn ticks BEFORE the enemy acts
- Regen ticks BEFORE the enemy acts
- Poison ticks AFTER the enemy acts
- Vulnerable ticks down at end of turn (not per hit)
- Chill only ticks when the enemy attacks (not on defend turns)

**Cold Mastery modifier:**
- No Cold Mastery: Chill reduces damage by 25%
- Cold Mastery (base): reduces damage by 35%
- Cold Mastery+: reduces damage by 50%

### Power Cards
Power cards are played once and stay in the combat zone. They provide ongoing passive effects for the rest of the fight. When played, they are exhausted — removed from the deck for this combat only. They do not go to the discard pile.

### Exhaust
Exhausted cards are removed from play for the rest of the current combat. They return to the deck at the start of the next combat (after the reward screen). Some cards are always Exhausted on use (noted in card description). Exhausted cards cannot be retrieved by Arcane Recall or similar effects unless specifically stated.

---

## 5. Sir Crimson — Mid-Run Encounter

### Story Arc

| Point | What Happens |
|---|---|
| Between Floor 1–2 | Appears as a shadowy presence. One line of dialogue. Watching. No fight. |
| Between Floor 2–3 | Confronts you. The fight happens here. |
| After the fight | Castle's grip breaks. He's lucid. Gives True Ending hint. Disappears. |
| True Ending cutscene | Appears freed completely. |

### The Fight
- Type: Surprise encounter — no reward room beforehand
- Difficulty: Full boss-level
- HP: 160 | Base DMG: 12

**His Moves (rotation):**

| Move | Effect |
|---|---|
| Crimson Strike | Deal 12 damage |
| Iron Guard | Gain 14 Block |
| Shatter Step | Deal 8 damage, remove 8 player block |
| Studied Blow | Deal 15 damage + Weak 2 (telegraphed one turn early) |

**Mimic Move — every 3rd turn:**

| Move | Effect |
|---|---|
| Echo | Pulls a random card from your deck and uses it against you at full effect. Always telegraphed. |

Echo mechanic: block cards give him block, damage cards hit you, status cards apply to you. Larger decks are riskier — rewards tight deck building.

**Post-fight dialogue:**
*"The king... he didn't choose this. None of us did. The castle took everything from him — his grief was the door it walked through. If you want to free him... find what he lost. Four pieces. You'll know them when you see them."*

---

## 6. Characters & Starter Decks

All characters share these baseline cards:
- Strike — Deal 6 damage (Cost: 1)
- Defend — Gain 5 Block (Cost: 1)

### Barbarian 🪓

| Field | Detail |
|---|---|
| Dice Affinity | Even rolls (2, 4, 6) |
| HP | 90 |
| Starter Deck | Strike x3, Defend x2, Heavy Blow x2, War Shout x2, Iron Bash x1 |
| Boss Form | Siege Tyrant — enrages at 50% HP, gains +4 Strength, attacks twice per turn |

### Mage 🔮

| Field | Detail |
|---|---|
| Dice Affinity | High rolls (6+) |
| HP | 70 |
| Starter Deck | Strike x2, Defend x2, Frost Bolt x2, Arcane Shield, Mana Surge, Arcane Boost, Void Channel |
| Boss Form | Void Scholar — copies your last card played each turn as a counter-spell |

### Thief 🗡️

| Field | Detail |
|---|---|
| Dice Affinity | Odd rolls (1, 3, 5) |
| HP | 75 |
| Starter Deck | Strike x2, Defend x2, Quick Strike x2, Shadow Step, Poison Blade, Pick Pocket, Smoke Screen |
| Boss Form | Shadow Phantom — gains stealth every other turn (immune to damage while in stealth) |

### Vampire 🧛

| Field | Detail |
|---|---|
| Dice Affinity | Extreme rolls (1 or max face) |
| HP | 78 |
| Starter Deck | Strike x2, Defend x2, Blood Drain x2, Night Shroud, Life Leech, Crimson Bite, Dark Embrace |
| Boss Form | The Eternal — heals 10 HP every turn; must be burst down |

### Gambler 🎲

| Field | Detail |
|---|---|
| Dice Affinity | d6 Specialist — min roll 2, max roll = lucky streak |
| HP | 72 |
| Starter Deck | Strike x2, Defend x2, High or Low x2, Double Down, Lucky Strike, Hedge Bet, Wild Card |
| Boss Form | The House — forces you to choose between two random harmful effects each turn |

---

## 7. Floor Bosses

### Corrupted Companions (Floors 1–3)
Which companion appears on which floor is random each run. Affinity hints appear in rooms near the boss — environmental particles matching the boss's character (e.g. magic vapor for Mage, blood mist for Vampire).

⚠ TBD: Names, lore, and boss mechanics for the four corrupted companions.

### King Aldric Ashborne — Final Boss

**Phase 1: The Corrupted King (HP: 250)**
- Ability: Stone Heart — starts with 50 Persistent Block. Gains 10 Block every time you roll an Even number
- Attack: Grieving Ground — deals 15 damage and adds one Curse of Weakness to your discard pile
- Threshold: At 0 HP, the Castle armor shatters

**Phase 2: The Shattered Ruler (HP: 200)**
- Ability: Memory Leech — every 3rd turn, your dice affinity bonus is disabled for that turn
- Attack: Fractured Strike — deals 8 damage 3 times. Doubles if you have Poison or Burn stacks
- Ability: Desperation — gains 2 Strength for every Power card you have exhausted this combat
- Ability: Dice Curse — your die result is inverted (roll a 6, it becomes a 1) every other turn

**Phase 3: The Soul's Burden (HP: 150)**
- Ability: Fading Light — at the start of each of your turns, you lose 5 HP
- Attack: Final Decree — deals 20 damage and silences your highest-cost card for 1 turn
- True Ending Trigger — if all 4 True Ending Relics are held, a special action appears at 50 HP: Use the Relics. This ends Phase 3 without dealing the killing blow and triggers the True Ending.

---

## 8. Enemy Roster

### Floor 1 — Castle Dungeon

**Easy Pool (First 2 battles only)**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| Castle Guard | 28 | 6 | None |
| Dungeon Rat | 18 | 4 | Scurry: 50% chance to dodge attacks |
| Stone Imp | 22 | 5 | None |

**Standard Pool**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| Armored Guard | 40 | 9 | Shield Up: gains 8 Block every other turn |
| Dungeon Hound | 32 | 11 | Frenzy: attacks twice if below 50% HP |
| Cursed Statue | 45 | 7 | Petrify: applies Weak to player on hit |
| Skeleton Archer | 28 | 8 | Range: always attacks from safe distance, ignores Block once |

**Floor 1 Elites**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| Dungeon Warden | 70 | 13 | Lockdown: prevents card draw for 1 turn if hit with same card twice |
| Armored Knight | 80 | 10 | Unbreakable: gains 15 persistent Block on turns 1 and 3 |

---

### Floor 2 — Catacombs

**Standard Pool**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| Skeleton Warrior | 45 | 10 | Undying: revives once at 1 HP when killed |
| Crypt Wraith | 38 | 12 | Phase: immune to damage every other turn |
| Bone Archer | 35 | 9 | Volley: attacks 2 times if player has no Block |
| Grave Crawler | 50 | 8 | Burrow: gains 6 Block after each attack it makes |

**Floor 2 Elites**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| Death Knight | 95 | 14 | Soul Drain: steals 1 Energy from player on every attack |
| Bone Golem | 110 | 11 | Collapse: when broken below 50% HP, deals 20 damage to player |

---

### Floor 3 — Shadow Realm / Void

**Standard Pool**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| Dark Scholar | 50 | 11 | Counterspell: if player plays 2+ cards in one turn, reflects 5 damage |
| Arcane Construct | 65 | 9 | Overload: builds up energy and unleashes 25 damage on turn 4 |
| Cursed Knight | 58 | 13 | Hexed Blade: applies random debuff (Weak or Vulnerable) on hit |
| Tome Guardian | 70 | 10 | Knowledge: gains +2 Strength per Power card the player has active |

**Floor 3 Elites**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| Void Summoner | 90 | 12 | Summon: adds a Bone Archer to the fight at 50% HP |
| Ancient Lich | 120 | 15 | Phylactery: gains 20 Block when dropping below 40 HP; destroys 1 card in your deck |

---

### Floor 4 — Throne Room

**Standard Pool**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| Royal Guard | 70 | 14 | Loyalty: gains 10 Block when king's HP drops below 50% |
| Corrupted Paladin | 80 | 12 | Holy Wrath: deals double damage if player has any curses in deck |
| Shadow Demon | 60 | 16 | Umbral Step: untargetable for 1 turn before attacking |
| Castle Shade | 55 | 13 | Drain Essence: heals 8 HP per successful hit |

**Floor 4 Elites**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| The Forsaken Champion | 130 | 16 | Unrelenting: cannot be Weakened or Vulnerable; attacks ignore Block once per turn |
| The Castle's Will | 150 | 13 | Manifestation: spawns a Cursed Statue each time player deals 30+ damage in one turn |

---

## 9. Relic System

Relics provide passive bonuses for the rest of the run. Collected from boss rewards, elites, shops, events, and Magic Doors.

### True Ending Relics (Boss Rewards Only)

| Relic | Floor | Effect in Aldric fight |
|---|---|---|
| The Fractured Crown | Floor 1 Boss | Aldric loses all Strength permanently |
| The King's Sword | Floor 2 Boss | Aldric's damage halved for the fight |
| The Royal Sigil | Floor 3 Boss | Fading Light disabled — stop losing HP each turn |
| The Knight's Vow | Floor 4 Boss | Aldric stops attacking entirely. Fight ends without killing blow. |

### Common Relics

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

### Uncommon Relics (Floor 2+)

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
| Twinned Die | Roll twice on initial roll, take the higher result. Does not apply to rerolls. |
| Soulbound Tome | Gain 1 Energy when you play 3+ cards in one turn |

### Rare Relics (Floor 3+)

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

### Character Relics (Floor 3+, Boss reward only)

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

## 10. Card System

### Deck Rules
- All characters start with 10 cards (2 Strikes, 2 Defends, 6 class-specific)
- After each combat, choose 1 of 3 card rewards OR skip and take 50 gold
- Cards can be removed at Rest Stops (costs 75 gold), Shops (costs 100 gold), or certain Events
- Upgrades available at Rest Stops (one per stop) or Shops (costs 80 gold)
- Every card has exactly one upgrade version (base → +)

### Card Types

| Type | Description |
|---|---|
| Attack | Deals damage. May apply status effects. |
| Skill | Non-damage effects: Block, draw, Energy, buffs. |
| Power | Played once. Passive effect for rest of combat. Exhausted on play. |
| Curse | Negative cards added to deck by enemies or events. No cost, no benefit. |

### Exhaust
Exhausted cards are removed from combat for the rest of the fight. They return to your deck after combat ends (when the reward screen opens). Power cards are always Exhausted when played. Exhausted cards are visible in the Deck Viewer during combat.

### Curse Cards

| Curse | Effect |
|---|---|
| Curse of Weakness | Does nothing. A dead weight in your deck. |
| Curse of Debt | Unplayable. Takes 3 damage at start of combat. |
| Curse of Confusion | Unplayable. A random card in hand costs +2 each turn. |
| Curse of Binding | Unplayable. One card permanently costs 2 more. |

---

## 11. Global Design Rules

**Energy rules:**
- Cards that generate Energy have flat fixed values
- Affinity rolls cannot modify Energy gain
- Draw effects may still be affinity-gated

**Combat rules:**
- All combat is single-target — no AoE cards
- Regen has a hard cap of 10 stacks
- Block resets at start of player turn (Entrench exception: leftover block carries once)

**Dice rules:**
- Die can only be set to a specific value once per turn
- Twinned Die relic applies to initial roll only, not rerolls
- Gambler cards read actual die value, not yes/no affinity

**Status timing rules:**
- Burn ticks before enemy acts
- Poison ticks after enemy acts
- Chill only consumes a stack when the enemy attacks
- Vulnerable ticks down at end of turn, not per hit

**Card cost rules:**
- Shadow Artist cost reductions cannot reduce cards below 0 Energy
- Devil's Deal has a minimum gold cost of 1 regardless of discounts
- Die can only be set once per turn — Loaded Die, Safe Pull, and Void Channel all share this limit

---

## 12. Event System

| Event | Options |
|---|---|
| The Old Prisoner | Free them (+relic, risk) \| Leave (nothing) \| Take their food (+heal, they stay) |
| The Merchant's Ghost | Buy a cursed relic (powerful + downside) \| Ignore \| Rob them (gold + Curse of Doubt) |
| Abandoned Laboratory | Drink the potion (+random effect) \| Take the notes (card upgrade) \| Leave |
| The Shrine of Ash | Offer HP (gain powerful card) \| Offer gold (heal HP) \| Destroy shrine (random relic) |
| The Crying Statue | Comfort it (gain relic) \| Smash it (gold + Curse of Pain) \| Ignore |
| The Trapped Knight | Help them (battle) \| Leave \| Give them a relic (they give info) |
| The Whispering Walls | Listen (see boss moveset hint) \| Ignore \| Shout back (take 8 damage, get extra relic) |
| The Gambler's Dice | Bet 50 gold (win 100 or lose it) \| Pass \| Ask for tip (costs 20 gold) |
| The Bloodied Altar | Sacrifice HP (gain 2 Power cards) \| Leave \| Smash (Curse of Weakness added) |
| The Starving Wolf | Feed it (becomes your ally for 1 battle) \| Fight it \| Ignore |
| The Locked Chest | Force it open (fight a trap) \| Leave \| Use a key relic (free loot) |
| The Portrait Gallery | Study the portraits (lore + hint) \| Burn them (gold) \| Take one (cursed relic) |
| The Broken Clock | Wind it (+1 card draw next battle) \| Smash it (gold) \| Leave |
| The Cellar of Bottles | Drink one (random buff/debuff) \| Take them all (3 consumables) \| Leave |
| The Prisoner's Letter | Read it (hint about floor boss) \| Burn it (gold) \| Deliver it (bonus in next event) |
| The Cracked Mirror | Touch it (enter a 1-round mirror fight) \| Leave \| Shatter it (random relic) |
| The Sleeping Shade | Wake it (fight for a rare relic) \| Sneak past (nothing) \| Leave offering (common relic) |
| The Soul Market | Buy a soul (permanent +5 max HP, costs 3 Souls) \| Sell a card (50 gold) \| Leave |

---

## 13. Economy

### Currencies

| Currency | Earned By | Resets? | Used For |
|---|---|---|---|
| Gold | Combat wins, events, selling, bosses | Yes — resets each run | Shop purchases, card removal, upgrades |
| Souls | Ash Pendant relic, Soul Market event, run completion | No — permanent | Meta-progression upgrades between runs |

### Gold Income (Approximate)

| Source | Amount |
|---|---|
| Standard battle win | 15-25 gold |
| Elite battle win | 30-45 gold |
| Floor boss win | 80 gold + full HP restore |
| Selling a card at shop | 25 gold |
| Event rewards | 20-60 gold (varies) |
| Skipping card reward | 50 gold |

### Gold Sinks

| Purchase | Cost |
|---|---|
| Buy a card (shop) | 50-100 gold |
| Buy a relic (shop) | 80-150 gold |
| Buy a consumable | 30-60 gold |
| Remove a card (rest stop) | 75 gold |
| Remove a card (shop) | 100 gold |
| Upgrade a card (shop) | 80 gold |

---

## 14. Consumables

One-time use items consumed during combat or from inventory. Carry up to 3 at a time.

| Consumable | Effect | Available From | Floor |
|---|---|---|---|
| Health Potion | Heal 20 HP | Shop, Event | Any |
| Smoke Vial | Apply Weak to enemy for 2 turns | Shop, Event | Any |
| Fire Flask | Apply 4 Burn to target enemy | Shop, Elite reward | Any |
| Poison Vial | Apply 5 Poison to target enemy | Shop, Elite reward | Any |
| Energy Crystal | Gain 2 Energy this turn | Shop, Magic Door | Floor 2+ |
| Scroll of Draw | Draw 3 cards immediately | Shop, Event | Any |
| Dice Stabilizer | Lock your die at its current result for 2 turns | Shop, Magic Door | Floor 2+ |
| Gold Pouch | Gain 40 gold instantly | Event, Magic Door | Any |
| Block Stone | Gain 15 Block immediately | Shop, Event | Any |
| Chaos Potion | Apply random status to enemy | Event, Magic Door | Floor 3+ |

---

## 15. Meta Progression

Between runs, Souls are spent on permanent upgrades.

**Power Branch**
- Start each run with +5 max HP (Cost: 2 Souls)
- Start each run with +1 Energy on turn 1 (Cost: 3 Souls)
- Starter deck includes 1 additional class card (Cost: 4 Souls)

**Knowledge Branch**
- See room types 1 room ahead on path (Cost: 2 Souls)
- Shop shows 1 extra item per visit (Cost: 3 Souls)
- Card rewards show 4 options instead of 3 (Cost: 5 Souls)

**Fortune Branch**
- Start each run with 30 bonus gold (Cost: 2 Souls)
- Elite fights drop 1 consumable in addition to normal reward (Cost: 3 Souls)
- Once per run, reroll a relic choice for free (Cost: 4 Souls)

⚠ TBD: Full Soul tree to be expanded. Soul drop rates not yet set.

---

## 16. Open Design Questions

### Story
- ⚠ TBD: Names and lore for the four corrupted companions (floor bosses 1–4 random assignment)
- ⚠ TBD: Sir Crimson's full backstory — who was he before the castle took him?

### Gameplay
- ⚠ TBD: Balancing — enemy HP and damage values need playtesting
- ⚠ TBD: Boss debuff system (Balatro-style carry-forward debuffs) — designed, not implemented
- ⚠ TBD: Card rarity system (Common/Uncommon/Rare reward odds) — can tune late
- ⚠ TBD: Hand size — fixed 5 or per character (default 5 works as placeholder)
- ⚠ TBD: Core passive bonuses — what do Cores DO mid-run?
- ⚠ TBD: Magic Door exclusive event pool

### Systems
- ⚠ TBD: Full Soul meta-progression tree (branches outlined, details TBD)
- ⚠ TBD: Consumable inventory UI and interaction
- ⚠ TBD: Relic system in combat (35+ relics designed, none active yet)
- ⚠ TBD: Boss reward relic choice screen

### Platform / Technical
- ⚠ TBD: Background art per floor (dungeon, catacombs, shadow realm, throne room)
- ⚠ TBD: Deck color theming per character

---

# 🔧 AI DEVELOPMENT GUIDELINES

## Core Gameplay Rules (DO NOT BREAK)
- Game is turn-based
- Player uses ONE active die per turn
- Player has 3 Energy per turn (unless modified)
- Combat loop must always function (player turn → enemy turn)
- All combat is single-target — no AoE

## Dice System Rules
- Only ONE die is active at a time
- Dice roll determines whether card affinity effects activate when cards are played
- Die can only be set to a specific value ONCE per turn
- Reroll is limited per combat — does not reset between cards
- Twinned Die applies to initial roll only, not rerolls
- No multiple dice selection bugs allowed

## Card System Rules
- Cards that generate Energy have FLAT fixed values — affinity cannot modify Energy gain
- Regen status has a hard cap of 10 stacks
- Exhaust removes a card from combat for that fight only — it returns next combat
- Power cards are always Exhausted on play

## Status Timing Rules (CRITICAL)
- Burn ticks BEFORE enemy acts (end of player turn)
- Poison ticks AFTER enemy acts
- Chill only consumes a stack on enemy attack turns (not defend turns)
- Vulnerable ticks down at end of turn (not per hit)
- Regen ticks BEFORE enemy acts

## UI PRIORITIES (VERY IMPORTANT)
- Combat area is the main focus of the screen
- Player and enemy must always be visible and aligned
- Health bars must always be visible and readable
- Dice panel must NOT dominate screen space
- Mobile layout should feel like desktop (landscape style)
- Important stats (HP, Block, Energy) should never be hidden
- Energy displayed as single number — can exceed max temporarily

## CODE RULES
- Do NOT break existing combat logic
- Prefer small targeted changes over full rewrites
- Keep functions readable and modular
- Avoid introducing unnecessary complexity