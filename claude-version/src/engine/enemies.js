import { ENEMIES } from '../content/enemies.js';
import { emit } from './log.js';
import { chance, int } from './rng.js';
import { enemyAttackDamage, incomingToPlayer, hitPlayer, gainBlock, heal, loseHp } from './damage.js';
import { addStatus, reduceStatus, stacks, STATUSES } from './statuses.js';
import { mirrorSnapshot, mirrorDamage, applyMirror } from './mirror.js';

// Enemy behaviour.
//
// **Intent is the move.** At the end of each enemy turn `planIntent` builds an intent: a list of
// actions to take, in order. `previewIntent` turns that list into a *plan* — the same list with
// every number resolved against current state — and `resolveIntent` executes exactly the plan
// `previewIntent` hands it. There is one walk of the list, so the display and the resolution
// cannot disagree by construction; what the fuzz still checks is that nothing between the
// player's last look and step 6 changes the inputs.
//
// That is why an ability which changes the damage of the same turn's attack (Loyal's Strength)
// is an **action in the list** rather than a turnStart hook: planned ahead of the attack, it is
// already counted in the number the player was shown. A turnStart ability must never move a
// number the intent displays.
//
// Triggers:
//   turnStart       — enemy turn, before it acts (endTurn step 5)
//   afterAttack     — after an attack resolves (step 9)
//   hp              — after the enemy takes card damage while alive, and again at step 9.
//                     A lethal Burn/Poison tick ends combat before step 9, so it skips these.
//   playerTurnStart — the player's turn begins, after the draw (Soul Drain, Curse, Stone Skin)
//   onPlayerCard    — the player played a card (Bone Wall, Spell Steal's memory)
// Plus three things that are not triggers, all installed onto the enemy object so that
// engine/damage.js can use them without importing this file:
//   `guard`        — intercepts incoming damage (Phase, Stone Skin)
//   `onDeath`      — a revive (Undying)
//   `statusImmune` — nothing can be applied (Unbreakable)
// And two that shape the intent:
//   `action` — contributes its own action to the list (Loyal, Ritual, Spell Steal)
//   `rider`  — decorates the basic attack (Acid Touch, Poison Arrow, Holy Wrath, Collapse)

export const DEFEND_BLOCK = 8;
const ATTACK_CHANCE = 0.65;

const attack = (base, hits = 1) => ({ kind: 'attack', base, hits });

// Intent patterns. `plan` receives the number of the enemy turn being planned (1-based).
export const PATTERNS = {
  standard: {
    // Reference behaviour: the first move is always an attack, then 65% attack / 35% defend.
    plan: (c, e, turn) =>
      turn === 1 || chance(c.run.rng, ATTACK_CHANCE) ? attack(e.damage) : { kind: 'defend', block: DEFEND_BLOCK },
  },
  aim: {
    name: 'Aim',
    text: (p) => `Spends a turn aiming, then attacks for ${p.multiplier}× damage. Repeats.`,
    plan: (c, e, turn, p) => (turn % 2 === 1 ? { kind: 'aim' } : attack(e.damage * p.multiplier)),
  },
};

// Phase is keyed to the **player's** turn number, because that is when the immunity matters and
// when the player needs to see it. Turn 1 is always solid, so a fight never opens untouchable.
const phasedOn = (playerTurn) => playerTurn % 2 === 0;

