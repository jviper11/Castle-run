// ═══════════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════════

let G = {};

// DEBUG ONLY: temporary Floor 2 start shortcut for testing.
function shouldDebugStartFloor2() {
  return window.location.hash === '#debug-floor2';
}

function newGame(charKey) {
  const ch = CHARACTERS[charKey];

  // randomize boss order (excluding chosen char)
  const bossPool = BOSSES.filter(b => b.charKey !== charKey);
  const shuffledBosses = shuffle([...bossPool]);

  // build map: 4 floors, each with 2 paths of 3 nodes + 1 boss
  const map = buildMap(shuffledBosses);

  G = {
    charKey, char: ch,
    hp: ch.hp, maxHp: ch.hp,
    block: 0, energy: 3, maxEnergy: 3,
    gold: 30, souls: 0,
    deck: [...ch.starterDeck],
    drawPile: [], discardPile: [], hand: [],
    activeDie: 'd6',  // single active die — type string key into DICE_TYPES
    currentDie: null, diceMax: 6, diceRolled: false, rerollUsed: false,
    map, currentFloor: 0,
    needsPathSelect: true,
    floorBosses: shuffledBosses,
    cores: [],
    mapBlind: 0,
    statuses: { player: [], enemy: [] },
    enemy: null,
    inBoss: false,
    turn: 0,
    runSouls: 0,
  };

  // start with a d6 in pool
  G.activeDie = 'd6'; // start with standard d6
  G.diceMax = 6;

  // DEBUG ONLY: start directly on Floor 2 when the hash is set.
  if (shouldDebugStartFloor2()) {
    G.currentFloor = 1;
    G.map[0].cleared = true;
    G.map[1].currentPath = 'A';
    G.map[1].roomIndexA = 0;
    G.map[1].roomIndexB = 0;
    G.map[1].roomIndexC = 0;
  }

  renderCores();
  updateHUD();
  G.needsPathSelect = true;
  showPathSelect();
}

