# CASTLE RUN — Game Design Document
⚔
CASTLE RUN
Game Design Document  —  v0.8
Turn-based deck-building roguelite
Save your companions. Storm the castle. Free the king.

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
- Each floor has 3 paths — shown at floor start as icons only (no room preview)
- Pick one path and commit — no switching
- 6-8 rooms per path, scales with floor depth
- 1-2 convergence points per floor where paths share a room

### Room Types

| Room | Icon | Description | Visibility |
|---|---|---|---|
| Battle | ⚔ | Standard enemy fight | Always shown |
| Elite | ☠ | Harder enemy, better reward | Always shown |
| Rest | 🔥 | Heal HP or upgrade a card | Always shown |
| Shop | 💰 | Buy cards, relics, consumables | Always shown |
| Event | ? | Random event with choices | Hidden on Floor 3-4 |
| Magic Door | 🪄 | High risk / high reward mystery | Always hidden |

### Magic Door System
The Magic Door is the only room where a second door appears. It always has a catch. Possible events include:
- Map Blind Curse — you can't see room icons for the rest of the floor
- Locked Door — you must pay 30 gold to continue through
- Burning Door — take 15 damage to pass, gain a powerful relic on the other side
- Sealed Door — requires a specific relic to open; reward scales with rarity
- Mirror Door — face a shadowed version of yourself for 1 round

### Mirror Mechanic
At approximately 60% through each path, a Mirror Room appears. The castle shows you a reflection of what you've built. The Mirror fight uses a shadow copy of your deck and dice — a skill check on your own build.

### Floor Themes & Boss

| Floor | Theme | Boss (Corrupted Companion) | Enemy Aesthetic |
|---|---|---|---|
| 1 | Castle Dungeon | Sir Crimson (Mimic Knight) | Guards, dungeon creatures |
| 2 | Crypt | Companion 2 ⚠ TBD | Undead, skeletons, wraiths |
| 3 | Forbidden Library | Companion 3 ⚠ TBD | Arcane constructs, dark scholars |
| 4 | Throne Room | Companion 4 ⚠ TBD | Elite castle guards, demons |

---

## 4. Combat System

### Turn Structure
1. Player draws 5 cards at the start of their turn
2. Player rolls their active die (result determines affinity and card bonus effects)
3. Player plays cards spending Energy (3 Energy per turn base)
4. Player ends turn — unused cards are discarded, enemy acts
5. Repeat until combat ends

### Energy
Players start each turn with 3 Energy. Cards cost 0, 1, or 2 Energy. Unused Energy does not carry over. Some relics and cards modify max Energy or carry-over rules.

> ⚠ DESIGN RULE: Cards that generate Energy have flat fixed values. Affinity rolls cannot modify Energy gain. Draw effects may still be affinity-gated.

### Block System
- Player block resets to 0 at the start of each enemy turn
- Enemy block is persistent — must be broken through over multiple turns
- Block absorbs damage before HP

### Dice System
Each character has one active die (d6 by default). At the start of their turn they roll it. The result determines whether each card's affinity bonus activates when played.

- Players get 1 reroll per turn
- Reroll resets at the start of each player turn
- Some relics grant additional rerolls
- **Die can only be set (forced to a specific value) once per turn**
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

| Status | Type | Effect | Clears |
|---|---|---|---|
| 🔥 Burn | DoT | Deals damage equal to current stacks at the start of player turn | Decreases by 1 stack each turn automatically |
| ☠️ Poison | DoT | Deals damage equal to current stacks at the end of enemy turn | 1 stack removed after dealing damage each turn. |
| ❄️ Chill | Debuff | Reduces enemy's next attack by 25%. Flat regardless of stacks | 1 stack consumed per enemy attack |
| 😵 Weak | Debuff | Target deals 25% less damage. Flat regardless of stacks | 1 stack removed at end of target's turn |
| 🩸 Vulnerable | Debuff | Target takes 25% more damage. Flat regardless of stacks | 1 stack removed at end of target's turn |
| 💢 Strength | Buff | +N damage to all attacks | Permanent until combat ends |
| 💚 Regen | Buff | Heal N HP at start of player turn | Decreases by 1 stack each turn. Max 10 stacks |
| 🦇 Fly | Buff | Next damage taken reduced by 50% | Clears after triggering or at end of turn |

**Debuff Duration Rules:**
- Debuffs (Weak, Vulnerable, Chill) last until the end of the target's next action
- Player-applied debuffs affect the enemy immediately and expire after the enemy acts
- Enemy-applied debuffs affect the player on their next turn and expire after the player acts
- Stacking the same debuff multiple times extends duration not magnitude — 25% flat regardless of stack count

> ⚠ Rage was removed as a status — it is now represented as a Power card (Rage Fuel) available in the Barbarian reward pool.

### Power Cards
Power cards are played once and stay in the combat zone. They provide ongoing passive effects for the rest of the fight. When played, they are exhausted — removed from the deck for this combat only. They do not go to the discard pile.

### Exhaust
Exhausted cards are removed from play for the rest of the current combat. They return to the deck at the start of the next combat. Some cards are always Exhausted on use (noted in card description). Exhausted cards cannot be retrieved by Arcane Recall or similar effects unless specifically stated.

---

## 5. Characters & Starter Decks

All characters share these baseline cards:
- Strike — Deal 6 damage (Cost: 1)
- Defend — Gain 5 Block (Cost: 1)

---

### Barbarian 🪓

| Field | Detail |
|---|---|
| Dice Affinity | Even rolls (2, 4, 6) |
| Affinity | Cards gain stronger damage or block on even rolls |
| Playstyle | Heavy consistent hits, self-damage builds, low-HP payoffs |
| HP | 90 |
| Starter Deck | Strike x3, Defend x2, Heavy Blow x2, War Shout x2, Iron Bash x1 |
| Boss Form | Siege Tyrant — enrages at 50% HP, gains +4 Strength, attacks twice per turn |

