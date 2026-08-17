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
// soul surfacing and was never relic-specific.
//
// The beats are deliberately UNATTRIBUTED: GDD §9 explicitly defers designing what the five
// Challenge relics actually do inside this fight, so nothing here claims to be a given relic.
// The 75 HP beat carried "Aldric damage is halved", which never worked — aldricAttackProfile()
// hardcodes base 15 for a gate-passed Phase 3 and never reads G.enemy.damage. That dead effect
// is removed; the beat itself stays, since skipping his attack is its real contribution.
const ALDRIC_RELIC_TRIGGERS = [
  { hp: 100, quote: '"I remember… the throne…"',        effect: 'Aldric loses all Strength.' },
  { hp: 75,  quote: '"I swore to protect..."',          effect: 'Aldric falters — no attack this turn.' },
  { hp: 50,  quote: '"The pact... it is breaking..."',  effect: 'Your Reroll is now infinite.' },
  { hp: 25,  quote: '"I… am still here…"',              effect: 'Aldric stops attacking.' }
];

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
  // Midnight Hunger (Vampire) — this hooks into startTurn()/rollDice(), both universal functions
  // Aldric calls unconditionally, so unlike the passive relic-start hooks it needs no special
  // exclusion here. `true` is the sentinel meaning "no turn has failed to hit extreme yet" —
  // startTurn()'s very next call (Aldric's own turn 1) must not queue a bonus for a turn that
  // never happened, exactly as at the other two fight starts.
  G._hitExtremeThisTurn = true;
  G._nextRollBonus = 0;
  G.aldricTurns = 0;
  G.aldricStoneHeart = phase.stoneHeartBase;
  G.aldricRelicsTriggered = [];
  G.aldricAffinityDisabled = false;
  G.aldricInfiniteReroll = false;
  G.aldricStopped = false;
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
    if (G.aldricStopped) {
      showMsg('"I… am still here…"');
      return;
    }

    if (!G.aldricHasRelics) {
      // No relics — Unbreakable wall. Statuses are cleared FIRST, so the shared modifiers below
      // find nothing to apply: the immunity is preserved, it is just now expressed by the
      // clearing rather than by bypassing the damage helper.
      G.statuses.enemy = []; // immune to all status
      resolveEnemyAttack(G, enemyAttackDamage(G, true, aldricAttackProfile(G).base));
      showMsg('👑 The cycle continues... you are not ready.');
      return;
    }

    // Has relics — check thresholds
    const hp = G.enemy.hp;
    for (const trigger of ALDRIC_RELIC_TRIGGERS) {
      if (hp <= trigger.hp && !G.aldricRelicsTriggered.includes(trigger.hp)) {
        G.aldricRelicsTriggered.push(trigger.hp);
        showAldricRelicTrigger(trigger);
        return; // skip attack this turn for dramatic pause
      }
    }

    resolveEnemyAttack(G, enemyAttackDamage(G, true, aldricAttackProfile(G).base)); // relic-reduced
  }
}

function showAldricRelicTrigger(trigger) {
  // Apply effect. Every beat also skips Aldric's attack for the turn — that happens in the
  // caller, which returns early, and is the 75 HP beat's only contribution now that its dead
  // damage-halving is gone.
  if (trigger.hp === 100) {
    G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '💢Rage');
  } else if (trigger.hp === 50) {
    G.aldricInfiniteReroll = true;
  } else if (trigger.hp === 25) {
    G.aldricStopped = true;
  }
  showMsg('✨ ' + trigger.quote);

  // Show dramatic overlay. One shared banner for all four beats — the per-relic icons and
  // names belonged to the deleted four-relic design.
  const overlay = document.getElementById('aldric-relic-msg');
  document.getElementById('aldric-relic-icon').textContent = '✨';
  document.getElementById('aldric-relic-name').textContent = 'THE RELICS PULSE';
  document.getElementById('aldric-relic-quote').textContent = trigger.quote;
  document.getElementById('aldric-relic-effect').textContent = trigger.effect;
  overlay.classList.add('visible');

  setTimeout(() => overlay.classList.remove('visible'), 3500);
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
  G.startingDrawCount = 5;   // cards drawn at the start of each turn
  G.maxHandSize = 8;         // cap that in-turn draw effects can fill up to
  G.cardsPlayedThisCombat = 0;
  G.turn = 0;                // per-combat turn counter; startTurn() takes it to 1 immediately
  G._challenge = null;       // Challenges are floor-boss only — never a normal or elite fight
                             // (startBossFight deliberately does NOT clear this: showBossIntro
                             // sets it just before, and clearing would discard the opt-in)
  G._ashenCrownFired = false;
  G._leyLineCrystalUsed = false; // once per combat — see startAldricFight for the full lifecycle note
  G._hitExtremeThisTurn = true; // Midnight Hunger — see startAldricFight for the sentinel note
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
  G.startingDrawCount = 5;   // cards drawn at the start of each turn
  G.maxHandSize = 8;         // cap that in-turn draw effects can fill up to
  G.cardsPlayedThisCombat = 0;
  G.turn = 0;                // per-combat turn counter; startTurn() takes it to 1 immediately
  G._ashenCrownFired = false;
  G._leyLineCrystalUsed = false; // once per combat — see startAldricFight for the full lifecycle note
  G._hitExtremeThisTurn = true; // Midnight Hunger — see startAldricFight for the sentinel note
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

  rollDice(G, true);

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
    renderAll();
    updateIntent();
    return;
  }

  drawCards(G, (G.startingDrawCount || 5) + (G.extraDraw || 0), { turnStart: true });
  drawBattleDrum();
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
function useLeyLineCrystal() {
  if (!hasCharacterRelic('ley_line_crystal')) return;
  if (G._leyLineCrystalUsed) { showMsg('Ley Line Crystal already used this combat!'); return; }
  if (G._dieSetThisTurn) { showMsg('Die can only be set once per turn!'); return; }

  G.currentDie = Math.min(6, G.diceMax);
  G._dieSetThisTurn = true;
  G._leyLineCrystalUsed = true;
  animateDieTo(G.currentDie);
  showMsg('🔮 Ley Line Crystal — die forced to ' + G.currentDie + '!');
  renderAll();
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
  G.enemy.intent = Math.random() < 0.65 ? 'attack' : 'defend';

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
    G.runSouls += G.souls;
    setTimeout(showGameOver, 600);
    return;
  }
  if (G.enemy && G.enemy.hp <= 0) {
    G.enemy.hp = 0;
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
        if (checkAldricPhaseTransition()) return;
        showAldricEnding();
        return;
      }
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
  el.classList.toggle('intent-pulse', e.intent === 'attack');
  const specialHint = e.special
    ? `<div style="font-size:0.65rem;color:var(--purple2);margin-top:0.2rem;">⚡ ${e.special.name} · <span style="color:var(--text3)">tap for info</span></div>`
    : '';
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
