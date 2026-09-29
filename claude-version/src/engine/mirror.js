import { emit } from './log.js';
import { getCard, resolveParams } from './cards.js';
import { enemyAttackDamage, incomingToPlayer, hitPlayer, gainBlock, heal } from './damage.js';
import { addStatus, STATUSES } from './statuses.js';
import { evaluate } from './values.js';

// Card mirroring (PHASE3_PLAN R7, decision D6). Used by the Dark Arcanist's Spell Steal; Sir
// Crimson's Echo reuses it in Phase 5.
//
// A mirrored card is played *at* you rather than by you:
//   damage        → hits you, through the enemy's own pipeline (its Strength, your Vulnerable)
//   block / heal  → go to the enemy
//   a debuff it would have put on the enemy → lands on you
//   a buff it would have given you          → goes to the enemy
//   everything else is skipped
//
// Only these four op kinds mirror. A card made entirely of the others — draw, Energy, die
// manipulation, choices — has no sensible mirror and `mirrorSnapshot` returns null, so the intent
// falls back to an ordinary attack rather than the enemy wasting its turn drawing your cards.
//
// Like every intent action, the plan is built by a pure function and then applied, so the number
// on the intent is the number that lands.

const MIRRORED_OPS = new Set(['damage', 'block', 'heal', 'status']);

/**
 * The card as it was cast: its own numbers, with no enemy pipeline applied yet. Taken at the
 * moment the player plays it, because a card's damage can depend on state that moves during the
 * enemy's turn (Combustion reads the enemy's Burn, which step 1 has already ticked down). Freezing
 * the card half here is what keeps the mirrored number on the intent equal to the number that
 * lands; the enemy's own modifiers are still applied live, exactly as they are to a basic attack.
 *
 * Returns null if nothing about the card mirrors.
 */
export function mirrorSnapshot(c, key) {
  const def = getCard(key);
  if (!def) return null;
  const { params } = resolveParams(c, def);
  const ctx = { c, def, params };

  let raw = 0; // total damage before the enemy pipeline, so one hit is shown, not several
  let block = 0;
  let healed = 0;
  const statuses = [];

  for (const o of def.ops) {
    if (!MIRRORED_OPS.has(o.op)) continue;
    if (o.op === 'damage') {
      raw += amount(ctx, o.amount) * (o.hits || 1);
    } else if (o.op === 'block') {
      block += amount(ctx, o.amount);
    } else if (o.op === 'heal') {
      healed += amount(ctx, o.amount);
    } else if (o.op === 'status') {
      const n = amount(ctx, o.stacks);
      const kind = STATUSES[o.status]?.kind;
      // A Power is the player's own engine; it has no meaning pointed the other way.
      if (!n || kind === 'power') continue;
      if (o.target === 'enemy' && kind === 'debuff') statuses.push({ side: 'player', id: o.status, n });
      else if (o.target === 'player' && kind === 'buff') statuses.push({ side: 'enemy', id: o.status, n });
    }
  }

  if (raw <= 0 && !block && !healed && !statuses.length) return null;
  return { key, name: def.name, raw, block, heal: healed, statuses };
}

/**
 * The live damage a snapshot will deal: the enemy's own pipeline over the frozen card damage.
 * `extraRage` is Strength the enemy gains earlier in the same intent.
 */
export function mirrorDamage(c, snap, extraRage = 0) {
  return snap.raw > 0 ? incomingToPlayer(c, enemyAttackDamage(c, snap.raw, extraRage)) : 0;
}

function amount(ctx, ref) {
  if (ref == null) return 0;
  const raw = typeof ref === 'string' ? ctx.params[ref] : ref;
  return evaluate(raw, ctx.c, ctx) ?? 0;
}

/** Applies a mirror action from the intent plan, exactly as it was shown. */
export function applyMirror(c, plan) {
  emit(c, 'message', { text: `It casts your ${plan.name} back at you.` });
  if (plan.damage) hitPlayer(c, plan.damage, 'enemy');
  if (plan.block) gainBlock(c, 'enemy', plan.block, 'ability');
  if (plan.heal) heal(c, 'enemy', plan.heal, 'ability');
  for (const s of plan.statuses) {
    if (c.player.hp <= 0) return;
    addStatus(c, s.side, s.id, s.n);
  }
}