---

### Mage 🔮

| Field | Detail |
|---|---|
| Dice Affinity | High rolls (6+) |
| Affinity | Spells gain enhanced effects on high rolls |
| Playstyle | Burn/Chill synergy, spell chaining, status scaling |
| HP | 70 |
| Starter Deck | Strike x2, Defend x2, Frost Bolt x2, Arcane Shield, Mana Surge, Arcane Boost, Void Channel |
| Boss Form | Void Scholar — copies your last card played each turn as a counter-spell |

---

### Thief 🗡️

| Field | Detail |
|---|---|
| Dice Affinity | Odd rolls (1, 3, 5) |
| Affinity | Cards trigger combo bonuses on odd rolls |
| Playstyle | Poison DoT, combo chains, card cycling, light Gold economy |
| HP | 75 |
| Starter Deck | Strike x2, Defend x2, Quick Strike x2, Shadow Step, Poison Blade, Pick Pocket, Smoke Screen |
| Boss Form | Shadow Phantom — gains stealth every other turn (immune to damage while in stealth) |

---

### Vampire 🧛

| Field | Detail |
|---|---|
| Dice Affinity | Extreme rolls (1 or max face) |
| Affinity | Cards gain lifesteal or enhanced effects on extreme rolls |
| Playstyle | Regen stacking, self-damage for power, Fly for defense, lifesteal |
| HP | 78 |
| Starter Deck | Strike x2, Defend x2, Blood Drain x2, Night Shroud, Life Leech, Crimson Bite, Dark Embrace |
| Boss Form | The Eternal — heals 10 HP every turn; must be burst down |

---

### Gambler 🎲

| Field | Detail |
|---|---|
| Dice Affinity | d6 Specialist — min roll 2, max roll = lucky streak |
| Affinity | Cards read actual die value. Higher rolls = stronger effects |
| Playstyle | Dice manipulation, high variance, Gold scaling, roll-reading |
| HP | 72 |
| Starter Deck | Strike x2, Defend x2, High or Low x2, Double Down, Lucky Strike, Hedge Bet, Wild Card |
| Boss Form | The House — forces you to choose between two random harmful effects each turn |

---

## 6. Floor Bosses

### Sir Crimson — Floor 1 Boss (The Mimic Knight)
Sir Crimson is not one of your companions. He is the castle's enforcer — a knight whose soul was consumed long ago and replaced with something ancient. He mimics the form of whoever the castle last consumed, which makes him look familiar but wrong.

**Phase 1: The Impostor (HP: 120)**
- Ability: Mimic — copies the last card you played and uses it against you next turn
- Attack: Shield Bash — deals 8 damage and applies Weak for 2 turns
- Threshold: At 0 HP, the knight's mask shatters

**Phase 2: The True Knight (HP: 80)**
- Ability: Iron Will — gains 10 persistent Block at the start of each turn
- Attack: Crimson Cleave — deals 12 damage to player and removes 5 Block
- Reward: Boss relic choice + 80 gold + full HP restore

---

### Companions 2, 3, 4
⚠ TBD: Names, lore, and boss mechanics for floor bosses 2, 3, and 4.

---

### King Aldric Ashborne — Final Boss
The king fights in three phases. Each phase has its own HP pool. All four Cores must be collected to unlock the throne room door.

**Phase 1: The Corrupted King (HP: 250)**
Aldric sits on the throne, eyes glowing purple, surrounded by castle stone. He uses the Castle to shield himself. Defense and attrition.
- Ability: Stone Heart — starts with 50 Persistent Block. Gains 10 Block every time you roll an Even number
- Attack: Grieving Ground — deals 15 damage and adds one Curse of Weakness to your discard pile
- Threshold: At 0 HP, the Castle armor shatters

**Phase 2: The Shattered Ruler (HP: 200)**
The throne shatters. Aldric stands, wielding a fractured blade, moving erratically. Aggression and chaos.
- Ability: Memory Leech — every 3rd turn, your dice affinity bonus is disabled for that turn
- Attack: Fractured Strike — deals 8 damage 3 times. Doubles if you have Poison or Burn stacks
- Ability: Desperation — gains 2 Strength for every Power card you have exhausted this combat
- Ability: Dice Curse — your die result is inverted (roll a 6, it becomes a 1) every other turn

**Phase 3: The Soul's Burden (HP: 150)**
The corruption bleeds out. He looks human but is being crushed by shadow. A race to survive until the end.
- Ability: Fading Light — at the start of each of your turns, you lose 5 HP (the castle is consuming him)
- Attack: Final Decree — deals 20 damage and silences your highest-cost card for 1 turn
- True Ending Trigger — if all 4 True Ending Relics are held, a special action appears at 50 HP: Use the Relics. This ends Phase 3 without dealing the killing blow and triggers the True Ending.

---

## 7. Enemy Roster

All HP and damage values are starting points subject to playtesting.

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
| Skeleton Archer | 28 | 8 | Range: always attacks from a safe distance, ignores Block once |

**Floor 1 Elites**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| Dungeon Warden | 70 | 13 | Lockdown: prevents card draw for 1 turn if hit with same card twice |
| Armored Knight | 80 | 10 | Unbreakable: gains 15 persistent Block on turns 1 and 3 |

---

### Floor 2 — Crypt

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

### Floor 3 — Forbidden Library

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
| Royal Guard | 70 | 14 | Loyalty: gains 10 Block when the king's HP drops below 50% (in boss fight only) |
| Corrupted Paladin | 80 | 12 | Holy Wrath: deals double damage if player has any curses in deck |
| Shadow Demon | 60 | 16 | Umbral Step: moves to a shadow form, untargetable for 1 turn before attacking |
| Castle Shade | 55 | 13 | Drain Essence: heals 8 HP per successful hit |

**Floor 4 Elites**

