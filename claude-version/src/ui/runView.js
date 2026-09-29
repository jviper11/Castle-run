import { $, h, clear } from './dom.js';
import { doorOptions, currentFloor, currentPath, restOptions, rarityOf } from '../engine/run.js';
import { itemAvailable, canShopRemove, canUpgrade } from '../engine/shop.js';
import { soulCost, soulText } from '../engine/soul.js';
import { dieType, dieText, affinityLine } from '../engine/dice.js';
import { SHOP, SOUL_UPGRADES } from '../content/rooms.js';
import { cardView } from './cardView.js';
import { mirrorIndex } from '../engine/map.js';
import { ROOMS, PATH_NAMES, MAGIC_HINTS, PLACEHOLDERS, FLOOR_COUNT } from '../content/map.js';
import { HEROES } from '../content/heroes.js';
import { ENEMIES, FLOOR_NAMES } from '../content/enemies.js';
import { DEFEND_BLOCK } from '../engine/enemies.js';

// Out-of-combat run screens: path select, doors (with the Mirror), rest, shop, Soul Forge, the
// boss introduction, floor cleared, the map overlay, placeholder rooms and the status bar they
// share. Each function renders the run's current state and wires buttons to the handlers it is
// given; none of them changes the run itself.

/** The HP / Gold / Souls / deck / die bar shown on every run screen. */
export function renderRunStatus(run) {
  const hero = HEROES[run.heroKey];
  for (const el of document.querySelectorAll('[data-run-status]')) {
    clear(el).append(
      h('span', { class: 'chip' }, hero.emoji, ' ', h('b', {}, hero.name)),
      h('span', { class: 'chip' }, '❤️ ', h('b', {}, `${run.hp}/${run.maxHp}`)),
      h('span', { class: 'chip' }, '💰 ', h('b', {}, run.gold)),
      h('span', { class: 'chip' }, '👻 ', h('b', {}, run.souls)),
      h('span', { class: 'chip' }, '🂠 ', h('b', {}, `${run.deck.length} cards`)),
      dieChip(run),
      h('span', { class: 'chip' }, `Floor ${run.floor + 1}/${FLOOR_COUNT}`),
      h('button', { class: 'chip chip-btn', type: 'button', dataset: { action: 'open-map' }, title: 'Map of this floor (M)' }, '🗺 Map'),
    );
  }
}

/** The equipped die, with its bonus and what the hero's affinity means on it. */
function dieChip(run) {
  const die = dieType(run.die);
  return h('span', {
    class: 'chip',
    dataset: {
      tipTitle: `${die.emoji} ${die.name} (${die.id})`,
      tip: `${dieText(run.die)}\n${heroAffinityLine(run, die.sides)}`,
    },
  }, die.emoji, ' ', h('b', {}, die.id));
}

const heroAffinityLine = (run, sides) => affinityLine(HEROES[run.heroKey].affinity, sides);

function roomIcon(type, magic) {
  return h('span', { class: `room-dot room-${type}`, title: ROOMS[type].label },
    ROOMS[type].icon, magic && h('sup', { class: 'magic-mark', title: 'Magic Door' }, '✨'));
}

export function renderPathSelect(run, onChoose) {
  const floor = currentFloor(run);
  $('paths-title').textContent = `Floor ${run.floor + 1}`;
  const grid = clear($('path-grid'));
  for (const [key, rooms] of Object.entries(floor.paths)) {
    const count = (t) => rooms.filter((r) => r.type === t).length;
    grid.append(h('div', { class: 'path-card' },
      h('div', { class: 'path-head' }, h('b', {}, `Path ${key}`), ' · ', PATH_NAMES[key]),
      h('div', { class: 'path-rooms' }, rooms.map((r) => roomIcon(r.type, !!r.magic)), h('span', { class: 'room-dot room-boss' }, '👑')),
      h('div', { class: 'path-stats' },
        `${rooms.length} rooms · ⚔️ ${count('battle')} · ☠️ ${count('elite')} · 🔥 ${count('rest')} · 💰 ${count('shop')} · ❔ ${count('event')} · ✨ ${rooms.filter((r) => r.magic).length}`),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => onChoose(key) }, `Take Path ${key}`),
    ));
  }
}

