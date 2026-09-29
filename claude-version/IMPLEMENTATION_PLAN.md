# Castle Run — claude-version Implementation Plan

**Status:**
- Phases 0–2 are complete and manually validated (see the *Validation log*).
- Phase 3 is in progress (`PHASE3_PLAN.md`).
  - Step 3a (run skeleton) is done and reviewed.
  - Step 3b (rest sites, shops, Soul Forge) is done and awaiting review.

A from-scratch implementation of Castle Run that lives beside the reference build. The reference
(`../index.html`, `../js/`, `../css/`) is not modified. Images are loaded from `../assets/` by path.
Design authority is `../GDD.md` v0.10. Where the GDD leaves a question open, the reference's
behaviour is kept and flagged in `COMPARISON.md`.

## Architecture

Plain HTML/CSS/JS using ES modules. There is no build step and no dependencies. It deploys on
GitHub Pages at `/claude-version/`.

```
src/engine/   Pure rules. No DOM, no timers, no Math.random.
  rng.js        Seeded RNG. Its state lives in the run, so a seed reproduces a whole run.
  statuses.js   Status registry: id, display, stacking, tick phase, tooltip text.
  dice.js       Rolling, rerolls and the affinity predicates.
  damage.js     Two pipelines: player→enemy and enemy→player. Previews call the same functions.
  cards.js      Card definitions, param resolution (affinity, when), generated text.
  ops.js        Card ops, including the choice ops that pause a card (c.pending).
  costs.js      The one cost pipeline, used by the display and by payment.
  conditions.js Named conditions for gates, `when` overrides and op-level `if`.
  values.js     Formula params ("2× your roll", "Gold ÷ 10, max 15").
  powers.js     Power hooks: on roll, before/after a card, after the Regen tick.
  enemies.js    Intent planning and resolution, plus enemy abilities.
  combat.js     createCombat / startTurn / playCard / reroll / endTurn.
  run.js        Run state and the flow between fights.
src/content/  Data only: heroes, cards (one file per hero in cards/), enemies, reward pools.
src/ui/       Renders state and replays the engine's event log as animation.
tests/        node --test suites for the engine and content.
tools/        serve.js (local server), catalogue.js (generates CARDS.md with a balance table).
```

**Core rules of the codebase**

1. **The engine emits events and never touches the page.** Each engine action runs synchronously
   to completion and appends events (`damage`, `block`, `status`, `roll`, `intent`…) to a log.
   The UI animates the log afterwards. Timing is never a rule.
2. **Combat state is built fresh** by one `createCombat()` for every fight type. Per-fight flags
   cannot leak between fights or drift between fight-start functions.
3. **Each card number is declared once.** A card has `params`, `affinity` overrides and
   conditional `when` overrides. Its text is a template over those params, so text, preview,
   effect and upgrade cannot disagree. An upgrade lists only the params that change.
4. **Intent is the move.** An enemy plans a concrete intent object at the end of its turn. The UI
   shows it and `endTurn` resolves that same object. Displayed damage uses the same pipeline
   function as the real hit.
5. **Statuses are keyed ids** (`weak`, `vulnerable`…), not emoji strings. When each status ticks
   comes from the numbered `endTurn` steps in GDD §4.

## Phases

| # | Scope | Exit criteria |
|---|---|---|
| **0** | Scaffold, RNG, statuses, dice, damage pipelines, turn loop, test harness | Engine tests pass. Fuzz: every simulated combat ends in a win or a loss. |
| **1** | Combat slice. Barbarian with starter deck, full Barbarian reward pool, Floor 1 enemies (easy, standard, elite) in a 6-fight gauntlet with card rewards. Combat UI for desktop and mobile landscape. | Playable in a browser. Screenshots at desktop and phone-landscape sizes. **Stop for review.** |
| 2 | Remaining 4 heroes, all 139 cards and upgrades, reward pools | Content lint passes for every card |
| 3 | Map and paths, rooms, rest, shop, Magic Doors, Mirror, Soul Forge, Floor 2–4 enemies | Full floor playable |
| 4 | Relics (as hook registrations), consumables, curses, events, event-started combat | |
| 5 | Companion bosses, Challenges, Sir Crimson, Aldric's 3 phases, save file (`castleRunClaude` key), endings | |
| 6 | Polish, and `COMPARISON.md` finalised | |