| Enemy | HP | Damage | Special Ability |
|---|---|---|---|
| The Forsaken Champion | 130 | 16 | Unrelenting: cannot be Weakened or Vulnerable; attacks ignore Block once per turn |
| The Castle's Will | 150 | 13 | Manifestation: spawns a Cursed Statue each time player deals 30+ damage in one turn |

---

## 8. Relic System

Relics provide passive bonuses for the rest of the run. Collected from boss rewards, elites, shops, events, and Magic Doors. Each relic has a tier, floor availability, and source restrictions.

> ⚠ DESIGN NOTE: Relics are not balanced for all characters equally. Some relics are weak or counterproductive for certain characters — this is intentional. Players learn which relics suit their build and skip poor pickups.

### Relic Tiers

| Tier | Available From | Source |
|---|---|---|
| Common | Any floor | Elite reward, Shop, Event |
| Uncommon | Floor 2+ | Elite reward (Floor 2+), Shop, Event |
| Rare | Floor 3+ | Elite only, Magic Door, Boss reward |
| Cursed | Floor 2+ (events only) | Event only — always has a downside |
| Boss | After each floor boss | Boss reward choice only |

---

### Common Relics

| Relic | Effect | Source |
|---|---|---|
| Bloodsoaked Rag | Heal 3 HP after each combat win | Elite reward, Event |
| Iron Vambrace | Start every combat with 6 Block | Shop, Event |
| Rusted Chain | Enemies start combat with 1 Vulnerable | Elite reward, Event |
| Phantom Blade | First attack each combat deals +8 damage | Shop, Event |
| Ivory Die | Your die gains one extra face, becoming a d7. Max roll is now 7. | Shop, Elite reward |
| Ash Pendant | Gain 1 Soul after every battle | Event, Magic Door |
| Cracked Hourglass | Reroll restored at start of every combat | Shop, Event |
| Iron Ration | Heal 5 HP after elite fights | Shop, Event |
| Lucky Rabbit Foot | Once per run, survive a killing blow at 1 HP | Elite reward, Event |
| Tarnished Coin | Gain 5 bonus gold after every combat | Shop, Event |

---

### Uncommon Relics (Floor 2+)

| Relic | Effect | Source |
|---|---|---|
| Torn Page | Draw 1 extra card at the start of every other turn | Floor 2+ Elite, Shop |
| Loaded Gauntlet | Minimum dice roll is always 2 | Floor 2+ Elite, Shop |
| Lucky Coin | Once per turn, if you trigger your affinity, draw 1 card | Floor 2+ Event, Magic Door |
| Bone Dice | When you reroll, result can never be lower than original | Floor 2+ Shop, Elite |
| Grave Robber | Gain 8 Gold after each elite fight | Floor 2+ Event, Shop |
| Gilded Quill | Every 10th card played deals double damage | Floor 2+ Elite only |
| Scholar's Lens | See 1 extra card option on every reward screen | Floor 2+ Shop only |
| Bone Key | Every 4th room has a chance to contain a hidden chest | Floor 2+ Magic Door only |
| Twinned Die | On your initial roll each turn, roll twice and take the higher result. Does not apply to rerolls. | Floor 2+ Elite, Shop |
| Soulbound Tome | Once per turn, if you play 3+ cards, gain 1 Energy | Floor 2+ Shop, Event |

---

### Rare Relics (Floor 3+)

| Relic | Effect | Source |
|---|---|---|
| Philosopher's Stone | Cards that cost 2 or more Energy cost 1 less | Floor 3+ Elite only |
| Cursed Mirror | Start combat with 15 Block but take 5 damage | Floor 3+ Magic Door |
| King's Chalice | Heal 8 HP each time you defeat an elite | Floor 3+ Boss reward |
| Death's Hourglass | Take 3 less damage from all attacks | Floor 3+ Elite only |
| Void Shard | Your first attack each combat can't be blocked | Floor 3+ Magic Door, Elite |
| Crimson Pact | Gain 3 Strength but max HP reduced by 20 | Floor 3+ Event only |
| Ancient Rune | Once per combat, return a played card to hand | Floor 3+ Shop only |
| Shadow Cloak | First hit each combat deals 0 damage (absorbed) | Floor 3+ Boss reward |
| Dragon's Scale | Reflect 3 damage to attacker when hit | Floor 3+ Magic Door |
| Soul Lantern | See one extra room ahead on the path map | Floor 3+ Shop only |

---

### True Ending Relics (Boss Rewards Only)

These four relics are required for the True Ending. One drops from each floor boss reward pool.

| Relic | Floor | Effect |
|---|---|---|
| The Fractured Crown | Floor 1 Boss | In Phase 3 vs. King, your first attack always crits |
| The King's Sword | Floor 2 Boss | In Phase 3 vs. King, deal +15 damage on all attacks |
| The Royal Sigil | Floor 3 Boss | In Phase 3 vs. King, Fading Light deals half damage |
| The Knight's Vow | Floor 4 Boss | Unlocks the 'Use the Relics' option in Phase 3 |

---

## 9. Card System

### Deck Rules
- All characters start with 10 cards (2 Strikes, 2 Defends, 6 class-specific)
- After each combat, choose 1 of 3 card rewards OR skip and take 50 gold
- Cards can be removed at Rest Stops (costs 75 gold), Shops (costs 100 gold), or certain Events
- Upgrades available at Rest Stops (one per stop) or Shops

### Card Types

| Type | Description |
|---|---|
| Attack | Deals damage. May apply status effects. |
| Skill | Non-damage effects: Block, draw, Energy, buffs. |
| Power | Played once. Passive effect for rest of combat. Exhausted on play. |
| Curse | Negative cards added to deck by enemies or events. No cost, no benefit. |

### Card Rarity
Cards in the reward pool are grouped into three rarity tiers. Rarity affects how frequently a card appears as a reward option.

| Rarity | Appearance Rate | Notes |
|---|---|---|
| Common | High | Appears frequently in early and mid floors |
| Uncommon | Medium | Appears from Floor 2 onwards more regularly |
| Rare | Low | Rare drops — high impact, build-defining cards |

