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
  kings_debt:         { name:"King's Debt",           emoji:'💰', rarity:'rare',     desc:'Gain 60 gold immediately. All shop prices cost 25% more.', effect:'kings_debt',          value:60 },

  // ── CHARACTER (Floor 3+, boss reward only, hero-locked) ──
  // GDD §9: each hero has 3, offered only in the boss reward screen's Character slot and only to
  // that hero. The `hero` field is what locks them — offerableCharacterRelics() filters on it, and
  // hasCharacterRelic() re-checks it at every effect site so a relic granted off-pool (debug, a
  // hand-edited save) stays inert on the wrong hero rather than silently working.
  warlords_bandage:  { name:"Warlord's Bandage", emoji:'🩸', rarity:'character', hero:'barbarian', desc:'Heal 4 HP every time you play an Attack on an odd roll.', effect:'odd_attack_heal', value:4 },
  battle_drum:       { name:'Battle Drum',        emoji:'🥁', rarity:'character', hero:'barbarian', desc:'Draw 1 extra card at turn start if last roll was odd.',   effect:'odd_last_roll_draw', value:1 },
  berserkers_scar:   { name:"Berserker's Scar",   emoji:'🩹', rarity:'character', hero:'barbarian', desc:'Taking damage from an enemy grants 1 Rage.',              effect:'damage_grants_rage', value:1 },

  stone_grimoire:    { name:'Stone Grimoire',   emoji:'📖', rarity:'character', hero:'mage', desc:'Gain 4 Block every time you cast a spell, regardless of roll.', effect:'spell_cast_block', value:4 },
  frost_seal:        { name:'Frost Seal',       emoji:'🧊', rarity:'character', hero:'mage', desc:'Low rolls (3 or under) apply 1 Chill to the enemy instead of nothing.', effect:'low_roll_chill', value:1 },
  ley_line_crystal:  { name:'Ley Line Crystal', emoji:'🔮', rarity:'character', hero:'mage', desc:'Once per combat, set your die to 6 (or its max face if lower).', effect:'once_per_combat_set_six' },

  assassins_edge:    { name:"Assassin's Edge", emoji:'🗡️', rarity:'character', hero:'thief', desc:'Every 4th card played each turn deals double damage.', effect:'fourth_card_double_dmg' },
  shadow_wrap:       { name:'Shadow Wrap',     emoji:'🥷', rarity:'character', hero:'thief', desc:'Start every combat with 5 Block.',                       effect:'start_block', value:5 },
  venomfang:         { name:'Venomfang',       emoji:'🐍', rarity:'character', hero:'thief', desc:'Poison deals +1 damage per tick.',                       effect:'poison_tick_bonus', value:1 },

  midnight_hunger:   { name:'Midnight Hunger', emoji:'🌘', rarity:'character', hero:'vampire', desc:"If you didn't hit affinity this turn, your next roll gets +2.", effect:'no_extreme_next_roll_bonus', value:2 },
  crimson_lens:      { name:'Crimson Lens', emoji:'🔴', rarity:'character', hero:'vampire', desc:'On a non-extreme roll, Vampire Attacks heal 50% of the damage dealt.', effect:'nonextreme_attack_lifesteal', value:0.5 },
  blood_pact:        { name:'Blood Pact',   emoji:'🩸', rarity:'character', hero:'vampire', desc:'Heal back 50% of any HP you spend as a card cost.',                  effect:'card_cost_hp_refund',       value:0.5 },

  devils_ledger:     { name:"Devil's Ledger", emoji:'📓', rarity:'character', hero:'gambler', desc:'Every 20 Gold spent this run adds +1 damage, up to +8.', effect:'gold_spent_dmg_bonus', value:1 },

  house_always_wins: { name:'The House Always Wins', emoji:'🎰', rarity:'character', hero:'gambler', desc:'Roll max 2 turns in a row → next card costs 0.', effect:'max_streak_free_card' },

  loaded_coat:       { name:'Loaded Coat', emoji:'🧥', rarity:'character', hero:'gambler', desc:'Once per combat, swap your active die for any die type for the rest of that fight.', effect:'once_per_combat_die_swap' }
};

function hasRelic(key) { return G.relics && G.relics.includes(key); }

// ═══════════════════════════════════════════════════════════════════
// CONSUMABLES (batches 1–2) — inventory model + in-combat use, no acquisition path yet
// ═══════════════════════════════════════════════════════════════════
// Unlike RELICS' `effect` field (a string tag dispatched at various passive hook sites), a
// consumable's `effect` is a real function called directly on use — every entry reuses an
// existing combat function verbatim (healPlayer/gainBlock/applyStatus/drawCards), so there is
// nothing to dispatch through.
//
// Listed in GDD §12 table order so this object can be read straight down against the design
// table. Dice Stabilizer is the one designed item still missing — it needs a new multi-turn
// die-lock mechanic (no existing function to reuse), unlike these nine.
//
// Numbers are GDD §12 verbatim; `desc` doubles as the slot-button tooltip, so it states the
// same figure the effect applies. Statuses use the exact G.statuses name strings (emoji
// included) that js/combat.js matches on — a bare 'Weak' would create a second, inert status.
const CONSUMABLES = {
  health_potion:  { name: 'Health Potion',  emoji: '🧪', desc: 'Heal 20 HP.', effect: (g) => healPlayer(g, 20) },
  smoke_vial:     { name: 'Smoke Vial',     emoji: '💨', desc: 'Apply Weak 2 to the enemy.', effect: (g) => { applyStatus(g, 'enemy', '😵Weak', 2); showMsg('💨 Smoke Vial — enemy Weakened!'); } },
  fire_flask:     { name: 'Fire Flask',     emoji: '🔥', desc: 'Apply 4 Burn to the enemy.', effect: (g) => { applyStatus(g, 'enemy', '🔥Burn', 4); showMsg('🔥 Fire Flask — 4 Burn!'); } },
  poison_vial:    { name: 'Poison Vial',    emoji: '☠️', desc: 'Apply 5 Poison to the enemy.', effect: (g) => { applyStatus(g, 'enemy', '☠️Poison', 5); showMsg('☠️ Poison Vial — 5 Poison!'); } },
  energy_crystal: { name: 'Energy Crystal', emoji: '⚡', desc: 'Gain 2 Energy this turn.', effect: (g) => { g.energy = Math.min(g.energy + 2, g.maxEnergy + 2); showMsg('⚡ Energy Crystal — +2 Energy!'); } },
  scroll_of_draw: { name: 'Scroll of Draw', emoji: '📜', desc: 'Draw 3 cards immediately.', effect: (g) => { drawCards(g, 3); showMsg('📜 Scroll of Draw — drew 3!'); } },
  dice_stabilizer:{ name: 'Dice Stabilizer',emoji: '🔒', desc: 'Lock your die at its current result for 2 turns. No rerolling or forcing the die while locked.', effect: (g) => lockDice(g) },
  gold_pouch:     { name: 'Gold Pouch',     emoji: '💰', desc: 'Gain 40 Gold instantly.', effect: (g) => { g.gold += 40; showMsg('💰 Gold Pouch — +40 Gold!'); } },
  block_stone:    { name: 'Block Stone',    emoji: '🪨', desc: 'Gain 15 Block.', effect: (g) => gainBlock(g, 'player', 15) },
  chaos_potion:   { name: 'Chaos Potion',   emoji: '🌀', desc: 'Apply a random status to the enemy: Poison, Burn, Weak, or Vulnerable.', effect: (g) => applyChaosPotion(g) },
};

const CONSUMABLE_SLOT_CAP = 3;

// GDD §12's "Available From" and "Floor" columns, transcribed. Kept separate from CONSUMABLES for
// the same reason RELIC_RARITY_MIN_FLOOR is kept separate from RELICS: that table is about what an
// item DOES, this one is about when and where it may be offered, and only this one is read by the
// offer sites. `minFloor` values are G.currentFloor indices, which are zero-based — index 1 is
// Floor 2, index 2 is Floor 3 — matching RELIC_RARITY_MIN_FLOOR exactly.
//
// `sources` is the GDD column verbatim, and it is narrower than "every item is sold everywhere":
// Gold Pouch and Chaos Potion are Event/Magic-Door only and must never be shop stock (paying Gold
// for a Gold Pouch is a wash by construction), while Fire Flask and Poison Vial are the only two
// Elite-reward items. `cost` is therefore null for anything with no 'shop' source — there is no
// price because it is never sold.
//
// 'door' (Magic Door) is transcribed here for completeness but has no grant site yet — no Magic
// Door hands out a consumable. Adding one means calling offerableConsumables('door') there; the
// data is already correct.
//
// NOT in the GDD: the per-item Gold prices. §12 gives no price column, so these are set inside the
// 50-120 band PROGRESS.md records for shop items, anchored on 50 for Health Potion because that is
// exactly what the retired hardcoded "Healing Potion" shop entry charged.
const CONSUMABLE_AVAILABILITY = {
  health_potion:   { sources: ['shop', 'event'],          minFloor: 0, cost: 50 },
  smoke_vial:      { sources: ['shop', 'event'],          minFloor: 0, cost: 55 },
  fire_flask:      { sources: ['shop', 'elite'],          minFloor: 0, cost: 60 },
  poison_vial:     { sources: ['shop', 'elite'],          minFloor: 0, cost: 60 },
  energy_crystal:  { sources: ['shop', 'door'],           minFloor: 1, cost: 70 },
  scroll_of_draw:  { sources: ['shop', 'event'],          minFloor: 0, cost: 65 },
  dice_stabilizer: { sources: ['shop', 'door'],           minFloor: 1, cost: 75 },
  gold_pouch:      { sources: ['event', 'door'],          minFloor: 0, cost: null },
  block_stone:     { sources: ['shop', 'event'],          minFloor: 0, cost: 50 },
  chaos_potion:    { sources: ['event', 'door'],          minFloor: 2, cost: null },
};

// The single source of truth for "which consumables may be offered right now", modelled directly
// on offerableRelics() below — one helper shared by every source, so the floor rule cannot drift
// between the shop, elite drops and events the way the relic pools had already drifted before
// offerableRelics() consolidated them.
function offerableConsumables(source, g = G) {
  const floor = (g && g.currentFloor) || 0;
  return Object.keys(CONSUMABLES).filter(key => {
    const avail = CONSUMABLE_AVAILABILITY[key];
    if (!avail) return false;                          // no availability data — never offer blind
    if (!avail.sources.includes(source)) return false;
    if (source === 'shop' && avail.cost == null) return false; // unsellable; belt and braces
    return floor >= (avail.minFloor || 0);
  });
}

// Items usable outside combat. Everything else needs a live fight to mean anything — enemy
// statuses need an enemy, Energy/draw/Block are per-turn combat resources, and the die lock needs
// turns to lock. Health Potion and Gold Pouch are the two whose effect is pure run state.
const OUT_OF_COMBAT_CONSUMABLES = ['health_potion', 'gold_pouch'];

function isUsableOutOfCombat(key) { return OUT_OF_COMBAT_CONSUMABLES.includes(key); }

// Consumable tiles drawn per shop visit, before the 4-tile slice. Two rather than one so the stock
// visibly rotates; the retired hardcoded potion was a single guaranteed entry out of five.
const CONSUMABLE_SHOP_SLOTS = 2;