export function renderDoors(run, { onDoor, onMirror }) {
  const floor = currentFloor(run);
  const path = currentPath(run);
  const doors = doorOptions(run);

  // Where you are on the path.
  const strip = clear($('path-strip'));
  path.forEach((room, i) => {
    const el = roomIcon(room.type, !!room.magic && i >= run.index);
    el.classList.add(i < run.index ? 'done' : i === run.index ? 'next' : 'ahead');
    if (i === mirrorIndex(floor) && !floor.mirrorUsed) el.classList.add('mirror-slot');
    strip.append(el);
  });
  strip.append(h('span', { class: `room-dot room-boss ${run.index >= path.length ? 'next' : 'ahead'}` }, '👑'));

  $('doors-title').textContent = doors.boss
    ? 'The boss awaits'
    : `Path ${run.path} · Room ${run.index + 1} of ${path.length}`;

  const row = clear($('door-row'));
  for (const opt of doors.options) row.append(doorTile(opt, () => onDoor(opt.id)));

  const panel = $('mirror-panel');
  if (doors.mirror) {
    const m = doors.mirror;
    clear(panel).append(
      // No glyph: 🪞 (Unicode 13) renders as a tofu box in the Windows emoji font, and the
      // panel's own frame already sets it apart.
      h('div', { class: 'mirror-head' }, h('b', {}, 'A mirror'), ` reflects Path ${m.target} · ${PATH_NAMES[m.target]}`),
      h('div', { class: 'path-rooms' }, m.preview.map((t) => roomIcon(t)), h('span', { class: 'room-dot room-boss' }, '👑')),
      h('p', { class: 'mirror-note' }, `Step through to continue on Path ${m.target} from this same room. Once per floor.`),
      h('button', { class: 'btn', type: 'button', disabled: !m.affordable, onclick: onMirror },
        m.affordable ? `Step through (${m.cost} Gold)` : `Step through (${m.cost} Gold — not enough)`),
    );
    panel.hidden = false;
  } else {
    panel.hidden = true;
  }
}

function doorTile(opt, onclick) {
  if (opt.id === 'boss') {
    return h('button', { class: 'door door-boss', type: 'button', onclick },
      h('div', { class: 'door-icon' }, '👑'), h('div', { class: 'door-label' }, 'Onwards'), h('div', { class: 'door-sub' }, 'Floor boss'));
  }
  if (opt.id === 'continue') {
    const r = ROOMS[opt.room];
    return h('button', { class: 'door', type: 'button', onclick },
      h('div', { class: 'door-icon' }, r.icon), h('div', { class: 'door-label' }, r.label), h('div', { class: 'door-sub' }, 'Continue'));
  }
  const { type, hidden } = opt.magic;
  return h('button', { class: 'door door-magic', type: 'button', onclick, dataset: hidden ? { tipTitle: 'A hidden Magic Door', tip: MAGIC_HINTS[type] } : {} },
    h('div', { class: 'door-icon' }, hidden ? '🚪' : ROOMS[type].icon),
    h('div', { class: 'door-label' }, hidden ? '???' : ROOMS[type].label),
    h('div', { class: 'door-sub' }, '✨ Magic Door'),
    hidden && h('div', { class: 'door-hint' }, MAGIC_HINTS[type]),
  );
}

// ── Dice ──

/**
 * One die, described the same way wherever it is offered. The shop's tile is card-shaped and
 * narrow, so it gets the short form; a die cache is a choice between dice and gets the affinity
 * line too, because that is what the choice turns on (decision D8).
 */
function dieParts(run, id, { note, full = false } = {}) {
  const die = dieType(id);
  const replaces = `Replaces your ${dieType(run.die).id}.`;
  return [
    h('div', { class: 'option-icon' }, die.emoji),
    h('div', { class: 'option-title' }, `${die.name} (${die.id})`),
    h('div', { class: 'option-text' }, dieText(id)),
    h('div', { class: 'option-note' }, note || (full ? `Rolls 1–${die.sides}. ${replaces}` : replaces)),
    full && h('div', { class: 'option-note' }, heroAffinityLine(run, die.sides)),
  ];
}