export const ABILITIES = {
  // ── Floor 1 ──
  shieldUp: {
    name: 'Shield Up', trigger: 'turnStart', resetsBlock: true,
    text: (p) => `Its Block resets each turn. Every ${every(p.every)} turn it gains ${p.block} Block.`,
    run: (c, p, turn) => {
      if (turn % p.every === 0) gainBlock(c, 'enemy', p.block, 'ability');
      return turn % p.every === 0;
    },
  },
  ironStance: {
    name: 'Iron Stance', trigger: 'turnStart', resetsBlock: true,
    text: (p) => `Its Block resets to ${p.block} at the start of each of its turns.`,
    run: (c, p) => {
      gainBlock(c, 'enemy', p.block, 'ability');
      return true;
    },
  },
  swarm: {
    name: 'Swarm', trigger: 'turnStart',
    text: (p) => `On its ${ordinal(p.onTurn)} turn, heals ${p.heal} HP.`,
    run: (c, p, turn) => {
      if (turn !== p.onTurn) return false;
      heal(c, 'enemy', p.heal, 'ability');
      return true;
    },
  },
  lockdown: {
    name: 'Lockdown', trigger: 'turnStart',
    text: (p) => `Every ${every(p.every)} turn, applies ${p.weak} Weak to you.`,
    run: (c, p, turn) => {
      if (turn % p.every !== 0) return false;
      addStatus(c, 'player', 'weak', p.weak);
      return true;
    },
  },
  rabid: {
    name: 'Rabid', trigger: 'afterAttack',
    text: (p) => `Each attack applies ${p.vulnerable} Vulnerable to you.`,
    run: (c, p) => {
      addStatus(c, 'player', 'vulnerable', p.vulnerable);
      return true;
    },
  },
  reassemble: {
    name: 'Reassemble', trigger: 'hp',
    text: (p) => `Once, when first below ${p.below} HP, heals ${p.heal} HP.`,
    run: (c, p) => {
      const e = c.enemy;
      if (e.flags.reassembled || e.hp <= 0 || e.hp >= p.below) return false;
      e.flags.reassembled = true;
      heal(c, 'enemy', p.heal, 'ability');
      return true;
    },
  },

  // ── Floors 2–4 ──
  phase: {
    // The reference set `_phased` and nothing ever read it. Here it negates every damage source,
    // including that turn's Burn tick (decision D7), and is shown on the intent so the turn can
    // be spent on Block and setup instead.
    name: 'Phase',
    text: (p) => 'Untouchable on every other one of your turns; no damage of any kind lands.' +
      (p.hitsWhenSolid > 1 ? ` Attacks ${p.hitsWhenSolid} times on the turns it is solid.` : ''),
    guard: (c, amount) => (phasedOn(c.turn) ? 0 : amount),
    // The upcoming player turn decides how many times it will swing (Phase+).
    hits: (p, playerTurn) => (phasedOn(playerTurn) ? 1 : p.hitsWhenSolid || 1),
  },
  onHitStatus: {
    // Bone Archer's Poison Arrow. Part of the attack, so the intent shows it.
    name: (p) => p.label, rider: true,
    text: (p) => `Each hit applies ${p.stacks} ${STATUSES[p.status].name} to you.`,
  },
  onHitBlock: {
    // Acid Touch / Drain / Void Drain. The reference stripped Block *after* the hit, when it was
    // already spent and about to reset anyway, so it did nothing; here it is part of the attack
    // and lands before the damage, which is what the text always described.
    name: (p) => p.label, rider: true,
    text: (p) => `Strips ${p.amount} of your Block as it hits` +
      (p.steal ? ', and gains that much Block.' : p.drain ? ', and heals itself for as much.' : '.'),
  },
  undying: {
    // The reference ran the revive from an `hp` trigger that also fired after ordinary hits. Here
    // it is a death hook (engine/damage.js), and a lethal Burn or Poison tick bypasses it (GDD §4).
    name: (p) => (p.times > 1 ? 'Undying+' : 'Undying'),
    text: (p) => `Revives ${p.times === 1 ? 'once' : `${p.times} times`} with ${p.hp} HP. ` +
      'A killing Burn or Poison tick is final.',
    onDeath: (c, p) => {
      const e = c.enemy;
      const used = e.flags.revivals || 0;
      if (used >= p.times) return false;
      e.flags.revivals = used + 1;
      e.hp = p.hp;
      emit(c, 'revive', { hp: p.hp, n: used + 1, of: p.times });
      return true;
    },
  },
  applyEachTurn: {
    name: (p) => p.label, trigger: 'turnStart',
    text: (p) => `Applies ${p.stacks} ${STATUSES[p.status].name} to you every turn.`,
    run: (c, p) => {
      addStatus(c, 'player', p.status, p.stacks);
      return true;
    },
  },
  darkBlessing: {
    name: 'Dark Blessing', trigger: 'hp',
    text: (p) => `Once, when first below ${p.belowPct}% HP, heals ${p.heal} HP.`,
    run: (c, p) => {
      const e = c.enemy;
      if (e.flags.blessed || e.hp <= 0 || e.hp >= (e.maxHp * p.belowPct) / 100) return false;
      e.flags.blessed = true;
      heal(c, 'enemy', p.heal, 'ability');
      return true;
    },
  },
  stoneSkin: {
    // The reference set `_stoneShield` and nothing read it. A pool that refills each of your turns.
    name: 'Stone Skin', trigger: 'playerTurnStart',
    text: (p) => `Absorbs the first ${p.amount} damage it takes each of your turns.`,
    run: (c, p) => {
      c.enemy.flags.stoneSkin = p.amount;
      return false; // refilling is routine; it is reported when it actually absorbs
    },
    guard: (c, amount) => {
      const e = c.enemy;
      const left = e.flags.stoneSkin || 0;
      if (!left || amount <= 0) return amount;
      const absorbed = Math.min(left, amount);
      e.flags.stoneSkin = left - absorbed;
      emit(c, 'absorb', { side: 'enemy', amount: absorbed, name: 'Stone Skin' });
      return amount - absorbed;
    },
  },
  curseCard: {
    // The reference printed a message and cursed nothing. The surcharge goes through the one cost
    // pipeline, so the card in hand shows the raised number.
    name: 'Curse', trigger: 'playerTurnStart',
    text: (p) => `At the start of your turn, one random card in your hand costs ${p.amount} more that turn.`,
    run: (c, p) => {
      const hand = c.piles.hand;
      if (!hand.length) return false;
      c.turnState.cursedUid = hand[int(c.run.rng, hand.length)].uid;
      c.turnState.cursedAmount = p.amount;
      return true;
    },
  },
  loyal: {
    // An intent action, not a turnStart hook: it changes the damage of the attack planned behind
    // it, so it has to be visible in the same intent the player is shown.
    name: 'Loyal', action: true,
    text: (p) => `Gains ${p.rage} Strength at the start of each of its turns.`,
  },
  burst: {
    // Ritual (once, on its 4th turn) and Arcane Overload (every 3rd turn). Extra damage alongside
    // the turn's move, through the enemy's own pipeline, and part of the intent.
    name: (p) => p.label, action: true,
    text: (p) => (p.onTurn
      ? `On its ${ordinal(p.onTurn)} turn, deals ${p.damage} extra damage.`
      : `Every ${every(p.every)} turn, deals ${p.damage} extra damage.`),
  },
  soulDrain: {
    name: 'Soul Drain', trigger: 'playerTurnStart',
    text: (p) => `Your first turn starts with ${p.energy} less Energy.`,
    run: (c, p) => {
      if (c.turn !== 1) return false;
      const taken = Math.min(p.energy, c.player.energy);
      if (!taken) return false;
      c.player.energy -= taken;
      emit(c, 'energy', { amount: -taken, energy: c.player.energy });
      return true;
    },
  },
  boneWall: {
    name: 'Bone Wall', trigger: 'onPlayerCard', resetsBlock: true,
    text: (p) => `Gains ${p.block} Block the first time you play a Skill each turn. Its Block resets each turn.`,
    run: (c, p, turn, def) => {
      if (def.type !== 'skill' || c.turnState.boneWall) return false;
      c.turnState.boneWall = true;
      gainBlock(c, 'enemy', p.block, 'ability');
      return true;
    },
  },
  holyWrath: {
    // The reference did `damage *= 2` permanently, so it compounded every turn the condition held.
    name: 'Holy Wrath', rider: true,
    text: (p) => `While you hold ${p.blockAtLeast} or more Block, its attack deals ${p.multiplier}× damage.`,
  },
  spellSteal: {
    name: 'Spell Steal', action: true, trigger: 'onPlayerCard',
    text: () => 'On its turn it casts the last card you played that turn back at you. Damage hits ' +
      'you, Block goes to it, and debuffs land on you. If you played nothing, it just attacks.',
    run: (c, p, turn, def, card) => {
      // Snapshotted as cast, not looked up later: see engine/mirror.js.
      c.enemy.flags.stolen = mirrorSnapshot(c, card.key) || c.enemy.flags.stolen;
      return false; // remembering is silent; the intent already names the card
    },
  },
  unbreakable: {
    // The reference wiped statuses at its turn start, so a Burn or Vulnerable still worked for a
    // full player turn. Here nothing lands at all, and the card says so.
    name: 'Unbreakable', statusImmune: true,
    text: () => 'No status can be applied to it.',
  },
  collapse: {
    // The reference read your Block *after* step 6 had already spent it. Here the bonus is your
    // Block as the attack lands, which is the number the intent shows.
    name: 'Collapse', rider: true,
    text: () => 'Its attack deals extra damage equal to your Block, and that extra ignores Block.',
  },
};