All starter deck cards are Common. Reward pool cards are drawn from the character's rarity pool weighted by floor.

### Affinity-Gated Cards
Many character cards have two modes — a base effect and an enhanced effect that only activates when the die result matches the character's affinity on the turn the card is played. Cards always do something useful in base mode. The affinity bonus is a meaningful upgrade, not the only way a card functions.

### Exhaust
Some cards are Exhausted on use — removed from combat for the rest of the fight. Exhausted cards return to the deck at the start of the next combat. Power cards are always Exhausted when played.

### Curse Cards

| Curse | Effect |
|---|---|
| Curse of Weakness | When drawn, lose 1 Energy this turn |
| Curse of Pain | When drawn, take 4 damage |
| Curse of Doubt | When drawn, discard a random card from hand |
| Void Rift | Unplayable. Counts as a card draw blocker. |

---

## 10. Character Card Pools

---

### ⚔️ Barbarian — Full Card Pool

**Design identity:** Heavy consistent hits. Even rolls unlock stronger damage and block values. Self-damage cards enable low-HP payoffs. Three Power cards define the build: Berserker's Oath (damage-to-block), Warlord's Presence (flat damage boost), Rage Fuel (Strength).

**Playtesting flags:** Entrench + Berserker's Oath sustain loop. Death Rattle requires reliable self-damage access — Blood Price (Common) is the safety valve.

#### 🟢 Common (15 cards — 10 starters + 5 reward)

| Key | Name | Type | Cost | Base Effect | Even Roll Effect |
|---|---|---|---|---|---|
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `heavyblow` | Heavy Blow | Attack | 2 | Deal 10 dmg | Deal 16 dmg |
| `heavyblow` | Heavy Blow | Attack | 2 | Deal 10 dmg | Deal 16 dmg |
| `warshout` | War Shout | Skill | 1 | Gain 6 Block | Gain 10 Block |
| `warshout` | War Shout | Skill | 1 | Gain 6 Block | Gain 10 Block |
| `ironbash` | Iron Bash | Attack | 1 | Deal 7 dmg | Deal 7 dmg + Vulnerable 1 |
| `brutalswing` | Brutal Swing | Attack | 1 | Deal 5 dmg twice | Deal 7 dmg twice |
| `shieldbreaker` | Shield Breaker | Attack | 1 | Deal 6 dmg | Deal 6 dmg + remove 5 enemy Block |
| `warcry` | War Cry | Skill | 0 | Gain 3 Block | Gain 3 Block + draw 1 |
| `toughhide` | Tough Hide | Skill | 1 | Gain 7 Block | Gain 11 Block |
| `bloodprice` | Blood Price | Skill | 0 | Lose 5 HP. Draw 2 cards | Lose 3 HP. Draw 2 cards |

#### 🔵 Uncommon (10 cards)

| Key | Name | Type | Cost | Base Effect | Even Roll Effect |
|---|---|---|---|---|---|
| `haymaker` | Haymaker | Attack | 2 | Deal 14 dmg | Deal 20 dmg |
| `skullcrack` | Skull Crack | Attack | 1 | Deal 8 dmg + Weak 1 | Deal 8 dmg + Weak 2 |
| `recklesslunge` | Reckless Lunge | Attack | 1 | Deal 10 dmg, take 3 | Deal 16 dmg, take 3 |
| `battlecry` | Battle Cry | Skill | 1 | Gain 6 Block | Gain 6 Block + draw 2 |
| `ironroar` | Iron Roar | Skill | 0 | Apply Weak 1 to enemy | Apply Weak 2 to enemy |
| `bloodlust` | Blood Lust | Skill | 1 | Heal 4 HP | Heal 8 HP |
| `entrench` | Entrench | Skill | 1 | Gain 8 Block, doesn't reset this turn | Gain 13 Block, doesn't reset this turn |
| `overpowerattack` | Overpower | Attack | 1 | Deal 8 dmg | Deal 8 dmg + Vulnerable 2 |
| `crushingblow` | Crushing Blow | Attack | 2 | Deal 12 dmg + remove 8 enemy Block | Deal 18 dmg + remove 8 enemy Block |
| `warcallecho` | War Call | Skill | 0 | Draw 1 card | Draw 1 + apply Weak 1 to enemy |

#### 🟣 Rare (6 cards)

| Key | Name | Type | Cost | Base Effect | Even Roll Effect |
|---|---|---|---|---|---|
| `berserkersoath` | Berserker's Oath | Power | 2 | Exhausted. Each time you take damage, gain 3 Block | Each time you take damage, gain 5 Block |
| `warlordspresence` | Warlord's Presence | Power | 2 | Exhausted. All attacks +2 dmg this combat | All attacks +4 dmg this combat |
| `ragefuel` | Rage Fuel | Power | 1 | Exhausted. Gain 1 Strength this combat | Gain 2 Strength this combat |
| `deathrattle` | Death Rattle | Attack | 2 | Deal 16 dmg. Only playable below 50% HP | Deal 24 dmg. Only playable below 50% HP |
| `laststand` | Last Stand | Skill | 1 | Gain 10 Block. Below 30% HP: gain 20 | Gain 14 Block. Below 30% HP: gain 28 |
| `battletrance` | Battle Trance | Skill | 1 | Gain 2 Energy. Lose 6 HP | Gain 2 Energy. Lose 4 HP |

---

### 🔮 Mage — Full Card Pool

**Design identity:** Burn and Chill are the two damage tracks. High rolls unlock the stronger version of each card. Frost Fire and Frozen Inferno are the cross-status payoff cards. Powers choose a school: Cold Mastery (Chill as defense) or Burning Soul (Burn as damage multiplier).

**Playtesting flags:** Spell Echo combos with high-roll attacks. Combustion scaling with Burning Soul active.

#### 🟢 Common (14 cards — 10 starters + 4 reward)

