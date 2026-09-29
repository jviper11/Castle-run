import { $, h, clear, isTouch } from './dom.js';
import { initTooltips, hide as hideTooltip } from './tooltip.js';
import { cardView } from './cardView.js';
import * as view from './combatView.js';
import { play, snapshot, setSpeed, toast } from './animator.js';
import { drain } from '../engine/log.js';
import { playCard, endTurn, reroll, resolveChoice, useSecondDie, useGamblersEdge } from '../engine/combat.js';
import {
  createRun, addCard, choosePath, chooseDoor, useMirror, leaveRoom, finishCombat, takeCardReward, skipCardReward,
  restHeal, restUpgrade, restRemove, restLeave, shopBuy, shopRemove, shopUpgrade, shopLeave, soulBuy, soulLeave,
} from '../engine/run.js';
import { renderRunStatus, renderPathSelect, renderDoors, renderRoom, renderRest, renderShop, renderSoulForge } from './runView.js';
import { canShopRemove, canUpgrade } from '../engine/shop.js';
import { applySoulUpgrade } from '../engine/soul.js';
import { randomSeed } from '../engine/rng.js';
import { HEROES, FLOOR_BACKGROUNDS } from '../content/heroes.js';
import { REWARD_ODDS } from '../content/rewards.js';

// App controller: screen flow and input. Game rules live in the engine; drawing lives in the
// views. This file only connects them.
//
// URL options, for testing and review:
//   ?seed=123       fixed run seed        ?hero=barbarian   skip hero select
//   ?floor=3        start at that floor's path select (with the starting deck)
//   ?hp=500         starting max HP (for walking a whole run in review)
//   ?gold=300       starting Gold      ?souls=20   starting Souls (to try the shop and Soul Forge)
//   ?soul=secondDie,gamblersEdge   start with these Soul Forge upgrades (ids in content/rooms.js)
//   ?fast=1         near-instant animations
//   ?deck=a,b+,c    replace the starting deck (card keys; + for upgraded)

const params = new URLSearchParams(location.search);
const ui = { run: null, c: null, busy: false, selected: null, justDrawn: null, picked: new Set(), edgePicking: false };

// ── Screens ──

function showScreen(id) {
  hideTooltip();
  // A deck picker belongs to the screen that opened it; never let it outlive a screen change.
  $('deck-overlay').hidden = true;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('active', s.id === `screen-${id}`);
}

function showHeroes() {
  const grid = clear($('hero-grid'));
  for (const [key, hero] of Object.entries(HEROES)) {
    grid.append(h('button', {
      class: 'hero-tile' + (hero.available ? '' : ' locked'), type: 'button', disabled: !hero.available,
      onclick: () => newRun(key),
    },
    h('img', { src: hero.portrait, alt: '', loading: 'lazy' }),
    h('div', { class: 'hero-tile-body' },
      h('div', { class: 'hero-tile-name' }, hero.emoji, ' ', hero.name),
      h('div', { class: 'hero-tile-meta' }, `${hero.hp} HP · d${hero.die.sides} · ${hero.affinity} affinity`),
      h('div', { class: 'hero-tile-blurb' }, hero.available ? hero.blurb : 'Arrives in Phase 2'),
    )));
  }
  showScreen('heroes');
}

function newRun(heroKey) {
  const seed = params.has('seed') ? Number(params.get('seed')) : randomSeed();
  ui.run = createRun({ heroKey, seed });
  if (params.has('deck')) {
    ui.run.deck = [];
    params.get('deck').split(',').forEach((key) => addCard(ui.run, key.trim()));
  }
  if (params.has('hp')) ui.run.hp = ui.run.maxHp = Math.max(1, Number(params.get('hp')));
  if (params.has('gold')) ui.run.gold = Math.max(0, Number(params.get('gold')));
  if (params.has('souls')) ui.run.souls = Math.max(0, Number(params.get('souls')));
  for (const id of (params.get('soul') || '').split(',').filter(Boolean)) applySoulUpgrade(ui.run, id.trim());
  if (params.has('floor')) ui.run.floor = Math.max(0, Math.min(3, Number(params.get('floor')) - 1));
  params.delete('floor');
  show();
}

// ── Run flow ──
// The engine's run.state.screen decides what is on screen. Every button calls one engine action,
// then show() renders whatever state the run is now in.