export function renderDieCache(run, { onTake }) {
  const offers = run.state.offers;
  $('die-cache-sub').textContent = offers.length
    ? 'A velvet case, something inside it still rattling. Take one — it replaces the die you carry.'
    : 'A velvet case, long since emptied. There is nothing here you do not already have.';
  const row = clear($('die-cache-offers'));
  for (const id of offers) {
    row.append(h('button', { class: 'option-tile die-offer', type: 'button', onclick: () => onTake(id) },
      ...dieParts(run, id, { full: true })));
  }
}

export function renderRoom(run) {
  const room = run.state.room;
  const p = PLACEHOLDERS[room];
  $('room-icon').textContent = ROOMS[room].icon;
  $('room-title').textContent = p.title;
  $('room-text').textContent = p.text;
  $('room-note').textContent = p.note;
}

// ── Rest, shop, Soul Forge ──

function optionTile({ icon, title, text, disabled, onclick, extra }) {
  return h('button', { class: 'option-tile', type: 'button', disabled: !!disabled, onclick },
    h('div', { class: 'option-icon' }, icon),
    h('div', { class: 'option-title' }, title),
    h('div', { class: 'option-text' }, text),
    extra,
  );
}

export function renderRest(run, { onHeal, onPick, onLeave }) {
  const o = restOptions(run);
  const row = clear($('rest-options'));
  row.append(
    optionTile({
      icon: '❤️', title: 'Rest', disabled: !o.canHeal, onclick: onHeal,
      text: o.canHeal ? `Recover ${Math.min(o.heal, run.maxHp - run.hp)} HP (${Math.min(run.hp + o.heal, run.maxHp)}/${run.maxHp})` : 'Already at full HP',
    }),
    optionTile({ icon: '⬆️', title: 'Upgrade a card', text: 'Free. Choose one card to upgrade.', disabled: !o.upgradable, onclick: () => onPick('upgrade') }),
    optionTile({ icon: '🗑️', title: 'Remove a card', text: 'Free. Choose one card to remove from your deck.', disabled: !o.removable, onclick: () => onPick('remove') }),
  );
  if (o.canLeave) row.append(optionTile({ icon: '🚪', title: 'Leave', text: 'Nothing to do here.', onclick: onLeave }));
}

export function renderShop(run, { onBuy, onPick }) {
  const shelf = clear($('shop-shelf'));
  for (const item of run.state.stock) {
    const available = itemAvailable(item, run);
    const affordable = run.gold >= item.price;
    const tile = h('button', {
      class: 'shop-item' + (item.sold ? ' sold' : '') + (!available && !item.sold ? ' unavailable' : ''),
      type: 'button', disabled: item.sold || !available || !affordable, onclick: () => onBuy(item.id),
    });
    if (item.kind === 'card') tile.append(cardView(item.key, { rarity: rarityOf(run.heroKey, item.key) }));
    else tile.append(h('div', { class: 'shop-die' }, ...dieParts(run, item.die, { note: available ? null : 'Already equipped.' })));
    tile.append(h('div', { class: 'price' + (affordable ? '' : ' too-dear') }, item.sold ? 'Sold' : `💰 ${item.price}`));
    shelf.append(tile);
  }
  const removable = run.deck.some(canShopRemove);
  const upgradable = run.deck.some(canUpgrade);
  clear($('shop-services')).append(
    optionTile({ icon: '🗑️', title: `Remove a card · 💰 ${SHOP.removePrice}`, text: 'Not Strike or Defend. Repeatable.',
      disabled: !removable || run.gold < SHOP.removePrice, onclick: () => onPick('shopRemove') }),
    optionTile({ icon: '⬆️', title: `Upgrade a card · 💰 ${SHOP.upgradePrice}`, text: 'Repeatable.',
      disabled: !upgradable || run.gold < SHOP.upgradePrice, onclick: () => onPick('shopUpgrade') }),
  );
}

