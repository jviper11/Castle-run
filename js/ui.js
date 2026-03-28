function renderAll() {
  renderHP();
  renderHand();
  renderEnergy();
  renderStatuses();
  updateHUD();
  updateIntent();
  syncMobileDice();
}

function renderHP() {
  const pct = v => Math.max(0, Math.min(100, v)) + '%';
  const playerBlockValue = document.querySelector('#player-block-display .block-display-value') || document.getElementById('player-block-text');
  const enemyBlockValue = document.querySelector('#enemy-block-display .block-display-value') || document.getElementById('enemy-block-text');
  document.getElementById('player-hp-text').textContent = `${Math.max(0,G.hp)}/${G.maxHp}`;
  document.getElementById('player-hp-bar').style.width = pct(G.hp / G.maxHp * 100);
  const playerBlockDisplay = document.getElementById('player-block-display');
  if (playerBlockValue) playerBlockValue.textContent = G.block;
  if (playerBlockDisplay) {
    playerBlockDisplay.classList.toggle('is-empty', G.block <= 0);
    playerBlockDisplay.setAttribute('aria-label', `Block ${G.block}`);
  }

  if (G.enemy) {
    document.getElementById('enemy-hp-text').textContent = `${Math.max(0,G.enemy.hp)}/${G.enemy.maxHp}`;
    document.getElementById('enemy-hp-bar').style.width = pct(G.enemy.hp / G.enemy.maxHp * 100);
    const enemyBlockDisplay = document.getElementById('enemy-block-display');
    if (enemyBlockValue) enemyBlockValue.textContent = G.enemy.block;
    if (enemyBlockDisplay) {
      const hasBlock = G.enemy.block > 0;
      enemyBlockDisplay.hidden = !hasBlock;
      enemyBlockDisplay.classList.toggle('is-empty', !hasBlock);
      enemyBlockDisplay.setAttribute('aria-label', `Block ${G.enemy.block}`);
    }
  }
}

function getCompactCardSummary(card) {
  if (!card || !card.desc) return '';
  const desc = card.desc.replace(/\s+/g, ' ').trim();

  let match = desc.match(/^Deal (\d+) dmg twice\./i);
  if (match) return `${match[1]} dmg x2`;

  match = desc.match(/^Deal (\d+) damage?\./i);
  if (match) return `Deal ${match[1]} dmg`;

  match = desc.match(/^Deal (\d+) dmg\./i);
  if (match) return `Deal ${match[1]} dmg`;

  match = desc.match(/^Deal (\d+) dmg to enemy (\d+) times\./i);
  if (match) return `${match[1]} dmg x${match[2]}`;

  match = desc.match(/^Deal (\d+) dmg, heal (\d+) HP\./i);
  if (match) return `${match[1]} dmg + ${match[2]} heal`;

  match = desc.match(/^Deal (\d+) dmg\..*apply (\d+) Poison\./i);
  if (match) return `${match[1]} dmg + ${match[2]} Poison`;

  match = desc.match(/^Deal (\d+) dmg\..*apply (\d+) Burn\./i);
  if (match) return `${match[1]} dmg + ${match[2]} Burn`;

  match = desc.match(/^Deal (\d+) dmg\..*apply (\d+) Chill\./i);
  if (match) return `${match[1]} dmg + ${match[2]} Chill`;

  match = desc.match(/^Deal (\d+) dmg\..*Gain (\d+) Souls\./i);
  if (match) return `${match[1]} dmg + ${match[2]} Souls`;

  match = desc.match(/^Gain (\d+) Block\./i);
  if (match) return `Gain ${match[1]} Block`;

  match = desc.match(/^Draw (\d+) cards?\./i);
  if (match) return `Draw ${match[1]}`;

  match = desc.match(/^Draw (\d+) card\..*discard 1\./i);
  if (match) return `Draw ${match[1]} then discard`;

  match = desc.match(/^Flip: triple roll or keep current\./i);
  if (match) return 'Triple roll flip';

  match = desc.match(/^Roll 4-6: deal (\d+)\. Roll 2-3: deal (\d+)\./i);
  if (match) return `${match[2]}-${match[1]} gamble`;

  const firstClause = desc.split('. ')[0]
    .replace(/^Deal /i, '')
    .replace(/^Gain /i, 'Gain ')
    .replace(/^Draw /i, 'Draw ')
    .replace(/ damage/ig, ' dmg')
    .replace(/ dmg/ig, ' dmg')
    .replace(/ cards?/ig, '')
    .replace(/ HP/ig, ' heal')
    .replace(/\.+$/g, '');
  return firstClause;
}

function ensureMobileCardPreview() {
  let preview = document.getElementById('mobile-card-preview');
  if (!preview) {
    const combatScreen = document.getElementById('combat-screen');
    if (!combatScreen) return null;
    preview = document.createElement('div');
    preview.id = 'mobile-card-preview';
    preview.className = 'mobile-card-preview';
    combatScreen.appendChild(preview);
  }
  return preview;
}

