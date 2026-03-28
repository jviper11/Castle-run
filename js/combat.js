const _PASSIVE_INFO = {
  even:    { emoji: '⚖️' },
  odd:     { emoji: '🗡️' },
  high:    { emoji: '⬆️' },
  gambler: { emoji: '🎲' },
  extreme: { emoji: '⚡' },
};

function updatePassiveBadge() {
  const el = document.getElementById('player-passive');
  if (!el || !G.char) return;
  const p = _PASSIVE_INFO[G.char.diceAffinity];
  if (!p) { el.textContent = ''; return; }
  const label = G.char.diceLabel || G.char.diceAffinity || '';
  const tip = G.char.diceHint || label;
  el.textContent = `${p.emoji} ${label}`;
  el.setAttribute('data-tip', tip);
  el.setAttribute('aria-label', 'Passive: ' + tip);
  el.onclick = () => showMsg('\u26a1 Passive: ' + tip);
}

function startAldricFight() {
  const phase = ALDRIC.phases[0];
  G.aldricPhase = 1;
  G.aldricDamageDealt = 0;
  G.aldricTotalDamage = 0;
  G.aldricTurns = 0;
  G.aldricStoneHeart = phase.stoneHeartBase;
  G.aldricRelicsTriggered = [];
  G.aldricAffinityDisabled = false;
  G.aldricInfiniteReroll = false;
  G.aldricStopped = false;
  G.aldricHasRelics = G.cores && G.cores.length >= 4;
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
  G._forcedMaxRolls = 0;
  G.dieSetUsedThisTurn = false;
  G.turnCardsPlayed = 0;
  G.inBoss = true;
  G.isFinalBoss = true;

  showScreen('combat-screen');
  updateCombatSprites(G.charKey, 'aldric');
  document.getElementById('player-name').textContent = G.char.name.toUpperCase();
  updatePassiveBadge();
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

    // Grieving Ground — attack + add Curse
    dealDamage(G, 'player', 15);
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

    // Fractured Strike — 8 damage 3 times
    let strikeDmg = 8;
    const hasPoison = G.statuses.player.find(s => s.name === '☠️Poison');
    const hasBurn = G.statuses.player.find(s => s.name === '🔥Burn');
    if (hasPoison || hasBurn) {
      strikeDmg = Math.floor(strikeDmg * 1.5);
      showMsg('👑 Fractured Strike — amplified by your status effects!');
    }
    dealDamage(G, 'player', strikeDmg);
    setTimeout(() => dealDamage(G, 'player', strikeDmg), 200);
    setTimeout(() => dealDamage(G, 'player', strikeDmg), 400);

    // Desperation — 2 Strength per exhausted Power, capped at 6
    const exhaustedCount = Math.min((G.exhaustedPile || []).length, 3);
    if (exhaustedCount > 0) {
      const strGain = exhaustedCount * 2;
      applyStatus(G, 'enemy', '💢Strength', strGain);
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
      // No relics — Unbreakable wall
      G.statuses.enemy = []; // immune to all status
      dealDamage(G, 'player', 20);
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

    dealDamage(G, 'player', 15); // reduced damage with relics
  }
}

function showAldricRelicTrigger(trigger) {
  // Apply effect
  if (trigger.hp === 100) {
    // Crown — Aldric loses all Strength
    G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '💢Strength');
    showMsg('👑 ' + trigger.quote);
  } else if (trigger.hp === 75) {
    // Sword — damage halved
    G.enemy.damage = Math.floor(G.enemy.damage / 2);
    showMsg('⚔️ ' + trigger.quote);
  } else if (trigger.hp === 50) {
    // Sigil — infinite reroll
    G.aldricInfiniteReroll = true;
    showMsg('🔱 ' + trigger.quote);
  } else if (trigger.hp === 25) {
    // Vow — stops attacking
    G.aldricStopped = true;
    showMsg('🤝 ' + trigger.quote);
  }

  // Show dramatic overlay
  const overlay = document.getElementById('aldric-relic-msg');
  document.getElementById('aldric-relic-icon').textContent = trigger.icon;
  document.getElementById('aldric-relic-name').textContent = trigger.name;
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


// ═══════════════════════════════════════════════════════════════════

function startCombat(isElite) {
  let pool;
  if (isElite) {
    // Floor-appropriate elites
    const floorEliteMap = { 0:[0,1], 1:[2,3], 2:[4,5], 3:[6,7] };
    const indices = floorEliteMap[G.currentFloor] || [0,1];
    pool = indices.map(i => ELITES[i]).filter(Boolean);
    if (!pool.length) pool = ELITES.slice(0,2);
  } else {
    const floor = G.map[G.currentFloor];
    const roomIdx = floor[floor.currentPath === 'A' ? 'roomIndexA' : floor.currentPath === 'B' ? 'roomIndexB' : 'roomIndexC'] || 0;
    const isEasy = G.currentFloor === 0 && roomIdx < 2;
    const isEarlyFloor2 = G.currentFloor === 1 && roomIdx < 2;
    if (isEasy) {
      pool = EASY_ENEMIES;
    } else if (isEarlyFloor2) {
      pool = EARLY_FLOOR2_ENEMIES;
    } else {
      pool = FLOOR_ENEMIES[G.currentFloor + 1] || FLOOR_ENEMIES[1];
    }
  }

  const e = { ...rand(pool) };
  G.enemy = { ...e, maxHp: e.hp, turnCount: 0};
 // Moves-based enemies: set opening move
  if (e.moves && e.moves.length) {
    const opener = e.moves.find(m => m.isOpener) || e.moves[0];
    G.enemy.currentMove = opener;
    G.enemy._moveHistory = [];
  } else {
    G.enemy.intent = 'attack';
  }
  G.block = 0;
  G.statuses = { player: [], enemy: [] };
  G.exhaustedPile = [];
  G._forcedMaxRolls = 0;
  G.dieSetUsedThisTurn = false;
  G.turnCardsPlayed = 0;
  G.inBoss = false;

  updateCombatSprites(G.charKey, null);
  document.getElementById('player-name').textContent = G.char.name.toUpperCase();
  updatePassiveBadge();
  document.getElementById('enemy-sprite').textContent = e.emoji;
  document.getElementById('enemy-name').textContent = e.name.toUpperCase();
  document.getElementById('enemy-sprite').classList.remove('dying');

  shuffleDeck();
  startTurn();
  renderAll();
}

