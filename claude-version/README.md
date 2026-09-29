# Castle Run — claude-version

A clean-room implementation of Castle Run. It sits beside the reference build, which it does
not modify.

- `IMPLEMENTATION_PLAN.md` — the architecture and the phase plan.
- `COMPARISON.md` — every behaviour difference from the reference build.

## Run

ES modules do not load over `file://`, so the game needs a local server. This one serves the
repository root, so `../assets` resolves the same way it does on GitHub Pages:

```
node tools/serve.js          # → http://localhost:8080/claude-version/
```

URL options for testing:

| Option | Effect |
|---|---|
| `?seed=123` | Reproducible run |
| `?hero=barbarian` | Skip the title and hero screens |
| `?floor=3` | Start at that floor's path select |
| `?hp=500` | Starting max HP, to walk a whole run |
| `?gold=300`, `?souls=20` | Starting Gold / Souls, to try the shop and Soul Forge |
| `?soul=secondDie,gamblersEdge` | Start with those Soul Forge upgrades (ids in `src/content/rooms.js`) |
| `?die=d20` | Start with that die equipped (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`) |
| `?fast=1` | Near-instant animations (`?fast=max`: none at all, as the smoke check uses) |
| `?deck=a,b+,c` | Replace the starting deck (card keys; `+` means upgraded) |

Heroes: all five are playable. `?hero=mage` (or thief, vampire, gambler, barbarian) skips hero select.

Controls:
- **Desktop:** click a card to play it. Keys `1`–`9` play cards, `E` ends the turn, `R` rerolls,
  `M` opens the map.
- **Touch:** tap a card to preview it, then tap it again (or tap the preview) to play it.
- Hover or tap any status, ability, intent or die label to see its rules text. The die label names
  the die you carry and what your affinity means on it.
- **🗺 Map** (status bar on every run screen, and the combat top bar): every floor's paths,
  where you are, and what you have played.

## Card catalogue

```
node tools/catalogue.js      # regenerates CARDS.md: every card's text, upgrade and pool, plus balance
                             # tables for Floor 1, every floor, and 200 whole runs per hero
```

## Check

Two checks, and **both are required** before a step is called done:

```
npm test                     # engine suite: node --test, no dependencies (Node 22+)
npm run smoke                # browser smoke: drives the real UI in headless Chrome or Edge
npm run check                # both, in that order
```

The engine suite never imports the UI, so it cannot see a broken import, a missing render
function or a button pushed off a phone screen. `npm run smoke` can. It starts its own server,
walks seeded runs through the real page at 1280×720, 844×390 and 667×375 (the phone sizes with
touch emulated), and fails on:

- any page error, console error, or failed load of the game's own files
- a screen it was expected to reach, or a door-screen variant it was expected to see
- a visible, enabled button outside the viewport, or horizontal page overflow
- `undefined`, `null`, `NaN` or `[object …]` in a screen's text
- any emoji in `src/` or `index.html` that draws as a missing-glyph box in that browser

It takes about two minutes. It needs Chrome or Edge; set `CHROME_PATH` if neither is found, and it
exits with an error rather than skipping. Options:

```
node tools/smoke.js phone          # only scenarios whose name contains "phone"
node tools/smoke.js glyphs         # only the glyph check (about a second)
node tools/smoke.js --all-heroes   # one full four-floor run per hero instead (end of a phase, ~4 min)
node tools/smoke.js --shots DIR    # also save a screenshot of every screen and door variant
```