// Mirrors acquireRelic()'s pattern (plain push + showMsg + a UI refresh call), with one
// difference relics don't need: a slot cap. Unlike acquireRelic(), this has no dedupe guard —
// consumables are stackable, so holding two Health Potions is a valid, common case, not a bug.
// `options.allowSwapPrompt` (default true) — at 3/3, offer the player a choice of which held item
// to discard instead of dropping the new one silently. Callers that must not prompt pass false:
// the shop, whose contract is to refuse BEFORE charging (prompting after payment would let a
// decline take the Gold for nothing), and js/debug.js, where a modal mid-setup is wrong.
//
// `options.onDone(granted)` — called once the grant has fully resolved, which for the prompt path
// is after the player chooses. Callers that schedule a screen change afterwards must use this
// rather than sequencing on the return value, because the prompt is asynchronous.
//
// Return value is synchronous and therefore cannot describe the prompt path: it is `true` only for
// an immediate grant, `false` for an immediate refusal AND for "a prompt is now open". Anything
// that needs the real outcome must read onDone's argument.
function grantConsumable(key, options = {}) {
  const item = CONSUMABLES[key];
  if (!item) return false;
  const done = typeof options.onDone === 'function' ? options.onDone : null;

  if (G.consumables.length >= CONSUMABLE_SLOT_CAP) {
    // A prompt is already open — only reachable if a second grant fires while the modal is up,
    // which the modal itself makes practically impossible. Handled anyway so the function stays
    // total rather than clobbering the pending choice with a second one.
    if (options.allowSwapPrompt === false || G._pendingConsumableSwap) {
      showMsg(`Inventory full (${CONSUMABLE_SLOT_CAP}/${CONSUMABLE_SLOT_CAP}) — cannot carry another item.`);
      if (done) done(false);
      return false;
    }
    // Ownership of `done` passes to the prompt, which calls it on resolve — so deliberately not
    // called here.
    showConsumableSwapPrompt(key, done);
    return false;
  }

  addConsumable(key);
  if (done) done(true);
  return true;
}

// The actual inventory write, shared by the normal grant and the post-swap grant so the acquire
// message and both render paths cannot drift between them. Does not check the cap — callers do,
// and the swap path has just freed a slot.
function addConsumable(key) {
  const item = CONSUMABLES[key];
  if (!item) return;
  G.consumables.push(key);
  showMsg(`${item.emoji} ${item.name} acquired!`);
  renderConsumableSlots();
  renderFieldInventory(); // grants happen out of combat too (shop, event, elite reward)
}

// Inventory-full choice prompt. Lists the 3 held items by INDEX, not by key, so holding three of
// the same item still offers three distinct buttons.
function showConsumableSwapPrompt(key, onDone) {
  const item = CONSUMABLES[key];
  const overlay = document.getElementById('consumable-swap-overlay');
  const list = document.getElementById('consumable-swap-list');
  const desc = document.getElementById('consumable-swap-desc');
  if (!overlay || !list || !desc) {
    // Overlay missing from the DOM. Degrade to the old behaviour — the item is lost, but with a
    // message — rather than leaving the grant in limbo with no way for the player to resolve it.
    showMsg(`Inventory full — ${item.emoji} ${item.name} left behind.`);
    if (onDone) onDone(false);
    return;
  }
  G._pendingConsumableSwap = { key, onDone };
  desc.innerHTML = `Discard one to make room for <strong>${item.emoji} ${item.name}</strong>,`
    + ' or leave it behind.';
  list.innerHTML = '';
  G.consumables.forEach((heldKey, i) => {
    const held = CONSUMABLES[heldKey];
    if (!held) return;
    const btn = document.createElement('button');
    btn.className = 'btn consumable-swap-btn';
    btn.innerHTML = `🗑 Discard ${held.emoji} ${held.name}<span class="swap-btn-sub">${held.desc}</span>`;
    btn.onclick = () => resolveConsumableSwap(i);
    list.appendChild(btn);
  });
  overlay.classList.add('visible');
}

function closeConsumableSwapPrompt() {
  const overlay = document.getElementById('consumable-swap-overlay');
  if (overlay) overlay.classList.remove('visible');
  if (G) G._pendingConsumableSwap = null;
}

// Discard the held item at `index` and complete the pending grant.
function resolveConsumableSwap(index) {
  const pending = G && G._pendingConsumableSwap;
  if (!pending) return;
  if (index < 0 || index >= G.consumables.length) return;
  const dropped = CONSUMABLES[G.consumables[index]];
  // Cleared before the grant so the re-entrancy guard in grantConsumable() cannot see a stale
  // pending swap, and so a double-click on a button cannot resolve the same prompt twice.
  closeConsumableSwapPrompt();
  G.consumables.splice(index, 1);
  if (dropped) showMsg(`🗑 ${dropped.emoji} ${dropped.name} discarded.`);
  addConsumable(pending.key);
  if (pending.onDone) pending.onDone(true);
}

// Decline the swap: inventory untouched, new item lost. Same outcome as the old silent drop, but
// now it is the player's decision rather than something that happened to them.
function declineConsumableSwap() {
  const pending = G && G._pendingConsumableSwap;
  if (!pending) return;
  const item = CONSUMABLES[pending.key];
  closeConsumableSwapPrompt();
  if (item) showMsg(`${item.emoji} ${item.name} left behind.`);
  if (pending.onDone) pending.onDone(false);
}

// Small slot row, separate from the hand — only currently-held items are rendered (no empty
// placeholder boxes), so the row grows/shrinks as items are used rather than always showing 3
// fixed slots. Floated the same way #soul-die-controls is (see css/styles.css), on the opposite
// side of the dice panel, so neither disturbs the panel's fixed grid/mobile sizing.
function renderConsumableSlots() {
  const el = document.getElementById('consumable-slots');
  if (!el) return;
  el.innerHTML = '';
  (G.consumables || []).forEach((key, idx) => {
    const item = CONSUMABLES[key];
    if (!item) return;
    const btn = document.createElement('button');
    btn.className = 'btn soul-die-btn consumable-slot';
    btn.textContent = `${item.emoji} ${item.name}`;
    btn.title = item.desc;
    btn.onclick = () => useConsumable(idx);
    el.appendChild(btn);
  });
}

// Screens that show the out-of-combat inventory: everywhere the player is between fights and could
// reasonably want a potion. Deliberately excludes combat-screen (the in-combat slot row above
// covers it), the title/char screens (no run yet), reward/boss-intro/Crimson screens (mid-flow,
// and the element would overlap their layouts), and gameover/victory (the run is over).
const FIELD_INVENTORY_SCREENS = ['path-screen', 'door-screen', 'rest-screen', 'shop-screen', 'event-screen'];

// True while the player is in a fight. Cannot be `!!G.enemy`: G.enemy is never set back to null
// when a combat ends, so it stays truthy for the rest of the run after the first fight. showScreen()
// stamps G._activeScreen, which is the only reliable in-vs-out-of-combat signal available.
//
// This relies on every fight entry routing through showScreen('combat-screen'). Verified for all
// five: startAldricFight(), startBossFight() and startSirCrimsonFight() call it themselves, and
// startCombat() is preceded by showCombatScreen() at both of its call sites (js/game.js's room
// dispatch and js/debug.js's combat/elite targets). A future fight-start path that skips it would
// leave the 8 combat-only consumables refused mid-fight — call showCombatScreen() first.
function inCombatScreen(g = G) { return !!g && g._activeScreen === 'combat-screen'; }

// The out-of-combat counterpart to renderConsumableSlots(). Differences that matter: it renders all
// 3 slots including empties (the carry limit is worth seeing while shopping), and it disables the 8
// items whose effect needs a live fight rather than hiding them — a hidden item looks lost.
function renderFieldInventory() {
  const wrap = document.getElementById('field-inventory');
  const el = document.getElementById('field-inv-slots');
  if (!wrap || !el) return;
  wrap.classList.toggle('visible', FIELD_INVENTORY_SCREENS.includes(G && G._activeScreen));
  el.innerHTML = '';
  const held = (G && G.consumables) || [];
  for (let i = 0; i < CONSUMABLE_SLOT_CAP; i++) {
    const key = held[i];
    if (key === undefined) {
      const empty = document.createElement('div');
      empty.className = 'field-inv-empty';
      empty.textContent = '— empty —';
      el.appendChild(empty);
      continue;
    }
    const item = CONSUMABLES[key];
    if (!item) continue;
    const usable = isUsableOutOfCombat(key);
    const btn = document.createElement('button');
    btn.className = 'btn soul-die-btn consumable-slot';
    btn.innerHTML = `${item.emoji} ${item.name}`
      + (usable ? '' : '<span class="field-inv-why">Combat only</span>');
    btn.disabled = !usable;
    btn.title = usable ? item.desc : `${item.desc} — usable only during a fight.`;
    if (usable) btn.onclick = () => useConsumable(i);
    el.appendChild(btn);
  }
}

// The rest and shop screens each paint their own HP bar once, inside showRestStop()/showShop().
// A Health Potion used from the field inventory changes HP without re-running either, so those
// readouts would keep showing the pre-heal value until the screen was rebuilt. Both element sets
// exist in the DOM regardless of which screen is active, so updating them unconditionally is
// simpler than working out which one is up, and harmless for the hidden one.
function refreshFieldHpDisplays() {
  const pct = Math.round(G.hp / G.maxHp * 100);
  [['rest-hp-text', 'rest-hp-bar', 'rest-hp-pct'], ['shop-hp-text', 'shop-hp-bar', 'shop-hp-pct']]
    .forEach(([textId, barId, pctId]) => {
      const text = document.getElementById(textId);
      const bar = document.getElementById(barId);
      const pctEl = document.getElementById(pctId);
      if (text) text.textContent = `${Math.max(0, G.hp)} / ${G.maxHp}`;
      if (bar) bar.style.width = pct + '%';
      if (pctEl) {
        pctEl.textContent = pct + '%';
        pctEl.className = 'rest-hp-pct ' + (pct <= 30 ? 'hp-low' : pct <= 60 ? 'hp-mid' : 'hp-full');
      }
    });
}

// Relics that exist in RELICS but have no implementation anywhere — no hasRelic() hook and no
// acquireRelic() pickup branch — so buying or picking one grants a no-op. Verified by auditing
// every key against the whole codebase. **Delete a key from this list the moment its behaviour
// lands**, otherwise a finished relic stays unobtainable.
//   bone_key         — "Every 4th room has a chance to contain a hidden chest" (no room hook)
//   shattered_mirror — "When an enemy copies your card, they take 10 damage" (no copy mechanic)
const UNIMPLEMENTED_RELICS = ['bone_key', 'shattered_mirror'];

// Earliest floor each rarity may be offered (GDD §9: Common any floor, Uncommon Floor 2+,
// Rare Floor 3+, Character Floor 3+). Values are G.currentFloor indices, which are zero-based —
// index 1 is Floor 2. Character is gated exactly like Rare: it limits when that SLOT can fill,
// not whether the boss reward screen appears.
const RELIC_RARITY_MIN_FLOOR = { common: 0, uncommon: 1, rare: 2, character: 2 };

