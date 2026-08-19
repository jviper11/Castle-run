// ALDRIC — FINAL BOSS
// ═══════════════════════════════════════════════════════════════════

const ALDRIC = {
  name: 'King Aldric Ashborne',
  emoji: '👑',
  phases: [
    {
      num: 1,
      label: 'PHASE 1 — THE CORRUPTED KING',
      hp: 250,
      damage: 15,
      block: 30,
      stoneHeartBase: 30,   // starting persistent block gain
      stoneHeartMin: 2,     // minimum it can decay to
      color: '#6a0dad'
    },
    {
      num: 2,
      label: 'PHASE 2 — THE SHATTERED RULER',
      hp: 200,
      damage: 8,   // hits 3 times
      block: 0,
      color: '#8b0000'
    },
    {
      num: 3,
      label: "PHASE 3 — THE SOUL'S BURDEN",
      hp: 150,
      damage: 20,  // no relics: 20/turn
      block: 0,
      color: '#2c3e50'
    }
  ]
};

// Phase 3 HP-threshold beats, reachable only once the True Ending gate has passed.
//
// These were THE CROWN / THE SWORD / THE SIGIL / THE VOW — four named relics from the
// superseded True Ending design that no longer exist anywhere (see DESIGN_DISCREPANCIES.md).
// The relic identities, icons and names are gone. What is kept is the pacing (a beat every
// 25 HP, each pausing Aldric's attack for the turn) and Aldric's own dialogue, which is his
// soul surfacing and was never relic-specific. The per-beat MECHANICAL effect is no longer fixed
// to the HP threshold itself — it's looked up dynamically from whichever hero's Challenge relic
// the priority-compaction below assigns to that slot (see ALDRIC_HERO_BEAT_EFFECTS/
// computeAldricRelicAssignment). The quotes stay tied to the threshold, not the hero.
const ALDRIC_RELIC_TRIGGERS = [
  { hp: 100, quote: '"I remember… the throne…"' },
  { hp: 75,  quote: '"I swore to protect..."' },
  { hp: 50,  quote: '"The pact... it is breaking..."' },
  { hp: 25,  quote: '"I… am still here…"' }
];

// Fixed priority order for compacting the player's held Challenge relics onto the four beats
// above. Whichever ONE of the 5 isn't held is simply skipped and the remaining 4 compact into
// the 4 slots in this same relative order — deterministic regardless of which one is missing.
const ALDRIC_RELIC_PRIORITY = ['barbarian', 'vampire', 'mage', 'thief', 'gambler'];

// Each hero's Phase 3 beat effect — keyed by hero, not by HP threshold, since which hero lands on
// which threshold varies run to run (see computeAldricRelicAssignment). Barbarian and Gambler
// keep their original generic effects, since they already matched their own relic's theme;
// Vampire/Mage/Thief are new this batch, replacing the previous unattributed 75/50/25 HP
// placeholders (GDD §9 previously deferred all five). The old 25 HP "Aldric stops attacking for
// the rest of the fight" behavior is retired entirely — none of the five hero effects below do
// that, so G.aldricStopped (and its check at the top of Phase 3 below) is removed rather than
// left as unreachable dead code.
const ALDRIC_HERO_BEAT_EFFECTS = {
  barbarian: {
    description: 'Aldric loses all Strength.',
    apply: (g) => { g.statuses.enemy = g.statuses.enemy.filter(s => s.name !== '💢Rage'); }
  },
  vampire: {
    // The exact number and mechanic the Vampire Challenge boss (The Ancient) already uses
    // against the player every 3rd turn (tickChallengeEscalation: 8 HP drained straight from
    // player to boss) — turned back on Aldric here: he loses it, the player gains it.
    description: 'Aldric loses 8 HP, drained to you.',
    apply: (g) => {
      const drain = 8;
      g.enemy.hp = Math.max(0, g.enemy.hp - drain);
      healPlayer(g, drain);
    }
  },
  mage: {
    // Persistent, not a one-time burst — matches how Barbarian's and Gambler's own beats already
    // last for the remainder of the fight rather than firing once. Reuses the same G.extraDraw
    // field Torn Page and other extra-draw sources already add to, consumed every turn-start
    // draw for the rest of combat with no extra plumbing.
    description: 'Draw 1 extra card every turn for the rest of the fight.',
    apply: (g) => { g.extraDraw = (g.extraDraw || 0) + 1; }
  },
  thief: {
    // A straightforward burst, not a "lift a restriction" effect — Phase 3 doesn't restrict
    // Block today, so there's nothing to lift.
    description: 'Gain 15 Block.',
    apply: (g) => { gainBlock(g, 'player', 15); }
  },
  gambler: {
    description: 'Your Reroll is now infinite.',
    apply: (g) => { g.aldricInfiniteReroll = true; }
  },
};

// Computes which of the (at least 4) held Challenge relics land on which of the four beats, in
// ALDRIC_RELIC_PRIORITY order. Read once at fight start (startAldricFight()), same timing as
// G.aldricHasRelics itself — the beat sequence is fixed for the whole fight, never re-evaluated
// mid-fight, so a relic earned mid-combat (impossible today, but just in case) couldn't reshuffle it.
function computeAldricRelicAssignment(g) {
  let held = ALDRIC_RELIC_PRIORITY.filter(charKey => hasChallengeRelic(charKey));
  if (held.length >= 5) {
    // All 5 ever earned across past runs as OTHER heroes — the current hero's own relic can
    // never be earned THIS run (you can never Challenge your own hero), but a full past career
    // could have earned it while playing someone else. Exclude it so exactly 4 remain, the same
    // compaction as any other missing relic.
    held = held.filter(charKey => charKey !== g.charKey);
  }
  return held.slice(0, 4);
}

function startAldricFight() {
  const phase = ALDRIC.phases[0];
  G.aldricPhase = 1;
  G.aldricDamageDealt = 0;
  G.turn = 0;                // reset once for the whole fight, NOT per phase transition
  G._challenge = null;       // Challenges are floor-boss only — Aldric is never one
  // Ley Line Crystal (Mage) resets here too, unlike the passive relic-start hooks
  // (stageCombatStartBlock/applySoulCombatStart run with includeRelics/includeDraw=false for
  // Aldric — a documented pre-existing gap). This is a manual once-per-combat button action, the
  // same category as Gambler's Edge / Second Die, which DO reset for Aldric — so it follows
  // that precedent rather than the passive-relic one: a charge saved from the last Floor-4 fight
  // is still available for the final boss.
  G._leyLineCrystalUsed = false;
  // Dice Stabilizer — a lock is combat-scoped state, so it never carries into a new fight (an
  // unused Dice Stabilizer in G.consumables still does, being per-run). Reset here rather than
  // relying on the undefined-safe reads, so a lock cannot survive a combat that ended mid-lock.
  // Both fields, since dieLockActive() is the OR of the two — see its note.
  G._diceLockTurnsRemaining = 0;
  G._dieLockedThisTurn = false;
  // Loaded Coat (Gambler) — same reasoning as Ley Line Crystal directly above: a manual
  // once-per-combat button charge, not a passive stat hook, so it resets for Aldric too rather
  // than being subject to the passive-relic Aldric gap. G._loadedCoatSnapshot should already be
  // null by now (restoreLoadedCoatDie() clears it when the PREVIOUS combat ended) — calling it
  // again here is a genuine safety net, not just flag hygiene: if some future code path ever
  // skips checkCombatEnd()'s own restore, this resolves G.activeDie back to the real equipped
  // die before the new fight can read it, rather than leaving the corruption for a stale
  // used-flag reset to silently paper over.
  restoreLoadedCoatDie();
  G._loadedCoatUsed = false;
  // Midnight Hunger (Vampire) — this hooks into startTurn()/rollDice(), both universal functions
  // Aldric calls unconditionally, so unlike the passive relic-start hooks it needs no special
  // exclusion here. `true` is the sentinel meaning "no turn has failed to hit extreme yet" —
  // startTurn()'s very next call (Aldric's own turn 1) must not queue a bonus for a turn that
  // never happened, exactly as at the other two fight starts.
  G._hitExtremeThisTurn = true;
  G._nextRollBonus = 0;
  // The House Always Wins (Gambler) — reset here purely for hygiene: the startTurn() check is
  // already gated on G.turn > 0 (reset to 0 by this function), so a stale streak/flag from the
  // previous fight could not actually re-trigger anything. Reset anyway so no per-combat state
  // silently survives across a fight boundary, matching how every other new field this session
  // has been explicitly cleared at all three fight-start sites rather than relying on an
  // incidental guard elsewhere.
  G._maxRollStreak = 0;
  G._houseAlwaysWinsFreeCard = false;
  G.aldricTurns = 0;
  G.aldricStoneHeart = phase.stoneHeartBase;
  G.aldricRelicsTriggered = [];
  G.aldricAffinityDisabled = false;
  G.aldricInfiniteReroll = false;
  // THE TRUE ENDING GATE. Read once, here at fight start — Phase 3's escalation and the True
  // Ending are decided before the first turn and never re-evaluated mid-fight, which is the
  // timing the old check had and is preserved deliberately.
  //
  // Was `G.cores.length >= 4` — the count of Cores collected in THIS run. That was the
  // superseded gate twice over: Cores are a different system (lore reveal + Challenge unlock),
  // and a per-run count meant simply beating four floor bosses in one ordinary run unlocked the
  // True Ending, which is precisely what the July 25 redesign removed. It now reads the
  // permanent, cross-run Challenge relic record. G.cores is untouched and keeps its own job.
  G.aldricHasRelics = hasTrueEndingRelics();
  // Which held relic lands on which of Phase 3's four beats — fixed for the whole fight, same
  // timing as the gate above. Empty when the gate itself is closed (Phase 3's own "no relics"
  // branch never reads this).
  G.aldricRelicAssignment = G.aldricHasRelics ? computeAldricRelicAssignment(G) : [];
  // GDD §1's mercy choice (offered at the 50 HP beat, gated on G.aldricHasRelics) — this, not
  // G.aldricHasRelics, is what showAldricEnding() now checks. Holding the gate open is necessary
  // but no longer sufficient for the True Ending: the player must actively accept mercy when
  // offered. Declining it, never reaching Phase 3 at all, or losing beforehand all correctly
  // leave this false, matching the normal ending.
  G.aldricMercyChosen = false;
  G.aldricBossDice = 0;       // current boss dice roll (0 = not active yet)
  G.aldricDiceCurseActive = false; // Phase 2+ boss rolls each turn // True ending check

  const e = {
    name: phase.label,
    emoji: phase.emoji || '👑',
    hp: phase.hp,
    maxHp: phase.hp,
    block: phase.block,
    damage: phase.damage,
    intent: 'attack',
    reward: 200,
    souls: 30,
    isAldric: true
  };

  G.enemy = e;
  G.block = 0;
  G.statuses = { player: [], enemy: [] };
  G.exhaustedPile = [];
  G.inBoss = true;
  G.isFinalBoss = true;
  stageCombatStartBlock(G, false);
  applySoulCombatStart(G, false);
  // Unconditional for Aldric, unlike the two calls above: those are gated off here by the
  // documented relic/draw exclusion, but a Curse is a card in the deck, and the deck is the deck.
  // Debt bleeding the player at the start of the final fight is the curse working, not a leak.
  applyCurseCombatStart(G);

  showScreen('combat-screen');
  updateCombatSprites(G.charKey, 'aldric');
  document.getElementById('player-name').textContent = G.char.name.toUpperCase();
  document.getElementById('enemy-name').textContent = 'KING ALDRIC ASHBORNE';
  document.getElementById('enemy-sprite').classList.remove('dying');

  updateAldricUI();
  shuffleDeck();
  startTurn();
  renderAll();
}

function updateAldricUI() {
  const phase = G.aldricPhase || 1;
  const banner = document.getElementById('aldric-phase-banner');
  const shEl = document.getElementById('aldric-stone-heart');
  const cracks = document.getElementById('aldric-cracks');

  if (!banner) return;

  const phaseData = ALDRIC.phases[phase - 1];
  banner.style.display = 'block';
  banner.textContent = phaseData ? phaseData.label : '';

  // Stone Heart indicator — Phase 1 only
  if (phase === 1 && shEl) {
    const sh = G.aldricStoneHeart || 0;
    shEl.style.display = 'block';
    shEl.innerHTML = '🧱 Stone Heart: <span style="color:#5dade2;font-weight:bold">' + sh + '</span> block gain per trigger';
  } else if (shEl) {
    shEl.style.display = 'none';
  }

  // Crack overlay
  if (cracks) {
    cracks.className = phase === 2 ? 'phase2' : phase === 3 ? 'phase3' : '';
    cracks.id = 'aldric-cracks';
  }
}

// Base damage and hit count of Aldric's attack for the current phase, BEFORE the shared enemy
// modifiers (Rage / Weak / Chill) are applied by enemyAttackDamage().
//
// BUG FIX (Aug 15, 2026): every phase used to call resolveEnemyAttack() with a hardcoded number,
// bypassing enemyAttackDamage() entirely — so Rage, Weak and Chill never touched Aldric's damage,
// while endTurn()'s STEP 6b still drained a Weak stack per turn. The player watched Weak tick
// down against the final boss while it did nothing. Sharing this profile between
// processAldricTurn() and updateIntent() also keeps his displayed intent honest, the same way
// enemyAttackDamage() does for regular enemies.
function aldricAttackProfile(g) {
  const phase = g.aldricPhase || 1;
  let base = g.enemy.damage;   // set per phase by startAldricFight / checkAldricPhaseTransition
  let hits = 1;
  if (phase === 2) {
    // Fractured Strike — lands three times, amplified while the player burns or is poisoned.
    hits = 3;
    const hasPoison = g.statuses.player.find(s => s.name === '☠️Poison');
    const hasBurn = g.statuses.player.find(s => s.name === '🔥Burn');
    if (hasPoison || hasBurn) base = Math.floor(base * 1.5);
  } else if (phase === 3 && g.aldricHasRelics) {
    // Weakened phase 3, reachable only with the True Ending gate passed. Explicit value: the
    // phase's own enemy.damage is 20. (The superseded Sword trigger used to halve enemy.damage
    // and never reached this branch, which is why that dead effect has been removed — see
    // ALDRIC_RELIC_TRIGGERS above and DESIGN_DISCREPANCIES.md.)
    base = 15;
  }
  return { base, hits };
}

function processAldricTurn() {
  if (!G.enemy || !G.enemy.isAldric) return;
  G.aldricTurns = (G.aldricTurns || 0) + 1;
  const phase = G.aldricPhase || 1;

  // ── PHASE 1: CORRUPTED KING ──
  if (phase === 1) {
    // Stone Heart — restore block each turn
    G.enemy.block = G.aldricStoneHeart;
    floatDamage('enemy-combatant', G.aldricStoneHeart, 'block');

    // Stone Heart decays every 4 turns
    if (G.aldricTurns % 4 === 0 && G.aldricStoneHeart > ALDRIC.phases[0].stoneHeartMin) {
      G.aldricStoneHeart = Math.max(ALDRIC.phases[0].stoneHeartMin, G.aldricStoneHeart - 2);
      showMsg('🧱 Stone Heart weakens — block reduced to ' + G.aldricStoneHeart + '!');
    }

    // Grieving Ground — attack + add Curse (routes through the shared enemy-attack pipeline,
    // and through enemyAttackDamage() so Rage/Weak/Chill apply as they do to any other enemy)
    resolveEnemyAttack(G, enemyAttackDamage(G, true, aldricAttackProfile(G).base));
    G.discardPile.push('curse_weakness');
    showMsg('👑 Grieving Ground — Curse of Weakness added to your deck!');
    updateAldricUI();
    return;
  }

  // ── PHASE 2: SHATTERED RULER ──
  if (phase === 2) {
    // Boss dice — rolls each turn, nullifies matching player roll
    G.aldricBossDice = Math.floor(Math.random() * 6) + 1;
    updateBossDiceCurse();

    // Memory Leech every 3rd turn
    if (G.aldricTurns % 3 === 0) {
      G.aldricAffinityDisabled = true;
      showMsg('👑 Memory Leech — your dice affinity is stolen this turn!');
      setTimeout(() => { G.aldricAffinityDisabled = false; }, 100);
    }

    // Fractured Strike — 3 hits, amplified by the player's Poison/Burn (see aldricAttackProfile)
    const profile = aldricAttackProfile(G);
    if (profile.base > G.enemy.damage) {
      showMsg('👑 Fractured Strike — amplified by your status effects!');
    }
    // Resolve the shared modifiers ONCE for the whole volley: three hits are one attack, so a
    // single Chill stack is consumed, not three (mirrors the multi-hit rule for Weak).
    const strikeDmg = enemyAttackDamage(G, true, profile.base);
    resolveEnemyAttack(G, strikeDmg);
    setTimeout(() => resolveEnemyAttack(G, strikeDmg), 200);
    setTimeout(() => resolveEnemyAttack(G, strikeDmg), 400);

    // Desperation — 2 Strength per exhausted Power, capped at 6
    const exhaustedCount = Math.min((G.exhaustedPile || []).length, 3);
    if (exhaustedCount > 0) {
      const strGain = exhaustedCount * 2;
      applyStatus(G, 'enemy', '💢Rage', strGain);
    }
    return;
  }

  // PHASE 3: SOULS BURDEN
  if (phase === 3) {
    if (!G.aldricHasRelics) {
      // No relics — Unbreakable wall. Statuses are cleared FIRST, so the shared modifiers below
      // find nothing to apply: the immunity is preserved, it is just now expressed by the
      // clearing rather than by bypassing the damage helper.
      G.statuses.enemy = []; // immune to all status
      resolveEnemyAttack(G, enemyAttackDamage(G, true, aldricAttackProfile(G).base));
      showMsg('👑 The cycle continues... you are not ready.');
      return;
    }

    // Has relics — check thresholds. Each beat's effect comes from whichever hero
    // G.aldricRelicAssignment placed at this same index (computed once at fight start).
    const hp = G.enemy.hp;
    for (let i = 0; i < ALDRIC_RELIC_TRIGGERS.length; i++) {
      const trigger = ALDRIC_RELIC_TRIGGERS[i];
      if (hp <= trigger.hp && !G.aldricRelicsTriggered.includes(trigger.hp)) {
        G.aldricRelicsTriggered.push(trigger.hp);
        showAldricRelicTrigger(trigger, G.aldricRelicAssignment[i]);
        return; // skip attack this turn for dramatic pause
      }
    }

    resolveEnemyAttack(G, enemyAttackDamage(G, true, aldricAttackProfile(G).base)); // relic-reduced
  }
}

function showAldricRelicTrigger(trigger, heroKey) {
  // Apply the effect belonging to whichever hero's relic occupies this beat (see
  // ALDRIC_HERO_BEAT_EFFECTS/computeAldricRelicAssignment) — no heroKey means the assignment
  // came up short (shouldn't happen once G.aldricHasRelics is true, but never hard-crash a beat
  // over it). Every beat also skips Aldric's attack for the turn regardless — that happens in
  // the caller, which returns early right after this call.
  const beat = ALDRIC_HERO_BEAT_EFFECTS[heroKey];
  if (beat) beat.apply(G);
  showMsg('✨ ' + trigger.quote);

  // Show dramatic overlay. One shared banner for all four beats — the per-relic icons and
  // names belonged to the deleted four-relic design.
  const overlay = document.getElementById('aldric-relic-msg');
  document.getElementById('aldric-relic-icon').textContent = '✨';
  document.getElementById('aldric-relic-name').textContent = 'THE RELICS PULSE';
  document.getElementById('aldric-relic-quote').textContent = trigger.quote;
  document.getElementById('aldric-relic-effect').textContent = beat ? beat.description : '';
  overlay.classList.add('visible');

  setTimeout(() => overlay.classList.remove('visible'), 3500);

  // GDD §1's mercy choice — tied to the 50 HP beat specifically, never to whichever hero's relic
  // happens to occupy it this run. Presented alongside this beat's own effect (both overlays
  // visible together), not instead of it.
  if (trigger.hp === 50) {
    showAldricMercyChoice();
  }
}

function showAldricMercyChoice() {
  const overlay = document.getElementById('aldric-mercy-overlay');
  if (overlay) overlay.classList.add('visible');
}