function getAffinityPreviewLabel(affinityBonus) {
  const labels = {
    odd: 'Odd roll bonus',
    even: 'Even roll bonus',
    high: 'High roll bonus',
    extreme: 'Extreme roll bonus',
    gambler: 'Roll-value bonus'
  };
  return labels[affinityBonus] || 'Conditional bonus';
}

function renderHand() {
  const area = document.getElementById('hand-area');
  // remove old cards
  area.querySelectorAll('.card, .hand-choice-indicator').forEach(c => c.remove());
  const preview = ensureMobileCardPreview();
  if (preview) {
    preview.classList.remove('active');
    preview.innerHTML = '';
  }

  const mobileLandscape = !!(window.matchMedia && window.matchMedia('(max-width: 1100px) and (orientation: landscape)').matches);
  const selectedStillValid =
    Number.isInteger(G.selectedHandIndex) &&
    G.selectedHandIndex >= 0 &&
    G.selectedHandIndex < G.hand.length &&
    G.hand[G.selectedHandIndex] === G.selectedHandKey;
  if (!selectedStillValid) {
    G.selectedHandIndex = null;
    G.selectedHandKey = null;
  }

  const roll = G.currentDie || 1;
  const pendingDiscard = G.pendingCombatChoice && G.pendingCombatChoice.type === 'discard';
  if (pendingDiscard) {
    const indicator = document.createElement('div');
    indicator.className = 'hand-choice-indicator';
    indicator.textContent = G.pendingCombatChoice.prompt || 'Choose a card to discard.';
    area.insertBefore(indicator, area.querySelector('.end-turn-btn'));
  }
  let selectedEl = null;
  G.hand.forEach((key, index) => {
    const c = CARDS[key];
    if (!c) return;
    const el = document.createElement('div');
    const affinityActive = c.dice && checkAffinity(G, roll, c.affinityBonus);
    const isSelected = mobileLandscape && G.selectedHandIndex === index && G.selectedHandKey === key;
    el.className = `card${c.dice ? ' dice-card' : ''}${affinityActive ? ' affinity-active' : ''}${mobileLandscape ? ' mobile-compressed' : ''}${isSelected ? ' selected' : ''}`;
    el.style.setProperty('--card-index', index);
    // Calculate actual cost accounting for Mana Surge
    const actualCost = (G._manaSurge && key !== 'manasurge') ? Math.max(0, c.cost - 1) : c.cost;
    const costStyle = (G._manaSurge && key !== 'manasurge' && c.cost > 0) ? 'background:#2980b9' : '';
    // Use actualCost for playability — not raw c.cost
    const canPlay = G.energy >= actualCost && !G._voidChannelSelecting;
    if (!canPlay) el.classList.add('unplayable');

    // Build dynamic description
const weakStatus2 = G.statuses?.player?.find(s => s.name === '😵Weak');
const isWeak2 = c.type === 'Attack' && weakStatus2 && weakStatus2.stacks > 0;

let displayDesc = c.desc;

if (c.type === 'Attack') {
  displayDesc = c.desc.replace(/\b(deal)\s+(\d+)/gi, (match, verb, num) => {
    const base = parseInt(num, 10);
    const shown = getModifiedPlayerAttackDamage(G, base);

    if (shown === base) {
      return `${verb} ${shown}`;
    }

    const color = shown > base ? '#e74c3c' : '#7fb3d3';
    return `${verb} <span style="color:${color};font-weight:bold">${shown}</span> <span style="text-decoration:line-through;opacity:0.5;font-size:0.85em">${base}</span>`;
  });
}

const weakIndicator = isWeak2
  ? '<div style="font-size:0.5rem;color:#7fb3d3;text-align:center;margin-top:0.1rem;">😵 WEAK</div>'
  : '';

    const compactSummary = getCompactCardSummary(c);
    const previewConditionText = c.dice ? `🎲 ${getAffinityPreviewLabel(c.affinityBonus)}` : '';
    const previewBonusText = c.dice
      ? (affinityActive ? 'Bonus Active on this roll' : 'Bonus inactive on this roll')
      : '';
    const previewPlayHint = canPlay ? 'Tap selected card again to play' : `Need ${actualCost} Energy`;
    el.innerHTML = `
  <div class="card-cost" style="${costStyle}">${actualCost}</div>
  <span class="card-emoji">${c.emoji}</span>
  <div class="card-name">${c.name}</div>
  <div class="card-compact-summary">${compactSummary}</div>
  <div class="card-type">${c.type}</div>
  <div class="card-desc">${displayDesc}</div>
  ${weakIndicator}
  ${c.dice ? `<div class="card-dice-req">🎲 ${affinityActive ? '✨ Bonus Active!' : c.affinityBonus + ' roll'}</div>` : ''}
`;
    if (pendingDiscard) {
      el.classList.remove('unplayable');
      el.classList.add('discard-select');
      el.style.cursor = 'pointer';
      G.selectedHandIndex = null;
      G.selectedHandKey = null;
      el.onclick = () => choosePendingCombatCard(key);
    } else if (G._voidChannelSelecting) {
      // In void channel discard mode — every card is clickable to discard
      el.classList.remove('unplayable');
      el.style.borderColor = '#8b0000';
      el.style.opacity = '0.75';
      el.style.cursor = 'pointer';
      G.selectedHandIndex = null;
      G.selectedHandKey = null;
      el.onclick = () => pickVoidChannelCard(G, key, el, G._voidChannelNeeded);
    } else if (mobileLandscape) {
      el.onclick = () => {
        const alreadySelected = G.selectedHandIndex === index && G.selectedHandKey === key;
        if (alreadySelected && canPlay) {
          G.selectedHandIndex = null;
          G.selectedHandKey = null;
          playCard(key);
          return;
        }
        G.selectedHandIndex = index;
        G.selectedHandKey = key;
        renderHand();
      };
    } else if (canPlay) {
      el.onclick = () => playCard(key);
    }
    if (isSelected) selectedEl = el;
    if (isSelected && preview && !pendingDiscard && !G._voidChannelSelecting) {
      preview.classList.add('active');
      preview.innerHTML = `
        <div class="mobile-card-preview-inner${affinityActive ? ' affinity-active' : ''}">
          <div class="mobile-card-preview-cost" style="${costStyle}">${actualCost}</div>
          <div class="mobile-card-preview-emoji">${c.emoji}</div>
          <div class="mobile-card-preview-name">${c.name}</div>
          <div class="mobile-card-preview-type">${c.type}</div>
          ${previewConditionText ? `<div class="mobile-card-preview-condition">${previewConditionText}</div>` : ''}
          <div class="mobile-card-preview-desc">${displayDesc}</div>
          ${weakIndicator}
          ${previewBonusText ? `<div class="mobile-card-preview-bonus">${previewBonusText}</div>` : ''}
          <div class="mobile-card-preview-hint">${previewPlayHint}</div>
        </div>
      `;
    }
    area.insertBefore(el, area.querySelector('.end-turn-btn'));
  });

  if (selectedEl) {
    requestAnimationFrame(() => {
      selectedEl.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  }
}

function renderEnergy() {
  // Energy in HUD
  const hudEnergy = document.getElementById('hud-energy-val');
  if (hudEnergy) hudEnergy.textContent = `${G.energy}/${G.maxEnergy}`;
  // Draw/discard in HUD
  const hudDraw = document.getElementById('hud-draw-val');
  const hudDisc = document.getElementById('hud-disc-val');
  if (hudDraw) hudDraw.textContent = G.drawPile ? G.drawPile.length : 0;
  if (hudDisc) hudDisc.textContent = G.discardPile ? G.discardPile.length : 0;

  const rerollBtn = document.getElementById('reroll-btn');
  rerollBtn.disabled = G.rerollUsed;
  const rerollsLeft = G.rerollUsed ? 0 : 1;
  rerollBtn.innerHTML = `🎲 REROLL <span style="font-size:0.7em;opacity:0.8">(${rerollsLeft})</span>`;
  renderDicePool();
}

function syncMobileDice() {
  const srcDie = document.getElementById('current-die');
  const mDie = document.getElementById('m-current-die');
  if (mDie && srcDie) {
    mDie.textContent = srcDie.textContent;
    // copy affinity-match only — skip 'rolling' to prevent layout shake on mobile
    mDie.className = 'die' + (srcDie.classList.contains('affinity-match') ? ' affinity-match' : '');
  }
  const srcLabel = document.getElementById('affinity-label');
  const mLabel = document.getElementById('m-affinity-label');
  if (mLabel && srcLabel) mLabel.textContent = srcLabel.textContent;
  const srcPool = document.getElementById('dice-pool-display');
  const mPool = document.getElementById('m-dice-pool');
  if (mPool && srcPool) mPool.innerHTML = srcPool.innerHTML;
  const srcReroll = document.getElementById('reroll-btn');
  const mReroll = document.getElementById('m-reroll-btn');
  if (mReroll && srcReroll) {
    mReroll.disabled = srcReroll.disabled;
    mReroll.innerHTML = srcReroll.innerHTML;
  }
}

function renderDicePool() {
  const el = document.getElementById('dice-pool-display');
  if (!el) return;
  const die = getDie(G.activeDie || 'd6');
  el.innerHTML = '';
  const pip = document.createElement('div');
  pip.style.cssText = 'font-size:0.7rem;font-family:Cinzel,serif;color:var(--gold);background:rgba(201,168,76,0.12);border:1px solid var(--gold);border-radius:3px;padding:0.15rem 0.4rem;white-space:nowrap;cursor:default;';
  pip.textContent = die.emoji + ' ' + die.type;
  pip.title = die.name + ' — ' + die.desc;
  el.appendChild(pip);
}

function renderStatuses() {
  const STATUS_ICONS = {
    '☠️Poison': '☠',
    '🔥Burn': '🔥',
    '❄️Chill': '❄',
    '😵Weak': '😵',
    '🫗Vulnerable': '🫗',
    '💢Strength': '💢',
    '💚Regen': '💚',
    '🦇Fly': '🦇'
  };
  ['player','enemy'].forEach(t => {
    const el = document.getElementById(`${t}-status`);
    if (!el) return;
    el.innerHTML = G.statuses[t].map(s => {
      const glyph = STATUS_ICONS[s.name] || (s.name ? s.name.split(/[\sA-Z]/)[0] : '?');
      const label = `${s.name.replace(/^[^\p{L}\p{N}]+/u, '').trim()} ${s.stacks}`.trim();
      return `<span class="status-icon" aria-label="${label}" title="${label}"><span class="status-icon-glyph">${glyph}</span><span class="status-icon-value">${s.stacks}</span></span>`;
    }).join('');
  });
}

function renderCores() {
  const el = document.getElementById('cores-display');
  el.innerHTML = '';
  if (!G.cores || G.cores.length === 0) return;
  G.cores.forEach(charKey => {
    const span = document.createElement('span');
    span.className = 'core-icon collected';
    span.textContent = (CHARACTERS[charKey] && CHARACTERS[charKey].emoji ? CHARACTERS[charKey].emoji : '💠');
    const boss = BOSSES.find(b => b.charKey === charKey);
    span.title = boss ? `Core: ${boss.name}` : 'Core';
    el.appendChild(span);
  });
}

function updateHUD() {
  const floor = G.map ? G.map[G.currentFloor] : null;
  document.getElementById('hud-floor').textContent = `FLOOR ${G.currentFloor + 1}`;
  const roomIdx = floor ? (floor.currentPath === 'A' ? floor.roomIndexA : floor.currentPath === 'B' ? floor.roomIndexB : (floor.roomIndexC || 0)) : 0;
  document.getElementById('hud-room').textContent = `Room ${roomIdx + 1} · Path ${(floor && floor.currentPath ? floor.currentPath : 'A')}`;
  document.getElementById('hud-gold').textContent = G.gold;
  document.getElementById('hud-souls').textContent = G.souls;
}

function updateFloorBG() {
  const bg = document.getElementById('floor-bg');
  bg.className = `floor-bg floor-${G.currentFloor + 1}-bg`;

  // Set floor class on combat screen for torch color changes
  const cs = document.getElementById('combat-screen');
  cs.className = cs.className.replace(/floor-\d/g, '').trim() + ` floor-${G.currentFloor + 1}`;

  // Update torch appearance per floor
  const torchEmojis = ['🔥', '🕯️', '✨', '💀'];
  const tl = document.getElementById('torch-left');
  const tr = document.getElementById('torch-right');
  if (tl) tl.textContent = torchEmojis[G.currentFloor] || '🔥';
  if (tr) tr.textContent = torchEmojis[G.currentFloor] || '🔥';
}

function spawnHintParticles() {
  const container = document.getElementById('hint-particles');
  container.innerHTML = '';

  // check if within 1 room of boss
  const floor = G.map[G.currentFloor];
  const path = floor[`path${floor.currentPath}`];
  const hintIdx = floor.currentPath === 'A' ? floor.roomIndexA : floor.currentPath === 'B' ? floor.roomIndexB : (floor.roomIndexC || 0);
  const roomsLeft = path.length - hintIdx;
  if (roomsLeft > 1) return;

  const boss = floor.boss;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'hint-particle';
    p.textContent = boss.particles;
    p.style.left = Math.random() * 100 + '%';
    p.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
    p.style.animationDuration = (4 + Math.random() * 6) + 's';
    p.style.animationDelay = (Math.random() * 5) + 's';
    p.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
    container.appendChild(p);
  }
}

function floatDamage(parentId, amount, type) {
  if (!amount) return;
  const parent = document.getElementById(parentId);
  if (!parent) return;
  const el = document.createElement('div');
  el.className = `damage-float ${type}`;
  el.textContent = type === 'block' ? `🛡${amount}` : type === 'heal' ? `+${amount}` : `-${amount}`;
  el.style.left = (30 + Math.random() * 40) + '%';
  el.style.top = '20%';
  parent.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ═══════════════════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════════════════

function toggleMap() {
  if (G.pendingCombatChoice) {
    showMsg('Choose a card to discard first!');
    return;
  }
  const overlay = document.getElementById('map-overlay');
  overlay.classList.toggle('active');
  if (overlay.classList.contains('active')) renderMap();
}

function showPathSelect() {
  const floor = G.map[G.currentFloor];
  showScreen('path-screen');
  const canGoBackToHeroes = G.currentFloor === 0 && G.turn === 0 && !G.enemy;
  const backBtn = document.getElementById('path-back-btn');
  if (backBtn) backBtn.style.display = canGoBackToHeroes ? 'inline-flex' : 'none';

  document.getElementById('path-floor-label').textContent = `FLOOR ${G.currentFloor + 1}`;
  document.getElementById('path-subtitle').textContent =
    G.currentFloor === 0
      ? 'Your journey begins. Study the paths ahead and choose one — you are committed until the floor boss.'
      : `Floor ${G.currentFloor + 1}. The castle grows darker. Choose your path carefully.`;

  const container = document.getElementById('path-choices');
  container.innerHTML = '';

  // Build a card for each of 3 paths (A, B, C — we'll add a 3rd path)
  const paths = ['A', 'B', 'C'];
  paths.forEach((pathKey, i) => {
    const pathData = floor[`path${pathKey}`];
    if (!pathData) return;

    const card = document.createElement('div');
    card.className = 'path-card';

    // Count room types for stats
    const typeCounts = {};
    let magicCount = 0;
    pathData.forEach(r => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      if (r.hasMagic) magicCount++;
    });

    // Room icons row
    const allRooms = [...pathData, { type:'boss', hasMagic:false }];
    const roomsHtml = allRooms.map((r, i) => {
      const isBoss = r.type === 'boss';
      const icon = isBoss ? '👑' : roomEmoji(r.type);
      const cls = isBoss ? 'boss-room' : (r.hasMagic ? ' magic' : '');
      const label = isBoss ? 'Floor Boss' : roomLabel(r.type) + (r.hasMagic ? ' + ✨' : '');
      const arrow = i < allRooms.length - 1 ? '<div class="path-room-arrow">▼</div>' : '';
      return `<div class="path-room-row"><div class="path-room-icon ${cls}" title="${label}">${icon}</div>${arrow}</div>`;
    }).join('');

    // Stats summary
    const statParts = [];
    if (typeCounts['rest']) statParts.push(`${typeCounts['rest']} rest`);
    if (typeCounts['shop']) statParts.push(`${typeCounts['shop']} shop`);
    if (typeCounts['elite']) statParts.push(`${typeCounts['elite']} elite`);
    if (magicCount) statParts.push(`${magicCount} ✨ magic`);
    const stats = statParts.length ? statParts.join(' · ') : 'all battles';

    card.innerHTML = `
      <div class="path-card-header">PATH ${pathKey}</div>
      <div class="path-card-rooms">${roomsHtml}</div>
      <div class="path-card-stats">${stats}</div>
      <div class="path-card-boss">💀 ???</div>
    `;

    card.onclick = () => {
      showPathConfirm(pathKey, stats);
    };

    container.appendChild(card);
  });
}

function showPathConfirm(pathKey, stats) {
  const overlay = document.getElementById('path-confirm-overlay');
  document.getElementById('path-confirm-title').textContent = 'Commit to Path ' + pathKey + '?';
  document.getElementById('path-confirm-desc').textContent =
    (stats || 'This path lies ahead.') + ' Once chosen you are committed until the floor boss — unless you find the Mirror.';

  // Set confirm button action
  document.getElementById('path-confirm-yes').onclick = () => {
    const floor = G.map[G.currentFloor];
    floor.currentPath = pathKey;
    floor.roomIndexA = 0;
    floor.roomIndexB = 0;
    floor.roomIndexC = 0;
    G.needsPathSelect = false;
    overlay.classList.remove('visible');
    enterRoom();
  };

  overlay.classList.add('visible');
}

function cancelPathConfirm() {
  document.getElementById('path-confirm-overlay').classList.remove('visible');
}

function startVoidChannelDiscard(g, upgraded) {
  const count = upgraded ? 1 : 2;
  G._voidChannelSelecting = true;
  G._voidChannelNeeded = count;
  G._voidChannelPicked = [];

  // Highlight hand cards as selectable for discard
  showMsg('🌀 Choose ' + count + ' card' + (count > 1 ? 's' : '') + ' to discard...');
  renderHand(); // re-render so onclick handlers update
}

function pickVoidChannelCard(g, key, el, needed) {
  if (!G._voidChannelSelecting) return;

  // Remove from hand and add to picked
  const idx = G.hand.indexOf(key);
  if (idx < 0) return;
  G.hand.splice(idx, 1);
  G.discardPile.push(key);
  G._voidChannelPicked.push(key);

  el.style.opacity = '0.2';
  el.style.pointerEvents = 'none';

  if (G._voidChannelPicked.length >= needed) {
    // Done — double the dice
    G._voidChannelSelecting = false;
    G.currentDie = Math.max(1, Math.min((G.currentDie || 1) * 2, G.diceMax));
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
    showMsg('🌀 Void Channel — dice is now ' + G.currentDie + '!');
    renderAll();
  } else {
    showMsg('🌀 Choose ' + (needed - G._voidChannelPicked.length) + ' more...');
    renderHand();
  }
}

function updateCombatSprites(charKey, enemyKey) {
  var playerEl = document.getElementById('player-sprite');
  var enemyEl = document.getElementById('enemy-sprite');
  var charImageMap = {
    barbarian: GAME_IMAGES.barb_hero,
    mage:      GAME_IMAGES.mage_hero,
    thief:     GAME_IMAGES.thief_hero,
    gambler:   GAME_IMAGES.gambler_hero,
    vampire:   GAME_IMAGES.vampire_hero,
  };
  var bossImageMap = {
    barbarian: GAME_IMAGES.barb_boss,
    mage:      GAME_IMAGES.mage_boss,
    thief:     GAME_IMAGES.thief_boss,
    gambler:   GAME_IMAGES.gambler_boss,
    vampire:   GAME_IMAGES.vampire_boss,
    aldric:    GAME_IMAGES.aldric_p1,
    crimson:   GAME_IMAGES.crimson,
  };

  // Player sprite
  if (charImageMap[charKey]) {
    playerEl.innerHTML = '';
    playerEl.style.backgroundImage = 'url(' + charImageMap[charKey] + ')';
    playerEl.style.backgroundSize = 'contain';
    playerEl.style.backgroundRepeat = 'no-repeat';
    playerEl.style.backgroundPosition = 'center bottom';
    playerEl.style.fontSize = '0';
    playerEl.style.width = '';
    playerEl.style.height = '';
  } else {
    var ch = CHARACTERS[charKey];
    playerEl.style.backgroundImage = 'none';
    playerEl.style.fontSize = '';
    playerEl.style.width = '';
    playerEl.style.height = '';
    playerEl.textContent = ch ? ch.emoji : '?';
  }

  // Enemy sprite
  if (enemyKey && bossImageMap[enemyKey]) {
    enemyEl.innerHTML = '';
    enemyEl.style.backgroundImage = 'url(' + bossImageMap[enemyKey] + ')';
    enemyEl.style.backgroundSize = 'contain';
    enemyEl.style.backgroundRepeat = 'no-repeat';
    enemyEl.style.backgroundPosition = 'center bottom';
    enemyEl.style.fontSize = '0';
    enemyEl.style.width = '160px';
    enemyEl.style.height = '200px';
  } else if (!enemyKey) {
    // Regular enemy — reset to emoji, size based on viewport
    const mobile = window.innerWidth <= 1100;
    enemyEl.style.backgroundImage = 'none';
    enemyEl.style.fontSize = mobile ? '3rem' : '5rem';
    enemyEl.style.width = mobile ? '70px' : '110px';
    enemyEl.style.height = mobile ? '65px' : '95px';
  }
}

function toggleMenu() {
  if (G.pendingCombatChoice) {
    showMsg('Choose a card to discard first!');
    return;
  }
  const menu = document.getElementById('menu-overlay');
  menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
}

// Landscape enforcement for mobile
function checkOrientation() {
  const overlay = document.getElementById('rotate-overlay');
  if (!overlay) return;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile && window.innerHeight > window.innerWidth) {
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
setTimeout(checkOrientation, 100);

function showEnemyInfo(e) {
  if (!G.enemy) return;
  const popup = document.getElementById('enemy-info-popup');
  const en = G.enemy;

  document.getElementById('eip-name').textContent = en.name;
  document.getElementById('eip-hp').textContent = `HP: ${Math.max(0,en.hp)} / ${en.maxHp}  ·  Damage: ${en.damage}`;

  if (en.special) {
    document.getElementById('eip-ability-name').textContent = en.special.name;
    document.getElementById('eip-ability-desc').textContent = en.special.desc;
  } else {
    document.getElementById('eip-ability-name').textContent = 'None';
    document.getElementById('eip-ability-desc').textContent = 'This enemy has no special ability.';
  }

  // Position popup near tap point but keep on screen
  const x = Math.min(e.clientX, window.innerWidth - 300);
  const y = Math.min(e.clientY + 10, window.innerHeight - 200);
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
  popup.classList.add('visible');

  // Auto-hide after 4 seconds or on next tap anywhere
  clearTimeout(popup._hideTimer);
  popup._hideTimer = setTimeout(() => popup.classList.remove('visible'), 4000);
}

// Hide popup when tapping anywhere else
document.addEventListener('click', (e) => {
  const popup = document.getElementById('enemy-info-popup');
  if (popup && !e.target.closest('#enemy-sprite') && !e.target.closest('#enemy-intent')) {
    popup.classList.remove('visible');
  }
});

function toggleDeckViewer() {
  if (G.pendingCombatChoice) {
    showMsg('Choose a card to discard first!');
    return;
  }
  const overlay = document.getElementById('deck-overlay');
  const isOpen = overlay.style.display === 'flex';
  overlay.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) renderDeckViewer();
}

function renderDeckViewer() {
  const rewardMode = document.getElementById('reward-screen')?.classList.contains('active');
  const discardSection = document.getElementById('dv-discard-section');
  const battleSummary = document.getElementById('dv-battle-summary');

  function renderGrid(gridId, cards, countId, label) {
    const grid = document.getElementById(gridId);
    const countEl = document.getElementById(countId);
    if (!grid) return;
    grid.innerHTML = '';
    countEl.textContent = `${cards.length} cards`;
    if (cards.length === 0) {
      grid.innerHTML = `<span style="font-size:0.75rem;color:var(--text3);font-style:italic">Empty</span>`;
      return;
    }
    // Show every card individually — no stacking
    cards.forEach(key => {
      const c = CARDS[key];
      if (!c) return;
      const isUpgraded = key.endsWith('+');
      const el = document.createElement('div');
      el.className = 'rest-deck-card';
      el.style.borderColor = isUpgraded ? 'var(--gold)' : '';
      el.innerHTML = `
        <span style="font-size:1rem">${c.emoji}</span>
        <div>
          <div style="font-family:Cinzel,serif;font-size:0.62rem;color:${isUpgraded ? 'var(--gold2)' : 'var(--gold)'}">
            ${c.name}
          </div>
          <div style="font-size:0.58rem;color:var(--text3)">${c.type} · ⚡${c.cost}${isUpgraded ? ' · ✨' : ''}</div>
        </div>
      `;
      grid.appendChild(el);
    });
  }

  // Full deck (draw + hand + discard combined)
  const fullDeck = [...G.deck];
  renderGrid('dv-deck-grid', fullDeck, 'dv-deck-count', 'DECK');

  if (rewardMode) {
    if (discardSection) discardSection.style.display = 'none';
    if (battleSummary) battleSummary.style.display = 'none';
  } else {
    if (discardSection) discardSection.style.display = '';
    if (battleSummary) battleSummary.style.display = '';
    renderGrid('dv-discard-grid', G.discardPile, 'dv-discard-count', 'DISCARD');
    document.getElementById('dv-draw-count').textContent =
      `Draw pile: ${G.drawPile.length} · Hand: ${G.hand.length} · Discard: ${G.discardPile.length}`;
  }
}

function confirmNewRun() {
  document.getElementById('menu-overlay').style.display = 'none';
  restartGame();
}

function renderMap() {
  const container = document.getElementById('map-floors');
  container.innerHTML = '';

  G.map.forEach((floor, fi) => {
    const el = document.createElement('div');
    el.className = `map-floor${fi === G.currentFloor ? ' current-floor' : ''}${floor.cleared ? ' cleared-floor' : ''}`;

    const label = document.createElement('div');
    label.className = 'map-floor-label';
    label.textContent = `Floor ${fi + 1} ${fi === G.currentFloor ? '← YOU ARE HERE' : floor.cleared ? '✓ Cleared' : ''}`;
    el.appendChild(label);

    ['pathA','pathB','pathC'].forEach((pathKey, pi) => {
      const pathData = floor[pathKey];
      if (!pathData || pathData.length === 0) return;
      const pathLetter = ['A','B','C'][pi];
      const magicCount = floor[`magicCount${pathLetter}`] || 0;
      const isActivePath = fi === G.currentFloor && floor.currentPath === pathLetter;

      const pathLabel = document.createElement('div');
      pathLabel.style.cssText = 'font-size:0.7rem;color:' + (isActivePath ? 'var(--gold)' : 'var(--text3)') + ';margin-bottom:0.3rem;';
      pathLabel.textContent = `Path ${pathLetter}${isActivePath ? ' ← ACTIVE' : ''}${magicCount > 0 ? ' (' + magicCount + ' magic)' : ''}`;
      el.appendChild(pathLabel);

      const pathEl = document.createElement('div');
      pathEl.className = 'map-path';
      const thisIdx = pathLetter === 'A' ? floor.roomIndexA : pathLetter === 'B' ? floor.roomIndexB : (floor.roomIndexC || 0);

      pathData.forEach((room, ri) => {
        const node = document.createElement('div');
        const isCurrent = fi === G.currentFloor && ri === thisIdx && floor.currentPath === pathLetter;
        node.className = `map-node${isCurrent ? ' current' : ''}${room.cleared ? ' cleared' : ''}${room.hasMagic ? ' magic-door' : ''}`;
        node.textContent = roomEmoji(room.type);
        node.title = roomLabel(room.type) + (room.hasMagic ? ' + ✨ Magic Door' : '');
        pathEl.appendChild(node);
        if (ri < pathData.length - 1) {
          const arr = document.createElement('span');
          arr.className = 'map-arrow';
          arr.textContent = '→';
          pathEl.appendChild(arr);
        }
      });

      const bossArr = document.createElement('span');
      bossArr.className = 'map-arrow';
      bossArr.textContent = '→';
      pathEl.appendChild(bossArr);
      const bossNode = document.createElement('div');
      bossNode.className = 'map-node boss-node';
      bossNode.textContent = '👑';
      bossNode.title = floor.cleared ? `Boss: ${floor.boss.name}` : 'Floor Boss — identity unknown';
      pathEl.appendChild(bossNode);

      el.appendChild(pathEl);
    });

    container.appendChild(el);
  });
}

// ═══════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // Clean up any mirror panel when leaving door screen
  if (id !== 'door-screen' && G && G._currentMirrorPanel) {
    G._currentMirrorPanel.remove();
    G._currentMirrorPanel = null;
  }
}