function every(n) {
  return n === 2 ? 'other' : ordinal(n);
}

function ordinal(n) {
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10];
  return n + (suffix && Math.floor(n / 10) % 10 !== 1 ? suffix : 'th');
}

const abilityName = (def, p) => (typeof def.name === 'function' ? def.name(p) : def.name);

export function createEnemy(id) {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  const abilities = def.abilities || [];
  for (const a of abilities) if (!ABILITIES[a.id]) throw new Error(`${id}: unknown ability "${a.id}"`);
  return {
    id,
    name: def.name,
    emoji: def.emoji,
    hp: def.hp,
    maxHp: def.hp,
    block: def.block,
    damage: def.damage,
    gold: def.gold,
    boss: !!def.boss,
    title: def.title ?? null,
    portrait: def.portrait ?? null,
    pattern: def.pattern || { id: 'standard' },
    abilities,
    // Read by engine/damage.js, which therefore needs no import from this file.
    guards: abilities.filter((a) => ABILITIES[a.id].guard).map((a) => ({ params: a, def: ABILITIES[a.id] })),
    revives: abilities.filter((a) => ABILITIES[a.id].onDeath).map((a) => ({ params: a, def: ABILITIES[a.id] })),
    statusImmune: abilities.some((a) => ABILITIES[a.id].statusImmune),
    statuses: {},
    turn: 0, // enemy turns taken; the turn being planned is turn + 1
    flags: {},
    intent: null,
  };
}