function startBossFight() {
  const boss = G.map[G.currentFloor].boss;
  const e = { name: boss.name, emoji: boss.emoji, hp: boss.hp, maxHp: boss.hp, block: boss.block, intent:'attack', damage: boss.damage, reward: 0, souls: boss.souls };
  G.enemy = e;
  G.block = 0;
  G.statuses = { player: [], enemy: [] };
  G.exhaustedPile = [];
  G._forcedMaxRolls = 0;
  G.dieSetUsedThisTurn = false;
  G.turnCardsPlayed = 0;
  G.inBoss = true;

  showScreen('combat-screen');
  document.getElementById('player-sprite').textContent = G.char.emoji;
  document.getElementById('player-name').textContent = G.char.name.toUpperCase();
  updatePassiveBadge();
  document.getElementById('enemy-sprite').textContent = e.emoji;
  document.getElementById('enemy-name').textContent = e.name.toUpperCase();
  document.getElementById('enemy-sprite').classList.remove('dying');

  shuffleDeck();
  startTurn();
  renderAll();
}

function applyPlayerIncomingDamageModifiers(g, amount) {
  return getModifiedIncomingDamage(g, amount, true);
}

function getModifiedIncomingDamage(g, amount, consumeFly = false) {
  let modified = amount;
  const playerVuln = g.statuses.player.find(s => s.name === '🫗Vulnerable');
  if (playerVuln && playerVuln.stacks > 0) {
    modified = Math.floor(modified * 1.25);
  }
  const playerFly = g.statuses.player.find(s => s.name === '🦇Fly');
  if (playerFly && playerFly.stacks > 0) {
    modified = Math.floor(modified * 0.5);
    if (consumeFly) {
      g.statuses.player = g.statuses.player.filter(s => s.name !== '🦇Fly');
    }
  }
  return modified;
}

function clearVoidChannelSelection() {
  G._voidChannelSelecting = false;
  G._voidChannelNeeded = 0;
  G._voidChannelPicked = [];
}

function removeStatus(g, target, name) {
  g.statuses[target] = g.statuses[target].filter(s => s.name !== name);
}

function tickStatusDamage(g, target, name) {
  const status = g.statuses[target].find(s => s.name === name);
  if (!status || status.stacks <= 0) return false;

  if (target === 'player') {
    g.hp -= status.stacks;
    noteRunFinalBlow(g, status.stacks);
    floatDamage('player-combatant', status.stacks, 'dmg');
  } else if (g.enemy) {
    g.enemy.hp -= status.stacks;
    noteRunDamageDealt(g, status.stacks);
    floatDamage('enemy-combatant', status.stacks, 'dmg');
  }

  SFX.statusTick();
  status.stacks--;
  if (status.stacks <= 0) {
    removeStatus(g, target, name);
  }
  return true;
}

function tickTimedDebuffs(g, target) {
  const currentTurn = target === 'player' ? g.turn : ((g.enemy && g.enemy.turnCount) || 0);
  const turnKey = target === 'player' ? 'appliedOnPlayerTurn' : 'appliedOnEnemyTurn';

  for (const name of ['😵Weak', '🫗Vulnerable']) {
    const debuff = g.statuses[target].find(s => s.name === name);
    if (!debuff) continue;
    if (debuff[turnKey] === currentTurn) continue;
    debuff.stacks--;
    if (debuff.stacks <= 0) {
      removeStatus(g, target, name);
    }
  }
}

function clearExpiredFly(g, target) {
  const fly = g.statuses[target].find(s => s.name === '🦇Fly');
  if (!fly) return;
  const currentTurn = target === 'player' ? g.turn : ((g.enemy && g.enemy.turnCount) || 0);
  const turnKey = target === 'player' ? 'appliedOnPlayerTurn' : 'appliedOnEnemyTurn';
  if (fly[turnKey] !== currentTurn) {
    removeStatus(g, target, '🦇Fly');
  }
}

function setEndTurnLocked(locked) {
  G.endTurnLocked = locked;
  const btn = document.querySelector('.end-turn-btn');
  if (btn) btn.disabled = locked;
}

function getModifiedEnemyAttackDamage(g, baseDamage) {
  let dmg = baseDamage;
  const strength = g.statuses.enemy.find(s => s.name === '💢Strength');
  if (strength && strength.stacks > 0) {
    dmg += strength.stacks;
  }
  const weak = g.statuses.enemy.find(s => s.name === '😵Weak');
  if (weak && weak.stacks > 0) {
    dmg = Math.floor(dmg * 0.75);
  }
  const chill = g.statuses.enemy.find(s => s.name === '❄️Chill');
  if (chill && chill.stacks > 0) {
    dmg = Math.floor(dmg * 0.75);
  }
  return getModifiedIncomingDamage(g, dmg, false);
}

function formatEnemyIntentDamageDesc(g, desc) {
  if (!desc) return desc;
  return desc.replace(/\b(\d+)\s+dmg\b/gi, (match, num) => {
    const previewDmg = getModifiedEnemyAttackDamage(g, parseInt(num, 10));
    return `${previewDmg} dmg`;
  });
}

function getModifiedPlayerAttackDamage(g, baseDamage, consumeEnemyFly = false) {
  if (!g.enemy) return baseDamage;
  if (g.enemy._phased) return 0;

  let dmg = baseDamage;
  const playerStrength = g.statuses.player.find(s => s.name === '💢Strength');
  if (playerStrength && playerStrength.stacks > 0) {
    dmg += playerStrength.stacks;
  }

  const activeDieBonus = getDie(g.activeDie);
  if (activeDieBonus.bonus === 'odd_dmg' && g.currentDie && g.currentDie % 2 !== 0) {
    dmg += 2;
  }

  const playerWeak = g.statuses.player.find(s => s.name === '😵Weak');
  if (playerWeak && playerWeak.stacks > 0) {
    dmg = Math.floor(dmg * 0.75);
  }

  const enemyVuln = g.statuses.enemy.find(s => s.name === '🫗Vulnerable');
  if (enemyVuln && enemyVuln.stacks > 0) {
    dmg = Math.floor(dmg * 1.25);
  }

  const enemyFly = g.statuses.enemy.find(s => s.name === '🦇Fly');
  if (enemyFly && enemyFly.stacks > 0) {
    dmg = Math.floor(dmg * 0.5);
    if (consumeEnemyFly) {
      removeStatus(g, 'enemy', '🦇Fly');
    }
  }

  return dmg;
}