export function renderSoulForge(run, { onBuy }) {
  $('forge-sub').textContent = `You have ${run.souls} Soul${run.souls === 1 ? '' : 's'}. Buy one upgrade, or keep your Souls for the next forge.`;
  const row = clear($('forge-offers'));
  for (const id of run.state.offers) {
    const u = SOUL_UPGRADES[id];
    const cost = soulCost(run, id);
    row.append(optionTile({
      icon: u.emoji, title: `${u.name} · 👻 ${cost}`, text: soulText(id), disabled: run.souls < cost, onclick: () => onBuy(id),
      extra: u.repeatable && h('div', { class: 'option-note' }, `Repeatable; cost rises by ${u.costStep} each time.`),
    }));
  }
  $('forge-leave').textContent = `Keep my Souls (${run.souls})`;
}

// ── Boss introduction and floor cleared ──

export function renderBossIntro(run) {
  const boss = ENEMIES[run.state.boss];
  $('boss-portrait').src = boss.portrait;
  $('boss-portrait').alt = boss.name;
  $('boss-eyebrow').textContent = `Floor ${run.floor + 1} · ${FLOOR_NAMES[run.floor + 1]} · Boss`;
  $('boss-name').textContent = boss.name;
  $('boss-title').textContent = boss.title;
  $('boss-hint').textContent = boss.hint;
  // A companion boss has the plain attack/defend AI (PHASE3_PLAN D4), so its numbers are the whole
  // story; they are stated rather than left for the first turn to reveal.
  // Built with h(), which skips a missing child: the DOM's own append() would print "null".
  $('boss-stats').replaceWith(h('div', { class: 'boss-stats', id: 'boss-stats' },
    h('span', { class: 'chip' }, '❤️ ', h('b', {}, boss.hp), ' HP'),
    h('span', { class: 'chip' }, '⚔️ attacks for ', h('b', {}, boss.damage)),
    h('span', { class: 'chip' }, '🛡 defends for ', h('b', {}, DEFEND_BLOCK)),
    boss.block ? h('span', { class: 'chip' }, 'starts with ', h('b', {}, boss.block), ' Block') : null,
  ));
}

export function renderFloorClear(run) {
  const r = run.state.record;
  const last = r.floor === FLOOR_COUNT - 1;
  $('clear-title').textContent = `${FLOOR_NAMES[r.floor + 1]} cleared`;
  $('clear-sub').textContent = `${ENEMIES[r.boss].name}, the ${ENEMIES[r.boss].title}, has fallen.`;
  const walked = r.paths.length > 1 ? `Paths ${r.paths.join(' → ')} (Mirror)` : `Path ${r.path} · ${PATH_NAMES[r.path]}`;
  clear($('clear-stats')).append(
    stat('🧭', walked),
    stat('🚪', `${r.rooms} rooms`),
    stat('⚔️', `${r.fights} fights${r.elites ? `, ${r.elites} elite${r.elites > 1 ? 's' : ''}` : ''}`),
    stat('❤️', `${r.hp}/${r.maxHp} HP`),
  );
  $('clear-next').textContent = last ? 'Onward' : 'To the Soul Forge';
}

const stat = (icon, text) => h('div', { class: 'clear-stat' }, h('span', { class: 'clear-icon' }, icon), text);

/** The run-end screen's list of floors cleared, one line each. */
export function renderEndFloors(run) {
  const box = clear($('end-floors'));
  for (const r of run.cleared) {
    box.append(h('div', { class: 'end-floor' },
      h('b', {}, `${r.floor + 1} · ${FLOOR_NAMES[r.floor + 1]}`),
      h('span', {}, `${ENEMIES[r.boss].name} · Path ${r.paths.join('→')} · ${r.fights} fights`),
    ));
  }
  box.hidden = !run.cleared.length;
}

