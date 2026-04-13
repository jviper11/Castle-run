# CLAUDE.md — Castle Run (Browser)

## Project Overview
Castle Run is a browser-based HTML/JS deckbuilder roguelike. Single-player, mobile-first, hosted at jviper11.github.io/Castle-run/

**GDD version:** v0.9
**Status:** Active development — core systems complete, content and systems expansion ongoing.

---

## File Structure

### THE GAME FILE
**castle-run.html** — This is the entire game. One monolithic file containing all HTML, CSS, and JavaScript (~6300+ lines). This is the ONLY file you need to edit.

### Everything else is dead/reference
- index.html — Landing page (~379 lines), separate from the game
- js/ folder (combat.js, data.js, game.js, ui.js, main.js) — Old split attempt, NOT imported by castle-run.html, NOT active. Do not edit these.
- css/styles.css — Not imported by castle-run.html. Dead.
- assets/ — Character and boss images (used via base64 in castle-run.html)
- GDD.md, PROGRESS.md, CARD_UPGRADES_MASTER.md, AGENTS.md — Documentation only

**Rule: When asked to edit the game, edit castle-run.html only.**

---

## Architecture (inside castle-run.html)

All code lives in one script block at the bottom of the file. Sections are clearly delimited with === comment banners:

1. DATA — CHARACTERS, CARDS, CARD_UPGRADES, DICE_TYPES, FLOOR_ENEMIES, ELITES, BOSSES, EVENTS, SHOP_ITEMS, CHAR_REWARD_POOLS
2. GAME STATE — G object, newGame(), buildMap()
3. NAVIGATION — enterRoom(), proceedDoors(), showDoors(), chooseDoor(), useMirror()
4. ALDRIC — Final boss, 3-phase fight, relic triggers, True Ending system
5. COMBAT — startCombat(), startTurn(), rollDice(), playCard(), endTurn(), dealDamage(), gainBlock(), healPlayer(), applyStatus(), drawCards(), shuffleDeck(), checkCombatEnd()
6. REST / SHOP / EVENT — showRestStop(), showShop(), showEvent()
7. REWARD — showReward(), giveReward(), skipReward()
8. BOSS INTRO — showBossIntro(), launchFinalBoss()
9. RENDER — renderAll(), renderHP(), renderHand(), renderEnergy(), renderStatuses(), renderCores(), updateHUD(), floatDamage()
10. MAP — toggleMap(), showPathSelect(), showPathConfirm(), renderMap()
11. UI HELPERS — showScreen(), showMsg(), showGameOver(), showAldricEnding(), toggleDeckViewer(), toggleMenu()
12. TITLE & CHAR SELECT — showCharSelect(), restartGame()
13. UTILS — shuffle(), rand()

---

## Global State (G)

The entire game state lives in one object G. Key fields:

G.charKey — 'barbarian' | 'mage' | 'thief' | 'vampire' | 'gambler'
G.char — CHARACTERS[charKey]
G.hp / G.maxHp
G.block
G.energy / G.maxEnergy
G.gold / G.souls
G.deck — full deck (array of card key strings)
G.drawPile / G.discardPile / G.hand
G.activeDie — 'd6' | 'd8' | 'd10' | 'd12' | 'd4' | 'd20'
G.diceMax — max face of active die
G.currentDie — current roll value
G.rerollUsed — bool, reroll consumed this turn
G.map — array of 4 floor objects
G.currentFloor — 0-3
G.enemy — current enemy object (null outside combat)
G.statuses — { player: [...], enemy: [...] }
G.exhaustedPile — cards exhausted this combat
G.inBoss — bool
G.isFinalBoss — bool, true during Aldric fight
G.cores — array of charKeys for collected boss cores
G.turn — combat turn counter

