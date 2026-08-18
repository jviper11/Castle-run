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
//   dbg('eventcombat')                the event-combat plumbing proof of concept (dummy enemy;
//                                     winning returns to path select, losing is a normal game over)
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
//   cores    number of in-run Cores to pre-grant (lore / Challenge-unlock system).
//            NOTE: this no longer unlocks Aldric's Phase 3 — use `crelics` for that.
//   crelics  Challenge relics to seed into the PERMANENT record, which is what Aldric's
//            Phase 3 / True Ending gate reads (4 of 5). Either a count or a hero list:
//            crelics=4  or  crelics=mage,thief,gambler,vampire
//            Seeded IN MEMORY ONLY — never saved, so a real save is untouched.
//   challenge  1 = make the upcoming floor boss Challenge-eligible (seeds their Core into the
//              permanent record IN MEMORY ONLY — never saved, so a real save is untouched).
//              Or pass a hero key (challenge=mage) to seed that hero specifically.
//              Pair with `bossintro` to see the opt-in prompt: ?debug=bossintro&challenge=1
//   relics   comma-separated relic keys, e.g. relics=ash_pendant,iron_vambrace
//   consumables  comma-separated consumable keys, e.g.
//                consumables=health_potion,health_potion,block_stone — capped at 3, warns and
//                skips anything past the cap rather than silently dropping it.
//                Keys: health_potion, smoke_vial, fire_flask, poison_vial, energy_crystal,
//                scroll_of_draw, dice_stabilizer, gold_pouch, block_stone, chaos_potion
//                (all of CONSUMABLES).
//   curses   comma-separated Curse card keys pushed into the deck, e.g.
//            curses=curse_debt,curse_debt,curse_binding — duplicates are meaningful (Debt scales
//            per copy, each Binding surcharges its own card key). Keys: curse_weakness, curse_debt,
//            curse_confusion, curse_binding.
//   upgrades comma-separated Soul upgrade keys, e.g. upgrades=grit,second_die
//   weak / vulnerable / chill / rage / poison / burn
//            status stacks applied once the fight starts (weak/chill/rage/poison/burn land on
//            the enemy, vulnerable on the player) — for checking status maths without setup
//   dicelock=<n>  start with the die already Dice-Stabilizer-locked for n turns, without spending
//            a turn using the item. Turn 1 has already rolled by then, so the first SKIPPED roll
//            is turn 2's; dicelock=2 therefore behaves exactly like using the item on turn 1.
//
// Example — Aldric with the True Ending gate open and debuffs already on him:
//   ?debug=aldric&crelics=4&weak=3&chill=2
// Example — a locked die on a normal fight: ?debug=combat&dicelock=2

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
    // dicelock=<n> — start already locked for n turns, so the locked state (held value, disabled
    // reroll + forced-set buttons, expiry) is reachable without first spending a turn on the item.
    // Must be applied from here rather than from setup(): setup() runs BEFORE the fight-start
    // function, and all four of those reset G._diceLockTurnsRemaining to 0.
    const diceLock = parseInt(opts.dicelock, 10);
    if (diceLock > 0) {
      G._diceLockTurnsRemaining = diceLock;
      info(`dicelock: die held at ${G.currentDie} for ${diceLock} turn(s) — turn 1 already rolled, so the first skipped roll is next turn`);
    }
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

    // relics=<n|list> seeds the PERMANENT Challenge relic record, which is what Aldric's Phase 3
    // / True Ending gate now reads (hasTrueEndingRelics(), 4 of 5). `cores` above no longer
    // unlocks Phase 3 — it grants in-run Cores only, which is a different system. Seeded in
    // memory and never saveMeta()'d, so testing cannot write into a real player's save.
    //   crelics=4                      -> 4 relics from heroes other than the chosen one
    //   crelics=mage,thief,gambler     -> exactly those
    if (opts.crelics !== undefined) {
      const raw = String(opts.crelics).trim();
      const asCount = parseInt(raw, 10);
      let keys;
      if (String(asCount) === raw && asCount >= 0) {
        keys = Object.keys(CHALLENGES).filter(k => k !== hero).slice(0, asCount);
      } else {
        keys = raw.split(',').map(s => s.trim()).filter(Boolean);
        keys.forEach(k => { if (!CHALLENGES[k]) warn(`unknown challenge hero "${k}"`); });
        keys = keys.filter(k => CHALLENGES[k]);
      }
      META.challengeRelicsEarned = keys.slice();
      info(`crelics: ${keys.length} Challenge relic(s) seeded in META (memory only) — ` +
        (hasTrueEndingRelics() ? 'True Ending gate OPEN' : `gate needs ${TRUE_ENDING_RELICS_REQUIRED}`));
    }

    // challenge=1 makes the upcoming floor boss Challenge-eligible without the two real runs it
    // would otherwise take (collect the Core in run 1, meet them again in run 2). It seeds the
    // PERMANENT record in memory only — deliberately NOT saveMeta(), so testing can never write
    // into a real player's save, exactly like the in-run `cores` option above.
    // challenge=<heroKey> seeds that specific hero instead of the upcoming boss.
    if (opts.challenge !== undefined && opts.challenge !== '0' && opts.challenge !== 'false') {
      const floorBoss = G.map[G.currentFloor] && G.map[G.currentFloor].boss;
      const wanted = CHALLENGES[opts.challenge] ? opts.challenge : (floorBoss && floorBoss.charKey);
      if (!wanted) warn('challenge: no boss on this floor to make eligible');
      else if (wanted === hero) warn(`challenge: ${wanted} is the chosen hero — you can never Challenge yourself`);
      else {
        if (!META.coresCollected.includes(wanted)) META.coresCollected.push(wanted);
        // Earning it would make it ineligible (earned Challenges are never re-offered), so
        // clear any earned entry too — this option means "let me attempt it now".
        META.challengeRelicsEarned = META.challengeRelicsEarned.filter(k => k !== wanted);
        info(`challenge: ${wanted} Core seeded in META (memory only) — boss intro will offer it`);
      }
    }
    if (opts.relics) {
      String(opts.relics).split(',').map(s => s.trim()).filter(Boolean).forEach(k => {
        if (RELICS[k]) acquireRelic(k); else warn(`unknown relic "${k}"`);
      });
    }
    // consumables=<list> — consumables have no real acquisition path yet (no shop/event/reward
    // pool offers them), so this is the only way to get any of them. Mirrors relics= exactly,
    // plus a cap warning since consumables (unlike relics) are capped at 3 — grantConsumable()
    // itself enforces the cap. Key-driven, so it needs no edit as items are added: every key in
    // CONSUMABLES is grantable.
    if (opts.consumables) {
      String(opts.consumables).split(',').map(s => s.trim()).filter(Boolean).forEach(k => {
        // allowSwapPrompt:false — this is run setup, not gameplay, so a 4th key should warn and be
        // skipped rather than stopping to ask the tester which item to throw away.
        if (CONSUMABLES[k]) { if (!grantConsumable(k, { allowSwapPrompt: false })) warn(`consumables: inventory full, could not grant "${k}"`); }
        else warn(`unknown consumable "${k}"`);
      });
    }
    // curses=<list> — pushes Curse cards straight into G.deck. No real source exists yet (the three
    // curse-granting events are a later batch), so this is the only way to get one. Duplicates are
    // allowed and meaningful: Curse of Debt scales per copy, and each Curse of Binding surcharges
    // its own card key.
    //
    // resolveCurseOfBinding() is called once after the whole list is pushed rather than per key, so
    // a Binding cannot pick another Binding's own key mid-loop and every copy chooses from the final
    // deck. It is counter-driven, so this is safe even though every fight start also calls it.
    if (opts.curses) {
      String(opts.curses).split(',').map(s => s.trim()).filter(Boolean).forEach(k => {
        if (CARDS[k] && CARDS[k].type === 'Curse') G.deck.push(k);
        else warn(`unknown curse "${k}" (expected curse_weakness, curse_debt, curse_confusion or curse_binding)`);
      });
      resolveCurseOfBinding(G);
      info(`curses: deck now holds ${G.deck.filter(k => CARDS[k] && CARDS[k].type === 'Curse').length} curse card(s)`);
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
      info(`Aldric — floor ${floorNum}, Challenge relics ${challengeRelicCount()}/${TRUE_ENDING_RELICS_REQUIRED}` +
        (G.aldricHasRelics ? ' (Phase 3 + True Ending unlocked)' : ' (Phase 3 locked — pass crelics=4 for it)'));
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
    // Event-triggered combat plumbing, proof of concept. No real event starts a fight yet, so this
    // is the only way to reach startEventCombat(). Unlike the targets above it does NOT call
    // showCombatScreen() first — startEventCombat() shows the combat screen itself, because its real
    // callers will be event choices running with the event screen up.
    // **Delete alongside DUMMY_EVENT_ENEMY once a real event supplies its own enemy.**
    eventcombat(opts) {
      const { floorNum } = setup(opts);
      startDummyEventCombat();
      applyStatuses(opts);
      info(`Floor ${floorNum} event combat — ${G.enemy.name} (win returns to path select)`);
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
