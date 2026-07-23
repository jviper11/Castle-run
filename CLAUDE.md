# CLAUDE.md — Castle Run (Browser)

## Project Overview

Castle Run is a single-player browser deck-building roguelite with turn-based card combat and one active die per turn. It is deployed through GitHub Pages from the repository root.

**Design reference:** `GDD.md` v0.9
**Development status:** Active development. Major systems are implemented, but implementation is not the same as verification. See `PROGRESS.md` for the current restart point and `DESIGN_DISCREPANCIES.md` for unresolved design conflicts.

---

## Active Runtime Architecture

The deployed game is the split build:

- `index.html` — GitHub Pages entry point and active HTML structure.
- `css/styles.css` — active stylesheet, including desktop and mobile/landscape layouts.
- `js/data.js` — characters, cards, upgrades, enemies, bosses, events, dice, relic data, and embedded game images.
- `js/game.js` — global game state, new-game flow, map generation, room navigation, paths, Magic Doors, and Mirror flow.
- `js/combat.js` — combat turns, dice rolls, damage, Block, statuses, Power hooks, enemy intent/actions, bosses, and combat completion.
- `js/ui.js` — card rendering, dynamic previews, rewards, rest, shop, relic UI, status rendering, tooltips, HUD, map, and screen helpers.
- `js/main.js` — startup, viewport/orientation handling, and event wiring.

Scripts are loaded by `index.html` in this order: `data.js`, `game.js`, `combat.js`, `ui.js`, then `main.js`. These files share browser globals, so load order and globally referenced names matter.

### Legacy snapshot

`castle-run.html` is a legacy/reference snapshot of the older monolithic build. It is not the GitHub Pages entry point and does not receive current runtime fixes.

- Do not edit `castle-run.html` unless explicitly asked to compare builds or recover an older design.
- Runtime code changes must be made in `index.html`, `css/styles.css`, or the appropriate split `js/*.js` file.
- Do not copy fixes back into the monolith by default.
- Preserve the split architecture unless an explicit refactor is requested.

---

## Global State (`G`)

The run and combat state lives in the global `G` object. Important fields include:

- `G.charKey` / `G.char` — selected hero key and character data.
- `G.hp` / `G.maxHp` / `G.block`.
- `G.energy` / `G.maxEnergy`.
- `G.gold` / `G.souls`.
- `G.deck`, `G.drawPile`, `G.discardPile`, `G.hand`.
- `G.exhaustedPile` — cards removed for the current combat; they return afterward unless a rule explicitly says otherwise.
- `G.activeDie`, `G.diceMax`, `G.currentDie`, `G.rerollUsed`.
- `G.map`, `G.currentFloor`, and current path/room fields.
- `G.enemy` — current enemy, or null outside combat.
- `G.statuses` — `{ player: [...], enemy: [...] }`.
- `G.inBoss`, `G.isFinalBoss`, `G.cores`, `G.turn`.
- `G.relics` and reward-rarity state such as `G.rareOffset` where initialized by the active build.

### Combat and per-turn flags

Underscore-prefixed fields implement temporary or combat-scoped effects. Relevant examples include:

- `G._cardsPlayedThisTurn`.
- `G._spellsThisTurn` — Skill/Power count used by Arcane Barrage.
- `G._spellEcho`.
- `G._momentumCap`.
- `G._manaSurge` / `G._manaWeaveCount`.
- `G._entrenchActive`.
- `G._shadowMark`.
- `G._disappearCount` / `G._shadowArtistDiscount`.
- `G._flyActive`.
- `G._dieSetThisTurn` — enforces one forced die value per turn.
- `G._guaranteedMax`, `G._minRoll`, `G._fallacyCount`, `G._fallacyThreshold`.
- `G._hungerDmgThisTurn`.

Before adding or changing one of these fields, locate every initialization, reset, read, and write. Do not assume every underscore field resets at the same lifecycle boundary.

---

## Cards and Rewards

Base cards are defined in `CARDS` in `js/data.js`. Upgrades are defined in `CARD_UPGRADES` and registered under keys with a `+` suffix. Card objects generally contain:

`name`, `emoji`, `type`, `cost`, `desc`, `dice`, `affinityBonus`, and `effect(g, roll)`.

Card types include Attack, Skill, Power, and Curse. Starter decks live in character data. Rarity-bucketed hero reward pools are currently defined in `js/ui.js` as `CHAR_REWARD_POOLS`.

When changing a card, verify all of the following separately:

1. Displayed base and upgraded descriptions.
2. Displayed cost and the actual cost after modifiers.
3. Compact/mobile preview values.
4. Actual effect and damage calculation.
5. Reward-pool membership and rarity.
6. Exhaust/discard behavior.

Code presence does not prove that these layers agree.

---

## Core Combat Rules

- Combat is turn-based.
- The player has one active die per turn.
- Base Energy is 3 per turn unless modified by a defined effect.
- A die may be forced to a specific value only once per turn.
- Affinity and dice-dependent card effects must use the active roll consistently.
- Block, statuses, Powers, and enemy intent must be visible and must agree with the action that resolves.
- Power cards provide combat-long effects and are expected to Exhaust on play when defined that way.
- The combat loop must always reach a valid win, loss, or next-turn state.

### Typical flow

`startCombat()` / boss setup → `startTurn()` → roll die → draw/render/update intent → player cards → `endTurn()` → status timing → enemy action → post-action timing → discard/cleanup → completion check or next turn.

The exact order is implemented in `js/combat.js`. Do not rely on older prose for disputed timing rules; consult `DESIGN_DISCREPANCIES.md` and request a design decision where necessary.

---

## UI and Mobile Rules

- Combat remains the visual focus.
- Player and enemy alignment, HP, Block, Energy, die state, and intent must remain readable.
- Mobile usability is landscape-first.
- The hand must remain usable at short phone heights and with browser chrome visible.
- Selecting a mobile card should show an unobstructed preview whose cost and values match the card that will actually resolve.
- Avoid fixing mobile layout at the expense of desktop or introducing duplicate breakpoint rules without checking cascade order.

---

## Workflow

- Read `AGENTS.md`, the relevant section of `GDD.md`, and `DESIGN_DISCREPANCIES.md` before changing behavior.
- Search first, then make small edits in the file responsible for the behavior.
- Preserve working combat flow and shared globals.
- For cards, inspect `js/data.js`, relevant combat hooks, and `js/ui.js` previews/rewards together.
- For statuses or Powers, inspect application, turn timing, damage calculation, rendering, tooltip text, and cleanup.
- For enemy intent, compare `updateIntent()` with the exact branch used by the enemy action.
- For mobile changes, test landscape widths and short viewport heights, including browser chrome.
- Do not label a system Verified solely because its code exists. Record whether it is Implemented, Partially verified, Verified, a Known issue, or Deferred.
- Do not update `castle-run.html` as part of normal runtime work.

---

## Documentation

- `GDD.md` — intended game design; contains unresolved conflicts tracked separately.
- `PROGRESS.md` — implementation status, restart point, and history.
- `CARD_UPGRADES_MASTER.md` — card-upgrade reference; not automatically authoritative when it conflicts with active code or the discrepancy register.
- `DESIGN_DISCREPANCIES.md` — unresolved design conflicts; records questions without deciding them.
- `AGENTS.md` — priorities, invariants, verification areas, and editing rules.
