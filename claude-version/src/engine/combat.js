import { emit } from './log.js';
import { int } from './rng.js';
import { createDieFor, dieType, rollDie, reroll as rerollDie, changeDie, setDie } from './dice.js';
import { createPiles, drawCards, discardHand, takeFromHand } from './piles.js';
import { stacks, reduceStatus, clearStatus } from './statuses.js';
import { damageEnemyDirect, heal, burnTick, poisonTick, gainBlock } from './damage.js';
import { createEnemy, planIntent, enemyTurnStart, resolveIntent, afterEnemyAction } from './enemies.js';
import { getCard, resolveParams, gateReason } from './cards.js';
import { cardCost } from './costs.js';
import { runOps, finishCards, checkAnswer } from './ops.js';
import { beforeCardEffect, afterCardEffect, afterRegenTick } from './powers.js';
import { HEROES } from '../content/heroes.js';

// One combat. `createCombat` is the only place combat state is built, for every kind of fight,
// so no per-fight flag can survive into the next fight. Likewise `newTurnState()` is the only
// place turn-scoped state is built, so nothing turn-scoped can survive into the next turn.
//
// Phases: 'player' (awaiting input) → 'enemy' (only while endTurn runs) → 'player' …
//         → 'won' | 'lost'
// While `c.pending` is set (a card is waiting on a choice), only resolveChoice() is accepted.

export const HAND_LIMIT = 8;
export const DRAW_PER_TURN = 5;
export const REROLLS_PER_TURN = 1;
export const MOMENTUM_CAP = 3;

function newTurnState() {
  return {
    cardsPlayed: 0,
    spells: 0, // Skills and Powers played (Arcane Barrage)
    dieSet: false, // the once-per-turn die set (GDD §11)
    momentumUsed: 0,
    maxRollRerollUsed: false,
    hungerDamage: 0, // Eternal Hunger's per-turn cap
    // One-shot charges, spent by the next qualifying card (engine/costs.js, engine/ops.js).
    discountNext: 0,
    freeNext: 0,
    freeSkillNext: 0,
    echo: 0,
    markBonus: 0,
  };
}

export function createCombat(run, enemyId, { kind = 'normal' } = {}) {
  const hero = HEROES[run.heroKey];
  const c = {
    run,
    hero,
    kind,
    log: [],
    phase: 'player',
    turn: 0,
    turnState: newTurnState(),
    handLimit: HAND_LIMIT,
    drawPerTurn: DRAW_PER_TURN + (run.extraDraw || 0), // + Overdraw
    flags: { entrench: false },
    // Soul Forge upgrades, read once per fight (engine/soul.js).
    bonusRerolls: run.bonusRerolls || 0, // Steady Hand: per combat, spent after the turn's reroll
    oncePerCombat: {
      secondDie: !!run.soul?.secondDie,
      gamblersEdge: !!run.soul?.gamblersEdge,
    },
    pending: null,
    resolving: null,
    player: {
      hp: run.hp, maxHp: run.maxHp, block: 0, statuses: {},
      energy: 0, maxEnergy: run.maxEnergy,
    },
    // The equipped die is run state (run.die); like every other run modifier it is read once,
    // here, so a die bought mid-fight could not change the fight in progress.
    dieType: dieType(run.die),
    die: createDieFor(run.die, hero),
    enemy: createEnemy(enemyId),
  };
  c.piles = createPiles(c, run.deck);
  emit(c, 'combatStart', { enemy: enemyId, kind });
  planIntent(c);
  startTurn(c);
  return c;
}

// ── Player turn ──

export function startTurn(c) {
  c.turn += 1;
  c.phase = 'player';
  c.turnState = newTurnState();
  emit(c, 'turnStart', { turn: c.turn });

  const p = c.player;
  p.energy = p.maxEnergy;
  if (c.flags.entrench) {
    c.flags.entrench = false; // carries over once
  } else if (p.block > 0) {
    p.block = 0;
    emit(c, 'blockReset', { side: 'player' });
  }
  c.die.rerollsLeft = REROLLS_PER_TURN;
  if (c.turn === 1 && c.run.startBlock) gainBlock(c, 'player', c.run.startBlock, 'grit'); // after the reset

  rollDie(c, 'turn');
  if (checkEnd(c)) return; // Lucky Streak can finish the enemy on the opening roll
  drawCards(c, c.drawPerTurn + turnStartDieBonus(c));
}