function startTurn() {
  setEndTurnLocked(false);

  if (G._voidChannelSelecting || (G._voidChannelPicked && G._voidChannelPicked.length)) {
    clearVoidChannelSelection();
  }

  G.turn++;

  tickStatusDamage(G, 'player', '🔥Burn');
  tickStatusDamage(G, 'enemy', '🔥Burn');

  const regen = G.statuses.player.find(s => s.name === '💚Regen');
  if (regen && regen.stacks > 0) {
    healPlayer(G, regen.stacks);
    regen.stacks--;
    if (regen.stacks <= 0) {
      removeStatus(G, 'player', '💚Regen');
    }
  }

  clearExpiredFly(G, 'player');

  renderAll();
  checkCombatEnd();
  if (G.hp <= 0 || !G.enemy || G.enemy.hp <= 0) return;

  G.energy = G.maxEnergy;
  G.block = 0;
  G._manaSurge = false; // reset each turn
  // Enemy block persists until player damages through it — does NOT reset each turn
  G.rerollUsed = false;
  G.dieSetUsedThisTurn = false;
  G.turnCardsPlayed = 0;
  G.diceRolled = false;

  // Use active die
  G.currentDieType = getDie(G.activeDie);
  G.diceMax = G.currentDieType.max;

  rollDice(G);

  // Apply die bonus effects after roll
  const activeDieData = getDie(G.activeDie);
  const roll = G.currentDie;
  if (activeDieData.bonus === 'even_energy' && roll % 2 === 0) {
    G.energy = Math.min(G.energy + 1, G.maxEnergy + 1);
    showMsg(activeDieData.emoji + ' Arcane Die — even roll restores 1 energy!');
  }
  if (activeDieData.bonus === 'max_draw' && roll === activeDieData.max) {
    drawCards(G, 6); // draw 6 instead of 5 — extra card
    renderAll();
    updateIntent();
    return;
  }

  drawCards(G, 5);
  renderAll();
  updateIntent();
}

function rollDice(g) {
  SFX.diceRoll();
  let roll;
  if ((g._forcedMaxRolls || 0) > 0) {
    roll = g.diceMax;
    g._forcedMaxRolls--;
  } else {
    roll = Math.floor(Math.random() * g.diceMax) + 1;
  }
  // Gambler min 2
  if (g.charKey === 'gambler' && roll < 2) roll = 2;
  // Apply die-specific bonus
  const activeDieObj = getDie(g.activeDie);
  if (activeDieObj.bonus === 'min3' && roll < 3) roll = 3;
  g.currentDie = roll;
  g.diceRolled = true;

  // animate
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
  if (isMatch) SFX.affinityMatch();
  const die = document.getElementById('current-die');
  die.classList.toggle('affinity-match', isMatch);
  const thisDieMax = g.currentDieType ? g.currentDieType.max : g.diceMax;
  let affinityHint = g.char.diceLabel;
  if (g.char.diceAffinity === 'extreme') {
    affinityHint = `Extreme: roll 1 or ${thisDieMax}`;
  }
  document.getElementById('affinity-label').textContent = isMatch
    ? `✨ ${affinityHint}`
    : affinityHint;
  const dieTypeLbl = document.getElementById('die-type-label');
  if (dieTypeLbl) dieTypeLbl.textContent = (g.currentDieType && g.currentDieType.type ? g.currentDieType.type : 'd6');
  renderHand();
  syncMobileDice();
}

function checkAffinity(g, roll, affinity) {
  if (roll === null || roll === undefined || !affinity) return false;
  // Aldric Memory Leech — disable affinity for this turn
  if (g.aldricAffinityDisabled) return false;
  const r = Number(roll);
  if (affinity === 'even') return r % 2 === 0;
  if (affinity === 'odd') return r % 2 !== 0;
  if (affinity === 'high') return r >= 6;
  if (affinity === 'gambler') return true;
  if (affinity === 'extreme') {
    // Use currentDieType max if available, fall back to diceMax
    const thisDieMax = (g.currentDieType && g.currentDieType.max) ? g.currentDieType.max : g.diceMax;
    return r === 1 || r === thisDieMax;
  }
  return false;
}

