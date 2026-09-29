// Content lint: catches text/effect drift and malformed data before it reaches the UI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../src/content/cards.js';
import { ENEMIES, FLOOR_POOLS } from '../src/content/enemies.js';
import { REWARD_POOLS } from '../src/content/rewards.js';
import { HEROES } from '../src/content/heroes.js';
import { getCard, describeCard, cardTextPlain, templateParams, resolveParams, allOps } from '../src/engine/cards.js';
import { OPS, CHOICE_OPS } from '../src/engine/ops.js';
import { CONDITIONS } from '../src/engine/conditions.js';
import { isFormula, validateFormula } from '../src/engine/values.js';
import { ABILITIES, PATTERNS, describeAbilities, createEnemy } from '../src/engine/enemies.js';
import { STATUSES } from '../src/engine/statuses.js';
import { makeCombat, setRoll } from './helpers.js';

const allKeys = Object.keys(CARDS).flatMap((k) => [k, k + '+']);
// Op fields that name things rather than params.
const NAME_FIELDS = new Set(['op', 'target', 'status', 'if', 'win', 'lose', 'data', 'hits', 'p', 'set', 'exclude']);

/** [field, ref] for every param reference an op makes. */
function paramRefs(o) {
  const refs = Object.entries(o).filter(([k, v]) => !NAME_FIELDS.has(k) && typeof v === 'string');
  for (const [k, v] of Object.entries(o.data || {})) if (typeof v === 'string') refs.push(['data.' + k, v]);
  return refs;
}

function conditionsOf(def) {
  return [def.gate, ...(def.when || []).map((w) => w.if), ...allOps(def.ops).map((o) => o.if)].filter(Boolean);
}

function templates(def) {
  return [def.text, def.affinityText, ...(def.when || []).map((w) => w.text)].filter(Boolean);
}

test('every card and upgrade renders its text', () => {
  for (const key of allKeys) {
    const def = getCard(key);
    assert.doesNotThrow(() => describeCard(def), key);
    assert.ok(cardTextPlain(def).length > 0, key);
  }
});

test('every param an op uses exists, and every param appears in the card text', () => {
  for (const key of allKeys) {
    const def = getCard(key);
    const shown = new Set(templates(def).flatMap(templateParams));
    for (const o of allOps(def.ops)) {
      assert.ok(OPS[o.op], `${key}: unknown op ${o.op}`);
      for (const [field, ref] of paramRefs(o)) {
        assert.ok(ref in def.params, `${key}: op ${o.op}.${field} uses missing param ${ref}`);
      }
    }
    for (const p of Object.keys(def.params)) assert.ok(shown.has(p), `${key}: param "${p}" is never shown in the text`);
    for (const p of Object.keys(def.onAffinity || {}).filter((k) => def.onAffinity[k] !== 0 && JSON.stringify(def.onAffinity[k]) !== JSON.stringify(def.params[k]))) {
      assert.ok(def.affinityText && templateParams(def.affinityText).includes(p), `${key}: affinity param "${p}" is not in affinityText`);
    }
  }
});

test('cards with an affinity say what it does, and cards without one do not', () => {
  for (const key of allKeys) {
    const def = getCard(key);
    const saysAffinity = !!def.affinityText || (def.when || []).some((w) => w.onAffinity && Object.keys(w.onAffinity).length);
    assert.equal(!!def.affinity, saysAffinity, key);
  }
});

test('every op status, card type, condition and formula source is known', () => {
  for (const key of allKeys) {
    const def = getCard(key);
    assert.ok(['attack', 'skill', 'power'].includes(def.type), key);
    for (const o of allOps(def.ops)) if (o.status) assert.ok(STATUSES[o.status], `${key}: ${o.status}`);
    for (const cond of conditionsOf(def)) for (const k of Object.keys(cond)) assert.ok(CONDITIONS[k], `${key}: condition ${k}`);
    const values = [def.params, def.onAffinity, ...(def.when || []).flatMap((w) => [w.params, w.onAffinity])];
    for (const v of values.flatMap((p) => Object.values(p || {}))) if (isFormula(v)) assert.doesNotThrow(() => validateFormula(v), key);
  }
});