/**
 * The equipped die's turn-start bonus, for the roll that just landed. Only the turn-start roll
 * pays it (a reroll into an even number does not re-pay the Arcane Die), so it lives here rather
 * than in rollDie(). Returns the extra cards to draw; the Energy bonus is applied in place,
 * because it has to land before the hand is dealt.
 */
function turnStartDieBonus(c) {
  const { bonus, params, emoji, name } = c.dieType;
  if (bonus === 'evenEnergy' && c.die.value % 2 === 0) {
    // Reference: the refund may push Energy one over the maximum, and no further.
    const p = c.player;
    p.energy = Math.min(p.energy + params.energy, p.maxEnergy + params.energy);
    emit(c, 'message', { text: `${emoji} ${name} — even roll, +${params.energy} Energy.` });
    return 0;
  }
  if (bonus === 'maxDraw' && c.die.value === c.die.sides) {
    emit(c, 'message', { text: `${emoji} ${name} — max roll, +${params.draw} card.` });
    return params.draw;
  }
  return 0;
}

/** Whether a hand card can be played. `warning` is set for a gated card that is still tappable. */
export function playability(c, card) {
  if (c.phase !== 'player') return { ok: false, reason: 'Not your turn' };
  if (c.pending) return { ok: false, reason: 'Finish the current choice first' };
  const cost = cardCost(c, card);
  if (cost > c.player.energy) return { ok: false, reason: 'Not enough Energy', cost };
  return { ok: true, cost, warning: gateReason(c, getCard(card.key)) };
}

export function playCard(c, uid) {
  const card = c.piles.hand.find((x) => x.uid === uid);
  if (!card) return false;
  const check = playability(c, card);
  if (!check.ok) {
    emit(c, 'rejected', { uid, reason: check.reason });
    return false;
  }
  const def = getCard(card.key);
  // Params resolve against the state the player saw: card still in hand, not yet counted.
  const { params } = resolveParams(c, def);
  const cost = cardCost(c, card, { consume: true });
  const isSpell = def.type === 'skill' || def.type === 'power';

  takeFromHand(c, uid);
  c.resolving = { card, def };
  c.player.energy -= cost;
  const t = c.turnState;
  t.cardsPlayed += 1;
  if (isSpell) t.spells += 1;
  emit(c, 'play', { uid, key: card.key, cost, energy: c.player.energy, roll: c.die.value });
  if (isSpell) applyMomentum(c);

  beforeCardEffect(c);
  const ctx = { c, def, card, params, playRoll: c.die.value, damageDealt: 0, markApplied: false, stage: 'main' };
  if (check.warning) {
    // Reference behaviour (COMPARISON C2): an unmet condition refunds the Energy; the card is spent.
    c.player.energy += cost;
    ctx.fizzled = true;
    emit(c, 'fizzle', { uid, reason: check.warning, energy: c.player.energy });
  } else if (suspend(c, ctx, runOps(ctx))) {
    return true;
  }
  finishCard(c, ctx);
  return true;
}

/** Arcane Momentum: a Skill or Power raises the die before it resolves (max +3 per turn). */
function applyMomentum(c) {
  const m = stacks(c.player, 'momentum');
  const bump = Math.min(m, MOMENTUM_CAP - c.turnState.momentumUsed);
  if (bump <= 0 || c.die.value >= c.die.sides) return;
  c.turnState.momentumUsed += bump;
  changeDie(c, c.die.value + bump, 'momentum');
}

/** If the ops opened a choice, remembers where to resume. */
function suspend(c, ctx, result) {
  if (!result) return false;
  c.pending.resume = { ctx, at: result.resumeAt };
  return true;
}

/** Echo, after-effect hooks, then the card goes to its pile. */
function finishCard(c, ctx) {
  const { def, card } = ctx;
  const t = c.turnState;
  if (ctx.stage === 'main' && !ctx.fizzled && def.type === 'attack' && t.echo > 0 && c.enemy.hp > 0) {
    t.echo -= 1;
    ctx.stage = 'echo';
    ctx.damageDealt = 0;
    emit(c, 'message', { text: `${def.name} echoes!` });
    if (suspend(c, ctx, runOps(ctx))) return;
  }
  afterCardEffect(c, def);
  const to = def.exhausts ? 'exhaust' : 'discard';
  c.piles[to].push(card);
  c.resolving = null;
  emit(c, 'cardTo', { uid: card.uid, pile: to });
  checkEnd(c);
}

/**
 * Answers the pending choice: an array of card uids, or a die value. Returns false (and emits
 * 'rejected') if the answer is invalid; the choice then stays open.
 */