function buildMap(bosses) {
  const nodeTypes = ['battle','battle','battle','elite','event','shop','rest'];
  const floors = [];
  for (let f = 0; f < 4; f++) {
    const paths = { A: [], B: [], C: [] };
    const magicCounts = { A: 0, B: 0, C: 0 };
    const roomCount = 13 + Math.floor(Math.random() * 3); // random 13-15 rooms per floor per run

    // Each path gets a guaranteed composition — 15 slots, trimmed to roomCount
    const templates = {
      A: ['battle','battle','rest',  'battle','elite', 'battle','event', 'battle','battle','rest',  'battle','elite', 'battle','event', 'battle'],
      B: ['battle','battle','elite', 'battle','shop',  'battle','rest',  'battle','event', 'battle','battle','shop',  'battle','rest',  'battle'],
      C: ['battle','battle','event', 'battle','battle','rest',  'battle','shop',  'elite', 'battle','battle','event', 'battle','battle','rest' ],
    };

    ['A','B','C'].forEach(pk => {
      const template = templates[pk].slice(0, roomCount);
      // randomise middle rooms while keeping first as battle
      for (let r = 0; r < roomCount; r++) {
        const type = r === 0 ? 'battle' : template[r] || rand(nodeTypes);
        const hasMagic = r > 1 && Math.random() < 0.25; // less frequent, starts from room 3+
        if (hasMagic) magicCounts[pk]++;
        paths[pk].push({ type, hasMagic, cleared: false });
      }
    });

    floors.push({
      pathA: paths.A, pathB: paths.B, pathC: paths.C,
      boss: bosses[f],
      magicCountA: magicCounts.A,
      magicCountB: magicCounts.B,
      magicCountC: magicCounts.C,
      cleared: false,
      currentPath: 'A',
      roomIndexA: 0,
      roomIndexB: 0,
      roomIndexC: 0,
    });
  }
  return floors;
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════

function currentRoomIndex() {
  const floor = G.map[G.currentFloor];
  if (floor.currentPath === 'A') return floor.roomIndexA;
  if (floor.currentPath === 'B') return floor.roomIndexB;
  return floor.roomIndexC || 0;
}

function enterRoom() {
  const floor = G.map[G.currentFloor];
  const path = floor[`path${floor.currentPath}`];
  const roomIdx = currentRoomIndex();

  if (roomIdx >= path.length) {
    showBossIntro(floor.boss);
    return;
  }

  const room = path[roomIdx];
  updateFloorBG();
  spawnHintParticles();
  showCombatScreen();

  if (room.type === 'battle' || room.type === 'elite') {
    startCombat(room.type === 'elite');
  } else if (room.type === 'rest') {
    showRestStop();
  } else if (room.type === 'shop') {
    showShop();
  } else if (room.type === 'event') {
    showEvent();
  } else {
    startCombat(false);
  }
}

function proceedDoors() {
  const floor = G.map[G.currentFloor];
  const cp = floor.currentPath;
  const path = floor[`path${cp}`];
  const roomIdx = cp === 'A' ? floor.roomIndexA : cp === 'B' ? floor.roomIndexB : (floor.roomIndexC || 0);

  path[roomIdx].cleared = true;

  // advance this path's index
  if (cp === 'A') floor.roomIndexA++;
  else if (cp === 'B') floor.roomIndexB++;
  else floor.roomIndexC = (floor.roomIndexC || 0) + 1;

  // next room on current path (after advance)
  const nextIdx = cp === 'A' ? floor.roomIndexA : cp === 'B' ? floor.roomIndexB : (floor.roomIndexC || 0);
  const nextIsBoss = nextIdx >= path.length;

  showDoors(nextIsBoss);
}

function showDoors(nextIsBoss) {
  const floor = G.map[G.currentFloor];
  const cp = floor.currentPath;
  const path = floor[`path${cp}`];
  const nextIdx = currentRoomIndex();

  showScreen('door-screen');
  const container = document.getElementById('doors-container');
  container.innerHTML = '';

  // ── BOSS DOOR ──
  if (nextIsBoss) {
    document.getElementById('door-subtitle').textContent = 'One door stands between you and the floor boss.';
    container.appendChild(makeDoor('boss', '👑', 'Onwards', 'The floor boss awaits.', false, 'door-magic'));
    return;
  }

  const nextRoom = path[nextIdx];
  const hasMagic = nextRoom && nextRoom.hasMagic;

  // ── MAGIC DOOR present — show two choices ──
  if (hasMagic) {
    const magicTypes = ['battle','elite','event','shop','rest'];
    const magicType = rand(magicTypes);
    const isHidden = G.currentFloor >= 2 ? Math.random() < 0.6 : false;
    const hint = isHidden ? getMagicHint(magicType, G.currentFloor) : null;
    const lbl = isHidden ? '???' : roomLabel(magicType);
    const ico = isHidden ? '🚪' : roomEmoji(magicType);

    document.getElementById('door-subtitle').textContent = 'A magic door has appeared. Continue forward or take the mystery.';
    // Main path door
    container.appendChild(makeDoor('forward', roomEmoji(nextRoom.type), 'Continue', roomLabel(nextRoom.type), null, 'door-left'));
    // Magic door
    container.appendChild(makeDoor('magic:' + magicType, ico, '✨ Magic Door', lbl, hint, 'door-magic'));
    return;
  }

  // ── SINGLE DOOR — normal forward movement ──
  document.getElementById('door-subtitle').textContent = 'One path forward. Keep moving.';
  container.appendChild(makeDoor('forward', roomEmoji(nextRoom ? nextRoom.type : 'battle'), 'Continue', roomLabel(nextRoom ? nextRoom.type : 'battle'), null, 'door-left'));

  // ── MIRROR — appears at halfway point of path ──
  const pathLen = path.length;
  // Mirror appears after completing MORE than half the path
  // e.g. 7 rooms: mirror at room 5 (nextIdx=4, meaning 4 rooms done)
  const halfwayIdx = Math.ceil(pathLen * 0.6); // 60% through the path
  const mirrorUsedKey = 'mirror_used_' + G.currentFloor + '_' + cp;

  if (nextIdx === halfwayIdx && !G[mirrorUsedKey]) {
    const mirrorCosts = [30, 50, 70, 100];
    const mirrorCost = mirrorCosts[G.currentFloor] || 50;

    // Find available paths to switch to (not current)
    const allPaths = ['A','B','C'];
    const otherPaths = allPaths.filter(p => p !== cp && floor[`path${p}`]);

    if (otherPaths.length > 0) {
      // Pick the first other path to show
      const targetPath = otherPaths[0];
      const targetPathData = floor[`path${targetPath}`];
      const targetHalfway = Math.floor(targetPathData.length / 2);
      const remainingRooms = targetPathData.slice(targetHalfway);

      // Build mirror panel
      const mirrorDiv = document.createElement('div');
      mirrorDiv.className = 'mirror-panel';

      const roomIcons = remainingRooms.map(r =>
        `<div class="mirror-room-icon" title="${roomLabel(r.type)}">${roomEmoji(r.type)}</div>`
      ).join('');

      const canAfford = G.gold >= mirrorCost;

      const affordColor = canAfford ? 'var(--gold)' : 'var(--red3)';
      const useMirrorCall = 'useMirror(' + JSON.stringify(targetPath) + ',' + mirrorCost + ',' + JSON.stringify(mirrorUsedKey) + ',' + targetHalfway + ')';
      mirrorDiv.innerHTML = [
        '<div class="mirror-frame">',
          '<div class="mirror-reflection">',
            '<div class="mirror-title">&#x1FA9E; THE MIRROR</div>',
            '<div class="mirror-subtitle">A strange mirror appears on the wall.<br>Another path is reflected within it.</div>',
            '<div style="font-size:0.7rem;color:var(--text3);margin:0.3rem 0;">Path ' + targetPath + ' — remaining rooms:</div>',
            '<div class="mirror-path-preview">' + roomIcons + '<div class="mirror-room-icon" style="border-color:var(--red2)">&#x1F451;</div></div>',
          '</div>',
          '<div class="mirror-footer">',
            '<div class="mirror-cost">&#x1FA99; Cost: ' + mirrorCost + ' Gold &nbsp;|&nbsp; You have: <span style="color:' + affordColor + '">' + G.gold + ' Gold</span></div>',
            '<div style="display:flex;justify-content:center;gap:0.5rem;margin-top:0.5rem;">',
              '<button class="mirror-btn' + (canAfford ? '' : ' disabled') + '" onclick="' + useMirrorCall + '">Step Through</button>',
              '<button class="mirror-btn" id="mirror-ignore-btn">Walk Away</button>',
            '</div>',
          '</div>',
        '</div>'
      ].join('');
      // Bind ignore button after innerHTML set
      setTimeout(function() {
        var ignBtn = document.getElementById('mirror-ignore-btn');
        if (ignBtn) ignBtn.onclick = function() { mirrorDiv.style.display = 'none'; };
      }, 0);

      // Add mirror after the door
      const doorsSection = document.getElementById('doors-container');
      doorsSection.after(mirrorDiv);
      // Store reference so we can remove it
      G._currentMirrorPanel = mirrorDiv;
    }
  }
}

function makeDoor(id, emoji, label, content, hint, cls) {
  const d = document.createElement('div');
  d.className = `door ${cls}`;

  // Door frame with panels and knob
  const frame = document.createElement('div');
  frame.className = 'door-frame';
  const knob = document.createElement('div');
  knob.className = 'door-knob';
  frame.appendChild(knob);
  d.appendChild(frame);

  // Magic glow overlay
  if (cls === 'door-magic') {
    const glow = document.createElement('div');
    glow.className = 'door-magic-glow';
    d.appendChild(glow);
  }

  // Room icon sits inside upper panel of the door
  const iconWrap = document.createElement('div');
  iconWrap.className = 'door-icon-wrap';
  iconWrap.innerHTML = `<div class="door-icon-bg">${emoji}</div>`;
  frame.appendChild(iconWrap);

  // Info label below the door
  const info = document.createElement('div');
  info.className = 'door-info';
  info.innerHTML = `
    <div class="door-label">${label}</div>
    <div class="door-content">${content}</div>
    ${hint ? `<div class="door-hint">${hint}</div>` : ''}
  `;
  d.appendChild(info);

  d.onclick = () => chooseDoor(id);
  return d;
}

function chooseDoor(id) {
  const floor = G.map[G.currentFloor];

  if (id === 'boss') {
    showBossIntro(floor.boss);
    return;
  }

  if (id === 'forward') {
    // Clear hasMagic on current room so it doesn't re-trigger
    const idx = currentRoomIndex();
    const pathArr = floor[`path${floor.currentPath}`];
    if (pathArr[idx]) pathArr[idx].hasMagic = false;
  } else if (id === 'pathA') {
    floor.currentPath = 'A';
  } else if (id === 'pathB') {
    floor.currentPath = 'B';
  } else if (id === 'pathC') {
    floor.currentPath = 'C';
  } else if (id.startsWith('magic:')) {
    // Replace current room with the magic room type
    // Clear hasMagic so it doesn't loop
    const type = id.split(':')[1];
    const cp = floor.currentPath;
    const idx = currentRoomIndex();
    const pathArr = floor[`path${cp}`];
    if (pathArr[idx]) {
      pathArr[idx] = { type, hasMagic: false, cleared: false };
    }
  }

  enterRoom();
}

function useMirror(targetPath, cost, usedKey, targetHalfwayIdx) {
  if (G.gold < cost) { showMsg('Not enough Gold!'); return; }
  G.gold -= cost;
  G[usedKey] = true; // mark mirror as used for this path this floor
  updateHUD();

  // Remove mirror panel
  if (G._currentMirrorPanel) {
    G._currentMirrorPanel.remove();
    G._currentMirrorPanel = null;
  }

  // Switch to target path at its halfway point
  const floor = G.map[G.currentFloor];
  floor.currentPath = targetPath;

  // Set the target path's index to halfway
  if (targetPath === 'A') floor.roomIndexA = targetHalfwayIdx;
  else if (targetPath === 'B') floor.roomIndexB = targetHalfwayIdx;
  else floor.roomIndexC = targetHalfwayIdx;

  showMsg('🪞 Mirror used — switched to Path ' + targetPath + '!');
  setTimeout(() => enterRoom(), 600);
}

// ═══════════════════════════════════════════════════════════════════
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