/** The enemy's entry for an ability id, or undefined. */
const abilityOf = (e, id) => e.abilities.find((a) => a.id === id);

/** Name and rules text for everything the enemy does beyond basic attack/defend. */
export function describeAbilities(enemy) {
  const out = [];
  const pattern = PATTERNS[enemy.pattern.id];
  if (pattern.name) out.push({ name: pattern.name, text: pattern.text(enemy.pattern) });
  for (const a of enemy.abilities) {
    const def = ABILITIES[a.id];
    out.push({ name: abilityName(def, a), text: def.text(a) });
  }
  return out;
}

// ── Planning ──

export function planIntent(c) {
  const e = c.enemy;
  const enemyTurn = e.turn + 1;
  const playerTurn = c.turn + 1; // planning runs at step 10, before startTurn increments the turn
  const base = PATTERNS[e.pattern.id].plan(c, e, enemyTurn, e.pattern);

  const phase = abilityOf(e, 'phase');
  if (phase && base.kind === 'attack') base.hits = ABILITIES.phase.hits(phase, playerTurn);

  const actions = [];
  const loyal = abilityOf(e, 'loyal');
  if (loyal) actions.push({ kind: 'buff', status: 'rage', n: loyal.rage });

  // Spell Steal replaces the basic move with a mirror; `fallback` covers a turn you played nothing.
  actions.push(abilityOf(e, 'spellSteal') ? { kind: 'mirror', fallback: base } : base);

  const burst = abilityOf(e, 'burst');
  if (burst && (burst.onTurn ? enemyTurn === burst.onTurn : enemyTurn % burst.every === 0)) {
    actions.push({ kind: 'burst', base: burst.damage, label: burst.label });
  }

  e.intent = { actions };
  emit(c, 'intent', { intent: e.intent });
}