// Continuing is the do-nothing path — no state change beyond dismissing the prompt. The fight
// resumes exactly as if the choice had never been offered, toward a real kill.
function declineAldricMercy() {
  const overlay = document.getElementById('aldric-mercy-overlay');
  if (overlay) overlay.classList.remove('visible');
}

// Accepting ends the fight immediately by routing through the EXACT same win-resolution pipeline
// a genuine killing blow already uses (checkCombatEnd()'s enemy-death branch), rather than
// duplicating gold/Soul/relic-hook logic here — the only thing specific to mercy is setting the
// flag showAldricEnding() now checks, and forcing G.enemy.hp to 0 first.
function acceptAldricMercy() {
  const mercyOverlay = document.getElementById('aldric-mercy-overlay');
  if (mercyOverlay) mercyOverlay.classList.remove('visible');
  // The informational relic-trigger banner may still be mid-auto-dismiss (3500ms) — hide it now
  // rather than let it linger on top of the victory screen checkCombatEnd() is about to show.
  const relicOverlay = document.getElementById('aldric-relic-msg');
  if (relicOverlay) relicOverlay.classList.remove('visible');
  G.aldricMercyChosen = true;
  G.enemy.hp = 0;
  checkCombatEnd();
}

function checkAldricPhaseTransition() {
  if (!G.enemy || !G.enemy.isAldric) return false;
  if (G.enemy.hp > 0) return false;

  const nextPhase = (G.aldricPhase || 1) + 1;
  if (nextPhase > 3) return false; // all phases done, true death

  // Transition to next phase
  const phaseData = ALDRIC.phases[nextPhase - 1];
  G.aldricPhase = nextPhase;
  G.aldricTurns = 0;

  // Flash the crack overlay
  const cracks = document.getElementById('aldric-cracks');
  if (cracks) {
    cracks.style.background = 'rgba(139,0,0,0.4)';
    setTimeout(() => { updateAldricUI(); }, 500);
  }

  if (nextPhase === 2) {
    showMsg('💥 The throne SHATTERS — Phase 2 begins!');
    // Show boss dice taunt with a delay for drama
    setTimeout(() => showBossDiceTaunt(), 1500);
  } else {
    showMsg('🌑 The corruption bleeds out… Phase 3 begins!');
  }

  // Reset for next phase
  setTimeout(() => {
    G.enemy.hp = phaseData.hp;
    G.enemy.maxHp = phaseData.hp;
    G.enemy.damage = phaseData.damage;
    G.enemy.block = phaseData.block || 0;
    G.statuses.enemy = [];
    G.exhaustedPile = [];

    G.aldricBossDice = 0; // clear boss dice on phase 3
  updateBossDiceCurse();
  if (nextPhase === 3 && !G.aldricHasRelics) {
      showMsg('👑 UNBREAKABLE — the castle still holds him. He deals 20 damage per turn.');
    }
    if (nextPhase === 3 && G.aldricHasRelics) {
      showMsg('✨ The relics pulse… Aldric stirs. Push forward.');
    }

    updateAldricUI();
    renderAll();
    startTurn();
  }, 1200);

  return true; // phase transition handled
}

function showBossDiceTaunt() {
  // Flash screen white
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:white;z-index:999;opacity:0;transition:opacity 0.1s;pointer-events:none;';
  document.body.appendChild(flash);
  setTimeout(() => { flash.style.opacity = '0.8'; }, 10);
  setTimeout(() => { flash.style.opacity = '0'; }, 200);
  setTimeout(() => { flash.remove(); }, 500);

  // Show boss dice overlay after flash
  setTimeout(() => {
    const overlay = document.getElementById('aldric-boss-dice');
    const numEl = document.getElementById('boss-dice-number');
    const diceEl = overlay.querySelector('.boss-dice-face');

    // Animate dice rolling
    const rollAnim = setInterval(() => {
      numEl.textContent = Math.floor(Math.random() * 6) + 1;
    }, 80);

    overlay.classList.add('visible');

    setTimeout(() => {
      clearInterval(rollAnim);
      // Pick final number
      G.aldricBossDice = Math.floor(Math.random() * 6) + 1;
      numEl.textContent = G.aldricBossDice;
      diceEl.style.animation = 'none';
      G.aldricDiceCurseActive = true;
      updateBossDiceCurse();
    }, 1000);
  }, 300);
}

function dismissBossDice() {
  document.getElementById('aldric-boss-dice').classList.remove('visible');
}

function updateBossDiceCurse() {
  const el = document.getElementById('aldric-curse-indicator');
  if (!el) return;
  if (G.aldricBossDice && G.aldricBossDice > 0 && G.isFinalBoss && G.aldricPhase >= 2) {
    el.classList.add('visible');
    el.textContent = '🎲 Castle Curse: roll ' + G.aldricBossDice + ' = no affinity';
  } else {
    el.classList.remove('visible');
  }
}

function getMagicHint(type, floor) {
  if (floor === 0) return null; // always hinted on floor 1 (no hint = show type)
  const hints = {
    battle: 'Growling echoes from behind the door. Something stirs.',
    elite: 'The door is cracked. Something stares back through it.',
    event: 'Strange symbols glow faintly across the door surface.',
    shop: 'The scent of candle wax and gold drifts from beneath.',
    rest: 'Warm orange light bleeds under the door.',
    die_reward: 'A faint rattle, like dice waiting to be claimed.',
    // 'boss' is unreachable through a Magic Door (showDoors never assigns it), so this entry exists
    // for The Gambler's Dice tip in js/data.js, which can look one room past the end of a path.
    boss: 'Something enormous breathes on the other side. It is waiting for you.',
  };
  return hints[type] || null;
}

// `die_reward` is a Magic-Door-only room type (see showDoors in js/game.js). It was missing from
// both tables, so a REVEALED die-reward door fell through to the 🚪 / 'Unknown' defaults and
// looked exactly like a hidden one — which, on Floors 1-2 where doors are never hidden, is every
// die-reward door the player meets there.
function roomEmoji(type) {
  return { battle:'⚔️', elite:'💀', event:'❓', shop:'🛒', rest:'❤️', boss:'👑', die_reward:'🎲' }[type] || '🚪';
}
function roomLabel(type) {
  return { battle:'Battle', elite:'Elite Fight', event:'Strange Event', shop:'Merchant', rest:'Rest Stop', boss:'Floor Boss', die_reward:'Dice Cache' }[type] || 'Unknown';
}

// ═══════════════════════════════════════════════════════════════════
// COMBAT
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// CURSES — the three with real mechanics (GDD Curse card rewards)
// ═══════════════════════════════════════════════════════════════════
// Curse of Weakness has no hook here on purpose: "Does nothing. A dead weight in your deck" is
// already exactly what a playable 1-cost card with a message-only effect does.
//
// All three surcharge/damage values live here rather than inline, so the numbers the descriptions
// print have exactly one definition.
const CURSE_DEBT_DAMAGE = 3;       // per copy held, at the start of every combat
const CURSE_CONFUSION_TAX = 2;     // one other card in hand, this turn only
const CURSE_BINDING_TAX = 2;       // one card key, permanently

// How many copies of `key` the run's master deck holds. G.deck is the only list that is stable at
// fight-start time — shuffleDeck() empties G.hand and rebuilds G.drawPile from G.deck, so counting
// hand or draw pile as well would either double-count or miss copies depending on call order.
function countInDeck(g, key) {
  return (g.deck || []).filter(k => String(k).replace(/\+$/, '') === key).length;
}

// Curse of Debt — "Takes 3 damage at start of combat", once per copy held. Called from all four
// fight-start functions, so it applies to normal fights, bosses, Sir Crimson and Aldric alike: a
// curse in the deck is a curse in every fight.
//
// Floored at 1 HP, deliberately. The printed text promises damage, not death, and there is no safe
// way to die here — the player has had no chance to act, has no counterplay, and checkCombatEnd()
// at fight-start time would run before the combat screen is built. loseHP()'s own floorAt does it,
// so the survive-killing-blow relics are not consumed by a curse that could never have killed.
function applyCurseOfDebt(g) {
  const copies = countInDeck(g, 'curse_debt');
  if (copies <= 0) return;
  const dmg = CURSE_DEBT_DAMAGE * copies;
  loseHP(g, dmg, 1);
  showMsg(`⛓️ Curse of Debt — ${dmg} damage${copies > 1 ? ` (${copies} copies)` : ''}!`);
}

// Curse of Binding — each copy permanently surcharges one card KEY. See the note on curse_binding
// in js/data.js for why this is key-level and not per-copy.
//
// Driven by a counter rather than a deck-entry hook: G.cursedBindingsResolved records how many
// copies have already chosen, so this can be called from anywhere (a grant site, a fight start)
// any number of times and still assign exactly one key per copy. There is no single chokepoint
// where a card "enters the deck" — G.deck.push() happens at the reward screen, the shop and events
// — so a counter sweep is what keeps this correct without a hook at every one of them.
//
// Candidates are the DISTINCT non-Curse base keys in the deck. Distinct matters: drawing from the
// raw array would make a 4-copy starter four times likelier to be cursed than a singleton, on top
// of already being four times worse to lose.
function resolveCurseOfBinding(g) {
  const copies = countInDeck(g, 'curse_binding');
  let resolved = g.cursedBindingsResolved || 0;
  if (copies <= resolved) return;
  if (!g.cursedCardCosts) g.cursedCardCosts = {};
  while (resolved < copies) {
    const candidates = [...new Set((g.deck || [])
      .map(k => String(k).replace(/\+$/, ''))
      .filter(k => CARDS[k] && CARDS[k].type !== 'Curse'))];
    if (!candidates.length) break; // a deck of nothing but Curses has nothing to bind
    const victim = candidates[Math.floor(Math.random() * candidates.length)];
    // Accumulates rather than overwrites, so two Bindings landing on the same key total +4.
    g.cursedCardCosts[victim] = (g.cursedCardCosts[victim] || 0) + CURSE_BINDING_TAX;
    const name = (CARDS[victim] && CARDS[victim].name) || victim;
    showMsg(`🔗 Curse of Binding — ${name} now costs ${CURSE_BINDING_TAX} more, permanently.`);
    resolved++;
  }
  g.cursedBindingsResolved = resolved;
}

// Curse of Confusion — "A random card in hand costs +2 each turn". Re-picked every turn from the
// hand the player was just dealt, which is why startTurn() calls this AFTER its draw rather than
// beside the other per-turn resets.
//
// Requires a copy in HAND, not merely in the deck: the text describes a card in hand taxing another
// card in hand, and the curse being unplayable means it clogs that hand until end of turn discards
// it. In the draw pile it does nothing, which is the intended difference from Binding.
//
// Excludes itself and every other hard-blocked card from the candidate list — taxing something that
// cannot be played is a guaranteed no-op, which would silently waste the turn's effect.
function applyCurseOfConfusion(g) {
  g._confusedCardKey = null; // cleared every turn first, so a stale tax can never survive a turn
  const holding = (g.hand || []).some(k => String(k).replace(/\+$/, '') === 'curse_confusion');
  if (!holding) return;
  const candidates = [...new Set((g.hand || [])
    .map(k => String(k).replace(/\+$/, ''))
    .filter(k => CARDS[k] && k !== 'curse_confusion' && !isHardBlocked(g, k)))];
  if (!candidates.length) return; // nothing else playable in hand — no tax rather than a self-tax
  g._confusedCardKey = candidates[Math.floor(Math.random() * candidates.length)];
  const name = (CARDS[g._confusedCardKey] && CARDS[g._confusedCardKey].name) || g._confusedCardKey;
  showMsg(`🌀 Curse of Confusion — ${name} costs ${CURSE_CONFUSION_TAX} more this turn!`);
}

// Shared fight-start entry point for the deck-scanning curses, so the four fight-start functions
// each gain one call rather than two.
function applyCurseCombatStart(g) {
  resolveCurseOfBinding(g); // safety net — a grant site may already have resolved it
  applyCurseOfDebt(g);
}

// Spend the extra card draws banked outside combat (The Broken Clock's "wind it", and the same
// entry in EVENT_POTION_POOL — see js/ui.js). Called from startCombat(), startBossFight() and
// startSirCrimsonFight() immediately after each resets G.extraDraw to 0, so the bank survives that
// reset and then simply sums with the relic bonuses applied further down (torn_page,
// cursed_hourglass). Zeroed on spend, which is what makes it exactly-once.
//
// Deliberately NOT called from startAldricFight(): that function is the one fight-start that never
// resets G.extraDraw at all, because Aldric inherits the Floor 3 boss fight's value by design (see
// the applySoulCombatStart note below). Calling this there would add the bank a second time on top
// of the value it inherited. A bank cannot survive unspent into Aldric anyway — the Floor 3 boss
// always sits between an event room and the final fight, and spends it.
function spendPendingExtraDraw() {
  const banked = G.pendingExtraDraw || 0;
  if (banked <= 0) return;
  G.extraDraw += banked;
  G.pendingExtraDraw = 0;
  showMsg(`🕰️ Wound clock — +${banked} card this battle!`);
}

// Soul-upgrade hooks that fire at the start of every combat (GDD §15). Called from
// startCombat(), startBossFight() and startAldricFight() so the run-long upgrades apply to
// every fight, including Aldric — the last spend window is after the Floor 3 boss, so an
// upgrade bought there has to survive into the final fight.
// `includeDraw` is false for the Aldric fight only: startAldricFight() does not reset
// G.extraDraw (so it inherits the Floor 3 boss fight's value, relic bonuses included), and
// adding Overdraw's +1 on top of a value that already contains it would double the bonus.
function applySoulCombatStart(g, includeDraw = true) {
  if (includeDraw && hasSoulUpgrade('overdraw')) g.extraDraw = (g.extraDraw || 0) + 1;
  // Steady Hand is ONE extra reroll for the whole fight, not one per turn. It lives in its own
  // pool because G.rerollsLeft refreshes every turn (see startTurn) — this pool deliberately
  // does not, so the bonus is scarce: use it on turn 1 and it is gone for the rest of the combat.
  g._bonusRerolls = hasSoulUpgrade('steady_hand') ? 1 : 0;
  // Both dice upgrades are once per combat — cleared here, not at run level, so they come
  // back every fight.
  g._secondDieUsed = false;
  g._gamblersEdgeUsed = false;
}

// Start-of-combat Block is STAGED rather than added to G.block directly.
//
// Bug fix (Aug 15, 2026): startTurn() zeroes G.block on the first turn of every combat, and it
// runs after these hooks — so every start-of-combat Block grant was wiped before the player
// ever saw it. Iron Vambrace granted nothing, and Hollow Throne was pure downside (−8 max HP
// for 20 Block that never arrived). startTurn() now applies this staged total immediately after
// its reset, so all three grants land on turn 1 as their descriptions have always claimed.
//
// `includeRelics` is false for the Aldric fight, which has never run the relic start-of-combat
// hooks at all (torn_page, rusted_chain, ashen_crown are all absent there too — a separate
// pre-existing gap). Grit still applies there, since the Floor 3 spend window precedes it.
function stageCombatStartBlock(g, includeRelics = true) {
  g._pendingCombatBlock = 0;
  if (includeRelics) {
    if (hasRelic('iron_vambrace')) g._pendingCombatBlock += 6;
    if (hasRelic('hollow_throne')) g._pendingCombatBlock += 20;
    // Shadow Wrap (Thief) is a start-of-combat Block grant, same category as Iron Vambrace —
    // NOT the torn_page/rusted_chain inline pattern. A direct `g.block += 5` at fight start would
    // be silently wiped by startTurn()'s turn-1 Block reset, reproducing the exact bug that
    // Iron Vambrace/Hollow Throne needed this staging mechanism to fix in the first place.
    if (hasCharacterRelic('shadow_wrap', g)) g._pendingCombatBlock += 5;
  }
  if (hasSoulUpgrade('grit')) g._pendingCombatBlock += 5;
}

// Base reroll charges granted at the start of every TURN. Steady Hand is not counted here —
// it is a separate once-per-combat pool (see applySoulCombatStart).
function rerollAllowance() {
  return 1;
}

// Everything the player can still spend right now: this turn's base charge plus whatever is
// left of Steady Hand's combat-long bonus.
function totalRerollsLeft() {
  return Math.max(0, G.rerollsLeft || 0) + Math.max(0, G._bonusRerolls || 0);
}

function startCombat(isElite) {
  let pool;
  if (isElite) {
    // Floor-appropriate elites
    const floorEliteMap = { 0:[0,1], 1:[2,3], 2:[4,5], 3:[6,7] };
    const indices = floorEliteMap[G.currentFloor] || [0,1];
    pool = indices.map(i => ELITES[i]).filter(Boolean);
    if (!pool.length) pool = ELITES.slice(0,2);
  } else {
    // First 2 rooms of Floor 1 use easy pool
    const isEasy = G.currentFloor === 0 &&
      (G.map[0][`roomIndex${G.map[0].currentPath}`] || 0) < 2;
    pool = isEasy ? EASY_ENEMIES : (FLOOR_ENEMIES[G.currentFloor + 1] || FLOOR_ENEMIES[1]);
  }

  const e = { ...rand(pool) };
  G.enemy = { ...e, maxHp: e.hp, turnCount: 0 };
  G.enemy.intent = 'attack';
  G.block = 0;
  G.statuses = { player: [], enemy: [] };
  G.exhaustedPile = [];
  G.inBoss = false;
  G.lastFightWasElite = !!isElite;
  G._voidCompassOffered = false; // Void Compass post-elite relic reward fires once per fight
  G.phantomBladeFired = false;
  G.extraDraw = 0;
  spendPendingExtraDraw();
  G.startingDrawCount = 5;   // cards drawn at the start of each turn
  G.maxHandSize = 8;         // cap that in-turn draw effects can fill up to
  G.cardsPlayedThisCombat = 0;
  G.turn = 0;                // per-combat turn counter; startTurn() takes it to 1 immediately
  G._challenge = null;       // Challenges are floor-boss only — never a normal or elite fight
                             // (startBossFight deliberately does NOT clear this: showBossIntro
                             // sets it just before, and clearing would discard the opt-in)
  G._ashenCrownFired = false;
  G._leyLineCrystalUsed = false; // once per combat — see startAldricFight for the full lifecycle note
  G._diceLockTurnsRemaining = 0; // Dice Stabilizer — see startAldricFight for the scope note
  G._dieLockedThisTurn = false;
  restoreLoadedCoatDie(); // Loaded Coat — see startAldricFight for the full lifecycle note
  G._loadedCoatUsed = false;
  G._hitExtremeThisTurn = true; // Midnight Hunger — see startAldricFight for the sentinel note
  G._maxRollStreak = 0; // The House Always Wins — see startAldricFight for the reset note
  G._houseAlwaysWinsFreeCard = false;
  G._nextRollBonus = 0;
  // Relic hooks — start of combat
  // (iron_vambrace and hollow_throne Block are staged by stageCombatStartBlock below, so they
  // survive startTurn's turn-1 Block reset)
  if (hasRelic('cracked_hourglass')) { G.rerollUsed = false; G.rerollsLeft = rerollAllowance(); }
  if (hasRelic('rusted_chain')) G.statuses.enemy.push({ name:'🫗Vulnerable', stacks:1 });
  if (hasRelic('torn_page')) G.extraDraw += 1;
  if (hasRelic('cursed_hourglass')) { G.extraDraw += 2; G.maxHandSize = 4; }
  stageCombatStartBlock(G);
  applySoulCombatStart(G);
  applyCurseCombatStart(G);

  updateCombatSprites(G.charKey, null);
  document.getElementById('player-name').textContent = G.char.name.toUpperCase();
  document.getElementById('enemy-sprite').textContent = e.emoji;
  document.getElementById('enemy-name').textContent = e.name.toUpperCase();
  document.getElementById('enemy-sprite').classList.remove('dying');

  shuffleDeck();
  startTurn();
  renderAll();
}

