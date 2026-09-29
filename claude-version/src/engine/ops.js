import { emit } from './log.js';
import { chance, int } from './rng.js';
import { rollDie, changeDie, setDie } from './dice.js';
import { playerAttackDamage, hitEnemy, hitPlayer, loseHp, gainBlock, heal } from './damage.js';
import { addStatus, clearStatus, setStatus, stacks } from './statuses.js';
import { drawCards, takeTop } from './piles.js';
import { onEnemyDamaged } from './enemies.js';
import { conditionMet } from './conditions.js';
import { evaluate } from './values.js';

// Card ops. Each entry: { amount: the field holding its number (or null), run(ctx, o, n) }.
// `n` is that field evaluated (params and formulas resolved). An op whose amount is 0 is skipped,
// which is how affinity-only clauses work. An op may carry `if: {condition}`, checked at op time.
//
// ctx: { c, def, card, params, playRoll, damageDealt, markApplied }
//
// Choice ops set c.pending and return 'pending'; combat.resolveChoice() resumes the card.

const t = (ctx) => ctx.c.turnState;

export const OPS = {
  // ── Damage, Block, HP ──
  damage: {
    amount: 'amount',
    run(ctx, o, n) {
      const { c } = ctx;
      for (let i = 0; i < (o.hits || 1) && c.enemy.hp > 0; i++) {
        let base = n;
        // Next-Attack bonus (Shadow Mark, Pocket Aces, Blood Rush): added to the first hit of the
        // next damaging Attack, through the full pipeline. Spent only when applied (decision D2).
        if (ctx.def.type === 'attack' && !ctx.markApplied && t(ctx).markBonus > 0) {
          base += t(ctx).markBonus;
          emit(c, 'message', { text: `Mark: +${t(ctx).markBonus} damage` });
          t(ctx).markBonus = 0;
          ctx.markApplied = true;
        }
        ctx.damageDealt += hitEnemy(c, playerAttackDamage(c, base), 'card');
        onEnemyDamaged(c);
      }
    },
  },
  block: { amount: 'amount', run: (ctx, o, n) => gainBlock(ctx.c, 'player', n, 'card') },
  heal: { amount: 'amount', run: (ctx, o, n) => heal(ctx.c, 'player', n, 'card') },
  loseHp: { amount: 'amount', run: (ctx, o, n) => loseHp(ctx.c, n, { floorAt: 1, source: 'card' }) },
  selfDamage: { amount: 'amount', run: (ctx, o, n) => hitPlayer(ctx.c, n, 'self') },
  stripBlock: {
    amount: 'amount',
    run({ c }, o, n) {
      const removed = Math.min(c.enemy.block, n);
      c.enemy.block -= removed;
      emit(c, 'blockStrip', { side: 'enemy', amount: removed, block: c.enemy.block });
    },
  },
  entrench: {
    amount: null,
    run({ c }) {
      c.flags.entrench = true;
      emit(c, 'message', { text: 'Your Block will carry over to next turn.' });
    },
  },

  // ── Statuses ──
  status: {
    amount: 'stacks',
    run(ctx, o, n) {
      const data = o.data && Object.fromEntries(Object.entries(o.data).map(([k, ref]) => [k, value(ctx, ref)]));
      addStatus(ctx.c, o.target, o.status, n, data);
    },
  },
  multiplyStatus: {
    amount: 'factor',
    run(ctx, o, n) {
      const cur = stacks(ctx.c[o.target], o.status);
      if (!cur) return;
      const cap = o.max != null ? value(ctx, o.max) : Infinity;
      setStatus(ctx.c, o.target, o.status, Math.min(cap, cur * n));
    },
  },
  clearStatus: { amount: null, run: ({ c }, o) => clearStatus(c, o.target, o.status) },

  // ── Cards and Energy ──
  draw: { amount: 'n', run: (ctx, o, n) => drawCards(ctx.c, n) },
  energy: {
    amount: 'amount',
    run(ctx, o, n) {
      const { c } = ctx;
      const p = c.player;
      // overMax: how far above max Energy this card may take you (a param or a number).
      const gained = Math.max(0, Math.min(n, p.maxEnergy + value(ctx, o.overMax ?? 0) - p.energy));
      p.energy += gained;
      emit(c, 'energy', { amount: gained, energy: p.energy });
    },
  },

  // ── Next-card effects (all turn-scoped) ──
  discountNext: { amount: 'count', run: (ctx, o, n) => charge(ctx, 'discountNext', n, `Next ${plural(n, 'card')} cost 1 less`) },
  freeNext: { amount: 'count', run: (ctx, o, n) => charge(ctx, 'freeNext', n, `Next ${plural(n, 'card')} cost 0`) },
  freeSkillNext: { amount: 'count', run: (ctx, o, n) => charge(ctx, 'freeSkillNext', n, 'Next Skill costs 0') },
  echo: { amount: 'count', run: (ctx, o, n) => charge(ctx, 'echo', n, `Next ${plural(n, 'Attack')} trigger twice`) },
  markBonus: { amount: 'amount', run: (ctx, o, n) => charge(ctx, 'markBonus', n, `Next Attack deals +${t(ctx).markBonus + n}`) },

  // ── Gold and Souls ──
  gainGold: {
    amount: 'amount',
    run({ c }, o, n) {
      c.run.gold += n;
      emit(c, 'gold', { amount: n, gold: c.run.gold });
    },
  },
  loseGold: {
    amount: 'amount',
    run({ c }, o, n) {
      const lost = Math.min(n, c.run.gold);
      c.run.gold -= lost;
      emit(c, 'gold', { amount: -lost, gold: c.run.gold });
    },
  },
  souls: {
    amount: 'amount',
    run({ c }, o, n) {
      c.run.souls += n;
      emit(c, 'souls', { amount: n, souls: c.run.souls });
    },
  },

  // ── The die ──
  rerollDie: { amount: null, run: ({ c }) => rollDie(c, 'card') },
  dieAdd: { amount: 'amount', run: ({ c }, o, n) => changeDie(c, c.die.value + n, 'add') },
  dieMultiply: {
    // With `set: true` it counts as the once-per-turn die set (Void Channel, GDD §11).
    amount: 'factor',
    run: ({ c }, o, n) => (o.set ? setDie(c, c.die.value * n) : changeDie(c, c.die.value * n, 'multiply')),
  },
  dieTo: {
    // Moves the die to a value without counting as the once-per-turn set (Double Down's drop).
    amount: 'value',
    run: ({ c }, o, n) => changeDie(c, n, 'to'),
  },
  dieSet: {
    // Once per turn (GDD §11); silently skipped if the die was already set (Safe Pull).
    amount: 'value',
    run: ({ c }, o, n) => setDie(c, n),
  },
  dieBestOf: {
    // Roll N times and keep the highest; counts as setting the die (Void Channel+).
    amount: 'n',
    run({ c }, o, n) {
      let best = 0;
      for (let i = 0; i < n; i++) best = Math.max(best, int(c.run.rng, c.die.sides) + 1);
      setDie(c, best);
    },
  },
  forceMax: {
    amount: 'count',
    run({ c }, o, n) {
      c.die.forcedMax += n;
      emit(c, 'message', { text: `Next ${plural(n, 'roll')} will be max` });
    },
  },
  chance: {
    // 50/50 (or o.p). Runs `win` or `lose`, which are op lists; they may not contain choices.
    amount: null,
    run(ctx, o) {
      const won = chance(ctx.c.run.rng, o.p ?? 0.5);
      emit(ctx.c, 'coin', { won });
      runOpList(ctx, won ? o.win : o.lose || []);
    },
  },

  // ── Choices ──
  chooseDiscard: {
    amount: 'n',
    run({ c }, o, n) {
      return offer(c, { kind: 'cards', action: 'discard', cards: c.piles.hand.slice(), count: n,
        prompt: `Choose ${plural(n, 'card')} to discard` });
    },
  },
  chooseFromDiscard: {
    // `exclude`: base card keys that may not be returned (Arcane Recall cannot return itself).
    amount: 'n',
    run({ c }, o, n) {
      const room = c.handLimit - c.piles.hand.length;
      const cards = c.piles.discard.filter((x) => !(o.exclude || []).includes(x.key.replace(/\+$/, '')));
      return offer(c, { kind: 'cards', action: 'toHand', cards, count: Math.min(n, room),
        prompt: `Choose ${plural(n, 'card')} to return to your hand` });
    },
  },
  topKeep: {
    amount: 'look',
    run(ctx, o, n) {
      const { c } = ctx;
      const revealed = takeTop(c, n);
      const keep = Math.min(value(ctx, o.keep), c.handLimit - c.piles.hand.length);
      return offer(c, { kind: 'cards', action: 'keep', cards: revealed, held: true, count: keep,
        prompt: `Keep ${plural(keep, 'card')}; the rest are discarded` });
    },
  },
  chooseDie: {
    amount: null,
    run(ctx, o) {
      const lo = value(ctx, o.min);
      const hi = value(ctx, o.max);
      return offer(ctx.c, { kind: 'die', min: lo, max: hi, prompt: `Set the die to a value from ${lo} to ${hi}` });
    },
  },
};

