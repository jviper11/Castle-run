// ═══════════════════════════════════════════════════════════════════
// DEV / DEBUG JUMP TOOL — testing convenience, NOT a player feature
// ═══════════════════════════════════════════════════════════════════
//
// Skips the run-up so a single fix can be spot-checked in isolation instead of replaying floors.
// Nothing here is reachable through normal UI navigation: there is no menu entry, no button, and
// no behaviour change unless a `?debug=` URL parameter is present or the console global is called
// by hand. A player using New Game sees exactly the game they saw before this file existed.
//
// ── Console ────────────────────────────────────────────────────────
//   dbg('aldric')                     jump straight into the King Aldric fight
//   dbg('boss', { floor: 2 })         jump into Floor 2's boss fight
//   dbg('bossintro', { floor: 1 })    Floor 1 boss intro screen, then the fight
//   dbg('floor', { floor: 3 })        Floor 3 path-select, play the floor normally
//   dbg('combat')                     a normal battle on the current//given floor
//   dbg('elite', { floor: 2 })        an elite fight on Floor 2
//
// ── URL ────────────────────────────────────────────────────────────
//   ?debug=aldric
//   ?debug=boss&floor=2
//   ?debug=floor&floor=3
//   ?debug=elite&floor=2&hero=thief&gold=500&souls=25
//
// ── Options (all optional, work in both forms) ─────────────────────
//   hero     barbarian | mage | thief | vampire | gambler   (default: mage)
//   floor    1-4                                            (default: 4 for aldric, else 1)
//   gold     starting Gold                                  (default: 250)
//   souls    starting Souls                                 (default: 12)
//   hp       starting HP                                    (default: full)
//   cores    number of Cores to pre-grant — 4 unlocks Aldric's Phase 3 path
//   relics   comma-separated relic keys, e.g. relics=ash_pendant,iron_vambrace
//   upgrades comma-separated Soul upgrade keys, e.g. upgrades=grit,second_die
//   weak / vulnerable / chill / rage / poison / burn
//            status stacks applied once the fight starts (weak/chill/rage/poison/burn land on
//            the enemy, vulnerable on the player) — for checking status maths without setup
//
// Example — Aldric at Phase 3 with debuffs already on him:
//   ?debug=aldric&cores=4&weak=3&chill=2

