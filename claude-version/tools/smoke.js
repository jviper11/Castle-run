// Browser smoke check — a required check alongside `npm test` (IMPLEMENTATION_PLAN, *Testing
// strategy*). The engine suite never imports the UI, so it cannot see a broken import, a missing
// render function, or a button pushed off a phone screen. This drives the real page instead.
//
//   node tools/smoke.js              all scenarios
//   node tools/smoke.js phone        only scenarios whose name contains "phone"
//   node tools/smoke.js --all-heroes one full four-floor run per hero instead (end of a phase)
//   node tools/smoke.js --shots DIR  also save a screenshot of every screen, the first time each
//                                    scenario reaches it (and of the map when it is open), into DIR
//
// It starts its own server, launches headless Chrome or Edge (CHROME_PATH overrides the search),
// and for each scenario walks a seeded run through the UI by clicking what a player would click.
// A scenario fails on any of:
//   - an uncaught page error, console error, or failed load of the game's own files
//   - a screen it was expected to reach and did not
//   - a visible, enabled button outside the viewport (at phone sizes, a Leave button you would
//     have to scroll to reach is a bug) or horizontal page overflow
//   - "undefined", "null", "NaN" or "[object …]" anywhere in a screen's text
// And once per run, before the scenarios: every emoji in src/ and index.html must render. A glyph
// newer than the system's emoji font draws as a missing-glyph box; this build shipped seven before
// the check existed, among them the d6, Vulnerable and Void Wraith icons (COMPARISON §H8). The
// result is specific to the machine and browser running it, which is the point: it checks what
// a player on that machine would see.
// No dependencies: Node 22+ has WebSocket built in, and Chrome speaks the DevTools protocol.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.js';

const APP = resolve(fileURLToPath(import.meta.url), '../..');

const PORT = 8187;
const DEBUG_PORT = 9337;
const BASE = `http://localhost:${PORT}/claude-version/`;

// ── Scenarios ──
// `expect` lists screens the walk must pass through, and `expectVariants` door-screen variants it
// must see (substrings of the recorded names, e.g. '+mirror'). `stopAt` ends the walk on a screen
// (after `afterTurns` End Turns, for combat). `path` is a selector for the path-select button.

const FULL_RUN = ['screen-paths', 'screen-combat', 'screen-reward', 'screen-doors', 'screen-bossIntro',
  'screen-floorClear', 'screen-soulForge', 'screen-end'];
// Every floor shows these: the unused Mirror at the halfway room, and the boss door. The walk never
// takes the Mirror, so it is on screen once per floor. The runs carry enough Gold that its button is
// enabled — disabled buttons are not layout-checked, so an unaffordable Mirror would go unverified.
const DOOR_VARIANTS = ['+mirror', '+boss'];

const SCENARIOS = [
  {
    name: 'desktop full run (Barbarian, path B)',
    url: '?hero=barbarian&hp=3000&gold=600&fast=max&seed=7', size: [1280, 720],
    path: '.path-card:nth-child(2) button',
    expect: [...FULL_RUN, 'screen-rest', 'screen-shop', 'screen-dieCache'],
    expectVariants: [...DOOR_VARIANTS, '+magic', '+hidden'],
  },
  {
    name: 'phone 844x390 Floors 3–4 (Vampire, touch)',
    url: '?hero=vampire&hp=3000&gold=3000&souls=20&fast=max&floor=3&seed=12', size: [844, 390], touch: true,
    expect: FULL_RUN,
    expectVariants: [...DOOR_VARIANTS, '+magic', '+hidden'],
  },
  {
    name: 'phone 667x375 Floors 3–4 (Gambler, touch, path B, map)',
    url: '?hero=gambler&hp=3000&gold=3000&souls=20&fast=max&floor=3&seed=7', size: [667, 375], touch: true,
    path: '.path-card:nth-child(2) button', openMap: true,
    expect: [...FULL_RUN, 'screen-shop'],
    expectVariants: [...DOOR_VARIANTS, '+magic', '+hidden'],
  },
  {
    name: 'phone 844x390 Floor 4 intent list (Throne Guard)',
    url: '?hero=barbarian&hp=600&fast=1&floor=4&seed=2', size: [844, 390], touch: true,
    stopAt: 'screen-combat', expectText: ['Throne Room', '+2'],
  },
  {
    name: 'desktop phased turn (Mage vs Shadow Wraith+)',
    url: '?hero=mage&hp=600&fast=1&floor=3&seed=3', size: [1280, 720],
    stopAt: 'screen-combat', afterTurns: 1, expectText: ['\u{1F47B}'],
  },
  {
    // Starts on Floor 2 so the map is opened with two floors locked, then one, then none.
    name: 'desktop map overlay opens on every run screen',
    url: '?hero=thief&hp=3000&gold=3000&souls=20&fast=max&floor=2&seed=5', size: [1280, 720],
    openMap: true, expect: FULL_RUN,
  },
];