// ═══════════════════════════════════════════════════════════════════
// CHALLENGE MODE — GDD §1, §9
// ═══════════════════════════════════════════════════════════════════
//
// A floor boss can be fought under Challenge conditions when ALL of these hold:
//   1. a Challenge exists for that hero,
//   2. it is not the hero the player is currently playing — you can never fight yourself.
//      (The boss pool already excludes the player's hero, so this states the rule locally
//      rather than relying on map generation to keep enforcing it.)
//   3. their Core was collected in an EARLIER run. This reads META, never G.cores: G.cores is
//      rebuilt empty every run, so using it would let a companion qualify inside the very run
//      that first beat them, which is not what "in a future run" means.
//   4. their Challenge relic is not already earned — once earned, it is never offered again.
//
// The attempt is opt-in: showBossIntro() offers it and the player accepts before combat.
// G._challenge holds the accepted hero key for the current fight, or null/undefined.
function isChallengeEligible(g, bossCharKey) {
  if (!bossCharKey || !CHALLENGES[bossCharKey]) return false;
  if (bossCharKey === g.charKey) return false;
  if (!hasCoreCollected(bossCharKey)) return false;
  if (hasChallengeRelic(bossCharKey)) return false;
  return true;
}

// Is a Challenge running right now, and is it this specific one?
function challengeActive(g, charKey) {
  if (!g || !g._challenge) return false;
  return charKey === undefined ? true : g._challenge === charKey;
}

// Escalation Challenges tick here, from the same point in endTurn() where every other
// turn-triggered enemy ability fires (STEP 5, before the enemy acts), so their cadence
// matches existing specials. Gated on G.turn, which resets per combat and is already 1 on
// the first player turn — so "every 2 turns from turn 2" is turns 2,4,6… and "every 3 turns
// from turn 3" is turns 3,6,9…, with no separate counter to keep in sync.
function tickChallengeEscalation(g) {
  if (!challengeActive(g) || !g.enemy) return;
  if (challengeActive(g, 'barbarian') && g.turn > 0 && g.turn % 2 === 0) {
    // Rage IS Strength for enemies — dealt with by the same modifier path enemy attacks
    // already run through, rather than a parallel stat.
    applyStatus(g, 'enemy', '💢Rage', 1);
    showMsg('⚔️ Challenge — The Berserker grows stronger! (+1 Strength)');
  }
  if (challengeActive(g, 'vampire') && g.turn > 0 && g.turn % 3 === 0) {
    const drain = 8;
    loseHP(g, drain, null, 'enemy'); // the boss draining you is damage taken, not a self-cost
    floatDamage('player-combatant', drain, 'dmg');
    g.enemy.hp = Math.min(g.enemy.maxHp, g.enemy.hp + drain);
    floatDamage('enemy-combatant', drain, 'heal');
    showMsg('🩸 Challenge — The Ancient drains ' + drain + ' HP!');
  }
}

function startBossFight() {
  const boss = G.map[G.currentFloor].boss;
  const e = { name: boss.name, emoji: boss.emoji, hp: boss.hp, maxHp: boss.hp, block: boss.block, intent:'attack', damage: boss.damage, reward: 0, souls: boss.souls };
  G.enemy = e;
  G.block = 0;
  G.statuses = { player: [], enemy: [] };
  G.exhaustedPile = [];
  G.inBoss = true;
  G._bossRelicOffered = false; // boss relic choice fires once per boss (proceedAfterCardReward)
  G.lastFightWasElite = false; // a boss fight is never an elite — clear the flag so
                               // "after elite" effects (iron_ration, grave_robber, Void
                               // Compass) don't misfire on a boss that follows an elite
  G.phantomBladeFired = false;
  G.extraDraw = 0;
  spendPendingExtraDraw();
  G.startingDrawCount = 5;   // cards drawn at the start of each turn
  G.maxHandSize = 8;         // cap that in-turn draw effects can fill up to
  G.cardsPlayedThisCombat = 0;
  G.turn = 0;                // per-combat turn counter; startTurn() takes it to 1 immediately
  G._ashenCrownFired = false;
  G._leyLineCrystalUsed = false; // once per combat — see startAldricFight for the full lifecycle note
  G._diceLockTurnsRemaining = 0; // Dice Stabilizer — see startAldricFight for the scope note
  G._dieLockedThisTurn = false;
  restoreLoadedCoatDie(); // Loaded Coat — see startAldricFight for the full lifecycle note
  G._loadedCoatUsed = false;
  G._hitExtremeThisTurn = true; // Midnight Hunger — see startAldricFight for the sentinel note
  G._maxRollStreak = 0; // The House Always Wins — see startAldricFight for the reset note
  G._houseAlwaysWinsFreeCard = false;
  G._nextRollBonus = 0;
  // Relic hooks — start of combat
  // (iron_vambrace and hollow_throne Block are staged by stageCombatStartBlock below, so they
  // survive startTurn's turn-1 Block reset)
  if (hasRelic('cracked_hourglass')) { G.rerollUsed = false; G.rerollsLeft = rerollAllowance(); }
  if (hasRelic('rusted_chain')) G.statuses.enemy.push({ name:'🫗Vulnerable', stacks:1 });
  if (hasRelic('torn_page')) G.extraDraw += 1;
  if (hasRelic('cursed_hourglass')) { G.extraDraw += 2; G.maxHandSize = 4; }
  stageCombatStartBlock(G);
  applySoulCombatStart(G);
  applyCurseCombatStart(G);

  showScreen('combat-screen');
  document.getElementById('player-sprite').textContent = G.char.emoji;
  document.getElementById('player-name').textContent = G.char.name.toUpperCase();
  document.getElementById('enemy-sprite').textContent = e.emoji;
  document.getElementById('enemy-name').textContent = e.name.toUpperCase();
  document.getElementById('enemy-sprite').classList.remove('dying');

  shuffleDeck();
  startTurn();
  renderAll();
}

// ═══════════════════════════════════════════════════════════════════
// SIR CRIMSON — MID-RUN FIGHT (GDD §5), batch 5b-ii
// ═══════════════════════════════════════════════════════════════════
// GDD's move list, wired through the 5b-i multi-move rotation engine (updateIntent()/
// resolveMoveTurn()/findEarlyTelegraphedMove() in this file). Field names here match the engine's
// own established schema exactly as built and verified last batch — `block` doubles as "Block
// gained" for a 'block' move and "player Block stripped" for 'attack+strip', and `status` is the
// same `{name, stacks}` shape applyStatus() already takes everywhere else — rather than the
// shorthand (`strip:8`, `status:'Weak', stacks:2`) used to describe the design; the engine was
// deliberately built generic last batch specifically so a new boss's kit is only ever data, and
// this is that data expressed in the schema that already exists. "Telegraphed one turn early" in
// GDD's own phrasing becomes telegraphTurnsEarly: 2 here — every move already gets the engine's
// default one-turn-ahead preview for free, so "one turn EARLIER than that" is 2 turns out, which
// is exactly what findEarlyTelegraphedMove() checks for. The Echo mimic move (GDD's "every 3rd
// turn, pulls a random card from your deck") is NOT included — outside this batch's build list.
const SIR_CRIMSON_MOVES = [
  { name: 'Crimson Strike', type: 'attack', damage: 12 },
  { name: 'Iron Guard', type: 'block', block: 14 },
  { name: 'Shatter Step', type: 'attack+strip', damage: 8, block: 8 },
  { name: 'Studied Blow', type: 'attack+debuff', damage: 15, status: { name: '😵Weak', stacks: 2 }, telegraphTurnsEarly: 2 },
];

function startSirCrimsonFight() {
  const e = {
    name: 'Sir Crimson', emoji: '🗡️',
    hp: 160, maxHp: 160, block: 0,
    reward: 0, souls: 0, // no reward, no gold — checkCombatEnd()'s isSirCrimson branch never reads these, kept 0 for honesty regardless
    moves: SIR_CRIMSON_MOVES,
    _moveIndex: 0,
    _echoPick: null, // set at telegraph-time by STEP 10 the turn before each Echo turn (GDD §5)
    intent: SIR_CRIMSON_MOVES[0].type,
    isSirCrimson: true, // checkCombatEnd()'s short-circuit to the no-reward outro hand-off
  };
  G.enemy = e;
  G.block = 0;
  G.statuses = { player: [], enemy: [] };
  G.exhaustedPile = [];
  // "Full boss-level difficulty" per GDD — same treatment as a real floor boss, not Aldric's
  // documented relic/draw exclusion. G.inBoss=true is safe here specifically because
  // checkCombatEnd()'s isSirCrimson branch (above) returns before any of the G.inBoss-gated
  // gold/soul/cores logic runs — every other G.inBoss read in the codebase belongs to reward-
  // screen-adjacent flows (isBossRewardWindow, the Void Compass check) that are never reached
  // while this fight is active, confirmed by a full-repo check of every G.inBoss read before
  // writing this.
  G.inBoss = true;
  G.isFinalBoss = false;
  G.lastFightWasElite = false;
  G.phantomBladeFired = false;
  G.extraDraw = 0;
  spendPendingExtraDraw();
  G.startingDrawCount = 5;
  G.maxHandSize = 8;
  G.cardsPlayedThisCombat = 0;
  G.turn = 0;
  G._ashenCrownFired = false;
  G._leyLineCrystalUsed = false;
  G._diceLockTurnsRemaining = 0; // Dice Stabilizer — see startAldricFight for the scope note
  G._dieLockedThisTurn = false;
  restoreLoadedCoatDie();
  G._loadedCoatUsed = false;
  G._hitExtremeThisTurn = true;
  G._maxRollStreak = 0;
  G._houseAlwaysWinsFreeCard = false;
  G._nextRollBonus = 0;
  if (hasRelic('cracked_hourglass')) { G.rerollUsed = false; G.rerollsLeft = rerollAllowance(); }
  if (hasRelic('rusted_chain')) G.statuses.enemy.push({ name:'🫗Vulnerable', stacks:1 });
  if (hasRelic('torn_page')) G.extraDraw += 1;
  if (hasRelic('cursed_hourglass')) { G.extraDraw += 2; G.maxHandSize = 4; }
  stageCombatStartBlock(G);
  applySoulCombatStart(G);
  applyCurseCombatStart(G);

  showScreen('combat-screen');
  document.getElementById('player-sprite').textContent = G.char.emoji;
  document.getElementById('player-name').textContent = G.char.name.toUpperCase();
  document.getElementById('enemy-sprite').textContent = e.emoji;
  document.getElementById('enemy-name').textContent = e.name.toUpperCase();
  document.getElementById('enemy-sprite').classList.remove('dying');

  shuffleDeck();
  startTurn();
  renderAll();
}

// ═══════════════════════════════════════════════════════════════════
// EVENT-TRIGGERED COMBAT — shared plumbing
// ═══════════════════════════════════════════════════════════════════
//
// A fight started by an event choice rather than by walking into a battle room. Modeled on
// startCombat() for all the per-combat state resets, but takes an explicit enemy object instead of
// drawing from a floor pool, and hands control back to a caller-supplied callback on victory instead
// of running the normal reward chain.
//
// `enemyDef` needs at minimum { name, emoji, hp, damage }. Everything else is filled in below.
// `onVictory` is invoked once, after the death VFX, by checkCombatEnd()'s isEventCombat branch.
//
// Two things this deliberately does NOT do, both because none of it applies to an event fight:
//   • No gold/soul/relic-hook/Cores chain on victory — see the isEventCombat short-circuit in
//     checkCombatEnd(), which mirrors the isSirCrimson one.
//   • No G.inBoss. Unlike Sir Crimson (who sets it for boss-level difficulty and gets away with it
//     only because his short-circuit returns before every G.inBoss-gated read), an event fight has
//     no reason to claim boss status, so the reward-window helpers stay correctly false.
//
// LOSS is deliberately unhandled: G.hp <= 0 falls through checkCombatEnd()'s first branch, the same
// one every other fight in the game uses. An event fight is as lethal as any other.
function startEventCombat(enemyDef, onVictory) {
  if (!enemyDef) return;

  const e = {
    reward: 0, souls: 0,   // never read — the isEventCombat branch returns before the gold/soul
                           // chain — but kept explicit for honesty, as Sir Crimson's are
    intent: 'attack',
    block: 0,
    ...enemyDef,
    maxHp: enemyDef.maxHp || enemyDef.hp,
    turnCount: 0,          // endTurn() STEP 5 increments this for `trigger:'turn'` specials
    isEventCombat: true,   // checkCombatEnd()'s short-circuit to the onVictory hand-off
  };
  G.enemy = e;

  // Assigned unconditionally, even when the caller passes nothing: a previous event fight's callback
  // must never be able to fire for this one.
  G._eventCombatVictoryCallback = typeof onVictory === 'function' ? onVictory : null;

  G.block = 0;
  G.statuses = { player: [], enemy: [] };
  G.exhaustedPile = [];
  G.inBoss = false;
  G.isFinalBoss = false;
  G.lastFightWasElite = false;   // keeps the elite-only hooks and the Void Compass screen out
  G._voidCompassOffered = false;
  G.phantomBladeFired = false;
  G.extraDraw = 0;
  spendPendingExtraDraw();
  G.startingDrawCount = 5;
  G.maxHandSize = 8;
  G.cardsPlayedThisCombat = 0;
  G.turn = 0;
  G._challenge = null;           // Challenges are floor-boss only
  G._ashenCrownFired = false;
  G._leyLineCrystalUsed = false; // once per combat — see startAldricFight for the full lifecycle note
  G._diceLockTurnsRemaining = 0; // Dice Stabilizer — see startAldricFight for the scope note
  G._dieLockedThisTurn = false;
  restoreLoadedCoatDie();        // Loaded Coat — see startAldricFight for the full lifecycle note
  G._loadedCoatUsed = false;
  G._hitExtremeThisTurn = true;  // Midnight Hunger — see startAldricFight for the sentinel note
  G._maxRollStreak = 0;          // The House Always Wins — see startAldricFight for the reset note
  G._houseAlwaysWinsFreeCard = false;
  G._nextRollBonus = 0;
  // Relic hooks — start of combat. Included in full: an event fight is a real fight, and a player
  // holding Iron Vambrace should start it with Block like any other.
  if (hasRelic('cracked_hourglass')) { G.rerollUsed = false; G.rerollsLeft = rerollAllowance(); }
  if (hasRelic('rusted_chain')) G.statuses.enemy.push({ name:'🫗Vulnerable', stacks:1 });
  if (hasRelic('torn_page')) G.extraDraw += 1;
  if (hasRelic('cursed_hourglass')) { G.extraDraw += 2; G.maxHandSize = 4; }
  stageCombatStartBlock(G);
  applySoulCombatStart(G);
  applyCurseCombatStart(G);

  // Shown here rather than left to the caller, unlike startCombat() (whose two call sites both call
  // showCombatScreen() first). An event choice runs with the event screen up, so without this the
  // fight would resolve invisibly — and inCombatScreen() reads G._activeScreen, so the consumable
  // row and the out-of-combat gate would both be wrong for the whole fight.
  showScreen('combat-screen');
  updateCombatSprites(G.charKey, null);
  document.getElementById('player-name').textContent = G.char.name.toUpperCase();
  document.getElementById('enemy-sprite').textContent = e.emoji;
  document.getElementById('enemy-name').textContent = e.name.toUpperCase();
  document.getElementById('enemy-sprite').classList.remove('dying');

  shuffleDeck();
  startTurn();
  renderAll();
}

function startTurn() {
  // Midnight Hunger (Vampire) turn-transition check. Read BEFORE resetting the flag below, so
  // this reflects whether the turn that JUST ENDED ever hit extreme — the flag is set inside
  // checkAffinity() throughout that turn, including by the empty-turn auto-roll, so a turn with
  // zero cards played still resolves correctly here.
  //
  // G._hitExtremeThisTurn is seeded `true` at combat start (see startCombat/startBossFight/
  // startAldricFight) specifically so THIS check is a no-op on turn 1 — there is no "turn that
  // just ended" yet, and without that seed a fresh false-by-default flag would wrongly queue a
  // bonus for the very first roll of the fight.
  if (hasCharacterRelic('midnight_hunger') && G._hitExtremeThisTurn === false) {
    G._nextRollBonus = 2;
  }
  G._hitExtremeThisTurn = false; // now tracks the turn about to start

  // The House Always Wins (Gambler) — same turn-transition timing as Midnight Hunger above:
  // evaluated here, before this turn's own roll happens, so G._naturalDieValue still holds
  // whatever the turn that JUST ENDED naturally rolled. Checking G._naturalDieValue directly
  // (rather than G.currentDie) is what keeps a forced max from ever advancing the streak —
  // Ley Line Crystal, Gambler's Edge and Second Die all mutate G.currentDie afterward but never
  // touch this stamp, so a turn a player "won" by forcing the die does not count as a genuine
  // max roll here.
  //
  // G.turn > 0 skips this on the very first turn of a fight: G.turn is reset to 0 by every
  // fight-start function and only becomes 1 below, so at this point it still reads 0 on turn 1,
  // meaning there is no "turn that just ended" yet — without this guard, a stale
  // G._naturalDieValue left over from the PREVIOUS fight's last roll could spuriously count.
  if (G.turn > 0 && hasCharacterRelic('house_always_wins')) {
    if (G._naturalDieValue === G.diceMax) {
      G._maxRollStreak = (G._maxRollStreak || 0) + 1;
      if (G._maxRollStreak >= 2) {
        G._houseAlwaysWinsFreeCard = true;
        G._maxRollStreak = 0; // resets so the NEXT trigger needs 2 fresh consecutive max rolls,
                               // not just 1 more — mirrors Gambler's Fallacy's own reset-on-fire
        showMsg('🎰 The House Always Wins — next card is free!');
      }
    } else {
      G._maxRollStreak = 0;
    }
  }

  G.selectedHandIndex = null;
  G.selectedHandKey = null;
  G.turn++;
  G._spellEcho = 0;
  const hasMomentum = G.statuses.player.find(s => s.name === '✨Momentum');
  G._momentumCap = hasMomentum ? 3 : 0;
  G.energy = G.maxEnergy;
  // Ashen Crown — +1 energy on first turn of each combat
  if (hasRelic('ashen_crown') && !G._ashenCrownFired) { G.energy++; G._ashenCrownFired = true; }
  if (G._entrenchActive) { G._entrenchActive = false; } else { G.block = 0; }
  // Start-of-combat Block staged by stageCombatStartBlock() — applied after the reset above so
  // it actually reaches the first turn (see the note there).
  if (G._pendingCombatBlock) { G.block += G._pendingCombatBlock; G._pendingCombatBlock = 0; }
  G._spellsThisTurn = 0;
  G._manaSurge = false; // reset each turn
  // Enemy block persists until player damages through it — does NOT reset each turn
  // Base reroll charge refreshes here, matching the pre-existing per-turn cadence. Steady
  // Hand's bonus charge (G._bonusRerolls) deliberately does NOT refresh — it is granted once at
  // combat start and lasts the whole fight.
  // G.rerollUsed is kept in sync as "no charges left at all" so older call sites still read
  // correctly.
  G.rerollsLeft = rerollAllowance();
  G.rerollUsed = false;
  G.diceRolled = false;
  G._cardsPlayedThisTurn = 0;
  G._shadowMark = 0;
  G._disappearCount = 0;
  G._freeSkillCount = 0;
  G._flyActive = false;
  G._dieSetThisTurn = false;
  G._guaranteedMax = G._guaranteedMax || 0;
  G._minRoll = G._minRoll || (G.charKey === 'gambler' ? 2 : 1);
  G._fallacyCount = G._fallacyCount || 0;
  G._shadowArtistDiscount = 0;
  G._hungerDmgThisTurn = 0;
  G._soulboundTomeFired = false;
  G._firstCardFree = false;

  // Battle Drum (Barbarian) reads LAST turn's roll, so capture it before rollDice() overwrites
  // G.currentDie below. On turn 1 there is no previous roll, so it correctly does nothing.
  const previousRoll = G.currentDie;
  const battleDrumFires = hasCharacterRelic('battle_drum')
    && typeof previousRoll === 'number' && previousRoll % 2 === 1;

  // Use active die
  G.currentDieType = getDie(G.activeDie);
  G.diceMax = G.currentDieType.max;

  // Dice Stabilizer (consumable) — while the lock is up, skip this turn's roll entirely so
  // G.currentDie carries the locked value forward untouched, and spend one of the 2 locked turns.
  // Placed here, after diceMax is set but before the roll, so a Loaded Coat die swap mid-lock
  // still updates diceMax normally; only the roll itself is suppressed.
  //
  // Deliberately does NOT touch G._naturalDieValue. Not re-rolling does not make the held value
  // a forced one, so a locked natural max stays natural for naturalMaxSuppressed() and The House
  // Always Wins — unlike Ley Line Crystal / Gambler's Edge / Second Die, which overwrite
  // G.currentDie and thereby break the stamp on purpose.
  // Reads the COUNTER directly and must NOT use dieLockActive() here: that also reports true for
  // G._dieLockedThisTurn, which still holds LAST turn's value at this point, so the lock would
  // re-arm itself every turn and never expire. dieLockActive() answers "is the die locked right
  // now" for the in-turn gates; only the counter answers "should this turn skip its roll".
  if ((G._diceLockTurnsRemaining || 0) > 0) {
    G._diceLockTurnsRemaining--;
    // Marks THIS turn as a held one, which is what keeps the reroll button and the forced-set
    // guards blocked on the final locked turn — by now the counter above has already reached 0.
    // See dieLockActive().
    G._dieLockedThisTurn = true;
    // The die HAS a value this turn, it simply was not re-rolled. Line ~914 above set
    // G.diceRolled = false and rollDice() is what normally sets it back to true, so without this
    // a locked turn would look un-rolled and useSecondDie() would refuse with "Roll first!".
    G.diceRolled = true;
    // rollDice() repaints #current-die and refreshes the affinity highlight from inside its
    // 400ms animation callback; neither runs now. The value is unchanged, but the highlight,
    // affinity label and the hand's per-card condition states are all re-derived from it by
    // checkAffinityHighlight() -> renderHand(), so do the non-animated equivalent here.
    const dieEl = document.getElementById('current-die');
    if (dieEl) dieEl.textContent = G.currentDie;
    checkAffinityHighlight(G, G.currentDie);
    showMsg(`🔒 Dice Stabilizer — die held at ${G.currentDie} (${G._diceLockTurnsRemaining > 0
      ? G._diceLockTurnsRemaining + ' more locked turn'
      : 'lock ends after this turn'}).`);
  } else {
    G._dieLockedThisTurn = false; // turn-scoped: this turn rolled, so it is not a held one
    rollDice(G, true);
  }

  // Apply die bonus effects after roll
  const activeDieData = getDie(G.activeDie);
  const roll = G.currentDie;
  if (activeDieData.bonus === 'even_energy' && roll % 2 === 0) {
    G.energy = Math.min(G.energy + 1, G.maxEnergy + 1);
    showMsg(activeDieData.emoji + ' Arcane Die — even roll restores 1 energy!');
  }
  // Battle Drum — the extra card is keyed to LAST turn's roll (captured before rollDice above),
  // never to the fresh roll that just landed. Flagged turnStart so the Mage Challenge's
  // extra-draw denial treats it as part of the opening hand rather than a card effect.
  // Applied in both branches below: the Titan's Die max-draw path returns early, and skipping
  // the Drum there would silently drop it on exactly the turns the player rolled max.
  const drawBattleDrum = () => {
    if (!battleDrumFires) return;
    drawCards(G, 1, { turnStart: true });
    showMsg('🥁 Battle Drum — odd roll last turn, +1 card!');
  };

  if (activeDieData.bonus === 'max_draw' && roll === activeDieData.max) {
    drawCards(G, 6 + (G.extraDraw || 0), { turnStart: true });
    drawBattleDrum();
    // Curse of Confusion picks from the hand that was just dealt, so it has to run after every draw
    // this turn — including here, in the Titan's Die max-draw branch that returns early. Same
    // both-branches reason as drawBattleDrum() above.
    applyCurseOfConfusion(G);
    renderAll();
    updateIntent();
    return;
  }

  drawCards(G, (G.startingDrawCount || 5) + (G.extraDraw || 0), { turnStart: true });
  drawBattleDrum();
  applyCurseOfConfusion(G);
  renderAll();
  updateIntent();
}