// The single source of truth for "which relics may be offered right now".
//
// Both offer pools — the shop and the Void Compass elite reward — previously inlined their own
// `Object.entries(RELICS).filter(([k]) => !G.relics.includes(k))`, which applied no rarity or
// floor gating at all, so a Floor 1 shop could sell King's Debt or Hollow Throne. The shop even
// carried a comment claiming it used a common-only pool that was never implemented. Sharing one
// helper is the point: two copies of this rule had already drifted from the design and from the
// comment sitting directly above one of them.
function offerableRelics(g = G) {
  const floor = g.currentFloor || 0;
  return Object.entries(RELICS).filter(([key, relic]) => {
    if ((g.relics || []).includes(key)) return false;      // already owned
    if (UNIMPLEMENTED_RELICS.includes(key)) return false;  // would grant nothing
    // Character relics are boss-reward-only and hero-locked (GDD §9), so they are excluded from
    // this general pool entirely — the shop and the Void Compass screen must never offer them.
    // The boss screen adds them separately via offerableCharacterRelics().
    if (relic.rarity === 'character') return false;
    const minFloor = RELIC_RARITY_MIN_FLOOR[relic.rarity];
    if (minFloor === undefined) return false;              // unknown rarity — never offer blind
    return floor >= minFloor;
  });
}

// The current hero's Character relics that may be offered right now. Same ownership /
// unimplemented / floor rules as offerableRelics(), plus the hero lock. Kept separate rather than
// folded in because these have exactly one legal source: the boss reward screen's Character slot.
function offerableCharacterRelics(g = G) {
  const floor = g.currentFloor || 0;
  const minFloor = RELIC_RARITY_MIN_FLOOR.character;
  return Object.entries(RELICS).filter(([key, relic]) => {
    if (relic.rarity !== 'character') return false;
    if (relic.hero !== g.charKey) return false;            // never another hero's relic
    if ((g.relics || []).includes(key)) return false;
    if (UNIMPLEMENTED_RELICS.includes(key)) return false;
    return floor >= minFloor;
  });
}

// Ownership check for a hero-locked relic. Deliberately stricter than hasRelic(): the relic must
// also belong to the hero being played, so one granted off-pool cannot fire on the wrong hero.
function hasCharacterRelic(key, g = G) {
  if (!hasRelic(key)) return false;
  const relic = RELICS[key];
  return !!relic && relic.hero === g.charKey;
}

// Rarity bucket a card sits in. Checks the active hero's pool first — reward screens only ever
// offer cards from it — then falls back to any hero's pool, because the shop can sell a card
// outside the current hero's pool (Blizzard is a Mage card but any hero can buy it) and would
// otherwise mislabel it Common. Shared by showReward() and the shop's card tiles so the two
// screens can never disagree about the same card.
function getCardRarity(key) {
  const own = CHAR_REWARD_POOLS[G.charKey];
  if (own) {
    if ((own.rare || []).includes(key)) return 'rare';
    if ((own.uncommon || []).includes(key)) return 'uncommon';
    if ((own.common || []).includes(key)) return 'common';
  }
  for (const pool of Object.values(CHAR_REWARD_POOLS || {})) {
    if ((pool.rare || []).includes(key)) return 'rare';
    if ((pool.uncommon || []).includes(key)) return 'uncommon';
    if ((pool.common || []).includes(key)) return 'common';
  }
  return 'common';
}

const CARD_RARITY_COLORS = { common: 'var(--text2)', uncommon: 'var(--energy)', rare: '#c9a84c' };
const titleCase = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

function shopCost(n) { return Math.ceil(n * (hasRelic('kings_debt') ? 1.25 : 1)); }

// Centralized player Gold spend — mirrors loseHP()'s role for HP loss, and for the identical
// reason: every gold-spending path (shop card/relic/die buys, card removal, card upgrade, the
// Mirror path-switch cost) was independently doing `G.gold -= X` in place, with no shared
// chokepoint. That was fine until a relic needed to track total Gold spent (Devil's Ledger) —
// adding the tracking at each site individually risks a future 7th spend site quietly skipping
// it. `amount` is whatever the caller has already computed as the final cost (King's Debt's
// markup via shopCost() is baked in upstream, so a relic reading the counter correctly sees the
// Gold actually spent, inflated price included). Callers already gate on affordability before
// calling this, so the guard here is defensive parity with loseHP()'s own, not load-bearing.
function spendGold(g, amount) {
  if (amount == null || amount <= 0) return;
  g.gold -= amount;
  g.goldSpentThisRun = (g.goldSpentThisRun || 0) + amount;
}

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
  // Consumable stock is generated per visit rather than living in SHOP_ITEMS, so it rotates and
  // honours GDD §12's floor gating (Energy Crystal / Dice Stabilizer are Floor 2+). Two distinct
  // slots are drawn, then thrown in with the static card/die stock and sliced to 4 like always —
  // so consumables compete for shelf space instead of being guaranteed, which is how the single
  // retired "Healing Potion" entry behaved.
  const consumableStock = shuffle(offerableConsumables('shop'))
    .slice(0, CONSUMABLE_SHOP_SLOTS)
    .map(key => ({ consumable: key, cost: CONSUMABLE_AVAILABILITY[key].cost }));
  const pool = shuffle([...SHOP_ITEMS, ...consumableStock]).slice(0, 4);
  pool.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'shop-item';
    el.id = `shop-item-${i}`;
    const itemCost = shopCost(item.cost);
    const canAfford = G.gold >= itemCost;
    if (!canAfford) el.style.opacity = '0.5';
    // Card purchases (item.card) render their real card data — name, emoji, type, rarity, Energy
    // cost and effect text straight from CARDS — matching the detail the Victory reward screen
    // shows. They used to carry hardcoded name/desc strings, which is how a tile titled "Sharp
    // Card" ended up advertising Blizzard. Non-card stock (potions, the die) is unchanged.
    const shopCard = item.card ? CARDS[item.card] : null;
    // Consumable tiles read their name/emoji/desc live from CONSUMABLES for exactly the same
    // anti-drift reason card tiles read theirs from CARDS — a tile can never advertise something
    // different from what the purchase grants.
    const shopConsumable = item.consumable ? CONSUMABLES[item.consumable] : null;
    if (shopConsumable) {
      const held = (G.consumables || []).length;
      const full = held >= CONSUMABLE_SLOT_CAP;
      if (full) el.style.opacity = '0.5';
      el.innerHTML = `<span class="shop-item-emoji">${shopConsumable.emoji}</span>`
        + `<div class="shop-item-name">${shopConsumable.name}</div>`
        + `<div class="shop-item-type" style="color:var(--purple2)">Consumable · ${held}/${CONSUMABLE_SLOT_CAP} carried</div>`
        + `<div class="shop-item-desc">${shopConsumable.desc}</div>`
        + `<div class="shop-item-cost" style="color:${canAfford ? 'var(--energy)' : 'var(--red2)'}">🪙 ${itemCost}</div>`;
    } else if (shopCard) {
      const rarity = getCardRarity(item.card);
      el.innerHTML = `<span class="shop-item-emoji">${shopCard.emoji}</span>`
        + `<div class="shop-item-name">${shopCard.name}</div>`
        + `<div class="shop-item-type" style="color:${CARD_RARITY_COLORS[rarity]}">${shopCard.type} · ${titleCase(rarity)} · ⚡${shopCard.cost}</div>`
        + `<div class="shop-item-desc">${shopCard.desc}</div>`
        + `<div class="shop-item-cost" style="color:${canAfford ? 'var(--energy)' : 'var(--red2)'}">🪙 ${itemCost}</div>`;
    } else {
      el.innerHTML = `<span class="shop-item-emoji">${item.emoji}</span><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div><div class="shop-item-cost" style="color:${canAfford ? 'var(--energy)' : 'var(--red2)'}">🪙 ${itemCost}</div>`;
    }
    el.onclick = () => {
      if (G.gold < itemCost) { showMsg('Not enough gold!'); return; }
      // Checked BEFORE spending, unlike every other stock type: a full inventory is the one case
      // where the purchase cannot be delivered, and taking the Gold anyway would be theft.
      // grantConsumable() also refuses at the cap, but it cannot refund.
      if (shopConsumable && (G.consumables || []).length >= CONSUMABLE_SLOT_CAP) {
        showMsg(`Inventory full (${CONSUMABLE_SLOT_CAP}/${CONSUMABLE_SLOT_CAP}) — use something first.`);
        return;
      }
      spendGold(G, itemCost);
      if (shopConsumable) {
        // Routed through the same grant every other source uses, so the cap, the acquire message
        // and the slot-row refresh are all shared rather than re-implemented at the till.
        //
        // allowSwapPrompt:false is the important half. Gold has already been spent by this line, so
        // the swap prompt must never open here — declining it would mean paying for nothing. The
        // shop's contract is the pre-charge refusal above instead, which is why that check cannot
        // be deleted in favour of the prompt.
        grantConsumable(item.consumable, { allowSwapPrompt: false });
      } else if (shopCard) {
        // Same grant the reward screen performs, so the card sold is always the card described.
        G.deck.push(item.card);
        showMsg(`${shopCard.name} added to deck!`);
      } else {
        item.effect(G);
      }
      document.getElementById(`shop-item-${i}`).classList.add('sold');
      // refresh gold and HP displays
      document.getElementById('shop-gold-display').textContent = G.gold;
      const newPct = Math.round(G.hp / G.maxHp * 100);
      document.getElementById('shop-hp-text').textContent = `${Math.max(0, G.hp)} / ${G.maxHp}`;
      document.getElementById('shop-hp-bar').style.width = newPct + '%';
      document.getElementById('shop-hp-pct').textContent = newPct + '%';
      renderShopDeck();
      renderFieldInventory(); // a bought consumable appears in the out-of-combat row immediately
      updateHUD();
    };
    items.appendChild(el);
  });

  renderShopDeck();
  renderShopRelics();
  renderShopDie();
}

// Grant a relic and apply its immediate pickup side effects. Shared by the shop and the
// Void Compass post-elite relic reward so the effects (Ivory Die, Hollow Throne, etc.)
// can never drift between the two acquisition paths.
function acquireRelic(key) {
  if (G.relics.includes(key)) return;
  const relic = RELICS[key];
  G.relics.push(key);
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
    const gd = document.getElementById('shop-gold-display'); if (gd) gd.textContent = G.gold;
    showMsg("💰 King's Debt — +60 Gold! Shop prices now cost 25% more.");
  } else {
    showMsg(`${relic.emoji} ${relic.name} acquired!`);
  }
  updateHUD();
}

