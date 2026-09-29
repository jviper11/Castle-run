# Phase 3 Plan — the castle: floors, paths, rooms, economy

**Status:**
- **3a (map and run flow) is done:** a playable full-run skeleton, reviewed by the owner.
- **3b (rest sites, shops, Soul Forge) is done:** reviewed and approved by the owner, with no
  architecture changes requested.
- **3c (die types) is done and approved**, including the §H6 affinity rescale that resolved the
  two D8 consequences flagged in §H5. High is now the die's upper third, `floor(sides × 2/3) + 1`
  — a **V2 design decision**, COMPARISON §H6. It is Mage-only: no other hero's cards use High.
  **G4 stays open** — the rescale moves the Mage off 0% against the Armored Knight but leaves her
  last of five on both Floor 1 elites, and nothing was compensated elsewhere. Three-way balance
  measurements are in IMPLEMENTATION_PLAN.md, "Phase 3c‑a". `floor+1` is the approved V2 rule;
  G4 is held for a later manual balance review.
- **3d (Floors 2–4 enemies) is done:** all 15 standard enemies, 6 elites, intent lists (R5), the
  new hooks (R6), card mirroring (R7) and player-side Poison/Burn (D2). Every §3 fix is live and
  has a rule test. Approved; the Bone Wall bound is a V2 design decision (COMPARISON §H7).
- **3e (run UI) is done:** boss introduction, floor cleared, the map overlay and the run-end summary,
  plus phone-height and glyph fixes on existing screens. Both required checks pass (`npm test`,
  `npm run smoke`). Approved; the map now hides floors not yet reached.
- **3f (final Phase 3 validation): automated validation complete; stopped for owner review and the
  manual playtest.** All four automated items pass. Two balance findings are flagged, not changed:
  the Dark Arcanist loses to every starter deck (Spell Steal as specified in D6 replaces its
  attack), and full runs are an HP-attrition test only the Vampire reliably survives
  (IMPLEMENTATION_PLAN.md, "Phase 3f").
- The owner approved D1–D8 as recommended, with this guidance:
  - quiet-room placeholders that preserve pacing;
  - Poison/Burn as proper engine statuses;
  - fixed shop stock, flagged;
  - bosses as true floor-ending fights;
  - the Mirror shows its destination before payment, keeps the room index, once per floor;
  - Spell Steal names the exact card;
  - Phase blocks every damage source;
  - d20 text describes only real behaviour.

**Goal:** a full run through four floors, replacing the six-fight gauntlet.
- Path select, rooms, doors, Magic Doors and the Mirror.
- Rest sites and shops.
- Dice types.
- The Soul Forge.
- Every Floor 2–4 enemy and elite.
- Companion floor bosses as plain fights.

**Sources:** the reference `../js/game.js` (map, navigation, Mirror), `../js/ui.js` (rest, shop,
die reward, Soul Forge, reward chain), `../js/combat.js` (floor clear, enemy specials) and
`../js/data.js` (enemies, bosses, dice, Soul upgrades, shop items), checked against GDD §3, §8
and §13–15. File:line references below are into the reference.

---

## 1. Scope

**In Phase 3:**

| Area | Reference behaviour to reproduce |
|---|---|
| **Map** | 4 floors × 3 paths. The same 15-slot templates on every floor are cut to 13–15 rooms (one length per floor). Room 0 is always a battle. Each room from index 2 has a 25% Magic Door (`game.js:139-179`). |
| **Path select** | All three paths visible with room icons and Magic Door markers. Commit to one per floor. |
| **Doors** | A single Continue door. Or Continue plus a Magic Door: 25% die cache, otherwise a random room type that replaces the next room. On floors 3–4, 60% of Magic Doors are hidden and show a hint line. |
| **Mirror** | A paid path switch at 30/50/70/100 Gold by floor. See D5 for the rules. |
| **Rooms** | Battle (easy pool for the first 2 rooms of Floor 1), elite, rest, shop, event (stub, see D1), die cache. |
| **Rest** | One action: heal 30% of max HP, upgrade a card (free), or remove a card (free). |
| **Shop** | Card/die stock, removal (75 Gold), upgrade (80 Gold), and a die tile (80 Gold). Relic and consumable shelves arrive in Phase 4. See D3. |
| **Dice types** | d4 (rolls below 3 become 3), d6, d8 (+2 attack damage on odd rolls), d10 (+1 Energy on an even turn-start roll), d12 (max turn-start roll draws 6), d20 (see D8). One die is equipped at a time, and a new die replaces it. |
| **Floor clear** | Boss Gold (80), full heal, card reward, Soul Forge (Floors 1–3), then the next floor's path select. |
| **Soul Forge** | 3 random offers from the 8 GDD §15 upgrades. One purchase per visit, or decline and keep the Souls. |
| **Enemies** | Floor 2–4 standard pools, elites 2–7, and the five companion bosses (reference stats, generic attack/defend AI), with the agreed fixes (§3). |
| **Economy** | Reference values: enemy Gold as in data.js; Souls 1 / 2 / 3 per normal / elite / boss fight; start with 30 Gold; skip reward +10. GDD conflicts are logged (§5). |