function rollDice(g, isInitial = false) {
  let roll = Math.floor(Math.random() * g.diceMax) + 1;

  // Guaranteed max from Loaded House
  if (g._guaranteedMax > 0) { roll = g.diceMax; g._guaranteedMax--; }

  // Min roll enforcement (Gambler min 2, House Edge status, d4 Cursed Die min 3)
  let minRoll = g._minRoll || (g.charKey === 'gambler' ? 2 : 1);
  // House Edge — raises the minimum roll this combat (base 3 / + 4). Status-gated so it
  // clears with the exhausted card at combat end instead of leaking via a persistent flag.
  const houseEdge = g.statuses.player.find(s => s.name === '🏠HouseEdge');
  if (houseEdge) minRoll = Math.max(minRoll, houseEdge.stacks === 2 ? 4 : 3);
  if (roll < minRoll) roll = minRoll;

  // d4 Cursed Die bonus — min 3
  const activeDieObj = getDie(g.activeDie);
  if (activeDieObj.bonus === 'min3' && roll < 3) roll = 3;

  // Twinned Die / Fractured Die — initial roll only: roll twice, take higher
  if (isInitial && (hasRelic('twinned_die') || hasRelic('fractured_die'))) {
    let roll2 = Math.floor(Math.random() * g.diceMax) + 1;
    if (roll2 < minRoll) roll2 = minRoll;
    if (roll2 > roll) roll = roll2;
  }

  // Gambler's Fallacy — after N consecutive non-max rolls, force the next roll to max
  // (base 3 / + 2). Status-gated so the streak counter only runs while the card is active
  // this combat; the counter resets whenever the status is absent.
  const fallacy = g.statuses.player.find(s => s.name === '🎯GamblerFallacy');
  if (fallacy) {
    if (roll === g.diceMax) { g._fallacyCount = 0; }
    else {
      g._fallacyCount = (g._fallacyCount || 0) + 1;
      const fallacyThreshold = fallacy.stacks === 2 ? 2 : 3;
      if (g._fallacyCount >= fallacyThreshold) { roll = g.diceMax; g._fallacyCount = 0; }
    }
  } else {
    g._fallacyCount = 0;
  }

  // Midnight Hunger (Vampire) — queued once, at the last possible modifier before the roll is
  // finalized, so it composes with everything above (min-roll, Cursed Die, Twinned Die,
  // Gambler's Fallacy) rather than being overridden by them. Applied via the same formula Second
  // Die uses on its own bonus (Math.min(roll + bonus, diceMax)), but baked in here rather than as
  // a separate post-roll button action — so it becomes part of what checkAffinity() and every
  // other roll-reading call sees as THE roll for the turn, not a later correction. Because Second
  // Die operates on G.currentDie afterward as an entirely separate mechanism, the two compose
  // additively with no special-casing needed.
  if (g._nextRollBonus) {
    roll = Math.min(roll + g._nextRollBonus, g.diceMax);
    g._nextRollBonus = 0; // exactly once — cleared immediately on consumption
  }

  g.currentDie = roll;
  g.diceRolled = true;
  // Stamp the value this die landed on naturally. Gambler's Edge's downside only applies while
  // currentDie still equals this stamp — the moment a card or upgrade forces the die to another
  // value, the two disagree and the roll counts as forced (and so is exempt). See
  // naturalMaxSuppressed().
  g._naturalDieValue = roll;

  // Lucky Coin — affinity exact match draws 1 card (Gambler excluded)
  if (hasRelic('lucky_coin') && g.charKey !== 'gambler') {
    const lcMatch = (g.charKey === 'mage' ? roll === 6 : checkAffinity(g, roll, g.char.diceAffinity))
      && !naturalMaxSuppressed(g, roll);
    if (lcMatch) {
      drawCards(g, 1);
      showMsg('🍀 Lucky Coin — affinity match! Draw 1!');
    }
  }

  // Lucky Streak — max roll draws 1 card + deals 4 dmg
  const luckyStreak = G.statuses.player.find(s => s.name === '⭐LuckyStreak');
if (roll === g.diceMax && luckyStreak && !naturalMaxSuppressed(g, roll)) {
  drawCards(g, 1);
  const dmg = luckyStreak.stacks === 2 ? 6 : 4;
  if (g.enemy) { g.enemy.hp -= dmg; floatDamage('enemy-combatant', dmg, 'dmg'); }
}

  // Vampiric Form — extreme rolls (1 or max face) automatically grant Fly (+ also grants 2 Regen)
  const vampForm = G.statuses.player.find(s => s.name === '🧛VampiricForm');
  if (vampForm) {
    const dieMax = (g.currentDieType && g.currentDieType.max) ? g.currentDieType.max : g.diceMax;
    // Gambler's Edge suppresses the max-face side of the extreme check; a natural 1 still counts.
    const extremeHit = roll === 1 || (roll === dieMax && !naturalMaxSuppressed(g, roll));
    if (extremeHit && !g.statuses.player.find(s => s.name === '🦇Fly')) {
      applyStatus(g, 'player', '🦇Fly', 1);
      if (vampForm.stacks === 2) applyStatus(g, 'player', '💚Regen', 2);
      showMsg('🧛 Vampiric Form — Fly activated!');
    }
  }

  // Animate
  const die = document.getElementById('current-die');
  die.classList.remove('rolling');
  void die.offsetWidth;
  die.classList.add('rolling');
  setTimeout(() => {
    die.textContent = roll;
    die.classList.remove('rolling');
    checkAffinityHighlight(g, roll);
  }, 400);
}

function checkAffinityHighlight(g, roll) {
  const isMatch = checkAffinity(g, roll, g.char.diceAffinity);
  const die = document.getElementById('current-die');
  die.classList.toggle('affinity-match', isMatch);
  const thisDieMax = g.currentDieType ? g.currentDieType.max : g.diceMax;
  let affinityHint = g.char.diceLabel;
  if (g.char.diceAffinity === 'extreme') {
    affinityHint = `Extreme: roll 1 or ${thisDieMax}`;
  }
  const compactAffinityLabels = {
    even: 'Even',
    odd: 'Odd',
    high: 'High',
    gambler: 'd6',
    extreme: 'Edge'
  };
  const affinityLabel = document.getElementById('affinity-label');
  affinityLabel.replaceChildren();
  const affinityPrimary = document.createElement('span');
  affinityPrimary.className = 'affinity-primary';
  affinityPrimary.textContent = compactAffinityLabels[g.char.diceAffinity] || affinityHint;
  const affinityState = document.createElement('span');
  affinityState.className = `affinity-state${isMatch ? ' active' : ''}`;
  affinityState.textContent = '✦';
  affinityLabel.append(affinityPrimary, affinityState);
  document.getElementById('die-type-label').textContent = (g.currentDieType && g.currentDieType.type ? g.currentDieType.type : 'd6');
  renderHand();
}

// Gambler's Edge (Soul upgrade) downside — a NATURAL roll of the die's max face no longer
// counts as an affinity hit for the rest of the run. Forced values are exempt: rollDice()
// stamps _naturalDieValue, so any card/upgrade that changes currentDie afterwards breaks the
// match and the roll counts normally again. Card "Max:" bonus branches are untouched — only
// affinity-max triggers are suppressed.
function naturalMaxSuppressed(g, roll) {
  if (!hasSoulUpgrade('gamblers_edge')) return false;
  const dieMax = (g.currentDieType && g.currentDieType.max) ? g.currentDieType.max : g.diceMax;
  return roll === dieMax && g._naturalDieValue === roll && g.currentDie === roll;
}

// True while the card currently resolving is the first card played this turn.
//
// BUG FIX (Aug 15, 2026): card effects run AFTER playCard() increments G._cardsPlayedThisTurn,
// so by the time an effect executes the counter already includes its own card. Backstab checked
// `(g._cardsPlayedThisTurn || 0) > 0` and therefore rejected itself on every turn of every
// fight, including as the genuine first card. The per-turn reset in startTurn() was never the
// problem. Effects that care about being first MUST use this helper instead of reading the
// counter directly. (Effects that care about a later position — Lethal Rhythm, Soulbound Tome —
// read the counter from inside playCard() before the effect runs, so they are unaffected.)
function isFirstCardThisTurn(g) {
  return (g._cardsPlayedThisTurn || 0) <= 1;
}

// Refund the Energy actually paid for the card currently resolving, for effects that decline to
// resolve. See G._lastCardCostPaid in playCard().
function refundCardCost(g) {
  g.energy += (g._lastCardCostPaid || 0);
}

// Pre-play companion to isFirstCardThisTurn(): true when a card sitting in hand WOULD be the
// first card played this turn if it were played right now. Used by the hand renderer to warn
// before the player commits.
//
// The two differ by exactly one, and the difference is the whole point: playCard() increments
// G._cardsPlayedThisTurn before running effects, so isFirstCardThisTurn() (called from inside an
// effect) sees a counter that already includes its own card, while this one is called while the
// card is still in hand and uncounted. Keep them in step — CARD_PLAY_CONDITIONS in js/data.js
// pairs each hand-side check with the effect-side check it mirrors.
function wouldBeFirstCardThisTurn(g) {
  return (g._cardsPlayedThisTurn || 0) === 0;
}

function checkAffinity(g, roll, affinity) {
  if (roll === null || roll === undefined || !affinity) return false;
  // Aldric Memory Leech — disable affinity for this turn
  if (g.aldricAffinityDisabled) return false;
  if (naturalMaxSuppressed(g, Number(roll))) return false;
  const r = Number(roll);
  if (affinity === 'even') return r % 2 === 0;
  if (affinity === 'odd') return r % 2 !== 0;
  if (affinity === 'high') return r >= 6;
  if (affinity === 'gambler') return true;
  if (affinity === 'extreme') {
    // Use currentDieType max if available, fall back to diceMax
    const thisDieMax = (g.currentDieType && g.currentDieType.max) ? g.currentDieType.max : g.diceMax;
    const hit = r === 1 || r === thisDieMax;
    // Midnight Hunger (Vampire) — single chokepoint, no per-card changes needed. Every extreme
    // check this turn passes through here, including the turn-start auto-roll's own affinity
    // highlight (checkAffinityHighlight -> checkAffinity(g, roll, 'extreme')), which fires even
    // if the player plays no cards at all — so an empty turn is tracked correctly for free.
    // Inherits every existing guard above (aldricAffinityDisabled, naturalMaxSuppressed), so a
    // Gambler's-Edge-forced max roll does NOT count as "hit extreme" here either, consistent
    // with how forced rolls are already excluded from natural-affinity bonuses everywhere else.
    if (hit && hasCharacterRelic('midnight_hunger', g)) g._hitExtremeThisTurn = true;
    return hit;
  }
  return false;
}

function useReroll() {
  // Gambler Challenge — the reroll button is disabled for the fight (renderEnergy), so this is
  // a defensive backstop for any other route into it. Card effects that reroll the die
  // (Risk Taker, Wild Combo) are deliberately NOT denied: they cost a card and Energy, which
  // makes them a different resource from the free per-turn reroll this Challenge removes.
  if (challengeActive(G, 'gambler')) { showMsg('🚫 Challenge — no rerolls this fight.'); return; }
  // Dice Stabilizer — rerolling would defeat the lock the player just paid for. The button is
  // disabled while locked (renderEnergy), so this is the same defensive-backstop shape as the
  // Challenge check above. Card effects that reroll the die (Risk Taker, Wild Combo) are NOT
  // denied here, matching exactly how the Gambler Challenge draws that line.
  if (dieLockActive(G)) { showMsg('🔒 Dice Stabilizer — die is locked, no rerolls.'); return; }
  if (G._noReroll) { showMsg('💔 Fractured Die — no rerolls this run!'); return; }
  if (totalRerollsLeft() <= 0 && !G.aldricInfiniteReroll) return;
  if (!G.aldricInfiniteReroll) {
    // Spend the per-turn charge first, so Steady Hand's single combat-long charge is only
    // consumed once this turn's normal reroll is gone.
    if ((G.rerollsLeft || 0) > 0) {
      G.rerollsLeft -= 1;
    } else {
      G._bonusRerolls = Math.max(0, (G._bonusRerolls || 0) - 1);
      showMsg('✋ Steady Hand — bonus reroll spent (none left this combat).');
    }
    G.rerollUsed = totalRerollsLeft() <= 0;
    if (G.rerollUsed) document.getElementById('reroll-btn').disabled = true;
  }
  renderEnergy(); // refresh the charge counter on the button immediately
  const preRerollValue = G.currentDie;
  rollDice(G, false);
  // Bone Dice — reroll can never land lower than the original roll
  if (hasRelic('bone_dice')) {
    setTimeout(() => {
      if (G.currentDie < preRerollValue) {
        G.currentDie = preRerollValue;
        const die = document.getElementById('current-die');
        if (die) { die.textContent = preRerollValue; checkAffinityHighlight(G, preRerollValue); }
        showMsg('🦴 Bone Dice — held at ' + preRerollValue + '!');
      }
    }, 450);
  }
  if (G.aldricInfiniteReroll) {
    showMsg('🔱 The Sigil — infinite rerolls active!');
  } else {
    showMsg('Reroll used!');
  }
}

// ── Soul upgrade: Second Die — once per combat, optionally add a d2 to the current roll.
// The sum is capped at the die's max face so every existing `roll === diceMax` check and the
// Vampire/Gambler affinity-max checks keep seeing values the dice system already understands.
function useSecondDie() {
  if (!hasSoulUpgrade('second_die')) return;
  if (G._secondDieUsed) { showMsg('Second Die already used this combat!'); return; }
  if (!G.diceRolled) { showMsg('Roll first!'); return; }

  const bonus = Math.floor(Math.random() * 2) + 1; // d2
  const before = G.currentDie || 1;
  G.currentDie = Math.min(before + bonus, G.diceMax);
  G._secondDieUsed = true;

  animateDieTo(G.currentDie);
  showMsg('🎲 Second Die — rolled ' + bonus + (G.currentDie === before
    ? ' (already at max ' + G.diceMax + ')'
    : ' → die is now ' + G.currentDie + '!'));
  renderAll();
}

// ── Soul upgrade: Gambler's Edge — once per combat, force the die to any value.
// Respects the one-forced-value-per-turn rule (G._dieSetThisTurn), same as Loaded Die/Safe Pull.
function openGamblersEdge() {
  if (!hasSoulUpgrade('gamblers_edge')) return;
  if (G._gamblersEdgeUsed) { showMsg("Gambler's Edge already used this combat!"); return; }
  if (G._dieSetThisTurn) { showMsg('Die can only be set once per turn!'); return; }
  // Dice Stabilizer — forcing a value would overwrite the locked one. Checked here AND in
  // applyGamblersEdge() below, mirroring how _dieSetThisTurn is guarded at both points: the
  // picker's buttons hold a direct onclick, so the apply path must stand on its own.
  if (dieLockActive(G)) { showMsg('🔒 Dice Stabilizer — die is locked, cannot set it.'); return; }
  const picker = document.getElementById('gamblers-edge-picker');
  if (!picker) return;
  if (picker.classList.contains('visible')) { picker.classList.remove('visible'); return; }

  picker.innerHTML = '';
  for (let v = 1; v <= G.diceMax; v++) {
    const b = document.createElement('button');
    b.className = 'btn edge-value-btn';
    b.textContent = v;
    b.onclick = () => applyGamblersEdge(v);
    picker.appendChild(b);
  }
  picker.classList.add('visible');
}

function applyGamblersEdge(value) {
  const picker = document.getElementById('gamblers-edge-picker');
  if (picker) picker.classList.remove('visible');
  if (!hasSoulUpgrade('gamblers_edge') || G._gamblersEdgeUsed) return;
  if (G._dieSetThisTurn) { showMsg('Die can only be set once per turn!'); return; }
  if (dieLockActive(G)) { showMsg('🔒 Dice Stabilizer — die is locked, cannot set it.'); return; }

  G.currentDie = Math.max(1, Math.min(value, G.diceMax));
  G._dieSetThisTurn = true;
  G._gamblersEdgeUsed = true;
  animateDieTo(G.currentDie);
  showMsg("♠️ Gambler's Edge — die forced to " + G.currentDie + '!');
  renderAll();
}

