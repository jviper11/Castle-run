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
      emoji: '❤️', name: 'Rest',
      desc: atFull ? 'Already at full HP' : `Recover ${healAmt} HP (${Math.min(G.hp + healAmt, G.maxHp)}/${G.maxHp})`,
      disabled: atFull,
      action: () => { healPlayer(G, healAmt); showMsg(`Recovered ${healAmt} HP.`); setTimeout(proceedDoors, 800); }
    },
    {
      emoji: '⬆️', name: 'Upgrade Card',
      desc: 'Pick a card from your deck to upgrade',
      action: () => startRestPick('upgrade')
    },
    {
      emoji: '🗑️', name: 'Remove Card',
      desc: 'Pick a card from your deck to remove',
      action: () => startRestPick('remove')
    },
  ];
  options.forEach(o => {
    const el = document.createElement('div');
    el.className = 'rest-option' + (o.disabled ? ' rest-disabled' : '');
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

// ═══════════════════════════════════════════════════════════════════
// RELICS
// ═══════════════════════════════════════════════════════════════════

const RELICS = {
  bloodsoaked_rag:   { name:'Bloodsoaked Rag',   emoji:'🩹', rarity:'common', desc:'Heal 3 HP after each combat win.',              effect:'heal_after_combat',      value:3 },
  iron_vambrace:     { name:'Iron Vambrace',      emoji:'🛡', rarity:'common', desc:'Start every combat with 6 Block.',              effect:'start_block',            value:6 },
  rusted_chain:      { name:'Rusted Chain',       emoji:'⛓', rarity:'common', desc:'Enemies start combat with 1 Vulnerable.',       effect:'enemy_start_vulnerable', value:1 },
  phantom_blade:     { name:'Phantom Blade',      emoji:'👻', rarity:'common', desc:'First attack each combat deals +8 damage.',     effect:'first_attack_bonus',     value:8 },
  ash_pendant:       { name:'Ash Pendant',        emoji:'💀', rarity:'common', desc:'Gain 1 Soul after every battle.',               effect:'soul_after_combat',      value:1 },
  cracked_hourglass: { name:'Cracked Hourglass',  emoji:'⌛', rarity:'common', desc:'Reroll restored at start of every combat.',     effect:'restore_reroll' },
  iron_ration:       { name:'Iron Ration',        emoji:'🍖', rarity:'common', desc:'Heal 5 HP after elite fights.',                 effect:'heal_after_elite',       value:5 },
  lucky_rabbit_foot: { name:'Lucky Rabbit Foot',  emoji:'🐇', rarity:'common', desc:'Once per run, survive a killing blow at 1 HP.', effect:'survive_lethal' },
  tarnished_coin:    { name:'Tarnished Coin',     emoji:'🪙', rarity:'common', desc:'Gain 5 bonus gold after every combat.',         effect:'gold_after_combat',      value:5 },
  ivory_die:         { name:'Ivory Die',          emoji:'🎲', rarity:'common',   desc:'Your die becomes a d8 (if currently below d8).', effect:'upgrade_die' },

  // ── UNCOMMON ──
  torn_page:         { name:'Torn Page',          emoji:'📄', rarity:'uncommon', desc:'Draw 1 extra card at start of each turn.',                    effect:'extra_draw',          value:1 },
  loaded_gauntlet:   { name:'Loaded Gauntlet',    emoji:'🥊', rarity:'uncommon', desc:'Minimum dice roll is always 2.',                              effect:'min_roll',            value:2 },
  lucky_coin:        { name:'Lucky Coin',          emoji:'🍀', rarity:'uncommon', desc:'Rolling your exact affinity number draws 1 card.',            effect:'affinity_exact_draw' },
  bone_dice:         { name:'Bone Dice',           emoji:'🦴', rarity:'uncommon', desc:'Reroll result can never be lower than original.',             effect:'reroll_floor' },
  grave_robber:      { name:'Grave Robber',        emoji:'⚰️', rarity:'uncommon', desc:'Gain 8 Gold after each elite fight.',                        effect:'gold_after_elite',    value:8 },
  gilded_quill:      { name:'Gilded Quill',        emoji:'🪶', rarity:'uncommon', desc:'Every 10th card played deals double damage.',                 effect:'tenth_card_double' },
  scholars_lens:     { name:"Scholar's Lens",      emoji:'🔍', rarity:'uncommon', desc:'See 1 extra card option on every reward screen.',            effect:'extra_reward_card' },
  bone_key:          { name:'Bone Key',            emoji:'🗝️', rarity:'uncommon', desc:'Every 4th room has a chance to contain a hidden chest.',     effect:'bone_key_chest' },
  twinned_die:       { name:'Twinned Die',          emoji:'⚖️', rarity:'uncommon', desc:'Roll twice on initial roll, take the higher result.',        effect:'twinned_die' },
  soulbound_tome:    { name:'Soulbound Tome',      emoji:'📚', rarity:'uncommon', desc:'Gain 1 Energy when you play 3+ cards in one turn.',          effect:'energy_on_three_cards' },

  // ── RARE ──
  soulbound_gauntlet: { name:'Soulbound Gauntlet', emoji:'🧤', rarity:'rare',     desc:'First card each turn costs 0 energy.',                       effect:'first_card_free' },
  ashen_crown:        { name:'Ashen Crown',         emoji:'👑', rarity:'rare',     desc:'Gain 1 extra energy at start of every combat.',              effect:'combat_start_energy', value:1 },
  shattered_mirror:   { name:'Shattered Mirror',    emoji:'🪞', rarity:'rare',     desc:'When an enemy copies your card, they take 10 damage.',       effect:'mirror_damage',       value:10 },
  void_compass:       { name:'Void Compass',         emoji:'🧭', rarity:'rare',     desc:'After every elite, choose 1 of 3 relics instead of 1.',     effect:'triple_elite_relic' },
  crimson_phylactery: { name:'Crimson Phylactery',  emoji:'💎', rarity:'rare',     desc:'Survive a killing blow at 1 HP once per run.',              effect:'survive_lethal' },
  cursed_hourglass:   { name:'Cursed Hourglass',    emoji:'⏳', rarity:'rare',     desc:'Draw 2 extra cards per turn. Hand limit drops to 4.',        effect:'cursed_draw',         value:2 },
  hollow_throne:      { name:'Hollow Throne',        emoji:'🪑', rarity:'rare',     desc:'Start every combat with 20 Block. Lose 8 max HP.',          effect:'hollow_throne' },
  pale_contract:      { name:'The Pale Contract',    emoji:'📜', rarity:'rare',     desc:'All cards deal +4 damage. Healing is 50% less effective.',  effect:'pale_contract' },
  fractured_die:      { name:'Fractured Die',        emoji:'💔', rarity:'rare',     desc:'Roll twice on initial roll, take higher result. Lose reroll for the run.', effect:'fractured_die' },
  kings_debt:         { name:"King's Debt",           emoji:'💰', rarity:'rare',     desc:'Gain 60 gold immediately. All shop prices cost 25% more.', effect:'kings_debt',          value:60 }
};

function hasRelic(key) { return G.relics && G.relics.includes(key); }

function shopCost(n) { return Math.ceil(n * (hasRelic('kings_debt') ? 1.25 : 1)); }

function showShop() {
  showScreen('shop-screen');

  // HP display
  const hpPct = Math.round(G.hp / G.maxHp * 100);
  document.getElementById('shop-hp-text').textContent = `${Math.max(0, G.hp)} / ${G.maxHp}`;
  document.getElementById('shop-hp-bar').style.width = hpPct + '%';
  const pctEl = document.getElementById('shop-hp-pct');
  pctEl.textContent = hpPct + '%';
  pctEl.className = 'rest-hp-pct ' + (hpPct <= 30 ? 'hp-low' : hpPct <= 60 ? 'hp-mid' : 'hp-full');

  // Gold
  document.getElementById('shop-gold-display').textContent = G.gold;

  // Update remove button label with current price (kings_debt aware)
  const removeBtnEl = document.getElementById('shop-remove-btn');
  if (removeBtnEl) removeBtnEl.textContent = `🗑 Remove Card (${shopCost(75)}🪙)`;

  // Items
  const items = document.getElementById('shop-items');
  items.innerHTML = '';
  const pool = shuffle([...SHOP_ITEMS]).slice(0, 4);
  pool.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'shop-item';
    el.id = `shop-item-${i}`;
    const itemCost = shopCost(item.cost);
    const canAfford = G.gold >= itemCost;
    if (!canAfford) el.style.opacity = '0.5';
    el.innerHTML = `<span class="shop-item-emoji">${item.emoji}</span><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div><div class="shop-item-cost" style="color:${canAfford ? 'var(--energy)' : 'var(--red2)'}">🪙 ${itemCost}</div>`;
    el.onclick = () => {
      if (G.gold < itemCost) { showMsg('Not enough gold!'); return; }
      G.gold -= itemCost;
      item.effect(G);
      document.getElementById(`shop-item-${i}`).classList.add('sold');
      // refresh gold and HP displays
      document.getElementById('shop-gold-display').textContent = G.gold;
      const newPct = Math.round(G.hp / G.maxHp * 100);
      document.getElementById('shop-hp-text').textContent = `${Math.max(0, G.hp)} / ${G.maxHp}`;
      document.getElementById('shop-hp-bar').style.width = newPct + '%';
      document.getElementById('shop-hp-pct').textContent = newPct + '%';
      renderShopDeck();
      updateHUD();
    };
    items.appendChild(el);
  });

  renderShopDeck();
  renderShopRelics();
  renderShopDie();
}

