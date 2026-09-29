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
| `?fast=1` | Near-instant animations |
| `?deck=a,b+,c` | Replace the starting deck (card keys; `+` means upgraded) |

Heroes: all five are playable. `?hero=mage` (or thief, vampire, gambler, barbarian) skips hero select.

Controls:
- **Desktop:** click a card to play it. Keys `1`–`9` play cards, `E` ends the turn, `R` rerolls.
- **Touch:** tap a card to preview it, then tap it again (or tap the preview) to play it.
- Hover or tap any status, ability, intent or die label to see its rules text. The die label names
  the die you carry and what your affinity means on it.

## Card catalogue

```
node tools/catalogue.js      # regenerates CARDS.md: every card's text, upgrade and pool, plus a balance table
```

## Test

```
npm test                     # node --test, no dependencies (Node 21+)
```