function renderShopRelics() {
  const grid = document.getElementById('shop-relics-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Rarity/floor gating and the unimplemented-relic exclusion both live in offerableRelics().
  const shopRelics = shuffle([...offerableRelics(G)]).slice(0, 2);

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
      spendGold(G, cost);
      acquireRelic(key); // shared grant + pickup side effects
      el.classList.add('sold');
      document.getElementById('shop-gold-display').textContent = G.gold;
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
    spendGold(G, shopCost(80));
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
  // Removal's gate and charge were already routed through shopCost(); resolving it once matches
  // showShopUpgrade() and lets the modal copy use the same number the click spends.
  const cost = shopCost(75);
  if (G.gold < cost) { showMsg(`Not enough gold! (${cost} 🪙)`); return; }
  const removable = G.deck.filter(k => k !== 'strike' && k !== 'defend');
  if (removable.length === 0) { showMsg('No removable cards in deck!'); return; }

  const removeHint = document.getElementById('shop-remove-cost-text');
  if (removeHint) removeHint.textContent = `Tap a card to permanently remove it. Cost: ${cost} 🪙`;

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
      spendGold(G, cost);
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

// NOTE: this function currently has no caller — the shop's "Card services" row holds only
// #shop-remove-btn, so the upgrade modal is unreachable in the active build even though its markup
// exists in index.html. The pricing below is still the live price if a button is ever added.
function showShopUpgrade() {
  // Routed through shopCost() like every other shop spend. It was a flat 80 at all three points
  // (the gate, the message and the charge), so King's Debt inflated card removal, relics, dice and
  // consumables but left card upgrades at list price — the one hole in that relic's downside.
  // Resolved once here rather than per-site, so the number shown and the number charged are the
  // same value, not two independent calls that a mid-modal relic pickup could split.
  const cost = shopCost(80);
  if (G.gold < cost) { showMsg(`Not enough gold! (${cost} 🪙)`); return; }
  const upgradeable = [...new Set(G.deck.filter(k => !k.endsWith('+') && CARDS[k + '+']))];
  if (upgradeable.length === 0) { showMsg('No upgradeable cards!'); return; }

  // Modal copy carried a hardcoded "Cost: 80 🪙", which would have contradicted the charge under
  // King's Debt. Set from the same `cost` the click spends.
  const upgradeHint = document.getElementById('shop-upgrade-cost-text');
  if (upgradeHint) upgradeHint.textContent = `Tap a card to upgrade it. Cost: ${cost} 🪙`;

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
      spendGold(G, cost);
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
    uncommon: ['haymaker','skullcrack','recklesslunge','battlecry','ironroar','bloodlust','entrench','overpowerattack','crushingblow','warcallecho','soulsteal','stealheal','ironwall','curseddice'],
    rare:     ['ragefuel','berserkersoath','warlordspresence','deathrattle','laststand','battletrance']
  },
  mage: {
    common:   ['spark','flametouch','meditate','channelfocus','frostbolt','arcanebarrier','manasurge','arcaneboost','voidchannel','fireball','blizzard'],
    uncommon: ['icelance','combustion','chainbolt','ignite','arcanerecall','manaweave','frostfire','arcanebarrage','arcanesight','arcanemomentum','soulsteal','ironwall','curseddice'],
    rare:     ['frozeninferno','inferno','timewarp','spellecho','coldmastery','burningsoul']
  },
  thief: {
    common:   ['swiftjab','slipaway','cheapshot','coinflick','nimblepace','quickstrike','shadowstep','poisonblade','pickpocket','smokescreen'],
    uncommon: ['envenomdagger','backstab','cripple','shadowmark','poisoncloud','bladedance','disappear','concoction','thiefsgambit','gutpunch','soulsteal','stealheal','curseddice'],
    rare:     ['deathmark','shadowartist','poisonmaster','lethalrhythm','assassinate','goldenstrike']
  },
  vampire: {
    common:   ['bloodpulse','draintouch','nightveil','darkblood','swoopdown','blooddrain','nightshroud','lifeleech','crimsonbite','darkembrace'],
    uncommon: ['sanguinestrike','crimsonpact','bloodbank','drainlife','batform','shadowfeast','darkrite','bloodrush','nightstalk','cursedveins','ironwall','soulsteal','stealheal','curseddice'],
    rare:     ['bloodlord','eternalhunger','vampiricform','darkascension','soulrend','bloodtide']
  },
  gambler: {
    common:   ['longshot','safepull','risktaker','oddscheck','chipsin','highorlow','doubldown','luckystrike','hedgebet','wildcard'],
    uncommon: ['allin','loadeddie','pocketaces','doubleornothing','counttheodds','highstakes','bluff','wildcardcombo','pressyourluck','jackpot','soulsteal','stealheal','curseddice'],
    rare:     ['houseedge','luckystreak','gamblersfallacy','bettingitall','loadedhouse','devilsdeal']
  }
};

function showReward() {

  // Exhausted cards "return to the deck" after combat by simply being released from the
  // exclusion list — they never left G.deck in the first place.
  //
  // BUG FIX (Aug 15, 2026): this used to `G.deck.push(...G.exhaustedPile)` before clearing.
  // Cards are string keys and G.deck is the persistent master list; exhausting a card only
  // adds its key to G.exhaustedPile, which shuffleDeck()/drawCards() use to keep it out of the
  // draw pile for the current fight. Nothing ever removed it from G.deck — so pushing it back
  // permanently added a duplicate copy for every exhaust, every combat.
  G.exhaustedPile = [];

  document.getElementById('reward-hp').textContent = G.hp + '/' + G.maxHp;
  document.getElementById('reward-gold').textContent = G.gold;
  document.getElementById('reward-souls').textContent = G.souls;
  showScreen('reward-screen');
  setRewardSkipVisible(true);
  const rewardSub = document.getElementById('reward-sub');
  if (rewardSub) rewardSub.textContent = 'Choose your reward — a card';
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

  const rarityColor = CARD_RARITY_COLORS;

  allPicks.forEach(key => {
    const c = CARDS[key];
    if (!c) return;
    const cardRarity = getCardRarity(key);   // shared with the shop's card tiles
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
      proceedAfterCardReward();
    };
    pool.appendChild(el);
  });

  // Sir Crimson's Floor 2/3 confrontation (GDD §5) now interrupts THIS render — the real card
  // reward for the Floor 2 boss — rather than gating the end of the whole reward chain the way
  // the Floor 1/2 shadow beat still does (see proceedOrPath()). The card/gold/HP shown above are
  // the real, final values; nothing below regenerates or replaces them, so what the player sees
  // once the smoke clears is byte-identical to what rendered here.
  if (G.inBoss && !G.isFinalBoss && G.currentFloor === 2 && !G._sirCrimsonFought && !G._sirCrimsonInterrupting) {
    G._sirCrimsonInterrupting = true; // set synchronously, not inside the timeout — a second
                                       // showReward() call before the timeout fires must not
                                       // schedule a duplicate interruption.
    // Blocked THE MOMENT the interruption is scheduled, not only once the smoke overlay's own
    // pointer-events kick in — otherwise a fast click, or Skip Reward, inside the brief "let the
    // player see their real reward" window below could reach a later screen (boss relic offer,
    // Soul spend) before the smoke ever appears, letting the interruption fire on the wrong
    // screen and letting the reward be claimed twice once it's revealed again on victory.
    // Restored in dismissSirCrimsonOutro() once the smoke reveals this exact screen again.
    pool.style.pointerEvents = 'none';
    setRewardSkipVisible(false);
    setTimeout(() => {
      sirCrimsonSmokeTransition(() => showSirCrimsonConfrontation());
    }, 1200); // long enough that the player registers their real reward before it's obscured
  }
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
  setRewardSkipVisible(true);

  // Die selection uses its own gold header below; hide the card subtitle
  const rewardSub = document.getElementById('reward-sub');
  if (rewardSub) rewardSub.textContent = '';

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
      const previousDie = currentDieData;
      G.activeDie = dieOpt.type;
      G.diceMax = dieOpt.max;
      showMsg(dieGrantMessage(dieOpt, previousDie), 5000);
      proceedDoors();
    };
    pool.appendChild(el);
  });
}

// Builds the confirmation line for a die swap. A die is a persistent, run-defining stat, and
// the swap replaces whatever you had, so the message names the die, its range, what it
// replaced, and its bonus — enough that the player never has to infer the grant from a later
// roll. Shared by every die-granting path so they cannot describe the same event differently.
function dieGrantMessage(dieOpt, previousDie) {
  const prev = previousDie ? ` (was ${previousDie.name}, 1–${previousDie.max})` : '';
  const bonus = dieOpt.desc ? ` ${dieOpt.desc}` : '';
  return `${dieOpt.emoji} ${dieOpt.name} equipped — rolls 1–${dieOpt.max}${prev}.${bonus}`;
}

function giveReward(g, type, rarity) {
  if (type === 'die') {
    const previousDie = getDie(G.activeDie);
    // d4 (Cursed Die, max 4) is excluded here specifically. This path is the *unseen* die grant
    // — the player accepts an offer framed as "a powerful reward right now" and gets a random
    // die with no preview, so handing them a strict downgrade from the starting d6 contradicts
    // the offer they agreed to. The Cursed Die stays available wherever the player can see what
    // they are taking (the Magic Door chooser shows each die's range and bonus before the pick).
    const availDice = Object.values(DICE_TYPES)
      .filter(d => d.type !== 'd6' && d.type !== 'd4' && d.type !== G.activeDie);
    const dieOpt = rand(availDice) || getDie('d8');
    G.activeDie = dieOpt.type;
    G.diceMax = dieOpt.max;
    // Held longer than the default: this fires on the event screen and proceedDoors() swaps
    // screens 800ms later, so a 2.5s toast spent most of its life mid-transition. The log is a
    // body-level fixed element, so it survives the screen change and stays readable after it.
    showMsg(dieGrantMessage(dieOpt, previousDie), 5000);
    setTimeout(proceedDoors, 800);
  } else if (type === 'consumable') {
    // Event consumable grant. Same shape as the 'die' branch above — grant, message, then hand off
    // to proceedDoors() itself — so an event choice calling this needs no proceedDoors() of its
    // own (see Hidden Cache in js/data.js).
    //
    // The pool is GDD §12's Event sources, floor-gated by the shared helper, so a Floor 1 event
    // can never hand out the Floor 3+ Chaos Potion.
    //
    // proceedDoors() is deferred until the grant has fully resolved, via onDone. That matters only
    // at 3/3, where grantConsumable() opens the swap prompt: firing the screen change 800ms later
    // regardless would leave the player deciding what to discard on top of the door screen. On the
    // ordinary path onDone runs synchronously, so the timing is unchanged.
    const pool = offerableConsumables('event', g);
    const proceed = () => setTimeout(proceedDoors, 800);
    if (pool.length) {
      grantConsumable(pool[Math.floor(Math.random() * pool.length)], { onDone: proceed });
    } else {
      proceed();
    }
  } else {
    showReward();
  }
}

function skipReward() {
  G.gold += 10;
  showMsg('💰 Skipped — +10 Gold');
  proceedAfterCardReward();
}

// Proceed out of a reward screen — to path select after a boss, otherwise back to the doors.
function proceedOrPath() {
  if (G.needsPathSelect) {
    // Sir Crimson's Floor 1/2 shadow beat (GDD §5) gates entry into the floor it announces, the
    // same way launchFinalBoss() gates the door to Aldric — but unlike Aldric (which skips the
    // entire reward flow via checkCombatEnd()'s early return), it sits AFTER the normal boss-clear
    // reward chain: gold and the full heal already happened in checkCombatEnd(), and by the time
    // proceedOrPath() runs here, the card reward, boss relic offer, and Soul-spend screen have all
    // already had their chance to show. So this only ever delays the final step into path select
    // — it never skips or reorders anything the reward flow already did.
    //
    // The Floor 2/3 confrontation no longer gates here — it now interrupts showReward() directly,
    // before the player ever reaches this point (see showReward()'s own trigger). By the time
    // proceedOrPath() runs for a Floor-2 boss clear, G._sirCrimsonFought is already true (set the
    // moment the stubbed fight resolves), so no check for it is needed here at all.
    if (G.currentFloor === 1 && !G._sirCrimsonShadowSeen) {
      G._sirCrimsonShadowSeen = true;
      showSirCrimsonShadow();
      return;
    }
    G.needsPathSelect = false; showPathSelect();
  }
  else proceedDoors();
}