| Key | Name | Type | Cost | Base Effect | High Roll Effect |
|---|---|---|---|---|---|
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `frostbolt` | Frost Bolt | Attack | 1 | Deal 5 dmg + 1 ❄️Chill | Deal 9 dmg + 2 ❄️Chill |
| `frostbolt` | Frost Bolt | Attack | 1 | Deal 5 dmg + 1 ❄️Chill | Deal 9 dmg + 2 ❄️Chill |
| `arcanebarrier` | Arcane Shield | Skill | 1 | Gain 4 Block | Gain 9 Block |
| `manasurge` | Mana Surge | Skill | 0 | Next card costs 1 less | — |
| `arcaneboost` | Arcane Boost | Skill | 1 | Discard 1 → +1 to die roll | — |
| `voidchannel` | Void Channel | Skill | 1 | Discard 2 → double die roll. Exhaust | — |
| `spark` | Spark | Attack | 1 | Deal 4 dmg | Deal 7 dmg + 1 🔥Burn |
| `flamtouch` | Flame Touch | Attack | 1 | Deal 5 dmg + 1 🔥Burn | Deal 5 dmg + 3 🔥Burn |
| `meditate` | Meditate | Skill | 1 | Draw 2 | Draw 3 + 1 die |
| `channelfocus` | Channel Focus | Skill | 0 | Gain 1 Energy | — |

#### 🔵 Uncommon (10 cards)

| Key | Name | Type | Cost | Base Effect | High Roll Effect |
|---|---|---|---|---|---|
| `icelance` | Ice Lance | Attack | 1 | Deal 7 dmg | Deal 13 dmg if enemy has ❄️Chill |
| `fireball` | Fireball | Attack | 2 | Deal 9 dmg + 2 🔥Burn | Deal 15 dmg + 4 🔥Burn |
| `combustion` | Combustion | Attack | 1 | Deal 3 dmg + 1 per 🔥Burn stack | Deal 5 dmg + 2 per 🔥Burn stack |
| `chainbolt` | Chain Bolt | Attack | 1 | Deal 5 dmg | Deal 5 dmg, hit twice |
| `ignite` | Ignite | Skill | 1 | Apply 3 🔥Burn | Apply 5 🔥Burn |
| `arcanerecall` | Arcane Recall | Skill | 1 | Return 1 card from discard to hand | Return 2 cards from discard |
| `manaweave` | Mana Weave | Skill | 1 | Next card costs 1 less | Next 2 cards cost 1 less |
| `frostfire` | Frost Fire | Attack | 2 | Deal 10 dmg. Has 🔥Burn: add 2 ❄️Chill. Has ❄️Chill: add 2 🔥Burn | Deal 14 dmg. Apply both effects regardless |
| `arcanebarrage` | Arcane Barrage | Attack | 1 | Deal 3 dmg + 1 per spell played this turn | Deal 5 dmg + 1 per spell played this turn |
| `arcanesight` | Arcane Sight | Skill | 1 | Draw 2 | Draw 3 |

#### 🟣 Rare (6 cards)

| Key | Name | Type | Cost | Base Effect | High Roll Effect |
|---|---|---|---|---|---|
| `frozeninferno` | Frozen Inferno | Attack | 3 | Deal 18 dmg. Consumes all 🔥Burn + ❄️Chill stacks | Deal 26 dmg. Consumes all stacks |
| `inferno` | Inferno | Attack | 2 | Apply 6 🔥Burn | Apply 10 🔥Burn |
| `timewarp` | Time Warp | Skill | 2 | Gain 2 Energy + draw 2 | Gain 2 Energy + draw 3 |
| `spellecho` | Spell Echo | Skill | 1 | Exhaust. Next Attack card you play this turn triggers twice | Exhaust. Next 2 Attack cards you play this turn each trigger twice |
| `coldmastery` | Cold Mastery | Power | 2 | Exhausted. ❄️Chill reduces enemy damage by 2 per stack | ❄️Chill reduces enemy damage by 3 per stack |
| `burningsoul` | Burning Soul | Power | 2 | Exhausted. 🔥Burn deals +1 per stack | 🔥Burn deals +2 per stack |

---

### 🗡️ Thief — Full Card Pool

**Design identity:** Two build paths — Poison stacking and combo chaining. Odd rolls amplify both. Gold is a light secondary reward, not a primary mechanic. Cards should be played in the right sequence — Backstab only works first, Shadow Mark sets up the next card. Harder to master than other characters.

**Playtesting flags:** Blade Dance + Lethal Rhythm + Poison Master. Shadow Artist card cost reduction pattern.

**0-cost cards:** Swift Jab, Slip Away. Keep at 2 maximum additional beyond these.

#### 🟢 Common (15 cards — 10 starters + 5 reward)

| Key | Name | Type | Cost | Base Effect | Odd Roll Effect |
|---|---|---|---|---|---|
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `quickstrike` | Quick Strike | Attack | 1 | Deal 4 dmg twice | Deal 5 dmg twice |
| `quickstrike` | Quick Strike | Attack | 1 | Deal 4 dmg twice | Deal 5 dmg twice |
| `shadowstep` | Shadow Step | Skill | 1 | Gain 4 Block | Gain 7 Block + draw 1 |
| `poisonblade` | Poison Blade | Attack | 2 | Deal 6 dmg | Deal 6 dmg + apply 3 Poison |
| `pickpocket` | Pick Pocket | Skill | 1 | Draw 2 | Draw 2 + gain 5 Gold |
| `smokescreen` | Smoke Screen | Skill | 1 | Gain 6 Block. Discard 1, draw 1 | — |
| `swiftjab` | Swift Jab | Attack | 0 | Deal 3 dmg | Deal 5 dmg |
| `slipaway` | Slip Away | Skill | 0 | Draw 1 card | Draw 1 + gain 3 Block |
| `cheapshot` | Cheap Shot | Attack | 1 | Deal 5 dmg + Weak 1 | Deal 5 dmg + Weak 2 |
| `coinflick` | Coin Flick | Skill | 1 | Gain 4 Gold | Gain 4 Gold + draw 1 |
| `nimblepace` | Nimble Pace | Skill | 1 | Draw 2. Discard 1 | Draw 3. Discard 1 |

