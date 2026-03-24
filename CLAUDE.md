# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Castle Run is a single-file roguelike deck-building game. The **entire game lives in `index.html`** (~7000+ lines) — HTML structure, all CSS, and all JavaScript are in one file. There is no build step, no package manager, no framework, and no dependencies beyond Google Fonts. Open `index.html` directly in a browser to run it.

`castle-run.html` is an older/alternate version of the file. `assets/` holds PNG sprites referenced via `GAME_IMAGES`. Currently only `mage_hero.png` and `thief_hero.png` are live files — all other sprite keys (barb, gambler, vampire heroes + all boss sprites) are base64 inline. Extracted originals saved as `assets/*_original.*` for bg-removal work.

## Architecture

### Global State

All game state is stored in a single mutable object `G` (declared at ~line 2739). Every function reads from and writes to `G` directly. There is no state management library or immutability pattern.

Key fields on `G`:
- `charKey`, `char` — selected character and their data
- `hp`, `maxHp`, `block`, `energy`, `maxEnergy`, `gold`, `souls`
- `deck`, `drawPile`, `discardPile`, `hand`, `exhaustedPile` — card piles
- `activeDie`, `currentDie`, `diceMax`, `diceRolled`, `rerollUsed` — dice state
- `map`, `currentFloor`, `needsPathSelect` — floor/room progression
- `enemy`, `inBoss`, `statuses` — active combat state
- `cores`, `mapBlind` — special run modifiers

### Data Constants (read-only, defined once)

| Constant | What it holds |
|---|---|
| `CHARACTERS` | 5 playable classes with HP, affinity, starter deck |
| `CARDS` | All card definitions — `cost`, `type`, `effect(G, roll)` |
| `CARD_UPGRADES` | Upgraded versions of cards |
| `DICE_TYPES` | d4/d6/d8/d10/d12/d20 definitions with passive bonuses |
| `FLOOR_ENEMIES` | Enemy pools per floor (1–4) |
| `ELITES` | Elite enemy definitions |
| `BOSSES` | 5 floor bosses (one per playable class) |
| `ALDRIC` | Final boss — 3 phases, defined separately at ~line 3092 |
| `EVENTS` | Random event definitions |
| `SHOP_ITEMS` | Shop inventory |

### Screen System

Screens are `div.screen` elements shown/hidden by toggling the `.active` class via `showScreen(id)`. The active screen gets `display: flex`. Screens:
- `title-screen`, `char-screen`, `combat-screen`, `path-screen`, `door-screen`
- `reward-screen`, `rest-screen`, `shop-screen`, `event-screen`
- `boss-intro-screen`, `gameover-screen`, `victory-screen`
- `map-overlay` — modal overlay, not a `.screen`

### Game Flow

```
newGame(charKey)
  → showPathSelect()           ← choose path A/B/C per floor
    → enterRoom()              ← routes to combat / rest / shop / event
      → startCombat() / startBossFight() / showRestStop() / showShop() / showEvent()
        → checkCombatEnd()     ← on enemy death: showReward() → proceedDoors()
          → proceedDoors()     ← advances room index, loops back to enterRoom()
            → (repeat until floor boss)
              → startBossFight() / startAldricFight()
                → showPathSelect() ← next floor, or victory
```

### Combat Loop

`startTurn()` → `rollDice()` → player plays cards via `playCard(cardKey)` → `endTurn()` → `updateIntent()` + enemy action → back to `startTurn()`

Card effects are inline functions defined on each card in `CARDS`: `effect(G, roll)`. They call `dealDamage()`, `gainBlock()`, `healPlayer()`, `applyStatus()`, `drawCards()`.

### Affinity System

Each character has a `diceAffinity` string (`'even'`, `'odd'`, `'high'`, `'gambler'`, `'extreme'`). After rolling, `checkAffinityHighlight(G, roll)` highlights matching dice, and card `effect` functions check `checkAffinity(G, roll, affinity)` themselves to decide whether to apply bonus effects.

### Rendering

All UI updates go through `renderAll()` which calls: `renderHP()`, `renderHand()`, `renderEnergy()`, `renderDicePool()`, `renderStatuses()`. These write directly to DOM elements by `id`. `updateHUD()` and `updateFloorBG()` handle the top bar and background.