function show() {
  const run = ui.run;
  switch (run.state.screen) {
    case 'pathSelect':
      renderRunStatus(run);
      renderPathSelect(run, (key) => runAction(() => choosePath(run, key)));
      return showScreen('paths');
    case 'doors':
      renderRunStatus(run);
      renderDoors(run, {
        onDoor: (id) => runAction(() => chooseDoor(run, id)),
        onMirror: () => runAction(() => useMirror(run)),
      });
      return showScreen('doors');
    case 'room':
      renderRunStatus(run);
      renderRoom(run);
      return showScreen('room');
    case 'rest':
      renderRunStatus(run);
      renderRest(run, {
        onHeal: () => runAction(() => restHeal(run)),
        onPick: openDeckPicker,
        onLeave: () => runAction(() => restLeave(run)),
      });
      return showScreen('rest');
    case 'shop':
      renderRunStatus(run);
      renderShop(run, { onBuy: (id) => runAction(() => shopBuy(run, id)), onPick: openDeckPicker });
      return showScreen('shop');
    case 'soulForge':
      renderRunStatus(run);
      renderSoulForge(run, { onBuy: (id) => runAction(() => soulBuy(run, id)) });
      return showScreen('soulForge');
    case 'combat':
      return startFight();
    case 'reward':
      return showReward();
    case 'end':
      return showEnd();
    default:
      throw new Error(`Unknown screen ${run.state.screen}`);
  }
}

function runAction(action) {
  if (action()) show();
}

// ── Deck picker: which exact copy to upgrade or remove ──

const PICKERS = {
  upgrade: { title: 'Upgrade a card (free)', eligible: canUpgrade, act: restUpgrade, preview: true },
  remove: { title: 'Remove a card (free)', eligible: () => true, act: restRemove },
  shopUpgrade: { title: 'Upgrade a card', eligible: canUpgrade, act: shopUpgrade, preview: true },
  shopRemove: { title: 'Remove a card (not Strike or Defend)', eligible: canShopRemove, act: shopRemove },
};

function openDeckPicker(mode) {
  const run = ui.run;
  const picker = PICKERS[mode];
  $('deck-title').textContent = picker.title + (picker.preview ? ' — shown upgraded' : '');
  const grid = clear($('deck-grid'));
  for (const card of run.deck.filter(picker.eligible)) {
    const el = cardView(picker.preview ? card.key + '+' : card.key);
    el.classList.add('pickable');
    el.addEventListener('click', () => {
      $('deck-overlay').hidden = true;
      runAction(() => picker.act(run, card.uid));
    });
    grid.append(el);
  }
  $('deck-overlay').hidden = false;
}

// ── Gambler's Edge picker (reuses the choice overlay) ──

function openEdgePicker() {
  const c = ui.c;
  if (ui.busy || !c || c.pending) return;
  ui.edgePicking = true;
  $('choice-title').textContent = "Gambler's Edge — set the die to";
  const grid = clear($('choice-grid'));
  for (let v = 1; v <= c.die.sides; v++) {
    grid.append(h('button', { class: 'die die-choice', type: 'button', onclick: () => {
      closeEdgePicker();
      act((c) => useGamblersEdge(c, v));
    } }, v));
  }
  $('choice-confirm').hidden = false;
  $('choice-confirm').disabled = false;
  $('choice-confirm').textContent = 'Cancel';
  $('choice-overlay').hidden = false;
}

function closeEdgePicker() {
  ui.edgePicking = false;
  $('choice-overlay').hidden = true;
}

async function startFight() {
  ui.c = ui.run.combat;
  ui.selected = null;
  const c = ui.c;
  // Floors without their own art fall back to a tinted gradient (class floor-N).
  const art = FLOOR_BACKGROUNDS[ui.run.floor + 1];
  // Absolute URL: a relative url() in a custom property resolves against the stylesheet.
  $('screen-combat').style.setProperty('--floor-bg', art ? `url("${new URL(art, document.baseURI).href}")` : 'none');
  $('screen-combat').dataset.floor = ui.run.floor + 1;
  clear($('toasts')); // messages from the previous fight must not carry over
  $('banner').classList.remove('show');
  $('enemy-sprite').classList.remove('dying');
  $('player-portrait').classList.remove('dying');
  showScreen('combat');
  const events = drain(c);
  ui.justDrawn = drawnUids(events);
  ui.busy = true;
  view.render(c, ui);
  await play(c, events.filter((e) => e.type === 'roll'), snapshot(c));
  ui.busy = false;
  ui.justDrawn = null; // the draw animation has played; later re-renders must not replay it
  view.render(c, ui);
}

