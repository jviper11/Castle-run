# CLAUDE.md — Castle Run (Browser)

## Project Overview

Castle Run is a single-player browser deck-building roguelite with turn-based card combat and one active die per turn. It is deployed through GitHub Pages from the repository root.

**Design reference:** `GDD.md` v0.10
**Development status:** Active development. Major systems are implemented, but implementation is not the same as verification. See `PROGRESS.md` for the current restart point and `DESIGN_DISCREPANCIES.md` for unresolved design conflicts.

---

## Active Runtime Architecture

The deployed game is the split build:

- `index.html` — GitHub Pages entry point and active HTML structure.
- `css/styles.css` — active stylesheet, including desktop and mobile/landscape layouts.
- `js/meta.js` — cross-run persistence (`META`, localStorage). The only state that survives a run; see "Cross-run persistence" below.
- `js/data.js` — characters, cards, upgrades, enemies, bosses, events, dice, relic data, and embedded game images.
- `js/game.js` — global game state, new-game flow, map generation, room navigation, paths, Magic Doors, and Mirror flow.
- `js/combat.js` — combat turns, dice rolls, damage, Block, statuses, Power hooks, enemy intent/actions, bosses, and combat completion.
- `js/ui.js` — card rendering, dynamic previews, rewards, rest, shop, relic UI, status rendering, tooltips, HUD, map, and screen helpers.
- `js/main.js` — startup, viewport/orientation handling, and event wiring.

- `js/debug.js` — dev/testing jump tool. Not a player feature and not reachable through any UI.

Scripts are loaded by `index.html` in this order: `meta.js`, `data.js`, `game.js`, `combat.js`, `ui.js`, `main.js`, then `debug.js`. These files share browser globals, so load order and globally referenced names matter.

### Cross-run persistence (`js/meta.js`)

`G` is per-run and wiped by `newGame()`. `META` is the separate, permanent state that outlives a run,
saved to `localStorage` under `castleRunProgress` as `{ version, coresCollected, challengeRelicsEarned }`.
It holds only the two permanent unlock facts the True Ending path needs (GDD §1, §9) — nothing else
belongs in it. Souls, deck, relics held, Gold, HP, floor progress and hero pick stay per-run.

- `recordCoreCollected(charKey)` — call when a companion's Core is collected. Writes only on the
  first time ever for that companion and returns `true` only then; `G.cores` cannot answer that
  question because it is rebuilt every run.
- `hasCoreCollected(charKey)` / `loadMeta()` / `saveMeta()`.
- Loading is defensive: a missing, malformed, or unknown-version save degrades to empty rather than
  throwing, and is left untouched on disk instead of being overwritten.
- `challengeRelicsEarned` is a **reserved, unwritten slot** — Challenge-mode fight logic does not
  exist yet. It round-trips through load/save so it can be adopted without a migration.
- `recordChallengeRelicEarned(charKey)` / `hasChallengeRelic(charKey)` — same first-time-only
  contract, written when a Challenge fight is cleared.
- `js/debug.js` sets `G.cores` directly and deliberately does **not** touch `META`, so testing
  cannot pollute a real save. Its `challenge=` option seeds `META` in memory only, never saving.

### Challenge mode (GDD §1, §9)

Per-hero Challenges are defined in `CHALLENGES` (`js/data.js`), keyed by hero `charKey`.

- **Eligibility** — `isChallengeEligible(g, bossCharKey)` in `js/combat.js`: a Challenge exists,
  the boss is not the player's own hero, their Core was collected in an **earlier** run
  (`META.coresCollected`, never `G.cores`), and the relic is not already earned.
- **Opt-in** — offered on the boss-intro screen only. `G._challenge` holds the accepted hero key
  for the current fight. Cleared by `startCombat()` and `startAldricFight()`, and reset on every
  `showBossIntro()`. `startBossFight()` deliberately does **not** clear it.
- **Denial** rules are enforced by suppressing the effect at its choke point — `gainBlock()`
  (Thief) and `drawCards()` (Mage) — not by gating cards, because draw and Block are often
  affinity-conditional and a static card list would misfire. `drawCards(g, n, { turnStart: true })`
  exempts the mandatory turn-start deal; denying that would softlock the fight.
- **Escalation** rules tick in `tickChallengeEscalation()` from `endTurn()` STEP 5, alongside the
  enemy's own turn abilities, gated on `G.turn`. Enemy `'💢Rage'` *is* Strength.
- **Earning** happens on a win, in `checkCombatEnd()`. Losing earns nothing and needs no state.
- Challenge relics currently have **no individual in-fight effect** — earn-and-store only
  (GDD §9 defers that design). Holding 4 is what opens Aldric's Phase 3 and the True Ending.

### True Ending gate

`G.aldricHasRelics = hasTrueEndingRelics()` — 4 of 5 from `META.challengeRelicsEarned`,
evaluated **once** in `startAldricFight()` and never re-checked mid-fight. Do not count the
array inline; the 4-of-5 rule lives in `hasTrueEndingRelics()` (`js/meta.js`).

