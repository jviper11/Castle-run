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

const ALDRIC_RELIC_TRIGGERS = [
  { hp: 100, icon: '👑', name: 'THE CROWN',  quote: '"I remember… the throne…"',      effect: 'Aldric loses all Strength.' },
  { hp: 75,  icon: '⚔️', name: 'THE SWORD',  quote: '"I swore to protect..."',           effect: 'Aldric damage is halved.' },
  { hp: 50,  icon: '🔱', name: 'THE SIGIL',  quote: '"The pact... it is breaking..."',   effect: 'Your Reroll is now infinite.' },
  { hp: 25,  icon: '🤝', name: 'THE VOW',    quote: '"I… am still here…"',             effect: 'Aldric stops attacking.' }
];

function startAldricFight() {
  const phase = ALDRIC.phases[0];
  G.aldricPhase = 1;
  G.aldricDamageDealt = 0;
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
  G.inBoss = true;
  G.isFinalBoss = true;

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
    G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '💢Rage');
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

function getMagicHint(type, floor) {
  if (floor === 0) return null; // always hinted on floor 1 (no hint = show type)
  const hints = {
    battle: 'Growling echoes from behind the door. Something stirs.',
    elite: 'The door is cracked. Something stares back through it.',
    event: 'Strange symbols glow faintly across the door surface.',
    shop: 'The scent of candle wax and gold drifts from beneath.',
    rest: 'Warm orange light bleeds under the door.',
  };
  return hints[type] || null;
}

function roomEmoji(type) {
  return { battle:'⚔️', elite:'💀', event:'❓', shop:'🛒', rest:'❤️', boss:'👑' }[type] || '🚪';
}
function roomLabel(type) {
  return { battle:'Battle', elite:'Elite Fight', event:'Strange Event', shop:'Merchant', rest:'Rest Stop', boss:'Floor Boss' }[type] || 'Unknown';
}

// ═══════════════════════════════════════════════════════════════════
// COMBAT
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
    // First 2 rooms of Floor 1 use easy pool
    const isEasy = G.currentFloor === 0 &&
      (G.map[0][`roomIndex${G.map[0].currentPath}`] || 0) < 2;
    pool = isEasy ? EASY_ENEMIES : (FLOOR_ENEMIES[G.currentFloor + 1] || FLOOR_ENEMIES[1]);
  }

  const e = { ...rand(pool) };
  G.enemy = { ...e, maxHp: e.hp, turnCount: 0 };
  G.block = 0;
  G.statuses = { player: [], enemy: [] };
  G.exhaustedPile = [];
  G.inBoss = false;
  G.lastFightWasElite = !!isElite;
  G.phantomBladeFired = false;
  G.extraDraw = 0;
  G.handLimit = 5;
  G.cardsPlayedThisCombat = 0;
  G._ashenCrownFired = false;
  // Relic hooks — start of combat
  if (hasRelic('iron_vambrace')) G.block += 6;
  if (hasRelic('cracked_hourglass')) G.rerollUsed = false;
  if (hasRelic('rusted_chain')) G.statuses.enemy.push({ name:'🫗Vulnerable', stacks:1 });
  if (hasRelic('torn_page')) G.extraDraw += 1;
  if (hasRelic('cursed_hourglass')) { G.extraDraw += 2; G.handLimit = 4; }
  if (hasRelic('hollow_throne')) G.block += 20;

  updateCombatSprites(G.charKey, null);
  document.getElementById('player-name').textContent = G.char.name.toUpperCase();
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
  G.inBoss = true;
  G.phantomBladeFired = false;
  G.extraDraw = 0;
  G.handLimit = 5;
  G.cardsPlayedThisCombat = 0;
  G._ashenCrownFired = false;
  // Relic hooks — start of combat
  if (hasRelic('iron_vambrace')) G.block += 6;
  if (hasRelic('cracked_hourglass')) G.rerollUsed = false;
  if (hasRelic('rusted_chain')) G.statuses.enemy.push({ name:'🫗Vulnerable', stacks:1 });
  if (hasRelic('torn_page')) G.extraDraw += 1;
  if (hasRelic('cursed_hourglass')) { G.extraDraw += 2; G.handLimit = 4; }
  if (hasRelic('hollow_throne')) G.block += 20;

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
  G._spellsThisTurn = 0;
  G._manaSurge = false; // reset each turn
  // Enemy block persists until player damages through it — does NOT reset each turn
  G.rerollUsed = false;
  G.diceRolled = false;
  G._cardsPlayedThisTurn = 0;
  G._shadowMark = 0;
  G._disappearCount = 0;
  G._flyActive = false;
  G._dieSetThisTurn = false;
  G._guaranteedMax = G._guaranteedMax || 0;
  G._minRoll = G._minRoll || (G.charKey === 'gambler' ? 2 : 1);
  G._fallacyCount = G._fallacyCount || 0;
  G._shadowArtistDiscount = 0;
  G._hungerDmgThisTurn = 0;
  G._soulboundTomeFired = false;
  G._firstCardFree = false;

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
  if (activeDieData.bonus === 'max_draw' && roll === activeDieData.max) {
    drawCards(G, 6 + (G.extraDraw || 0));
    renderAll();
    updateIntent();
    return;
  }

  drawCards(G, 5 + (G.extraDraw || 0));
  renderAll();
  updateIntent();
}

