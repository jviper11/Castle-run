// Seeded RNG (mulberry32). The state is a plain object stored on the run, so a whole run —
// shuffles, rolls, enemy intents, rewards — is reproducible from its seed.

export function createRng(seed) {
  return { s: seed >>> 0 };
}

export function next(rng) {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [0, n). */
export function int(rng, n) {
  return Math.floor(next(rng) * n);
}

export function chance(rng, p) {
  return next(rng) < p;
}

export function pick(rng, arr) {
  return arr[int(rng, arr.length)];
}

/** Returns a new shuffled array; the input is not modified. */
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomSeed() {
  return (Math.random() * 2 ** 32) >>> 0;
}