export function resolveChoice(c, answer) {
  const pending = c.pending;
  if (!pending) return false;
  const error = checkAnswer(pending, answer);
  if (error) {
    emit(c, 'rejected', { reason: error });
    return false;
  }
  c.pending = null;
  if (pending.kind === 'die') setDie(c, answer);
  else finishCards(c, pending, answer);
  const { ctx, at } = pending.resume;
  if (!suspend(c, ctx, runOps(ctx, at))) finishCard(c, ctx);
  return true;
}

export function reroll(c) {
  const ok = rerollDie(c);
  if (ok) checkEnd(c);
  return ok;
}

// ── Soul Forge die actions (once per combat) ──

const canActNow = (c) => c.phase === 'player' && !c.pending;

/** Second Die: add a d2 (1–2) to the die, up to its max face. */
export function useSecondDie(c) {
  if (!canActNow(c) || !c.oncePerCombat.secondDie) return false;
  c.oncePerCombat.secondDie = false;
  const bonus = int(c.run.rng, 2) + 1;
  emit(c, 'message', { text: `Second Die: +${bonus}` });
  changeDie(c, c.die.value + bonus, 'secondDie');
  return true;
}

/** Gambler's Edge: set the die to any value. Uses the once-per-turn die set. */
export function useGamblersEdge(c, value) {
  if (!canActNow(c) || !c.oncePerCombat.gamblersEdge || c.turnState.dieSet) return false;
  if (!Number.isInteger(value) || value < 1 || value > c.die.sides) return false;
  c.oncePerCombat.gamblersEdge = false;
  setDie(c, value);
  return true;
}

// ── End of turn ──
// Step numbers follow GDD §4 and the reference build's endTurn(). Every death check returns
// early, so nothing after a death check can act on a dead unit.

export function endTurn(c) {
  if (c.phase !== 'player' || c.pending) return false;
  c.phase = 'enemy';
  emit(c, 'endTurn', { turn: c.turn });
  const e = c.enemy;

  // 1. Burn ticks before the enemy acts (+ Burning Soul).
  if (stacks(e, 'burn')) {
    damageEnemyDirect(c, burnTick(c), 'burn');
    reduceStatus(c, 'enemy', 'burn');
  }
  // 2. Enemy Vulnerable ticks down (it amplified the player's attacks this turn).
  reduceStatus(c, 'enemy', 'vulnerable');
  // 2b. Player Weak ticks down (it reduced the player's attacks this turn).
  reduceStatus(c, 'player', 'weak');
  // 3. Regen heals before the enemy acts; Eternal Hunger turns it into damage.
  const regen = stacks(c.player, 'regen');
  if (regen) {
    heal(c, 'player', regen, 'regen');
    afterRegenTick(c, regen);
    reduceStatus(c, 'player', 'regen');
  }
  // 4. A lethal Burn tick ends combat here, before any HP-threshold ability can fire.
  if (checkEnd(c)) return true;

  // 5. The enemy's turn begins: turn-start abilities.
  enemyTurnStart(c);
  if (checkEnd(c)) return true;

  // 6. The enemy executes the intent it showed.
  const attacked = resolveIntent(c);
  if (checkEnd(c)) return true;

  // 6b. Statuses that modified the enemy's action tick down after it.
  reduceStatus(c, 'enemy', 'weak');
  reduceStatus(c, 'player', 'vulnerable');

  // 7. Poison ticks after the enemy acts (+ Poison Master).
  if (stacks(e, 'poison')) {
    damageEnemyDirect(c, poisonTick(c), 'poison');
    reduceStatus(c, 'enemy', 'poison');
  }
  // 8. A lethal Poison tick ends combat before step 9's HP-threshold abilities.
  if (checkEnd(c)) return true;

  // 9. After-attack and HP-threshold abilities.
  afterEnemyAction(c, attacked);

  // 10. Plan (and show) the next intent.
  planIntent(c);

  // 11. Fly lasts one turn; the hand is discarded; the next turn begins.
  clearStatus(c, 'player', 'fly');
  discardHand(c);
  startTurn(c);
  return true;
}

/** Sets the terminal phase if either side is dead. The player's death takes priority. */
export function checkEnd(c) {
  if (c.phase === 'won' || c.phase === 'lost') return true;
  if (c.player.hp <= 0) {
    c.phase = 'lost';
    emit(c, 'defeat');
    return true;
  }
  if (c.enemy.hp <= 0) {
    c.phase = 'won';
    c.pending = null;
    discardHand(c);
    emit(c, 'victory', { enemy: c.enemy.id });
    return true;
  }
  return false;
}