// ═══════════════════════════════════════════════════════════════════
// SIR CRIMSON — MID-RUN STORY BEATS (GDD §5)
// ═══════════════════════════════════════════════════════════════════
// Not a companion boss — no BOSSES entry, no floor-boss slot. A scripted, unskippable "surprise
// encounter": a wordless shadow between Floor 1 and Floor 2 (gated in proceedOrPath(), unchanged
// from batch 5a), then between Floor 2 and Floor 3 — confrontation, a shadow-themed rest stop,
// then the real fight (batch 5b-ii, js/combat.js — HP 160, his 4-move rotation via the 5b-i
// engine; the GDD's Echo mimic is not built). The interruption itself interrupts showReward()
// directly rather than gating proceedOrPath() at the end of the whole reward chain (batch
// restructure), so all of that — trigger placement, smoke transition, the rest-stop variant — is
// unaffected by the fight now being real instead of a stub.
//
// Dialogue (final as of batch 5d):
const SIR_CRIMSON_SHADOW_LINE = "You feel eyes on you long before you see him. When you turn, he is already gone.";
const SIR_CRIMSON_CONFRONTATION_LINE = '"You\'ve come far for someone who doesn\'t understand what\'s asking you to stop." He draws his blade slowly, almost apologetic. "I was loyal, once. Loyalty is all the castle left me."';
const SIR_CRIMSON_OUTRO_LINE = 'The king... he didn\'t choose this. None of us did. The castle took everything from him — his grief was the door it walked through. If you want to free him, you\'ll need more than steel. Four others wear his grief the way I wore mine. Free them, and you\'ll have what it takes to reach him.';

function showSirCrimsonShadow() {
  const overlay = document.getElementById('sir-crimson-shadow-overlay');
  const line = document.getElementById('sir-crimson-shadow-line');
  if (!overlay || !line) { proceedOrPath(); return; } // markup missing — never hard-block progress
  line.textContent = SIR_CRIMSON_SHADOW_LINE;
  overlay.classList.add('visible');
}
function dismissSirCrimsonShadow() {
  const overlay = document.getElementById('sir-crimson-shadow-overlay');
  if (overlay) overlay.classList.remove('visible');
  proceedOrPath(); // G._sirCrimsonShadowSeen is already true — falls through to showPathSelect()
}

// Fades #sir-crimson-smoke-overlay to full opacity (blocking clicks on whatever is behind it via
// the same .visible class that drives the CSS transition), performs the screen swap while fully
// opaque and invisible to the player, then fades back out. Used for exactly the two moments the
// build spec calls out explicitly — entering the interruption (reward screen darkens) and leaving
// it on victory (revealing the original reward screen) — not for every internal step in between;
// confrontation -> rest -> fight are plain showScreen() swaps, the same as everywhere else in the
// game, matching how the original confrontation -> outro handoff already worked in batch 5a.
function sirCrimsonSmokeTransition(duringOpaque) {
  const smoke = document.getElementById('sir-crimson-smoke-overlay');
  if (!smoke) { duringOpaque(); return; } // markup missing — never hard-block progress
  const FADE_MS = 700; // matches the CSS transition duration
  smoke.classList.add('visible');
  setTimeout(() => {
    duringOpaque();
    // A short paint delay before fading out, so the new screen's first frame is never visible
    // mid-transition through a still-fading-in smoke layer.
    setTimeout(() => smoke.classList.remove('visible'), 50);
  }, FADE_MS);
}

function showSirCrimsonConfrontation() {
  const line = document.getElementById('crimson-confrontation-line');
  if (line) line.textContent = SIR_CRIMSON_CONFRONTATION_LINE;
  showScreen('crimson-confrontation-screen');
}

// Shadow-themed Rest-stop variant between the confrontation and the fight — a full duplicate of
// showRestStop()/startRestPick()/cancelRestPick()/renderRestDeck() under new IDs and function
// names, calling the exact same healPlayer()/upgradeCard()/removeCardFromDeck() mechanics as the
// real Rest room, but ending in sirCrimsonRestComplete() (-> the fight) instead of proceedDoors()
// (-> the door screen). Kept fully separate from the real functions per the confirmed design
// default, so nothing here can ever branch the real Rest room's behavior.
function showSirCrimsonRest() {
  showScreen('crimson-rest-screen');

  const hpPct = Math.round(G.hp / G.maxHp * 100);
  document.getElementById('crimson-rest-hp-text').textContent = `${Math.max(0,G.hp)} / ${G.maxHp}`;
  document.getElementById('crimson-rest-hp-bar').style.width = hpPct + '%';
  const pctEl = document.getElementById('crimson-rest-hp-pct');
  pctEl.textContent = hpPct + '%';
  pctEl.className = 'rest-hp-pct ' + (hpPct <= 30 ? 'hp-low' : hpPct <= 60 ? 'hp-mid' : 'hp-full');

  const healAmt = Math.floor(G.maxHp * 0.3);
  const atFull = G.hp >= G.maxHp;

  const opts = document.getElementById('crimson-rest-options');
  opts.innerHTML = '';
  const options = [
    {
      emoji: '❤️', name: 'Rest',
      desc: atFull ? 'Already at full HP' : `Recover ${healAmt} HP (${Math.min(G.hp + healAmt, G.maxHp)}/${G.maxHp})`,
      disabled: atFull,
      action: () => { healPlayer(G, healAmt); showMsg(`Recovered ${healAmt} HP.`); setTimeout(sirCrimsonRestComplete, 800); }
    },
    {
      emoji: '⬆️', name: 'Upgrade Card',
      desc: 'Pick a card from your deck to upgrade',
      action: () => startSirCrimsonRestPick('upgrade')
    },
    {
      emoji: '🗑️', name: 'Remove Card',
      desc: 'Pick a card from your deck to remove',
      action: () => startSirCrimsonRestPick('remove')
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

  renderSirCrimsonRestDeck(null);
}

function startSirCrimsonRestPick(mode) {
  document.getElementById('crimson-rest-picking-label').style.display = 'block';
  document.getElementById('crimson-rest-picking-label').textContent =
    mode === 'upgrade' ? '✨ Click a card to upgrade it' : '🗑️ Click a card to remove it from your deck';
  document.getElementById('crimson-rest-cancel-btn').style.display = 'inline-block';
  document.querySelectorAll('#crimson-rest-options .rest-option').forEach(el => {
    el.style.opacity = '0.3';
    el.style.pointerEvents = 'none';
  });
  renderSirCrimsonRestDeck(mode);
}

function cancelSirCrimsonRestPick() {
  document.getElementById('crimson-rest-picking-label').style.display = 'none';
  document.getElementById('crimson-rest-cancel-btn').style.display = 'none';
  document.querySelectorAll('#crimson-rest-options .rest-option').forEach(el => {
    el.style.opacity = '';
    el.style.pointerEvents = '';
  });
  renderSirCrimsonRestDeck(null);
}

function renderSirCrimsonRestDeck(mode) {
  const grid = document.getElementById('crimson-rest-deck-grid');
  grid.innerHTML = '';
  document.getElementById('crimson-rest-deck-count').textContent = `${G.deck.length} cards`;

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
          cancelSirCrimsonRestPick();
          setTimeout(sirCrimsonRestComplete, 600);
        } else if (mode === 'upgrade') {
          if (!canUpgrade) { showMsg(`${c.name} cannot be upgraded further.`); return; }
          const success = upgradeCard(capturedKey);
          if (success) {
            showMsg(`✨ ${c.name} → ${(CARD_UPGRADES[capturedKey] && CARD_UPGRADES[capturedKey].name ? CARD_UPGRADES[capturedKey].name : capturedKey + '+')}!`);
            cancelSirCrimsonRestPick();
            setTimeout(sirCrimsonRestComplete, 600);
          } else {
            showMsg(`${c.name} cannot be upgraded.`);
          }
        }
      };
    }
    grid.appendChild(el);
  });
}

// Shared completion for all 3 Rest-stop options — leads into the real fight (js/combat.js).
function sirCrimsonRestComplete() {
  startSirCrimsonFight();
}

function showSirCrimsonOutro() {
  const line = document.getElementById('crimson-outro-line');
  if (line) line.textContent = SIR_CRIMSON_OUTRO_LINE;
  showScreen('crimson-outro-screen');
}
function dismissSirCrimsonOutro() {
  // Victory: smoke wipe reveals the original Floor 2 reward screen — never regenerated, since
  // showReward() ran exactly once, at the start of this whole interruption, and its DOM was never
  // torn down in the meantime (showScreen() only toggles the .active class). Once visible again,
  // the reward screen's own existing card-click/skip handlers proceed normally through
  // proceedAfterCardReward() -> boss relic offer -> Soul spend -> proceedOrPath() -> path select,
  // exactly as any other floor boss's reward flow already does — no special-casing needed there.
  G._sirCrimsonInterrupting = false;
  sirCrimsonSmokeTransition(() => {
    showScreen('reward-screen');
    // Undoes showReward()'s own interruption-time lock, restoring exactly the interactivity that
    // screen would have had if the interruption had never happened.
    const pool = document.getElementById('reward-choices');
    if (pool) pool.style.pointerEvents = '';
    setRewardSkipVisible(true);
  });
}

// After the card reward is taken/skipped: Void Compass offers a choice of 3 relics following
// an elite. startBossFight() now clears lastFightWasElite, so bosses are already excluded; the
// `!G.inBoss` check is kept as defensive redundancy. The _voidCompassOffered flag (reset each
// combat) makes it fire at most once, so skipping the relic screen can't loop.
function proceedAfterCardReward() {
  if (G.lastFightWasElite && !G.inBoss && hasRelic('void_compass') && !G._voidCompassOffered) {
    G._voidCompassOffered = true;
    showEliteRelicReward();
    return;
  }
  // Boss relic choice (GDD Boss Reward Flow) — sits between the card reward and the Soul screen,
  // leaving the Soul screen last as the design specifies. Fires once per boss; the flag is reset
  // in startBossFight(), mirroring how _voidCompassOffered is reset in startCombat().
  if (isBossRewardWindow() && !G._bossRelicOffered) {
    G._bossRelicOffered = true;
    showBossRelicReward();
    return;
  }
  // Soul-spend window — after a floor boss's reward pick, Floors 1-3 only (GDD §15).
  if (isBossRewardWindow()) {
    showSoulSpend();
    return;
  }
  proceedOrPath();
}

// The post-boss reward window: Floors 1-3 only, never Aldric. checkCombatEnd() has already
// incremented G.currentFloor by this point, so this reads the floor being ENTERED — 1, 2 or 3.
// The Floor 4 boss goes straight to Aldric and never reaches these screens, and Aldric himself is
// excluded by !isFinalBoss. Shared by the boss relic screen and the Soul screen so the two cannot
// drift onto different floors.
function isBossRewardWindow(g = G) {
  return !!(g.inBoss && !g.isFinalBoss && g.currentFloor >= 1 && g.currentFloor <= 3);
}

// ═══════════════════════════════════════════════════════════════════
// SOUL-SPEND SCREEN (GDD §15) — 3 of 8 upgrades, offered after each floor boss
// ═══════════════════════════════════════════════════════════════════

// The shared reward screen owns a fixed "Skip Reward (+10 Gold)" button. The Soul screen has
// its own decline action (keeping your Souls, no gold), so it hides that button and every other
// reward screen re-shows it.
function setRewardSkipVisible(visible) {
  const btn = document.getElementById('reward-skip-btn');
  if (btn) btn.style.display = visible ? '' : 'none';
}

