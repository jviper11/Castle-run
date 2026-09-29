// Map content. Data only. Values from the reference build (../js/game.js buildMap / showDoors,
// ../js/combat.js getMagicHint). Deliberate differences are listed in COMPARISON.md (§H).

export const FLOOR_COUNT = 4;

// Every floor uses the same 15-slot templates. One length (13–15) is rolled per floor and every
// path is cut to it, dropping the tail.
export const PATH_TEMPLATES = {
  A: ['battle', 'battle', 'rest', 'battle', 'elite', 'battle', 'event', 'battle', 'battle', 'rest', 'battle', 'elite', 'battle', 'event', 'battle'],
  B: ['battle', 'battle', 'elite', 'battle', 'shop', 'battle', 'rest', 'battle', 'event', 'battle', 'battle', 'shop', 'battle', 'rest', 'battle'],
  C: ['battle', 'battle', 'event', 'battle', 'battle', 'rest', 'battle', 'shop', 'elite', 'battle', 'battle', 'event', 'battle', 'battle', 'rest'],
};
export const PATH_NAMES = { A: 'Combat Heavy', B: 'Balanced', C: 'Events & Utility' };
export const PATH_LENGTH = { min: 13, max: 15 };

export const MAGIC_DOOR = {
  firstIndex: 2, // rooms 0 and 1 never have one
  chance: 0.25,
  dieCacheChance: 0.25, // otherwise a uniformly random room type from `types`
  types: ['battle', 'elite', 'event', 'shop', 'rest'],
  hiddenFromFloor: 2, // zero-based: Floors 3 and 4
  hiddenChance: 0.6,
};

export const MIRROR_COST = [30, 50, 70, 100]; // Gold, by floor

export const ROOMS = {
  battle: { icon: '⚔️', label: 'Battle' },
  elite: { icon: '☠️', label: 'Elite' },
  rest: { icon: '🔥', label: 'Rest' },
  shop: { icon: '💰', label: 'Shop' },
  event: { icon: '❔', label: 'Quiet Room' },
  die: { icon: '🎲', label: 'Die Cache' },
  boss: { icon: '👑', label: 'Boss' },
};

// Shown on a hidden Magic Door (reference ../js/combat.js:533-547).
export const MAGIC_HINTS = {
  battle: 'Growling echoes from behind the door. Something stirs.',
  elite: 'The door is cracked. Something stares back through it.',
  event: 'Strange symbols glow faintly across the door surface.',
  shop: 'The scent of candle wax and gold drifts from beneath.',
  rest: 'Warm orange light bleeds under the door.',
  die: 'A faint rattle, like dice waiting to be claimed.',
};

// Rooms whose content arrives in a later step show this, so the run is playable end to end now.
export const PLACEHOLDERS = {
  event: {
    title: 'A Quiet Room',
    text: 'Dust hangs in the still air. Nothing stirs here — for now.',
    note: 'Placeholder: events arrive in Phase 4.',
  },
};