function rollDice(g, isInitial = false) {
  let roll = Math.floor(Math.random() * g.diceMax) + 1;

  // Guaranteed max from Loaded House
  if (g._guaranteedMax > 0) { roll = g.diceMax; g._guaranteedMax--; }

  // Min roll enforcement (Gambler min 2, House Edge min 3, d4 Cursed Die min 3)
  const minRoll = g._minRoll || (g.charKey === 'gambler' ? 2 : 1);
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

  // Gambler's Fallacy tracking
  if (g._fallacyCount !== undefined) {
    if (roll === g.diceMax) { g._fallacyCount = 0; }
    else {
      g._fallacyCount++;
      const fallacyThreshold = g._fallacyThreshold || 3;
      if (g._fallacyCount >= fallacyThreshold) { roll = g.diceMax; g._fallacyCount = 0; }
    }
  }

  g.currentDie = roll;
  g.diceRolled = true;

  // Lucky Coin — affinity exact match draws 1 card (Gambler excluded)
  if (hasRelic('lucky_coin') && g.charKey !== 'gambler') {
    const lcMatch = g.charKey === 'mage' ? roll === 6 : checkAffinity(g, roll, g.char.diceAffinity);
    if (lcMatch) {
      drawCards(g, 1);
      showMsg('🍀 Lucky Coin — affinity match! Draw 1!');
    }
  }

  // Lucky Streak — max roll draws 1 card + deals 4 dmg
  const luckyStreak = G.statuses.player.find(s => s.name === '⭐LuckyStreak');
if (roll === g.diceMax && luckyStreak) {
  drawCards(g, 1);
  const dmg = luckyStreak.stacks === 2 ? 6 : 4;
  if (g.enemy) { g.enemy.hp -= dmg; floatDamage('enemy-combatant', dmg, 'dmg'); }
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
  document.getElementById('affinity-label').textContent = isMatch
    ? `✨ ${affinityHint} — Bonus Active!`
    : affinityHint;
  document.getElementById('die-type-label').textContent = (g.currentDieType && g.currentDieType.type ? g.currentDieType.type : 'd6');
  renderHand();
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
  if (G._noReroll) { showMsg('💔 Fractured Die — no rerolls this run!'); return; }
  if (G.rerollUsed && !G.aldricInfiniteReroll) return;
  if (!G.aldricInfiniteReroll) {
    G.rerollUsed = true;
    document.getElementById('reroll-btn').disabled = true;
  }
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

function playCard(cardKey) {
  const card = CARDS[cardKey];
  if (!card) return;

  // Apply Mana Surge cost reduction if active (only on the NEXT card after Mana Surge)
  var actualCost = card.cost;
  if (G._manaSurge && cardKey !== 'manasurge') {
    actualCost = Math.max(0, card.cost - 1);
    G._manaSurge = false; // consume the effect
  }
  // Soulbound Gauntlet — first card each turn costs 0
  if (!G._firstCardFree && hasRelic('soulbound_gauntlet')) { actualCost = 0; G._firstCardFree = true; }

  if (G.energy < actualCost) { showMsg('Not enough energy!'); return; }
  if (!G.enemy && card.type === 'Attack') { showMsg('No enemy to attack!'); return; }

  G.energy -= actualCost;
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
  card.effect(G, roll);

  // Spell Echo — repeat Attack effect
if (card.type === 'Attack' && G._spellEcho > 0) {
  G._spellEcho--;
  card.effect(G, roll);
  showMsg('🔮 Spell Echo — attack triggered twice!');
}
if (G.statuses.player.find(s => s.name === '👑BloodLord') && card.type === 'Attack') {
  const lordStacks = G.statuses.player.find(s => s.name === '👑BloodLord');
  const healAmt = lordStacks.stacks === 2 ? 3 : 2; // + version heals 3, base heals 2
  healPlayer(G, healAmt);
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
    if (card.type === 'Power') {
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
  const e = G.enemy;

  // ── STEP 1: Burn ticks BEFORE enemy acts ──
  const burn = G.statuses.enemy.find(s => s.name === '🔥Burn');
  if (burn) {
    G.enemy.hp -= burn.stacks;
    floatDamage('enemy-combatant', burn.stacks, 'dmg');
    burn.stacks--;
    if (burn.stacks <= 0) G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '🔥Burn');
  }

  // ── STEP 2: Vulnerable ticks down ──
  const vuln = G.statuses.enemy.find(s => s.name === '🫗Vulnerable');
  if (vuln) {
    vuln.stacks--;
    if (vuln.stacks <= 0) G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '🫗Vulnerable');
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

  renderAll();

// ── STEP 6: Enemy acts ──
  if (G.enemy && G.enemy.isAldric) {
    processAldricTurn();
  } else if (e.intent === 'attack') {
    let dmg = e.damage;
    const eStrong = G.statuses.enemy.find(s => s.name === '💢Rage');
    if (eStrong) dmg += eStrong.stacks;
    const chillStatus = G.statuses.enemy.find(s => s.name === '❄️Chill');
    if (chillStatus && chillStatus.stacks > 0) {
      const coldMastery = G.statuses.player.find(s => s.name === '❄️ColdMastery');
      const chillReduction = coldMastery ? (coldMastery.stacks === 2 ? 0.50 : 0.65) : 0.75;
      dmg = Math.floor(dmg * chillReduction);
      chillStatus.stacks--;
      if (chillStatus.stacks <= 0) G.statuses.enemy = G.statuses.enemy.filter(s => s.name !== '❄️Chill');
    }
    dmg = Math.max(0, dmg - G.block);
    G.block = Math.max(0, G.block - e.damage);
    if (dmg > 0) G.hp -= dmg;
    floatDamage('player-combatant', dmg, 'dmg');
    document.getElementById('player-sprite').classList.add('shake');
    setTimeout(() => document.getElementById('player-sprite').classList.remove('shake'), 300);
  } else if (e.intent === 'defend') {
    G.enemy.block += 8;
  }

  // ── STEP 7: Poison ticks AFTER enemy acts ──
  const poison = G.statuses.enemy.find(s => s.name === '☠️Poison');
  if (poison) {
    G.enemy.hp -= poison.stacks;
    floatDamage('enemy-combatant', poison.stacks, 'dmg');
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
  G.enemy.intent = G.enemy.intent === 'attack' ? (Math.random() < 0.3 ? 'defend' : 'attack') : 'attack';

  // ── STEP 11: Discard hand, check end, start next turn ──
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
function dealDamage(g, target, amount) {
  const playerEl = document.getElementById('player-combatant');
  const enemyEl = document.getElementById('enemy-combatant');

  if (target === 'enemy' && g.enemy) {
    // Phantom Blade — first attack this combat deals +8
    if (!g.phantomBladeFired && hasRelic('phantom_blade')) {
      amount += 8;
      g.phantomBladeFired = true;
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
    const playerWeak = g.statuses.player.find(s => s.name === '😵Weak');
    if (playerWeak && playerWeak.stacks > 0) {
      amount = Math.floor(amount * 0.75);
      playerWeak.stacks--;
      if (playerWeak.stacks <= 0) g.statuses.player = g.statuses.player.filter(s => s.name !== '😵Weak');
    }
    // Also apply Vulnerable — enemy takes 50% more damage
   const enemyVuln = g.statuses.enemy.find(s => s.name === '🫗Vulnerable');
    if (enemyVuln && enemyVuln.stacks > 0) {
    amount = Math.floor(amount * 1.5);
}
    // Pale Contract — all player attacks deal +4 damage
    if (hasRelic('pale_contract')) amount += 4;
    // Gilded Quill — 10th card played this combat deals double damage
    if (g._gildedQuillActive) { amount *= 2; g._gildedQuillActive = false; showMsg('🪶 Gilded Quill — double damage!'); }
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
    const pen = Math.max(0, amount - g.block);
    g.block = Math.max(0, g.block - amount);
    g.hp -= pen;
    // Lucky Rabbit Foot — survive killing blow at 1 HP (fires first)
    if (g.hp <= 0 && hasRelic('lucky_rabbit_foot')) {
      g.hp = 1;
      const rfIdx = g.relics.indexOf('lucky_rabbit_foot');
      if (rfIdx !== -1) g.relics.splice(rfIdx, 1);
      showMsg('🐇 Lucky Rabbit Foot — survived at 1 HP!');
    }
    // Crimson Phylactery — survive killing blow at 1 HP (fires if Rabbit Foot already gone)
    if (g.hp <= 0 && hasRelic('crimson_phylactery')) {
      g.hp = 1;
      const cpIdx = g.relics.indexOf('crimson_phylactery');
      if (cpIdx !== -1) g.relics.splice(cpIdx, 1);
      showMsg('💎 Crimson Phylactery — survived at 1 HP!');
    }

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
    floatDamage('player-combatant', amount, 'block');
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
}

function drawCards(g, n) {
  const limit = g.handLimit || 5;
  for (let i = 0; i < n; i++) {
    if (g.hand.length >= limit) break;
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
    setTimeout(showGameOver, 600);
    return;
  }
  if (G.enemy && G.enemy.hp <= 0) {
    G.enemy.hp = 0;
    G.gold += G.enemy.reward;
    G.souls += G.enemy.souls;
    G.runSouls += G.enemy.souls;
    // Relic hooks — post-combat
    if (hasRelic('bloodsoaked_rag')) healPlayer(G, 3);
    if (hasRelic('ash_pendant'))   { G.souls += 1; G.runSouls += 1; }
    if (hasRelic('tarnished_coin')) G.gold += 5;
    if (G.lastFightWasElite && hasRelic('iron_ration')) healPlayer(G, 5);
    if (G.lastFightWasElite && hasRelic('grave_robber')) { G.gold += 8; showMsg('⚰️ Grave Robber — +8 Gold!'); }

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

function updateIntent() {
  if (!G.enemy) return;
  const e = G.enemy;
  const el = document.getElementById('enemy-intent');
  const specialHint = e.special
    ? `<div style="font-size:0.65rem;color:var(--purple2);margin-top:0.2rem;">⚡ ${e.special.name} · <span style="color:var(--text3)">tap for info</span></div>`
    : '';
  if (e.intent === 'attack') {
    const rawDmg = e.damage;
    const chill = G.statuses.enemy.find(s => s.name === '❄️Chill');
    const coldMastery = G.statuses.player.find(s => s.name === '❄️ColdMastery');
    const chillReduction = coldMastery ? (coldMastery.stacks === 2 ? 0.50 : 0.65) : 0.75;
    const actualDmg = (chill && chill.stacks > 0) ? Math.floor(rawDmg * chillReduction) : rawDmg;
    const dmgDisplay = (chill && chill.stacks > 0)
      ? `<span style="color:#7fb3d3;font-weight:bold">${actualDmg}</span> <span style="text-decoration:line-through;opacity:0.5;font-size:0.85em">${rawDmg}</span>`
      : `${rawDmg}`;
    el.innerHTML = `Preparing: <strong>Attack ${dmgDisplay}</strong>${specialHint}`;
  } else {
    el.innerHTML = `Preparing: <strong>🛡 Defend</strong>${specialHint}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