#### 🔵 Uncommon (10 cards)

| Key | Name | Type | Cost | Base Effect | Odd Roll Effect |
|---|---|---|---|---|---|
| `envenomdagger` | Envenom | Attack | 1 | Deal 4 dmg + 2 Poison | Deal 4 dmg + 4 Poison |
| `backstab` | Backstab | Attack | 1 | Deal 10 dmg. Only playable as first card this turn | Deal 14 dmg. Only playable as first card this turn |
| `cripple` | Cripple | Skill | 1 | Apply Weak 2 + Vulnerable 1 | Apply Weak 2 + Vulnerable 2 |
| `shadowmark` | Shadow Mark | Skill | 1 | Mark enemy — next attack deals +5 dmg | Mark enemy — next attack deals +8 dmg |
| `poisoncloud` | Poison Cloud | Skill | 1 | Apply 4 Poison | Apply 6 Poison |
| `thiefsgambit` | Thief's Gambit | Attack | 1 | Deal 3 dmg. Draw 1. Gain 5 Gold | Deal 5 dmg. Draw 1. Gain 5 Gold |
| `bladedance` | Blade Dance | Attack | 1 | Deal 3 dmg three times | Deal 4 dmg three times |
| `disappear` | Disappear | Skill | 1 | Gain 6 Block. Next card costs 0 | Gain 8 Block. Next 2 cards cost 0 |
| `concoction` | Concoction | Skill | 1 | Apply 2 Poison. Draw 1 | Apply 3 Poison. Draw 2 |
| `gutpunch` | Gut Punch | Attack | 1 | Deal 4 dmg + 1 Poison | Deal 4 dmg + 2 Poison |

#### 🟣 Rare (6 cards)

| Key | Name | Type | Cost | Base Effect | Odd Roll Effect |
|---|---|---|---|---|---|
| `deathmark` | Death Mark | Skill | 1 | Double current Poison stacks on enemy. Exhaust | Double Poison stacks. Draw 1. Exhaust |
| `shadowartist` | Shadow Artist | Power | 2 | Exhausted. 2nd and 4th card you play each turn cost 0 | Exhausted. 2nd, 3rd and 4th card you play each turn cost 0 |
| `poisonmaster` | Poison Master | Power | 2 | Exhausted. Poison deals +1 dmg per stack | Exhausted. Poison deals +2 dmg per stack |
| `lethalrhythm` | Lethal Rhythm | Power | 1 | Exhausted. Each time you play 2 cards in a turn, deal 3 dmg | Exhausted. Each time you play 2 cards, deal 5 dmg |
| `assassinate` | Assassinate | Attack | 2 | Deal 14 dmg. If enemy has 5+ Poison: deal 22 instead | Deal 18 dmg. If enemy has 5+ Poison: deal 28 instead |
| `goldenstrike` | Golden Strike | Attack | 1 | Deal dmg equal to Gold ÷ 10 (max 15) | Deal dmg equal to Gold ÷ 8 (max 20) |

---

### 🧛 Vampire — Full Card Pool

**Design identity:** Extreme rolls (1 or max) have the lowest trigger rate (~33% on d6) so base effects are strong independently. Extreme bonuses are the biggest single-card swings in the game. Two build paths: Regen sustain (stack Regen, use Eternal Hunger to convert it to damage) or Glass Cannon (spend HP aggressively, use Fly defensively, burst with Soul Rend).

**Playtesting flags:** Blood Bank efficiency in Floor 3-4. Regen soft cap at 10 stacks must be enforced. Blood Tide + Eternal Hunger execute window.

#### 🟢 Common (15 cards — 10 starters + 5 reward)

| Key | Name | Type | Cost | Base Effect | Extreme Roll Effect |
|---|---|---|---|---|---|
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `blooddrain` | Blood Drain | Attack | 1 | Deal 6 dmg | Deal 6 dmg + heal 8 HP |
| `blooddrain` | Blood Drain | Attack | 1 | Deal 6 dmg | Deal 6 dmg + heal 8 HP |
| `nightshroud` | Night Shroud | Skill | 1 | Gain 5 Block | Gain 10 Block |
| `lifeleech` | Life Leech | Attack | 2 | Deal 9 dmg | Deal 9 dmg + drain 12 Block |
| `crimsonbite` | Crimson Bite | Attack | 1 | Deal 5 dmg + 1 Regen | Deal 7 dmg + 3 Regen |
| `darkembrace` | Dark Embrace | Skill | 1 | Lose 4 HP. Gain 8 Block | — |
| `bloodpulse` | Blood Pulse | Skill | 1 | Gain 2 Regen | Gain 4 Regen |
| `draintouch` | Drain Touch | Attack | 1 | Deal 5 dmg | Deal 5 dmg + heal 5 HP |
| `nightveil` | Night Veil | Skill | 1 | Gain 6 Block | Gain 6 Block + 2 Regen |
| `darkblood` | Dark Blood | Skill | 0 | Lose 3 HP. Draw 2 cards | — |
| `swoopdown` | Swoop Down | Skill | 1 | Gain Fly this turn. Damage taken halved | Gain Fly + 4 Block |

#### 🔵 Uncommon (10 cards)

