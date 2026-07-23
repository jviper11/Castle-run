# Castle Run — Design Discrepancies

This file records unresolved conflicts between design documents, progress notes, active split code, and the legacy monolith. It intentionally does not choose an answer. Resolve each item through an explicit design decision, then update the GDD, implementation, previews/tooltips, and progress documentation together.

## Weak timing

**Question:** Does Weak lose duration per enemy/player attack, per damage instance, or once per turn?

**Relevant files:**

- `GDD.md` — status table and status-timing rules.
- `CLAUDE.md` history and `PROGRESS.md` — prior timing claims.
- `js/combat.js` — damage calculation, enemy action, turn cleanup.
- `js/ui.js` — status tooltip and displayed description.
- `castle-run.html` — legacy behavior for comparison only.

## Burn damage

**Question:** Does each Burn stack deal 1 damage or 2 damage before modifiers such as Burning Soul?

**Relevant files:**

- `GDD.md` — Burn definition and timing summary.
- `PROGRESS.md` — records a change to stacks × 1.
- `CARD_UPGRADES_MASTER.md` — Burning Soul descriptions.
- `js/combat.js` — Burn resolution.
- `js/data.js` — Burn cards and Power descriptions.
- `js/ui.js` — previews and tooltips.

## Mobile orientation

**Question:** Must mobile play support portrait, or is mobile intentionally landscape-only/landscape-enforced?

**Relevant files:**

- `GDD.md` — says landscape and portrait are playable.
- `AGENTS.md` — prioritizes landscape-first mobile usability.
- `index.html` — rotate-device overlay.
- `css/styles.css` — portrait and landscape breakpoints.
- `js/ui.js` / `js/main.js` — orientation detection and startup wiring.

## Mirror behavior

**Question:** Is the Mirror a paid path-switch mechanic, or a forced rest/upgrade/remove event?

**Relevant files:**

- `GDD.md` — Mirror design descriptions.
- `PROGRESS.md` — describes a forced rest/upgrade/remove choice.
- `js/game.js` — active Mirror flow and path navigation.
- `js/ui.js` — Mirror UI where applicable.
- `castle-run.html` — legacy behavior for comparison only.

## True Ending requirements

**Question:** Does the True Ending require collecting four companion Cores, four specific True Ending relics, or both?

**Relevant files:**

- `GDD.md` — story, relic, boss-flow, and ending sections.
- `PROGRESS.md` — Two Endings, relic, and Aldric sections.
- `js/game.js` — run state and Core collection.
- `js/combat.js` — Aldric phases and ending checks.
- `js/data.js` — relic definitions.

## Normal ending castle outcome

**Question:** In the Normal Ending, does the castle endure and continue the cycle, or crumble when Aldric is defeated?

**Relevant files:**

- `GDD.md` — Normal Ending narrative.
- `PROGRESS.md` — Two Endings narrative.
- `js/ui.js` / `js/combat.js` — ending text and trigger flow.
- `castle-run.html` — legacy ending text for comparison only.

## Blood Lord trigger frequency

**Question:** Does Blood Lord heal once per Attack card played or once per damage instance/hit?

**Relevant files:**

- `CARD_UPGRADES_MASTER.md` — locks once per Attack card and calls out multi-hit cards.
- `js/data.js` — base and upgraded descriptions.
- `js/combat.js` — Attack-card and damage hooks.
- `js/ui.js` — displayed/previewed descriptions.
- `PROGRESS.md` — implementation history.

## Missing GDD cards and pool completeness

**Question:** Are hero pools considered complete without the GDD cards listed as uncoded, or must those cards be implemented or formally removed from the design?

**Relevant files:**

- `GDD.md` — designed card pools.
- `CARD_UPGRADES_MASTER.md` — simultaneously marks pools complete and lists missing cards.
- `PROGRESS.md` — implemented pool counts/status.
- `js/data.js` — implemented cards and upgrades.
- `js/ui.js` — active reward pools.

## `curseddice`

**Question:** Is `curseddice` intentionally removed from the game and design, or should it be restored?

**Relevant files:**

- `PROGRESS.md` — records its removal.
- `CARD_UPGRADES_MASTER.md` — still documents its upgrade.
- `js/data.js` / `js/ui.js` — active card and reward data.
- `castle-run.html` — legacy implementation.

## Battle reward wording and die rewards

**Question:** Are normal battle rewards card-only, or should they still offer a card-or-die choice?

**Relevant files:**

- `index.html` — reward subtitle says “card or die.”
- `PROGRESS.md` — says dice were removed from combat rewards and moved to shops, Magic Doors, and events.
- `js/ui.js` — active reward generation.
- `js/data.js` / `js/game.js` — die acquisition sources.
- `castle-run.html` — legacy reward wording/behavior.