function showCombatScreen() { showScreen('combat-screen'); }

function showAldricEnding() {
  const hasTrueEnding = G.aldricHasRelics;
  const vs = document.getElementById('victory-screen');
  SFX.victory();
  showScreen('victory-screen');

  // Override victory text based on ending
  const title = vs.querySelector('h1') || vs.querySelector('.victory-title');
  const sub = vs.querySelector('p') || vs.querySelector('.victory-sub');

  if (hasTrueEnding) {
    if (title) title.textContent = 'THE CASTLE FALLS';
    if (sub) sub.textContent = '"I… am still here…" — The Vow glows. The walls crumble. Sir Crimson steps forward from the shadows to help Aldric stand. The cycle is broken.';
  } else {
    if (title) title.textContent = 'THE CYCLE CONTINUES…';
    if (sub) sub.textContent = 'Aldric dissipates into shadow. The castle endures. You were not ready. Return when you are.';
  }
}

function getRunLossSummary() {
  const floor = G.map ? G.map[G.currentFloor] : null;
  const path = floor && floor.currentPath ? floor.currentPath : 'A';
  const roomIdx = floor ? (path === 'A' ? floor.roomIndexA : path === 'B' ? floor.roomIndexB : (floor.roomIndexC || 0)) : 0;
  const roomLabel = G.inBoss ? `Boss Room · Path ${path}` : `Room ${roomIdx + 1} · Path ${path}`;

  return [
    { label: 'Hero', value: G.char ? G.char.name : 'Unknown' },
    { label: 'Reached', value: `Floor ${G.currentFloor + 1} · ${roomLabel}` },
    { label: 'Enemy', value: G.enemy ? G.enemy.name : 'Unknown' },
    { label: 'Turns', value: String(G.turn || 0) },
    { label: 'Final Blow', value: G.runStats && G.runStats.finalBlowDamage != null ? `${G.runStats.finalBlowDamage}` : '—' },
    { label: 'Damage Dealt', value: String((G.runStats && G.runStats.totalDamageDealt) || 0) },
    { label: 'Peak Block', value: String((G.runStats && G.runStats.highestBlock) || 0) },
    { label: 'Cards Played', value: String((G.runStats && G.runStats.cardsPlayed) || 0) },
  ];
}