Out of scope until further notice: GDD features that were designed but never built. These are
companion boss forms (§6), per-floor boss debuffs (§3) and player-side Poison/Burn ticking.

## Known behaviour differences

The full list, with a reason for each entry, is in `COMPARISON.md`. In summary:

- **Fixes that follow the GDD:**
  - Intent always matches the action (Iron Archer's Aim, Aldric).
  - Holy Wrath no longer doubles damage permanently.
  - Aldric's volley resolves in order.
  - Souls are counted once.
  - Shadow Wraith's Phase, Stone Gargoyle's Stone Skin, Bone Golem's Bone Wall, Void Stalker's
    Curse and Dark Arcanist's Spell Steal all work.
  - Power stacks add up; they no longer mean "upgraded".
- **Reference behaviour preserved but flagged:** Shield Up / Iron Stance reset enemy Block each
  turn, and conditionally playable cards refund Energy instead of refusing the play.

## Testing strategy

- **Unit tests** (`npm test`):
  - damage pipeline order
  - each status's timing, including the rule that a lethal DoT tick skips HP-threshold abilities
  - Chill consumed only when the enemy attacks
  - Entrench carry-over
  - hand limit and reshuffle
  - dice and affinity
- **Content lint:** every card's text resolves every placeholder, and every upgrade differs from
  its base card.
- **Invariant fuzzing:** thousands of seeded combats played by a random agent. Checks:
  - every combat ends in a win or a loss
  - the damage an intent predicts equals the damage its action resolves
  - HP and Block are never negative
  - no card is duplicated or lost across the piles
- **Browser check:** headless Chrome screenshots at 1280×720, 844×390 and 667×375 (phone
  landscape), driven through the real UI.
- **Manual playtest** at the end of each phase, recorded below.

## Validation log

### Phase 3b — rest sites, shops, Soul Forge: automated validation passed; owner review pending

**New:**
- `content/rooms.js` (rest, shop stock and prices, the 8 Soul upgrades as data).
- `engine/shop.js` (stock, per-copy upgrade and removal) and `engine/soul.js` (offers, costs,
  effects).
- Run actions and screens for rest, shop and Soul Forge.
- A deck picker for choosing which exact copy to upgrade or remove.
- The Second Die and Gambler's Edge buttons in the die panel.
- Review options `?gold=`, `?souls=`, `?soul=`.

**Tests:** 126/126.
- 16 new rules: rest; the shop's exact prices, sold-once, removal limits and repeatability; Soul
  Forge offers, costs and purchase flow; each upgrade's in-combat effect, including the Gambler's
  Edge downside.
- The full-run fuzz now rests, shops and forges at random, and checks that the exact price is paid
  and nothing is bought twice.

**Browser:** full runs through every screen as the Gambler at 1280×720 and the Vampire at 844×390;
the shop at phone size; the Second Die and Gambler's Edge buttons. No page errors.

**Found and fixed during validation:** a deck picker could stay open after the screen changed.
The screen change now always closes it. The phone shop layout was tightened so everything fits at
844×390.

**Owner review of 3a:** approved; no architecture changes requested.

### Phase 3a — run skeleton: automated validation passed; reviewed

**New:**
- `content/map.js`, `engine/map.js`, and `engine/run.js` rewritten as a state machine
  (`pathSelect → doors → combat | room → reward → … → end`).
- `ui/runView.js` and three screens: path select, doors (with the Mirror), rooms.
- Companion bosses.

**Tests:** 110/110.
- Map properties over 500 seeds.
- Run-flow rules: illegal actions refused; X1; Magic Doors; Mirror destination, cost, index,
  once per floor and Gold check; boss rewards; quiet rooms; defeat.
- Full-run fuzz for every hero (200 runs, half with a large HP pool so Floors 2–4 are exercised).
  It checks that no room is ever skipped or repeated, and that Gold, Souls and deck identity stay
  valid.

**Browser:** headless-Chrome walk of a whole run (`?hp=900`) through every screen type, as the
Barbarian at 1280×720 and the Thief at 844×390. No page errors.

**Found and fixed during validation:** a toast from the previous fight could still show at the
start of the next one.

### Phase 1 — manual playtest (owner), passed

**Run:** Barbarian cleared all six gauntlet fights. It finished at 22/90 HP with a 16-card deck
and 126 Gold. The reward flow and the floor-clear flow both worked, and no blocking gameplay bugs
were found.

**Confirmed in play:**
- combat feels fluid
- card draw and hand flow
- enemy hit shake and slash effects read clearly
- Strength and other buffs update card values live
- Block state is communicated clearly
- low-HP emphasis
- enemy intent is clear
- the reward and victory screens

**Automated state at sign-off:**
- 38/38 `node --test` tests pass, including about 2,900 fuzzed combats.
- A headless-Chrome autoplay of a full gauntlet ran with no page errors.

**Cleanup after review:** removed two unused exports (a `canReroll` re-export and
`hasUpgrade()`). No architecture changes; nothing in the playtest called for one.

### Phase 2 — manual playtest (owner), completed

The owner reported the Phase 2 manual validation as complete (2026-09-29). No findings, bug reports
or per-hero notes were provided, so none are recorded, and no code changed as a result of the
playtest. Details can be added here if supplied.

**Kept, documented and unchanged at the owner's request:**
- the Mage's weakness against elites, including the 0% against the Armored Knight
  (COMPARISON G4, diagnostic below)
- identical upgrades (G1)
- stalemates (G5)

**Mage vs Floor 1 elites — diagnostic (read-only, 2026-09-29).** The balance table in CARDS.md
measures isolated fights, not runs:
- the unmodified 10-card starter deck, at full HP
- no prior fights, rewards or upgrades
- 300 seeded fights per matchup
- a naive agent that plays random affordable cards, rerolls once when the die isn't High, answers
  choices with the first option, and ignores enemy intent

Results:
- **Dungeon Warden:** 62 wins, 238 deaths, 0 timeouts.
- **Armored Knight:** 0 wins, 300 deaths, 0 timeouts. The Knight's Block (reset to 6 each turn,
  +8 on defend turns) absorbs 6.2 damage per turn and only 2.4 HP of damage lands per turn, so
  the average death comes at turn 19 with the Knight on 64/110 HP.

