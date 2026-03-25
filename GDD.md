# CASTLE RUN — Game Design Document
⚔
CASTLE RUN
Game Design Document  —  v0.7
Turn-based deck-building roguelite
Save your companions. Storm the castle. Free the king.
1. Vision & Story
Design Goal
Castle Run is a gothic deck-building roguelite where a band of five heroes storms a cursed castle to break an ancient curse and free a corrupted king. The game blends strategic turn-based card combat with a layered mystery that unfolds across multiple runs. Every floor boss is a fallen friend — or something wearing their face. Every Core collected brings the player closer to the truth.
The experience should feel like Castlevania in tone: dark atmosphere, escalating dread, a castle that grows more dangerous with every floor. But the emotional core is personal — you are not just fighting monsters, you are uncovering a tragedy one piece at a time.
The Castle
The castle is not just a place — it is alive. It feeds on grief, despair, and broken bonds. It has corrupted rulers before King Aldric Ashborne and will continue to do so unless destroyed. The castle is the true villain of Castle Run. The king is its victim.
King Aldric Ashborne
Aldric Ashborne was once a just and beloved ruler. His kingdom prospered under his care. When a plague swept through his lands he gave everything — his treasury, his health, his peace of mind — to save his people. The castle found him at his lowest and offered him power in exchange for his soul.
He accepted. He thought he was saving his kingdom. He was wrong. Now he rules from a throne of stone, a puppet for an ancient evil, trapped inside a body he can no longer control. He is both the king you came to save and the final boss you must defeat.
The Story
Five heroes answer the call to storm Castle Ashborne. Before they reach the gates, the castle acts: it captures four of them, pulling each into a different floor, corrupting them into something that wears their face.
You play as the fifth hero — the one who made it through. Floor by floor you fight your way up, facing corrupted versions of your companions as floor bosses. Defeating them doesn’t kill them — it releases the Core they were carrying, a fragment of their true self.
With all four Cores, you face King Aldric Ashborne himself. What happens next depends on whether you’ve uncovered the truth — or simply fought your way to the top.
The Two Endings
Normal Ending — The Slayer
Defeat King Aldric without all four True Ending Relics. You kill the king and break the castle’s hold on him. The castle crumbles. Your companions are freed but changed. The kingdom survives, but without its king.
True Ending — The Liberator
Collect all four True Ending Relics (The Fractured Crown, The King’s Sword, The Royal Sigil, The Knight’s Vow) and defeat King Aldric. In Phase 3, instead of killing him you use the relics to shatter the castle’s hold on his soul. Aldric is freed. The castle is destroyed. The king lives.
2. Game Overview
Core Loop
Choose a character and enter the castle
Navigate a path of rooms across 4 floors
Fight enemies with your deck of cards, aided by your dice
Collect rewards — cards, relics, gold, consumables
Face the corrupted floor boss and collect their Core
Reach the King and determine the ending
Platform
Web browser (HTML/CSS/JS). Designed for mobile-first play — playable in landscape or portrait on phone. Keyboard support for desktop.
Visual Style
Dark gothic aesthetic. Inspired by Castlevania and Slay the Spire. Character art is hand-illustrated with transparent backgrounds. Combat is side-view: player on the left, enemy on the right. Floor backgrounds shift in tone per floor — dungeon, crypt, throne antechamber, throne room.
Characters (5 total)
Character
Dice Affinity
Playstyle
Barbarian
Odd rolls
High-damage burst, risk/reward
Mage
High rolls (5-6)
Scaling spell damage, card synergy
Thief
Low rolls (1-2)
Poison, combo chains, evasion
Vampire
Even rolls
Life steal, self-damage, drain
Gambler
Any roll (doubles)
RNG manipulation, high variance
3. Path & Floor System
Floor Structure
4 floors total
Each floor has 3 paths — shown at floor start as icons only (no room preview)
Pick one path and commit — no switching
6-8 rooms per path, scales with floor depth
1-2 convergence points per floor where paths share a room
Room Types
Room
Icon
Description
Visibility
Battle
⚔
Standard enemy fight
Always shown
Elite
☠
Harder enemy, better reward
Always shown
Rest
🔥
Heal HP or upgrade a card
Always shown
Shop
💰
Buy cards, relics, consumables
Always shown
Event
?
Random event with choices
Hidden on Floor 3-4
Magic Door
🪄
High risk / high reward mystery
Always hidden
Magic Door System
The Magic Door is the only room where a second door appears. It always has a catch. Possible events include:
Map Blind Curse — you can’t see room icons for the rest of the floor
Locked Door — you must pay 30 gold to continue through
Burning Door — take 15 damage to pass, gain a powerful relic on the other side
Sealed Door — requires a specific relic to open; reward scales with rarity
Mirror Door — face a shadowed version of yourself for 1 round
Mirror Mechanic
At approximately 60% through each path, a Mirror Room appears. The castle shows you a reflection of what you’ve built. The Mirror fight uses a shadow copy of your deck and dice — a skill check on your own build.
Floor Themes & Boss
Floor
Theme
Boss (Corrupted Companion)
Enemy Aesthetic
1
Castle Dungeon
Sir Crimson (Mimic Knight)
Guards, dungeon creatures
2
Crypt
Companion 2
Undead, skeletons, wraiths
3
Forbidden Library
Companion 3
Arcane constructs, dark scholars
4
Throne Room
Companion 4
Elite castle guards, demons
4. Combat System
Turn Structure
Player draws 5 cards at the start of their turn
Player rolls their active die (result affects affinity bonuses)
Player plays cards spending Energy (3 Energy per turn base)
Player ends turn — unused cards are discarded, enemy acts
Repeat until combat ends
Energy
Players start each turn with 3 Energy. Cards cost 0, 1, or 2 Energy. Unused Energy does not carry over. Some relics and cards modify max Energy or carry-over rules.
Block System
Player block resets to 0 at the start of each enemy turn
Enemy block is persistent — must be broken through over multiple turns
Block absorbs damage before HP
Dice System
Each character has one active die. At the start of their turn they roll it. If the result matches their affinity, Cards gain enhanced effects when played.
Players get 1 reroll per turn.
Reroll resets at the start of each player turn. Some relics grant additional rerolls.
Character
Affinity
Bonus Effect
Barbarian
Even (2, 4, 6)
+3 damage on all attacks this turn
Mage
High (5–6)
Next spell costs 0 Energy
Thief
Odd (1, 3, 5)
Apply 1 extra Poison stack on next attack
Vampire
Extreme (1 or max)
Heal 2 HP on next drain effect
Gambler
Roll-based
Draw 1 extra card; reroll restored
Status Effects
Status
Type
Effect
Clears
Poison
DoT
Deals N damage at end of enemy turn, then N-1 (stacking)
Fades by 1 per turn
Burn
DoT
Deals N damage at start of player turn
Fades by 1 per turn
Weak
Debuff
Target deals 25% less damage
Lasts 2 turns
Vulnerable
Debuff
Target takes 25% more damage
Lasts 2 turns
Rage
Buff
Player deals +2 damage per stack
Cleared on turn end
Strength
Buff
Permanent +N damage to all attacks
Permanent until combat ends
Power Cards
Power cards are played once and stay in the combat zone. They provide ongoing passive effects for the rest of the fight. When played, they are exhausted — removed from the deck for this combat only. They do not go to the discard pile.
5. Characters & Starter Decks
All characters share these baseline cards:
Strike — Deal 6 damage (Cost: 1)
Defend — Gain 5 Block (Cost: 1)
Barbarian
Field
Detail
Dice Affinity
Even rolls (2, 4, 6)
Affinity Bonus
Cards gain stronger damage or defensive values on even rolls
Playstyle
Heavy, consistent hits with powerful enhanced effects on strong rolls
Starter Deck
2x Strike, 2x Defend, Cleave (3 damage to all enemies, Cost 1), War Cry (gain 2 Rage, Cost 0), Reckless Charge (deal 14 dmg, take 4, Cost 1), Brace (gain 8 Block if HP below 50%, Cost 1)
Boss Form
Siege Tyrant — enrages at 50% HP, gains +4 Strength, attacks twice per turn
Mage
Field
Detail
Dice Affinity
High rolls (5 or 6)
Affinity Bonus
Spells gain enhanced effects (more damage, stronger status, or additional draw)
Playstyle
Flexible spellcasting with strong scaling on high rolls
Starter Deck
2x Strike, 2x Defend, Arcane Bolt (deal 8 magic dmg, Cost 1), Mana Shield (gain 6 Block + 1 Energy, Cost 1), Surge (next card costs 0, Cost 0), Frost Touch (deal 5 dmg + Weak 2, Cost 1)
Boss Form
Void Scholar — copies your last card played each turn as a counter-spell
Thief
Field
Detail
Dice Affinity
Odd (1, 3, 5)
Affinity Bonus
Cards trigger combo bonuses on odd rolls (extra hits, draw, or poison)
Playstyle
Poison DoT, combo chains, evasion
Starter Deck
2x Strike, 2x Defend, Shiv (deal 4 dmg 2 times, Cost 1), Smoke Bomb (gain 4 Block + Weak enemy 1 turn, Cost 1), Envenom (apply 3 Poison, Cost 1), Quick Hands (draw 2 cards, Cost 0)
Boss Form
Shadow Phantom — gains stealth every other turn (immune to damage while in stealth)
Vampire
Field
Detail
Dice Affinity
Extreme (1 or max)
Affinity Bonus
Cards gain lifesteal or enhanced effects on extreme rolls
Playstyle
Life steal, self-damage for power, drain mechanics
Starter Deck
2x Strike, 2x Defend, Drain (deal 6 dmg + heal 4 HP, Cost 1), Blood Pact (lose 5 HP gain 2 Energy, Cost 0), Crimson Veil (gain 5 Block, Cost 0), Hungering Strike (deal 10 dmg if you have <50% HP, Cost 1)
Boss Form
The Eternal — heals 10 HP every turn; must be burst down
Gambler
Field
Detail
Dice Affinity
Roll-based
Affinity Bonus
Cards scale based on roll thresholds and manipulation
Playstyle
High variance, RNG manipulation, bonus effects
Starter Deck
2x Strike, 2x Defend, Lucky Shot (deal 3-12 dmg randomly, Cost 1), Double Down (next card plays twice, Cost 1), Fold (discard hand draw 4 new cards, Cost 0), Hedge Your Bets (gain 3 Block per card in hand, Cost 1)
Boss Form
The House — forces you to choose between two random harmful effects each turn
6. Floor Bosses
Sir Crimson — Floor 1 Boss (The Mimic Knight)
Sir Crimson is not one of your companions. He is the castle’s enforcer — a knight whose soul was consumed long ago and replaced with something ancient. He mimics the form of whoever the castle last consumed, which makes him look familiar but wrong.
Phase 1: The Impostor (HP: 120)
Ability: Mimic — copies the last card you played and uses it against you next turn
Attack: Shield Bash — deals 8 damage and applies Weak for 2 turns
Threshold: At 0 HP, the knight’s mask shatters
Phase 2: The True Knight (HP: 80)
Ability: Iron Will — gains 10 persistent Block at the start of each turn
Attack: Crimson Cleave — deals 12 damage to player and removes 5 Block
Reward: Boss relic choice + 80 gold + full HP restore
King Aldric Ashborne — Final Boss
The king fights in three phases. Each phase has its own HP pool. All four Cores must be collected to unlock the throne room door.
Phase 1: The Corrupted King (HP: 250)
Aldric sits on the throne, eyes glowing purple, surrounded by castle stone. He uses the Castle to shield himself. Defense and attrition.
Ability: Stone Heart — starts with 50 Persistent Block. Gains 10 Block every time you roll an Even number
Attack: Grieving Ground — deals 15 damage and adds one Curse of Weakness to your discard pile
Threshold: At 0 HP, the Castle armor shatters
Phase 2: The Shattered Ruler (HP: 200)
The throne shatters. Aldric stands, wielding a fractured blade, moving erratically. Aggression and chaos.
Ability: Memory Leech — every 3rd turn, your dice affinity bonus is disabled for that turn
Attack: Fractured Strike — deals 8 damage 3 times. Doubles if you have Poison or Burn stacks
Ability: Desperation — gains 2 Strength for every Power card you have exhausted this combat
Ability: Dice Curse — your die result is inverted (roll a 6, it becomes a 1) every other turn
Phase 3: The Soul’s Burden (HP: 150)
The corruption bleeds out. He looks human but is being crushed by shadow. A race to survive until the end.
Ability: Fading Light — at the start of each of your turns, you lose 5 HP (the castle is consuming him)
Attack: Final Decree — deals 20 damage and silences your highest-cost card for 1 turn
True Ending Trigger — if all 4 True Ending Relics are held, a special action appears at 50 HP: Use the Relics. This ends Phase 3 without dealing the killing blow and triggers the True Ending.
7. Enemy Roster
All HP and damage values are starting points subject to playtesting.
Floor 1 — Castle Dungeon
Easy Pool (First 2 battles only)
Enemy
HP
Damage
Special Ability
Castle Guard
28
6
None
Dungeon Rat
18
4
Scurry: 50% chance to dodge attacks
Stone Imp
22
5
None
Standard Pool
Enemy
HP
Damage
Special Ability
Armored Guard
40
9
Shield Up: gains 8 Block every other turn
Dungeon Hound
32
11
Frenzy: attacks twice if below 50% HP
Cursed Statue
45
7
Petrify: applies Weak to player on hit
Skeleton Archer
28
8
Range: always attacks from a safe distance, ignores Block once
Floor 1 Elites
Enemy
HP
Damage
Special Ability
Dungeon Warden
70
13
Lockdown: prevents card draw for 1 turn if hit with same card twice
Armored Knight
80
10
Unbreakable: gains 15 persistent Block on turns 1 and 3
Floor 2 — Crypt
Standard Pool
Enemy
HP
Damage
Special Ability
Skeleton Warrior
45
10
Undying: revives once at 1 HP when killed
Crypt Wraith
38
12
Phase: immune to damage every other turn
Bone Archer
35
9
Volley: attacks 2 times if player has no Block
Grave Crawler
50
8
Burrow: gains 6 Block after each attack it makes
Floor 2 Elites
Enemy
HP
Damage
Special Ability
Death Knight
95
14
Soul Drain: steals 1 Energy from player on every attack
Bone Golem
110
11
Collapse: when broken below 50% HP, deals 20 damage to player
Floor 3 — Forbidden Library
Standard Pool
Enemy
HP
Damage
Special Ability
Dark Scholar
50
11
Counterspell: if player plays 2+ cards in one turn, reflects 5 damage
Arcane Construct
65
9
Overload: builds up energy and unleashes 25 damage on turn 4
Cursed Knight
58
13
Hexed Blade: applies random debuff (Weak or Vulnerable) on hit
Tome Guardian
70
10
Knowledge: gains +2 Strength per Power card the player has active
Floor 3 Elites
Enemy
HP
Damage
Special Ability
Void Summoner
90
12
Summon: adds a Bone Archer to the fight at 50% HP
Ancient Lich
120
15
Phylactery: gains 20 Block when dropping below 40 HP; destroys 1 card in your deck
Floor 4 — Throne Room
Standard Pool
Enemy
HP
Damage
Special Ability
Royal Guard
70
14
Loyalty: gains 10 Block when the king’s HP drops below 50% (in boss fight only)
Corrupted Paladin
80
12
Holy Wrath: deals double damage if player has any curses in deck
Shadow Demon
60
16
Umbral Step: moves to a shadow form, untargetable for 1 turn before attacking
Castle Shade
55
13
Drain Essence: heals 8 HP per successful hit
Floor 4 Elites
Enemy
HP
Damage
Special Ability
The Forsaken Champion
130
16
Unrelenting: cannot be Weakened or Vulnerable; attacks ignore Block once per turn
The Castle’s Will
150
13
Manifestation: spawns a Cursed Statue each time player deals 30+ damage in one turn
8. Relic System
Relics provide passive bonuses for the rest of the run. Collected from boss rewards, elites, shops, events, and Magic Doors. Each relic has a tier, floor availability, and source restrictions.
Relic Tiers
Tier
Available From
Source
Common
Any floor
Elite reward, Shop, Event
Uncommon
Floor 2+
Elite reward (Floor 2+), Shop, Event
Rare
Floor 3+
Elite only, Magic Door, Boss reward
Cursed
Floor 2+ (events only)
Event only — always has a downside
Boss
After each floor boss
Boss reward choice only
Common Relics
Relic
Effect
Source
Bloodsoaked Rag
Heal 3 HP after each combat win
Elite reward, Event
Iron Vambrace
Start every combat with 6 Block
Shop, Event
Rusted Chain
Enemies start combat with 1 Vulnerable
Elite reward, Event
Phantom Blade
First attack each combat deals +8 damage
Shop, Event
Ivory Die
Add one d8 to your dice pool
Shop, Elite reward
Ash Pendant
Gain 1 Soul after every battle
Event, Magic Door
Cracked Hourglass
Reroll restored at start of every combat
Shop, Event
Iron Ration
Heal 5 HP after elite fights
Shop, Event
Lucky Rabbit Foot
Once per run, survive a killing blow at 1 HP
Elite reward, Event
Tarnished Coin
Gain 5 bonus gold after every combat
Shop, Event
Uncommon Relics (Floor 2+)
Relic
Effect
Source
Torn Page
Draw 1 extra card at start of each turn
Floor 2+ Elite, Shop
Loaded Gauntlet
Minimum dice roll is always 2
Floor 2+ Elite, Shop
Lucky Coin
If you roll your affinity number exactly, draw 1 card
Floor 2+ Event, Magic Door
Bone Dice
When you reroll, result can never be lower than original
Floor 2+ Shop, Elite
Grave Robber
Gain 8 Gold after each elite fight
Floor 2+ Event, Shop
Gilded Quill
Every 10th card played deals double damage
Floor 2+ Elite only
Scholar’s Lens
See 1 extra card option on every reward screen
Floor 2+ Shop only
Bone Key
Every 4th room has a chance to contain a hidden chest
Floor 2+ Magic Door only
Twinned Die
Roll twice, take the higher result
Floor 2+ Elite, Shop
Soulbound Tome
Gain 1 Energy when you play 3+ cards in one turn
Floor 2+ Shop, Event
Rare Relics (Floor 3+)
Relic
Effect
Source
Philosopher’s Stone
Every card costs 1 less Energy (min 0)
Floor 3+ Elite only
Cursed Mirror
Start combat with 15 Block but take 5 damage
Floor 3+ Magic Door
King’s Chalice
Heal 8 HP each time you defeat an elite
Floor 3+ Boss reward
Death’s Hourglass
Take 3 less damage from all attacks
Floor 3+ Elite only
Void Shard
Your first attack each combat can’t be blocked
Floor 3+ Magic Door, Elite
Crimson Pact
Gain 3 Strength but max HP reduced by 20
Floor 3+ Event only
Ancient Rune
Once per combat, return a played card to hand
Floor 3+ Shop only
Shadow Cloak
First hit each combat deals 0 damage (absorbed)
Floor 3+ Boss reward
Dragon’s Scale
Reflect 3 damage to attacker when hit
Floor 3+ Magic Door
Soul Lantern
See one extra room ahead on the path map
Floor 3+ Shop only
True Ending Relics (Boss rewards only)
These four relics are required for the True Ending. One drops from each floor boss reward pool.
Relic
Floor
Effect
The Fractured Crown
Floor 1 Boss
In Phase 3 vs. King, your first attack always crits
The King’s Sword
Floor 2 Boss
In Phase 3 vs. King, deal +15 damage on all attacks
The Royal Sigil
Floor 3 Boss
In Phase 3 vs. King, Fading Light deals half damage
The Knight’s Vow
Floor 4 Boss
Unlocks the ‘Use the Relics’ option in Phase 3
9. Card System
Deck Rules
All characters start with 10 cards (2 Strikes, 2 Defends, 6 class-specific)
After each combat, choose 1 of 3 card rewards OR skip and take 50 gold
Cards can be removed at Rest Stops (costs 75 gold), Shops (costs 100 gold), or certain Events
Upgrades available at Rest Stops (one per stop) or Shops
Card Types
Type
Description
Attack
Deals damage. May apply status effects.
Skill
Non-damage effects: Block, draw, Energy, buffs.
Power
Played once. Passive effect for rest of combat. Exhausted on play.
Curse
Negative cards added to deck by enemies or events. No cost, no benefit.
Curse Cards
Curse
Effect
Curse of Weakness
When drawn, lose 1 Energy this turn
Curse of Pain
When drawn, take 4 damage
Curse of Doubt
When drawn, discard a random card from hand
Void Rift
Unplayable. Counts as a card draw blocker.
10. Event System
Events are randomized room encounters with choices. Each event has 2-3 options with meaningful trade-offs. Some events can add curse cards to your deck.
Sample Events
Event
Options
The Old Prisoner
Free them (+relic, risk) | Leave (nothing) | Take their food (+heal, they stay)
The Merchant’s Ghost
Buy a cursed relic (powerful + downside) | Ignore | Rob them (gold + Curse of Doubt)
Abandoned Laboratory
Drink the potion (+random effect) | Take the notes (card upgrade) | Leave
The Shrine of Ash
Offer HP (gain powerful card) | Offer gold (heal HP) | Destroy shrine (random relic)
The Crying Statue
Comfort it (gain relic) | Smash it (gold + Curse of Pain) | Ignore
The Trapped Knight
Help them (battle) | Leave | Give them a relic (they give info)
The Whispering Walls
Listen (see boss moveset hint) | Ignore | Shout back (take 8 damage, get extra relic)
The Gambler’s Dice
Bet 50 gold (win 100 or lose it) | Pass | Ask for tip (costs 20 gold)
The Bloodied Altar
Sacrifice HP (gain 2 Power cards) | Leave | Smash (Curse of Weakness added)
The Starving Wolf
Feed it (becomes your ally for 1 battle) | Fight it | Ignore
The Locked Chest
Force it open (fight a trap) | Leave | Use a key relic (free loot)
The Portrait Gallery
Study the portraits (lore + hint) | Burn them (gold) | Take one (cursed relic)
The Broken Clock
Wind it (+1 card draw next battle) | Smash it (gold) | Leave
The Cellar of Bottles
Drink one (random buff/debuff) | Take them all (3 consumables) | Leave
The Prisoner’s Letter
Read it (hint about floor boss) | Burn it (gold) | Deliver it (bonus in next event)
The Cracked Mirror
Touch it (enter a 1-round mirror fight) | Leave | Shatter it (random relic)
The Sleeping Shade
Wake it (fight for a rare relic) | Sneak past (nothing) | Leave offering (common relic)
The Soul Market
Buy a soul (permanent +5 max HP, costs 3 Souls) | Sell a card (50 gold) | Leave
11. Economy
Currencies
Currency
Earned By
Resets?
Used For
Gold
Combat wins, events, selling, bosses
Yes — resets each run
Shop purchases, card removal, upgrades
Souls
Ash Pendant relic, Soul Market event, run completion
No — permanent
Meta-progression upgrades between runs
Gold Income (Approximate)
Source
Amount
Standard battle win
15-25 gold
Elite battle win
30-45 gold
Floor boss win
80 gold + full HP restore
Selling a card at shop
25 gold
Event rewards
20-60 gold (varies)
Skipping card reward
50 gold
Gold Sinks
Purchase
Cost
Buy a card (shop)
50-100 gold
Buy a relic (shop)
80-150 gold
Buy a consumable
30-60 gold
Remove a card (rest stop)
75 gold
Remove a card (shop)
100 gold
Upgrade a card (shop)
80 gold
Soul Market — +5 max HP
3 Souls
12. Consumables
One-time use items consumed during combat or from inventory. Carry up to 3 at a time.
Consumable
Effect
Available From
Floor
Health Potion
Heal 20 HP
Shop, Event
Any
Smoke Vial
Apply Weak to all enemies for 2 turns
Shop, Event
Any
Fire Flask
Apply 4 Burn to target enemy
Shop, Elite reward
Any
Poison Vial
Apply 5 Poison to target enemy
Shop, Elite reward
Any
Energy Crystal
Gain 2 Energy this turn
Shop, Magic Door
Floor 2+
Scroll of Draw
Draw 3 cards immediately
Shop, Event
Any
Dice Stabilizer
Lock your die at its current result for 2 turns
Shop, Magic Door
Floor 2+
Gold Pouch
Gain 40 gold instantly
Event, Magic Door
Any
Block Stone
Gain 15 Block immediately
Shop, Event
Any
Chaos Potion
Apply random status to all enemies (Poison, Burn, Weak, or Vulnerable)
Event, Magic Door
Floor 3+
13. Meta Progression
Between runs, Souls are spent on permanent upgrades. The Soul tree is organized in 3 branches.
Soul Tree Branches
Power Branch
Start each run with +5 max HP (Cost: 2 Souls)
Start each run with +1 Energy on turn 1 (Cost: 3 Souls)
Starter deck includes 1 additional class card (Cost: 4 Souls)
Knowledge Branch
See room types 1 room ahead on the path (Cost: 2 Souls)
Shop shows 1 extra item per visit (Cost: 3 Souls)
Card rewards show 4 options instead of 3 (Cost: 5 Souls)
Fortune Branch
Start each run with 30 bonus gold (Cost: 2 Souls)
Elite fights drop 1 consumable in addition to normal reward (Cost: 3 Souls)
Once per run, reroll a relic choice for free (Cost: 4 Souls)
⚠ TBD: Full Soul tree to be expanded in future update
14. Open Design Questions
Story
⚠ TBD: Names and lore for Companions 2, 3, and 4 (floor bosses)
⚠ TBD: Sir Crimson’s full backstory — who was he before the castle took him?
Gameplay
⚠ TBD: Exact card list for all 5 characters beyond starter decks
⚠ TBD: Card upgrade effects for all 58 cards
⚠ TBD: Balancing — enemy HP and damage values need playtesting
⚠ TBD: Boss debuff system (Balatro-style carry-forward debuffs) — designed, not implemented
Systems
⚠ TBD: Full Soul meta-progression tree (branches outlined, details TBD)
⚠ TBD: Magic Door exclusive event pool — designed, not built
⚠ TBD: Consumable inventory UI and interaction
Platform / Technical
⚠ TBD: Mobile white screen fix on local Chrome file
⚠ TBD: Deck color theming per character
⚠ TBD: Background art per floor (dungeon, crypt, library, throne room)

---

# 🔧 AI DEVELOPMENT GUIDELINES

## Core Gameplay Rules (DO NOT BREAK)
- Game is turn-based
- Player uses ONE active die per turn
- Player has 3 Energy per turn (unless modified)
- Combat loop must always function (player turn → enemy turn)

## Dice System Rules
- Only ONE die is active at a time
- Dice roll determines whether card affinity effects activate when cards are played
- Reroll is limited per combat
- No multiple dice selection bugs allowed

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