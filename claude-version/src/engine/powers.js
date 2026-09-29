import { emit } from './log.js';
import { stacks, statusData, addStatus } from './statuses.js';
import { damageEnemyDirect, heal } from './damage.js';
import { drawCards } from './piles.js';
import { onEnemyDamaged } from './enemies.js';

// Power behaviour at fixed hook points. Each hook reads the status stacks (the magnitude) and,
// for Powers whose upgrade adds an effect, statusData. Phase 4 relics will hang off these same
// hook points.
//
//   rollHooks          after the die lands on a rolled value     (dice.rollDie)
//   beforeCardEffect   after a card is paid for, before its ops   (combat.playCard)
//   afterCardEffect    after a card's ops (and any Echo)          (combat.playCard)
//   afterRegenTick     after Regen heals, before the enemy acts   (combat.endTurn step 3)
//
// "True damage" from Powers (Lucky Streak, Lethal Rhythm) ignores Block, like the reference,
// but now checks the enemy's HP abilities and death immediately (decision D2).

function trueDamage(c, amount, source) {
  if (c.enemy.hp <= 0 || amount <= 0) return;
  damageEnemyDirect(c, amount, source);
  onEnemyDamaged(c);
}

export function rollHooks(c) {
  const p = c.player;
  const d = c.die;
  const lucky = stacks(p, 'luckyStreak');
  if (lucky && d.value === d.sides && !d.suppressed) {
    emit(c, 'ability', { side: 'player', name: 'Lucky Streak' });
    drawCards(c, 1);
    trueDamage(c, lucky, 'luckyStreak');
  }
  if (stacks(p, 'vampiricForm') && (d.value === 1 || d.value === d.sides) && !stacks(p, 'fly')) {
    emit(c, 'ability', { side: 'player', name: 'Vampiric Form' });
    addStatus(c, 'player', 'fly', 1);
    addStatus(c, 'player', 'regen', statusData(p, 'vampiricForm').regen || 0);
  }
}

export function beforeCardEffect(c) {
  const rhythm = stacks(c.player, 'lethalRhythm');
  if (rhythm && c.turnState.cardsPlayed % 2 === 0) {
    emit(c, 'ability', { side: 'player', name: 'Lethal Rhythm' });
    trueDamage(c, rhythm, 'lethalRhythm');
  }
}

export function afterCardEffect(c, def) {
  const lord = stacks(c.player, 'bloodLord');
  if (lord && def.type === 'attack') heal(c, 'player', lord, 'bloodLord');
}

export function afterRegenTick(c, regenStacks) {
  if (!stacks(c.player, 'eternalHunger') || !regenStacks || c.enemy.hp <= 0) return;
  const d = statusData(c.player, 'eternalHunger');
  // The flat part (base card) is uncapped; the per-stack part (upgrade) is capped per turn.
  let perStack = (d.perStack || 0) * regenStacks;
  if (d.cap) perStack = Math.max(0, Math.min(perStack, d.cap - c.turnState.hungerDamage));
  c.turnState.hungerDamage += perStack;
  const dmg = (d.flat || 0) + perStack;
  if (dmg <= 0) return;
  emit(c, 'ability', { side: 'player', name: 'Eternal Hunger' });
  damageEnemyDirect(c, dmg, 'eternalHunger');
}
