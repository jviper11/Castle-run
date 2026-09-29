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

// Out-of-combat run screens: path select, doors (with the Mirror), rest, shop, Soul Forge,
// placeholder rooms and the status bar they share. Each function renders the run's current state
// and wires buttons to the handlers it is given; none of them changes the run itself.

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
      h('div', { class: 'mirror-head' }, '🪞 ', h('b', {}, 'A mirror'), ` reflects Path ${m.target} · ${PATH_NAMES[m.target]}`),
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