// ── Combat actions ──

/** Runs one engine action, then animates what it produced. */
async function act(action, { clearsHand = false } = {}) {
  const c = ui.c;
  if (ui.busy || c.phase !== 'player') return;
  ui.busy = true;
  ui.selected = null;
  hideTooltip();
  $('end-turn-btn').disabled = true;
  const shown = snapshot(c);
  action(c);
  const events = drain(c);
  ui.justDrawn = drawnUids(events);
  if (clearsHand) {
    clear($('hand'));
    $('card-preview').hidden = true;
  } else {
    view.renderHand(c, ui);
    view.renderHud(c);
    ui.justDrawn = null;
  }
  await play(c, events, shown);
  ui.busy = false;
  if (c.phase === 'won' || c.phase === 'lost') return combatOver();
  view.render(c, ui);
  ui.justDrawn = null;
  if (c.pending) showChoice();
}

// ── Choices ──
// A card waiting on a choice (engine c.pending) opens this overlay; nothing else can be done
// until it is confirmed. The engine validates the answer.

function showChoice() {
  const p = ui.c.pending;
  ui.picked = new Set();
  $('choice-title').textContent = p.prompt;
  const grid = clear($('choice-grid'));
  if (p.kind === 'die') {
    for (let v = p.min; v <= p.max; v++) {
      grid.append(h('button', { class: 'die die-choice', type: 'button', onclick: () => confirmChoice(v) }, v));
    }
    $('choice-confirm').hidden = true;
  } else {
    for (const card of p.cards) {
      const el = cardView(card.key, { c: ui.c });
      el.addEventListener('click', () => {
        if (ui.picked.has(card.uid)) ui.picked.delete(card.uid);
        else if (ui.picked.size < p.count) ui.picked.add(card.uid);
        el.classList.toggle('picked', ui.picked.has(card.uid));
        updateConfirm();
      });
      grid.append(el);
    }
    $('choice-confirm').hidden = false;
    updateConfirm();
  }
  $('choice-overlay').hidden = false;
}

function updateConfirm() {
  const p = ui.c.pending;
  const btn = $('choice-confirm');
  btn.disabled = ui.picked.size !== p.count;
  btn.textContent = `Confirm (${ui.picked.size}/${p.count})`;
}

function confirmChoice(answer) {
  $('choice-overlay').hidden = true;
  act((c) => resolveChoice(c, answer));
}

function onCardTap(uid) {
  const c = ui.c;
  if (ui.busy || c.phase !== 'player') return;
  if (isTouch() && ui.selected !== uid) {
    ui.selected = uid;
    view.renderHand(c, ui);
    return;
  }
  act((c) => playCard(c, uid));
}

// ── After combat ──

function combatOver() {
  ui.c = null;
  finishCombat(ui.run);
  show();
}

function showReward() {
  const run = ui.run;
  const { reward } = run.state;
  $('reward-title').textContent = reward.boss ? `Floor ${run.floor + 1} cleared` : 'Victory';
  const loot = [`+${reward.gold} Gold`, `+${reward.souls} Soul${reward.souls > 1 ? 's' : ''}`];
  if (reward.boss) loot.push(`fully healed (+${reward.healed} HP)`);
  loot.push(`HP ${run.hp}/${run.maxHp}`);
  $('reward-loot').textContent = loot.join(' · ');
  const box = clear($('reward-cards'));
  if (!reward.cards.length) box.append(h('p', { class: 'screen-sub' }, 'Your pool has no new cards to offer.'));
  for (const { key, rarity } of reward.cards) {
    const el = cardView(key, { rarity });
    el.tabIndex = 0;
    el.addEventListener('click', () => runAction(() => takeCardReward(run, key)));
    box.append(el);
  }
  $('skip-btn').textContent = `Skip (+${REWARD_ODDS.skipGold} Gold)`;
  showScreen('reward');
}

