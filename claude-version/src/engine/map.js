import { int, chance, pick, shuffle } from './rng.js';
import { FLOOR_COUNT, PATH_TEMPLATES, PATH_LENGTH, MAGIC_DOOR } from '../content/map.js';
import { COMPANION_BOSSES } from '../content/enemies.js';

// Map generation. Everything random about a floor is rolled here, once, from the run's seed:
// path length, Magic Doors and their contents, which doors are hidden, the boss, and the path
// the Mirror reflects. Nothing is re-rolled when a screen is drawn (PHASE3_PLAN X3).
//
// map.floors[f] = {
//   length,                     // 13–15, shared by all three paths
//   paths: { A: Room[], B, C },
//   boss,                       // enemy id of this floor's companion boss
//   mirror: { A: 'B'|'C', … },  // the path each path's Mirror reflects (D5)
//   mirrorUsed,                 // once per floor
// }
// Room = { type, magic: null | { type, hidden } }. `magic.type` is a room type or 'die'.

export function generateMap(rng, heroKey) {
  const bosses = shuffle(rng, Object.entries(COMPANION_BOSSES).filter(([hero]) => hero !== heroKey).map(([, id]) => id));
  const floors = [];
  for (let f = 0; f < FLOOR_COUNT; f++) {
    const length = PATH_LENGTH.min + int(rng, PATH_LENGTH.max - PATH_LENGTH.min + 1);
    const paths = {};
    for (const [key, template] of Object.entries(PATH_TEMPLATES)) {
      paths[key] = template.slice(0, length).map((type, i) => ({
        type: i === 0 ? 'battle' : type,
        magic: i >= MAGIC_DOOR.firstIndex && chance(rng, MAGIC_DOOR.chance) ? rollMagic(rng, f) : null,
      }));
    }
    const mirror = {};
    for (const key of Object.keys(paths)) mirror[key] = pick(rng, Object.keys(paths).filter((k) => k !== key));
    floors.push({ length, paths, boss: bosses[f], mirror, mirrorUsed: false });
  }
  return { floors };
}

function rollMagic(rng, floor) {
  const type = chance(rng, MAGIC_DOOR.dieCacheChance) ? 'die' : pick(rng, MAGIC_DOOR.types);
  const hidden = floor >= MAGIC_DOOR.hiddenFromFloor && chance(rng, MAGIC_DOOR.hiddenChance);
  return { type, hidden };
}

/** The room index at which the Mirror is offered: the halfway point (D5). */
export const mirrorIndex = (floor) => Math.floor(floor.length / 2);
