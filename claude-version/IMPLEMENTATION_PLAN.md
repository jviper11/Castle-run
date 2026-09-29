# Castle Run — claude-version Implementation Plan

**Status:**
- Phases 0–2 are complete and manually validated (see the *Validation log*).
- Phase 3 is in progress (`PHASE3_PLAN.md`).
  - Step 3a (run skeleton) is done and reviewed.
  - Step 3b (rest sites, shops, Soul Forge) is done and reviewed.
  - Step 3c (die types) is done and reviewed, including the affinity rescale (COMPARISON §H6),
    approved as the current V2 rule. G4 stays open for a later manual balance review.
  - Step 3d (Floors 2–4 enemies) is done and reviewed.
  - Step 3e (run UI) is done and reviewed.
  - Step 3f (final Phase 3 validation): automated validation complete; **owner review and manual
    playtest pending**. Two balance findings are flagged for a decision (see the 3f entry).

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
- **Browser smoke (`npm run smoke`) — required, alongside the engine suite.** Owner decision after
  step 3d, where a bad edit deleted two render functions and all 176 engine tests stayed green:
  they never import the UI. `tools/smoke.js` drives the real page in headless Chrome or Edge,
  walking seeded runs at 1280×720, 844×390 and 667×375 (touch emulated at the phone sizes).
  It fails on:
  - a page error, console error, or failed load of the game's own files
  - a screen, or door-screen variant (Mirror, boss door, Magic Door, hidden door), not reached
  - a visible, enabled button outside the viewport, or horizontal page overflow
  - `undefined` / `null` / `NaN` / `[object …]` in a screen's text
  - an emoji anywhere in the UI source that draws as a missing-glyph box
  A step is not done, and does not stop for review, until **both** `npm test` and `npm run smoke`
  pass (`npm run check` runs both). The browser it finds decides the glyph result, so it checks
  what a player on that machine sees.
- **Manual playtest** at the end of each phase, recorded below.

## Validation log

### Phase 3f — final Phase 3 validation: automated checks passed; owner playtest pending

**Change applied first (owner, on reviewing 3e):** the map locks floors not yet reached — number
and "not yet reached" only; no name, paths or rooms. Reached floors stay visible and the current
floor shows its full layout. The smoke check now fails if a future floor shows any room, and was
mutation-tested against a map that leaked them (it failed, naming each floor on each screen).

**The four 3f items:**

| Item | Result |
|---|---|
| Full-run fuzz, every hero, four floors | Pass. Now asserts coverage, not just survival: every hero reaches all four floors and clears the castle (18–20 times each in the large-HP half of 200 runs), and all 36 enemies, elites and companion bosses are fought at least once |
| Per-floor balance table, plus a full-run column | Added to CARDS.md: starter deck vs every floor's standard and elite pools and the companion bosses, and 200 whole runs per hero with a fixed policy between fights |
| Headless-browser full run per hero | Pass, after one fix below. `node tools/smoke.js --all-heroes`: one four-floor run per hero across all three sizes, touch at the phone sizes |
| Owner manual playtest | **Pending** |

**Required checks at sign-off:** `npm test` 177/177; `npm run smoke` 7/7.

**Found and fixed:** at 844×390, a door screen showing both a **hidden Magic Door and the Mirror**
pushed "Step through" 5px off the screen. No earlier check reached that combination; the per-hero
runs did, twice. At phone height the doors now size to their content and the Mirror panel is
tighter; the same screen now has room to spare.

**Flagged for the owner — two balance findings. Neither is a code defect, and neither is changed.**

1. **The Dark Arcanist is the easiest fight in the game.** Every hero's starter deck beats it 200
   times in 200 — a 130 HP Floor 3 elite — while its Floor 3 partner, the Sanctum Guardian, wins
   2–14% of the time. Spell Steal, as decision D6 specifies, *replaces* its 15-damage attack with
   a mirror of your last card, and a starter deck's last card is usually a 6-damage Strike or a
   Defend, which only gives it Block. It is working exactly as specified; the specification makes
   it harmless. This is also why Floor 3's elite average in the new table is higher than Floor 2's.
   Options: (a) the mirror is cast **in addition to** its attack, the smallest change — one line in
   `planIntent`, since the intent is already a list; (b) it mirrors on alternate turns and attacks
   on the others; (c) the mirrored card lands at the enemy's scale. Recommendation: (a).