## Mobile Layout

The game targets mobile-first. Key breakpoints:
- `@media (max-width: 1100px)` — main mobile overrides (covers large-screen phones in landscape)
- `@media (min-width: 601px) and (max-width: 1100px)` — tablet tweaks

### Combat Screen Column Layout
`height: 100dvh; overflow: hidden` with a fixed flex column. Heights from top:
- **HUD** (~40px) — floor/room, character icons, gold/souls, energy + draw counts, MAP/DECK/☰
- **Arena** (`flex: 1`) — fills all remaining space
- **Dice panel** (~44–50px) — die face, affinity label, active die pool, reroll button
- **Hand area** (120–135px) — horizontally scrollable cards, END TURN button (position: absolute)

### Combat HUD
The HUD contains two sections of combat info to keep the dice panel slim:
- **Left**: floor label + room/path info
- **Center**: core icons, gold (🪙), souls (💀), energy (`⚡` `hud-energy-val`), draw/discard (`hud-draw-val` / `hud-disc-val`)
- **Right**: MAP, DECK, ☰ buttons

`renderEnergy()` updates both the HUD energy/draw elements and the reroll button state.

### Dice Panel
Intentionally minimal — only what's needed per turn:
- Current die face (`#current-die`) + affinity label (`#affinity-label`, `white-space: nowrap`)
- Active die pool (`#dice-pool-display`) — rendered by `renderDicePool()`
- Reroll button (`#reroll-btn`) — exempt from the 42px tap-target min-height via explicit override after the `.btn` rule

### Enemy Sprites
Regular enemies use emoji. `updateCombatSprites(charKey, null)` sets inline styles for emoji enemies — **mobile-aware**: `font-size: 3rem; width: 70px; height: 65px` on mobile (≤1100px), `5rem / 110×95px` on desktop. Boss sprites use PNG background images at `160×200px`. The `⚔️` emoji (Castle Guard) renders as two small glyphs on some Android versions — known OS-level issue, not a code bug.

Desktop `.combatant-sprite` has explicit `width: 160px; height: 200px` so background images render when `font-size: 0` is set. Mobile overrides to `90×110px`.

### Mobile Combat Layout (current state)
- **No separate dice panel strip** — removed entirely from between arena and hand
- **`#dice-corner`** — `position: absolute` element, sibling of `.hand-area` inside `#combat-screen`. Contains `#m-current-die` and `#m-reroll-btn`. Positioned bottom-left. Hidden on desktop.
- **`syncMobileDice()`** — mirrors desktop dice state to mobile elements. Called from `renderAll()` and `checkAffinityHighlight()`. Does NOT copy the `.rolling` class (causes layout shake on mobile).
- **`combat-controls`** (desktop dice panel) — hidden on mobile via `display: none !important`
- **`.hand-area`** — `justify-content: center` with `padding: 0.2rem 85px 0.4rem 90px` to leave room for dice corner (left) and END TURN (right)
- **HUD hero core icons** — only shown when cores are collected (`renderCores()` skips uncollected). Appear one by one as bosses are beaten.
- **Affinity label** — removed from mobile; card glow indicates active bonus
- **`#dice-corner` must be a sibling of `.hand-area`**, NOT inside it — putting it inside the `overflow-x: auto` container causes scroll reflow on tap (screen shake bug)

### Key Mobile Gotchas
- `.btn { min-height: 42px }` applies to all buttons — override with `min-height: unset; height: auto; line-height: 1.2` for HUD buttons and dice corner button
- `#combat-screen` is `position: absolute` (via `.screen`) so its children can use `position: absolute` referencing the screen bounds
- The `#combat-screen.active` rule sets `height: 100dvh; overflow: hidden` — do not add a second rule that overrides these
- `overflow-y: auto` and `-webkit-overflow-scrolling: touch` are set on all non-combat screens so they scroll on mobile
- The reward screen uses `justify-content: flex-start` (not `center`) on mobile so 4-card layouts + Skip don't overflow