function showSoulSpend() {
  const offer = soulUpgradeOffer(3);

  document.getElementById('reward-hp').textContent = G.hp + '/' + G.maxHp;
  document.getElementById('reward-gold').textContent = G.gold;
  document.getElementById('reward-souls').textContent = G.souls;
  showScreen('reward-screen');
  setRewardSkipVisible(false);
  const rewardSub = document.getElementById('reward-sub');
  if (rewardSub) rewardSub.textContent = '';

  const pool = document.getElementById('reward-choices');
  pool.innerHTML = '';

  const hdr = document.createElement('div');
  hdr.style.cssText = 'width:100%;text-align:center;font-family:Cinzel,serif;color:var(--gold);font-size:0.9rem;letter-spacing:0.05em;margin-bottom:0.4rem;';
  hdr.innerHTML = '💀 SOUL FORGE — you carry <span id="soul-spend-count">' + G.souls + '</span> Souls';
  pool.appendChild(hdr);

  if (offer.length === 0) {
    // Everything non-repeatable is owned and Vitality somehow isn't offerable — nothing to sell.
    const none = document.createElement('div');
    none.style.cssText = 'width:100%;text-align:center;color:var(--text3);font-size:0.8rem;';
    none.textContent = 'The forge has nothing left to offer you.';
    pool.appendChild(none);
  }

  offer.forEach(key => {
    const up = SOUL_UPGRADES[key];
    const cost = soulUpgradeCost(key);
    const canAfford = G.souls >= cost;
    const el = document.createElement('div');
    el.className = 'reward-card soul-upgrade-card';
    if (!canAfford) el.classList.add('unaffordable');
    el.innerHTML = `
      <span class="reward-card-emoji">${up.emoji}</span>
      <div class="reward-card-name">${up.name}</div>
      <div class="reward-card-type" style="color:${canAfford ? 'var(--gold)' : 'var(--red2)'}">💀 ${cost} Soul${cost === 1 ? '' : 's'}${up.repeatable ? ' · Repeatable' : ''}</div>
      <div class="reward-card-desc">${up.desc}${up.note ? `<br><span style="color:var(--text3);font-size:0.85em">${up.note}</span>` : ''}</div>
    `;
    el.onclick = () => {
      if (G.souls < cost) { showMsg('Not enough Souls!'); return; }
      if (!buySoulUpgrade(key)) return;
      document.getElementById('reward-souls').textContent = G.souls;
      setRewardSkipVisible(true);
      proceedOrPath();   // one purchase per spend window
    };
    pool.appendChild(el);
  });

  // Decline — always available, so a player who can't afford any of the three is never stuck.
  const footer = document.createElement('div');
  footer.style.cssText = 'width:100%;display:flex;justify-content:center;margin-top:0.6rem;';
  const leave = document.createElement('button');
  leave.className = 'btn';
  leave.style.cssText = 'font-size:0.75rem;padding:0.35rem 0.9rem;';
  leave.textContent = 'Keep your Souls — move on';
  leave.onclick = () => { setRewardSkipVisible(true); proceedOrPath(); };
  footer.appendChild(leave);
  pool.appendChild(footer);
}

// Void Compass — pick 1 of 3 unowned relics after an elite fight.
function showEliteRelicReward() {
  // Same gating as the shop — see offerableRelics(). The empty check now also covers the case
  // where a floor simply has nothing of an eligible rarity left to give.
  const available = offerableRelics(G);
  if (available.length === 0) { proceedOrPath(); return; } // nothing eligible → nothing to offer
  const picks = shuffle([...available]).slice(0, 3);

  document.getElementById('reward-hp').textContent = G.hp + '/' + G.maxHp;
  document.getElementById('reward-gold').textContent = G.gold;
  document.getElementById('reward-souls').textContent = G.souls;
  showScreen('reward-screen');
  setRewardSkipVisible(true);
  const rewardSub = document.getElementById('reward-sub');
  if (rewardSub) rewardSub.textContent = '';

  const pool = document.getElementById('reward-choices');
  pool.innerHTML = '';
  const hdr = document.createElement('div');
  hdr.style.cssText = 'width:100%;text-align:center;font-family:Cinzel,serif;color:var(--gold);font-size:0.9rem;letter-spacing:0.05em;margin-bottom:0.4rem;';
  hdr.textContent = '🧭 Void Compass — Choose a Relic';
  pool.appendChild(hdr);

  picks.forEach(([key, relic]) => {
    const el = document.createElement('div');
    el.className = 'reward-card';
    el.style.borderColor = '#c9a84c';
    el.innerHTML = `
      <span class="reward-card-emoji">${relic.emoji}</span>
      <div class="reward-card-name">${relic.name}</div>
      <div class="reward-card-type" style="color:#c9a84c">Relic · ${relic.rarity.charAt(0).toUpperCase() + relic.rarity.slice(1)}</div>
      <div class="reward-card-desc">${relic.desc}</div>
    `;
    el.onclick = () => {
      acquireRelic(key);
      proceedOrPath();
    };
    pool.appendChild(el);
  });
}

// GDD Boss Reward Flow: "choose 1 of 3 relics — 1 Common, 1 Rare, 1 Character-specific."
// Slots are filled in this order from whatever is eligible right now.
const BOSS_REWARD_SLOTS = ['common', 'rare', 'character'];

// Builds the three offers for the boss relic screen.
//
// A slot whose tier has nothing eligible is BACKFILLED from the tier with the most unowned
// options left, so the player always sees three real choices instead of a short screen. Two tiers
// come up empty today: Rare, until the floor gate opens it, and Character, which has no entries in
// RELICS at all yet. Because the composition is expressed as a list of rarities rather than
// hardcoded slots, the third slot starts filling itself the moment Character relics are added with
// `rarity:'character'` and a RELIC_RARITY_MIN_FLOOR entry — no change needed here.
//
// Candidates arrive from offerableRelics(), so ownership filtering, the unimplemented-relic
// exclusion and floor gating are all inherited rather than duplicated.
function pickBossRelicOffers(available, count = 3) {
  const byRarity = {};
  available.forEach(entry => {
    const rarity = entry[1].rarity;
    (byRarity[rarity] = byRarity[rarity] || []).push(entry);
  });
  Object.keys(byRarity).forEach(r => shuffle(byRarity[r]));

  const picks = [];
  const taken = {};
  const take = entry => { picks.push(entry); taken[entry[0]] = true; };

  // Pass 1 — honour the documented composition wherever content exists.
  BOSS_REWARD_SLOTS.forEach(rarity => {
    if (picks.length >= count) return;
    const next = (byRarity[rarity] || []).find(e => !taken[e[0]]);
    if (next) take(next);
  });

  // Pass 2 — backfill from everything still eligible, regardless of tier.
  //
  // This deliberately draws from the whole remaining pool rather than "whichever tier has the
  // most left". That tier-based rule starved Uncommon completely from Floor 3 onward: pass 1
  // removes one Common and one Rare, so Common and Uncommon tie on remaining count and Common
  // wins the tie-break every single time, making Uncommon unreachable from boss rewards. The
  // requirement is three real choices, not a fixed tier mix — so backfill is tier-blind.
  const rest = shuffle(available.filter(e => !taken[e[0]]));
  while (picks.length < count && rest.length > 0) take(rest.shift());
  return picks; // fewer than `count` only if the pool itself is smaller — never a duplicate
}

// Boss relic choice — pick 1 of 3 after a Floors 1-3 boss. Modeled on showEliteRelicReward():
// same reward screen, same tiles, same bail-out when nothing is eligible.
function showBossRelicReward() {
  // The Character slot draws from a per-hero pool (GDD §9: boss reward only, hero-locked), the
  // other slots from the general pool. Concatenating here is what lets pickBossRelicOffers()
  // treat 'character' as just another rarity bucket.
  const available = offerableRelics(G).concat(offerableCharacterRelics(G));
  // Nothing eligible (the player owns everything this floor allows) — continue rather than stall.
  // Routing back through proceedAfterCardReward keeps the Soul screen from being skipped as well.
  if (available.length === 0) { proceedAfterCardReward(); return; }
  const picks = pickBossRelicOffers(available, 3);

  document.getElementById('reward-hp').textContent = G.hp + '/' + G.maxHp;
  document.getElementById('reward-gold').textContent = G.gold;
  document.getElementById('reward-souls').textContent = G.souls;
  showScreen('reward-screen');
  // No skip button. GDD documents a skip payout for CARD rewards only, and this is a guaranteed
  // boss reward; the shared button is hardwired to skipReward(), which pays +10 Gold and re-enters
  // proceedAfterCardReward() — wrong payout and wrong routing here. showSoulSpend(), the very next
  // screen in this flow, hides it for the same reason. showReward() turns it back on for cards.
  setRewardSkipVisible(false);
  const rewardSub = document.getElementById('reward-sub');
  if (rewardSub) rewardSub.textContent = '';

  const pool = document.getElementById('reward-choices');
  pool.innerHTML = '';
  const hdr = document.createElement('div');
  hdr.style.cssText = 'width:100%;text-align:center;font-family:Cinzel,serif;color:var(--gold);font-size:0.9rem;letter-spacing:0.05em;margin-bottom:0.4rem;';
  hdr.textContent = '👑 Floor Cleared — Choose a Relic';
  pool.appendChild(hdr);

  picks.forEach(([key, relic]) => {
    const el = document.createElement('div');
    el.className = 'reward-card';
    el.style.borderColor = '#c9a84c';
    el.innerHTML = `
      <span class="reward-card-emoji">${relic.emoji}</span>
      <div class="reward-card-name">${relic.name}</div>
      <div class="reward-card-type" style="color:#c9a84c">Relic · ${relic.rarity.charAt(0).toUpperCase() + relic.rarity.slice(1)}</div>
      <div class="reward-card-desc">${relic.desc}</div>
    `;
    el.onclick = () => {
      acquireRelic(key);
      proceedAfterCardReward(); // → Soul-spend screen; the offered flag is already set
    };
    pool.appendChild(el);
  });
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
  renderBossChallengeOffer(boss);
}

// Challenge opt-in, offered here and nowhere else. Always starts from "not accepted": this
// screen is the only route into startBossFight(), so resetting on every showing means an
// accepted-then-abandoned Challenge can never leak into a later fight.
function renderBossChallengeOffer(boss) {
  const panel = document.getElementById('boss-challenge');
  if (!panel) return;
  G._challenge = null;
  G._challengeOffered = isChallengeEligible(G, boss && boss.charKey) ? boss.charKey : null;
  if (!G._challengeOffered) { panel.hidden = true; return; }
  panel.hidden = false;
  document.getElementById('boss-challenge-rule').textContent = CHALLENGES[G._challengeOffered].rule;
  updateBossChallengeToggle();
}

function toggleBossChallenge() {
  if (!G._challengeOffered) return;
  G._challenge = G._challenge ? null : G._challengeOffered;
  updateBossChallengeToggle();
}

function updateBossChallengeToggle() {
  const btn = document.getElementById('boss-challenge-toggle');
  const panel = document.getElementById('boss-challenge');
  if (!btn || !panel) return;
  const on = !!G._challenge;
  btn.textContent = on ? '✓ CHALLENGE ACCEPTED' : 'ATTEMPT CHALLENGE';
  btn.classList.toggle('accepted', on);
  panel.classList.toggle('accepted', on);
}

// ═══════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════