function showGameOver() {
  showScreen('gameover-screen');
  document.getElementById('gameover-souls').textContent = G.runSouls;
  const summary = document.getElementById('gameover-summary');
  if (summary) {
    summary.innerHTML = getRunLossSummary().map(item => (
      `<div class="gameover-stat">
        <span class="gameover-stat-label">${item.label}</span>
        <span class="gameover-stat-value">${item.value}</span>
      </div>`
    )).join('');
  }
}

function showMsg(txt) {
  const el = document.getElementById('message-log');
  el.textContent = txt;
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), 2500);
}

function animateSpriteAttack(attackerEl, direction = 'right') {
  const sprite = attackerEl.querySelector('.combatant-sprite');
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

function spawnProjectileVFX(fromEl, toEl) {
  const layer = document.getElementById('combat-vfx-layer');
  if (!layer || !fromEl || !toEl) return;

  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const arenaRect = layer.getBoundingClientRect();

  const startX = fromRect.left - arenaRect.left + fromRect.width * 0.55;
  const startY = fromRect.top - arenaRect.top + fromRect.height * 0.4;
  const endX = toRect.left - arenaRect.left + toRect.width * 0.4;
  const endY = toRect.top - arenaRect.top + toRect.height * 0.35;

  const proj = document.createElement('div');
  proj.className = 'projectile-vfx';
  proj.style.left = `${startX}px`;
  proj.style.top = `${startY}px`;

  const dx = endX - startX;
  const dy = endY - startY;
  proj.style.transform = `translate(0px, 0px)`;

  proj.animate(
    [
      { transform: 'translate(0px, 0px) scale(0.8)', opacity: 0 },
      { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1 }
    ],
    {
      duration: 350,
      easing: 'linear',
      fill: 'forwards'
    }
  );

  layer.appendChild(proj);
  setTimeout(() => proj.remove(), 380);
}

// ═══════════════════════════════════════════════════════════════════
// TITLE & CHAR SELECT
// ═══════════════════════════════════════════════════════════════════

function hideLoader() {
  var loader = document.getElementById('loading-indicator');
  if (loader) loader.style.display = 'none';
}

function showCharSelect() {
  showScreen('char-screen');
  const grid = document.getElementById('char-grid');
  grid.innerHTML = '';
  Object.entries(CHARACTERS).forEach(([key, ch]) => {
    const el = document.createElement('div');
    el.className = 'char-card';
    el.innerHTML = `
      <span class="char-emoji">${ch.emoji}</span>
      <div class="char-name">${ch.name.toUpperCase()}</div>
      <div class="char-dice">🎲 ${ch.diceLabel}</div>
      <div class="char-desc">${ch.desc}</div>
    `;
    el.style.borderTopColor = ch.color;
    el.onclick = () => { newGame(key); };
    grid.appendChild(el);
  });
}

function backToCharSelect() {
  const canGoBackToHeroes = G && G.currentFloor === 0 && G.turn === 0 && !G.enemy;
  if (!canGoBackToHeroes) return;
  cancelPathConfirm();
  G = {};
  showCharSelect();
}

function restartGame() { showScreen('title-screen'); }