// Ley Line Crystal (Mage) — once per combat, force the die to 6, clamped to G.diceMax so it stays
// correct on a d4 (min3 aside, its max face is 4). On any die with max >= 6 (d6 and up, including
// a Hunter's d8) this sets exactly 6, not the die's own max face — those are only the same number
// on a d6. Modeled on applyGamblersEdge(): same G._dieSetThisTurn guard (the one-forced-value-
// per-turn rule), same animateDieTo() finish, but gated on hasCharacterRelic() and a combat-scoped
// used flag instead of a turn-scoped one.
// Consumables — no Energy cost, single-use, click-to-use from the slot row (see
// renderConsumableSlots() in js/ui.js). Defensively safe against any out-of-range index (an
// empty inventory, a stale index after a mid-render race, etc.) rather than assuming the caller
// always passes something valid — "using at 0/3 or with an empty slot does nothing" is enforced
// here, not just by the UI only rendering real items.
function useConsumable(index) {
  if (!G.consumables || index < 0 || index >= G.consumables.length) return;
  const key = G.consumables[index];
  const item = CONSUMABLES[key];
  if (!item) return;
  // Out-of-combat gate. The field inventory already renders these 8 disabled, so this is the same
  // defensive-backstop shape as the Challenge and die-lock checks elsewhere in this file — and it
  // is load-bearing rather than decorative, because an Energy Crystal or Smoke Vial used between
  // rooms would be silently destroyed: there is no turn to spend the Energy on and no enemy to
  // debuff, so the item would vanish for nothing.
  const outOfCombat = !inCombatScreen(G);
  if (outOfCombat && !isUsableOutOfCombat(key)) {
    showMsg(`${item.emoji} ${item.name} can only be used during a fight.`);
    return;
  }
  item.effect(G);
  G.consumables.splice(index, 1);
  if (outOfCombat) {
    // renderAll() is combat-screen machinery (hand, intent, statuses, die). Outside a fight the
    // only things that can have changed are HP, Gold and the inventory itself.
    renderFieldInventory();
    refreshFieldHpDisplays();
    updateHUD();
  } else {
    // renderAll() rather than renderConsumableSlots() alone, because not every effect renders
    // itself: healPlayer()/gainBlock()/applyStatus() do, but drawCards() -> drawCardsInner()
    // deliberately leaves rendering to its caller (playCard() does the same), and the raw
    // g.energy / g.gold writes in Energy Crystal and Gold Pouch have no render of their own.
    // renderAll() is a superset of renderConsumableSlots(), so the slot row still updates.
    renderAll();
  }
}

// Chaos Potion's pool. GDD.md's §12 table abbreviates the effect to "Apply random status to
// enemy", but the raw GDD source names the four exactly — gdd_text.txt:741, "Apply random status
// to all enemies (Poison, Burn, Weak, or Vulnerable)" — so that is what this list is built from.
// Two consequences worth stating, since both look like omissions: enemy '💢Rage' can never come
// up (Rage IS the enemy's Strength buff, so rolling it would make the item help the enemy), and
// Chill is deliberately absent — the design lists Vulnerable in this slot, not Chill.
//
// Stack counts match the dedicated single-status consumables above (Smoke Vial's Weak 2, Fire
// Flask's 4 Burn, Poison Vial's 5 Poison) so Chaos Potion is a random one of those items rather
// than a differently-tuned effect. Vulnerable has no dedicated consumable and no GDD figure, so
// it takes 2 for duration parity with Smoke Vial: Weak and Vulnerable are the mirrored
// 25%-dealt / 50%-taken debuffs and both decay 1 stack per turn, so 2 is "two turns" for either.
const CHAOS_POTION_STATUSES = [
  { name: '☠️Poison',     stacks: 5 },
  { name: '🔥Burn',       stacks: 4 },
  { name: '😵Weak',       stacks: 2 },
  { name: '🫗Vulnerable', stacks: 2 },
];

function applyChaosPotion(g) {
  const pick = CHAOS_POTION_STATUSES[Math.floor(Math.random() * CHAOS_POTION_STATUSES.length)];
  applyStatus(g, 'enemy', pick.name, pick.stacks);
  showMsg(`🌀 Chaos Potion — ${pick.name} ${pick.stacks}!`);
}

// ── Dice Stabilizer (consumable) — "Lock your die at its current result for 2 turns" (GDD §12).
//
// G._diceLockTurnsRemaining counts LOCKED TURNS STILL TO COME, not turns elapsed, and is spent by
// startTurn() (see the block around rollDice there). Using the item mid-turn therefore holds the
// value for the rest of the current turn — no roll happens mid-turn anyway — plus exactly the
// next 2 turns, so the same face is in play for 3 turns total before normal rolling resumes.
//
// Combat-scoped: reset to 0 by all four fight-start functions alongside G._leyLineCrystalUsed, so
// a lock can never leak into the next fight. An UNUSED Dice Stabilizer still sits in
// G.consumables, which is per-run by design.
//
// Undefined-safe on purpose: `undefined > 0` is false, so a run that never uses the item needs no
// initialization anywhere and every lock check reads false.
const DICE_LOCK_TURNS = 2;

// Two fields, because one cannot answer both questions the lock has to answer:
//
//   G._diceLockTurnsRemaining — how many FUTURE turns still have their roll suppressed. Spent by
//                               startTurn(), so it is already decremented while the turn it paid
//                               for is being played.
//   G._dieLockedThisTurn      — whether THE CURRENT turn is a held one. Turn-scoped, rewritten by
//                               every startTurn() (true in the locked branch, false otherwise).
//
// The counter alone is off by one for every "is the die locked right now?" check: on the LAST
// locked turn it has already been decremented to 0, so the reroll button and the forced-set
// guards would all report unlocked on a turn whose roll was in fact suppressed — letting the
// player reroll away the value on the final turn of a lock they paid for. dieLockActive() is
// therefore the OR of the two, and every gate must use it rather than reading either field.
function dieLockActive(g) {
  const s = g || G;
  return (s._diceLockTurnsRemaining || 0) > 0 || !!s._dieLockedThisTurn;
}

// Turns of holding still to come, counting the current one if it is itself locked — what the
// player cares about, and what the reroll button shows. Never reads 0 while the lock is up.
function dieLockTurnsShown(g) {
  const s = g || G;
  return (s._diceLockTurnsRemaining || 0) + (s._dieLockedThisTurn ? 1 : 0);
}

// Re-using while already locked resets the counter to 2 rather than stacking to 4 or being
// refused — a plain assignment is the whole rule. It is never blocked, so the item always does
// something visible and can be spent to extend a good face.
function lockDice(g) {
  const wasLocked = dieLockActive(g);
  g._diceLockTurnsRemaining = DICE_LOCK_TURNS;
  showMsg(wasLocked
    ? `🔒 Dice Stabilizer — lock on ${g.currentDie} refreshed to ${DICE_LOCK_TURNS} turns.`
    : `🔒 Dice Stabilizer — die locked at ${g.currentDie} for ${DICE_LOCK_TURNS} turns.`);
  // No render call needed: useConsumable() ends in renderAll(), which reaches renderEnergy() ->
  // the reroll button and renderSoulDiceControls() -> the Ley Line / Gambler's Edge buttons, so
  // all three blocked controls grey out on the same frame the item is spent.
}

function useLeyLineCrystal() {
  if (!hasCharacterRelic('ley_line_crystal')) return;
  if (G._leyLineCrystalUsed) { showMsg('Ley Line Crystal already used this combat!'); return; }
  if (G._dieSetThisTurn) { showMsg('Die can only be set once per turn!'); return; }
  // Dice Stabilizer — same reasoning as Gambler's Edge: this forces a value, the lock holds one.
  // Checked before G._leyLineCrystalUsed is set, so a blocked attempt does not burn the charge.
  if (dieLockActive(G)) { showMsg('🔒 Dice Stabilizer — die is locked, cannot set it.'); return; }

  G.currentDie = Math.min(6, G.diceMax);
  G._dieSetThisTurn = true;
  G._leyLineCrystalUsed = true;
  animateDieTo(G.currentDie);
  showMsg('🔮 Ley Line Crystal — die forced to ' + G.currentDie + '!');
  renderAll();
}

// Loaded Coat (Gambler) — once per combat, swap the EQUIPPED die (G.activeDie/G.diceMax), not
// just one turn's roll like Ley Line Crystal. Distinct from every other die-manipulating relic
// in this file for that reason: this changes what die the player is playing with for the rest of
// the fight, so it needs a snapshot-and-restore around the whole combat rather than a one-shot
// value force.
function openLoadedCoat() {
  if (!hasCharacterRelic('loaded_coat')) return;
  if (G._loadedCoatUsed) { showMsg('Loaded Coat already used this combat!'); return; }
  const grid = document.getElementById('loaded-coat-grid');
  const overlay = document.getElementById('loaded-coat-overlay');
  if (!grid || !overlay) return;

  grid.innerHTML = '';
  Object.values(DICE_TYPES).forEach(dieOpt => {
    const isCurrent = dieOpt.type === G.activeDie;
    const el = document.createElement('div');
    el.className = 'loaded-coat-tile' + (isCurrent ? ' current' : '');
    el.innerHTML = `
      <span class="loaded-coat-tile-emoji">${dieOpt.emoji}</span>
      <div class="loaded-coat-tile-name">${dieOpt.name}</div>
      <div class="loaded-coat-tile-range">Rolls 1–${dieOpt.max}${isCurrent ? ' (current)' : ''}</div>
      <div class="loaded-coat-tile-desc">${dieOpt.desc}</div>
    `;
    if (!isCurrent) el.onclick = () => applyLoadedCoat(dieOpt.type);
    grid.appendChild(el);
  });
  overlay.classList.add('visible');
}

function cancelLoadedCoat() {
  const overlay = document.getElementById('loaded-coat-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function applyLoadedCoat(dieType) {
  const dieOpt = getDie(dieType);
  // Snapshot the PRE-swap equipped die exactly once — the moment this fires is also the moment
  // G.activeDie/G.diceMax still hold the player's real, persistent choice, since nothing else in
  // this codebase mutates them mid-combat. Restored by restoreLoadedCoatDie() at the true end of
  // this combat (checkCombatEnd()), never on an Aldric phase transition — see that function.
  G._loadedCoatSnapshot = { activeDie: G.activeDie, diceMax: G.diceMax };
  G.activeDie = dieOpt.type;
  G.diceMax = dieOpt.max;
  G._loadedCoatUsed = true;
  cancelLoadedCoat();
  showMsg('🧥 Loaded Coat — swapped to ' + dieOpt.emoji + ' ' + dieOpt.name + ' for this fight!');
  renderAll();
}

// Restores the die snapshotted by applyLoadedCoat(), if any. A no-op when nothing was swapped
// this combat. Called from checkCombatEnd() at every point that represents the fight GENUINELY
// ending (win, loss) — deliberately NOT on an Aldric phase transition, since Phase 1 -> 2 -> 3
// is still the same combat and a Loaded Coat swap should survive across those.
function restoreLoadedCoatDie() {
  if (!G._loadedCoatSnapshot) return;
  G.activeDie = G._loadedCoatSnapshot.activeDie;
  G.diceMax = G._loadedCoatSnapshot.diceMax;
  G._loadedCoatSnapshot = null;
}

// Shared die-face animation used by the Soul dice upgrades (same shape the dice cards use).
function animateDieTo(value) {
  const dieEl = document.getElementById('current-die');
  if (!dieEl) { checkAffinityHighlight(G, value); return; }
  dieEl.classList.remove('rolling');
  void dieEl.offsetWidth;
  dieEl.classList.add('rolling');
  setTimeout(() => {
    dieEl.textContent = value;
    dieEl.classList.remove('rolling');
    checkAffinityHighlight(G, value);
  }, 200);
}

function doubleDown(g) {
  const flip = Math.random() < 0.5;
  if (flip) {
    g.currentDie = Math.min(g.currentDie * 2, g.diceMax);
    showMsg(`Double Down! Roll doubled to ${g.currentDie}!`);
  } else {
    g.currentDie = 1;
    showMsg('Double Down! Roll dropped to 1!');
  }
  checkAffinityHighlight(g, g.currentDie);
  renderHand();
}

// Energy a card will ACTUALLY cost if played right now, including every discount.
// Single source of truth for the cost, because it is read in two places that must agree:
// playCard() charges it, and renderHand() prints it on the card tile and in the mobile
// preview. renderHand() previously reproduced only the Mana Surge branch, so a card made
// free by Soulbound Gauntlet or Shadow Artist displayed its printed cost — and, worse, the
// same figure feeds `canPlay`, so a genuinely free card was greyed out as unaffordable and
// could not be played at all. Follows the calculatePlayerAttackDamage(g, amount, {consume})
// pattern already used for damage: callers that only want to display pass nothing, and
// playCard() passes { consume: true } to spend the one-shot discounts.
function getCardEnergyCost(g, cardKey, options = {}) {
  const card = CARDS[cardKey];
  if (!card) return 0;
  const consume = !!options.consume;
  let cost = card.cost;

  // ── Curse surcharges, applied to the BASE cost before every modifier below ──
  //
  // Position is deliberate and load-bearing. Three of the modifiers below (Soulbound Gauntlet,
  // The House Always Wins, Shadow Artist) are hard overrides to 0, not discounts. Taxing AFTER them
  // would let a surcharge resurrect a card the game had just promised was free — a "next card free"
  // effect would hand back a card costing 2. Taxing first means the tax is simply part of what the
  // card costs, and every discount and free-card effect then applies on top, unchanged.
  //
  // It also matters for Mana Surge's floored -1: a 0-cost card taxed to 2 becomes 1 (tax first),
  // where taxing afterwards would waste the discount on the floor and leave it at 2.
  //
  // Keys normalized the same way CARD_PLAY_CONDITIONS is, so a '+' upgrade inherits the surcharge
  // and the player cannot upgrade their way out of a permanent curse.
  const baseKey = String(cardKey).replace(/\+$/, '');
  cost += (g.cursedCardCosts && g.cursedCardCosts[baseKey]) || 0;
  // Curse of Confusion — this turn's single taxed card. Turn-scoped, re-picked by startTurn().
  if (g._confusedCardKey && g._confusedCardKey === baseKey) cost += CURSE_CONFUSION_TAX;

  // Mana Surge — the next card played after it costs 1 less
  if (g._manaSurge && cardKey !== 'manasurge') {
    cost = Math.max(0, cost - 1);
    if (consume) g._manaSurge = false;
  }
  // Soulbound Gauntlet — first card each turn costs 0
  if (!g._firstCardFree && hasRelic('soulbound_gauntlet')) {
    cost = 0;
    if (consume) g._firstCardFree = true;
  }
  // The House Always Wins (Gambler) — queued by two consecutive max rolls (see startTurn()),
  // consumed by exactly one card the same way Mana Surge is consumed above: a hard override to
  // 0, not a stacking discount, matching Soulbound Gauntlet's own "next card free" pattern.
  if (g._houseAlwaysWinsFreeCard) {
    cost = 0;
    if (consume) g._houseAlwaysWinsFreeCard = false;
  }
  // Shadow Artist (base, stacks 1) — the 2nd and 4th card played each turn cost 0.
  // (The + version uses the _shadowArtistDiscount counter instead — see playCard below.)
  const shadowArtistBase = g.statuses.player.find(s => s.name === '🎭ShadowArtist' && s.stacks === 1);
  if (shadowArtistBase) {
    const cardNumber = (g._cardsPlayedThisTurn || 0) + 1;
    if (cardNumber === 2 || cardNumber === 4) cost = 0;
  }
  return cost;
}

function playCard(cardKey) {
  const card = CARDS[cardKey];
  if (!card) return;

  // Hard-blocked cards (CARD_PLAY_CONDITIONS entries flagged `hard`, i.e. the three unplayable
  // Curses) are refused outright. renderHand() already dims them, but that indicator is documented
  // as a warning only, so without this the tap would go through: the play would be counted, the
  // Energy spent, and a Curse's flavour-text effect() would run as if it had done something.
  //
  // MUST stay above the getCardEnergyCost({consume:true}) call below. That call spends the one-shot
  // discounts — Mana Surge, Soulbound Gauntlet's free card, The House Always Wins' free card — so
  // refusing after it would let a mis-tap on an unplayable Curse silently burn a queued free card.
  if (isHardBlocked(G, cardKey)) {
    showMsg(`🚫 ${card.name} — ${getCardBlockReason(G, cardKey)}`);
    return;
  }

  // The only place a card's key is recorded anywhere G is reachable from. dealDamage() has no
  // cardKey parameter — threading one through every card effect's dealDamage(g,'enemy',...) call
  // (30+ sites in data.js) to support one relic's card-exclusion list would be exactly the
  // per-card churn that relic hooks in this codebase are built to avoid. This single assignment
  // is what Crimson Lens reads to skip Drain Life/Soul Rend (see dealDamage()). Safe for
  // multi-hit cards and Spell Echo repeats — both re-invoke the SAME card's effect(), so the key
  // never changes mid-resolution; JS's single-threaded execution means it cannot go stale between
  // this line and any dealDamage() call the effect makes before returning.
  G._currentCardKey = cardKey;

  // Consumes the one-shot discounts before the affordability check below, which is the
  // pre-existing order — deliberately unchanged here so this stays a refactor.
  var actualCost = getCardEnergyCost(G, cardKey, { consume: true });

  if (G.energy < actualCost) { showMsg('Not enough energy!'); return; }
  if (!G.enemy && card.type === 'Attack') { showMsg('No enemy to attack!'); return; }

  G.energy -= actualCost;
  // Energy actually paid for the card currently resolving. An effect that refuses to resolve
  // (Backstab played out of position) must refund THIS, not the card's printed cost — with
  // Shadow Artist or Mana Surge the two differ, and refunding the printed cost minted Energy.
  G._lastCardCostPaid = actualCost;
  G._cardsPlayedThisTurn = (G._cardsPlayedThisTurn || 0) + 1;
  G.cardsPlayedThisCombat = (G.cardsPlayedThisCombat || 0) + 1;
  // Gilded Quill — every 10th card played deals double damage
  if (G.cardsPlayedThisCombat % 10 === 0 && hasRelic('gilded_quill')) G._gildedQuillActive = true;
  // Soulbound Tome — playing 3+ cards in a turn grants 1 energy (once per turn)
  if (G._cardsPlayedThisTurn === 3 && hasRelic('soulbound_tome') && !G._soulboundTomeFired) {
    G.energy++;
    G._soulboundTomeFired = true;
    showMsg('📚 Soulbound Tome — +1 Energy!');
  }
  // Lethal Rhythm — every 2 cards played this turn deals direct dmg to the enemy (base 3 / + 5)
  const lethalRhythm = G.statuses.player.find(s => s.name === '🥁LethalRhythm');
  if (lethalRhythm && G.enemy && G._cardsPlayedThisTurn % 2 === 0) {
    const rhythmDmg = lethalRhythm.stacks === 2 ? 5 : 3;
    G.enemy.hp -= rhythmDmg;
    floatDamage('enemy-combatant', rhythmDmg, 'dmg');
    showMsg('🥁 Lethal Rhythm — ' + rhythmDmg + ' dmg!');
  }

// Shadow Mark bonus
if (G._shadowMark > 0 && card.type === 'Attack') {
  G.enemy.hp -= G._shadowMark;
  floatDamage('enemy-combatant', G._shadowMark, 'dmg');
  G._shadowMark = 0;
}
if (G._shadowArtistDiscount > 0) { actualCost = Math.max(0, actualCost - 1); G._shadowArtistDiscount--; }
// Disappear free card
if (G._disappearCount > 0 && cardKey !== 'disappear') {
  G.energy += actualCost;
  G._disappearCount--;
}
// Cursed Veins — next Skill card free
if (G._freeSkillCount > 0 && card.type === 'Skill' && cardKey !== 'cursedveins' && cardKey !== 'cursedveins+') {
  G.energy += actualCost;
  G._freeSkillCount--;
}

  if (card.type === 'Skill' || card.type === 'Power') G._spellsThisTurn = (G._spellsThisTurn || 0) + 1;
if (G._arcaneMomentum && G._momentumCap > 0 && (card.type === 'Skill' || card.type === 'Power')) {
  G.currentDie = Math.min(G.currentDie + 1, G.diceMax);
  G._momentumCap--;
  const dieEl = document.getElementById('current-die');
  if (dieEl) {
    dieEl.classList.remove('rolling');
    void dieEl.offsetWidth;
    dieEl.classList.add('rolling');
    setTimeout(() => {
      dieEl.textContent = G.currentDie;
      dieEl.classList.remove('rolling');
      checkAffinityHighlight(G, G.currentDie);
    }, 200);
  }
}
  const roll = G.currentDie || 1;

  // Remove the played card from hand BEFORE its effect resolves. Otherwise it still occupies
  // a hand slot while the effect runs, so any drawCards() inside the effect sees an inflated
  // G.hand.length and can hit the maxHandSize cap early (e.g. Blood Price drew 0 at a full hand).
  // The card is NOT put in a pile yet — deferring the discard until after the effect means a
  // mid-effect reshuffle (drawCards shuffling discard→draw) can't draw the played card back.
  const idx = G.hand.indexOf(cardKey);
  if (idx >= 0) G.hand.splice(idx, 1);

  // Most Exhaust cards push their own key onto G.exhaustedPile inside effect() (js/data.js).
  // Record how many copies of THIS key are already exhausted so the placement step below can
  // tell whether the effect exhausted the card itself — counting by key rather than by total
  // length so a second copy of the same card played later in the combat is still handled.
  const exhaustedBefore = (G.exhaustedPile || []).filter(k => k === cardKey).length;

  card.effect(G, roll);

  // Spell Echo — repeat Attack effect
if (card.type === 'Attack' && G._spellEcho > 0) {
  G._spellEcho--;
  card.effect(G, roll);
  showMsg('🔮 Spell Echo — attack triggered twice!');
}
// Warlord's Bandage (Barbarian) — Attack cards only, on an odd roll. Placed here, after the card
// has resolved, and reading the same `roll` + checkAffinity() the card's own effect used, so the
// heal can never disagree with the affinity the player was shown. Skills and Powers never
// qualify whatever the roll. Fires once per play, not once per Spell Echo repeat.
if (card.type === 'Attack' && checkAffinity(G, roll, 'odd') && hasCharacterRelic('warlords_bandage')) {
  healPlayer(G, 4);
  showMsg("🩸 Warlord's Bandage — odd-roll Attack, +4 HP!");
}

// Stone Grimoire / Frost Seal (Mage) — both gate on `card.affinityBonus === 'high'`, which is
// exactly the set of Mage cards whose effect scales with a high roll (verified against the full
// Mage reward pool: every card is either dice:false with no roll-scaling at all — Mana Surge,
// Arcane Boost, Void Channel, Blizzard, Arcane Momentum, Soul Steal, Iron Wall, Cursed Reroll,
// Cold Mastery, Burning Soul — or dice:true with affinityBonus:'high'; there is no third
// category). This is "cast a spell" for these two relics specifically: it cleanly excludes
// Strike/Defend (no affinityBonus) and every Power, with no card-list to maintain.
if (card.affinityBonus === 'high') {
  // Stone Grimoire — flat Block on every spell cast, independent of the roll. No checkAffinity()
  // call at all, matching "regardless of roll" in the description.
  if (hasCharacterRelic('stone_grimoire')) {
    gainBlock(G, 'player', 4);
    showMsg('📖 Stone Grimoire — +4 Block!');
  }
  // Frost Seal — fires on roll <= 3, which is disjoint from the card's own High bonus (roll >= 6
  // per checkAffinity()'s 'high' branch). Rolls 4-5 trigger neither the card's bonus nor this
  // relic; that gap is the card's own design, not something this relic is meant to close.
  if (roll <= 3 && hasCharacterRelic('frost_seal')) {
    applyStatus(G, 'enemy', '❄️Chill', 1);
    showMsg('🧊 Frost Seal — low roll, +1 Chill!');
  }
}
if (G.statuses.player.find(s => s.name === '👑BloodLord') && card.type === 'Attack') {
  const lordStacks = G.statuses.player.find(s => s.name === '👑BloodLord');
  const healAmt = lordStacks.stacks === 2 ? 3 : 2; // + version heals 3, base heals 2
  healPlayer(G, healAmt);
}
  // Gambler lucky streak — max roll refreshes the reroll (suppressed by Gambler's Edge on a
  // natural max, since that is the Gambler's affinity maximum)
  if (G.charKey === 'gambler' && roll === G.diceMax && !G.rerollUsed && !naturalMaxSuppressed(G, roll)) {
    showMsg('Lucky Streak! Bonus reroll!');
    G.rerollsLeft = Math.max(G.rerollsLeft || 0, 1);
    G.rerollUsed = false;
    setTimeout(() => {
      const btn = document.getElementById('reroll-btn');
      if (btn) btn.disabled = false;
      renderEnergy();
    }, 100);
  }

  // Send the played card to its pile AFTER the effect resolves (see note above).
  //
  // Cards are string KEYS and G.deck is the persistent master list: playing a card does not
  // remove it from G.deck, and neither does exhausting it. G.exhaustedPile is purely a
  // this-combat exclusion list (see shuffleDeck / drawCards), which is why it must never be
  // pushed back into G.deck at combat end.
  //
  // A card lands in exactly ONE pile. Previously a Power that exhausted itself inside effect()
  // was pushed a second time here (2 entries per play), and a self-exhausting Skill/Attack
  // (Spell Echo, Jackpot, Betting It All, Loaded House) went into the exhausted pile AND the
  // discard pile — so it could be redrawn during the very combat it "exhausted".
  if (idx >= 0) {
    if (!G.exhaustedPile) G.exhaustedPile = [];
    const exhaustedNow = G.exhaustedPile.filter(k => k === cardKey).length;
    if (exhaustedNow > exhaustedBefore) {
      // effect() already exhausted this card. Trim any surplus entries in case the effect ran
      // more than once (Spell Echo repeats an Attack's effect) — one play, one entry.
      let surplus = exhaustedNow - (exhaustedBefore + 1);
      while (surplus-- > 0) G.exhaustedPile.splice(G.exhaustedPile.lastIndexOf(cardKey), 1);
    } else if (card.type === 'Power') {
      // Powers always Exhaust, including any whose effect() does not place them itself.
      G.exhaustedPile.push(cardKey);
    } else {
      G.discardPile.push(cardKey);
    }
  }

  renderAll();
  checkCombatEnd();
}

function endTurn() {
  if (!G.enemy) return;
  const e = G.enemy;

  // ── STEP 1: Burn ticks BEFORE enemy acts ──
  const burn = G.statuses.enemy.find(s => s.name === '🔥Burn');
  if (burn) {
    // Burning Soul — Burn deals extra dmg per stack (base +1 / + +2) on top of the 1:1 base
    const burningSoul = G.statuses.player.find(s => s.name === '🔥BurningSoul');
    const burnDmg = burn.stacks + (burningSoul ? burn.stacks * (burningSoul.stacks === 2 ? 2 : 1) : 0);
    G.enemy.hp -= burnDmg;
    floatDamage('enemy-combatant', burnDmg, 'dmg');
    burn.stacks--;
    if (burn.stacks <= 0) G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '🔥Burn');
  }

  // ── STEP 2: Vulnerable ticks down ──
  const vuln = G.statuses.enemy.find(s => s.name === '🫗Vulnerable');
  if (vuln) {
    vuln.stacks--;
    if (vuln.stacks <= 0) G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '🫗Vulnerable');
  }

  // ── STEP 2b: PLAYER Weak ticks down (1 stack per turn, like Vulnerable) ──
  // Player Weak reduces the player's own attacks, which already happened this turn, so it ticks
  // here. ENEMY Weak reduces the enemy's attack in STEP 6 and therefore ticks in STEP 6b, after
  // the attack it is meant to weaken — see the note there.
  const playerWeak = G.statuses.player.find(s => s.name === '😵Weak');
  if (playerWeak) {
    playerWeak.stacks--;
    if (playerWeak.stacks <= 0) G.statuses.player = G.statuses.player.filter(s => s.name !== '😵Weak');
  }

  // ── STEP 3: Regen ticks ──
  const regen = G.statuses.player.find(s => s.name === '💚Regen');
  if (regen) {
    healPlayer(G, regen.stacks);
    const eternalHunger = G.statuses.player.find(s => s.name === '🦷EternalHunger');
    if (eternalHunger && G.enemy && G._hungerDmgThisTurn < 15) {
      const dmg = Math.min(regen.stacks * 2, 15 - G._hungerDmgThisTurn);
      G.enemy.hp -= dmg;
      floatDamage('enemy-combatant', dmg, 'dmg');
      G._hungerDmgThisTurn += dmg;
    }
    regen.stacks--;
    if (regen.stacks <= 0) G.statuses.player = G.statuses.player.filter(s => s.name !== '💚Regen');
  }

  renderAll();

  // ── STEP 4: Check if enemy died from Burn/Regen ──
  if (G.enemy.hp <= 0) {
    G.discardPile.push(...G.hand);
    G.hand = [];
    renderAll();
    checkCombatEnd();
    return;
  }

  // ── STEP 5: Trigger turn-start special abilities BEFORE enemy acts ──
  if (G.enemy && G.enemy.special) {
    G.enemy.turnCount = (G.enemy.turnCount || 0) + 1;
    const sp = G.enemy.special;
    try {
      if (sp.trigger === 'turn') {
        if (sp.name === 'Iron Stance' || sp.name === 'Shield Up' || sp.name === 'Bone Wall') {
          G.enemy.block = 0;
        }
        sp.effect(G, G.enemy.turnCount);
      }
      if (sp.trigger === 'immune') sp.effect(G);
    } catch(err) { console.log('special ability error', err); }
  }

  // Escalation Challenges tick alongside the enemy's own turn abilities, so they share the
  // same "before the enemy acts" timing. Outside the try above because a Challenge misfiring
  // should surface, not be swallowed with the data-driven specials.
  tickChallengeEscalation(G);

  // The Vampire drain can be lethal — resolve the loss now rather than letting the enemy
  // also act on a player who is already dead.
  if (G.hp <= 0) { checkCombatEnd(); return; }

  renderAll();