### Enemy AI System
Each enemy has an `aggro` field that drives combat behavior via `AGGRO_PROFILES`:
- `berserker` — 5% defend at full HP, 3% when hurt. Defend block: 4. (Skeleton, Cursed Hound, Throne Guard…)
- `glass` — never defends. (Dungeon Rat, Bone Archer, Blood Bat) — pure damage race
- `cautious` — 35% defend when healthy, 10% when hurt. Defend block: 12. (Castle Guard, Cursed Knight…)
- `balanced` — 20% defend normally, drops to 5% when player is below 30% HP. (most casters/hybrids)
- `forced` — intent fully controlled by the enemy's special ability, AI does not override. (Iron Archer)

**Bug fixed:** enemies now initialize with `intent: 'attack'` — previously `undefined` caused every fight to open with the enemy defending.

## Design Document

**`GDD.docx`** is the source of truth for story, balance, and design intent (v0.7). Read it before making significant design decisions. Key points:

### Story & Tone
Dark gothic roguelite. Five heroes storm Castle Ashborne. Four are captured and corrupted into floor bosses. You play the fifth. Defeating bosses releases **Cores** — collect all four to fight King Aldric. Two endings: kill him (Normal) or use the four **True Ending Relics** to free him (True Ending / Liberator).

### Character Affinities (GDD Correction)
The GDD (v0.7) has errors on three affinities. The correct affinities — and what's in the code — are:

| Character | Correct Affinity | GDD (incorrect) |
|---|---|---|
| Barbarian | Even | Odd |
| Thief | Odd | Low (1 or 2) |
| Vampire | Extreme (roll 1 or max face) | Even |
| Mage | High (5 or 6) | ✓ correct |
| Gambler | `'gambler'` (min roll 2, max = lucky streak) | "Any doubles" |

Floor boss spec: **Sir Crimson** (castle enforcer, not a companion) is Floor 1. Floors 2–4 bosses are companions 2–4 (names TBD). The code currently uses playable-character clones as all 4 bosses — this diverges from the GDD.

### Systems Designed But Not Yet Built
- **Relic system** — 3 tiers (Common/Uncommon/Rare) + Boss relics + 4 True Ending Relics. Currently no relic inventory or passive effects in code.
- **Consumable system** — carry up to 3 consumables (potions, flasks, vials). UI and inventory not implemented.
- **Meta-progression / Soul Tree** — 3 branches (Power, Knowledge, Fortune). Souls are tracked in `G.souls` but spending is not implemented.
- **Full event pool** — GDD specifies 18 events. Current code has ~5.
- **Magic Door event pool** — Map Blind, Locked Door, Burning Door, Sealed Door, Mirror Door variants.
- **Mirror mechanic** — fight a shadow copy of your deck at ~60% through each path.
- **Card upgrades for all cards** — only partial in `CARD_UPGRADES`.

### Economy (GDD Targets)
- Standard battle: 15–25 gold | Elite: 30–45 gold | Floor boss: 80 gold + full HP restore
- Skip card reward: 50 gold | Sell card at shop: 25 gold
- Card removal: 75 gold (rest) / 100 gold (shop) | Card upgrade (shop): 80 gold

### Open TBDs (from GDD)
- Companion names/lore for floors 2–4
- Full card list beyond starter decks
- Boss debuff carry-forward system
- Background art per floor
- Deck color theming per character

## Adding Content

- **New card**: Add entry to `CARDS` with `{ name, emoji, cost, type, desc, effect(G, roll) }`. Add to a character's `starterDeck` or `CHAR_REWARD_POOLS` / `UNIVERSAL_REWARD_CARDS`.
- **New enemy**: Add to the appropriate `FLOOR_ENEMIES[n]` array with `{ name, emoji, hp, block, damage, reward, souls, aggro, special }`. Set `aggro` to one of the `AGGRO_PROFILES` keys. `special` is `null` or `{ name, desc, trigger, effect(g, turn) }` where trigger is `'turn'`, `'attack'`, or `'hp'`.
- **New character**: Add to `CHARACTERS` and add a starter deck of card keys. Add a matching entry to `CHAR_REWARD_POOLS`.
- **New die**: Add to `DICE_TYPES` with `{ label, sides, bonus(G, roll) }`.