function useReroll() {
  if (G.rerollUsed && !G.aldricInfiniteReroll) return;
  SFX.reroll();
  if (!G.aldricInfiniteReroll) {
    G.rerollUsed = true;
    document.getElementById('reroll-btn').disabled = true;
    const mBtn = document.getElementById('m-reroll-btn');
    if (mBtn) mBtn.disabled = true;
  }
  rollDice(G);
  if (G.aldricInfiniteReroll) {
    showMsg('🔱 The Sigil — infinite rerolls active!');
  } else {
    showMsg('Reroll used!');
  }
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

function noteRunDamageDealt(g, amount) {
  if (!g.runStats || amount <= 0) return;
  g.runStats.totalDamageDealt += amount;
}

function noteRunHighestBlock(g) {
  if (!g.runStats) return;
  g.runStats.highestBlock = Math.max(g.runStats.highestBlock || 0, g.block || 0);
}

function noteRunFinalBlow(g, amount) {
  if (!g.runStats || amount <= 0) return;
  if (g.hp <= 0) {
    g.runStats.finalBlowDamage = amount;
  }
}

function playCard(cardKey) {
  const card = CARDS[cardKey];
  if (!card) return;

  // Apply Mana Surge cost reduction if active (only on the NEXT card after Mana Surge)
  var actualCost = card.cost;
  if (G._manaSurge && cardKey !== 'manasurge') {
    actualCost = Math.max(0, card.cost - 1);
    G._manaSurge = false; // consume the effect
  }

  if (G.energy < actualCost) { showMsg('Not enough energy!'); return; }
  if (!G.enemy && card.type === 'Attack') { showMsg('No enemy to attack!'); return; }

  SFX.cardPlay();

  G.energy -= actualCost;
  if (G.runStats) G.runStats.cardsPlayed++;
  const roll = G.currentDie || 1;
  card.effect(G, roll);
  G.turnCardsPlayed = (G.turnCardsPlayed || 0) + 1;
  if (G.enemy && G.enemy.hp > 0 && card.type === 'Skill' && G.enemy.special && G.enemy.special.trigger === 'skill') {
    try { G.enemy.special.effect(G); } catch (err) { console.log('skill special ability error', err); }
  }

  // Gambler lucky streak
  if (G.charKey === 'gambler' && roll === G.diceMax && !G.rerollUsed) {
    showMsg('Lucky Streak! Bonus reroll!');
    G.rerollUsed = false;
    setTimeout(() => {
      const btn = document.getElementById('reroll-btn');
      btn.disabled = false;
      btn.innerHTML = '🎲 REROLL <span style="font-size:0.7em;opacity:0.8">(1)</span>';
    }, 100);
  }

  // remove from hand
  const idx = G.hand.indexOf(cardKey);
  if (idx >= 0) {
    G.hand.splice(idx, 1);
    if (card.type === 'Power' || card.exhaust) {
      // Power cards are exhausted — removed from combat, not discarded
      // They stay in the deck for future runs but don't cycle back this combat
      if (!G.exhaustedPile) G.exhaustedPile = [];
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
  if (G._voidChannelSelecting) {
    showMsg('🌀 Finish Void Channel discards first!');
    return;
  }
  if (G.endTurnLocked) return;
  setEndTurnLocked(true);
  const e = G.enemy;

  SFX.endTurn();

  if (G.enemy._phased) {
    G.enemy._phased = false;
  }

  // ── STEP 1: Expire player turn-limited statuses at end of player turn ──
  tickTimedDebuffs(G, 'player');

  renderAll();

  // ── STEP 2: Check if combat already ended ──
  if (G.enemy.hp <= 0) {
    G.discardPile.push(...G.hand);
    G.hand = [];
    renderAll();
    checkCombatEnd();
    return;
  }

  // ── STEP 3: Trigger turn-start special abilities BEFORE enemy acts ──
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
    } catch (err) {
      console.log('special ability error', err);
    }
  } else {
    G.enemy.turnCount = (G.enemy.turnCount || 0) + 1;
  }

  renderAll();

  // ── STEP 4: Enemy acts ──
  if (G.enemy && G.enemy.isAldric) {
    processAldricTurn();
  } else if (e.moves && e.currentMove && typeof e.currentMove.effect === 'function') {
    try {
      e.currentMove.effect(G);

      if (!e._moveHistory) e._moveHistory = [];
      e._moveHistory.push(e.currentMove.name);

      if (e._moveHistory.length > 6) {
        e._moveHistory = e._moveHistory.slice(-6);
      }
    } catch (err) {
      console.log('enemy move error', err);
    }
  } else if (e.intent === 'attack') {
    // fallback for older enemies not yet converted
    let dmg = getModifiedEnemyAttackDamage(G, e.damage);
    const enemyChill = G.statuses.enemy.find(s => s.name === '❄️Chill');
    if (enemyChill && enemyChill.stacks > 0) {
      enemyChill.stacks--;
      if (enemyChill.stacks <= 0) {
        removeStatus(G, 'enemy', '❄️Chill');
      }
    }

    dealDamage(G, 'player', dmg);
  } else if (e.intent === 'defend') {
    const profile = AGGRO_PROFILES[e.aggro] || AGGRO_PROFILES.balanced;
    G.enemy.block += profile.defendBlock;
  }

  renderAll();

  // ── STEP 5: Trigger post-action special abilities ──
  if (G.enemy && G.enemy.special) {
    const sp = G.enemy.special;
    try {
      if (sp.trigger === 'attack') sp.effect(G);
      if (sp.trigger === 'hp') sp.effect(G);
    } catch (err) {
      console.log('special ability error', err);
    }
  }

  // ── STEP 6: End-of-enemy-turn status resolution ──
  tickStatusDamage(G, 'enemy', '☠️Poison');
  tickStatusDamage(G, 'player', '☠️Poison');
  tickTimedDebuffs(G, 'enemy');
  clearExpiredFly(G, 'enemy');

  renderAll();
  checkCombatEnd();
  if (G.hp <= 0 || !G.enemy || G.enemy.hp <= 0) return;

  // ── STEP 7: Choose next move / next intent ──
  if (G.enemy && !G.enemy.isAldric) {
    if (e.moves && typeof chooseMove === 'function') {
      const nextMove = chooseMove(e);
      if (nextMove) {
        e.currentMove = nextMove;
      }
    } else {
      const _profile = AGGRO_PROFILES[G.enemy.aggro] || AGGRO_PROFILES.balanced;
      if (_profile === AGGRO_PROFILES.forced) {
        // forced enemies manage themselves
      } else if (G.enemy.intent === 'defend') {
        G.enemy.intent = 'attack';
      } else {
        const _hurt = G.enemy.hp / G.enemy.maxHp < 0.4;
        const _playerLow = G.hp / G.maxHp < 0.3;
        let _defendChance = _hurt ? _profile.hurtDefendChance : _profile.defendChance;
        if (G.enemy.aggro === 'balanced' && _playerLow) {
          _defendChance = Math.min(_defendChance, 0.05);
        }
        G.enemy.intent = Math.random() < _defendChance ? 'defend' : 'attack';
      }
    }
  }

  if (typeof updateIntent === 'function') {
    updateIntent();
  }

  // ── STEP 8: Discard hand, check end, start next turn ──
  G.discardPile.push(...G.hand);
  G.hand = [];
  clearVoidChannelSelection();

  renderAll();
  checkCombatEnd();

  if (G.hp <= 0 || !G.enemy || G.enemy.hp <= 0) return;
  setTimeout(startTurn, 300);
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
function dealDamage(g, target, amount) {
  const playerEl = document.getElementById('player-combatant');
  const enemyEl = document.getElementById('enemy-combatant');

  if (target === 'enemy' && g.enemy) {
    if (g.enemy._phased) {
      showMsg(`${g.enemy.emoji || '👻'} ${g.enemy.name} is phased and ignores the hit!`);
      floatDamage('enemy-combatant', 'IMMUNE', 'block');
      setTimeout(() => {
        renderAll();
      }, 140);
      return;
    }
    amount = getModifiedPlayerAttackDamage(g, amount, true);

     // Stone Skin — absorb incoming damage before block/HP
    if (g.enemy._stoneShield && g.enemy._stoneShield > 0) {
      const absorbed = Math.min(amount, g.enemy._stoneShield);
      amount -= absorbed;
      g.enemy._stoneShield -= absorbed;
      showMsg(`🪨 Stone Skin absorbs ${absorbed}!`);

      if (g.enemy._stoneShield <= 0) {
        g.enemy._stoneShield = 0;
      }
    }

    const pen = Math.max(0, amount - g.enemy.block);
    g.enemy.block = Math.max(0, g.enemy.block - amount);
    g.enemy.hp -= pen;
    noteRunDamageDealt(g, pen);
    SFX.attack();
    playAttackAnimation({
      attackerEl: playerEl,
      targetEl: enemyEl,
      style: 'slash'
    });

    floatDamage('enemy-combatant', pen || amount, 'dmg');
    
    // Aldric Stone Heart decay on total incoming damage, even if block absorbs it
    if (g.enemy && g.enemy.isAldric && g.aldricPhase === 1 && amount > 0) {
      g.aldricTotalDamage = (g.aldricTotalDamage || 0) + amount;
      const decayThreshold = 60;
      const decayCount = Math.floor(g.aldricTotalDamage / decayThreshold);
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
    amount = applyPlayerIncomingDamageModifiers(g, amount);
    const pen = Math.max(0, amount - g.block);
    g.block = Math.max(0, g.block - amount);
    g.hp -= pen;
    noteRunFinalBlow(g, pen);
    if (pen > 0) SFX.playerHurt();
    playAttackAnimation({
      attackerEl: enemyEl,
      targetEl: playerEl,
      style: 'slash'
    });

    floatDamage('player-combatant', pen || amount, 'dmg');
  }
    setTimeout(() => {
    renderAll();
  }, 140);
}

function gainBlock(g, target, amount) {
  if (target === 'player') {
    g.block += amount;
    noteRunHighestBlock(g);
    floatDamage('player-combatant', amount, 'block');
    SFX.block();
  }
  renderAll();
}

function healPlayer(g, amount) {
  g.hp = Math.min(g.maxHp, g.hp + amount);
  SFX.heal();
  floatDamage('player-combatant', amount, 'heal');
  renderAll();
}

function applyStatus(g, target, name, stacks) {
  if (name === '💢Rage') name = '💢Strength';
  const arr = g.statuses[target];
  const ex = arr.find(s => s.name === name);
  const isTimedDebuff = name === '😵Weak' || name === '🫗Vulnerable';
  const isFly = name === '🦇Fly';
  const turnKey = target === 'player' ? 'appliedOnPlayerTurn' : 'appliedOnEnemyTurn';
  const currentTurn = target === 'player' ? g.turn : ((g.enemy && g.enemy.turnCount) || 0);

  if (name === '💚Regen' && target === 'player') {
    stacks = Math.min(stacks, 10);
  }

  if (ex) {
    ex.stacks += stacks;
    if (name === '💚Regen' && target === 'player') {
      ex.stacks = Math.min(ex.stacks, 10);
    }
    if (isTimedDebuff || isFly) {
      ex[turnKey] = currentTurn;
    }
  } else {
    const status = { name, stacks };
    if (isTimedDebuff || isFly) {
      status[turnKey] = currentTurn;
    }
    arr.push(status);
  }
  renderAll();
}

function drawCards(g, n) {
  if (n > 0) SFX.cardDraw();
  for (let i = 0; i < n; i++) {
    if (g.drawPile.length === 0) {
      if (g.discardPile.length > 0) {
        const exh = g.exhaustedPile || [];
        g.drawPile = shuffle(g.discardPile.filter(k => !exh.includes(k)));
        g.discardPile = [];
        showMsg('🔀 Deck reshuffled.');
      }
    }
    if (g.drawPile.length > 0) {
      g.hand.push(g.drawPile.pop());
    }
  }
}

function shuffleDeck() {
  const exhausted = G.exhaustedPile || [];
  G.drawPile = shuffle(G.deck.filter(k => !exhausted.includes(k)));
  G.discardPile = [];
  G.hand = [];
}

function checkCombatEnd() {
  if (G.hp <= 0) {
    G.runSouls += G.souls;
    SFX.gameOver();
    setTimeout(showGameOver, 600);
    return;
  }
  if (G.enemy && G.enemy.hp <= 0) {
    G.enemy.hp = 0;
    G.gold += G.enemy.reward;
    G.souls += G.enemy.souls;
    G.runSouls += G.enemy.souls;
    SFX.enemyDie();
    if (G.enemy.reward > 0) setTimeout(() => SFX.gold(), 300);

    document.getElementById('enemy-sprite').classList.add('dying');

    if (G.inBoss) {
      const boss = G.map[G.currentFloor].boss;
      G.cores.push(boss.charKey);
      renderCores();
      showMsg(`Core of ${G.char.name} — collected!`);
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

// ── Enemy move helpers ──
// Deals damage from enemy to player, handles block + Rage + animations
function _emAtk(g, dmg) {
  dmg = getModifiedEnemyAttackDamage(g, dmg);
  const chill = g.statuses.enemy.find(s => s.name === '❄️Chill');
  if (chill && chill.stacks > 0) {
    chill.stacks--;
    if (chill.stacks <= 0) {
      removeStatus(g, 'enemy', '❄️Chill');
    }
  }
  const net = Math.max(0, dmg - g.block);
  g.block = Math.max(0, g.block - dmg);
  if (net > 0) g.hp -= net;
  noteRunFinalBlow(g, net);
  floatDamage('player-combatant', net, 'dmg');
  const ps = document.getElementById('player-sprite');
  if (ps) { ps.classList.add('shake'); setTimeout(()=>ps.classList.remove('shake'), 300); }
  animateSpriteAttack(document.getElementById('enemy-combatant'), 'left');
}

// Picks the next move for a moves-based enemy, respecting constraints
function chooseMove(enemy) {
  // Iron Archer — strict scripted alternating pattern
  if (enemy._scripted) {
    const tc = enemy.turnCount || 0;
    return tc % 2 === 0
      ? enemy.moves.find(m => m.name === 'Aim' && !m.isOpener)
      : enemy.moves.find(m => m.name === 'Volley');
  }

  // Gargoyle Dive skip turn
  if (enemy._skipNext) {
    enemy._skipNext = false;
    return { name:'—', type:'skip', desc:'Recovering...', effect(g){ showMsg(`${g.enemy.emoji} ${g.enemy.name} recovers.`); } };
  }

  const history = enemy._moveHistory || [];

  // Filter: no openers, respect maxStreak constraints
  const valid = enemy.moves.filter(m => {
    if (m.isOpener) return false;
    const c = (enemy.constraints || []).find(x => x.move === m.name);
    if (c) {
      let streak = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i] === m.name) streak++; else break;
      }
      if (streak >= c.maxStreak) return false;
    }
    return true;
  });

  const pool = valid.length ? valid : enemy.moves.filter(m => !m.isOpener);
  const total = pool.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of pool) { r -= (m.weight || 1); if (r <= 0) return m; }
  return pool[pool.length - 1];
}

function updateIntent() {
  if (!G.enemy) return;
  const e = G.enemy;
  const el = document.getElementById('enemy-intent');

  // Moves-based enemy — show named move
  if (e.currentMove) {
    const m = e.currentMove;
    const icon = { attack:'⚔️', block:'🛡', debuff:'💀', burn:'🔥', heal:'💚', buff:'✨', mixed:'⚡', skip:'💤' }[m.type] || '⚡';
    const desc = formatEnemyIntentDamageDesc(G, m.desc);
    el.innerHTML = `${icon} <strong>${m.name}</strong>: ${desc}`;
    return;
  }

  // Legacy aggro-based enemy fallback
  const specialHint = e.special
    ? `<div style="font-size:0.65rem;color:var(--purple2);margin-top:0.2rem;">⚡ ${e.special.name} · <span style="color:var(--text3)">tap for info</span></div>`
    : '';
  if (e.intent === 'attack') {
    const previewDmg = getModifiedEnemyAttackDamage(G, e.damage);
    el.innerHTML = `Preparing: <strong>Attack ${previewDmg}</strong>${specialHint}`;
  } else {
    el.innerHTML = `Preparing: <strong>🛡 Defend</strong>${specialHint}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// REST / SHOP / EVENT
// ═══════════════════════════════════════════════════════════════════

function showRestStop() {
  showScreen('rest-screen');

  // HP display
  const hpPct = Math.round(G.hp / G.maxHp * 100);
  document.getElementById('rest-hp-text').textContent = `${Math.max(0,G.hp)} / ${G.maxHp}`;
  document.getElementById('rest-hp-bar').style.width = hpPct + '%';
  const pctEl = document.getElementById('rest-hp-pct');
  pctEl.textContent = hpPct + '%';
  pctEl.className = 'rest-hp-pct ' + (hpPct <= 30 ? 'hp-low' : hpPct <= 60 ? 'hp-mid' : 'hp-full');

  // Heal amount
  const healAmt = Math.floor(G.maxHp * 0.3);
  const atFull = G.hp >= G.maxHp;

  const opts = document.getElementById('rest-options');
  opts.innerHTML = '';
  const options = [
    {
      key: 'rest',
      emoji: '❤️', name: 'Rest',
      desc: atFull ? 'Already at full HP.' : `Recover ${healAmt} HP. Leave with ${Math.min(G.hp + healAmt, G.maxHp)}/${G.maxHp} HP.`,
      disabled: atFull,
      action: () => { healPlayer(G, healAmt); showMsg(`Recovered ${healAmt} HP.`); setTimeout(proceedDoors, 800); }
    },
    {
      key: 'upgrade',
      emoji: '⬆️', name: 'Upgrade Card',
      desc: 'Improve 1 card for this run. Maxed cards cannot be upgraded again.',
      action: () => startRestPick('upgrade')
    },
    {
      key: 'remove',
      emoji: '🗑️', name: 'Remove Card',
      desc: 'Remove 1 card from your deck to thin future draws.',
      action: () => startRestPick('remove')
    },
  ];
  options.forEach(o => {
    const el = document.createElement('div');
    el.className = 'rest-option' + (o.disabled ? ' rest-disabled' : '');
    el.dataset.restAction = o.key;
    el.style.opacity = o.disabled ? '0.4' : '1';
    el.style.cursor = o.disabled ? 'not-allowed' : 'pointer';
    el.innerHTML = `<span class="rest-option-emoji">${o.emoji}</span><div class="rest-option-name">${o.name}</div><div class="rest-option-desc">${o.desc}</div>`;
    if (!o.disabled) el.onclick = o.action;
    opts.appendChild(el);
  });

  renderRestDeck(null);
}

function startRestPick(mode) {
  document.getElementById('rest-picking-label').style.display = 'block';
  document.getElementById('rest-picking-label').textContent =
    mode === 'upgrade' ? '✨ Click a card to upgrade it' : '🗑️ Click a card to remove it from your deck';
  document.getElementById('rest-cancel-btn').style.display = 'inline-block';
  // disable options while picking
  document.querySelectorAll('.rest-option').forEach(el => {
    el.style.opacity = '0.3';
    el.style.pointerEvents = 'none';
  });
  renderRestDeck(mode);
}

function cancelRestPick() {
  document.getElementById('rest-picking-label').style.display = 'none';
  document.getElementById('rest-cancel-btn').style.display = 'none';
  document.querySelectorAll('.rest-option').forEach(el => {
    el.style.opacity = '';
    el.style.pointerEvents = '';
  });
  renderRestDeck(null);
}

function renderRestDeck(mode) {
  const grid = document.getElementById('rest-deck-grid');
  grid.innerHTML = '';
  document.getElementById('rest-deck-count').textContent = `${G.deck.length} cards`;

  // Show every card individually — no stacking
  G.deck.forEach((key, idx) => {
    const c = CARDS[key];
    if (!c) return;
    const isSelectable = mode !== null;
    const isDanger = mode === 'remove';
    const isUpgraded = key.endsWith('+');
    const canUpgrade = mode === 'upgrade' && !isUpgraded && CARD_UPGRADES[key];

    const el = document.createElement('div');
    el.className = `rest-deck-card${isSelectable ? ' selectable' : ''}${isDanger ? ' danger' : ''}`;
    if (isSelectable && mode === 'upgrade' && !canUpgrade) {
      el.style.opacity = '0.35';
      el.style.cursor = 'not-allowed';
    }
    if (isUpgraded) el.style.borderColor = 'var(--gold)';

    el.innerHTML = `
      <span class="rest-deck-card-emoji">${c.emoji}</span>
      <div>
        <div class="rest-deck-card-name" style="color:${isUpgraded ? 'var(--gold2)' : ''}">${c.name}</div>
        <div class="rest-deck-card-type">${c.type} · ⚡${c.cost}${isUpgraded ? ' · ✨' : ''}</div>
      </div>
    `;

    if (isSelectable) {
      const capturedIdx = idx;
      const capturedKey = key;
      el.onclick = () => {
        if (mode === 'remove') {
          G.deck.splice(capturedIdx, 1);
          showMsg(`${c.name} removed from deck.`);
          cancelRestPick();
          setTimeout(proceedDoors, 600);
        } else if (mode === 'upgrade') {
          if (!canUpgrade) { showMsg(`${c.name} cannot be upgraded further.`); return; }
          const success = upgradeCard(capturedKey);
          if (success) {
            showMsg(`✨ ${c.name} → ${(CARD_UPGRADES[capturedKey] && CARD_UPGRADES[capturedKey].name ? CARD_UPGRADES[capturedKey].name : capturedKey + '+')}!`);
            cancelRestPick();
            setTimeout(proceedDoors, 600);
          } else {
            showMsg(`${c.name} cannot be upgraded.`);
          }
        }
      };
    }
    grid.appendChild(el);
  });
}

function showShop() {
  showScreen('shop-screen');

  const shopScreen = document.getElementById('shop-screen');
  if (shopScreen && !document.getElementById('shop-flavor')) {
    const sub = document.createElement('p');
    sub.id = 'shop-flavor';
    sub.className = 'shop-sub';
    sub.textContent = 'A careful trader watches your wounds, your gold, and the gaps in your deck.';
    const title = shopScreen.querySelector('.shop-title');
    if (title) title.insertAdjacentElement('afterend', sub);
  }
  if (shopScreen && !document.getElementById('shop-picking-row')) {
    const deckSection = shopScreen.querySelector('.rest-deck-section');
    const titleRow = deckSection?.querySelector('.rest-deck-title');
    if (deckSection && titleRow) {
      const pickRow = document.createElement('div');
      pickRow.id = 'shop-picking-row';
      pickRow.className = 'shop-picking-row';
      pickRow.style.display = 'none';
      pickRow.innerHTML = `
        <div class="rest-picking-label" id="shop-picking-label">🗑️ Click a card below to remove it from your deck</div>
        <button class="btn rest-cancel-btn" id="shop-cancel-btn" type="button">Cancel</button>
      `;
      deckSection.insertBefore(pickRow, titleRow.nextSibling);
      document.getElementById('shop-cancel-btn').onclick = cancelShopRemovePick;
    }
  }
  G.shopPickMode = null;
  G.shopPendingRemove = null;

  // HP display
  const hpPct = Math.round(G.hp / G.maxHp * 100);
  document.getElementById('shop-hp-text').textContent = `${Math.max(0, G.hp)} / ${G.maxHp}`;
  document.getElementById('shop-hp-bar').style.width = hpPct + '%';
  const pctEl = document.getElementById('shop-hp-pct');
  pctEl.textContent = hpPct + '%';
  pctEl.className = 'rest-hp-pct ' + (hpPct <= 30 ? 'hp-low' : hpPct <= 60 ? 'hp-mid' : 'hp-full');
  const hpPanel = document.getElementById('shop-hp-text')?.closest('.rest-hp-panel');
  if (hpPanel) hpPanel.classList.toggle('shop-hp-danger', hpPct <= 30);

  // Gold
  document.getElementById('shop-gold-display').textContent = G.gold;

  // Items
  const items = document.getElementById('shop-items');
  items.innerHTML = '';
  const pool = shuffle([...SHOP_ITEMS]).slice(0, 4);
  const describeShopItem = (item) => {
    if (item.name === 'Healing Potion') return 'Restore 20 HP to stabilize before the next fight.';
    if (item.name === 'Card Removal') return 'Remove 1 card from your deck to improve future draws.';
    if (item.name.includes('Die')) return item.desc + ' Changes your active die immediately.';
    if (item.desc.startsWith('Add ')) return item.desc + ' Permanent deck addition.';
    return item.desc;
  };
  pool.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'shop-item';
    el.id = `shop-item-${i}`;
    const canAfford = G.gold >= item.cost;
    if (!canAfford) el.classList.add('shop-item--locked');
    el.setAttribute('aria-disabled', canAfford ? 'false' : 'true');
    const shortfall = Math.max(0, item.cost - G.gold);
    const stateText = canAfford ? 'Ready to buy' : `Need ${shortfall} more gold`;
    el.innerHTML = `<span class="shop-item-emoji">${item.emoji}</span><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${describeShopItem(item)}</div><div class="shop-item-cost">🪙 ${item.cost}</div><div class="shop-item-state">${stateText}</div>`;
    el.onclick = () => {
      if (el.classList.contains('sold')) return;
      if (G.gold < item.cost) { showMsg('Not enough gold!'); return; }
      if (item.name === 'Card Removal') {
        startShopRemovePick(item.cost, i);
        return;
      }
      G.gold -= item.cost;
      item.effect(G);
      const boughtEl = document.getElementById(`shop-item-${i}`);
      boughtEl.classList.add('sold');
      boughtEl.setAttribute('aria-disabled', 'true');
      const stateEl = boughtEl.querySelector('.shop-item-state');
      if (stateEl) stateEl.textContent = 'Sold';
      // refresh gold and HP displays
      document.getElementById('shop-gold-display').textContent = G.gold;
      const newPct = Math.round(G.hp / G.maxHp * 100);
      document.getElementById('shop-hp-text').textContent = `${Math.max(0, G.hp)} / ${G.maxHp}`;
      document.getElementById('shop-hp-bar').style.width = newPct + '%';
      const shopPctEl = document.getElementById('shop-hp-pct');
      shopPctEl.textContent = newPct + '%';
      shopPctEl.className = 'rest-hp-pct ' + (newPct <= 30 ? 'hp-low' : newPct <= 60 ? 'hp-mid' : 'hp-full');
      if (hpPanel) hpPanel.classList.toggle('shop-hp-danger', newPct <= 30);
      renderShopDeck();
      updateHUD();
    };
    items.appendChild(el);
  });

  renderShopDeck();
}

function renderShopDeck() {
  const grid = document.getElementById('shop-deck-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const mode = G.shopPickMode || null;
  const countEl = document.getElementById('shop-deck-count');
  const pickRow = document.getElementById('shop-picking-row');
  if (pickRow) pickRow.style.display = mode === 'remove' ? 'flex' : 'none';
  countEl.textContent = mode === 'remove' ? `${G.deck.length} cards · Select one` : `${G.deck.length} cards`;

  if (mode === 'remove') {
    G.deck.forEach((key, idx) => {
      const c = CARDS[key];
      if (!c) return;
      const isUpgraded = key.endsWith('+');
      const el = document.createElement('div');
      el.className = 'rest-deck-card selectable danger';
      if (isUpgraded) el.style.borderColor = 'var(--gold)';
      el.innerHTML = `
        <span class="rest-deck-card-emoji">${c.emoji}</span>
        <div>
          <div class="rest-deck-card-name" style="color:${isUpgraded ? 'var(--gold2)' : ''}">${c.name}</div>
          <div class="rest-deck-card-type">${c.type} · ⚡${c.cost}${isUpgraded ? ' · ✨' : ''}</div>
        </div>
      `;
      el.onclick = () => confirmShopRemovePick(idx, key);
      grid.appendChild(el);
    });
    return;
  }

  const counts = {};
  G.deck.forEach(k => counts[k] = (counts[k] || 0) + 1);
  [...new Set(G.deck)].forEach(key => {
    const c = CARDS[key];
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'rest-deck-card';
    const isUpgraded = key.endsWith('+');
    el.innerHTML = `
      <span class="rest-deck-card-emoji">${c.emoji}</span>
      <div>
        <div class="rest-deck-card-name" style="color:${isUpgraded ? 'var(--gold2)' : ''}">${c.name}${counts[key] > 1 ? ` x${counts[key]}` : ''}</div>
        <div class="rest-deck-card-type">${c.type} · Cost ${c.cost}${isUpgraded ? ' · <span style="color:var(--gold)">✨ Upgraded</span>' : ''}</div>
      </div>
    `;
    grid.appendChild(el);
  });
}

function leavShop() { proceedDoors(); }

function startShopRemovePick(cost, itemIndex) {
  if (G.deck.length <= 3) { showMsg('Deck too small to remove cards!'); return; }
  G.shopPickMode = 'remove';
  G.shopPendingRemove = { cost, itemIndex };
  document.querySelectorAll('.shop-item').forEach((el, idx) => {
    const isPending = idx === itemIndex && !el.classList.contains('sold');
    el.style.pointerEvents = isPending ? '' : 'none';
    el.style.opacity = isPending ? '1' : '0.35';
  });
  showMsg('🗑️ Choose a card from your deck to remove.');
  renderShopDeck();
}

function cancelShopRemovePick() {
  G.shopPickMode = null;
  G.shopPendingRemove = null;
  document.querySelectorAll('.shop-item').forEach(el => {
    el.style.pointerEvents = '';
    el.style.opacity = '';
  });
  renderShopDeck();
}

function confirmShopRemovePick(deckIdx, key) {
  if (G.shopPickMode !== 'remove' || !G.shopPendingRemove) return;
  const { cost, itemIndex } = G.shopPendingRemove;
  if (G.gold < cost) {
    cancelShopRemovePick();
    showMsg('Not enough gold!');
    return;
  }
  G.gold -= cost;
  G.deck.splice(deckIdx, 1);
  const boughtEl = document.getElementById(`shop-item-${itemIndex}`);
  if (boughtEl) {
    boughtEl.classList.add('sold');
    boughtEl.setAttribute('aria-disabled', 'true');
    const stateEl = boughtEl.querySelector('.shop-item-state');
    if (stateEl) stateEl.textContent = 'Sold';
    boughtEl.style.pointerEvents = 'none';
    boughtEl.style.opacity = '';
  }
  cancelShopRemovePick();
  document.getElementById('shop-gold-display').textContent = G.gold;
  showMsg(`${(CARDS[key] && CARDS[key].name) ? CARDS[key].name : key} removed from deck.`);
  renderShopDeck();
  updateHUD();
}

function showEvent() {
  const ev = rand(EVENTS);
  showScreen('event-screen');
  document.getElementById('event-icon').textContent = ev.icon;
  document.getElementById('event-title').textContent = ev.title;
  document.getElementById('event-desc').textContent = ev.desc;
  const ch = document.getElementById('event-choices');
  ch.innerHTML = '';
  ev.choices.forEach(c => {
    const el = document.createElement('div');
    el.className = 'event-choice';
    el.innerHTML = `${c.text}${c.risk ? `<div class="event-choice-risk">⚠ ${c.risk}</div>` : ''}`;
    el.onclick = () => c.effect(G);
    ch.appendChild(el);
  });
}

function removeCardFromDeck(g) {
  // Legacy fallback: random removal when no picker UI is available.
  if (g.deck.length <= 3) { showMsg('Deck too small to remove cards!'); return; }
  const removable = g.deck.filter(k => k !== 'strike' && k !== 'defend');
  if (removable.length === 0) { showMsg('No cards to remove!'); return; }
  const toRemove = rand(removable);
  const idx = g.deck.indexOf(toRemove);
  g.deck.splice(idx, 1);
  showMsg(`${(CARDS[toRemove] && CARDS[toRemove].name ? CARDS[toRemove].name : toRemove)} removed from deck.`);
  setTimeout(proceedDoors, 800);
}

// ═══════════════════════════════════════════════════════════════════
// REWARD
// ═══════════════════════════════════════════════════════════════════


function showReward() {
  showScreen('reward-screen');
  const pool = document.getElementById('reward-choices');
  pool.innerHTML = '';

  // Build reward pool: 2 class-specific + 1 universal
  const classPool = (CHAR_REWARD_POOLS[G.charKey] || []).filter(k => !G.char.starterDeck.includes(k) || G.deck.filter(x => x === k).length < 2);
  const universalPool = UNIVERSAL_REWARD_CARDS.slice();

  const classPicks = shuffle([...classPool]).slice(0, 2);
  const universalPick = rand(universalPool);

  // avoid duplicates across the 3 picks
  const allPicks = [...new Set([...classPicks, universalPick])].slice(0, 3);
  // pad if needed
  while (allPicks.length < 3) {
    const extra = rand(classPool);
    if (!allPicks.includes(extra)) allPicks.push(extra);
  }

  allPicks.forEach(key => {
    const c = CARDS[key];
    if (!c) return;
    const isUniversal = UNIVERSAL_REWARD_CARDS.includes(key);
    const el = document.createElement('div');
    el.className = 'reward-card';
    el.innerHTML = `
      <div class="card-cost">${c.cost}</div>
      <span class="reward-card-emoji">${c.emoji}</span>
      <div class="reward-card-name">${c.name}</div>
      <div class="reward-card-type">${c.type}${isUniversal ? ' · Universal' : ''}</div>
      <div class="reward-card-desc">${c.desc}</div>
    `;
    el.onclick = () => {
      G.deck.push(key);
      showMsg(`${c.name} added to deck!`);
      if (G.needsPathSelect) { G.needsPathSelect = false; showPathSelect(); }
      else proceedDoors();
    };
    pool.appendChild(el);
  });

  // die option — floor scales die quality
  // Dice rewards are rare — only appear on elite/boss floors or by chance
  const diceFloor = G.currentFloor;
  const availableDice = Object.values(DICE_TYPES).filter(d => {
    if (d.type === 'd6') return false; // always have d6, no point rewarding it
    if (d.type === 'd20') return diceFloor >= 3; // legendary only floor 4
    if (d.type === 'd12') return diceFloor >= 2;
    if (d.type === 'd10') return diceFloor >= 1;
    return true;
  });
  const dieOpt = rand(availableDice) || getDie('d8');
  const currentDieData = getDie(G.activeDie);

  const dieEl = document.createElement('div');
  dieEl.className = 'reward-card';
  dieEl.style.borderColor = '#b8860b';
  dieEl.innerHTML = `
    <span class="reward-card-emoji">${dieOpt.emoji}</span>
    <div class="reward-card-name">${dieOpt.name}</div>
    <div class="reward-card-type">${dieOpt.type} · Rare · Replaces your ${currentDieData.type}</div>
    <div class="reward-card-desc">${dieOpt.desc}<br><br><span style="color:var(--text3);font-size:0.85em">Rolls 1–${dieOpt.max}. Your current die: ${currentDieData.type} (1–${currentDieData.max})</span></div>
  `;
  dieEl.onclick = () => {
    G.activeDie = dieOpt.type;
    G.diceMax = dieOpt.max;
    showMsg(dieOpt.emoji + ' ' + dieOpt.name + ' equipped!');
    if (G.needsPathSelect) { G.needsPathSelect = false; showPathSelect(); }
    else proceedDoors();
  };
  pool.appendChild(dieEl);
}

function giveReward(g, type, rarity) {
  if (type === 'die') {
    const availDice = Object.values(DICE_TYPES).filter(d => d.type !== 'd6' && d.type !== G.activeDie);
    const dieOpt = rand(availDice) || getDie('d8');
    G.activeDie = dieOpt.type;
    G.diceMax = dieOpt.max;
    showMsg(dieOpt.emoji + ' ' + dieOpt.name + ' equipped!');
    setTimeout(proceedDoors, 800);
  } else {
    showReward();
  }
}

function skipReward() {
  if (G.needsPathSelect) { G.needsPathSelect = false; showPathSelect(); }
  else proceedDoors();
}

// ═══════════════════════════════════════════════════════════════════
// BOSS INTRO
// ═══════════════════════════════════════════════════════════════════

function launchFinalBoss() {
  showScreen('combat-screen');
  startAldricFight();
}

function showBossIntro(boss) {
  showScreen('boss-intro-screen');
  document.getElementById('boss-intro-sprite').textContent = boss.emoji;
  document.getElementById('boss-intro-name').textContent = boss.name.toUpperCase();
  document.getElementById('boss-intro-subtitle').textContent = boss.title;
  document.getElementById('boss-intro-hint').textContent = boss.hint;
}

// ═══════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════