test('choices never sit inside a chance branch; Powers never ask for choices', () => {
  for (const key of allKeys) {
    const def = getCard(key);
    const nested = def.ops.flatMap((o) => allOps([...(o.win || []), ...(o.lose || [])]));
    assert.ok(!nested.some((o) => CHOICE_OPS.has(o.op)), key);
    if (def.type === 'power') assert.ok(!allOps(def.ops).some((o) => CHOICE_OPS.has(o.op)), key);
  }
});

test('every upgrade changes at least one number or the cost', () => {
  for (const key of Object.keys(CARDS)) {
    const a = getCard(key);
    const b = getCard(key + '+');
    const same = JSON.stringify([a.cost, a.params, a.onAffinity, a.when, a.ops, a.text]) === JSON.stringify([b.cost, b.params, b.onAffinity, b.when, b.ops, b.text]);
    // An identical upgrade must say why (both the reference and the design doc define none).
    assert.equal(same, !!CARDS[key].identicalUpgrade, `${key}+ is ${same ? '' : 'not '}identical to ${key}`);
  }
});

test('upgrade text is generated from upgraded numbers', () => {
  assert.equal(cardTextPlain(getCard('heavyblow')), 'Deal 10 damage. Even: Deal 16 instead.');
  assert.equal(cardTextPlain(getCard('heavyblow+')), 'Deal 13 damage. Even: Deal 21 instead.');
  assert.equal(cardTextPlain(getCard('warcry')), 'Gain 3 Block. Even: Also draw 1 card.');
  assert.equal(cardTextPlain(getCard('warcallecho+')), 'Draw 2 cards. Even: Also apply 1 Weak.');
});

test('Last Stand resolves all four combinations, base and upgraded', () => {
  const cases = [
    ['laststand', { low: false, even: false }, 10], ['laststand', { low: false, even: true }, 14],
    ['laststand', { low: true, even: false }, 20], ['laststand', { low: true, even: true }, 28],
    ['laststand+', { low: false, even: false }, 12], ['laststand+', { low: false, even: true }, 16],
    ['laststand+', { low: true, even: false }, 24], ['laststand+', { low: true, even: true }, 32],
  ];
  for (const [key, { low, even }, block] of cases) {
    const c = makeCombat({ hp: low ? 27 : 90 });
    setRoll(c, even ? 2 : 3);
    assert.equal(resolveParams(c, getCard(key)).params.block, block, `${key} low=${low} even=${even}`);
  }
});

test('live card text shows damage after modifiers', () => {
  const c = makeCombat();
  c.player.statuses = { rage: 2 };
  const token = describeCard(getCard('strike'), c)[0].parts.find((p) => typeof p === 'object');
  assert.equal(token.base, 6);
  assert.equal(token.value, 8);
});

test('reward pools and starter decks reference real cards', () => {
  for (const [hero, pool] of Object.entries(REWARD_POOLS)) {
    for (const key of [...pool.common, ...pool.uncommon, ...pool.rare]) assert.ok(CARDS[key], `${hero}: ${key}`);
  }
  for (const [hero, h] of Object.entries(HEROES)) for (const key of h.starterDeck) assert.ok(CARDS[key], `${hero}: ${key}`);
});

test('enemies: pools reference real enemies; patterns and abilities exist and describe themselves', () => {
  for (const floor of Object.values(FLOOR_POOLS)) {
    for (const id of [...floor.easy, ...floor.standard, ...floor.elite]) assert.ok(ENEMIES[id], id);
  }
  for (const id of Object.keys(ENEMIES)) {
    const e = createEnemy(id);
    assert.ok(PATTERNS[e.pattern.id], id);
    for (const a of e.abilities) assert.ok(ABILITIES[a.id], `${id}: ${a.id}`);
    for (const d of describeAbilities(e)) assert.doesNotMatch(d.text, /undefined|NaN/, `${id}: ${d.text}`);
  }
});