function renderAll() {
  renderHP();
  renderHand();
  renderEnergy();
  renderStatuses();
  renderConsumableSlots();
  updateHUD();
  updateIntent();
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

function formatCompactDamage(amount, applyDamagePreview) {
  const base = parseInt(amount, 10);
  if (!applyDamagePreview || typeof calculatePlayerAttackDamage !== 'function') return base;
  return calculatePlayerAttackDamage(G, base);
}

function formatCompactClause(clause, options = {}) {
  if (!clause) return '';
  const clean = clause.replace(/\.$/, '').replace(/\s+/g, ' ').trim();
  const applyDamagePreview = !!options.applyDamagePreview;
  let match = clean.match(/^Deal (\d+) dmg twice$/i);
  if (match) return `${formatCompactDamage(match[1], applyDamagePreview)} dmg x2`;

  match = clean.match(/^Deal (\d+) dmg to enemy (\d+) times$/i);
  if (match) return `${formatCompactDamage(match[1], applyDamagePreview)} dmg x${match[2]}`;

  match = clean.match(/^Deal (\d+) dmg, heal (\d+) HP$/i);
  if (match) return `${formatCompactDamage(match[1], applyDamagePreview)} dmg + ${match[2]} heal`;

  match = clean.match(/^Deal (\d+) damage?$/i) || clean.match(/^Deal (\d+) dmg$/i);
  if (match) return `Deal ${formatCompactDamage(match[1], applyDamagePreview)} dmg`;

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
  if (match) return `${formatCompactDamage(match[1], applyDamagePreview)} dmg + Burn`;

  match = clean.match(/^Deal (\d+) \+ chill$/i);
  if (match) return `${formatCompactDamage(match[1], applyDamagePreview)} dmg + Chill`;

  match = clean.match(/^Roll 4-6: deal (\d+)\. Roll 2-3: deal (\d+)$/i);
  if (match) return `${formatCompactDamage(match[2], applyDamagePreview)}-${formatCompactDamage(match[1], applyDamagePreview)} gamble`;

  return clean
    .replace(/damage/ig, 'dmg')
    .replace(/cards?/ig, 'Draw')
    .replace(/HP/ig, 'heal');
}

function getCompactCardSummary(card) {
  if (!card || !card.desc) return '';
  const desc = card.desc.replace(/\s+/g, ' ').trim();
  const parts = desc.split(/\.\s+/).map(part => part.replace(/\.$/, '').trim()).filter(Boolean);
  const applyDamagePreview = card.type === 'Attack';
  const base = formatCompactClause(parts[0] || desc, { applyDamagePreview });
  if (!card.dice || !card.affinityBonus) return base;

  const bonusPrefix = `${card.affinityBonus}:`;
  const bonusClause = parts.find(part => part.toLowerCase().startsWith(bonusPrefix));
  if (!bonusClause) return base;

  const bonusText = formatCompactClause(bonusClause.slice(bonusPrefix.length).trim(), { applyDamagePreview });
  const bonusLabel = String(card.affinityBonus).charAt(0).toUpperCase() + String(card.affinityBonus).slice(1);
  return `${base}<span class="card-compact-bonus">${bonusText} ${bonusLabel}</span>`;
}

// The preview hangs directly above the hand row, so it is parented to the hand row
// rather than to the combat screen. The screen is a column flex whose content does not
// always fill the viewport — a short landscape phone can leave 45px+ of slack beneath
// the hand — so anchoring to the screen's bottom edge let the preview settle that far
// down and cover the cards it is describing. Anchored here, `bottom: calc(100% + Npx)`
// is always N pixels above the cards regardless of the slack.
function ensureMobileCardPreview() {
  const host = document.getElementById('hand-area') || document.getElementById('combat-screen');
  if (!host) return null;
  let preview = document.getElementById('mobile-card-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'mobile-card-preview';
    preview.className = 'mobile-card-preview';
  }
  if (preview.parentElement !== host) host.appendChild(preview);
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
  const area = document.getElementById('card-stage');
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
    // Cost that will really be charged — shared with playCard() via getCardEnergyCost so the
    // tile, the mobile preview and the actual charge cannot disagree. Passing no options means
    // nothing is consumed by merely rendering the hand.
    const actualCost = getCardEnergyCost(G, key);
    // Highlight whenever the card is discounted, whichever effect did it — not Mana Surge only.
    const costStyle = (actualCost < c.cost) ? 'background:#2980b9' : '';
    // Use actualCost for playability — not raw c.cost
    const canPlay = G.energy >= actualCost && !G._voidChannelSelecting;
    if (!canPlay) el.classList.add('unplayable');

    // Hard play conditions (CARD_PLAY_CONDITIONS in js/data.js) — a warning, NOT a block. The
    // card stays tappable and playCard()/effect() remain the source of truth; this only stops
    // the player from discovering a doomed play by wasting it. Distinct from `.unplayable`
    // (can't afford), which removes the click handler entirely.
    const blockReason = G._voidChannelSelecting ? null : getCardBlockReason(G, key);
    if (blockReason) el.classList.add('condition-unmet');

    // Build dynamic description
    const weakStatus2 = G.statuses && G.statuses.player && G.statuses.player.find(s => s.name === '😵Weak');
    const isWeak2 = c.type === 'Attack' && weakStatus2 && weakStatus2.stacks > 0;
    let displayDesc = c.desc;
    const compactSummary = getCompactCardSummary(c);
    const previewConditionText = c.dice ? `🎲 ${getAffinityPreviewLabel(c.affinityBonus)}` : '';
    const previewBonusText = c.dice
      ? `🎲 ${affinityActive ? 'Bonus Active!' : `${String(c.affinityBonus || '').toUpperCase()} roll bonus`}`
      : '';
    // Blocked cards explain themselves in the mobile preview's hint slot — the compressed tile
    // hides its description text, so this is where a phone player actually reads the reason.
    const previewPlayHint = blockReason
      ? `⚠ ${blockReason}`
      : (canPlay ? 'Tap selected card again to play' : `Need ${actualCost} Energy`);
    if (c.type === 'Attack') {
      displayDesc = c.desc.replace(/deal (\d+)/gi, (match, num) => {
        const base = parseInt(num, 10);
        const shown = calculatePlayerAttackDamage(G, base);
        if (shown === base) return match;
        const color = shown > base ? '#e74c3c' : '#7fb3d3';
        return 'deal <span style="color:' + color + ';font-weight:bold">' + shown + '</span> <span style="text-decoration:line-through;opacity:0.5;font-size:0.85em">' + base + '</span>';
      });
    }

if (key === 'arcanebarrage' || key === 'arcanebarrage+') {
  const spells = G._spellsThisTurn || 0;
  const isHigh = checkAffinity(G, roll, 'high');
  const isPlus = key === 'arcanebarrage+';
  const base = isPlus ? (isHigh ? 6 : 4) : (isHigh ? 5 : 3);
  const perSpell = isPlus ? 2 : 1;
  const rawTotal = base + (spells * perSpell);
  const total = calculatePlayerAttackDamage(G, rawTotal);
  const color = total !== rawTotal ? (total > rawTotal ? '#e74c3c' : '#7fb3d3') : (spells > 0 ? '#e8d080' : 'inherit');
  const originalText = total !== rawTotal ? ` <span style="text-decoration:line-through;opacity:0.5;font-size:0.85em">${rawTotal}</span>` : '';
  displayDesc = `Deal <span style="color:${color};font-weight:bold">${total}</span>${originalText} dmg <span style="color:var(--text3);font-size:0.85em">(+${perSpell} × ${spells} Skill/Power)</span>. ${isHigh ? '✨ High active.' : 'High: deal more.'}`;
}

    const weakIndicator = isWeak2 ? '<div style="font-size:0.5rem;color:#7fb3d3;text-align:center;margin-top:0.1rem;">😵 WEAK</div>' : '';
    el.innerHTML = `
      <div class="card-cost" style="${costStyle}">${actualCost}</div>
      <span class="card-emoji">${c.emoji}</span>
      <div class="card-name">${c.name}</div>
      <div class="card-compact-summary">${compactSummary}</div>
      <div class="card-type">${c.type}</div>
      <div class="card-desc">${displayDesc}</div>
      ${blockReason ? `<div class="card-block-reason">⚠ ${blockReason}</div>` : ''}
      ${weakIndicator}
      ${c.dice ? `<div class="card-dice-req">🎲 ${affinityActive ? '✨ Bonus Active!' : c.affinityBonus + ' roll'}</div>` : ''}
    `;
    // Desktop hover tooltip for the same reason (the tile's own label covers touch devices).
    if (blockReason) el.title = blockReason;

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
        <div class="mobile-card-preview-inner${affinityActive ? ' affinity-active' : ''}${blockReason ? ' condition-unmet' : ''}">
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
    area.appendChild(el);
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
  // Count shows this turn's base charge plus any of Steady Hand's combat-long bonus still unspent.
  const rerollsLeft = G.aldricInfiniteReroll ? '∞' : totalRerollsLeft();
  // Gambler Challenge denies the reroll outright, so the button is disabled rather than left
  // live-looking and refusing on click.
  const challengeBlocksReroll = challengeActive(G, 'gambler');
  // Dice Stabilizer — rerolling is unavailable for the whole lock. Given the same disabled-with-a
  // -reason treatment as the Challenge block rather than being hidden, so the button stays where
  // the player expects it and says why; unlike the Challenge it is temporary, so the label shows
  // the remaining turn count. Checked after the Challenge so a Gambler Challenge still wins the
  // label (it lasts the whole fight, the lock does not).
  const lockBlocksReroll = !challengeBlocksReroll && dieLockActive(G);
  rerollBtn.disabled = challengeBlocksReroll || lockBlocksReroll || (!G.aldricInfiniteReroll && totalRerollsLeft() <= 0);
  rerollBtn.innerHTML = challengeBlocksReroll
    ? '🚫 NO REROLL'
    : lockBlocksReroll
      ? `🔒 LOCKED <span style="font-size:0.7em;opacity:0.8">(${dieLockTurnsShown(G)})</span>`
      : `🎲 REROLL <span style="font-size:0.7em;opacity:0.8">(${rerollsLeft})</span>`;
  rerollBtn.title = challengeBlocksReroll
    ? "Challenge: you may never use a reroll this fight"
    : lockBlocksReroll
      ? `Dice Stabilizer: die held at ${G.currentDie} — no rerolling while locked`
      : ((G._bonusRerolls > 0) ? 'Includes 1 Steady Hand bonus reroll for this combat' : '');
  renderSoulDiceControls();
  renderDicePool();
  const drawEl = document.getElementById('draw-count');
  const discardEl = document.getElementById('discard-count');
  if (drawEl) drawEl.textContent = G.drawPile ? G.drawPile.length : 0;
  if (discardEl) discardEl.textContent = G.discardPile ? G.discardPile.length : 0;
}

// Soul dice upgrades sit above the dice panel and only appear while they are actually usable —
// owned, and not yet spent this combat. Mirrors the reroll button's "optional post-roll action"
// shape so both read the same way.
function renderSoulDiceControls() {
  const sdBtn = document.getElementById('second-die-btn');
  const geBtn = document.getElementById('gamblers-edge-btn');
  const picker = document.getElementById('gamblers-edge-picker');

  const showSecond = hasSoulUpgrade('second_die') && !G._secondDieUsed;
  const showEdge = hasSoulUpgrade('gamblers_edge') && !G._gamblersEdgeUsed;
  // Dice Stabilizer — the two forced-set buttons disable alongside their existing
  // one-set-per-turn rule, so a locked die greys them out instead of letting a click be refused.
  // Second Die is deliberately NOT disabled here: this batch's block list covers rerolling and
  // the two forced-set actions only (see the note on lockDice in js/combat.js).
  const dieLocked = dieLockActive(G);

  if (sdBtn) sdBtn.style.display = showSecond ? '' : 'none';
  if (geBtn) {
    geBtn.style.display = showEdge ? '' : 'none';
    geBtn.disabled = !!G._dieSetThisTurn || dieLocked;
    geBtn.title = dieLocked ? 'Dice Stabilizer: die is locked' : '';
  }
  if (picker && !showEdge) picker.classList.remove('visible');

  // Ley Line Crystal (Mage character relic) — same shown-when-owned-and-unused pattern as the
  // Soul dice buttons above, but gated on hasCharacterRelic() rather than hasSoulUpgrade().
  const llBtn = document.getElementById('ley-line-crystal-btn');
  if (llBtn) {
    const showLeyLine = hasCharacterRelic('ley_line_crystal') && !G._leyLineCrystalUsed;
    llBtn.style.display = showLeyLine ? '' : 'none';
    llBtn.disabled = !!G._dieSetThisTurn || dieLocked;
    llBtn.title = dieLocked ? 'Dice Stabilizer: die is locked' : '';
  }

  // Loaded Coat (Gambler character relic) — same shown-when-owned-and-unused pattern as Ley
  // Line Crystal above; not gated on G._dieSetThisTurn since it swaps the die TYPE for the rest
  // of the fight rather than forcing this turn's roll value.
  const lcBtn = document.getElementById('loaded-coat-btn');
  if (lcBtn) {
    const showLoadedCoat = hasCharacterRelic('loaded_coat') && !G._loadedCoatUsed;
    lcBtn.style.display = showLoadedCoat ? '' : 'none';
  }

  // The House Always Wins (Gambler character relic) — visible whenever owned, unlike the buttons
  // above which hide once spent; a streak tracker has nothing to hide, it just shows the current
  // count (0, 1, or freshly reset to 0 the instant the free card queues). Each pip lights up for
  // one consecutive max roll, matching G._maxRollStreak 1:1 — the tracker reads that field
  // directly rather than keeping its own copy, so it can never show a number the game state
  // disagrees with.
  const streakTracker = document.getElementById('house-streak-tracker');
  if (streakTracker) {
    const showStreak = hasCharacterRelic('house_always_wins');
    streakTracker.style.display = showStreak ? '' : 'none';
    if (showStreak) {
      const streak = G._maxRollStreak || 0;
      for (let i = 0; i < 2; i++) {
        const pip = document.getElementById('house-streak-pip-' + i);
        if (pip) pip.classList.toggle('lit', i < streak);
      }
    }
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
  '🔥Burn':          'Takes stacks damage at end of turn. Ticks down.',
  // Chill is the one status that does NOT tick on a turn cadence — it is consumed only when the
  // enemy actually attacks (GDD.md §Statuses; verified Aug 15, 2026). The old wording said
  // "Ticks down each turn," which contradicted both the GDD and the verified behaviour.
  '❄️Chill':         'Enemy attacks deal 25% less damage. Ticks down only when the enemy attacks.',
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
  updateHudRelicFades();
}

// Both icon rows scroll horizontally with their scrollbar deliberately hidden (mobile HUD has no
// room for a visible bar), so this fade is the only signal that more icons sit past the edge.
// Toggled per-container rather than painted unconditionally, so a row that already fits within
// its width isn't given a misleading fade over its last visible icon.
function updateHudRelicFade(el) {
  if (!el) return;
  el.classList.toggle('has-overflow', el.scrollWidth > el.clientWidth + 1);
}
function updateHudRelicFades() {
  updateHudRelicFade(document.querySelector('.hud-relics'));
  updateHudRelicFade(document.querySelector('.hud-owned-relics'));
}
window.addEventListener('resize', updateHudRelicFades);
window.addEventListener('orientationchange', () => setTimeout(updateHudRelicFades, 150));

// Reuse the status-tooltip element for relic descriptions (mirrors showStatusTooltip)
function showRelicTooltip(e, relicKey) {
  const tooltip = document.getElementById('status-tooltip');
  const relic = RELICS[relicKey];
  if (!tooltip || !relic) return;
  tooltip.textContent = `${relic.name} — ${relic.desc}`;
  tooltip.classList.add('visible');

  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  const x = Math.min(clientX, window.innerWidth - 220);
  const y = clientY - 60;
  tooltip.style.left = x + 'px';
  tooltip.style.top = Math.max(10, y) + 'px';

  clearTimeout(tooltip._hideTimer);
  tooltip._hideTimer = setTimeout(() => tooltip.classList.remove('visible'), 2500);
}

function renderRelics() {
  const el = document.getElementById('relics-display');
  if (!el) return;
  el.innerHTML = '';
  (G.relics || []).forEach(key => {
    const relic = RELICS[key];
    if (!relic) return;
    const span = document.createElement('span');
    span.className = 'relic-icon';
    span.textContent = relic.emoji || '💠';
    span.setAttribute('aria-label', `${relic.name}: ${relic.desc}`);
    span.title = `${relic.name} — ${relic.desc}`; // desktop hover
    span.style.cursor = 'help';
    span.addEventListener('click', (e) => showRelicTooltip(e, key)); // tap-to-view
    span.addEventListener('touchstart', (e) => { e.preventDefault(); showRelicTooltip(e, key); });
    span.addEventListener('mouseleave', hideStatusTooltip);
    el.appendChild(span);
  });
  updateHudRelicFades();
}

function updateHUD() {
  const floor = G.map ? G.map[G.currentFloor] : null;
  document.getElementById('hud-floor').textContent = `FLOOR ${G.currentFloor + 1}`;
  const roomIdx = floor ? (floor.currentPath === 'A' ? floor.roomIndexA : floor.currentPath === 'B' ? floor.roomIndexB : (floor.roomIndexC || 0)) : 0;
  document.getElementById('hud-room').textContent = `Room ${roomIdx + 1} · Path ${(floor && floor.currentPath ? floor.currentPath : 'A')}`;
  document.getElementById('hud-gold').textContent = G.gold;
  document.getElementById('hud-souls').textContent = G.souls;
  // Turn counter — display only, read straight from G.turn (incremented in startTurn()). It lives
  // inside #combat-screen, so it is hidden on every other screen without any show/hide logic.
  const turnEl = document.getElementById('hud-turn');
  if (turnEl) {
    turnEl.textContent = G.turn || 0;
    const chip = document.getElementById('hud-turn-chip');
    if (chip) chip.title = `Turn ${G.turn || 0} of this combat`;
  }
  renderRelics();
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

  // Position popup near tap point, reserving the bottom combat HUD on mobile.
  popup.classList.add('visible');
  const mobileLandscape = window.matchMedia &&
    window.matchMedia('(max-width: 1100px) and (orientation: landscape)').matches;
  const combatScreen = document.getElementById('combat-screen');
  const hudReserve = mobileLandscape && combatScreen
    ? parseFloat(getComputedStyle(combatScreen).getPropertyValue('--combat-bottom-hud-height')) || 0
    : 0;
  const edgeGap = 8;
  const maxX = Math.max(edgeGap, window.innerWidth - popup.offsetWidth - edgeGap);
  const maxY = Math.max(edgeGap, window.innerHeight - hudReserve - popup.offsetHeight - edgeGap);
  const x = Math.max(edgeGap, Math.min(e.clientX, maxX));
  const y = Math.max(edgeGap, Math.min(e.clientY + 10, maxY));
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';

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
  // The single chokepoint for screen changes, so it is the right place to stamp which one is up.
  // inCombatScreen() and renderFieldInventory() both read this — see the note on inCombatScreen()
  // for why G.enemy cannot answer the same question. Guarded because showScreen() runs for the
  // title and character screens before newGame() has created a run.
  if (G) G._activeScreen = id;
  renderFieldInventory();
  // Clean up any mirror panel when leaving door screen
  if (id !== 'door-screen' && G && G._currentMirrorPanel) {
    G._currentMirrorPanel.remove();
    G._currentMirrorPanel = null;
  }
}

function showCombatScreen() { showScreen('combat-screen'); }

function showAldricEnding() {
  // Holding the relic gate (G.aldricHasRelics) is necessary but no longer sufficient — GDD §1's
  // mercy choice at the 50 HP beat is the actual decision point now. Declining it, never reaching
  // Phase 3 (gate closed), or losing beforehand all correctly leave G.aldricMercyChosen false,
  // which is a real behavior change: holding 4+ relics used to guarantee the True Ending on any
  // kill regardless of choice.
  const hasTrueEnding = G.aldricMercyChosen;
  const vs = document.getElementById('victory-screen');
  showScreen('victory-screen');

  // Override victory text based on ending
  const title = vs.querySelector('h1') || vs.querySelector('.victory-title');
  const sub = vs.querySelector('p') || vs.querySelector('.victory-sub');

  if (hasTrueEnding) {
    if (title) title.textContent = 'THE CASTLE FALLS';
    if (sub) sub.textContent = '"I… am still here…" — The relics blaze. The walls crumble. Sir Crimson steps forward from the shadows to help Aldric stand. The cycle is broken.';
  } else {
    if (title) title.textContent = 'THE CYCLE CONTINUES…';
    if (sub) sub.textContent = 'Aldric dissipates into shadow. The castle endures. You were not ready. Return when you are.';
  }
}

function showGameOver() {
  showScreen('gameover-screen');
  document.getElementById('gameover-souls').textContent = G.runSouls;
}

// ms lets a caller hold an important confirmation on screen longer than the 2.5s default —
// used for grants that change a persistent stat and are otherwise easy to miss during a
// screen transition (see giveReward's die swap).
function showMsg(txt, ms = 2500) {
  const el = document.getElementById('message-log');
  el.textContent = txt;
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), ms);
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
  const sprite = targetEl?.querySelector('.combatant-sprite');
  if (!sprite) return;

  sprite.classList.remove('hit-flash');
  void sprite.offsetWidth;
  sprite.classList.add('hit-flash');

  setTimeout(() => {
    sprite.classList.remove('hit-flash');
  }, 250);
}