// ── STEP 6: Enemy acts ──
  if (G.enemy && G.enemy.isAldric) {
    processAldricTurn();
  } else if (G.enemy && G.enemy.isSirCrimson && G.turn % 3 === 0) {
    // Echo (GDD §5) — every 3rd turn from fight start, Sir Crimson mimics a card pulled from the
    // player's own deck instead of his regular rotation move. Checked BEFORE the generic .moves
    // branch below (Sir Crimson has .moves too) so this takes priority on Echo turns specifically;
    // resolveMoveTurn() never runs this turn, and _moveIndex is deliberately left untouched here
    // (see STEP 10's matching check) so the paused move resumes on the very next turn.
    resolveSirCrimsonEcho(G);
  } else if (G.enemy && G.enemy.moves && G.enemy.moves.length) {
    // Generic multi-move rotation (any boss with a `moves` array) — see resolveMoveTurn(). Takes
    // priority over the flat intent branches below, which stay untouched for every enemy/boss
    // that has no `moves` array (i.e. everything currently in the game).
    resolveMoveTurn(G, G.enemy.moves[G.enemy._moveIndex || 0]);
  } else if (e.intent === 'attack') {
    // Steps 1-2: base damage + enemy modifiers (Rage adds Strength, Weak and Chill reduce).
    // Shared with updateIntent() so the displayed intent matches what lands here.
    const dmg = enemyAttackDamage(G, true);
    // Steps 3-6: Fly → Block → HP → on-HP-loss effects, via the shared pipeline.
    resolveEnemyAttack(G, dmg);
  } else if (e.intent === 'defend') {
    G.enemy.block += 8;
  }

  // ── STEP 6b: statuses that modify the ENEMY'S ATTACK tick down, AFTER the enemy has acted ──
  // Deliberately not in STEP 2b. Both of these are read during STEP 6 of this same endTurn(), so
  // ticking them earlier would strip a 1-stack application before the very attack it was meant
  // to affect, making those statuses useless on the turn they land.
  //   • enemy Weak      — reduces the enemy's outgoing attack (see enemyAttackDamage)
  //   • player Vulnerable — increases the damage that attack deals (see applyPlayerVulnerable)
  // Player Weak stays in STEP 2b because it modifies the PLAYER'S attacks, which already
  // resolved during the player's own turn.
  // Both tick every turn per their tooltips, including defend turns, unlike Chill.
  const enemyWeak = G.statuses.enemy.find(s => s.name === '😵Weak');
  if (enemyWeak) {
    enemyWeak.stacks--;
    if (enemyWeak.stacks <= 0) G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '😵Weak');
  }
  // Cursed Hound's rabid bite applies this in STEP 9, after this tick, so a freshly applied
  // stack survives to amplify next turn's attack rather than being consumed on arrival.
  const playerVuln = G.statuses.player.find(s => s.name === '🫗Vulnerable');
  if (playerVuln) {
    playerVuln.stacks--;
    if (playerVuln.stacks <= 0) G.statuses.player = G.statuses.player.filter(s => s.name !== '🫗Vulnerable');
  }

  // ── STEP 7: Poison ticks AFTER enemy acts ──
  const poison = G.statuses.enemy.find(s => s.name === '☠️Poison');
  if (poison) {
    // Poison Master — Poison deals extra dmg per stack (base +1 / + +2) on top of the 1:1 base
    const poisonMaster = G.statuses.player.find(s => s.name === '☠️PoisonMaster');
    // Venomfang (Thief) — flat +1 to the whole tick, not a per-stack multiplier like Poison
    // Master, so the two sum rather than compound: holding both adds Venomfang's flat 1 on top
    // of whatever Poison Master's per-stack scaling already produced.
    const venomfangBonus = hasCharacterRelic('venomfang') ? 1 : 0;
    const poisonDmg = poison.stacks + (poisonMaster ? poison.stacks * (poisonMaster.stacks === 2 ? 2 : 1) : 0) + venomfangBonus;
    G.enemy.hp -= poisonDmg;
    floatDamage('enemy-combatant', poisonDmg, 'dmg');
    poison.stacks--;
    if (poison.stacks <= 0) G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '☠️Poison');
  }

  // ── STEP 8: Check if enemy died from Poison ──
  if (G.enemy && G.enemy.hp <= 0) {
    G.discardPile.push(...G.hand);
    G.hand = [];
    renderAll();
    checkCombatEnd();
    return;
  }

  // ── STEP 9: Trigger post-attack special abilities ──
  if (G.enemy && G.enemy.special) {
    const sp = G.enemy.special;
    try {
      if (sp.trigger === 'attack' && G.enemy.intent === 'attack') sp.effect(G);
      if (sp.trigger === 'hp') sp.effect(G);
    } catch(err) { console.log('special ability error', err); }
  }

  // ── STEP 10: Alternate enemy intent for next turn ──
  if (G.enemy && G.enemy.isSirCrimson && G.enemy.moves && G.enemy.moves.length) {
    const len = G.enemy.moves.length;
    if (G.turn % 3 === 0) {
      // THIS turn (just ending) was itself an Echo turn — STEP 6 skipped moves[_moveIndex]
      // rather than executing it, so it is still due. Don't advance past it; preview the same
      // move again for next turn (this is the resume, one turn later than it would otherwise
      // have played).
      G.enemy.intent = G.enemy.moves[G.enemy._moveIndex || 0].type;
    } else {
      // Normal turn — advance to the move now due, exactly like the generic engine below.
      G.enemy._moveIndex = ((G.enemy._moveIndex || 0) + 1) % len;
      if ((G.turn + 1) % 3 === 0) {
        // The UPCOMING turn will be an Echo turn — this is telegraph-time: pick the mimicked
        // card now, once, and store it. Nothing re-picks it before STEP 6 resolves it. The index
        // just advanced above stays pointed at the move that would otherwise play next turn —
        // it simply waits one extra turn while Echo runs, then resumes via the branch above.
        G.enemy._echoPick = pickSirCrimsonEchoCard(G); // null only if the deck has zero compatible cards
        G.enemy.intent = 'echo';
      } else {
        G.enemy.intent = G.enemy.moves[G.enemy._moveIndex].type;
      }
    }
  } else if (G.enemy && G.enemy.moves && G.enemy.moves.length) {
    // Fixed-cycle rotation, not weighted-random — advance once, wrap at the end of the array.
    // G.enemy.intent is set to the move's own type purely for any code that inspects it
    // generically (debug tooling, etc.); updateIntent() and STEP 6 above both read
    // G.enemy.moves[_moveIndex] directly and never depend on this string for a moves-bearing
    // enemy, so a future move-type string can't drift out of sync with what this shows/does.
    G.enemy._moveIndex = ((G.enemy._moveIndex || 0) + 1) % G.enemy.moves.length;
    G.enemy.intent = G.enemy.moves[G.enemy._moveIndex].type;
  } else {
    G.enemy.intent = Math.random() < 0.65 ? 'attack' : 'defend';
  }

  // ── STEP 11: Discard hand, check end, start next turn ──
  // Fly is a one-turn buff: clear any leftover (e.g. the enemy defended and never triggered it)
  G.statuses.player = G.statuses.player.filter(s => s.name !== '🦇Fly');
  G.discardPile.push(...G.hand);
  G.hand = [];

  renderAll();
  checkCombatEnd();

  if (G.hp <= 0) return;
  setTimeout(startTurn, 300);
}
function animateSpriteAttack(attackerEl, direction = 'right') {
  const sprite = attackerEl?.querySelector('.combatant-sprite');
  if (!sprite) return;

  const cls = direction === 'right' ? 'attack-lunge-left' : 'attack-lunge-right';
  sprite.classList.remove('attack-lunge-left', 'attack-lunge-right');
  void sprite.offsetWidth;
  sprite.classList.add(cls);

  setTimeout(() => {
    sprite.classList.remove(cls);
  }, 300);
}

function animateHit(targetEl) {
  if (!targetEl) return;

  targetEl.classList.remove('hit-flash');
  void targetEl.offsetWidth;
  targetEl.classList.add('hit-flash');

  setTimeout(() => {
    targetEl.classList.remove('hit-flash');
  }, 250);
}

function spawnSlashVFX(targetEl) {
  const layer = document.getElementById('combat-vfx-layer');
  if (!layer || !targetEl) return;

  const rect = targetEl.getBoundingClientRect();
  const arenaRect = layer.getBoundingClientRect();

  const slash = document.createElement('div');
  slash.className = 'slash-vfx';
  slash.style.left = `${rect.left - arenaRect.left + rect.width * 0.15}px`;
  slash.style.top = `${rect.top - arenaRect.top + rect.height * 0.35}px`;

  layer.appendChild(slash);
  setTimeout(() => slash.remove(), 250);
}

function playAttackAnimation({ attackerEl, targetEl, style = 'slash' }) {
  const attackerIsPlayer = attackerEl?.id === 'player-combatant';
  const direction = attackerIsPlayer ? 'right' : 'left';

  animateSpriteAttack(attackerEl, direction);

  if (style === 'slash') {
    setTimeout(() => spawnSlashVFX(targetEl), 90);
    setTimeout(() => animateHit(targetEl), 120);
  }
}