2. **Full runs are an HP-attrition test that only the Vampire passes.** With the fixed policy, the
   Vampire reaches Floor 2 in 63% of runs and clears the castle in 14%; the Barbarian reaches
   Floor 2 in 11%; the Mage, Thief and Gambler in 0 of 200. The mechanism is measured, not
   guessed: every hero but the Vampire loses about 12 HP per standard Floor 1 fight, and a Floor 1
   path is about nine battles and one or two elites before the boss, against 70–90 max HP and a
   30% rest — roughly 110 HP of attrition. The Vampire's lifesteal cuts it to 3.5 HP a fight.
   Deaths cluster at the Floor 1 elites, reached already worn down. This is **not a regression**:
   Floor 1 is reference content that no step since Phase 1 has changed (outside the Mage's High,
   §H6), and earlier fuzzes hid it by giving half their runs 2,000 HP. The agent is weak — it
   never shops, removes a card, or saves Defend for a big hit — so this is a floor on real play,
   not a forecast. Whether Floor 1's attrition is intended is the question it raises.

Per-elite detail behind both (starter deck, full HP, 200 fights each):

| Elite | Barbarian | Mage | Thief | Vampire | Gambler |
|---|---|---|---|---|---|
| F1 Dungeon Warden | 100% | 52% | 84% | 99% | 97% |
| F1 Armored Knight | 92% | 5% | 13% | 79% | 35% |
| F2 Death Knight | 94% | 7% | 7% | 81% | 28% |
| F2 Bone Golem | 98% | 5% | 15% | 87% | 29% |
| F3 Sanctum Guardian | 14% | 3% | 2% | 11% | 13% |
| **F3 Dark Arcanist** | **100%** | **100%** | **100%** | **100%** | **100%** |
| F4 King's Champion | 2% | 0% | 0% | 3% | 1% |
| F4 Void Colossus | 0% | 0% | 0% | 0% | 0% |