**Not in Phase 3:**
- **Phase 4:** relics (the shop relic shelf, the boss relic pick, Void Compass), consumables (the
  shop shelf, the elite drop), events, curses, and the Gambler's Curse `mapBlind`.
- **Phase 5:** Sir Crimson's beats and fight, Challenges, Cores and lore, the save file, Aldric
  and the endings. After the Floor 4 boss, the run ends on a "Floor 4 cleared — King Aldric
  awaits (Phase 5)" screen.

---

## 2. Architecture: extensions only

The Phase 1–2 rules stand: pure engine, event log, one fight-start path, one turn-state builder,
data-only content. Phase 3 adds a run-level layer with the same discipline.

- **R1. `engine/map.js`**
  - Seeded map generation from `content/map.js` (templates, room table, Mirror costs, hint text).
  - Magic Door contents are rolled **when the map is generated** and stored in it. The reference
    rolls them when the door is drawn, so a redraw could change a door.
  - Hidden-door rolls are also stored.
- **R2. `engine/run.js` becomes a small state machine.** The run is always in exactly one state,
  e.g. `pathSelect`, `doors`, `room:rest`, `combat`, `reward`, `soulForge` or `runEnd`.
  - Every player action is a function that checks the current state and moves to the next.
  - The UI only renders the current state. That replaces the reference's chain of timed
    screen-to-screen callbacks.
  - A run-flow fuzz walks thousands of seeded runs through it.
- **R3. The run deck keeps per-copy identity** (`{ uid, key }`, as in Phase 1). Upgrade and
  removal target one exact copy. The reference swaps "the first matching key".
- **R4. Run modifiers feed `createCombat()`.** `run.die` (die type), `run.maxEnergy`,
  `run.extraDraw`, `run.startBlock` and the Soul upgrade flags are read once at fight start. There
  is still one fight-start path, now covering normal, elite and boss fights.
- **R5. An enemy intent becomes a list of actions**, e.g. an attack plus Arcane Overload's 25, or
  Holy Wrath's doubling. The intent display and resolution both walk the same list, so "intent is
  the move" still holds and is still fuzz-tested.
- **R6. New enemy hook points**, alongside `turnStart` / `afterAttack` / `hp`:
  - `onPlayerCard` — Bone Wall, Spell Steal's memory
  - `playerTurnStart` — Void Stalker's Curse, Death Knight's Soul Drain
  - `incomingDamage` — Phase, Stone Skin
  - `onDeath` — Undying revives; a lethal DoT tick still bypasses them (GDD §4)
  - `statusImmune` — King's Champion
- **R7. Card mirroring** (for Spell Steal, D6): plays a card's ops "against" the player.
  - Damage hits the player through the enemy pipeline.
  - Block goes to the enemy.
  - Debuffs land on the player; buffs go to the enemy.
  - Cards without a sensible mirror are skipped and say so.

  Built once here; Sir Crimson's Echo reuses it in Phase 5.

---

## 3. Enemy fixes (agreed rule: dead or broken abilities follow the GDD)