(function () {
  const DEFAULTS = { hero: 'mage', gold: 250, souls: 12 };

  function warn(msg) { console.warn('[dbg] ' + msg); }
  function info(msg) { console.log('%c[dbg] ' + msg, 'color:#c9a84c'); }

  function applyStatuses(opts) {
    if (!G || !G.statuses) return;
    const enemyStatuses = {
      weak: '😵Weak', chill: '❄️Chill', rage: '💢Rage', poison: '☠️Poison', burn: '🔥Burn',
    };
    Object.entries(enemyStatuses).forEach(([opt, name]) => {
      const n = parseInt(opts[opt], 10);
      if (n > 0 && G.enemy) applyStatus(G, 'enemy', name, n);
    });
    const vuln = parseInt(opts.vulnerable, 10);
    if (vuln > 0) applyStatus(G, 'player', '🫗Vulnerable', vuln);
    if (G.enemy) { renderAll(); updateIntent(); }
  }

  // Build a normal run, then move the pointer to the requested floor. Everything downstream
  // (map, paths, boss assignment, rewards) is the real thing — this only skips the walking.
  function setup(opts) {
    const hero = CHARACTERS[opts.hero] ? opts.hero : DEFAULTS.hero;
    if (!CHARACTERS[opts.hero] && opts.hero) warn(`unknown hero "${opts.hero}", using ${hero}`);

    newGame(hero);   // real new-run setup: map, deck, dice, souls reset to 0

    const floorNum = Math.min(4, Math.max(1, parseInt(opts.floor, 10) || 1));
    G.currentFloor = floorNum - 1;
    G.needsPathSelect = true;

    G.gold = opts.gold !== undefined ? (parseInt(opts.gold, 10) || 0) : DEFAULTS.gold;
    G.souls = opts.souls !== undefined ? (parseInt(opts.souls, 10) || 0) : DEFAULTS.souls;
    if (opts.hp !== undefined) G.hp = Math.min(G.maxHp, Math.max(1, parseInt(opts.hp, 10) || G.maxHp));

    const coreCount = parseInt(opts.cores, 10);
    if (coreCount > 0) {
      G.cores = BOSSES.filter(b => b.charKey !== hero).slice(0, coreCount).map(b => b.charKey);
      if (typeof renderCores === 'function') renderCores();
    }
    if (opts.relics) {
      String(opts.relics).split(',').map(s => s.trim()).filter(Boolean).forEach(k => {
        if (RELICS[k]) acquireRelic(k); else warn(`unknown relic "${k}"`);
      });
    }
    if (opts.upgrades) {
      String(opts.upgrades).split(',').map(s => s.trim()).filter(Boolean).forEach(k => {
        if (SOUL_UPGRADES[k]) {
          if (!G.soulUpgrades.includes(k)) G.soulUpgrades.push(k);
          if (typeof SOUL_UPGRADES[k].apply === 'function') SOUL_UPGRADES[k].apply(G);
        } else warn(`unknown soul upgrade "${k}"`);
      });
    }
    updateHUD();
    return { hero, floorNum };
  }

  const TARGETS = {
    // The most valuable case: straight into the final fight.
    aldric(opts) {
      if (opts.floor === undefined) opts.floor = 4;
      const { floorNum } = setup(opts);
      launchFinalBoss();
      applyStatuses(opts);
      info(`Aldric — floor ${floorNum}, cores ${G.cores.length}` +
        (G.aldricHasRelics ? ' (Phase 3 path unlocked)' : ' (Phase 3 locked — pass cores=4 for it)'));
    },
    boss(opts) {
      const { floorNum } = setup(opts);
      startBossFight();
      applyStatuses(opts);
      info(`Floor ${floorNum} boss — ${G.map[G.currentFloor].boss.name}`);
    },
    bossintro(opts) {
      const { floorNum } = setup(opts);
      showBossIntro(G.map[G.currentFloor].boss);
      info(`Floor ${floorNum} boss intro — ${G.map[G.currentFloor].boss.name}`);
    },
    floor(opts) {
      const { floorNum } = setup(opts);
      showPathSelect();
      info(`Floor ${floorNum} path select`);
    },
    combat(opts) {
      const { floorNum } = setup(opts);
      showCombatScreen();
      startCombat(false);
      applyStatuses(opts);
      info(`Floor ${floorNum} battle — ${G.enemy.name}`);
    },
    elite(opts) {
      const { floorNum } = setup(opts);
      showCombatScreen();
      startCombat(true);
      applyStatuses(opts);
      info(`Floor ${floorNum} elite — ${G.enemy.name}`);
    },
  };

  function jump(target, opts) {
    opts = Object.assign({}, opts || {});
    const key = String(target || '').toLowerCase();
    const fn = TARGETS[key];
    if (!fn) {
      warn(`unknown target "${target}". Try: ${Object.keys(TARGETS).join(', ')}`);
      return false;
    }
    try {
      fn(opts);
      return true;
    } catch (err) {
      console.error('[dbg] jump failed:', err);
      return false;
    }
  }

  // Console entry points. Deliberately short names, but namespaced copies too.
  window.dbg = jump;
  window.__debugJumpTo = jump;
  window.__debug = { jump, targets: Object.keys(TARGETS) };

  // URL form. Runs only when ?debug= is present, so normal loads are untouched.
  try {
    if (typeof URLSearchParams !== 'function' || !window.location) return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get('debug');
    if (target) {
      const opts = {};
      params.forEach((v, k) => { if (k !== 'debug') opts[k] = v; });
      // Wait for the rest of the boot sequence (title particles, viewport sizing) to finish.
      const go = () => {
        if (typeof hideLoader === 'function') hideLoader();
        jump(target, opts);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
      else setTimeout(go, 0);
    }
  } catch (err) {
    console.error('[dbg] URL parse failed:', err);
  }
})();