/**
 * The intent with every number resolved against current state — what the UI shows and what
 * `resolveIntent` then executes. Pure: it must not change anything.
 *
 * `extraRage` walks with the list, so an attack planned behind a Strength buff is already shown
 * with that Strength counted.
 */
export function previewIntent(c) {
  const e = c.enemy;
  const plan = { phased: !!abilityOf(e, 'phase') && phasedOn(c.turn), actions: [] };
  let extraRage = 0;

  // Fly halves the *first* hit of the turn and is used up by it, wherever in the list that hit
  // falls — an attack, a Ritual burst or a mirrored card. Walking it here is what lets every
  // action carry `landed`: the exact numbers hitPlayer() will produce, in order.
  let flyLeft = stacks(c.player, 'fly') > 0;
  const fly = (v) => {
    if (!flyLeft || v <= 0) return v;
    flyLeft = false;
    return Math.floor(v / 2);
  };

  for (const a of e.intent.actions) {
    if (a.kind === 'buff') {
      if (a.status === 'rage' && !e.statusImmune) extraRage += a.n;
      plan.actions.push({ ...a, blocked: e.statusImmune });
    } else if (a.kind === 'attack') {
      plan.actions.push(planAttack(c, a, extraRage, fly));
    } else if (a.kind === 'burst') {
      const amount = incomingToPlayer(c, enemyAttackDamage(c, a.base, extraRage));
      plan.actions.push({ ...a, amount, landed: [fly(amount)] });
    } else if (a.kind === 'mirror') {
      const snap = e.flags.stolen;
      // Nothing played this turn, or nothing worth mirroring: it falls back to a normal attack.
      if (snap) {
        const damage = mirrorDamage(c, snap, extraRage);
        plan.actions.push({ kind: 'mirror', ...snap, damage, landed: damage ? [fly(damage)] : [] });
      } else {
        plan.actions.push(planAttack(c, { ...a.fallback }, extraRage, fly));
      }
    } else {
      plan.actions.push({ ...a });
    }
  }
  return plan;
}

/** One attack action, with its riders resolved. `fly` consumes the turn's Fly on its first hit. */
function planAttack(c, a, extraRage, fly) {
  const e = c.enemy;
  const out = { ...a, kind: 'attack' };

  const wrath = abilityOf(e, 'holyWrath');
  out.doubled = !!wrath && c.player.block >= wrath.blockAtLeast;

  const strip = abilityOf(e, 'onHitBlock');
  if (strip) out.strip = { ...strip, taken: Math.min(c.player.block, strip.amount) };

  const onHit = abilityOf(e, 'onHitStatus');
  if (onHit) out.onHit = { status: onHit.status, stacks: onHit.stacks };

  // Collapse reads your Block as the attack lands — after its own strip rider, if any.
  const collapse = abilityOf(e, 'collapse');
  const blockAtImpact = Math.max(0, c.player.block - (out.strip ? out.strip.taken : 0));
  if (collapse && blockAtImpact > 0) {
    out.collapse = incomingToPlayer(c, enemyAttackDamage(c, blockAtImpact, extraRage));
  }

  out.base = out.doubled ? a.base * wrath.multiplier : a.base;
  out.perHit = incomingToPlayer(c, enemyAttackDamage(c, out.base, extraRage));
  out.landed = Array.from({ length: out.hits || 0 }, () => 0).map((_, i) => (i === 0 ? fly(out.perHit) : out.perHit));
  out.firstHit = out.landed.length ? out.landed[0] : out.perHit;
  return out;
}