G4 (the Mage's elite weakness) remains open and is visible here: she is last or joint-last
against every elite but the Arcanist.

### Phase 3e — run UI: engine suite and browser smoke passed; reviewed

**New screens and surfaces:**
- **Boss introduction** (`bossIntro` state). The boss door opens onto it; the fight starts from
  "Face them", and there is no way back. Portrait, name, title, the reference's pre-fight hint
  text, and the boss's numbers (HP, attack, defend, starting Block) — a companion boss has the
  plain attack/defend AI, so those numbers are the whole story.
- **Floor cleared** (`floorClear` state), between the boss's card reward and the Soul Forge: the
  path or paths walked, rooms, fights and elites, HP. Each floor's record is kept in `run.cleared`.
- **Map overlay**, from a 🗺 Map button on every run screen and in the combat top bar, or `M`.
  Every floor's three paths, the current floor marked, your path and room ringed, played rooms
  dimmed, the Mirror's slot on your path, cleared floors ticked with their boss named.
- **Run end** now lists each floor cleared: its boss, the path taken, the fights.

**Fixed on existing screens:**
- **The Soul Forge's "Keep my Souls" was off-screen at 844×390** — missed by step 3b's validation,
  found by the new smoke check on its first run. The phone-height rules had been added one screen at
  a time (die cache, then shop); they are now one rule for every run screen, which also covers the
  new ones.
- **Six glyphs drew as missing-glyph boxes** on this machine's Chrome, several of them always on
  screen: 🫗 was the Vulnerable status icon, 🫥 the Void Wraith's sprite, 🪙 three cards and the coin
  toast, 🪞 the Mirror panel, 🫳 a Vampire card (Drain Touch), and 🪨 Stone Skin's float (added in 3d). Most come
  from the reference, which draws the same boxes here. Each is replaced by an older glyph that
  renders (COMPARISON §H8).
- A boss's reward screen names the boss; "Floor N cleared" moved to the new summary screen.

**Engine:** two run states and two actions (`faceBoss`, `leaveFloorClear`), with the per-floor
record built from the run's own visit history. No combat code changed.

**Tests:** 177/177 engine (1 new, plus the boss-flow test extended through both new states). The
run-flow fuzz walks both states and asserts one record per floor cleared.

**Browser smoke:** 7/7 — the glyph check, three full or two-floor runs (desktop and both phone sizes,
touch emulated, one with the map opened on every screen), the Floor 4 intent list, a phased turn,
and a map scenario. Each long run is required to see the Mirror, boss, Magic Door and hidden-door
variants of the door screen, and is layout-checked on each.

**The smoke tool was mutation-tested before it was trusted.** Each check was shown to fail on a
deliberately introduced defect, then the defect was reverted:
- the 3d breakage (the `renderDie` export removed) → fails in 9 s, "the page never showed a screen"
- an undefined value printed on the floor-cleared screen → fails on "undefined"
- the old Vulnerable glyph restored → fails, naming `src/engine/statuses.js:33`

Along the way the tool itself had three bugs, all fixed: its walker spun forever on a one-card
choice that was already made; a failed boot waited out the full step budget instead of failing in
seconds; and its name filter ignored the first argument.

**Owner review of 3e:** approved, with one change: the map hides floors not yet reached (applied
before 3f; COMPARISON §H8). Browser smoke stays a required check alongside the full suite.

**Found by looking at the screenshots rather than by a check:** the boss introduction printed a
literal "null" after its stat chips (the DOM's own `append()` stringifies a missing child). Fixed,
and the text-hole check above was added so it cannot recur silently.

### Phase 3d — Floors 2–4 enemies, elites, intent lists: automated validation passed; reviewed

**New content:** 15 standard enemies (5 per floor) and 6 elites (2 per floor), with the
reference's stats and pools. Every floor now fights its own enemies; the Floor 1 stand-in and its
HUD label are gone, replaced by the floor's name.

**Architecture (PHASE3_PLAN R5–R7), extensions only:**
- **R5 — the intent is a list.** `previewIntent()` resolves every number in the list against
  current state and `resolveIntent()` executes exactly the plan it returns, so the display and
  the resolution are one walk of one list. An ability that changes the damage of the same turn's
  attack is an action *in* the list rather than a turnStart hook — Throne Guard's Loyal reads
  "+2 Strength, then 18", never 16 followed by an 18 landing.
- **R6 — new hook points**, all of them dispatched: `playerTurnStart`, `onPlayerCard`, a damage
  `guard`, an `onDeath` revive and `statusImmune`. The last three are installed onto the enemy
  object, so `engine/damage.js` uses them without importing `engine/enemies.js`.
- **R7 — `engine/mirror.js`**, card mirroring for Spell Steal, built once here for Sir Crimson's
  Echo to reuse in Phase 5.
- **D2 — player-side Poison and Burn**, mirroring the enemy's timing.

**Tests:** 176/176 (29 new, `tests/enemies.test.js`).
- One rule test per fix in PHASE3_PLAN §3, including the negatives: Undying does **not** revive
  from a Burn tick, Bone Wall ignores Attacks, Collapse adds nothing at 0 Block, Holy Wrath does
  not compound, Spell Steal forgets a card from last turn.
- Two content lints: every Floor 2–4 ability describes itself with no hole in the text, and every
  declared ability is wired to something that can actually dispatch it.
- The intent-equals-action fuzz now walks the whole action list. Every damaging action carries
  `landed` — the exact amounts, in order, with Fly accounted for wherever the turn's first hit
  falls — and the suite asserts those are the amounts that land.
- The combat fuzz covers all 36 enemies × 5 heroes × 150 seeds.

**Browser:** a full four-floor run with no page errors; Floor 4 and Floor 3 combats at 1280×720
and 844×390. The two-action intent renders as two chips (Throne Guard: "💢 +2" then
"⚔ 18 ~~16~~"), and a phased turn shows a 👻 chip with the attack chip dimmed.

**Found and fixed during validation:**
- **The Bone Golem was unkillable.** +8 Block per Skill with no reset is an unbounded ratchet;
  the fuzz agent stalemated 23 of 200 runs, all of them against it. Bounded to the first Skill
  each turn, with its Block resetting each of its turns like every other Block ability. The
  stalemate rate went to 0 of 200. The reference's version never fired at all, so nothing is
  being changed away from — but the bound is a design choice, flagged in COMPARISON §H7.
- **Spell Steal's number drifted.** A stolen card whose damage reads live state (Combustion reads
  the enemy's Burn, which step 1 ticks down before the enemy acts) showed one number on the
  intent and landed another. The card is now snapshotted as it is cast; the enemy's own
  modifiers still apply live.
- **Fly was double-counted** for bursts and mirrors, which took the raw number from the plan and
  were then halved again on impact. Fly is now walked across the whole action list.

**Owner review of 3d:** approved. The Bone Wall bound is kept and logged as a V2 design decision
(COMPARISON §H7), with the first-Skill-per-turn limit stated in its text. Browser smoke
validation is now a **required** check alongside the engine suite, because this step showed the
unit tests cannot see UI breakage (see *Testing strategy*).

### Phase 3c‑a — High scales with the die: automated validation passed; reviewed

Owner decision, applied: High is the die's **upper third**, `floor(sides × 2/3) + 1`; Max,
Extreme, Odd and Even unchanged; no die withheld from a hero; the active rule and face count
still shown wherever a die is previewed or equipped. Recorded as a V2 design decision in
COMPARISON.md §H6, because the GDD defines no multi-die affinity scaling. No Mage compensation
applied elsewhere, and **G4 is left open** (§G4).

**Owner review of 3c‑a:** `floor+1` approved as the current V2 rule. G4 deliberately left open
for a later manual balance review, not resolved by this change.

`floor+1` rather than `ceil`: where 3 divides the die, `ceil` returns the boundary face and puts
it inside High, making a d6 4+ — a half, not an upper third. The two formulas agree on the d4,
d8, d10 and d20; they differ only on the d6 (5+ vs 4+) and the d12 (9+ vs 8+).

| Die | High | Faces | Share |
|---|---|---|---|
| d4 | 3+ | 2 of 4 | 50% |
| d6 | 5+ | 2 of 6 | 33% |
| d8 | 6+ | 3 of 8 | 38% |
| d10 | 7+ | 4 of 10 | 40% |
| d12 | 9+ | 4 of 12 | 33% |
| d20 | 14+ | 7 of 20 | 35% |

**Tests:** 147/147 (2 new, both in `tests/dice.test.js`).
- The threshold per die; that it is strictly above the lower two thirds on every die (the
  property that separates `floor+1` from `ceil`); the 33–40% share band, with the d4 at 50% as
  the stated rounding outlier.
- Max, Extreme, Odd and Even asserted unchanged across die sizes.
- Every affinity is reachable on every die — asserted across the whole cross-product.
- A card-level test, not just a label test: a Mage's Frost Bolt fires its High branch at 5 on a
  d6 but not at 4 (which `ceil` would have allowed), at 3 on a d4, and not at 13 on a d20.

**Scope:** High is used by 20 cards, all Mage. The other four heroes' rows in CARDS.md's balance
table are byte-identical under all three rules — fixed 6+, `ceil`, and `floor+1`.

**Mage balance, three-way** (CARDS.md starter-deck table, 300 seeded fights per cell, greedy
agent; win % / avg turns to win / avg HP lost in a win):

| Matchup | Fixed 6+ (1 of 6) | `ceil` 4+ (3 of 6) | **`floor+1` 5+ (2 of 6)** |
|---|---|---|---|
| Dungeon Warden (elite) | 24% / 17.0 / 58 | 84% / 14.8 / 48 | **55% / 15.6 / 53** |
| Armored Knight (elite) | 0% — never won | 20% / 29.5 / 57 | **5% / 28.9 / 59** |
| Castle Guard | 100% / 11.5 / 30 | 100% / 9.2 / 18 | **100% / 10.2 / 23** |
| Cursed Hound | 99% / 8.2 / 32 | 100% / 6.9 / 21 | **99% / 7.5 / 26** |
| Iron Archer | 100% / 6.4 / 32 | 100% / 5.6 / 20 | **100% / 6.0 / 25** |
| Skeleton | 100% / 9.2 / 13 | 100% / 7.8 / 8 | **100% / 8.5 / 11** |

`floor+1` lands close to halfway between the other two on every cell, which is what halving the
affinity gain (1→2 faces instead of 1→3) predicts. Normal fights are modestly faster and
cheaper; the elites are where it shows.

**G4 is left open, and the results support that.** Against the field, the Mage is still last of
five on both Floor 1 elites — Dungeon Warden 55% against 85–100% for the others, Armored Knight
5% against 12–93%. She is off zero, so the weakness is no longer absolute, but it is intact and
undecided. Nothing was compensated elsewhere.

### Phase 3c — die types: automated validation passed; reviewed

**New:**
- `content/dice.js` (the six dice as data: faces, bonus, floor gate, and a `{param}` text
  template so a die's description cannot drift from its effect).
- Die state moved to the run (`run.die`), read once by `createCombat()` like every other run
  modifier. Heroes no longer declare a die size; the Gambler keeps her own roll floor.
- The four bonuses, each at the choke point that owns it: the Cursed Die's floor inside the roll,
  the Hunter's Die in the player attack pipeline, the Arcane Die and the Titan's Die in
  `startTurn()` on the turn-start roll only.
- A real die-cache screen (2 floor-gated offers, or leave), replacing the step-3b placeholder.
  Shop die tiles are live, name the die they sell, and refuse a die already equipped.
- `affinityLine()`: every screen that names a die states what the hero's affinity means **on that
  die**, with the face count (decision D8).
- Review option `?die=`.

**Tests:** 145/145 (19 new, `tests/dice.test.js`).
- Content lint over every die: no unresolved `{param}`, and each bonus declares the number it reads.
- One rule test per bonus, including the negatives: an even **reroll** does not re-pay the Arcane
  Die; no other die pays the Hunter's Die's +2; the d6's max face is not the Titan's Die's bonus.
- The Hunter's Die's +2 sits inside Weak and Vulnerable, and the number previewed on the card is
  the number that lands.
- Acquisition: floor gates, never the d6, never the die held, a cache never advancing past the
  room it guards, shop tiles equipping what they advertise, and no two tiles for the same die.
- The combat fuzz now equips a random die in half of its runs, so the intent-equals-action,
  die-within-its-faces and Energy invariants all run against d4–d20.

**Browser:** full four-floor runs through every screen, taking dice from caches, as the Barbarian
and the Gambler at 1280×720; the die cache and the shop at 844×390; a d20 combat as the Vampire at
844×390. No page errors.

**Found and fixed during validation:** the shop's die tiles used fixed font sizes inside a tile
sized from `--card-h`, so their text spilled out of the tile at 844×390; they now scale with the
shelf like the card beside them. The die cache's Leave button fell below the fold at phone
heights. The d6's reference emoji (`⚀`) is a text-presentation codepoint that renders as a tofu
box in the status chip on Windows, and was replaced.

**Owner review of 3c:** approved. The flagged affinity problem (§H5) was resolved by the rescale
above rather than left in the UI.

### Phase 3b — rest sites, shops, Soul Forge: automated validation passed; reviewed

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

**Owner review of 3b:** approved; no architecture changes requested. Step 3c follows.

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
  (COMPARISON G4, diagnostic below). *The numbers below are the Phase 2 ones, under a fixed
  High = 6+. Step 3c‑a's affinity rescale moved them to 55% / 5%; G4 itself is still open.*
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