// ── Map overlay ──
// Every floor, as the reference's map shows it: all three paths of each, the current floor marked
// with where you are, cleared floors ticked. The GDD does not define the map's scope, so the
// reference's is kept (COMPARISON §H8) — including future floors' room types.
//
// It never shows more than path select already does: room types, and that a Magic Door exists.
// A Magic Door's contents are revealed only on the door screen (and hidden there on Floors 3–4),
// and a boss's identity only once it has been beaten, as in the reference.

export function renderMap(run) {
  $('map-title').textContent = `The castle · Floor ${run.floor + 1} of ${FLOOR_COUNT}`;
  const body = clear($('map-body'));
  run.map.floors.forEach((floor, f) => body.append(mapFloor(run, floor, f)));
  const legend = [['⚔️', 'Battle'], ['☠️', 'Elite'], ['🔥', 'Rest'], ['💰', 'Shop'],
    ['❔', ROOMS.event.label], ['✨', 'Magic Door'], ['👑', 'Boss']];
  clear($('map-legend')).append(
    ...legend.map(([i, t]) => h('span', {}, i, ' ', t)),
    h('span', {}, 'dashed: Mirror'),
    h('span', {}, 'dim: played'),
    h('span', {}, 'ring: you are here'),
  );
  // Open on the floor you are on.
  requestAnimationFrame(() => body.querySelector('.map-floor.current')?.scrollIntoView({ block: 'nearest' }));
}

function mapFloor(run, floor, f) {
  const current = f === run.floor;
  const record = run.cleared.find((r) => r.floor === f);
  const state = record ? '✓ cleared' : current ? 'you are here' : f > run.floor ? 'ahead' : '';
  const el = h('div', { class: 'map-floor' + (current ? ' current' : '') + (record ? ' cleared' : '') },
    h('div', { class: 'map-floor-name' }, h('b', {}, `Floor ${f + 1} · ${FLOOR_NAMES[f + 1]}`), state && ` · ${state}`));

  const played = new Set(run.visits.filter((v) => v.floor === f && v.type !== 'die').map((v) => `${v.path}:${v.index}`));
  // The Mirror is offered on the path you are walking, at its halfway room, once per floor; before
  // a path is chosen it could be on any of them.
  const mirrorAt = floor.mirrorUsed || !current ? -1 : mirrorIndex(floor);
  const mirrorOn = (key) => i => i === mirrorAt && (!run.path || key === run.path);
  const screen = run.state.screen;
  for (const [key, rooms] of Object.entries(floor.paths)) {
    const mine = current && key === run.path;
    const row = h('div', { class: 'map-path' + (mine ? ' mine' : '') },
      h('div', { class: 'map-path-name' }, h('b', {}, `Path ${key}`), ` · ${PATH_NAMES[key]}`, mine ? h('span', { class: 'map-you' }, ' · your path') : null));
    const strip = h('div', { class: 'path-rooms' });
    rooms.forEach((room, i) => {
      const at = mine && i === run.index && screen !== 'pathSelect';
      // The room you are standing in has been entered, but it is not behind you yet.
      const done = played.has(`${key}:${i}`) && !(at && screen !== 'doors');
      const el = roomIcon(room.type, !!room.magic && !done);
      if (done) el.classList.add('done');
      if (at) el.classList.add(screen === 'doors' ? 'next' : 'here');
      if (mirrorOn(key)(i)) el.classList.add('mirror-slot');
      strip.append(el);
    });
    const atBoss = mine && run.index >= rooms.length;
    const bossName = record ? ENEMIES[record.boss].name : null;
    strip.append(h('span', { class: `room-dot room-boss${atBoss ? ' next' : ''}`, title: bossName ? `Boss: ${bossName}` : 'Floor boss — identity unknown' }, '👑'));
    row.append(strip);
    el.append(row);
  }
  if (record) el.append(h('div', { class: 'map-boss-note' }, `Boss: ${ENEMIES[record.boss].name}`));
  if (current && !run.path) el.append(h('p', { class: 'screen-sub' }, 'Choose a path to start this floor.'));
  return el;
}