function spawnSlashVFX(targetEl) {
  const layer = document.getElementById('combat-vfx-layer');
  if (!layer || !targetEl) return;

  const sprite = targetEl.querySelector('.combatant-sprite');
  if (!sprite) return;

  const rect = sprite.getBoundingClientRect();
  const arenaRect = layer.getBoundingClientRect();
  const slashWidth = 120;
  const slashHeight = 20;
  const centerX = rect.left - arenaRect.left + rect.width * 0.5;
  const torsoY = rect.top - arenaRect.top + rect.height * 0.62;

  const slash = document.createElement('div');
  slash.className = 'slash-vfx';
  slash.style.left = `${centerX - slashWidth * 0.5}px`;
  slash.style.top = `${torsoY - slashHeight * 0.5}px`;

  layer.appendChild(slash);
  setTimeout(() => slash.remove(), 250);
}

function spawnDeathBurstVFX(targetEl) {
  const layer = document.getElementById('combat-vfx-layer');
  if (!layer || !targetEl) return;

  const rect = targetEl.getBoundingClientRect();
  const arenaRect = layer.getBoundingClientRect();
  const originX = rect.left - arenaRect.left + rect.width * 0.5;
  const originY = rect.top - arenaRect.top + rect.height * 0.65;

  for (let i = 0; i < 7; i++) {
    const dust = document.createElement('span');
    const angle = (Math.PI * 2 * i) / 7;
    const distance = 18 + Math.random() * 20;
    dust.className = 'death-dust-vfx';
    dust.style.left = `${originX}px`;
    dust.style.top = `${originY}px`;
    dust.style.setProperty('--dust-x', `${Math.cos(angle) * distance}px`);
    dust.style.setProperty('--dust-y', `${Math.sin(angle) * distance - 12}px`);
    dust.style.animationDelay = `${i * 18}ms`;
    layer.appendChild(dust);
    setTimeout(() => dust.remove(), 650);
  }
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
