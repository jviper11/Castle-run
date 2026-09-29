import { shuffle } from './rng.js';
import { SOUL_UPGRADES, SOUL_FORGE } from '../content/rooms.js';

// Soul Forge upgrades (GDD §15). Buying one changes run-level values; combat reads them once, at
// fight start (engine/combat.js createCombat). `run.soul[id]` counts purchases.

export function soulCost(run, id) {
  const u = SOUL_UPGRADES[id];
  return u.cost + (u.costStep || 0) * (run.soul[id] || 0);
}

/** 3 random upgrades from those still eligible: repeatable ones, or ones not yet owned. */
export function soulOffers(run) {
  const eligible = Object.keys(SOUL_UPGRADES).filter((id) => SOUL_UPGRADES[id].repeatable || !run.soul[id]);
  return shuffle(run.rng, eligible).slice(0, SOUL_FORGE.offers);
}

export function soulText(id) {
  const u = SOUL_UPGRADES[id];
  return u.text.replace(/\{(\w+)\}/g, (_, k) => u.params[k]);
}

export function applySoulUpgrade(run, id) {
  const p = SOUL_UPGRADES[id].params;
  run.soul[id] = (run.soul[id] || 0) + 1;
  switch (id) {
    case 'vitality':
      run.maxHp += p.maxHp;
      run.hp = run.maxHp;
      break;
    case 'grit':
      run.startBlock += p.block;
      break;
    case 'steadyHand':
      run.bonusRerolls += p.rerolls;
      break;
    case 'momentum':
      run.maxEnergy += p.energy;
      break;
    case 'overdraw':
      run.extraDraw += p.draw;
      break;
    case 'recklessSurge':
      run.maxEnergy += p.energy;
      run.maxHp = Math.max(1, run.maxHp - p.maxHp);
      run.hp = Math.min(run.hp, run.maxHp);
      break;
    case 'secondDie':
    case 'gamblersEdge':
      break; // read in combat from run.soul
    default:
      throw new Error(`Unknown Soul upgrade: ${id}`);
  }
}