| Key | Name | Type | Cost | Base Effect | Extreme Roll Effect |
|---|---|---|---|---|---|
| `sanguinestrike` | Sanguine Strike | Attack | 1 | Deal 8 dmg + 1 Regen | Deal 10 dmg + 3 Regen |
| `crimsonpact` | Crimson Pact | Skill | 1 | Lose 6 HP. Gain 3 Regen + draw 2 | Lose 4 HP. Gain 5 Regen + draw 2 |
| `bloodbank` | Blood Bank | Skill | 1 | Convert 10 HP into 10 Block | Convert 8 HP into 14 Block |
| `drainlife` | Drain Life | Attack | 2 | Deal 12 dmg. Heal HP equal to half dmg dealt | Deal 12 dmg. Heal HP equal to full dmg dealt |
| `batform` | Bat Form | Skill | 1 | Gain Fly this turn + draw 1 | Gain Fly + draw 2 + 2 Regen |
| `shadowfeast` | Shadow Feast | Attack | 1 | Deal 6 dmg. If Regen active: deal 10 instead | Deal 10 dmg. If Regen active: deal 15 instead |
| `darkrite` | Dark Rite | Skill | 1 | Lose 8 HP. Gain 12 Block + 2 Regen | Lose 5 HP. Gain 16 Block + 3 Regen |
| `bloodrush` | Blood Rush | Skill | 0 | Spend 5 HP. Next attack deals +6 dmg | Spend 3 HP. Next attack deals +9 dmg |
| `nightstalk` | Night Stalk | Attack | 1 | Deal 5 dmg twice | Deal 7 dmg twice + 2 Regen |
| `cursedveins` | Cursed Veins | Skill | 1 | Gain 3 Regen. Next card costs 0 | Gain 5 Regen. Next Skill card costs 0 |

#### 🟣 Rare (6 cards)

| Key | Name | Type | Cost | Base Effect | Extreme Roll Effect |
|---|---|---|---|---|---|
| `bloodlord` | Blood Lord | Power | 2 | Exhausted. Heal 2 HP each time you deal damage | Heal 3 HP each time you deal damage |
| `eternalhunger` | Eternal Hunger | Power | 2 | Exhausted. Each Regen tick also deals 2 dmg to enemy | Each Regen tick deals 3 dmg to enemy |
| `vampiricform` | Vampiric Form | Power | 2 | Exhausted. Fly activates automatically on turns you roll 1 or max | Fly activates + gain 3 Regen on those turns |
| `darkascension` | Dark Ascension | Skill | 2 | Lose 15 HP. Gain 20 Block + 5 Regen | Lose 10 HP. Gain 28 Block + 7 Regen |
| `soulrend` | Soul Rend | Attack | 2 | Deal 15 dmg. Heal HP equal to dmg dealt | Deal 22 dmg. Heal HP equal to dmg dealt |
| `bloodtide` | Blood Tide | Skill | 1 | Exhaust. Double current Regen stacks | Exhaust. Double Regen + heal 5 HP |

---

### 🎲 Gambler — Full Card Pool

**Design identity:** Cards read the actual die value — the number matters, not just a yes/no affinity check. Min roll is always 2 (never rolls a 1). Max roll = lucky streak state. Three build paths: High Roller (manipulate toward max, stack max-roll payoffs), Consistency (keep die in 3-5, medium-roll cards), Chaos (embrace variance, Double or Nothing).

**Playtesting flags:** Risk Taker + Lucky Streak Power chain. Gold accumulation into Betting It All. Die-setting once-per-turn rule must be enforced.

**Design rules specific to Gambler:**
- Cards read actual die value, not yes/no affinity
- Die can only be set to a specific value once per turn
- Energy cannot be affinity gated

#### 🟢 Common (15 cards — 10 starters + 5 reward)

| Key | Name | Type | Cost | Base Effect | Max Roll Effect |
|---|---|---|---|---|---|
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `strike` | Strike | Attack | 1 | Deal 6 dmg | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `defend` | Defend | Skill | 1 | Gain 5 Block | — |
| `highorlow` | High or Low | Attack | 1 | Roll 4-6: deal 12. Roll 2-3: deal 5 | — |
| `highorlow` | High or Low | Attack | 1 | Roll 4-6: deal 12. Roll 2-3: deal 5 | — |
| `doubldown` | Double Down | Skill | 0 | Flip: double roll or drop to 2 | — |
| `luckystrike` | Lucky Strike | Attack | 2 | Deal 8 dmg | Deal 20 dmg |
| `hedgebet` | Hedge Bet | Skill | 1 | Gain Block equal to current roll | Gain Block equal to roll × 2 |
| `wildcard` | Wild Card | Attack | 1 | Deal dmg equal to roll × 2 | Deal dmg equal to roll × 3 |
| `longshot` | Long Shot | Attack | 1 | Roll 4-6: deal 10. Roll 2-3: deal 4 | Deal 16 dmg |
| `safepull` | Safe Pull | Skill | 1 | Gain 4 Block. Set die to 4 (once per turn) | Gain 6 Block. Set die to 5 (once per turn) |
| `risktaker` | Risk Taker | Skill | 0 | Reroll die. Draw 1 card | Reroll die. Draw 2 cards |
| `oddscheck` | Odds Check | Skill | 1 | Draw 2. If roll is 4+: draw 3 instead | Draw 3. Gain 5 Gold |
| `chipsin` | Chips In | Skill | 1 | Gain 5 Gold | Gain 5 Gold + draw 1 |

#### 🔵 Uncommon (10 cards)