function showEnd() {
  const run = ui.run;
  const summary = `HP ${run.hp}/${run.maxHp} · ${run.deck.length} cards · ${run.gold} Gold · ${run.souls} Souls · Seed ${run.seed}.`;
  if (run.state.result === 'victory') {
    $('end-title').textContent = 'Floor 4 cleared';
    $('end-text').textContent = `${summary}\nKing Aldric awaits beyond the throne-room doors — he arrives in Phase 5.`;
  } else {
    const room = run.path ? `room ${run.index + 1}` : 'the stairs';
    $('end-title').textContent = 'Defeated';
    $('end-text').textContent = `${run.state.enemy} ended your run on Floor ${run.floor + 1}, ${room}.\n${summary}`;
  }
  showScreen('end');
}

// ── Pile viewer ──

const PILE_TITLES = { draw: 'Draw pile · sorted, not in draw order', discard: 'Discard pile', exhaust: 'Exhausted this combat' };

function showPile(name) {
  const c = ui.c;
  let cards = c.piles[name];
  if (name === 'draw') cards = [...cards].sort((a, b) => a.key.localeCompare(b.key));
  $('pile-title').textContent = `${PILE_TITLES[name]} (${cards.length})`;
  const grid = clear($('pile-grid'));
  if (!cards.length) grid.append(h('p', { class: 'empty' }, 'Empty'));
  for (const card of cards) grid.append(cardView(card.key));
  $('pile-overlay').hidden = false;
}

// ── Wiring ──

function drawnUids(events) {
  return new Set(events.filter((e) => e.type === 'draw').flatMap((e) => e.uids));
}

const ACTIONS = {
  'to-heroes': showHeroes,
  'new-run': showHeroes,
  'skip-reward': () => runAction(() => skipCardReward(ui.run)),
  'leave-room': () => runAction(() => leaveRoom(ui.run)),
  'leave-shop': () => runAction(() => shopLeave(ui.run)),
  'leave-forge': () => runAction(() => soulLeave(ui.run)),
  'close-deck': () => { $('deck-overlay').hidden = true; },
  'close-pile': () => { $('pile-overlay').hidden = true; },
};

function wire() {
  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action) ACTIONS[action]();
    const pile = e.target.closest('[data-pile]')?.dataset.pile;
    if (pile && ui.c) showPile(pile);
  });

  // Both stop propagation: selecting re-renders the hand, so by the time the click bubbled up
  // its target would be detached and read as a tap outside the hand.
  $('hand').addEventListener('click', (e) => {
    e.stopPropagation();
    const card = e.target.closest('.card');
    if (card) onCardTap(Number(card.dataset.uid));
  });
  $('card-preview').addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.selected != null) onCardTap(ui.selected);
  });
  $('screen-combat').addEventListener('click', () => {
    if (ui.selected != null) {
      ui.selected = null;
      view.renderHand(ui.c, ui);
    }
  });
  $('end-turn-btn').addEventListener('click', () => act(endTurn, { clearsHand: true }));
  $('choice-confirm').addEventListener('click', () => (ui.edgePicking ? closeEdgePicker() : confirmChoice([...ui.picked])));
  $('second-die-btn').addEventListener('click', () => act(useSecondDie));
  $('edge-btn').addEventListener('click', openEdgePicker);
  $('reroll-btn').addEventListener('click', () => act(reroll));
  $('pile-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'pile-overlay') $('pile-overlay').hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('pile-overlay').hidden = true;
      hideTooltip();
      return;
    }
    if (!$('screen-combat').classList.contains('active') || !$('pile-overlay').hidden || ui.c?.pending) return;
    const c = ui.c;
    if (/^[1-9]$/.test(e.key)) {
      const card = c.piles.hand[Number(e.key) - 1];
      if (card) act((c) => playCard(c, card.uid));
    } else if (e.key === 'e' || e.key === 'E') {
      act(endTurn, { clearsHand: true });
    } else if (e.key === 'r' || e.key === 'R') {
      act(reroll);
    }
  });
}

function init() {
  if (params.get('fast') === '1') setSpeed(0.05);
  initTooltips();
  wire();
  if (params.has('hero') && HEROES[params.get('hero')]?.available) newRun(params.get('hero'));
  else showScreen('title');
  window.addEventListener('error', (e) => toast(`Error: ${e.message}`, 'warn'));
}

init();