function value(ctx, ref) {
  if (typeof ref === 'string') return evaluate(ctx.params[ref], ctx.c, ctx) ?? 0;
  return evaluate(ref, ctx.c, ctx) ?? 0;
}

function charge(ctx, key, n, text) {
  t(ctx)[key] += n;
  emit(ctx.c, 'message', { text });
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function discardCards(c, uids) {
  for (const uid of uids) {
    const i = c.piles.hand.findIndex((x) => x.uid === uid);
    if (i >= 0) c.piles.discard.push(c.piles.hand.splice(i, 1)[0]);
  }
  if (uids.length) emit(c, 'discard', { uids });
}

/**
 * Opens a choice, unless there is nothing to choose: with no options it is skipped, and when
 * every option must be taken it resolves immediately.
 */
function offer(c, pending) {
  if (c.enemy.hp <= 0) return undefined; // combat is already won; nothing left to decide
  if (pending.kind === 'cards') {
    pending.count = Math.min(pending.count, pending.cards.length);
    if (pending.count <= 0) {
      if (pending.held) finishCards(c, pending, []);
      return undefined;
    }
    if (pending.count === pending.cards.length) {
      finishCards(c, pending, pending.cards.map((x) => x.uid));
      return undefined;
    }
  } else if (pending.min >= pending.max) {
    setDie(c, pending.min);
    return undefined;
  }
  c.pending = pending;
  emit(c, 'choice', { kind: pending.kind, prompt: pending.prompt });
  return 'pending';
}

/** Applies a card choice. Revealed (`held`) cards that are not kept go to the discard pile. */
export function finishCards(c, pending, uids) {
  const chosen = pending.cards.filter((x) => uids.includes(x.uid));
  if (pending.action === 'discard') {
    discardCards(c, uids);
  } else if (pending.action === 'toHand') {
    for (const card of chosen) c.piles.discard.splice(c.piles.discard.indexOf(card), 1);
    c.piles.hand.push(...chosen);
    emit(c, 'draw', { uids: chosen.map((x) => x.uid) });
  } else if (pending.action === 'keep') {
    c.piles.hand.push(...chosen);
    c.piles.discard.push(...pending.cards.filter((x) => !uids.includes(x.uid)));
    if (chosen.length) emit(c, 'draw', { uids: chosen.map((x) => x.uid) });
  }
}

/** Validates an answer to c.pending. Returns an error string, or null if valid. */
export function checkAnswer(pending, answer) {
  if (pending.kind === 'die') {
    return Number.isInteger(answer) && answer >= pending.min && answer <= pending.max ? null : 'Invalid die value';
  }
  const ids = new Set(pending.cards.map((x) => x.uid));
  if (!Array.isArray(answer) || answer.length !== pending.count) return `Choose exactly ${pending.count}`;
  if (new Set(answer).size !== answer.length || !answer.every((u) => ids.has(u))) return 'Invalid cards';
  return null;
}

/** Runs one op. Returns 'pending' if it opened a choice. */
function runOp(ctx, o) {
  const { c } = ctx;
  if (o.if && !conditionMet(c, o.if, ctx)) return undefined;
  const def = OPS[o.op];
  if (!def) throw new Error(`Unknown op: ${o.op}`);
  const n = def.amount ? value(ctx, o[def.amount]) : undefined;
  if (def.amount && !n) return undefined;
  return def.run(ctx, o, n);
}

/** Runs a nested op list (inside `chance`); choices are not allowed there. */
function runOpList(ctx, list) {
  for (const o of list) {
    if (ctx.c.player.hp <= 0) return;
    if (runOp(ctx, o) === 'pending') throw new Error('Choices are not allowed inside chance');
  }
}

/** Runs the card's ops from `from`. Returns { pending: index to resume at } or null when done. */
export function runOps(ctx, from = 0) {
  const ops = ctx.def.ops;
  for (let i = from; i < ops.length; i++) {
    if (ctx.c.player.hp <= 0) return null;
    if (runOp(ctx, ops[i]) === 'pending') return { resumeAt: i + 1 };
  }
  return null;
}

export const CHOICE_OPS = new Set(['chooseDiscard', 'chooseFromDiscard', 'topKeep', 'chooseDie']);