function calculatePlayerAttackDamage(g, amount, options = {}) {
  const consume = !!options.consume;
  const enemyStatuses = (g.statuses && g.statuses.enemy) || [];

  // Phantom Blade — first attack this combat deals +8
  if (!g.phantomBladeFired && hasRelic('phantom_blade')) {
    amount += 8;
    if (consume) g.phantomBladeFired = true;
  }
  // Apply player Strength/Rage bonus to all attacks
  const playerRage = g.statuses.player.find(s => s.name === '💢Rage');
  if (playerRage && playerRage.stacks > 0) {
    amount += playerRage.stacks;
  }
  // Devil's Ledger (Gambler) — recalculated live from the running total every time, rather than
  // its own separately-tracked stack count, so it can never drift out of sync with actual Gold
  // spent (no increment to forget, no state that could desync from G.goldSpentThisRun). Placed
  // beside Rage, not after Weak/Vulnerable below, so it composes the same way Rage already does —
  // a flat term that Weak's 25% reduction and Vulnerable's 50% increase both apply to afterward,
  // rather than bypassing them.
  if (hasCharacterRelic('devils_ledger', g)) {
    amount += Math.min(8, Math.floor((g.goldSpentThisRun || 0) / 20));
  }
  // d8 Hunter's Die: odd rolls deal +2 bonus damage
  const activeDieBonus = getDie(g.activeDie);
  if (activeDieBonus.bonus === 'odd_dmg' && g.currentDie && g.currentDie % 2 !== 0) {
    amount += 2;
  }
  // Apply Weak — player deals 25% less damage
  // Note: Weak does NOT decay here. Like Vulnerable, it ticks down by exactly
  // 1 stack once at end of turn (see endTurn), independent of hit/card count.
  const playerWeak = g.statuses.player.find(s => s.name === '😵Weak');
  if (playerWeak && playerWeak.stacks > 0) {
    amount = Math.floor(amount * 0.75);
  }
  // Also apply Vulnerable — enemy takes 50% more damage
  const enemyVuln = enemyStatuses.find(s => s.name === '🫗Vulnerable' || s.name === 'Vulnerable' || String(s.name).includes('Vulnerable'));
  if (enemyVuln && enemyVuln.stacks > 0) {
    amount = Math.floor(amount * 1.5);
  }
  // Pale Contract — all player attacks deal +4 damage
  if (hasRelic('pale_contract')) amount += 4;
  // Assassin's Edge (Thief) — every 4th card played THIS TURN deals double damage. Deliberately
  // NOT a consumed flag like Gilded Quill just below: G._cardsPlayedThisTurn is incremented
  // before card.effect() runs and does not change again until the next card is played (see the
  // Aug 15, 2026 fix note on playCard()), so reading it fresh on every dealDamage() call is what
  // makes a multi-hit 4th-card Attack (or a Spell Echo repeat) double EVERY hit rather than only
  // the first — a one-shot consumed flag here would silently under-double those. Safe against
  // leaking into end-of-turn DoT: Burn/Poison ticks subtract g.enemy.hp directly and never call
  // dealDamage(), so this can only fire while the qualifying card's own effect is resolving.
  if (hasCharacterRelic('assassins_edge', g) && (g._cardsPlayedThisTurn || 0) % 4 === 0) {
    amount *= 2;
  }
  // Gilded Quill — 10th card played this combat deals double damage
  if (g._gildedQuillActive) {
    amount *= 2;
    if (consume) {
      g._gildedQuillActive = false;
      showMsg('🪶 Gilded Quill — double damage!');
    }
  }

  return amount;
}

// `source` (player target only): 'enemy' = enemy-direct damage → routes through the shared
// resolveEnemyAttack pipeline so Fly halves it; 'self'/omitted = self-inflicted, environmental,
// or DoT damage → no Fly (the safer default). Berserker's Oath + survival still fire via loseHP.
// `bypassBlock` (only meaningful with source 'enemy') sends the damage straight to HP, skipping
// Block — opt-in per attack (e.g. Collapse, whose damage equals your Block).
function dealDamage(g, target, amount, source, bypassBlock) {
  const playerEl = document.getElementById('player-combatant');
  const enemyEl = document.getElementById('enemy-combatant');

  if (target === 'enemy' && g.enemy) {
    amount = calculatePlayerAttackDamage(g, amount, { consume: true });
    const pen = Math.max(0, amount - g.enemy.block);
    g.enemy.block = Math.max(0, g.enemy.block - amount);
    g.enemy.hp -= pen;
    // Crimson Lens (Vampire) — non-extreme roll heals 50% of the damage that actually reached
    // HP (`pen`, i.e. post-Block — a fully blocked hit heals nothing), Math.floor, matching
    // Drain Life's own rounding. No card-type check needed: for a Vampire, every
    // dealDamage(g,'enemy',...) call already originates from an Attack (no Vampire Skill/Power
    // ever calls it), so the fact this branch executed at all is the signal.
    //
    // Reads g.currentDie directly — dealDamage() isn't passed the roll, and every Vampire card
    // that resolves through here reads that same value for its own affinity check, so this
    // cannot disagree with what the card itself just used.
    //
    // Excludes Drain Life / Soul Rend (and their + upgrades, hence the trailing-'+' strip
    // matching CARD_PLAY_CONDITIONS' own normalization in js/data.js) by design decision: both
    // already implement this identical "heal a % of damage on non-extreme" mechanic in their own
    // printed text — Drain Life "Heal half damage dealt", Soul Rend "Heal equal to damage
    // dealt" — so the blanket hook would silently double what their own card text promises
    // (confirmed: Drain Life's non-extreme heal would become 50%+50%=100%, quietly matching what
    // it already advertises as the EXTREME case; Soul Rend's would become 100%+50%=150%,
    // exceeding anything either card describes).
    const CRIMSON_LENS_EXCLUDED_CARDS = ['drainlife', 'soulrend'];
    const resolvingCardKey = String(g._currentCardKey || '').replace(/\+$/, '');
    if (pen > 0 && hasCharacterRelic('crimson_lens', g)
        && !checkAffinity(g, g.currentDie, 'extreme')
        && !CRIMSON_LENS_EXCLUDED_CARDS.includes(resolvingCardKey)) {
      const lifesteal = Math.floor(pen / 2);
      if (lifesteal > 0) {
        healPlayer(g, lifesteal);
        showMsg('🔴 Crimson Lens — lifesteal!');
      }
    }
    playAttackAnimation({
      attackerEl: playerEl,
      targetEl: enemyEl,
      style: 'slash'
    });

    floatDamage('enemy-combatant', pen || amount, 'dmg');
    
    // Aldric Stone Heart decay on damage
    if (g.enemy && g.enemy.isAldric && g.aldricPhase === 1 && pen > 0) {
      g.aldricDamageDealt = (g.aldricDamageDealt || 0) + pen;
      const decayThreshold = 60;
      const decayCount = Math.floor(g.aldricDamageDealt / decayThreshold);
      const newStoneHeart = Math.max(
        ALDRIC.phases[0].stoneHeartMin,
        ALDRIC.phases[0].stoneHeartBase - (decayCount * 2)
      );
      if (newStoneHeart !== g.aldricStoneHeart) {
        g.aldricStoneHeart = newStoneHeart;
        updateAldricUI();
      }
    }
    // trigger hp-based specials
    if (g.enemy.special && g.enemy.special.trigger === 'hp') {
      try { g.enemy.special.effect(g); } catch(e) {}
    }
  } else if (target === 'player') {
    if (source === 'enemy') {
      // Enemy-direct special (Ritual, Arcane Overload, Collapse) — same pipeline as
      // basic/boss attacks: Fly → Block → loseHP (Oath + survival). No parallel logic.
      // Collapse passes bypassBlock so its Block-equal damage skips Block instead of self-cancelling.
      resolveEnemyAttack(g, amount, bypassBlock);
    } else {
      // Self-inflicted, environmental, or DoT — NOT Fly-halved. HP loss + Berserker's Oath
      // + survive-killing-blow relics are still handled inside loseHP.
      const pen = Math.max(0, amount - g.block);
      g.block = Math.max(0, g.block - amount);
      loseHP(g, pen);
      playAttackAnimation({
        attackerEl: enemyEl,
        targetEl: playerEl,
        style: 'slash'
      });
      floatDamage('player-combatant', pen || amount, 'dmg');
    }
  }
    setTimeout(() => {
    renderAll();
  }, 140);
}

// Centralized player HP loss. `amount` is the raw HP to remove (callers subtract Block first).
// Optional `floorAt` prevents dropping below that value — used by self-damage cards that must
// never self-kill (their old `Math.max(1, hp - x)` pattern). Fires on-HP-loss effects
// (Berserker's Oath) exactly once per loss event. Does NOT float damage — callers own visuals.
// `source` marks who caused the loss. 'enemy' means an enemy attack or enemy special — anything
// routed through resolveEnemyAttack(). Everything else (card costs, event costs, environmental)
// leaves it undefined. Only Berserker's Scar reads it; Berserker's Oath and the survive-lethal
// relics deliberately still fire on ANY loss, as they always have.
// If player-side DoT is ever implemented, its tick should pass 'enemy' to count as damage taken.
function loseHP(g, amount, floorAt, source) {
  if (amount == null || amount <= 0) return;
  if (floorAt != null) {
    amount = Math.min(amount, Math.max(0, g.hp - floorAt));
    if (amount <= 0) return;
  }
  g.hp -= amount;
  // Survive-killing-blow relics — centralized here so they fire for ANY lethal HP loss
  // (basic attack, boss attack, or enemy special), not just dealDamage() sources.
  if (g.hp <= 0 && hasRelic('lucky_rabbit_foot')) {
    g.hp = 1;
    const rfIdx = g.relics.indexOf('lucky_rabbit_foot');
    if (rfIdx !== -1) g.relics.splice(rfIdx, 1);
    showMsg('🐇 Lucky Rabbit Foot — survived at 1 HP!');
  }
  if (g.hp <= 0 && hasRelic('crimson_phylactery')) {
    g.hp = 1;
    const cpIdx = g.relics.indexOf('crimson_phylactery');
    if (cpIdx !== -1) g.relics.splice(cpIdx, 1);
    showMsg('💎 Crimson Phylactery — survived at 1 HP!');
  }
  // Berserker's Oath — ANY HP loss (enemy attack, enemy special, or self-inflicted) grants Block
  const berserkOath = g.statuses.player.find(s => s.name === '🔥BerserkOath');
  if (berserkOath) {
    const oathBlock = berserkOath.stacks === 2 ? 4 : 3;
    gainBlock(g, 'player', oathBlock);
    showMsg("🔥 Berserker's Oath — +" + oathBlock + " Block!");
  }
  // Berserker's Scar (Barbarian) — enemy-caused damage only, so paying HP as a card cost
  // (Reckless Lunge, Battle Trance, Blood Price…) grants nothing. Deliberately narrower than
  // Berserker's Oath directly above, which fires on any HP loss. One stack per instance of
  // damage that actually reaches HP, so a fully blocked hit grants nothing — this function has
  // already returned above when amount <= 0.
  if (source === 'enemy' && hasCharacterRelic('berserkers_scar', g)) {
    applyStatus(g, 'player', '💢Rage', 1);
    showMsg("🩹 Berserker's Scar — +1 Rage!");
  }
  // Blood Pact (Vampire) — the opposite branch of Berserker's Scar directly above: any
  // NON-'enemy'-sourced loss (a card cost — Dark Blood, Dark Embrace, Blood Bank, Cursed
  // Reroll's self-inflicted damage via dealDamage(g,'player',3,'self')…) heals back 50%.
  // `amount` here is already the post-floor-clamp value — reassigned in place above when
  // `floorAt` was supplied, so a card that would have dropped the player below its floor and
  // had its cost silently reduced refunds 50% of what was ACTUALLY paid, not the card's printed
  // number. Math.floor, matching Crimson Lens's own rounding.
  if (source !== 'enemy' && hasCharacterRelic('blood_pact', g)) {
    const refund = Math.floor(amount / 2);
    if (refund > 0) {
      healPlayer(g, refund);
      showMsg('🩸 Blood Pact — refunded ' + refund + ' HP!');
    }
  }
}

// Canonical enemy-attack damage resolution. BOTH the regular enemy-attack flow and Aldric
// route through this so Fly, Block, and Berserker's Oath behave identically for every enemy.
// `amount` is the attack damage AFTER enemy/boss modifiers (Rage, Chill, Fractured Strike
// scaling, etc.) — those are the caller's responsibility (pipeline steps 1-2). Steps here:
//   3. Fly (enemy-direct only) → 4. Block → 5. loseHP (Oath + survival fire on real HP lost).
// Single source of truth for a basic enemy attack's damage, so the number updateIntent() shows
// and the number endTurn() resolves can never drift apart (AGENTS.md verification area).
//
// BUG FIX (Aug 15, 2026): the enemy-side Weak branch was lost when the monolith was split (it
// exists in commit 90c74a0's damage helper). Twelve card effects apply Weak to the enemy, but
// nothing read it — Weak neither reduced enemy damage nor ticked down, so it stuck at its peak
// forever and did nothing. Rage was also missing from the intent display, understating incoming
// damage whenever the enemy had Strength.
//
// consumeChill: only the real attack consumes the Chill stack. The intent preview must not.
// baseOverride: start from a value other than g.enemy.damage (Aldric's phase-specific attacks).
function enemyAttackDamage(g, consumeChill, baseOverride) {
  let dmg = (baseOverride === undefined) ? g.enemy.damage : baseOverride;
  const rage = g.statuses.enemy.find(s => s.name === '💢Rage');
  if (rage && rage.stacks > 0) dmg += rage.stacks;
  const weak = g.statuses.enemy.find(s => s.name === '😵Weak');
  if (weak && weak.stacks > 0) dmg = Math.floor(dmg * 0.75);   // "Attacks deal 25% less damage"
  const chill = g.statuses.enemy.find(s => s.name === '❄️Chill');
  if (chill && chill.stacks > 0) {
    const coldMastery = g.statuses.player.find(s => s.name === '❄️ColdMastery');
    const chillReduction = coldMastery ? (coldMastery.stacks === 2 ? 0.50 : 0.65) : 0.75;
    dmg = Math.floor(dmg * chillReduction);
    if (consumeChill) {
      chill.stacks--;
      if (chill.stacks <= 0) g.statuses.enemy = g.statuses.enemy.filter(s => s.name !== '❄️Chill');
    }
  }
  return dmg;
}

// Defender-side modifier on incoming enemy damage: player Vulnerable.
//
// BUG FIX (Aug 15, 2026): the mirror of the enemy-Weak gap. Cursed Hound's rabid bite applies
// Vulnerable to the player, but nothing read it — it neither increased damage taken nor decayed,
// so it stuck forever and did nothing. `git log -S` traces the loss to the same split migration
// (commit bb85760) that dropped the enemy-Weak branch: commit 90c74a0 had a
// getModifiedIncomingDamage() helper reading exactly this status, and it did not survive.
//
// x1.5 matches the single rule the game states in both places it is defined — GDD.md §Statuses
// ("Target takes 50% more damage") and the shared in-game tooltip ("Takes 50% more damage from
// attacks") — and the live enemy-side convention in calculatePlayerAttackDamage(). The lost
// helper used x1.25, which already disagreed with the GDD, so it was not restored.
//
// Applied to ALL enemy-direct damage (basic attacks, enemy specials, Aldric) because it lives in
// this shared pipeline — the same breadth enemy Vulnerable gets from calculatePlayerAttackDamage.
function applyPlayerVulnerable(g, dmg) {
  const vuln = g.statuses.player.find(s => s.name === '🫗Vulnerable');
  return (vuln && vuln.stacks > 0) ? Math.floor(dmg * 1.5) : dmg;
}

function resolveEnemyAttack(g, amount, bypassBlock) {
  // Vulnerable amplifies the incoming hit first, then Fly mitigates it — the order the lost
  // getModifiedIncomingDamage() used.
  let dmg = applyPlayerVulnerable(g, amount);
  // Fly — halve incoming enemy-direct damage, then clear (one-shot, this turn only)
  const flyStatus = g.statuses.player.find(s => s.name === '🦇Fly');
  if (flyStatus) {
    dmg = Math.floor(dmg / 2);
    g.statuses.player = g.statuses.player.filter(s => s.name !== '🦇Fly');
    showMsg('🦇 Fly — damage halved!');
  }
  // Normally Block absorbs the post-Fly damage and the remainder penetrates to HP. When
  // bypassBlock is set (opt-in, per-attack — e.g. Collapse), the damage skips Block entirely
  // and hits HP directly; Fly still applied above. Block is neither consumed nor consulted.
  let pen;
  if (bypassBlock) {
    pen = dmg;
  } else {
    pen = Math.max(0, dmg - g.block);
    g.block = Math.max(0, g.block - dmg);
  }
  // 'enemy' marks this as damage taken FROM a foe. Every enemy attack and enemy special routes
  // through here, so this one call site is what feeds Berserker's Scar.
  loseHP(g, pen, null, 'enemy'); // HP loss → Berserker's Oath + survival relics fire on the actual loss
  playAttackAnimation({
    attackerEl: document.getElementById('enemy-combatant'),
    targetEl: document.getElementById('player-combatant'),
    style: 'slash'
  });
  floatDamage('player-combatant', pen, 'dmg');
  const ps = document.getElementById('player-sprite');
  if (ps) { ps.classList.add('shake'); setTimeout(() => ps.classList.remove('shake'), 300); }
  return pen;
}

// ═══════════════════════════════════════════════════════════════════
// GENERIC MULTI-MOVE BOSS ROTATION ENGINE
// ═══════════════════════════════════════════════════════════════════
// Any boss can opt in with an `moves: [{ name, type, damage, block, status,
// telegraphTurnsEarly }]` array on its enemy object. Absent `moves` (every current enemy/boss,
// including Aldric) takes the pre-existing flat e.damage/e.intent path in endTurn() STEP 6/10 and
// updateIntent() completely untouched — this file only ever branches into the code below when
// `G.enemy.moves` is truthy and non-empty. Built generic (not hardcoded to any one boss) the same
// way spendGold()/loseHP()/checkAffinity() are — reusable if a future boss ever needs the same
// shape, per this batch's own design brief.
//
// `type` is one of 'attack' | 'block' | 'attack+debuff' | 'attack+strip', reused verbatim as
// G.enemy.intent (STEP 10) so the field's existing meaning — "what the enemy will do next" —
// still holds for any code that inspects it generically, even though updateIntent() and this
// function both read moves[_moveIndex] directly and never depend on that string themselves.
//
// Dispatches every attack-flavored type through the SAME enemyAttackDamage()/resolveEnemyAttack()
// pipeline every other attack in the game already uses (via enemyAttackDamage's existing
// baseOverride parameter — the same extension point Aldric's per-phase attacks use), so Rage,
// Weak, Chill, Vulnerable, Fly and Block absorption all apply identically. No parallel damage math
// for moves-based bosses.
function resolveMoveTurn(g, move) {
  if (move.type === 'block') {
    g.enemy.block += (move.block || 0);
    return;
  }
  const dmg = enemyAttackDamage(g, true, move.damage);
  resolveEnemyAttack(g, dmg);
  if (move.type === 'attack+debuff' && move.status) {
    applyStatus(g, 'player', move.status.name, move.status.stacks);
  } else if (move.type === 'attack+strip') {
    // Strips whatever Block the player has LEFT after this same attack's own damage has already
    // absorbed through it — matching the existing Acid Touch/Blood Bat precedent (js/data.js),
    // both of which fire from special.trigger:'attack' (i.e. after resolveEnemyAttack has already
    // run), rather than removing Block before the attack that's supposed to punch through it.
    const stripped = Math.min(g.block, move.block || 0);
    g.block -= stripped;
    if (stripped > 0) showMsg(`${move.name} — strips ${stripped} Block!`);
  }
}

// Picks a random card from the player's own deck for Sir Crimson's Echo move (GDD §5), restricted
// to SIR_CRIMSON_ECHO_POOL (js/data.js) — the audited set of cards with at least one combat-
// facing component. Filtering the deck down to compatible entries first and picking uniformly
// among them is equivalent to "reroll past utility-only cards" but does it in one step instead of
// a rejection loop. Returns null only if the deck somehow has zero compatible cards (practically
// unreachable — every starter deck includes Strike/Defend-equivalents — but every caller checks
// for it rather than assuming a pick always exists).
function pickSirCrimsonEchoCard(g) {
  const compatible = (g.deck || []).filter(key => SIR_CRIMSON_ECHO_POOL[key]);
  if (compatible.length === 0) return null;
  const cardKey = compatible[Math.floor(Math.random() * compatible.length)];
  const card = CARDS[cardKey];
  const payload = SIR_CRIMSON_ECHO_POOL[cardKey];
  return { cardKey, name: card ? card.name : cardKey, ...payload };
}