| Key | Name | Type | Cost | Base Effect | Max Roll Effect |
|---|---|---|---|---|---|
| `allin` | All In | Attack | 2 | Deal dmg equal to roll × 4 | Deal dmg equal to roll × 5 |
| `loadeddie` | Loaded Die | Skill | 1 | Set die to any value 3-5 (once per turn) | Set die to any value 3-6 (once per turn) |
| `pocketaces` | Pocket Aces | Skill | 1 | Next attack deals +roll dmg | Next attack deals +(roll × 2) dmg |
| `doubleornothing` | Double or Nothing | Attack | 1 | Deal 6 dmg. 50/50: deal 14 or take 6 dmg | Deal 6 dmg. 50/50: deal 20 or take 3 dmg |
| `counttheodds` | Count the Odds | Skill | 0 | Look at top 2 cards. Keep 1 discard 1 | Look at top 3 cards. Keep 2 discard 1 |
| `highstakes` | High Stakes | Skill | 1 | Gain Gold equal to roll × 3 | Gain Gold equal to roll × 5 |
| `bluff` | Bluff | Skill | 1 | Apply Weak 2 to enemy | Apply Weak 2 + Vulnerable 1 to enemy |
| `wildcardcombo` | Wild Combo | Attack | 1 | Deal 3 dmg. Draw 1. Reroll die | Deal 5 dmg. Draw 2. Reroll die |
| `pressyourluck` | Press Your Luck | Attack | 2 | Deal 10 dmg. Reroll — if higher deal 6 more | Deal 14 dmg. Reroll — if higher deal 10 more |
| `jackpot` | Jackpot | Skill | 1 | Gain Gold equal to roll × 4. Exhaust | Gain 40 Gold. Exhaust |

#### 🟣 Rare (6 cards)

| Key | Name | Type | Cost | Base Effect | Max Roll Effect |
|---|---|---|---|---|---|
| `houseedge` | House Edge | Power | 2 | Exhausted. Min die roll raised to 3 this combat | Min die roll raised to 4 this combat |
| `luckystreak` | Lucky Streak | Power | 1 | Exhausted. Each max roll draws 1 card | Each max roll draws 1 card + deals 4 dmg |
| `gamblersfallacy` | Gambler's Fallacy | Power | 2 | Exhausted. After 3 non-max rolls in a row, next roll is guaranteed max | After 2 non-max rolls, next roll is guaranteed max |
| `bettingitall` | Betting It All | Attack | 3 | Deal dmg equal to Gold ÷ 5 (max 30). Exhaust | Deal dmg equal to Gold ÷ 4 (max 40). Exhaust |
| `loadedhouse` | Loaded House | Skill | 1 | Exhaust. Next 2 dice rolls are automatically max | Exhaust. Next 3 dice rolls are automatically max |
| `devilsdeal` | Devil's Deal | Skill | 1 | Gain 3 Energy. Lose Gold equal to roll × 10. Min cost 1 | Gain 3 Energy. Lose Gold equal to roll × 5. Min cost 1 |

---

## 11. Global Design Rules

These rules govern card and system design across all characters. They were established during card pool development and must be respected when adding new cards or systems.

**Energy rules:**
- Cards that generate Energy have flat fixed values
- Affinity rolls cannot modify Energy gain
- Draw effects may still be affinity-gated

**Combat rules:**
- All combat is single-target — no AoE cards
- Regen has a hard cap of 10 stacks

**Dice rules:**
- Die can only be set to a specific value once per turn
- Twinned Die relic applies to initial roll only, not rerolls
- Gambler cards read actual die value, not yes/no affinity

**Card cost rules:**
- Shadow Artist card cost reductions cannot reduce cards below 1 Energy (Philosopher's Stone applies separately)
- Devil's Deal has a minimum cost of 1 Energy regardless of discounts

---

## 12. Event System

Events are randomized room encounters with choices. Each event has 2-3 options with meaningful trade-offs. Some events can add curse cards to your deck.

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
| Soul Market — +5 max HP | 3 Souls |

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
| Chaos Potion | Apply random status to enemy (Poison, Burn, Weak, or Vulnerable) | Event, Magic Door | Floor 3+ |

---

## 15. Meta Progression

Between runs, Souls are spent on permanent upgrades. The Soul tree is organized in 3 branches.

### Soul Tree Branches

**Power Branch**
- Start each run with +5 max HP (Cost: 2 Souls)
- Start each run with +1 Energy on turn 1 (Cost: 3 Souls)
- Starter deck includes 1 additional class card (Cost: 4 Souls)

**Knowledge Branch**
- See room types 1 room ahead on the path (Cost: 2 Souls)
- Shop shows 1 extra item per visit (Cost: 3 Souls)
- Card rewards show 4 options instead of 3 (Cost: 5 Souls)

**Fortune Branch**
- Start each run with 30 bonus gold (Cost: 2 Souls)
- Elite fights drop 1 consumable in addition to normal reward (Cost: 3 Souls)
- Once per run, reroll a relic choice for free (Cost: 4 Souls)

⚠ TBD: Full Soul tree to be expanded in future update

---

## 16. Open Design Questions

### Story
- ⚠ TBD: Names and lore for Companions 2, 3, and 4 (floor bosses)
- ⚠ TBD: Sir Crimson's full backstory — who was he before the castle took him?

### Gameplay
- ⚠ TBD: Card upgrade effects for all cards (upgraded versions not yet defined)
- ⚠ TBD: Balancing — enemy HP and damage values need playtesting
- ⚠ TBD: Boss debuff system (Balatro-style carry-forward debuffs) — designed, not implemented

### Systems
- ⚠ TBD: Full Soul meta-progression tree (branches outlined, details TBD)
- ⚠ TBD: Magic Door exclusive event pool — designed, not built
- ⚠ TBD: Consumable inventory UI and interaction

### Platform / Technical
- ⚠ TBD: Mobile white screen fix on local Chrome file
- ⚠ TBD: Deck color theming per character
- ⚠ TBD: Background art per floor (dungeon, crypt, library, throne room)

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

## UI PRIORITIES (VERY IMPORTANT)
- Combat area is the main focus of the screen
- Player and enemy must always be visible and aligned
- Health bars must always be visible and readable
- Dice panel must NOT dominate screen space
- Mobile layout should feel like desktop (landscape style)
- Important stats (HP, Block) should never be hidden

## CODE RULES
- Do NOT break existing combat logic
- Prefer small targeted changes over full rewrites
- Keep functions readable and modular
- Avoid introducing unnecessary complexity

## CURRENT KNOWN ISSUES
- Dice panel too large on mobile
- Player/enemy alignment issues
- Defense stat visibility is weak
- UI layout needs restructuring for clarity