It previously read `G.cores.length >= 4`, a per-run count of a different system — beating four
floor bosses in one run unlocked the True Ending, which the July 25 redesign existed to remove.
`G.cores` still serves its own purpose (HUD display, and first-ever collection via
`META.coresCollected` gating Challenge eligibility) and must not be repurposed as the gate.

Phase 3's four HP-threshold beats (`ALDRIC_RELIC_TRIGGERS`) are deliberately **unattributed**
placeholders. They were the deleted Crown/Sword/Sigil/Vow relics; the pacing and Aldric's
dialogue were kept, the identities removed. Two things remain unbuilt by design, not oversight:
per-relic Aldric-fight effects (GDD §9), and GDD §1's "use the relics at 50 HP instead of the
killing blow" choice — today the True Ending fires on the killing blow with the gate passed.

### Dev jump tool (`js/debug.js`)

Skip straight to a fight instead of replaying floors. Console: `dbg('aldric')`, `dbg('boss', {floor: 2})`, `dbg('floor', {floor: 3})`, also `bossintro`, `combat`, `elite`. URL: `?debug=aldric`, `?debug=boss&floor=2`. Options: `hero`, `floor`, `gold`, `souls`, `hp`, `cores` (4 unlocks Aldric's Phase 3), `relics=a,b`, `upgrades=a,b`, and status stacks `weak`/`chill`/`rage`/`poison`/`burn` (enemy) and `vulnerable` (player). It calls the real `newGame()` and fight-start functions, so the resulting fight is an ordinary one — there is no separate "test mode". Inert unless `?debug=` is present or a console global is called; full option list is documented at the top of the file.

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
- `G._diceLockTurnsRemaining` / `G._dieLockedThisTurn` — Dice Stabilizer's die lock. A deliberate
  pair, not a redundancy: the counter is "future turns that skip their roll" and is already
  decremented while the turn it paid for is being played, so only the turn flag can answer "is the
  die locked right now". `startTurn()` branches on the counter alone; every in-turn gate (reroll,
  Gambler's Edge, Ley Line Crystal) must call `dieLockActive()`, which ORs the two. Swapping either
  read reintroduces a bug: a counter-only gate unlocks one turn early, and a `dieLockActive()`
  branch in `startTurn()` makes the lock permanent.
- `G._guaranteedMax`, `G._minRoll`, `G._fallacyCount`, `G._fallacyThreshold`.
- `G._hungerDmgThisTurn`.

Before adding or changing one of these fields, locate every initialization, reset, read, and write. Do not assume every underscore field resets at the same lifecycle boundary.

---

## Cards and Rewards

### Consumables

`CONSUMABLES` (`js/ui.js`) holds all 10 items' effects; `CONSUMABLE_AVAILABILITY` beside it
transcribes GDD §12's "Available From" and "Floor" columns, and is the **only** thing offer sites
read. Every source (shop stock, the elite drop in `checkCombatEnd()`, `giveReward(g,'consumable')`)
goes through `offerableConsumables(source, g)` — do not inline a pool filter, for the same reason
`offerableRelics()` exists. `minFloor` is a zero-based `G.currentFloor` index.

Two render paths, deliberately distinct: `renderConsumableSlots()` for the in-combat row, and
`renderFieldInventory()` for the out-of-combat `#field-inventory` element (shown by `showScreen()`
for `FIELD_INVENTORY_SCREENS` only). `useConsumable()` branches on `inCombatScreen()`, which reads
`G._activeScreen` — **not** `G.enemy`, which is never reset to null after a fight despite what the
`G` field list above implies. Only `OUT_OF_COMBAT_CONSUMABLES` may be used between fights.

`grantConsumable(key, options)` is the only way to add an item. `addConsumable()` is its shared
inventory write — do not push to `G.consumables` directly, or the acquire message and the two render
calls get skipped. At 3/3 it opens the swap prompt and **resolves asynchronously**, so its return
value cannot report the outcome (`false` means both "refused" and "a prompt is open"). Sequence on
`options.onDone(granted)` instead; a caller that schedules a screen change afterwards must, or the
prompt is orphaned by the transition. `options.allowSwapPrompt: false` suppresses the prompt and is
required wherever payment has already been taken — the shop's pre-charge cap check exists for that
reason and must not be replaced by the prompt.

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
7. Condition-met visual state, for cards with a hard play gate.

A **hard play gate** is a condition that makes the card's `effect()` return early without doing
anything (the play is still spent) — as opposed to a roll-conditional bonus branch, which always
resolves and is covered by the dynamic preview. Such cards are declared in `CARD_PLAY_CONDITIONS`
in `js/data.js`, keyed by base card key so the `+` upgrade inherits the condition, and
`renderHand()` dims the tile and shows the reason when the condition is not met. The indicator is
a warning only — the card stays tappable and `effect()` remains the source of truth.

The hand-side check runs while the card is still in `G.hand`; the effect-side check runs after
`playCard()` has removed and counted it. The two are off by one, deliberately (compare
`wouldBeFirstCardThisTurn()` with `isFirstCardThisTurn()`). Change one, change the other.

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
