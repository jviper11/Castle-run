# CASTLE RUN — AI AGENT RULES

## Project Context
This is a turn-based deck-building roguelite with dice mechanics.
The game is built using HTML, CSS, and JavaScript.

All decisions must align with the Game Design Document (GDD.md).

---

## Priority Order (VERY IMPORTANT)
1. Gameplay must always work
2. UI clarity over visual complexity
3. Mobile usability (landscape-first)
4. Clean and readable code

---

## Gameplay Rules (DO NOT BREAK)
- Turn-based combat only
- One active die per turn
- Player has 3 base Energy per turn
- Combat loop must always complete correctly
- No bugs that allow multiple dice to be active

---

## UI Rules (CRITICAL)
- Player and enemy must always be aligned
- Health bars must always be visible
- Dice panel must be compact
- Combat area is the focus of the screen
- Avoid clutter and overlapping elements
- Defense/Block must be clearly visible

---

## Coding Guidelines
- Make small, safe changes instead of full rewrites
- Do not remove working logic unless necessary
- Keep functions modular and readable
- Avoid breaking existing features

---

## When Making Changes
- Always consider how the change affects:
  - Combat flow
  - UI clarity
  - Mobile layout
- If unsure, preserve current functionality

---

## Current Verification Areas

The following areas require focused code review and play testing:

- Card displayed cost versus actual cost
- Card preview values versus actual effects
- Status timing and tooltip consistency
- Power-card behavior and Exhaust
- Enemy intent versus actual enemy action
- Mobile hand and selected-card preview
- Phone-height clipping and browser chrome

These are verification areas, not confirmed bugs unless supported by code inspection or reproducible testing.

## File Editing Rule
- Prefer editing the correct split file (`css/styles.css`, `js/combat.js`, `js/ui.js`, etc.) instead of putting logic back into `index.html`.
- Preserve the split architecture unless explicitly asked to refactor it.
- `index.html` is the deployed game entry point.
- `castle-run.html` is a legacy/reference snapshot. Do not edit it unless explicitly asked to compare or recover an older design.