These numbers are not a measure of real play and have not been reproduced on the reference build.

### Phase 2 — automated validation, passed

**Content:** 135 cards, each with an upgrade, for all five heroes. The reference's 139 minus its
4 curses, which arrive in Phase 4. All reward pools and starter decks are as in the reference.

**Tests:** 97/97 `npm test`.
- Content lint over every card and upgrade:
  - every number shown
  - every op, condition and formula valid
  - no silently identical upgrades
- Unit tests for each Phase 2 mechanic and each F-fix.
- 32 hero-specific card rules.
- Fuzz:
  - 5 heroes × 10 enemies × 150 random decks and upgrades, and 300 random gauntlet runs.
  - Every pending choice answered at random, and invalid answers tried first.
  - Invariants checked:
    - the displayed cost equals the Energy paid
    - the shown intent equals the damage landed, including Fly
    - the die stays within its faces
    - no card is lost or duplicated
    - Energy and Gold never go negative
    - stalemates stay under 1%

**Browser:** headless-Chrome autoplay of a gauntlet for each new hero at 1280×720, and the Mage
and Gambler at 844×390, through the real UI including the choice overlay and the die picker. No
page errors.

**Found and fixed during validation:** enemy intent now includes Fly's halving; it previously
disagreed with the hit that landed.

**Owner decisions after review (applied):**
- The Arcane Recall loop is closed.
- Eternal Hunger: base is a flat 2 per tick; the upgrade is 2 per Regen stack, max 15.
- 98/98 tests pass after the change.

**Deferred for later review:**
- identical upgrades
- Mage balance
- stalemates

**Flagged for the owner:** COMPARISON.md §G.
- two identical upgrades
- the Arcane Recall+ infinite loop
- Eternal Hunger's text vs its formula
- the Mage's weakness against elites
- stalemates