// ── Hooks ──

function runAbilities(c, trigger, ...args) {
  const e = c.enemy;
  for (const a of e.abilities) {
    const def = ABILITIES[a.id];
    if (def.trigger !== trigger) continue;
    if (def.run(c, a, e.turn, ...args)) emit(c, 'ability', { side: 'enemy', name: abilityName(def, a) });
  }
}

/** The player's turn begins, after the hand is dealt. */
export function enemyPlayerTurnStart(c) {
  c.enemy.flags.stolen = null; // Spell Steal copies a card from *this* turn, not an older one
  runAbilities(c, 'playerTurnStart');
}

/** The player played a card. */
export function onPlayerCard(c, def, card) {
  runAbilities(c, 'onPlayerCard', def, card);
}

/** Step 5: the enemy's turn begins. */
export function enemyTurnStart(c) {
  const e = c.enemy;
  e.turn += 1;
  if (e.block > 0 && e.abilities.some((a) => ABILITIES[a.id].resetsBlock)) {
    e.block = 0;
    emit(c, 'blockReset', { side: 'enemy' });
  }
  runAbilities(c, 'turnStart');
}

/** Step 6: execute the planned intent. Returns true if the enemy attacked. */
export function resolveIntent(c) {
  const plan = previewIntent(c);
  emit(c, 'enemyAct', { intent: plan });
  let attacked = false;

  // Chill is spent once per enemy turn in which it deals damage, not once per action (GDD §4).
  if (plan.actions.some((a) => a.kind === 'attack' || a.kind === 'burst') && stacks(c.enemy, 'chill')) {
    reduceStatus(c, 'enemy', 'chill');
  }

  for (const a of plan.actions) {
    if (c.player.hp <= 0) break;
    if (a.kind === 'buff') {
      if (!a.blocked) addStatus(c, 'enemy', a.status, a.n);
    } else if (a.kind === 'defend') {
      gainBlock(c, 'enemy', a.block, 'defend');
    } else if (a.kind === 'burst') {
      emit(c, 'ability', { side: 'enemy', name: a.label });
      hitPlayer(c, a.amount, 'enemy');
      attacked = true;
    } else if (a.kind === 'mirror') {
      emit(c, 'ability', { side: 'enemy', name: 'Spell Steal' });
      applyMirror(c, a);
      attacked = attacked || a.damage > 0;
    } else if (a.kind === 'attack') {
      resolveAttack(c, a);
      attacked = true;
    }
  }
  return attacked;
}

function resolveAttack(c, a) {
  if (a.strip) {
    const taken = Math.min(c.player.block, a.strip.amount);
    c.player.block -= taken;
    emit(c, 'blockStrip', { side: 'player', amount: taken, block: c.player.block, name: a.strip.label });
    if (a.strip.steal) gainBlock(c, 'enemy', taken, 'ability');
    if (a.strip.drain) heal(c, 'enemy', taken, 'ability');
  }
  if (a.doubled) emit(c, 'ability', { side: 'enemy', name: 'Holy Wrath' });
  for (let i = 0; i < a.hits && c.player.hp > 0; i++) {
    hitPlayer(c, a.perHit, 'enemy');
    if (a.onHit) addStatus(c, 'player', a.onHit.status, a.onHit.stacks);
  }
  if (a.collapse && c.player.hp > 0) {
    emit(c, 'ability', { side: 'enemy', name: 'Collapse' });
    loseHp(c, a.collapse, { source: 'collapse' }); // bypasses Block, as the GDD note says
  }
}

/** Step 9. */
export function afterEnemyAction(c, attacked) {
  if (attacked) runAbilities(c, 'afterAttack');
  runAbilities(c, 'hp');
}

/** Called after card damage lands on a living enemy. */
export function onEnemyDamaged(c) {
  if (c.enemy.hp > 0) runAbilities(c, 'hp');
}