function renderShopRelics() {
  const grid = document.getElementById('shop-relics-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Floor 1-2: common pool. Floor 3+: 50% chance uncommon (not yet added — always common for now).
  const available = Object.entries(RELICS).filter(([k]) => !G.relics.includes(k));
  const shopRelics = shuffle([...available]).slice(0, 2);

  shopRelics.forEach(([key, relic]) => {
    const cost = shopCost(80);
    const canAfford = G.gold >= cost;
    const el = document.createElement('div');
    el.className = 'shop-item';
    if (!canAfford) el.style.opacity = '0.5';
    el.innerHTML = `<span class="shop-item-emoji">${relic.emoji}</span><div class="shop-item-name">${relic.name}</div><div class="shop-item-desc">${relic.desc}</div><div class="shop-item-cost" style="color:${canAfford ? 'var(--energy)' : 'var(--red2)'}">🪙 ${cost}</div>`;
    el.onclick = () => {
      if (G.gold < cost) { showMsg('Not enough gold!'); return; }
      if (G.relics.includes(key)) { showMsg('Already have this relic!'); return; }
      G.gold -= cost;
      G.relics.push(key);
      // Pickup side effects
      if (key === 'ivory_die' && G.diceMax < 8) {
        G.activeDie = 'd8'; G.diceMax = 8;
        showMsg('🎲 Ivory Die — die upgraded to d8!');
      } else if (key === 'loaded_gauntlet') {
        G._minRoll = Math.max(G._minRoll || 1, 2);
        showMsg('🥊 Loaded Gauntlet — minimum roll is now 2!');
      } else if (key === 'hollow_throne') {
        G.maxHp -= 8; G.hp = Math.min(G.hp, G.maxHp);
        showMsg('🪑 Hollow Throne — max HP -8, but you start combats with 20 Block!');
      } else if (key === 'fractured_die') {
        G._noReroll = true;
        showMsg('💔 Fractured Die — reroll lost for the run. Initial roll is doubled.');
      } else if (key === 'kings_debt') {
        G.gold += 60;
        document.getElementById('shop-gold-display').textContent = G.gold;
        showMsg("💰 King's Debt — +60 Gold! Shop prices now cost 25% more.");
      } else {
        showMsg(`${relic.emoji} ${relic.name} acquired!`);
      }
      el.classList.add('sold');
      document.getElementById('shop-gold-display').textContent = G.gold;
      updateHUD();
    };
    grid.appendChild(el);
  });
}

function renderShopDie() {
  const grid = document.getElementById('shop-die-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const diceFloor = G.currentFloor;
  const available = Object.values(DICE_TYPES).filter(d => {
    if (d.type === G.activeDie) return false;
    if (d.type === 'd6') return false;
    if (d.type === 'd20') return diceFloor >= 3;
    if (d.type === 'd12') return diceFloor >= 2;
    if (d.type === 'd10') return diceFloor >= 1;
    return true;
  });

  if (available.length === 0) { grid.innerHTML = '<div style="color:var(--text3);font-size:0.85rem;padding:0.5rem;">No upgrades available.</div>'; return; }

  const dieOpt = rand(available);
  const currentDieData = getDie(G.activeDie);
  const cost = shopCost(80);
  const canAfford = G.gold >= cost;

  const el = document.createElement('div');
  el.className = 'shop-item';
  el.id = 'shop-die-item';
  if (!canAfford) el.style.opacity = '0.5';
  el.innerHTML = `<span class="shop-item-emoji">${dieOpt.emoji}</span><div class="shop-item-name">${dieOpt.name}</div><div class="shop-item-desc">${dieOpt.desc} Replaces your ${currentDieData.type}.</div><div class="shop-item-cost" style="color:${canAfford ? 'var(--energy)' : 'var(--red2)'}">🪙 ${cost}</div>`;
  el.onclick = () => {
    if (G.gold < shopCost(80)) { showMsg('Not enough gold!'); return; }
    G.gold -= shopCost(80);
    G.activeDie = dieOpt.type;
    G.diceMax = dieOpt.max;
    el.classList.add('sold');
    document.getElementById('shop-gold-display').textContent = G.gold;
    updateHUD();
    showMsg(dieOpt.emoji + ' ' + dieOpt.name + ' equipped!');
  };
  grid.appendChild(el);
}

function showShopRemove() {
  if (G.gold < shopCost(75)) { showMsg(`Not enough gold! (${shopCost(75)} 🪙)`); return; }
  const removable = G.deck.filter(k => k !== 'strike' && k !== 'defend');
  if (removable.length === 0) { showMsg('No removable cards in deck!'); return; }

  const grid = document.getElementById('shop-remove-grid');
  grid.innerHTML = '';
  const counts = {};
  removable.forEach(k => counts[k] = (counts[k] || 0) + 1);
  [...new Set(removable)].forEach(key => {
    const c = CARDS[key];
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'rest-deck-card';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <span class="rest-deck-card-emoji">${c.emoji}</span>
      <div>
        <div class="rest-deck-card-name">${c.name}${counts[key] > 1 ? ` ×${counts[key]}` : ''}</div>
        <div class="rest-deck-card-type">${c.type} · Cost ${c.cost}</div>
      </div>
    `;
    el.onclick = () => {
      G.gold -= shopCost(75);
      const idx = G.deck.indexOf(key);
      G.deck.splice(idx, 1);
      document.getElementById('shop-gold-display').textContent = G.gold;
      updateHUD();
      showMsg(`${c.name} removed from deck.`);
      closeShopModal('shop-remove-modal');
      renderShopDeck();
    };
    grid.appendChild(el);
  });
  document.getElementById('shop-remove-modal').style.display = 'block';
}

function showShopUpgrade() {
  if (G.gold < 80) { showMsg('Not enough gold! (80 🪙)'); return; }
  const upgradeable = [...new Set(G.deck.filter(k => !k.endsWith('+') && CARDS[k + '+']))];
  if (upgradeable.length === 0) { showMsg('No upgradeable cards!'); return; }

  const grid = document.getElementById('shop-upgrade-grid');
  grid.innerHTML = '';
  upgradeable.forEach(key => {
    const c = CARDS[key];
    const cu = CARDS[key + '+'];
    if (!c || !cu) return;
    const el = document.createElement('div');
    el.className = 'rest-deck-card';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <span class="rest-deck-card-emoji">${c.emoji}</span>
      <div>
        <div class="rest-deck-card-name">${c.name} → <span style="color:var(--gold)">${cu.name}</span></div>
        <div class="rest-deck-card-type">${c.type} · Cost ${c.cost}</div>
      </div>
    `;
    el.onclick = () => {
      G.gold -= 80;
      const idx = G.deck.indexOf(key);
      G.deck.splice(idx, 1, key + '+');
      document.getElementById('shop-gold-display').textContent = G.gold;
      updateHUD();
      showMsg(`✨ ${cu.name} — upgraded!`);
      closeShopModal('shop-upgrade-modal');
      renderShopDeck();
    };
    grid.appendChild(el);
  });
  document.getElementById('shop-upgrade-modal').style.display = 'block';
}

function closeShopModal(id) {
  document.getElementById(id).style.display = 'none';
}

function renderShopDeck() {
  const grid = document.getElementById('shop-deck-grid');
  if (!grid) return;
  grid.innerHTML = '';
  document.getElementById('shop-deck-count').textContent = `${G.deck.length} cards`;
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
        <div class="rest-deck-card-name" style="color:${isUpgraded ? 'var(--gold2)' : ''}">${c.name}${counts[key] > 1 ? ` x${counts[key]}` : ''}${isUpgraded ? '' : ''}</div>
        <div class="rest-deck-card-type">${c.type} · Cost ${c.cost}${isUpgraded ? ' · <span style="color:var(--gold)">✨ Upgraded</span>' : ''}</div>
      </div>
    `;
    grid.appendChild(el);
  });
}

function leavShop() { proceedDoors(); }

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
  // called from shop — removes a random non-essential card (shop has no card picker UI)
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

// Per-character reward card pools — rarity bucketed
const CHAR_REWARD_POOLS = {
  barbarian: {
    common:   ['brutalswing','shieldbreaker','warcry','toughhide','bloodprice','heavyblow','warshout','ironbash'],
    uncommon: ['haymaker','skullcrack','recklesslunge','battlecry','ironroar','bloodlust','entrench','overpowerattack','crushingblow','warcallecho','soulsteal','stealheal','ironwall'],
    rare:     ['ragefuel','berserkersoath','warlordspresence','deathrattle','laststand','battletrance']
  },
  mage: {
    common:   ['spark','flametouch','meditate','channelfocus','frostbolt','arcanebarrier','manasurge','arcaneboost','voidchannel','fireball','blizzard'],
    uncommon: ['icelance','combustion','chainbolt','ignite','arcanerecall','manaweave','frostfire','arcanebarrage','arcanesight','arcanemomentum','soulsteal','ironwall'],
    rare:     ['frozeninferno','inferno','timewarp','spellecho','coldmastery','burningsoul']
  },
  thief: {
    common:   ['swiftjab','slipaway','cheapshot','coinflick','nimblepace','quickstrike','shadowstep','poisonblade','pickpocket','smokescreen'],
    uncommon: ['envenomdagger','backstab','cripple','shadowmark','poisoncloud','bladedance','disappear','concoction','soulsteal','stealheal'],
    rare:     ['deathmark','shadowartist','poisonmaster','lethalrhythm','assassinate']
  },
  vampire: {
    common:   ['bloodpulse','draintouch','nightveil','darkblood','swoopdown','blooddrain','nightshroud','lifeleech','crimsonbite','darkembrace'],
    uncommon: ['sanguinestrike','crimsonpact','bloodbank','drainlife','batform','shadowfeast','darkrite','bloodrush','nightstalk','ironwall','soulsteal','stealheal'],
    rare:     ['bloodlord','eternalhunger','vampiricform','darkascension','soulrend','bloodtide']
  },
  gambler: {
    common:   ['longshot','safepull','risktaker','oddscheck','chipsin','highorlow','doubldown','luckystrike','hedgebet','wildcard'],
    uncommon: ['allin','loadeddie','pocketaces','doubleornothing','counttheodds','highstakes','bluff','soulsteal','stealheal'],
    rare:     ['houseedge','luckystreak','gamblersfallacy','bettingitall','loadedhouse','devilsdeal']
  }
};

function showReward() {

   // Return exhausted cards to deck after combat
  if (G.exhaustedPile && G.exhaustedPile.length > 0) {
    G.deck.push(...G.exhaustedPile);
    G.exhaustedPile = [];
  }

  document.getElementById('reward-hp').textContent = G.hp + '/' + G.maxHp;
  document.getElementById('reward-gold').textContent = G.gold;
  document.getElementById('reward-souls').textContent = G.souls;
  showScreen('reward-screen');
  const pool = document.getElementById('reward-choices');
  pool.innerHTML = '';

  // Rarity-weighted card selection
  const charPool = CHAR_REWARD_POOLS[G.charKey] || { common: [], uncommon: [], rare: [] };
  const isEliteReward = G.lastFightWasElite;

  // Determine rare% (with pity timer, cap bonus at 30 → max rare% = 35)
  const rarePity = isEliteReward ? 0 : Math.min(G.rareOffset, 30);
  const rareChance = (isEliteReward ? 10 : 5) + rarePity;
  const uncommonChance = isEliteReward ? 35 : 25;

  // Roll rarity
  const rarityRoll = Math.random() * 100;
  let rolledRarity;
  if (rarityRoll < rareChance) {
    rolledRarity = 'rare';
    if (!isEliteReward) G.rareOffset = 0;
  } else if (rarityRoll < rareChance + uncommonChance) {
    rolledRarity = 'uncommon';
  } else {
    rolledRarity = 'common';
    if (!isEliteReward) G.rareOffset++;
  }

  // Filter helper — valid keys not already in deck
  function filterBucket(keys) {
    return (keys || []).filter(k => CARDS[k] && !G.deck.includes(k));
  }

  // Build pick pool from rolled tier, fill from others if short
  let bucket = filterBucket(charPool[rolledRarity]);
  if (bucket.length < 3) {
    const fallback = ['common', 'uncommon', 'rare']
      .filter(r => r !== rolledRarity)
      .flatMap(r => filterBucket(charPool[r]));
    bucket = [...new Set([...bucket, ...fallback])];
  }
  const allPicks = shuffle([...bucket]).slice(0, hasRelic('scholars_lens') ? 4 : 3);

  const rarityColor = { common: 'var(--text2)', uncommon: 'var(--energy)', rare: '#c9a84c' };

  allPicks.forEach(key => {
    const c = CARDS[key];
    if (!c) return;
    const cardRarity = (charPool.rare || []).includes(key) ? 'rare' :
                       (charPool.uncommon || []).includes(key) ? 'uncommon' : 'common';
    const el = document.createElement('div');
    el.className = 'reward-card';
    if (cardRarity === 'rare') el.style.borderColor = '#c9a84c';
    else if (cardRarity === 'uncommon') el.style.borderColor = 'var(--energy)';
    el.innerHTML = `
      <div style="position:absolute;top:6px;left:6px;width:20px;height:20px;border-radius:50%;background:var(--energy);color:var(--bg);font-family:Cinzel,serif;font-size:0.7rem;font-weight:900;display:flex;align-items:center;justify-content:center;">${c.cost}</div>
      <span class="reward-card-emoji">${c.emoji}</span>
      <div class="reward-card-name">${c.name}</div>
      <div class="reward-card-type" style="color:${rarityColor[cardRarity]}">${c.type} · ${cardRarity.charAt(0).toUpperCase() + cardRarity.slice(1)}</div>
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

}

function showDieReward() {
  const diceFloor = G.currentFloor;
  const available = Object.values(DICE_TYPES).filter(d => {
    if (d.type === G.activeDie) return false;
    if (d.type === 'd6') return false;
    if (d.type === 'd20') return diceFloor >= 3;
    if (d.type === 'd12') return diceFloor >= 2;
    if (d.type === 'd10') return diceFloor >= 1;
    return true;
  });

  // Fallback: if no upgrades available just proceed
  if (available.length === 0) { proceedDoors(); return; }

  const picks = shuffle([...available]).slice(0, 2);
  const currentDieData = getDie(G.activeDie);

  document.getElementById('reward-hp').textContent = G.hp + '/' + G.maxHp;
  document.getElementById('reward-gold').textContent = G.gold;
  document.getElementById('reward-souls').textContent = G.souls;
  showScreen('reward-screen');

  const pool = document.getElementById('reward-choices');
  pool.innerHTML = '';

  // Header label
  const hdr = document.createElement('div');
  hdr.style.cssText = 'width:100%;text-align:center;font-family:Cinzel,serif;color:var(--gold);font-size:0.9rem;letter-spacing:0.05em;margin-bottom:0.4rem;';
  hdr.textContent = '✨ Magic Door — Choose a Die';
  pool.appendChild(hdr);

  picks.forEach(dieOpt => {
    const el = document.createElement('div');
    el.className = 'reward-card';
    el.style.borderColor = '#b8860b';
    el.innerHTML = `
      <span class="reward-card-emoji">${dieOpt.emoji}</span>
      <div class="reward-card-name">${dieOpt.name}</div>
      <div class="reward-card-type" style="color:#b8860b">${dieOpt.type} · Replaces your ${currentDieData.type}</div>
      <div class="reward-card-desc">${dieOpt.desc}<br><br><span style="color:var(--text3);font-size:0.85em">Rolls 1–${dieOpt.max}. Current: ${currentDieData.type} (1–${currentDieData.max})</span></div>
    `;
    el.onclick = () => {
      G.activeDie = dieOpt.type;
      G.diceMax = dieOpt.max;
      showMsg(dieOpt.emoji + ' ' + dieOpt.name + ' equipped!');
      proceedDoors();
    };
    pool.appendChild(el);
  });
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
  G.gold += 10;
  showMsg('💰 Skipped — +10 Gold');
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
  if (playerBlockValue) playerBlockValue.textContent = G.block;
  const playerBlockDisplay = document.getElementById('player-block-display');
  if (playerBlockDisplay) {
    playerBlockDisplay.classList.toggle('is-empty', G.block <= 0);
    playerBlockDisplay.setAttribute('aria-label', `Block ${G.block}`);
  }

  if (G.enemy) {
    document.getElementById('enemy-hp-text').textContent = `${Math.max(0,G.enemy.hp)}/${G.enemy.maxHp}`;
    document.getElementById('enemy-hp-bar').style.width = pct(G.enemy.hp / G.enemy.maxHp * 100);
    if (enemyBlockValue) enemyBlockValue.textContent = G.enemy.block;
    const enemyBlockDisplay = document.getElementById('enemy-block-display');
    if (enemyBlockDisplay) {
      const hasBlock = G.enemy.block > 0;
      enemyBlockDisplay.hidden = !hasBlock;
      enemyBlockDisplay.classList.toggle('is-empty', !hasBlock);
      enemyBlockDisplay.setAttribute('aria-label', `Block ${G.enemy.block}`);
    }
  }
}

function formatCompactClause(clause) {
  if (!clause) return '';
  const clean = clause.replace(/\.$/, '').replace(/\s+/g, ' ').trim();
  let match = clean.match(/^Deal (\d+) dmg twice$/i);
  if (match) return `${match[1]} dmg x2`;

  match = clean.match(/^Deal (\d+) dmg to enemy (\d+) times$/i);
  if (match) return `${match[1]} dmg x${match[2]}`;

  match = clean.match(/^Deal (\d+) dmg, heal (\d+) HP$/i);
  if (match) return `${match[1]} dmg + ${match[2]} heal`;

  match = clean.match(/^Deal (\d+) damage?$/i) || clean.match(/^Deal (\d+) dmg$/i);
  if (match) return `Deal ${match[1]} dmg`;

  match = clean.match(/^Gain (\d+) Block$/i);
  if (match) return `Gain ${match[1]} Block`;

  match = clean.match(/^Draw (\d+) cards?$/i);
  if (match) return `Draw ${match[1]}`;

  match = clean.match(/^Gain (\d+) Block, discard 1, draw 1$/i);
  if (match) return `${match[1]} Block, disc 1, draw 1`;

  match = clean.match(/^Gain (\d+) Gold$/i);
  if (match) return `+${match[1]} Gold`;

  match = clean.match(/^Gain (\d+) Souls$/i);
  if (match) return `+${match[1]} Souls`;

  match = clean.match(/^Apply (\d+) Poison$/i);
  if (match) return `+${match[1]} Poison`;

  match = clean.match(/^Apply (\d+) Burn$/i);
  if (match) return `+${match[1]} Burn`;

  match = clean.match(/^Apply (\d+) Chill$/i);
  if (match) return `+${match[1]} Chill`;

  match = clean.match(/^Apply (\d+) Vulnerable$/i);
  if (match) return `+${match[1]} Vulnerable`;

  match = clean.match(/^Drain (\d+) HP$/i);
  if (match) return `+${match[1]} heal`;

  match = clean.match(/^Drain (\d+) Block$/i);
  if (match) return `+${match[1]} Block`;

  match = clean.match(/^Gain (\d+) \+ draw (\d+)$/i);
  if (match) return `${match[1]} Block +${match[2]} Draw`;

  match = clean.match(/^Deal (\d+) \+ burn$/i);
  if (match) return `${match[1]} dmg + Burn`;

  match = clean.match(/^Deal (\d+) \+ chill$/i);
  if (match) return `${match[1]} dmg + Chill`;

  match = clean.match(/^Roll 4-6: deal (\d+)\. Roll 2-3: deal (\d+)$/i);
  if (match) return `${match[2]}-${match[1]} gamble`;

  return clean
    .replace(/damage/ig, 'dmg')
    .replace(/cards?/ig, 'Draw')
    .replace(/HP/ig, 'heal');
}

function getCompactCardSummary(card) {
  if (!card || !card.desc) return '';
  const desc = card.desc.replace(/\s+/g, ' ').trim();
  const parts = desc.split(/\.\s+/).map(part => part.replace(/\.$/, '').trim()).filter(Boolean);
  const base = formatCompactClause(parts[0] || desc);
  if (!card.dice || !card.affinityBonus) return base;

  const bonusPrefix = `${card.affinityBonus}:`;
  const bonusClause = parts.find(part => part.toLowerCase().startsWith(bonusPrefix));
  if (!bonusClause) return base;

  const bonusText = formatCompactClause(bonusClause.slice(bonusPrefix.length).trim());
  const bonusLabel = String(card.affinityBonus).charAt(0).toUpperCase() + String(card.affinityBonus).slice(1);
  return `${base}<span class="card-compact-bonus">${bonusText} ${bonusLabel}</span>`;
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
  area.querySelectorAll('.card').forEach(c => c.remove());
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
    const rageStatus = G.statuses && G.statuses.player && G.statuses.player.find(s => s.name === '💢Rage');
    const rageBonus = (c.type === 'Attack' && rageStatus && rageStatus.stacks > 0) ? rageStatus.stacks : 0;
    const weakStatus2 = G.statuses && G.statuses.player && G.statuses.player.find(s => s.name === '😵Weak');
    const isWeak2 = c.type === 'Attack' && weakStatus2 && weakStatus2.stacks > 0;
    const vulnStatus = G.statuses && G.statuses.enemy && G.statuses.enemy.find(s => s.name === '🫗Vulnerable');
    const isVuln = c.type === 'Attack' && vulnStatus && vulnStatus.stacks > 0;
    let displayDesc = c.desc;
    const compactSummary = getCompactCardSummary(c);
    const previewConditionText = c.dice ? `🎲 ${getAffinityPreviewLabel(c.affinityBonus)}` : '';
    const previewBonusText = c.dice
      ? `🎲 ${affinityActive ? 'Bonus Active!' : `${String(c.affinityBonus || '').toUpperCase()} roll bonus`}`
      : '';
    const previewPlayHint = canPlay ? 'Tap selected card again to play' : `Need ${actualCost} Energy`;
 if (isVuln && rageBonus > 0 && !isWeak2) {
  // Rage + Vulnerable — gold
  displayDesc = c.desc.replace(/deal (\d+)/gi, (match, num) => {
    const final = Math.floor((parseInt(num) + rageBonus) * 1.5);
    return 'deal <span style="color:#e8d080;font-weight:bold">' + final + '</span>';
  });
} else if (isVuln && !isWeak2 && rageBonus === 0) {
  // Vulnerable only — orange
  displayDesc = c.desc.replace(/deal (\d+)/gi, (match, num) => {
    const final = Math.floor(parseInt(num) * 1.5);
    return 'deal <span style="color:#e67e22;font-weight:bold">' + final + '</span>';
  });
} else if (rageBonus > 0 && !isWeak2 && !isVuln) {
  // Rage only — red
  displayDesc = c.desc.replace(/deal (\d+)/gi, (match, num) => {
    const boosted = parseInt(num) + rageBonus;
    return 'deal <span style="color:#e74c3c;font-weight:bold">' + boosted + '</span>';
  });
} else if (isWeak2 && rageBonus === 0) {
  // Weak only — blue with strikethrough
  displayDesc = c.desc.replace(/deal (\d+)/gi, (match, num) => {
    const reduced = Math.floor(parseInt(num) * 0.75);
    return 'deal <span style="color:#7fb3d3;font-weight:bold">' + reduced + '</span> <span style="text-decoration:line-through;opacity:0.5;font-size:0.85em">' + num + '</span>';
  });
} 
else if (isWeak2 && rageBonus > 0) {
  // Weak + Rage — blue (weak wins visually)
  displayDesc = c.desc.replace(/deal (\d+)/gi, (match, num) => {
    const final = Math.floor((parseInt(num) + rageBonus) * 0.75);
    return 'deal <span style="color:#7fb3d3;font-weight:bold">' + final + '</span>';
  });
}

if (key === 'arcanebarrage' || key === 'arcanebarrage+') {
  const spells = G._spellsThisTurn || 0;
  const isHigh = checkAffinity(G, roll, 'high');
  const isPlus = key === 'arcanebarrage+';
  const base = isPlus ? (isHigh ? 6 : 4) : (isHigh ? 5 : 3);
  const perSpell = isPlus ? 2 : 1;
  const total = base + (spells * perSpell);
  const color = spells > 0 ? '#e8d080' : 'inherit';
  displayDesc = `Deal <span style="color:${color};font-weight:bold">${total}</span> dmg <span style="color:var(--text3);font-size:0.85em">(+${perSpell} × ${spells} Skill/Power)</span>. ${isHigh ? '✨ High active.' : 'High: deal more.'}`;
}

    const weakIndicator = isWeak2 ? '<div style="font-size:0.5rem;color:#7fb3d3;text-align:center;margin-top:0.1rem;">😵 WEAK</div>' : '';
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
    if (G._voidChannelSelecting) {
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
    if (isSelected && preview && !G._voidChannelSelecting) {
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
  const energyEl = document.getElementById('energy-text');
  const overMax = G.energy > G.maxEnergy;
  energyEl.textContent = G.energy;
  energyEl.style.color = overMax ? '#e8d080' : 'var(--gold)';

  const rerollBtn = document.getElementById('reroll-btn');
  rerollBtn.disabled = G.rerollUsed;
  const rerollsLeft = G.rerollUsed ? 0 : 1;
  rerollBtn.innerHTML = `🎲 REROLL <span style="font-size:0.7em;opacity:0.8">(${rerollsLeft})</span>`;
  renderDicePool();
  const drawEl = document.getElementById('draw-count');
  const discardEl = document.getElementById('discard-count');
  if (drawEl) drawEl.textContent = G.drawPile ? G.drawPile.length : 0;
  if (discardEl) discardEl.textContent = G.discardPile ? G.discardPile.length : 0;
}

function syncMobileDice() {
  const srcDie = document.getElementById('current-die');
  const mobileDie = document.getElementById('m-current-die');
  if (mobileDie && srcDie) {
    mobileDie.textContent = srcDie.textContent;
    mobileDie.className = 'die' + (srcDie.classList.contains('affinity-match') ? ' affinity-match' : '');
  }

  const srcReroll = document.getElementById('reroll-btn');
  const mobileReroll = document.getElementById('m-reroll-btn');
  if (mobileReroll && srcReroll) {
    mobileReroll.disabled = srcReroll.disabled;
    mobileReroll.innerHTML = srcReroll.innerHTML;
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

const STATUS_DESCRIPTIONS = {
  '💢Rage':          'Strength — attacks deal +1 dmg per stack.',
  '😵Weak':          'Attacks deal 25% less damage. Ticks down each turn.',
  '🫗Vulnerable':    'Takes 50% more damage from attacks. Ticks down each turn.',
  '🔥Burn':          'Takes stacks × 2 damage at end of turn. Ticks down.',
  '❄️Chill':         'Attack reduced by 25%. Ticks down each turn.',
  '☠️Poison':        'Takes stacks damage at end of turn. Ticks down.',
  '💚Regen':         'Heals stacks HP at end of turn. Ticks down.',
  '🦇Fly':           'Damage taken is halved this turn.',
  '🔥BerserkOath':   'HP loss grants Block.',
  '❄️ColdMastery':   'Chill reduces enemy attack by more.',
  '🔥BurningSoul':   'Burn deals bonus damage per stack.',
  '🎭ShadowArtist':  'Certain cards cost less this turn.',
  '☠️PoisonMaster':  'Poison deals bonus damage per stack.',
  '🥁LethalRhythm':  'Every 2 cards played deals bonus damage.',
  '✨Momentum':      'Each Skill/Power played adds +1 to dice roll (max +3).',
  '⭐LuckyStreak':   'Max rolls draw a card and deal bonus damage.',
  '🏠HouseEdge':     'Minimum dice roll is raised this combat.',
  '🎯GamblerFallacy':'After enough non-max rolls, next roll is guaranteed max.',
  '👑BloodLord':     'Heal HP each time you play an Attack.',
  '🦷EternalHunger': 'Regen ticks also deal damage to enemy.',
  '🧛VampiricForm':  'Extreme rolls automatically grant Fly.',
};

function showStatusTooltip(e, statusName) {
  const tooltip = document.getElementById('status-tooltip');
  const desc = STATUS_DESCRIPTIONS[statusName] || statusName;
  tooltip.textContent = desc;
  tooltip.classList.add('visible');

  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  const x = Math.min(clientX, window.innerWidth - 220);
  const y = clientY - 60;
  tooltip.style.left = x + 'px';
  tooltip.style.top = Math.max(10, y) + 'px';

  clearTimeout(tooltip._hideTimer);
  tooltip._hideTimer = setTimeout(() => tooltip.classList.remove('visible'), 2000);
}

function hideStatusTooltip() {
  const tooltip = document.getElementById('status-tooltip');
  clearTimeout(tooltip._hideTimer);
  tooltip.classList.remove('visible');
}

function renderStatuses() {
  const STATUS_ICONS = {
  '☠️Poison':        '☠',
  '🔥Burn':          '🔥',
  '❄️Chill':         '❄',
  '😵Weak':          '😵',
  '🫗Vulnerable':    '🫗',
  '💢Strength':      '💢',
  '💢Rage':          '💢',
  '💚Regen':         '💚',
  '🦇Fly':           '🦇',
  '🔥BerserkOath':   '🔥',
  '❄️ColdMastery':   '❄',
  '🔥BurningSoul':   '🔥',
  '🎭ShadowArtist':  '🎭',
  '☠️PoisonMaster':  '☠',
  '🥁LethalRhythm':  '🥁',
  '✨Momentum':      '✨',
  '⭐LuckyStreak':   '⭐',
  '🏠HouseEdge':     '🏠',
  '🎯GamblerFallacy':'🎯',
  '👑BloodLord':     '👑',
  '🦷EternalHunger': '🦷',
  '🧛VampiricForm':  '🧛',
};

  ['player','enemy'].forEach(t => {
    const el = document.getElementById(`${t}-status`);
    if (!el) return;
    el.innerHTML = '';
    G.statuses[t].forEach(s => {
      const glyph = STATUS_ICONS[s.name] || (s.name ? s.name.split(/[\sA-Z]/)[0] : '?');
      const label = `${s.name.replace(/^[^\p{L}\p{N}]+/u, '').trim()} ${s.stacks}`.trim();
      const span = document.createElement('span');
      span.className = 'status-icon';
      span.setAttribute('aria-label', label);
      span.style.cursor = 'help';
      span.innerHTML = `<span class="status-icon-glyph">${glyph}</span><span class="status-icon-value">${s.stacks}</span>`;
      span.addEventListener('click', (e) => showStatusTooltip(e, s.name));
      span.addEventListener('touchstart', (e) => { e.preventDefault(); showStatusTooltip(e, s.name); });
      span.addEventListener('mouseleave', hideStatusTooltip);
      el.appendChild(span);
    });
  });
}

function renderCores() {
  const el = document.getElementById('cores-display');
  el.innerHTML = '';
  const allBosses = BOSSES.filter(b => b.charKey !== G.charKey);
  allBosses.forEach(b => {
    const span = document.createElement('span');
    span.className = `core-icon${G.cores.includes(b.charKey) ? ' collected' : ''}`;
    span.textContent = (CHARACTERS[b.charKey] && CHARACTERS[b.charKey].emoji ? CHARACTERS[b.charKey].emoji : '💠');
    span.title = `Core: ${b.name}`;
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
  const overlay = document.getElementById('map-overlay');
  overlay.classList.toggle('active');
  if (overlay.classList.contains('active')) renderMap();
}

function showPathSelect() {
  const floor = G.map[G.currentFloor];
  showScreen('path-screen');

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
    G.currentDie = (G.currentDie || 1) * 2;
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
    playerEl.style.width = '320px';
    playerEl.style.height = '400px';
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
    // Regular enemy — reset to emoji
    enemyEl.style.backgroundImage = 'none';
    enemyEl.style.fontSize = '';
    enemyEl.style.width = '';
    enemyEl.style.height = '';
  }
}

function toggleMenu() {
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
  const overlay = document.getElementById('deck-overlay');
  const isOpen = overlay.style.display === 'flex';
  overlay.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) renderDeckViewer();
}

function renderDeckViewer() {
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
  renderGrid('dv-discard-grid', G.discardPile, 'dv-discard-count', 'DISCARD');
  renderGrid('dv-exhaust-grid', G.exhaustedPile || [], 'dv-exhaust-count', 'EXHAUSTED');
  document.getElementById('dv-draw-count').textContent =
    `Draw pile: ${G.drawPile.length} · Hand: ${G.hand.length} · Discard: ${G.discardPile.length}`;
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

function showGameOver() {
  showScreen('gameover-screen');
  document.getElementById('gameover-souls').textContent = G.runSouls;
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