// Resolves the pre-selected Echo pick (g.enemy._echoPick, stored at telegraph-time by STEP 10 —
// never re-rolled here) through the exact same pipeline every other Sir Crimson move and every
// other enemy attack in the game already uses: enemyAttackDamage()/resolveEnemyAttack() for
// damage, direct g.enemy.block/g.block mutation for Block gain/strip (matching resolveMoveTurn()
// and Shatter Step's own convention), applyStatus() for status. A pick can carry any combination
// of dmg/block/strip/status simultaneously (e.g. a damage+status compound card) — each present
// field is applied, nothing is mutually exclusive.
function resolveSirCrimsonEcho(g) {
  const pick = g.enemy._echoPick;
  if (!pick) { showMsg('👻 Echo — the memory fades without form.'); return; } // zero-compatible-cards edge case
  showMsg(`👻 Echo — mimics ${pick.name}!`);
  if (pick.dmg) {
    resolveEnemyAttack(g, enemyAttackDamage(g, true, pick.dmg));
  }
  if (pick.block) {
    g.enemy.block += pick.block;
  }
  if (pick.strip) {
    const stripped = Math.min(g.block, pick.strip);
    g.block -= stripped;
    if (stripped > 0) showMsg(`${pick.name} — strips ${stripped} Block!`);
  }
  if (pick.status) {
    pick.status.forEach(s => applyStatus(g, 'player', s.name, s.stacks));
  }
}

// Peeks past the immediately-next move to find one whose telegraphTurnsEarly demands earlier
// visibility than the standard one-turn-ahead default every move already gets for free (being
// moves[_moveIndex] IS the standard next-turn preview). Scans the rest of the rotation exactly
// once (bounded by its own length, so a cycle with nothing flagged terminates cleanly) and returns
// the SOONEST qualifying move — if two moves both want early telegraphing, the one arriving first
// is what the player needs to see.
function findEarlyTelegraphedMove(moves, moveIndex) {
  for (let turnsAway = 2; turnsAway <= moves.length; turnsAway++) {
    const idx = (moveIndex + turnsAway - 1) % moves.length;
    const move = moves[idx];
    if (move.telegraphTurnsEarly && move.telegraphTurnsEarly >= turnsAway) {
      return { move, turnsAway };
    }
  }
  return null;
}

function gainBlock(g, target, amount) {
  // Thief Challenge — the player may never gain Block. Denied at this one choke point so
  // conditional grants ("Odd: gain 7 Block") are covered without a per-card list; the rest of
  // the card resolves normally and still costs Energy. Enemy Block is untouched.
  if (target === 'player' && challengeActive(g, 'thief')) {
    showMsg('🚫 Challenge — no Block this fight.');
    return;
  }
  if (target === 'player') {
    g.block += amount;
    floatDamage('player-combatant', amount, 'block');
    const blockDisplay = document.getElementById('player-block-display');
    if (blockDisplay) {
      blockDisplay.classList.remove('block-pulse');
      void blockDisplay.offsetWidth;
      blockDisplay.classList.add('block-pulse');
      setTimeout(() => blockDisplay.classList.remove('block-pulse'), 360);
    }
  }
  renderAll();
}

function healPlayer(g, amount) {
  if (hasRelic('pale_contract')) amount = Math.max(1, Math.floor(amount * 0.5));
  g.hp = Math.min(g.maxHp, g.hp + amount);
  floatDamage('player-combatant', amount, 'heal');
  renderAll();
}

function applyStatus(g, target, name, stacks) {
  const arr = g.statuses[target];
  const ex = arr.find(s => s.name === name);
  if (ex) ex.stacks += stacks;
  else arr.push({ name, stacks });
  renderAll();
  checkAffinityHighlight(G, G.currentDie);
  setTimeout(() => { renderAll(); checkAffinityHighlight(G, G.currentDie); }, 50);
}

// options.turnStart marks the mandatory draw at the top of each turn. The Mage Challenge
// denies EXTRA draws ("you may never draw extra cards"), not the hand you are dealt — blanket
// suppression here would leave the player with no cards at all and softlock the fight.
function drawCards(g, n, options = {}) {
  // Mage Challenge — every extra-draw source is denied at this one choke point, which is why
  // no per-card list is needed: cards that draw only on an affinity hit (Shadow Step, War Cry)
  // are handled correctly by construction, and so are relic/status draws (Lucky Coin, Lucky
  // Streak). The rest of the card still resolves and still costs Energy.
  if (!options.turnStart && challengeActive(g, 'mage')) {
    showMsg('🚫 Challenge — no extra cards this fight.');
    return;
  }
  return drawCardsInner(g, n);
}

function drawCardsInner(g, n) {
  // Max hand size (default 8). Turn-start draw pulls startingDrawCount (5); in-turn draw
  // effects may push the hand above 5 up to this cap, after which further draws are blocked.
  const limit = g.maxHandSize || 8;
  for (let i = 0; i < n; i++) {
    if (g.hand.length >= limit) break;
    if (g.drawPile.length === 0) {
      if (g.discardPile.length > 0) {
        // Recycle the discard pile as-is. This used to filter out any card whose key appeared
        // in G.exhaustedPile — but an exhausted card is never in the discard pile (it goes to
        // the exhausted pile instead), so the filter only ever hit *other copies* of the same
        // card and deleted them from circulation outright. Holding two Spell Echoes and playing
        // one made the second vanish mid-combat while still being counted in G.deck, which is
        // the deck viewer's header-vs-pile-sum mismatch.
        g.drawPile = shuffle(g.discardPile);
        g.discardPile = [];
        showMsg('🔀 Deck reshuffled.');
      }
    }
    if (g.drawPile.length > 0) {
      g.hand.push(g.drawPile.pop());
    }
  }
}

// Remove one entry from `cards` per exhausted entry, matching by key. Holding two copies of
// the same card and exhausting one must remove one copy, not both.
function excludeExhausted(cards, exhaustedPile) {
  const pending = [...(exhaustedPile || [])];
  const out = [];
  for (const key of cards) {
    const i = pending.indexOf(key);
    if (i >= 0) pending.splice(i, 1);   // this copy is the exhausted one
    else out.push(key);
  }
  return out;
}

function shuffleDeck() {
  G.drawPile = shuffle(excludeExhausted(G.deck, G.exhaustedPile));
  G.discardPile = [];
  G.hand = [];
}

function checkCombatEnd() {
  if (G.hp <= 0) {
    restoreLoadedCoatDie(); // defeat is always a genuine combat end
    G.runSouls += G.souls;
    setTimeout(showGameOver, 600);
    return;
  }
  if (G.enemy && G.enemy.hp <= 0) {
    G.enemy.hp = 0;

    // Sir Crimson (GDD §5) — "no reward, no gold, no heal" is explicit and stricter than Aldric's
    // own win, which still picks up a few of the hooks below incidentally (an accepted pre-
    // existing quirk this batch does not touch — see the !isFinalBoss guards further down). He is
    // neither a G.map[...] floor boss nor Aldric, so none of the gold/soul/relic-hook/cores logic
    // below (which all assume G.inBoss means "a real floor boss just died") applies to him at all.
    // Short-circuits before any of it runs, then hands off exactly where the batch 5a/5b-i stub
    // did: G._sirCrimsonFought = true; showSirCrimsonOutro() — via sirCrimsonSmokeTransition() at
    // the confrontation/outro layer, not here.
    if (G.enemy.isSirCrimson) {
      const enemySprite = document.getElementById('enemy-sprite');
      spawnDeathBurstVFX(enemySprite);
      enemySprite.classList.add('dying');
      updateHUD();
      renderAll();
      setTimeout(() => {
        G._sirCrimsonFought = true;
        showSirCrimsonOutro();
      }, 700);
      return;
    }

    // Event-triggered combat (startEventCombat) — same shape as the Sir Crimson short-circuit
    // directly above, and for the same reason: everything below assumes the fight came from a floor
    // room. The gold/soul rate is keyed to G.inBoss/G.lastFightWasElite, the relic hooks and elite
    // consumable drop assume a room fight, and the Cores/Challenge block assumes G.map's floor boss
    // just died. An event fight is none of those, so it skips the lot and hands control to whatever
    // the event asked to happen next.
    //
    // Differs from Sir Crimson's branch in one deliberate respect: it calls restoreLoadedCoatDie().
    // This is a genuine combat end, and Aldric's win path restores the die too. (Sir Crimson's
    // omission is pre-existing and self-healing, since every fight-start function restores it as
    // well — but a swapped die would still show on the map screen in between, so this does it here.)
    if (G.enemy.isEventCombat) {
      // Captured and cleared BEFORE the timeout so the callback cannot fire twice if checkCombatEnd()
      // is re-entered while the death animation is still playing.
      const onVictory = G._eventCombatVictoryCallback;
      G._eventCombatVictoryCallback = null;
      restoreLoadedCoatDie();
      const enemySprite = document.getElementById('enemy-sprite');
      spawnDeathBurstVFX(enemySprite);
      enemySprite.classList.add('dying');
      updateHUD();
      renderAll();
      setTimeout(() => {
        if (onVictory) onVictory();
      }, 700);
      return;
    }

    G.gold += G.enemy.reward;
    // Soul income is a flat rate per fight type (GDD §15): 1 regular / 2 elite / 3 boss.
    // The per-enemy `souls` values still in js/data.js belong to the superseded permanent-Soul
    // design and are deliberately no longer read — they would pay ~40 Souls per floor against
    // a menu priced at 3-8 Souls.
    const soulGain = G.inBoss ? 3 : (G.lastFightWasElite ? 2 : 1);
    G.souls += soulGain;
    G.runSouls += soulGain;
    // Relic hooks — post-combat
    if (hasRelic('bloodsoaked_rag')) healPlayer(G, 3);
    if (hasRelic('ash_pendant'))   { G.souls += 1; G.runSouls += 1; }
    if (hasRelic('tarnished_coin')) G.gold += 5;
    if (G.lastFightWasElite && hasRelic('iron_ration')) healPlayer(G, 5);
    if (G.lastFightWasElite && hasRelic('grave_robber')) { G.gold += 8; showMsg('⚰️ Grave Robber — +8 Gold!'); }
    // Elite consumable drop — GDD §12 lists "Elite reward" as a source for exactly two items,
    // Fire Flask and Poison Vial, so offerableConsumables('elite') returns that pair and nothing
    // else. Unconditional on an elite win, matching the shape of the two relic hooks directly
    // above (no roll, no gate beyond the elite flag).
    //
    // At 3/3 grantConsumable() opens the swap prompt. No onDone continuation is passed here, unlike
    // the event grant: the post-combat chain below (death VFX, core/Challenge records, then a
    // setTimeout into the whole reward flow — boss rewards, Aldric phase transitions) is load-
    // bearing and must not wait on a player choice. The prompt is a top-most modal, so it simply
    // stays above whichever reward screen the chain reaches, and resolving it only touches
    // G.consumables. Cosmetically the prompt can appear over a transitioning screen; functionally
    // the swap is independent of what is underneath.
    //
    // NOT in the GDD: any drop RATE. §12 says only that elites are a source. Guaranteed is the
    // reading that matches the hooks it sits beside; a percentage chance would need a design call.
    if (G.lastFightWasElite) {
      const eliteDrops = offerableConsumables('elite', G);
      if (eliteDrops.length) grantConsumable(eliteDrops[Math.floor(Math.random() * eliteDrops.length)]);
    }

    const enemySprite = document.getElementById('enemy-sprite');
    spawnDeathBurstVFX(enemySprite);
    enemySprite.classList.add('dying');

    if (G.inBoss) {
      const boss = G.map[G.currentFloor].boss;
      G.cores.push(boss.charKey);
      // Permanent record, separate from the per-run G.cores above: this is what lets a
      // later run know the companion's Challenge has been unlocked (GDD.md §1, §9).
      // Guarded on !isFinalBoss because Aldric sets G.inBoss as well as G.isFinalBoss, so
      // this branch also runs when he dies — at which point G.currentFloor is still 3 and
      // `boss` is the floor-3 companion, who was already collected. Recording is a no-op
      // in that case, but the guard keeps the intent honest rather than relying on dedupe.
      if (!G.isFinalBoss) recordCoreCollected(boss.charKey);
      renderCores();
      showMsg(`Core of ${boss.name} — collected!`);
      // Challenge cleared — winning the fight IS the clear condition. Permanent, first-time
      // only (recordChallengeRelicEarned mirrors recordCoreCollected). Losing simply never
      // reaches here, which is the whole of "a failed attempt costs nothing".
      if (!G.isFinalBoss && challengeActive(G) && G._challenge === boss.charKey) {
        const earned = recordChallengeRelicEarned(G._challenge);
        const heroName = (CHARACTERS[G._challenge] && CHARACTERS[G._challenge].name) || G._challenge;
        showMsg(earned
          ? `🏆 Challenge complete — ${heroName}'s Challenge relic earned!`
          : `🏆 Challenge complete — ${heroName}'s relic was already earned.`);
        G._challenge = null;
      }
    }

    updateHUD();
    renderAll();
    setTimeout(() => {
      if (G.isFinalBoss) {
        // A phase transition (true) is NOT a combat end — Phase 1 -> 2 -> 3 is still the same
        // fight, so a Loaded Coat swap must survive it. Only restore below, once Aldric's final
        // phase is genuinely defeated (this check returns false).
        if (checkAldricPhaseTransition()) return;
        restoreLoadedCoatDie();
        showAldricEnding();
        return;
      }
      // Every path below is a genuine combat end (floor-3 boss beaten — Aldric next is a
      // SEPARATE combat with its own startAldricFight(); floor 1-2 boss beaten; normal/elite
      // enemy beaten) — restore once here rather than at each branch.
      restoreLoadedCoatDie();
      if (G.inBoss && G.currentFloor >= 3) {
        // Last floor boss defeated — now face Aldric
        setTimeout(() => launchFinalBoss(), 1500);
        showMsg('The floor falls. One final door remains…');
        return;
      }
      if (G.inBoss) {
        // Boss gold reward
        const bossGold = G.map[G.currentFloor].boss.reward || 80;
        G.gold += bossGold;
        G.hp = G.maxHp; // full heal between floors
        showMsg('Floor cleared! +' + bossGold + ' Gold! HP fully restored.');
        G.map[G.currentFloor].cleared = true;
        G.currentFloor++;
        G.map[G.currentFloor].currentPath = 'A';
        G.map[G.currentFloor].roomIndexA = 0;
        G.map[G.currentFloor].roomIndexB = 0;
        G.map[G.currentFloor].roomIndexC = 0;
        G.needsPathSelect = true;
        showReward(); // after reward → showPathSelect via proceedDoors
      } else {
        showReward();
      }
    }, 700);
  }
}

function updateIntent() {
  if (!G.enemy) return;
  const e = G.enemy;
  const el = document.getElementById('enemy-intent');
  const specialHint = e.special
    ? `<div style="font-size:0.65rem;color:var(--purple2);margin-top:0.2rem;">⚡ ${e.special.name} · <span style="color:var(--text3)">tap for info</span></div>`
    : '';

  // Echo (GDD §5, Sir Crimson only) — checked BEFORE the generic moves-rotation branch below,
  // since Sir Crimson always has a `moves` array too; this takes priority whenever STEP 10 has
  // set intent to 'echo'. Names the specific mimicked card and its stored full-effect numbers —
  // never a generic "Echo" label — reusing the exact same dual-number Rage/Weak/Chill/Vulnerable-
  // aware preview math and per-component formatting the regular move branch already uses, just
  // fed the pre-selected pick's damage/status/strip instead of a move's own fields. The pick was
  // already finalized at telegraph-time (STEP 10 the turn before) and is never recomputed here.
  if (e.intent === 'echo') {
    const pick = e._echoPick;
    if (!pick) { el.innerHTML = `Preparing: <strong>👻 Echo</strong>`; return; } // zero-compatible-cards edge case
    el.classList.toggle('intent-pulse', !!pick.dmg);
    const parts = [];
    if (pick.dmg) {
      const rawDmg = pick.dmg;
      const actualDmg = applyPlayerVulnerable(G, enemyAttackDamage(G, false, pick.dmg));
      const dmgDisplay = (actualDmg !== rawDmg)
        ? `<span style="color:${actualDmg < rawDmg ? '#7fb3d3' : '#e74c3c'};font-weight:bold">${actualDmg}</span> <span style="text-decoration:line-through;opacity:0.5;font-size:0.85em">${rawDmg}</span>`
        : `${rawDmg}`;
      parts.push(`Attack ${dmgDisplay}`);
    }
    if (pick.block) parts.push(`🛡 Block ${pick.block}`);
    if (pick.strip) parts.push(`strips ${pick.strip} Block`);
    if (pick.status) parts.push(pick.status.map(s => `+ ${s.name} ${s.stacks}`).join(' '));
    const mainLine = parts.join(' ') || pick.name;
    el.innerHTML = `Preparing: <strong>👻 Echo — ${pick.name}: ${mainLine}</strong>${specialHint}`;
    return;
  }

  // Multi-move rotation engine (see resolveMoveTurn()/findEarlyTelegraphedMove() above). Any
  // enemy without a `moves` array — i.e. every current enemy/boss/Aldric — falls straight through
  // to the untouched legacy branch below via this early return never firing.
  if (e.moves && e.moves.length) {
    const move = e.moves[e._moveIndex || 0];
    const isAttackFlavor = move.type === 'attack' || move.type === 'attack+debuff' || move.type === 'attack+strip';
    el.classList.toggle('intent-pulse', isAttackFlavor);

    let mainLine;
    if (move.type === 'block') {
      mainLine = `🛡 Block ${move.block}`;
    } else {
      // Same Rage/Weak/Chill/Vulnerable-aware preview math the flat-damage path below already
      // uses, applied per-move via enemyAttackDamage()'s existing baseOverride parameter instead
      // of the single flat e.damage stat.
      const rawDmg = move.damage;
      const actualDmg = applyPlayerVulnerable(G, enemyAttackDamage(G, false, move.damage));
      const dmgDisplay = (actualDmg !== rawDmg)
        ? `<span style="color:${actualDmg < rawDmg ? '#7fb3d3' : '#e74c3c'};font-weight:bold">${actualDmg}</span> <span style="text-decoration:line-through;opacity:0.5;font-size:0.85em">${rawDmg}</span>`
        : `${rawDmg}`;
      if (move.type === 'attack+debuff' && move.status) {
        mainLine = `Attack ${dmgDisplay} + ${move.status.name} ${move.status.stacks}`;
      } else if (move.type === 'attack+strip') {
        mainLine = `Attack ${dmgDisplay} — strips ${move.block} Block`;
      } else {
        mainLine = `Attack ${dmgDisplay}`;
      }
    }

    const early = findEarlyTelegraphedMove(e.moves, e._moveIndex || 0);
    const telegraphHint = early
      ? `<div style="font-size:0.65rem;color:var(--gold);margin-top:0.2rem;">⚠ ${early.move.name} incoming in ${early.turnsAway} turns</div>`
      : '';

    el.innerHTML = `Preparing: <strong>${mainLine}</strong>${telegraphHint}${specialHint}`;
    return;
  }

  el.classList.toggle('intent-pulse', e.intent === 'attack');
  if (e.intent === 'attack') {
    // Same helpers the attack itself uses (consumeChill false — previewing must not spend Chill),
    // so the number shown is exactly the number that will land. Covers the attacker's Rage, Weak
    // and Chill, plus the defender's Vulnerable. Previously this read e.damage and applied only
    // Chill, so it understated Rage and ignored Weak and Vulnerable entirely.
    // Aldric's phase-specific profile (3-hit Fractured Strike, Poison/Burn amplification) comes
    // from the same helper his turn uses, so the preview cannot drift from the volley he throws.
    const profile = e.isAldric ? aldricAttackProfile(G) : { base: e.damage, hits: 1 };
    const rawDmg = profile.base;
    const actualDmg = applyPlayerVulnerable(G, enemyAttackDamage(G, false, profile.base));
    const dmgDisplay = (actualDmg !== rawDmg)
      ? `<span style="color:${actualDmg < rawDmg ? '#7fb3d3' : '#e74c3c'};font-weight:bold">${actualDmg}</span> <span style="text-decoration:line-through;opacity:0.5;font-size:0.85em">${rawDmg}</span>`
      : `${rawDmg}`;
    const hitsSuffix = profile.hits > 1 ? ` ×${profile.hits}` : '';
    el.innerHTML = `Preparing: <strong>Attack ${dmgDisplay}${hitsSuffix}</strong>${specialHint}`;
  } else {
    el.innerHTML = `Preparing: <strong>🛡 Defend</strong>${specialHint}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