### Per-turn flags (reset in startTurn())
G._cardsPlayedThisTurn
G._spellsThisTurn — Skill/Power cards played (for Arcane Barrage)
G._spellEcho — remaining echo triggers
G._momentumCap — max die bumps from Arcane Momentum this turn
G._manaSurge — next card costs 1 less
G._manaWeaveCount — next N cards cost 1 less
G._entrenchActive — block carries to next turn
G._shadowMark — bonus damage on next attack
G._disappearCount — next N cards cost 0
G._shadowArtistDiscount — cards with discount remaining
G._flyActive — damage taken halved
G._dieSetThisTurn — can only set die once per turn
G._guaranteedMax — next N rolls are max
G._minRoll — minimum roll floor (default 2 for Gambler, 1 otherwise)
G._fallacyCount — non-max rolls since last max (Gambler's Fallacy)
G._fallacyThreshold — rolls needed to trigger guaranteed max (default 3)
G._hungerDmgThisTurn — Eternal Hunger damage dealt this turn (capped 15)

---

## Characters & Affinities

Barbarian — 90 HP — Even — Roll is even number
Mage — 70 HP — High — Roll is 6 or higher
Thief — 75 HP — Odd — Roll is odd number
Vampire — 78 HP — Extreme — Roll = 1 OR roll = diceMax
Gambler — 72 HP — d6 Specialist — Min roll 2, guaranteed-max system

---

## Card System

Cards are defined in the CARDS object. Key: lowercase string (e.g. 'heavyblow').
Upgraded versions: key + '+' suffix (e.g. 'heavyblow+').
Upgrades defined in CARD_UPGRADES, auto-registered into CARDS at load.

Card object shape:
name, emoji, type (Attack | Skill | Power | Curse), cost, desc, dice (bool), affinityBonus ('even' | 'odd' | 'high' | 'gambler' | 'extreme'), effect: (g, roll) => { }

Per-character reward pools defined in CHAR_REWARD_POOLS.
Starter decks defined per character in CHARACTERS[key].starterDeck.

---

## Combat Flow

startCombat() / startBossFight() / startAldricFight()
  → shuffleDeck()
  → startTurn()
      → rollDice() — applies die bonuses, guaranteed max, min floor
      → drawCards(5)
      → renderAll()
      → updateIntent()

Player plays cards via playCard(key)
  → cost deducted, card effect runs
  → Shadow Mark, Spell Echo, Blood Lord, Arcane Momentum checked
  → card moved to discardPile (or exhaustedPile for Powers)

endTurn()
  1. Burn ticks (before enemy)
  2. Vulnerable ticks down
  3. Regen ticks (heals player; Eternal Hunger deals damage)
  4. renderAll + death check
  5. Pre-attack specials (Stone Skin, Shield Up, etc.)
  6. Enemy acts — Chill reduces damage here, Chill stack decrements
  7. Poison ticks (after enemy)
  8. Death check for Poison
  9. Post-attack specials (hp triggers)
  10. Intent alternation
  11. Discard hand, checkCombatEnd(), startTurn()

checkCombatEnd()
  → hp <= 0: showGameOver()
  → enemy hp <= 0: reward → proceedDoors() or floor transition

---

## Status Effects

Burn — Enemy — Ticks BEFORE enemy acts
Poison — Enemy — Ticks AFTER enemy acts
Chill — Enemy — Consumes stack when enemy attacks
Vulnerable — Enemy — +50% damage taken; ticks per turn
Weak — Player — -25% damage dealt; ticks per hit
Rage — Either — +1 dmg per stack on attacks
Regen — Player — Heals stacks HP before enemy acts
Fly — Player — Damage halved for that turn

Cold Mastery modifier: base 35% Chill reduction (stacks=2 gives 50%)
Burning Soul: Burn deals +1 extra per stack
Poison Master: Poison deals +1 extra per stack
Berserker's Oath: HP loss grants 3 Block (stacks=2 gives 4 Block)

---

## Map System

4 floors x 3 paths (A/B/C) x 13-15 rooms each + floor boss.
Room types: battle, elite, event, shop, rest.

Player commits to one path at floor start via showPathSelect().
Mirror appears at 60% through a path — costs gold to switch paths.
Magic Door appears randomly from room 3+ — replaces current room or offers side room.

Floor backgrounds: .floor-1-bg through .floor-4-bg CSS classes.

---

## Aldric (Final Boss)

3 phases, each with different mechanics.

Phase 1 — Corrupted King (250 HP)
Stone Heart: restores block each turn, starts at 30, decays -2 every 4 turns (min 2)
Grieving Ground: attacks + adds Curse of Weakness to player deck

Phase 2 — Shattered Ruler (200 HP)
Boss Dice curse: rolls a number each turn, nullifies player affinity on match
Memory Leech: every 3rd turn disables player affinity
Fractured Strike: 8 damage x 3 (amplified if player has Burn/Poison)

Phase 3 — Soul's Burden (150 HP)
No relics: immune to status, 20 dmg/turn
With 4 cores (True Ending): Relic triggers at 100/75/50/25 HP thresholds

True Ending requires: Collect all 4 boss cores before reaching Aldric.

---

## Workflow Notes

- File is large (~6300 lines). Use grep/search to locate sections before editing.
- Read the relevant section comment banner before making changes.
- Card keys are lowercase, no spaces. Upgraded versions append +.
- When adding a new card: add to CARDS, add upgrade to CARD_UPGRADES, add key to appropriate CHAR_REWARD_POOLS entry.
- When adding a new status effect: add handling in endTurn(), add description to STATUS_DESCRIPTIONS, add icon to STATUS_ICONS in renderStatuses().
- G._ prefixed flags are reset each turn in startTurn(). New per-turn flags must be added there.
- Do NOT split the file. Keep everything in castle-run.html.

---

## Debug

#debug-floor2 URL hash skips to Floor 2 on new game (confirmed present in game.js copy — verify it exists in castle-run.html before relying on it).

---

## Documentation Files
- GDD.md — Full game design document v0.9
- PROGRESS.md — Current build status and session log
- CARD_UPGRADES_MASTER.md — All 200+ card upgrade definitions
- AGENTS.md — Agent workflow guidelines