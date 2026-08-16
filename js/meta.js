// ═══════════════════════════════════════════════════════════════════
// CROSS-RUN PERSISTENCE — META PROGRESSION
// ═══════════════════════════════════════════════════════════════════
//
// Everything in `G` belongs to one run and is wiped by newGame(). This module holds the
// only state that outlives a run, and it deliberately holds nothing but the two permanent
// unlock facts the True Ending path needs (GDD.md §1 Two Endings, §9 Relic System):
//
//   coresCollected        Companions whose Core has been collected at least once, EVER.
//                         Beating a corrupted companion for the first time releases their
//                         Core and unlocks the ability to attempt their Challenge in a
//                         later run, so this is what gates Challenge availability.
//
//   challengeRelicsEarned Challenge relics earned across runs; 4 of 5 is the True Ending
//                         gate. Written by recordChallengeRelicEarned() when a Challenge
//                         fight is cleared (see js/combat.js). Nothing reads it for the
//                         ending yet — Aldric's Phase 3 gate still counts per-run Cores and
//                         is a deliberate follow-up.
//
// Explicitly NOT stored here, and not to be added here: Souls, current deck, relics held,
// Gold, HP, floor/room progress, hero pick. Those are per-run and newGame() already resets
// them; this module must never influence that reset.
//
// `META` is named unlike any field on `G` so the two can never be confused at a call site.
// Identifiers are file-level `const`/`let` in a classic script, the same way game.js
// declares `G` — meta.js is loaded before game.js so META always exists first.

const META_STORAGE_KEY = 'castleRunProgress';
const META_SCHEMA_VERSION = 1;

function defaultMeta() {
  return {
    version: META_SCHEMA_VERSION,
    coresCollected: [],
    challengeRelicsEarned: [],
  };
}

let META = defaultMeta();

// Keep only unique, non-empty strings. charKeys are not validated against CHARACTERS on
// purpose: this module stays free of data.js so a future hero cannot be silently dropped
// from a save written by a newer build.
function metaKeyList(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  value.forEach(k => {
    if (typeof k === 'string' && k.length > 0 && !out.includes(k)) out.push(k);
  });
  return out;
}

// Accepts absolutely anything — parsed JSON, null, a string, an array, a save from a
// future build — and returns a valid META. Anything unrecognised degrades to the empty
// default rather than throwing, because a corrupt save must never stop the game booting.
function normalizeMeta(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultMeta();
  // Unknown schema version: no migration path exists for v1, so fall back to empty.
  // Newer-than-known saves land here too, which is why loadMeta() does not immediately
  // write the fallback back to storage — see the note there.
  if (raw.version !== META_SCHEMA_VERSION) return defaultMeta();
  return {
    version: META_SCHEMA_VERSION,
    coresCollected: metaKeyList(raw.coresCollected),
    challengeRelicsEarned: metaKeyList(raw.challengeRelicsEarned),
  };
}

// Reads saved progress into META. Safe to call more than once.
// Note this only ever READS — it never writes a repaired copy back. A save this build
// cannot understand (a newer schema version) is left on disk untouched, so merely opening
// the game in an older build cannot destroy it. Storage is only written when the player
// actually earns something, via saveMeta().
function loadMeta() {
  META = defaultMeta();
  try {
    // Touching localStorage can itself throw (disabled cookies, some private modes),
    // so the access is inside the try, not just the parse.
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    if (raw === null || raw === undefined) return META;  // nothing saved yet — fresh browser
    META = normalizeMeta(JSON.parse(raw));
  } catch (e) {
    // Malformed JSON, unavailable storage, anything else: keep the empty default. The run
    // is fully playable without persistence; only cross-run unlocks are lost.
    console.warn('[meta] Could not read saved progress — starting from empty:', e && e.message);
    META = defaultMeta();
  }
  return META;
}

// Persists META. Returns false if storage was unavailable, so callers can tell the
// difference between "recorded in memory" and "recorded permanently" if they ever need to.
// A failed write is not treated as fatal: the unlock still holds for the current session.
function saveMeta() {
  try {
    window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(META));
    return true;
  } catch (e) {
    console.warn('[meta] Could not save progress:', e && e.message);
    return false;
  }
}

// Records a companion's Core as permanently collected.
// Returns true ONLY on the first time ever for that companion — that is the moment the
// Core unlocks their Challenge, and the only moment worth a write. `G.cores` cannot answer
// this question: it is rebuilt from empty every run, so it distinguishes "collected this
// run" but never "collected before". That is exactly why this list is kept separately
// rather than mirroring G.cores.
function recordCoreCollected(charKey) {
  if (typeof charKey !== 'string' || charKey.length === 0) return false;
  if (META.coresCollected.includes(charKey)) return false;
  META.coresCollected.push(charKey);
  saveMeta();
  return true;
}

// Has this companion's Core ever been collected, in any run?
function hasCoreCollected(charKey) {
  return META.coresCollected.includes(charKey);
}

// Records a hero's Challenge relic as permanently earned. Same contract as
// recordCoreCollected(): writes only on the first time ever, returns true only then, so
// re-clearing a Challenge in a later run is a silent no-op rather than a duplicate.
// This is the list the True Ending gate will eventually count 4 of 5 from.
function recordChallengeRelicEarned(charKey) {
  if (typeof charKey !== 'string' || charKey.length === 0) return false;
  if (META.challengeRelicsEarned.includes(charKey)) return false;
  META.challengeRelicsEarned.push(charKey);
  saveMeta();
  return true;
}

// Has this hero's Challenge relic ever been earned, in any run?
function hasChallengeRelic(charKey) {
  return META.challengeRelicsEarned.includes(charKey);
}

// 4 of 5, not 5 of 5: the player can never Challenge their own chosen hero, so a fifth relic
// is unreachable within any single career built around one hero (GDD §1, §9).
const TRUE_ENDING_RELICS_REQUIRED = 4;

function challengeRelicCount() {
  return META.challengeRelicsEarned.length;
}

// The True Ending gate. Read once at the start of the Aldric fight (js/combat.js) to decide
// whether Phase 3 and the True Ending are reachable at all. Callers should use this rather
// than counting META.challengeRelicsEarned themselves, so the 4-of-5 rule lives in one place.
function hasTrueEndingRelics() {
  return challengeRelicCount() >= TRUE_ENDING_RELICS_REQUIRED;
}

// Boot. Done here at module load rather than from main.js's startup block so there is no
// ordering hazard: meta.js is the first script index.html loads, so META is populated
// before any run state, UI or combat code can read it.
loadMeta();