| Enemy | Reference problem | Fix |
|---|---|---|
| **Holy Wrath** (Sanctum Guardian) | `damage *= 2` is permanent and compounds (`data.js:840`) | Doubles that attack only, when your Block is 15+ as it attacks. The intent shows the doubled number while that holds. |
| **Phase** (Shadow Wraith) | Sets `_phased`, which nothing reads | Immune to damage on alternate player turns, telegraphed on its intent. See D7. |
| **Phase+** (Shadow Wraith+) | Phase dead, and "attacks twice" not implemented | Phase as above; attacks twice when not phased. |
| **Stone Skin** (Gargoyle) | `_stoneShield` never read | Negates the first 5 damage it takes each player turn. Shown as a status. |
| **Bone Wall** (Bone Golem) | Its `skill` trigger is never dispatched | +8 Block whenever you play a Skill. |
| **Curse** (Void Stalker) | Message only | At your turn start, one random card in hand costs +2 this turn. Shown on the card through the cost pipeline. |
| **Spell Steal** (Dark Arcanist) | Message only | On its turn, it copies the last card you played that turn against you (R7). The intent names the card live as you play. See D6. |
| **Soul Drain** (Death Knight) | Takes 1 Energy at the enemy's turn 1; the next turn start refills it | Your first turn starts with 1 less Energy. |
| **Unbreakable** (King's Champion) | Wipes statuses at its turn start, so Burn and Vulnerable still work for a turn | Statuses cannot be applied to it at all. Cards say "immune" when played. |
| **Acid Touch / Drain / Void Drain** (Crypt Crawler, Blood Bat, Void Wraith) | Strip your Block **after** the hit, when it is spent and about to reset anyway | Strip before the hit, as part of the attack ("on hit"), shown on the intent |
| **Collapse** (Void Colossus) | Reads your Block after the attack already consumed it | Extra damage equal to your Block **before** the hit. Still bypasses Block, as in the GDD note. |
| **Undying / Undying+** (Cursed Knight, +) | The revive is an `hp` trigger that also runs after hits | An `onDeath` revive (15 HP once / 20 HP twice). A lethal Burn or Poison tick bypasses it, per the GDD. |
| **Poison Arrow / Arcane Burn** (Bone Archer, Dark Sorcerer) | Apply player Poison/Burn, which never tick | Depends on **D2** |
| Blood Cultist, Royal Sorcerer, Throne Guard, Corrupted Priest | Work | Kept. Their damage is now part of the intent list (R5). |

---

## 4. Run-flow fixes (confirmed in reference source)

| # | Bug | Fix |
|---|---|---|
| X1 | A Magic Door **die cache skips the next room.** It clears the room's magic flag, then `proceedDoors()` marks that unentered room cleared and moves past it (`game.js:435-439` → `:220-238`). | The die cache is its own stop; the next room is still played |
| X2 | **Bought shop tiles can be bought again.** Only a `.sold` CSS class is added; the click handler remains (`ui.js:696, 803`). | A bought tile is removed from stock in engine state |
| X3 | Magic Door contents are rolled at render time | Rolled with the map (R1) |
| X4 | Shop upgrade eligibility (`CARDS[k+'+']`) and the upgrade itself (`CARD_UPGRADES`) check different tables | One check. Every card has an upgrade except the two flagged identical ones, which the rest and shop offer anyway, as the reference does. |

---

## 5. Kept + flagged (reference behaviour differs from the GDD)

Kept as the reference has them, and logged in COMPARISON.md:
- **Floors:** four companion floors, then Aldric as a fifth fight. This matches GDD §1 ("after any
  four corrupted companions fall"); GDD §3's table puts Aldric on Floor 4.
- **Companion bosses do not scale with floor.** 75–95 HP, weaker than Floor 4 regular enemies.
- **Rest removal is free** and may remove Strike or Defend. GDD §3 says rest is "heal or
  upgrade", and §13 prices rest removal at 75.
- **Shop removal costs 75** (GDD: 100). **Skip reward pays 10** (GDD: 50, already C3).
- **Enemy Gold grows by floor** (normal fights 12–40, elites 40–90), beyond GDD §13's
  15–25 / 30–45.
- **Events are never hidden on path select.** GDD §3 hides them on Floors 3–4.
- **Path C has as many events as Path A.** GDD §3 describes C as event-heavy.
- **Elites grant no relic** without Void Compass (Phase 4).
- **Path lengths:** all three paths on a floor share one rolled length.

---

## 6. Decisions needed before coding

Each has a recommendation.

**D1. Event rooms before Phase 4.** Events are Phase 4, but event rooms are in the templates.
- **Recommendation:** an event room is a "quiet room" stub that says events arrive in Phase 4,
  and you continue.
- Alternative: treat event rooms as battles until Phase 4. That skews economy and difficulty.

**D2. Player-side Poison and Burn.** You deferred these earlier, "unless needed by the current
feature set". Bone Archer and Dark Sorcerer are now in scope, and without player DoT their
abilities do nothing.
- **Recommendation:** implement them now, mirroring the enemy timing:
  - your Burn ticks at the end of your turn;
  - your Poison ticks after the enemy acts;
  - both ignore Block and lose 1 stack per tick.
- Alternative: keep them deferred, and log both abilities as dead.

**D3. Shop card stock.** The reference shelf is a fixed four-item list for every hero, plus two
consumables: Blizzard 60, Hunter Die 55, Life Leech 70, Iron Wall 65 (`data.js:1445`). So a
Barbarian is offered the Vampire's Life Leech and the Mage's Blizzard.
- **Recommendation:** keep the reference list for now and flag it. A hero-pool stock (e.g. five
  cards priced 50 / 75 / 100 by rarity, inside GDD §13's range) is new design and needs your call.
- Alternative: build the hero-pool stock now.

**D4. Companion bosses in Phase 3.**
- **Recommendation:** include them now as plain fights (reference stats, generic AI), so every
  floor ends with a boss, a heal and the Soul Forge. Challenges, Cores and lore stay Phase 5.
- Alternative: each floor ends at its last room until Phase 5.

**D5. Mirror rules.** In the reference:
- it appears at 60% of the path (GDD: the halfway point);
- it always reflects the first other path (A→B, B→A, C→A), so Path C can never be reached;
- it lands you at the target's halfway point, about 2 rooms *back*;
- its once-only flag is per path, so you can mirror twice on one floor.

**Recommendation:**
- it appears at the halfway point;
- it reflects a seeded random other path, shown before you pay;
- you land at the same room index;
- once per floor.

Alternative: reproduce the reference exactly.

**D6. Spell Steal** ("copies the last card played against them").
- **Recommendation:** on its turn it plays a mirrored copy of the last card you played that turn
  (R7). Damage hits you, Block goes to it, debuffs land on you. If you played nothing, it
  attacks normally. The intent shows which card it will copy.
- The alternative interpretation is that it copies the last card you played on it; it would not
  be telegraphed.

**D7. Phase.**
- **Recommendation:** on alternate player turns the Wraith is immune to all damage, including
  that turn's Burn tick. Its intent shows 👻 Phased, so you can spend the turn on Block and setup.
- The alternative is immune to card damage only, with DoT still landing.

**D8. The d20.** Its `legendary` bonus is never read, and its "15+" text is false. High is
simply 6+ on any die, so a d20 makes High trivial.
- **Recommendation:** a d20 with no bonus and honest text, flagged for design.
- The alternative is to invent a bonus.

---

## 7. Work order

Each step ends with `npm test` green.

| Step | Content |
|---|---|
| **3a** | ✅ `content/map.js` + `engine/map.js` + the run state machine (R1–R3). Path select, doors, Magic Doors, Mirror, floor progression, run end. Tests, plus a run-flow fuzz that walks random seeded runs to the end with combat auto-resolved. |
| **3b** | ✅ Rest, shop (D3), die cache, Soul Forge with all 8 upgrades (including the Second Die and Gambler's Edge die-panel buttons), floor-clear rewards. |
| **3c** | ✅ Dice types d4–d20 (D8) through R4; affinity on bigger dice — High rescaled to the die's upper third (§H6), Extreme = 1 or max face, Max = max face — with the active rule and face count shown wherever a die is previewed or equipped. |
| **3d** | ✅ Floors 2–4 enemies, elites 2–7 and companion bosses (D4), with intent lists (R5), the new hooks (R6), card mirroring (R7, D6), player DoT (D2) and every §3 fix. The intent-equals-action fuzz covers all of them. |
| **3e** | ✅ UI:<br>• path select and an in-run map overlay<br>• the door screen (hidden doors with their hints)<br>• the Mirror panel<br>• rest, shop, die cache, Soul Forge<br>• boss intro, floor cleared, run end<br>Desktop and phone landscape. |
| **3f** | ✅ automated / ⏳ playtest — Validation:<br>• full-run fuzz for every hero across four floors<br>• per-floor balance table in CARDS.md, plus a "full run" column for the same naive agent<br>• headless-Chrome autoplay of a full run per hero<br>• owner manual playtest |

---

## 8. Testing additions

- **Map properties over many seeds:**
  - every path matches its template prefix;
  - lengths are 13–15;
  - room 0 is a battle;
  - no Magic Door at index 0 or 1;
  - hidden doors appear only on Floors 3–4;
  - the same seed gives the same map.
- **Run-flow invariants:**
  - every action is legal only in its state;
  - no room is skipped or played twice (X1);
  - the run ends in a win or a death;
  - Gold and Souls are never negative;
  - deck uids are unique;
  - an upgrade or removal changes exactly one copy.
- **Shop:** stock bought once only (X2); prices are paid exactly; you cannot buy with too little
  Gold.
- **Soul Forge:** offer rules (3 of the eligible, Vitality repeatable at a rising cost), one
  purchase per visit, and each upgrade's effect in combat.
- **Enemies:** every §3 fix gets a rule test. The fuzz intent invariant extends to action lists,
  Phase, Stone Skin, Holy Wrath and Spell Steal.
- **Balance:** the stalemate monitor (G5) keeps running across all floors.
