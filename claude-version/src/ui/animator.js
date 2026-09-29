import { $, h, wait, flash } from './dom.js';
import { renderFighter, renderEnergy, renderDie } from './combatView.js';
import { STATUSES } from '../engine/statuses.js';

// Replays engine events as animation. The engine has already resolved everything; this only
// decides how it looks. A display snapshot taken before the engine call is advanced event by
// event, so bars and chips change in step with each hit.

let speed = 1;
export const setSpeed = (s) => { speed = s; };
const pause = (ms) => wait(ms * speed);

export function snapshot(c) {
  const unit = (u) => ({ hp: u.hp, maxHp: u.maxHp, block: u.block, statuses: { ...u.statuses }, statusData: u.statusData });
  return { player: unit(c.player), enemy: unit(c.enemy) };
}

const SPRITE = { player: 'player-portrait', enemy: 'enemy-sprite' };

export async function play(c, events, view) {
  for (const ev of events) {
    const unit = ev.side && view[ev.side];
    switch (ev.type) {
      case 'damage': {
        Object.assign(unit, { hp: ev.hp, block: ev.block });
        renderFighter(ev.side, unit);
        if (ev.lost > 0) float(ev.side, `-${ev.lost}`, 'dmg');
        if (ev.blocked > 0) float(ev.side, `🛡 -${ev.blocked}`, 'blocked', ev.lost > 0 ? 1 : 0);
        if (ev.lost === 0 && ev.blocked === 0) float(ev.side, '0', 'blocked');
        flash($(SPRITE[ev.side]), 'hit');
        if (ev.source === 'burn' || ev.source === 'poison') toast(`${STATUSES[ev.source].emoji} ${STATUSES[ev.source].name} deals ${ev.lost}`);
        await pause(ev.source === 'enemy' ? 380 : 260);
        break;
      }
      case 'hpLoss':
        unit.hp = ev.hp;
        renderFighter(ev.side, unit);
        float(ev.side, `-${ev.amount}`, 'dmg');
        await pause(220);
        break;
      case 'heal':
        unit.hp = ev.hp;
        renderFighter(ev.side, unit);
        if (ev.amount > 0) float(ev.side, `+${ev.amount}`, 'heal');
        await pause(220);
        break;
      case 'block':
        unit.block = ev.block;
        renderFighter(ev.side, unit);
        float(ev.side, `+${ev.amount} 🛡`, 'block');
        flash($(`${ev.side}-block`), 'pulse');
        await pause(180);
        break;
      case 'blockReset':
        unit.block = 0;
        renderFighter(ev.side, unit);
        break;
      case 'blockStrip':
        unit.block = ev.block;
        renderFighter(ev.side, unit);
        if (ev.amount > 0) float(ev.side, `-${ev.amount} 🛡`, 'blocked');
        await pause(200);
        break;
      case 'status': {
        if (ev.stacks) unit.statuses[ev.id] = ev.stacks;
        else delete unit.statuses[ev.id];
        renderFighter(ev.side, unit);
        if (ev.delta > 0) {
          const s = STATUSES[ev.id];
          float(ev.side, `${s.emoji} ${s.name}${ev.delta > 1 ? ' ×' + ev.delta : ''}`, s.kind === 'debuff' ? 'debuff' : 'buff', 1.4);
          await pause(260);
        }
        break;
      }
      case 'roll':
        renderDie(c, null, true);
        await pause(ev.reason === 'turn' ? 380 : 320);
        renderDie(c, ev.value);
        flash($('die'), 'landed');
        break;
      case 'energy':
        renderEnergy(ev.energy, c.player.maxEnergy);
        flash($('energy'), 'pulse');
        break;
      case 'play':
        renderEnergy(ev.energy, c.player.maxEnergy);
        break;
      case 'fizzle':
        renderEnergy(ev.energy, c.player.maxEnergy);
        toast(`${ev.reason} — Energy refunded`, 'warn');
        await pause(300);
        break;
      case 'rejected':
        toast(ev.reason, 'warn');
        break;
      case 'endTurn':
        banner('Enemy turn');
        await pause(350);
        break;
      case 'enemyAct':
        flash($('enemy-sprite'), ev.intent.kind === 'attack' ? 'lunge' : 'brace');
        if (ev.intent.kind === 'aim') toast('🎯 Taking aim…');
        await pause(ev.intent.kind === 'attack' ? 180 : 320);
        break;
      case 'ability':
        toast(`⚡ ${ev.name}`);
        await pause(420);
        break;
      case 'turnStart':
        if (ev.turn > 1) {
          banner(`Turn ${ev.turn}`);
          await pause(300);
        }
        break;
      case 'message':
        toast(ev.text);
        break;
      case 'handFull':
        toast(`Hand is full (${ev.limit})`, 'warn');
        break;
      case 'reshuffle':
        toast('Discard pile reshuffled');
        break;
      case 'gold':
        toast(`💰 ${ev.amount > 0 ? '+' : ''}${ev.amount} Gold`);
        $('hud-gold').textContent = ev.gold;
        break;
      case 'coin':
        toast(ev.won ? '🪙 The coin favours you' : '🪙 The coin turns against you', ev.won ? '' : 'warn');
        await pause(350);
        break;
      case 'souls':
        toast(`👻 +${ev.amount} Soul${ev.amount > 1 ? 's' : ''}`);
        $('hud-souls').textContent = ev.souls;
        break;
      case 'victory':
        $('enemy-sprite').classList.add('dying');
        await pause(750);
        break;
      case 'defeat':
        $('player-portrait').classList.add('dying');
        await pause(900);
        break;
      default:
        break;
    }
  }
}

// ── Effects ──

function float(side, text, kind, offset = 0) {
  const host = $(`fighter-${side}`);
  const el = h('div', { class: `floater floater-${kind}`, style: { '--offset': offset } }, text);
  host.append(el);
  setTimeout(() => el.remove(), 1100);
}

export function toast(text, kind = '') {
  const stack = $('toasts');
  const el = h('div', { class: `toast ${kind}` }, text);
  stack.append(el);
  while (stack.children.length > 3) stack.firstChild.remove();
  setTimeout(() => el.remove(), 2200);
}

export function banner(text) {
  const el = $('banner');
  el.textContent = text;
  flash(el, 'show');
}