// `--all-heroes`: one complete four-floor run per hero, at the end of a phase (PHASE3_PLAN 3f).
// Not in the required set, which already walks every hero through at least two floors; this adds
// Floor 1 to the end for all five, across all three sizes.
const SIZES = [[1280, 720, false], [844, 390, true], [667, 375, true]];
const ALL_HEROES = ['barbarian', 'mage', 'thief', 'vampire', 'gambler'].map((hero, i) => {
  const [w, h, touch] = SIZES[i % SIZES.length];
  return {
    name: `full run: ${hero} at ${w}x${h}${touch ? ', touch' : ''}`,
    url: `?hero=${hero}&hp=3000&gold=3000&fast=max&seed=${21 + i}`, size: [w, h], touch,
    expect: FULL_RUN, expectVariants: [...DOOR_VARIANTS, '+magic'],
  };
});

// ── The walk, run inside the page ──
// One evaluate call per scenario: the loop runs in the page, so there is no DevTools round trip
// per click. It clicks what a player would, records every screen it sees, and checks layout the
// first time each screen appears.

const WALK = (opts) => `(${async function walk(o) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const seen = [];
  const layout = [];
  const mapIssues = [];
  const checked = new Set();
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1;
  };
  const visible = (el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
  const click = (root, sel) => {
    const el = root.querySelector(sel);
    if (el) el.click();
    return !!el;
  };
  let turns = 0;
  const started = Date.now();
  // With --shots, Node exposes window.__shot. The page asks and then waits briefly, so the
  // capture sees the screen settled rather than mid-transition.
  const shot = async (name) => {
    if (typeof window.__shot !== 'function') return;
    window.__shot(name);
    await sleep(450);
  };

  for (let step = 0; step < o.maxSteps && Date.now() - started < o.maxMs; step++) {
    const active = document.querySelector('.screen.active');
    if (!active) {
      // A page that never shows a screen has failed to boot — usually a broken import. Say so in
      // seconds rather than waiting out the whole step budget.
      if (Date.now() - started > o.bootMs) return { seen, layout, mapIssues, reached: null, steps: step, noBoot: true };
      await sleep(o.stepMs);
      continue;
    }
    const id = active.id;
    if (!seen.includes(id)) seen.push(id);

    // Layout, once per screen — and once per *variant* of the door screen, whose Magic Door, hidden
    // door hint and Mirror panel each add height that can push a button off a phone screen.
    const mirror = document.getElementById('mirror-panel');
    const variant = id !== 'screen-doors' ? id : id +
      (active.querySelector('.door-magic') ? '+magic' : '') +
      (active.querySelector('.door-hint') ? '+hidden' : '') +
      (mirror && !mirror.hidden ? '+mirror' : '') +
      (active.querySelector('.door-boss') ? '+boss' : '');
    if (!seen.includes(variant)) seen.push(variant);
    if (!checked.has(variant) && id !== 'screen-title') {
      checked.add(variant);
      await sleep(120);
      await shot(variant);
      // A hole in the text: a value that never arrived, printed as-is.
      const hole = active.innerText.match(/\b(?:undefined|null|NaN)\b|\[object \w+\]/);
      if (hole) layout.push(`${variant}: the screen shows "${hole[0]}" — a value that never arrived`);
      if (document.documentElement.scrollWidth > innerWidth + 1) {
        layout.push(`${variant}: page is ${document.documentElement.scrollWidth}px wide in a ${innerWidth}px viewport`);
      }
      for (const b of active.querySelectorAll('button')) {
        if (!visible(b) || b.disabled || b.closest('[hidden]')) continue;
        if (!inView(b)) {
          const r = b.getBoundingClientRect();
          layout.push(`${variant}: "${b.textContent.trim().slice(0, 40)}" is off-screen (bottom ${Math.round(r.bottom)} of ${innerHeight}, right ${Math.round(r.right)} of ${innerWidth})`);
        }
      }
      // The map overlay: opens from this screen, shows the floor, and closes again.
      if (o.openMap) {
        const btn = active.querySelector('[data-action="open-map"]');
        if (btn) {
          btn.click();
          await sleep(120);
          const overlay = document.getElementById('map-overlay');
          if (!overlay || overlay.hidden) mapIssues.push(`${id}: the map did not open`);
          else if (!overlay.querySelector('.map-path')) mapIssues.push(`${id}: the map opened empty`);
          else if (!inView(overlay.querySelector('[data-action="close-map"]'))) mapIssues.push(`${id}: the map's close button is off-screen`);
          // Floors not yet reached are locked: no rooms at all. Floors before the current one are
          // never locked, and the current floor shows all three of its paths.
          const floors = [...overlay.querySelectorAll('.map-floor')];
          const at = floors.findIndex((f) => f.classList.contains('current'));
          if (at < 0) mapIssues.push(`${id}: the map marks no current floor`);
          floors.forEach((f, i) => {
            const future = f.classList.contains('future');
            if (i > at && !future) mapIssues.push(`${id}: floor ${i + 1} is not reached yet but is not locked`);
            if (i <= at && future) mapIssues.push(`${id}: floor ${i + 1} has been reached but is shown locked`);
            if (future && f.querySelector('.room-dot, .map-path')) mapIssues.push(`${id}: floor ${i + 1} is locked but shows its rooms`);
          });
          if (at >= 0 && floors[at].querySelectorAll('.map-path').length !== 3) mapIssues.push(`${id}: the current floor does not show its three paths`);
          await shot(`${id}-map`);
          document.querySelector('[data-action="close-map"]')?.click();
          await sleep(60);
          if (overlay && !overlay.hidden) mapIssues.push(`${id}: the map did not close`);
        } else if (['screen-doors', 'screen-rest', 'screen-shop', 'screen-paths'].includes(id)) {
          mapIssues.push(`${id}: no map button`);
        }
      }
    }

    if (id === o.stopAt && turns >= (o.afterTurns || 0)) return { seen, layout, mapIssues, reached: id, steps: step };
    if (id === 'screen-end' && !o.stopAt) return { seen, layout, mapIssues, reached: id, steps: step };

    // Overlays first: they sit above whatever screen is showing.
    const choice = document.getElementById('choice-overlay');
    if (!choice.hidden) {
      // Confirm as soon as it is allowed; otherwise pick another option. (Picking first would
      // spin forever on a one-card choice that is already made.)
      const confirm = document.getElementById('choice-confirm');
      const next = document.querySelector('#choice-grid > *:not(.picked)');
      if (!confirm.hidden && !confirm.disabled) confirm.click(); else if (next) next.click();
      await sleep(o.stepMs);
      continue;
    }
    const deck = document.getElementById('deck-overlay');
    if (!deck.hidden) {
      if (!click(document, '#deck-grid .card')) click(document, '[data-action="close-deck"]');
      await sleep(o.stepMs);
      continue;
    }

    if (id === 'screen-combat') {
      if (o.stopAt === id && turns < (o.afterTurns || 0)) {
        const end = active.querySelector('#end-turn-btn:not(:disabled)');
        if (end) { turns += 1; end.click(); }
      } else {
        // Touch: the first tap selects and previews, the second plays. Tapping the selected card
        // again is exactly what a player does.
        const card = active.querySelector('#hand .card.selected') || active.querySelector('#hand .card:not(.unaffordable)');
        if (card) card.click(); else click(active, '#end-turn-btn:not(:disabled)');
      }
    } else if (id === 'screen-reward') {
      click(active, '#skip-btn');
    } else if (id === 'screen-doors') {
      if (!click(active, '.door-magic')) click(active, '.door-row button:not(:disabled)');
    } else if (id === 'screen-paths') {
      click(active, o.path || '.path-card button');
    } else if (id === 'screen-dieCache') {
      if (!click(active, '.die-offer')) click(active, 'button:not(:disabled)');
    } else {
      // Any other run screen: its first enabled button is always a way forward.
      click(active, 'button:not(:disabled):not([data-action="open-map"])');
    }
    await sleep(o.stepMs);
  }
  return { seen, layout, mapIssues, reached: null, steps: o.maxSteps, timedOut: true };
}})(${JSON.stringify(opts)})`;

// ── Glyphs ──

/** Every emoji in the UI's source, with where it first appears. */
function scanGlyphs() {
  const found = new Map();
  const files = [join(APP, 'index.html')];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name));
      else if (e.name.endsWith('.js')) files.push(join(dir, e.name));
    }
  };
  walk(join(APP, 'src'));
  for (const file of files) {
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return; // a glyph named in a comment is not on screen
      for (const m of line.matchAll(/\p{Extended_Pictographic}\u{FE0F}?/gu)) {
        if (!found.has(m[0])) found.set(m[0], `${relative(APP, file).split('\\').join('/')}:${i + 1}`);
      }
    });
  }
  return found;
}

// In the page: draw each glyph and compare it with a codepoint no font has. Identical pixels mean
// the browser fell back to its missing-glyph box.
const GLYPH_PROBE = function (glyphs) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 40;
  const g = canvas.getContext('2d');
  const font = `32px ${getComputedStyle(document.body).fontFamily}`;
  const draw = (text) => {
    g.clearRect(0, 0, 40, 40);
    g.font = font;
    g.fillText(text, 2, 32);
    return g.getImageData(0, 0, 40, 40).data.join(',');
  };
  const missing = draw(String.fromCodePoint(0x10fffd));
  return glyphs.filter((x) => draw(x) === missing);
};

async function glyphCheck(browser) {
  const glyphs = scanGlyphs();
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
  await browser.send('Page.navigate', { url: BASE });
  await sleep(700);
  const missing = await evaluate(browser, `(${GLYPH_PROBE})(${JSON.stringify([...glyphs.keys()])})`);
  return { count: glyphs.size, failures: missing.map((x) => `${x} (${glyphs.get(x)}) draws as a missing-glyph box`) };
}

// ── Chrome over the DevTools protocol ──

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => p && existsSync(p));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openBrowser(executable) {
  const profile = mkdtempSync(join(tmpdir(), 'castle-smoke-'));
  const proc = spawn(executable, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });
  let page;
  for (let i = 0; i < 80 && !page; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      page = list.find((t) => t.type === 'page');
    } catch { /* not up yet */ }
    if (!page) await sleep(250);
  }
  if (!page) throw new Error('the browser did not start');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let id = 0;
  const waiting = new Map();
  const listeners = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
    if (msg.method) for (const fn of listeners) fn(msg);
  };
  const send = (method, params = {}) => {
    const n = ++id;
    ws.send(JSON.stringify({ id: n, method, params }));
    return new Promise((ok) => waiting.set(n, ok));
  };
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  return {
    send,
    on: (fn) => listeners.push(fn),
    off: (fn) => listeners.splice(listeners.indexOf(fn), 1),
    close() {
      ws.close();
      proc.kill();
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold it */ }
    },
  };
}

async function evaluate(browser, expression) {
  const res = await browser.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  const ex = res.result?.exceptionDetails;
  if (ex) throw new Error(ex.exception?.description || ex.text);
  return res.result.result.value;
}

async function runScenario(browser, s, shotsDir) {
  const errors = [];
  const listen = (msg) => {
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(`exception: ${d.exception?.description?.split('\n')[0] || d.text}`);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      // Our own files only: a 404 on ../assets or a module is a real break; a favicon is not.
      const url = msg.params.entry.url || '';
      if (url.includes('/claude-version/') || url.includes('/assets/')) errors.push(`load: ${msg.params.entry.text} ${url}`);
    }
  };
  browser.on(listen);

  let shotChain = Promise.resolve();
  const onShot = (msg) => {
    if (msg.method !== 'Runtime.bindingCalled' || msg.params.name !== '__shot' || !shotsDir) return;
    const file = join(shotsDir, `${s.name.replace(/[^\w]+/g, '-')}--${msg.params.payload}.png`);
    shotChain = shotChain.then(async () => {
      const img = await browser.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(file, Buffer.from(img.result.data, 'base64'));
    });
  };
  if (shotsDir) browser.on(onShot);

  const [w, h] = s.size;
  await browser.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!s.touch });
  await browser.send('Emulation.setTouchEmulationEnabled', { enabled: !!s.touch, maxTouchPoints: s.touch ? 5 : 0 });
  await browser.send('Emulation.setEmitTouchEventsForMouse', { enabled: !!s.touch, configuration: 'mobile' });
  if (shotsDir) await browser.send('Runtime.addBinding', { name: '__shot' });
  await browser.send('Page.navigate', { url: BASE + s.url });
  await sleep(900);

  const touchSeen = await evaluate(browser, `matchMedia('(hover: none), (pointer: coarse)').matches`);
  const result = await evaluate(browser, WALK({
    stopAt: s.stopAt || null, afterTurns: s.afterTurns || 0, path: s.path || null, openMap: !!s.openMap,
    maxSteps: 40000, maxMs: 180000, stepMs: 6, bootMs: 8000,
  }));
  if (s.expectText) {
    const text = await evaluate(browser, `document.querySelector('.screen.active')?.innerText || ''`);
    for (const t of s.expectText) if (!text.includes(t)) result.layout.push(`expected to see "${t}" on ${result.reached}`);
  }
  if (shotsDir) {
    await shotChain;
    const img = await browser.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(shotsDir, `${s.name.replace(/[^\w]+/g, '-')}--final.png`), Buffer.from(img.result.data, 'base64'));
    browser.off(onShot);
  }
  browser.off(listen);

  const failures = [...errors, ...result.layout, ...result.mapIssues];
  if (result.noBoot) failures.unshift('the page never showed a screen: it failed to boot');
  if (s.touch && !touchSeen) failures.push('touch emulation did not register: the tap-to-preview path went untested');
  for (const screen of s.expect || []) if (!result.seen.includes(screen)) failures.push(`never reached ${screen}`);
  for (const v of s.expectVariants || []) {
    if (!result.seen.some((x) => x.includes(v))) failures.push(`never saw the door screen with ${v.slice(1)}`);
  }
  if (s.stopAt && result.reached !== s.stopAt) failures.push(`did not stop on ${s.stopAt}`);
  if (!s.stopAt && (!s.openMap || s.expect?.includes('screen-end')) && result.reached !== 'screen-end') {
    failures.push(result.timedOut ? 'the run did not finish within the step budget' : 'the run did not reach the end screen');
  }
  return { failures, result };
}

// ── Main ──

const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shotsDir = shotsAt >= 0 ? args[shotsAt + 1] : null;
// The first plain argument that is not --shots' own value.
const filter = args.find((a, i) => !a.startsWith('--') && !(shotsAt >= 0 && i === shotsAt + 1));
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

const executable = findChrome();
if (!executable) {
  console.error('smoke: no Chrome or Edge found. Install one, or set CHROME_PATH. This check is required; it is not skipped.');
  process.exit(2);
}

const server = await startServer(PORT);
const browser = await openBrowser(executable);
// Interrupted (Ctrl+C, a killed CI job): never leave a headless browser holding the debug port.
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { browser.close(); server.close(); process.exit(130); });
const pool = args.includes('--all-heroes') ? ALL_HEROES : SCENARIOS;
const chosen = pool.filter((s) => !filter || s.name.includes(filter));
let failed = 0;
let total = chosen.length;
try {
  if (!filter || filter === 'glyphs') { // `node tools/smoke.js glyphs` runs this check alone
    total += 1;
    const t0 = Date.now();
    const glyphs = await glyphCheck(browser);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (glyphs.failures.length) {
      failed += 1;
      console.log(`✖ every glyph in the UI renders (${secs}s, ${glyphs.count} glyphs)`);
      for (const f of glyphs.failures) console.log(`    ${f}`);
    } else {
      console.log(`✔ every glyph in the UI renders (${secs}s, ${glyphs.count} glyphs)`);
    }
  }
  for (const s of chosen) {
    const t0 = Date.now();
    const { failures, result } = await runScenario(browser, s, shotsDir);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (failures.length) {
      failed += 1;
      console.log(`\u2716 ${s.name} (${secs}s, ${result.steps} steps)`);
      for (const f of failures) console.log(`    ${f}`);
      console.log(`    screens seen: ${result.seen.join(', ')}`);
    } else {
      console.log(`\u2714 ${s.name} (${secs}s, ${result.steps} steps, ${result.seen.length} screens)`);
      if (process.env.SMOKE_VERBOSE) console.log(`    ${result.seen.join(', ')}`);
    }
  }
} finally {
  browser.close();
  server.close();
}
console.log(`\nsmoke: ${total - failed}/${total} checks passed${shotsDir ? `; screenshots in ${shotsDir}` : ''}`);
process.exit(failed ? 1 : 0);
