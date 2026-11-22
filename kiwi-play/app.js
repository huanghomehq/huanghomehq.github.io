/* Kiwi Play — app shell: boot, home, game bar, pause, done/rest screens, grown-ups area, log, offline. */
(function () {
  'use strict';
  const APP_VERSION = '1.14.0';
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = (k, d) => { try { const v = localStorage.getItem('jla.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  let lsOK = true;
  const save = (k, v) => { try { localStorage.setItem('jla.' + k, JSON.stringify(v)); } catch (e) { lsOK = false; } backupPut(k, v); };
  // Backup copy of settings and progress in IndexedDB (some browsers clear one kind of storage but not the other)
  const BACKUP_KEYS = ['settings', 'prog', 'usage', 'log', 'resume'];
  function backupDB() { return new Promise((res, rej) => { if (!window.indexedDB) { rej(new Error('none')); return; } const r = indexedDB.open('kiwi-play-backup', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  let backupConn = null, backupQ = Promise.resolve();
  function backupPut(k, v) {
    if (BACKUP_KEYS.indexOf(k) < 0) return;
    const val = JSON.stringify(v);
    backupQ = backupQ.then(() => (backupConn || (backupConn = backupDB())).then((db) => new Promise((res) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, k); tx.oncomplete = res; tx.onerror = res; tx.onabort = res; }))).catch(() => {});
  }
  function backupGetAll() { return backupDB().then((db) => new Promise((res) => { const out = {}; const tx = db.transaction('kv', 'readonly'), st = tx.objectStore('kv'); BACKUP_KEYS.forEach((k) => { const q = st.get(k); q.onsuccess = () => { if (q.result) { try { out[k] = JSON.parse(q.result); } catch (e) { /* skip */ } } }; }); tx.oncomplete = () => res(out); tx.onerror = () => res(out); })).catch(() => ({})); }
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Used when lessons.json can't be loaded (first run with no connection, or opened from a file).
  const FALLBACK_LESSONS = {
    version: 'built-in', focus: ['Name writing: J-a-y-d-e-n', 'Counting real things', 'Rhymes', 'Naming feelings'],
    traceLetters: ['U', 'H'], traceNumbers: ['8', '9'], spyLetters: ['U', 'H'], spyNumbers: ['8', '9'], countThings: ['apple', 'acorn', 'leaf'], colorPictures: ['pumpkin', 'apple'],
    rhymes: [{ word: 'cat', answer: 'hat', others: ['sun', 'cup'] }, { word: 'car', answer: 'star', others: ['ball', 'tree'] }],
    feelings: [{ who: 'Sam', scene: 'icecream', text: 'Oh no! Sam’s ice cream fell down.', answer: 'sad', help: 'A hug could help.' }]
  };

  const DEF_SETTINGS = { perSet: 3, dailyMin: 15, countMax: 10, sound: true, extra: { date: '', mins: 0 } };
  let settings = Object.assign({}, DEF_SETTINGS, load('settings', {}));
  let lessons = load('lessons', null) || FALLBACK_LESSONS;
  let usage = load('usage', { date: today(), secs: 0 });
  let prog = load('prog', {});
  let screen = 'boot';
  let restoredFromBackup = false;
  backupGetAll().then((b) => {
    let mainHas = false; try { mainHas = !!localStorage.getItem('jla.settings'); } catch (e) { mainHas = false; }
    if (!mainHas && b.settings) {
      settings = Object.assign({}, DEF_SETTINGS, b.settings); if (b.prog) prog = b.prog; if (b.usage) usage = b.usage;
      ['settings', 'prog', 'usage', 'log', 'resume'].forEach((k) => { if (b[k] !== undefined) { try { localStorage.setItem('jla.' + k, JSON.stringify(b[k])); } catch (e) { /* blocked */ } } });
      restoredFromBackup = true;
      if (screen === 'boot') boot(); else if (screen === 'home') home();
    }
  });
  // A touch this wide is a palm or the side of a hand, not a fingertip.
  window.isPalm = (e) => e.pointerType === 'touch' && Math.max(e.width || 0, e.height || 0) > 60;
  const isPalm = window.isPalm;
  const kidName = () => String(settings.childName || '').trim();
  const hiName = () => kidName() ? 'Hi, ' + esc(kidName()) + '!' : 'Hi!';
  const initial = () => kidName() ? esc(kidName().charAt(0).toUpperCase()) : '\u2605';
  const stage = document.getElementById('stage');

  /* ---------- screen fit: everything is laid out at 1280 x 800 and scaled ---------- */
  // Fit the 1280x800 layout to the screen. Toolbars and the tablet's navigation bar pop in and out,
  // which briefly shrinks the window's height; re-fitting on every one of those makes the whole app jump.
  // So: the scale only changes when the width changes (rotation, split screen) or the height grows.
  // A brief height drop just lets the bar cover the bottom edge for a moment.
  let fitW = 0, fitH = 0, fitT = null;
  function fit(force) {
    const w = window.innerWidth, h = window.innerHeight;
    if (!force && w === fitW && h <= fitH) return;
    if (w !== fitW) fitH = h; else fitH = Math.max(fitH, h);
    fitW = w;
    const s = Math.min(w / 1280, fitH / 800);
    stage.style.transform = 'scale(' + s + ')';
    stage.style.left = Math.max(0, (w - 1280 * s) / 2) + 'px';
    stage.style.top = Math.max(0, (fitH - 800 * s) / 2) + 'px';
  }
  window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => fit(false), 150); });
  window.addEventListener('orientationchange', () => { fitW = 0; setTimeout(() => fit(true), 300); });
  fit(true);
  // Ask for full screen (hides the toolbars) on taps, until the browser grants it
  function goFull() { try { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen && !window.matchMedia('(display-mode: fullscreen)').matches) d.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) { /* not allowed here */ } }
  document.addEventListener('pointerup', goFull, { passive: true });

  /* ---------- voice ---------- */
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /en[-_]US/i.test(v.lang) && /female|samantha|google us/i.test(v.name)) || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(t) {
    if (!settings.sound || !('speechSynthesis' in window) || !t) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/—/g, ',')); u.rate = 0.88; u.pitch = 1.05; if (voice) u.voice = voice; speechSynthesis.speak(u); } catch (e) { /* no voice on this device */ }
  }

  /* ---------- time limit ---------- */
  function limitSecs() { return (settings.dailyMin + (settings.extra && settings.extra.date === today() ? settings.extra.mins : 0)) * 60; }
  function rollDay() { if (usage.date !== today()) { usage = { date: today(), secs: 0 }; save('usage', usage); } }
  function overLimit() { rollDay(); return usage.secs >= limitSecs(); }
  setInterval(() => {
    if (document.visibilityState !== 'visible' || !(screen === 'game' || screen === 'home' || screen === 'story' || screen === 'shelf' || screen === 'listen' || screen === 'art' || screen === 'draw')) return;
    rollDay(); usage.secs++; if (usage.secs % 5 === 0) save('usage', usage);
  }, 1000);
  document.addEventListener('visibilitychange', () => { save('usage', usage); if (document.visibilityState !== 'visible' && 'speechSynthesis' in window) speechSynthesis.cancel(); });

  /* ---------- log ---------- */
  function log(entry) { const L = load('log', []); L.push(entry); while (L.length > 3000) L.shift(); save('log', L); }

  /* ---------- lessons (lesson pack) ---------- */
  function fetchLessons(force) {
    return fetch('lessons.json', { cache: force ? 'no-store' : 'default' }).then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then((j) => { const changed = j.version !== lessons.version; lessons = j; save('lessons', j); return changed; });
  }

  /* ---------- screens ---------- */
  function show(name, el) { screen = name; stage.innerHTML = ''; stage.appendChild(el); if ('speechSynthesis' in window) speechSynthesis.cancel(); }

  function boot() {
    const el = $('<div class="screen boot"><div class="avatar big">' + initial() + '</div><h1>' + hiName() + '</h1><button class="kid-btn go huge" id="start" aria-label="Play">' + ART.icon.play + '</button></div>');
    show('boot', el);
    el.querySelector('#start').addEventListener('click', () => {
      try { if (document.documentElement.requestFullscreen && !document.fullscreenElement && !window.matchMedia('(display-mode: fullscreen)').matches) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* not allowed */ }
      if (overLimit()) rest(); else { home(); speak('Hi ' + kidName() + '! Pick a picture, or tap the star.'); }
    });
  }

  function areaArt(a) {
    if (a.id === 'letters') return '<div class="tile-art" style="background:' + a.tint + '"><span class="aa">Aa</span></div>';
    if (a.id === 'numbers') return '<div class="tile-art dots" style="background:' + a.tint + '"><i></i><i></i><i></i><i></i><i></i><i class="e"></i></div>';
    if (a.id === 'words') return '<div class="tile-art" style="background:' + a.tint + '">' + ART.pic('cat') + '</div>';
    if (a.id === 'puzzles') return '<div class="tile-art" style="background:' + a.tint + '"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="42" cy="42" r="25" fill="#FFFFFF" stroke="#2F6F6A" stroke-width="9"/><path d="M61 61 L86 86" stroke="#2F6F6A" stroke-width="12" stroke-linecap="round"/><path d="M34 46 C30 40 32 30 42 30 C52 30 54 40 50 46 L42 54 Z" fill="#C9473A"/></svg></div>';
    if (a.id === 'stories') return '<div class="tile-art" style="background:' + a.tint + '">' + ART.pic('book') + '</div>';
    if (a.id === 'make') return '<div class="tile-art" style="background:' + a.tint + '">' + DI.crayon + '</div>';
    return '<div class="tile-art" style="background:' + a.tint + '">' + ART.face('happy') + '</div>';
  }

  function home() {
    if (overLimit()) { rest(); return; }
    const resume = load('resume', null);
    const el = $('<div class="screen home">' +
      '<div class="home-top"><div class="hello"><div class="avatar">' + initial() + '</div><h1>' + hiName() + '</h1></div>' + grownLockHtml() + '</div>' +
      '<div class="home-row">' + (resume ? '<button class="kid-btn go" id="keep" aria-label="Keep going">' + ART.icon.play + '</button>' : '') + '<button class="kid-btn sun" id="today" aria-label="Today’s games">' + ART.icon.star + '</button></div>' +
      '<div class="tiles"></div></div>');
    const tiles = el.querySelector('.tiles');
    AREAS.forEach((a) => {
      const b = $('<button class="tile">' + areaArt(a) + '<span class="tile-name">' + a.name + '</span></button>');
      b.addEventListener('click', () => (a.id === 'stories' ? shelf() : a.id === 'make' ? artMenu() : areaMenu(a.id)));
      tiles.appendChild(b);
    });
    el.querySelector('#today').addEventListener('click', () => startSet('today'));
    if (resume) el.querySelector('#keep').addEventListener('click', () => runSet(resume));
    wireLock(el);
    show('home', el);
  }

  // Sets no longer stop after a few games: the list grows as he plays, until he goes back or the daily limit is reached.
  function moreGames(areaId, only, k) {
    if (only) return Array(k).fill(only);
    if (areaId === 'today') {
      const order = shuffle(AREAS.filter((a) => a.games.length)); const out = [];
      for (let i = 0; out.length < k; i++) { const a = order[i % order.length]; out.push(a.games[Math.floor(Math.random() * a.games.length)]); }
      return out;
    }
    const a = AREAS.find((x) => x.id === areaId) || AREAS[0];
    const out = []; let pool = [];
    while (out.length < k) { if (!pool.length) pool = shuffle(a.games); out.push(pool.pop()); }
    return out;
  }
  function startSet(areaId, only) { runSet({ area: areaId, only: only || null, list: moreGames(areaId, only, 3), i: 0, results: [] }); }

  // Where the house button on a game goes: up one level.
  function upFrom(set) {
    if (set.area === 'make') return artMenu();
    if (set.area && set.area !== 'today' && AREAS.some((a) => a.id === set.area)) return areaMenu(set.area);
    return home();
  }

  // Picture cards for each game, so he can choose instead of getting a random one.
  const GI = (() => {
    const T = (txt, size, extra) => '<text x="50" y="' + (size > 50 ? 72 : 64) + '" text-anchor="middle" font-family="Andika, sans-serif" font-weight="700" font-size="' + size + '" ' + (extra || 'fill="#2F6F6A"') + '>' + txt + '</text>';
    const dotted = (txt) => T(txt, 72, 'fill="none" stroke="#2F6F6A" stroke-width="3" stroke-dasharray="5 5"') + '<circle cx="30" cy="22" r="7" fill="#F2C46B"/>';
    const glass = (inner) => '<circle cx="44" cy="44" r="28" fill="#fff" stroke="#2B3B39" stroke-width="5"/>' + inner + '<path d="M64 64 L84 84" stroke="#2B3B39" stroke-width="9" stroke-linecap="round"/>';
    const s = (body) => '<svg viewBox="0 0 100 100" aria-hidden="true">' + body + '</svg>';
    return {
      trace: s(dotted('A')), abc: s(T('ABC', 40)), traceNum: s(dotted('8')), nums: s(T('123', 40)),
      spy: s(glass('<text x="44" y="57" text-anchor="middle" font-family="Andika, sans-serif" font-weight="700" font-size="36" fill="#2F6F6A">A</text>')),
      spyNum: s(glass('<text x="44" y="57" text-anchor="middle" font-family="Andika, sans-serif" font-weight="700" font-size="36" fill="#2F6F6A">8</text>')),
      count: s([[28, 34], [50, 34], [72, 34], [28, 62], [50, 62], [72, 62]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="9" fill="#E08A3C" stroke="#2B3B39" stroke-width="3"/>').join('')),
      color: s('<path d="M20 80 L70 30 L80 40 L30 90 Z" fill="#C9473A" stroke="#2B3B39" stroke-width="4" stroke-linejoin="round"/><path d="M70 30 L78 16 L88 26 L80 40 Z" fill="#F2D27E" stroke="#2B3B39" stroke-width="4" stroke-linejoin="round"/><text x="34" y="44" font-family="Andika, sans-serif" font-weight="700" font-size="30" fill="#2F6F6A">1</text>'),
      hidden: s('<rect x="10" y="14" width="80" height="62" rx="8" fill="#DCEBE8" stroke="#2B3B39" stroke-width="4"/><path d="M10 60 C35 50 60 66 90 56 V76 H10 Z" fill="#A9C77A" stroke="#2B3B39" stroke-width="3"/>' + glass('').replace(/44/g, '58').replace('r="28"', 'r="20"').replace('fill="#fff"', 'fill="#fff" fill-opacity="0.7"').replace('M64 64 L84 84', 'M72 72 L88 88')),
      diff: s('<rect x="6" y="26" width="40" height="48" rx="6" fill="#DCEBE8" stroke="#2B3B39" stroke-width="4"/><rect x="54" y="26" width="40" height="48" rx="6" fill="#DCEBE8" stroke="#2B3B39" stroke-width="4"/><circle cx="26" cy="50" r="9" fill="#C9473A"/><circle cx="74" cy="50" r="9" fill="#4A6FA5"/>')
    };
  })();

  function areaMenu(areaId) {
    if (overLimit()) { rest(); return; }
    const area = AREAS.find((a) => a.id === areaId); if (!area) { home(); return; }
    const el = $('<div class="screen art-menu area-menu"><div class="bar"><button class="round-btn" id="home" aria-label="Home">' + ART.icon.home + '</button><div></div><div style="width:88px"></div></div>' +
      '<div class="art-choices" style="grid-template-columns:repeat(' + area.games.length + ', minmax(0, 1fr))"></div></div>');
    const box = el.querySelector('.art-choices');
    area.games.forEach((g) => {
      const b = $('<button class="art-choice" style="background:#fff" aria-label="' + esc(GAMES[g].title) + '"><div class="ac-art" style="background:' + area.tint + '">' + (GI[g] || '') + '</div></button>');
      b.addEventListener('click', () => startSet(areaId, g)); box.appendChild(b);
    });
    el.querySelector('#home').addEventListener('click', home);
    show('area', el);
    speak('Pick a game.');
  }

  function runSet(set) {
    save('resume', set);
    const id = set.list[set.i];
    const game = GAMES[id];
    const el = $('<div class="screen game">' +
      '<div class="bar"><button class="round-btn" id="pause" aria-label="Back">' + ART.icon.home + '</button>' +
      '<div class="dots">' + set.results.slice(-8).map(() => '<i class="done"></i>').join('') + '<i class="now"></i></div>' +
      '<div class="bar-r"><button class="round-btn yellow" id="again" aria-label="Hear it again">' + ART.icon.speaker + '</button><button class="round-btn next faded" id="next" aria-label="Next">' + ART.icon.next + '</button></div></div>' +
      '<div class="game-root"></div><div class="msgline" aria-live="polite"></div></div>');
    show('game', el);
    const root = el.querySelector('.game-root'), line = el.querySelector('.msgline'), next = el.querySelector('#next');
    let lastSay = '', won = false, tries = 0, detail = null; const t0 = Date.now();
    const myProg = prog[id] || (prog[id] = {});
    const ctx = {
      root, lessons: Object.assign({}, lessons, { name: kidName(), nameLetters: kidName().split('').filter((c) => /[A-Za-z]/.test(c)) }), settings, prog: myProg,
      saveProg: () => save('prog', prog),
      saveArt: (svgEl) => saveSvgToGallery(svgEl),
      speak,
      say: (t) => { lastSay = t; line.textContent = t; speak(t); },
      msg: (t) => { line.textContent = t; speak(t); },
      miss: () => { tries++; },
      win: (d) => {
        if (won) return; won = true; detail = d || null;
        next.classList.remove('faded'); next.classList.add('ready');
        const t = ctx.winText || 'You did it!'; line.textContent = t; speak(t + ' Tap the arrow.');
      }
    };
    try { game.render(ctx); } catch (e) { line.textContent = 'Oops, this game had a problem. Tap the arrow.'; console.error(e); }
    el.querySelector('#again').addEventListener('click', () => speak(lastSay));
    el.querySelector('#pause').addEventListener('click', () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); upFrom(set); });
    next.addEventListener('click', () => {
      const secs = Math.round((Date.now() - t0) / 1000);
      log({ t: Date.now(), g: id, title: game.title, r: won ? 'done' : 'skipped', tries, secs, d: detail ? Object.values(detail).join(' ') : '' });
      set.results.push({ g: id, ok: won }); if (set.results.length > 20) set.results = set.results.slice(-20);
      set.i++;
      if (set.i >= set.list.length) { set.list = set.list.slice(-3).concat(moreGames(set.area, set.only, 3)); set.i = set.list.length - 3; }
      if (overLimit()) { save('resume', null); rest(); }
      else runSet(set);
    });
  }

  function pauseCard(gameEl) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const ov = $('<div class="overlay"><div class="pause-card"><div class="pause-sign">' + ART.icon.pause + '</div><div class="kid-row"><button class="kid-btn go big" id="keep" aria-label="Keep playing">' + ART.icon.play + '</button><button class="kid-btn plain big" id="home" aria-label="Go home">' + ART.icon.home + '</button></div></div></div>');
    gameEl.appendChild(ov);
    ov.querySelector('#keep').addEventListener('click', () => ov.remove());
    ov.querySelector('#home').addEventListener('click', () => home());
    speak('Green button to keep playing. House to go home.');
  }

  function done(set) {
    const wins = set.results.filter((r) => r.ok);
    const canMore = !overLimit();
    const el = $('<div class="screen done"><div class="done-icon">' + ART.icon.check + '</div><h1>All done for now' + (kidName() ? ', ' + esc(kidName()) : '') + '!</h1>' +
      '<div class="done-list">' + set.results.map((r) => { const a = AREAS.find((x) => x.id === GAMES[r.g].area); return '<div class="done-item' + (r.ok ? '' : ' skip') + '">' + areaArt(a) + (r.ok ? '<span class="done-check">' + ART.icon.check + '</span>' : '') + '</div>'; }).join('') + '</div>' +
      '<div class="done-btns">' + (canMore ? '<button class="kid-btn go big" id="more" aria-label="Play more">' + ART.icon.play + '</button>' : '') + '<button class="kid-btn plain big" id="ok" aria-label="Home">' + ART.icon.home + '</button></div></div>');
    show('done', el);
    el.querySelector('#ok').addEventListener('click', () => (overLimit() ? rest() : home()));
    if (canMore) el.querySelector('#more').addEventListener('click', () => startSet(set.area));
    speak('All done! ' + (wins.length ? 'Go show a grown-up what you learned. ' : '') + (canMore ? 'Green button to play more. House to go home.' : 'Tap the house.'));
  }

  function rest() {
    const el = $('<div class="screen rest">' + grownLockHtml() + '<div class="done-icon">' + ART.icon.moon + '</div><h1>Rest time!</h1><p>Great playing today. See you tomorrow.</p></div>');
    wireLock(el);
    show('rest', el);
    speak('Rest time! Great playing today. See you tomorrow.');
  }


  /* ---------- Stories: read-aloud picture books (all stored on the tablet) ---------- */
  let stories = load('stories', null);
  function fetchStories(force) {
    return fetch('stories.json', { cache: force ? 'no-store' : 'default' }).then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then((j) => { const changed = !stories || j.version !== stories.version; stories = j; save('stories', j); return changed; });
  }
  const nm = (t) => String(t).replace(/\{name\}/g, kidName() || 'me');
  const BG = { field: ['#DCE8EE', '#C9D7A8'], inside: ['#F3EBDD', '#D9C7A8'], night: ['#2F3B5C', '#4D5E4A'] };
  function placePic(k, x, y, s) { return ART.pic(k).replace('<svg ', '<svg x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" '); }
  function sceneSvg(pg) {
    const bg = BG[pg.bg] || BG.field;
    let h = '<svg class="scene" viewBox="0 0 160 90" role="img" aria-label="Story picture"><rect width="160" height="90" fill="' + bg[0] + '"/><rect y="68" width="160" height="22" fill="' + bg[1] + '"/>';
    if (pg.count) {
      const k = pg.count[0], n = pg.count[1], per = 5, s = 20;
      for (let i = 0; i < n; i++) { const row = Math.floor(i / per), inRow = Math.min(per, n - row * per), col = i % per; const x = 80 - (inRow * 26) / 2 + col * 26 + 3, y = (n > per ? 18 : 32) + row * 28; h += placePic(k, x, y, s); }
    }
    (pg.items || []).forEach((it) => { h += placePic(it[0], it[1], it[2], it[3]); });
    return h + '</svg>';
  }

  function shelf() {
    if (overLimit()) { rest(); return; }
    const list = (stories && stories.stories) || [];
    const el = $('<div class="screen shelf"><div class="bar"><button class="round-btn" id="home" aria-label="Home">' + ART.icon.home + '</button><div class="shelf-title">' + ART.pic('book') + '</div><div style="width:96px"></div></div><div class="shelf-grid"></div></div>');
    const grid = el.querySelector('.shelf-grid');
    if (!list.length) grid.appendChild($('<div class="muted" style="font-size:28px">Stories will appear after the app connects to Wi-Fi once.</div>'));
    list.forEach((st) => {
      const b = $('<button class="cover" style="background:' + (st.tint || '#fff') + '" aria-label="' + esc(nm(st.title)) + '"><div class="cover-art">' + ART.pic(st.cover) + '</div><div class="cover-title">' + esc(nm(st.title)) + '</div></button>');
      b.addEventListener('click', () => playStory(st));
      grid.appendChild(b);
    });
    // Audio books: ones bundled with the app (stories.json "audiobooks") plus ones added on this tablet
    allAudio().then((books) => {
      books.forEach((bk) => {
        const b = $('<button class="cover audio" style="background:' + (bk.tint || '#E6E3F0') + '" aria-label="' + esc(bk.title) + '"><div class="cover-art">' + coverHtml(bk) + '</div><span class="cover-badge">' + ART.icon.headphones + '</span><div class="cover-title">' + esc(bk.title) + '</div></button>');
        b.addEventListener('click', () => listen(bk));
        grid.appendChild(b);
      });
    });
    el.querySelector('#home').addEventListener('click', home);
    show('shelf', el);
    speak('Pick a story!');
  }

  /* ---------- Audio books: stored on the tablet (IndexedDB), play offline ---------- */
  function idb() {
    return new Promise((res, rej) => { if (!window.indexedDB) { rej(new Error('no indexedDB')); return; } const r = indexedDB.open('jla-audio', 1); r.onupgradeneeded = () => r.result.createObjectStore('books', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }
  function idbDo(mode, fn) { return idb().then((db) => new Promise((res, rej) => { const tx = db.transaction('books', mode), st = tx.objectStore('books'); const q = fn(st); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); })); }
  const localAudio = () => idbDo('readonly', (st) => st.getAll()).then((a) => (a || []).sort((x, y) => x.added - y.added)).catch(() => []);
  function allAudio() { const bundled = ((stories && stories.audiobooks) || []).map((b) => Object.assign({ bundled: true }, b)); return localAudio().then((loc) => bundled.concat(loc)); }
  const COVER_PICS = ['moon', 'star', 'book', 'turtle', 'rabbit', 'hen', 'tree', 'sun', 'bee', 'fish'];
  const urls = [];
  const blobUrl = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
  function coverHtml(bk) {
    if (bk.coverBlob) return '<img class="cover-img" alt="" src="' + blobUrl(bk.coverBlob) + '">';
    if (bk.cover && /\./.test(bk.cover)) return '<img class="cover-img" alt="" src="' + esc(bk.cover) + '">';
    let h = 0; for (const ch of String(bk.title)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return ART.pic(bk.coverPic || COVER_PICS[h % COVER_PICS.length]);
  }
  // Ask the offline copy to also keep bundled audio files (they can be large, so this happens in the background)
  function cacheBundledAudio() {
    if (!('caches' in window) || !stories || !stories.audiobooks) return;
    const files = []; stories.audiobooks.forEach((b) => { if (b.src) files.push(b.src); if (b.cover && /\./.test(b.cover)) files.push(b.cover); });
    caches.keys().then((ks) => { const k = ks.filter((x) => x.indexOf('jla-') === 0).pop(); if (!k) return; caches.open(k).then((c) => files.forEach((f) => c.match(f).then((hit) => { if (!hit) c.add(f).catch(() => {}); }))); }).catch(() => {});
  }

  function listen(bk) {
    const src = bk.audioBlob ? blobUrl(bk.audioBlob) : bk.src;
    const audio = new Audio(src); audio.preload = 'auto';
    const t0 = Date.now(); let ended = false;
    const el = $('<div class="screen listen">' +
      '<div class="bar"><button class="round-btn" id="home" aria-label="Home">' + ART.icon.home + '</button><div></div><button class="round-btn" id="shelf" aria-label="All stories">' + ART.pic('book') + '</button></div>' +
      '<div class="listen-body"><div class="listen-cover card">' + coverHtml(bk) + '</div>' +
      '<div class="listen-ctl"><button class="kid-btn go big" id="pp" aria-label="Play or pause"></button><button class="kid-btn plain" id="restart" aria-label="Start again">' + ART.icon.restart + '</button></div></div>' +
      '<div class="timeline" id="tl" aria-label="Story timeline"><div class="tl-fill"></div><div class="tl-knob"></div></div></div>');
    show('listen', el);
    const pp = el.querySelector('#pp'), tl = el.querySelector('#tl'), fill = el.querySelector('.tl-fill'), knob = el.querySelector('.tl-knob');
    const setPP = () => { pp.innerHTML = audio.paused ? ART.icon.play : ART.icon.pause; pp.classList.toggle('sun', !audio.paused); pp.classList.toggle('go', audio.paused); };
    const draw = () => { const f = audio.duration ? Math.min(1, audio.currentTime / audio.duration) : 0; fill.style.width = (f * 100) + '%'; knob.style.left = (f * 100) + '%'; };
    audio.addEventListener('timeupdate', draw); audio.addEventListener('play', setPP); audio.addEventListener('pause', setPP);
    audio.addEventListener('ended', () => { ended = true; setPP(); speak('The end!'); });
    audio.addEventListener('error', () => { el.querySelector('.listen-cover').insertAdjacentHTML('beforeend', '<div class="muted listen-err">This audio file can\u2019t be played on this tablet.</div>'); });
    pp.addEventListener('click', () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
    el.querySelector('#restart').addEventListener('click', () => { audio.currentTime = 0; audio.play().catch(() => {}); });
    let drag = false;
    const seek = (e) => { const r = tl.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); if (audio.duration) { audio.currentTime = f * audio.duration; draw(); } };
    tl.addEventListener('pointerdown', (e) => { drag = true; tl.setPointerCapture(e.pointerId); seek(e); });
    tl.addEventListener('pointermove', (e) => { if (drag) seek(e); });
    tl.addEventListener('pointerup', () => { drag = false; }); tl.addEventListener('pointercancel', () => { drag = false; });
    const leave = (next) => () => { audio.pause(); log({ t: Date.now(), g: 'listen', title: 'Listened: ' + bk.title, r: ended ? 'done' : 'stopped', tries: 0, secs: Math.round((Date.now() - t0) / 1000), d: '' }); urls.splice(0).forEach((u) => URL.revokeObjectURL(u)); if (overLimit()) rest(); else next(); };
    el.querySelector('#home').addEventListener('click', leave(home));
    el.querySelector('#shelf').addEventListener('click', leave(shelf));
    setPP(); audio.play().catch(() => {}); // starts right away; if the tablet blocks it, he taps the big green play
  }

  // Grown-ups page: add an MP3 (and an optional cover photo) from this tablet, or remove one
  function audioManager(note) {
    const el = $('<div class="screen grown">' +
      '<div class="g-top"><div><h1>Audio books</h1><div class="sub">Saved on this tablet; they play with no internet. They appear on the Stories shelf with a headphones badge.</div></div><button class="g-btn primary" id="back">Back to Grown-ups</button></div>' +
      (note ? '<div class="g-note">' + esc(note) + '</div>' : '') +
      '<div class="g-grid"><section class="g-card"><h2>Add an audio book</h2>' +
      '<label class="g-field">1. Audio file (MP3 or M4A)<input type="file" id="f-audio" accept="audio/*,.mp3,.m4a"></label>' +
      '<label class="g-field">2. Title<input type="text" id="f-title" placeholder="e.g. Bear Snores On, read by Mom"></label>' +
      '<label class="g-field">3. Cover picture (optional: a photo of the book cover)<input type="file" id="f-cover" accept="image/*"></label>' +
      '<div class="g-btns"><button class="g-btn primary" id="save">Save to this tablet</button></div>' +
      '<div class="sub">Tip: to get an MP3 onto the tablet, email it to yourself and download the attachment, save it from Google Drive or Amazon Photos, or copy it over with a USB cable.</div></section>' +
      '<section class="g-card"><h2>On this tablet</h2><div id="a-list" class="a-list"><div class="muted">Loading\u2026</div></div><div class="sub" id="a-space"></div></section></div></div>');
    show('grown', el);
    el.querySelector('#back').addEventListener('click', () => grownups());
    const listEl = el.querySelector('#a-list');
    localAudio().then((books) => {
      listEl.innerHTML = books.length ? '' : '<div class="muted">None yet.</div>';
      books.forEach((bk) => {
        const row = $('<div class="a-row"><div class="a-cov">' + coverHtml(bk) + '</div><div class="a-t">' + esc(bk.title) + '<div class="muted">' + (bk.audioBlob ? Math.round(bk.audioBlob.size / 1e5) / 10 + ' MB' : '') + '</div></div><button class="g-btn">Remove</button></div>');
        const del = row.querySelector('button');
        del.addEventListener('click', () => { if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = 'Tap again to remove'; del.classList.add('warn'); return; } idbDo('readwrite', (st) => st.delete(bk.id)).then(() => audioManager('Removed \u201c' + bk.title + '\u201d.')); });
        listEl.appendChild(row);
      });
    });
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => { el.querySelector('#a-space').textContent = 'Space used by the app: ' + Math.round((e.usage || 0) / 1e6) + ' MB of about ' + Math.round((e.quota || 0) / 1e9) + ' GB available.'; }).catch(() => {});
    el.querySelector('#save').addEventListener('click', () => {
      const fa = el.querySelector('#f-audio').files[0], fc = el.querySelector('#f-cover').files[0];
      let title = el.querySelector('#f-title').value.trim();
      if (!fa) { audioManager('Pick an audio file first.'); return; }
      if (!title) title = fa.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      const bk = { id: 'a' + Date.now(), title, audioBlob: fa, coverBlob: fc || null, added: Date.now() };
      idbDo('readwrite', (st) => st.put(bk)).then(() => audioManager('Saved \u201c' + title + '\u201d. It\u2019s on the Stories shelf now.')).catch((e) => audioManager('Couldn\u2019t save it (' + (e && e.name === 'QuotaExceededError' ? 'the tablet is out of space' : 'storage error') + ').'));
    });
  }


  function playStory(st) {
    const pages = st.pages.concat([{ end: true }]);
    let i = 0, playing = true, timer = null, guard = null, reachedEnd = false; const t0 = Date.now();
    const el = $('<div class="screen story">' +
      '<div class="bar"><button class="round-btn" id="home" aria-label="Home">' + ART.icon.home + '</button><div class="dots"></div>' +
      '<div class="bar-r"><button class="round-btn" id="shelf" aria-label="All stories">' + ART.pic('book') + '</button><button class="round-btn next" id="pp" aria-label="Play or pause"></button></div></div>' +
      '<div class="story-body"><div class="card story-stage"></div><div class="story-side"><button class="kid-btn go big" id="fwd" aria-label="Next page">' + ART.icon.next + '</button><button class="kid-btn plain" id="back" aria-label="Page back">' + ART.icon.next + '</button></div></div>' +
      '<div class="story-text" aria-live="polite"></div></div>');
    show('story', el);
    const stage = el.querySelector('.story-stage'), textEl = el.querySelector('.story-text'), dots = el.querySelector('.dots'), pp = el.querySelector('#pp');
    const stopTalk = () => { clearTimeout(timer); clearTimeout(guard); if ('speechSynthesis' in window) speechSynthesis.cancel(); };
    function setPP() { pp.innerHTML = playing ? ART.icon.pause : ART.icon.play; pp.classList.toggle('paused', !playing); }
    function finish() {
      reachedEnd = true; stopTalk(); playing = false; setPP();
      stage.innerHTML = '<div class="the-end"><div class="end-check">' + ART.icon.check + '</div><div class="kid-row"><button class="kid-btn go big" id="again" aria-label="Read it again">' + ART.icon.restart + '</button><button class="kid-btn sun big" id="more" aria-label="Pick another story">' + ART.pic('book') + '</button></div></div>';
      textEl.textContent = 'The End';
      stage.querySelector('#again').addEventListener('click', () => { i = 0; playing = true; setPP(); render(); });
      stage.querySelector('#more').addEventListener('click', leave(shelf));
      speak('The end! Read it again, or pick another story.');
    }
    function render() {
      stopTalk();
      dots.innerHTML = st.pages.map((_, k) => '<i class="' + (k < i ? 'done' : k === i ? 'now' : '') + '"></i>').join('');
      if (pages[i].end) { finish(); return; }
      const pg = pages[i], text = nm(pg.text);
      stage.innerHTML = sceneSvg(pg);
      const words = text.split(' ');
      textEl.innerHTML = words.map((w) => '<span>' + esc(w) + '</span>').join(' ');
      el.querySelector('#back').style.visibility = i === 0 ? 'hidden' : 'visible';
      if (playing) read(text, words.length);
    }
    function read(text, nWords) {
      const spans = textEl.querySelectorAll('span');
      const advance = () => { clearTimeout(guard); if (!playing) return; timer = setTimeout(() => { i++; render(); }, 1400); };
      const est = 1200 + nWords * 420;
      if (!settings.sound || !('speechSynthesis' in window) || !speechSynthesis.getVoices().length) { guard = setTimeout(advance, est); return; }
      try {
        const u = new SpeechSynthesisUtterance(text.replace(/[“”"]/g, ''));
        u.rate = 0.85; u.pitch = 1.05; if (voice) u.voice = voice;
        const starts = []; let pos = 0; text.split(' ').forEach((w) => { starts.push(pos); pos += w.length + 1; });
        u.onboundary = (e) => { if (e.name && e.name !== 'word') return; let k = 0; while (k + 1 < starts.length && starts[k + 1] <= e.charIndex) k++; spans.forEach((s, j) => s.classList.toggle('on', j === k)); };
        u.onend = () => { spans.forEach((s) => s.classList.remove('on')); advance(); };
        speechSynthesis.speak(u);
        guard = setTimeout(advance, est * 1.7); // in case the voice never reports that it finished
      } catch (e) { guard = setTimeout(advance, est); }
    }
    function leave(next) { return () => { stopTalk(); log({ t: Date.now(), g: 'story', title: 'Story: ' + nm(st.title), r: reachedEnd ? 'done' : 'stopped', tries: 0, secs: Math.round((Date.now() - t0) / 1000), d: reachedEnd ? '' : 'page ' + (i + 1) }); if (overLimit()) rest(); else next(); }; }
    pp.addEventListener('click', () => { if (reachedEnd) return; playing = !playing; setPP(); if (playing) render(); else stopTalk(); });
    el.querySelector('#fwd').addEventListener('click', () => { if (i < pages.length - 1) { i++; render(); } });
    el.querySelector('#back').addEventListener('click', () => { if (i > 0) { i--; render(); } });
    el.querySelector('#home').addEventListener('click', leave(home));
    el.querySelector('#shelf').addEventListener('click', leave(shelf));
    setPP(); render();
  }

  /* ---------- does this browser keep saved data? (grown-ups) ---------- */
  function storageStatus() {
    let ok = true; try { localStorage.setItem('jla.__t', '1'); ok = localStorage.getItem('jla.__t') === '1'; localStorage.removeItem('jla.__t'); } catch (e) { ok = false; }
    const pers = navigator.storage && navigator.storage.persisted ? navigator.storage.persisted().catch(() => null) : Promise.resolve(null);
    return pers.then((kept) => {
      if (!ok || !lsOK) return { ok: false, text: 'Saving is blocked in this browser: settings, drawings and the log won\u2019t be kept. Allow cookies / site data for this site.' };
      if (restoredFromBackup) return { ok: false, text: 'Settings were wiped by the browser and restored from the backup copy. Allow cookies / site data so this stops happening.' };
      return { ok: true, text: 'Saving works \u2713' + (kept ? ' (kept permanently)' : ' (the browser may clear it if storage runs low)') };
    });
  }

  /* ---------- offline check (grown-ups) ---------- */
  const OFFLINE_FILES = ['index.html', 'style.css', 'art.js', 'games.js', 'pages.js', 'app.js', 'lessons.json', 'stories.json'];
  function offlineStatus() {
    if (!('caches' in window) || !navigator.serviceWorker) return Promise.resolve(null);
    return caches.keys().then((ks) => { const k = ks.filter((x) => x.indexOf('jla-') === 0).pop(); if (!k) return { ok: false, have: 0 }; return caches.open(k).then((c) => Promise.all(OFFLINE_FILES.map((f) => c.match(f, { ignoreSearch: true })))).then((r) => ({ ok: r.every(Boolean), have: r.filter(Boolean).length })); }).catch(() => null);
  }

  /* ---------- Art: free drawing, color a picture, color by number/letter, one shared gallery ---------- */
  const DI = {
    gallery: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M3 16l9-9 7 7-6 6H7z" fill="#F4C9D2"/><path d="M8 11l7 7"/><path d="M7 20h13" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 18v2h16v-2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    crayon: '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="14" width="80" height="72" rx="8" fill="#FFFFFF" stroke="#C9D5D1" stroke-width="4"/><path d="M22 66 C34 34 46 72 58 40 S76 52 80 30" fill="none" stroke="#C9473A" stroke-width="7" stroke-linecap="round"/><path d="M60 78 L88 50 L94 56 L66 84 Z" fill="#4A6FA5"/><path d="M60 78 L54 88 L66 84 Z" fill="#E9C99A"/></svg>',
    outline: '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="14" width="80" height="72" rx="8" fill="#FFFFFF" stroke="#C9D5D1" stroke-width="4"/><g fill="none" stroke="#2B3B39" stroke-width="3"><ellipse cx="40" cy="55" rx="14" ry="20"/><ellipse cx="60" cy="55" rx="14" ry="20"/><ellipse cx="50" cy="55" rx="12" ry="22"/><path d="M50 33 C52 28 55 26 58 25"/></g><path d="M38 50 C42 46 46 60 50 54" stroke="#E08A3C" stroke-width="6" fill="none" stroke-linecap="round"/></svg>',
    bynum: '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="14" width="80" height="72" rx="8" fill="#FFFFFF" stroke="#C9D5D1" stroke-width="4"/><circle cx="34" cy="40" r="13" fill="#E08A3C"/><circle cx="66" cy="40" r="13" fill="#7E9A4F"/><circle cx="50" cy="66" r="13" fill="#4A6FA5"/><g font-family="Andika, sans-serif" font-weight="700" font-size="15" fill="#fff" text-anchor="middle"><text x="34" y="45">1</text><text x="66" y="45">2</text><text x="50" y="71">3</text></g></svg>'
  };
  const DCOLORS = ['#1F3B39', '#C9473A', '#E08A3C', '#F2C94C', '#6FAE4A', '#2F8F83', '#4A6FA5', '#8A6FB0', '#E89AC7', '#8A5A33'];
  const DSIZES = [10, 24, 48];
  const DW = 1600, DH = 1120;
  const OS = 'fill="none" stroke="#2B3B39" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"';
  const DTPL = {
    pumpkin: '<path ' + OS + ' d="M790 320 C800 250 840 220 880 210"/><path ' + OS + ' d="M830 260 C900 200 980 230 990 260 C930 290 870 290 830 260 Z"/><ellipse ' + OS + ' cx="620" cy="650" rx="230" ry="300"/><ellipse ' + OS + ' cx="980" cy="650" rx="230" ry="300"/><ellipse ' + OS + ' cx="800" cy="650" rx="190" ry="320"/>',
    house: '<path ' + OS + ' d="M420 520 L800 200 L1180 520"/><rect ' + OS + ' x="480" y="510" width="640" height="460"/><rect ' + OS + ' x="730" y="720" width="140" height="250"/><rect ' + OS + ' x="540" y="600" width="130" height="120"/><rect ' + OS + ' x="930" y="600" width="130" height="120"/><circle ' + OS + ' cx="1350" cy="220" r="100"/><path ' + OS + ' d="M100 975 H1500"/>',
    fish: '<path ' + OS + ' d="M300 560 C480 300 900 300 1080 560 C900 820 480 820 300 560 Z"/><path ' + OS + ' d="M1080 560 L1340 380 V740 Z"/><circle ' + OS + ' cx="500" cy="520" r="34"/><path ' + OS + ' d="M700 400 C740 480 740 640 700 720"/><circle ' + OS + ' cx="260" cy="300" r="40"/><circle ' + OS + ' cx="200" cy="180" r="26"/><path ' + OS + ' d="M100 1000 C300 940 500 1060 700 1000 S1100 940 1500 1000"/>',
    star: '<path ' + OS + ' d="M800 120 L910 430 L1240 440 L980 640 L1070 960 L800 770 L530 960 L620 640 L360 440 L690 430 Z"/><path ' + OS + ' d="M250 160 L280 245 L370 248 L300 300 L325 385 L250 335 L175 385 L200 300 L130 248 L220 245 Z"/><path ' + OS + ' d="M1350 700 L1380 785 L1470 788 L1400 840 L1425 925 L1350 875 L1275 925 L1300 840 L1230 788 L1320 785 Z"/>',
    car: '<path ' + OS + ' d="M240 720 L340 520 C360 480 400 460 440 460 H1020 C1070 460 1110 480 1140 520 L1280 680 H1340 C1370 680 1390 700 1390 730 V820 H220 V760 Z"/><path ' + OS + ' d="M420 540 H700 V680 H360 Z M760 540 H1000 L1120 680 H760 Z"/><circle ' + OS + ' cx="460" cy="840" r="110"/><circle ' + OS + ' cx="1110" cy="840" r="110"/><path ' + OS + ' d="M80 980 H1520"/>',
    turkey: '<ellipse ' + OS + ' cx="560" cy="420" rx="90" ry="220" transform="rotate(-50 560 420)"/><ellipse ' + OS + ' cx="700" cy="320" rx="90" ry="220" transform="rotate(-20 700 320)"/><ellipse ' + OS + ' cx="900" cy="320" rx="90" ry="220" transform="rotate(20 900 320)"/><ellipse ' + OS + ' cx="1040" cy="420" rx="90" ry="220" transform="rotate(50 1040 420)"/><ellipse ' + OS + ' cx="800" cy="740" rx="230" ry="250"/><circle ' + OS + ' cx="800" cy="450" r="130"/><path ' + OS + ' d="M765 470 L835 470 L800 540 Z"/><circle cx="755" cy="420" r="18" fill="#2B3B39"/><circle cx="845" cy="420" r="18" fill="#2B3B39"/><path ' + OS + ' d="M720 985 V1060 M880 985 V1060 M680 1060 H760 M840 1060 H920"/>'
  };
  // All coloring pages: trucks and superheroes from pages.js, plus the original set
  const PG = (window.PAGES || { trucks: {}, heroes: {} });
  const PAGE_GROUPS = { trucks: PG.trucks || {}, heroes: PG.heroes || {}, more: DTPL };
  const ALL_TPL = Object.assign({}, DTPL, PG.trucks || {}, PG.heroes || {});
  const tplSvg = (k, cls) => '<svg viewBox="0 0 ' + DW + ' ' + DH + '" class="' + (cls || 'dr-outline') + '" aria-hidden="true">' + (ALL_TPL[k] || '') + '</svg>';
  function artDB() { return new Promise((res, rej) => { if (!window.indexedDB) { rej(new Error('no indexedDB')); return; } const r = indexedDB.open('kiwi-play-drawing', 1); r.onupgradeneeded = () => r.result.createObjectStore('pics', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  function artOp(mode, fn) { return artDB().then((d) => new Promise((res, rej) => { const tx = d.transaction('pics', mode); const q = fn(tx.objectStore('pics')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); })); }
  const allArt = () => artOp('readonly', (s) => s.getAll()).then((a) => (a || []).sort((x, y) => y.updated - x.updated)).catch(() => []);
  const artUrls = []; const artUrl = (b) => { const u = URL.createObjectURL(b); artUrls.push(u); return u; };
  const freeArtUrls = () => artUrls.splice(0).forEach((u) => URL.revokeObjectURL(u));
  // A finished color-by-number picture goes into the same gallery (as a picture he can keep coloring)
  function saveSvgToGallery(svgEl) {
    try {
      const clone = svgEl.cloneNode(true); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', DW); clone.setAttribute('height', DH); clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      const im = new Image();
      im.onload = () => { const c = document.createElement('canvas'); c.width = DW; c.height = DH; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, DW, DH); x.drawImage(im, 0, 0, DW, DH); c.toBlob((b) => { if (b) artOp('readwrite', (s) => s.put({ id: 'p' + Date.now(), template: null, png: b, updated: Date.now(), kind: 'bynumber' })).catch(() => {}); }, 'image/png'); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    } catch (e) { /* the picture just isn't saved */ }
  }

  function artMenu() {
    if (overLimit()) { rest(); return; }
    freeArtUrls();
    const el = $('<div class="screen art-menu"><div class="bar"><button class="round-btn" id="home" aria-label="Home">' + ART.icon.home + '</button><div></div><button class="round-btn" id="gal" aria-label="My pictures">' + DI.gallery + '</button></div>' +
      '<div class="art-choices"><button class="art-choice" id="free" aria-label="Draw">' + DI.crayon + '</button><button class="art-choice" id="outline" aria-label="Color a picture">' + DI.outline + '</button><button class="art-choice" id="bynum" aria-label="Color by number">' + DI.bynum + '</button></div></div>');
    show('art', el);
    el.querySelector('#home').addEventListener('click', home);
    el.querySelector('#gal').addEventListener('click', () => artGallery());
    el.querySelector('#free').addEventListener('click', () => studio(null));
    el.querySelector('#outline').addEventListener('click', () => tplPicker(el));
    el.querySelector('#bynum').addEventListener('click', () => startSet('make', 'color'));
    speak('Draw, color a picture, or color by number?');
  }

  let dColor = DCOLORS[1], dSize = DSIZES[1], dErase = false;
  function studio(pic) {
    freeArtUrls();
    const cur = pic || { id: 'p' + Date.now(), template: null, png: null, updated: Date.now() };
    const el = $('<div class="screen dr">' +
      '<div class="dr-paperbox"><div class="dr-paper"><canvas width="' + DW + '" height="' + DH + '"></canvas>' + (cur.template ? tplSvg(cur.template) : '') + '</div></div>' +
      '<div class="dr-tools"><div class="dr-row dr-nav"><button class="round-btn" id="home" aria-label="Back">' + ART.icon.home + '</button><button class="round-btn" id="gal" aria-label="My pictures">' + DI.gallery + '</button></div>' +
      '<div class="dr-colors"></div><div class="dr-sizes"></div>' +
      '<div class="dr-row"><button class="kid-btn plain" id="eraser" aria-label="Eraser">' + DI.eraser + '</button><button class="kid-btn plain" id="undo" aria-label="Undo">' + DI.undo + '</button><button class="kid-btn go" id="new" aria-label="New page">' + DI.plus + '</button></div></div></div>');
    show('draw', el);
    const cv = el.querySelector('canvas'), cx = cv.getContext('2d');
    let base = null; const strokes = []; let live = null, dirty = false, saveT = null;
    function paint(s) {
      cx.strokeStyle = s.erase ? '#FFFFFF' : s.color; cx.fillStyle = cx.strokeStyle; cx.lineWidth = s.size; cx.lineCap = 'round'; cx.lineJoin = 'round';
      const p = s.pts;
      if (p.length === 1) { cx.beginPath(); cx.arc(p[0][0], p[0][1], s.size / 2, 0, Math.PI * 2); cx.fill(); return; }
      cx.beginPath(); cx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length - 1; i++) cx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
      cx.lineTo(p[p.length - 1][0], p[p.length - 1][1]); cx.stroke();
    }
    function redraw() { cx.fillStyle = '#FFFFFF'; cx.fillRect(0, 0, DW, DH); if (base) cx.drawImage(base, 0, 0, DW, DH); strokes.forEach(paint); }
    if (cur.png) { const im = new Image(); im.onload = () => { base = im; redraw(); }; im.src = artUrl(cur.png); } else redraw();
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * DW / r.width, (e.clientY - r.top) * DH / r.height]; };
    cv.addEventListener('pointerdown', (e) => {
      if (isPalm(e)) return;
      if (live) {
        // A resting hand often lands first. If the first touch has barely moved and the new one is higher up, the new one is the finger.
        if (live.pts.length < 8 && pt(e)[1] < live.pts[0][1] - 40) { live = null; redraw(); } else return;
      }
      try { cv.setPointerCapture(e.pointerId); } catch (err) {} live = { id: e.pointerId, color: dColor, size: dErase ? dSize * 2 : dSize, erase: dErase, pts: [pt(e)] }; paint(live);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!live || e.pointerId !== live.id) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; const start = live.pts.length - 1;
      evs.forEach((ev) => live.pts.push(pt(ev)));
      const p = live.pts; cx.strokeStyle = live.erase ? '#FFFFFF' : live.color; cx.lineWidth = live.size; cx.lineCap = 'round'; cx.lineJoin = 'round';
      cx.beginPath(); cx.moveTo(p[start][0], p[start][1]); for (let i = start + 1; i < p.length; i++) cx.lineTo(p[i][0], p[i][1]); cx.stroke();
    });
    const end = (e) => { if (!live || e.pointerId !== live.id) return; strokes.push(live); live = null; redraw(); dirty = true; clearTimeout(saveT); saveT = setTimeout(saveNow, 800); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    function saveNow() {
      if (!dirty) return Promise.resolve(); dirty = false;
      return new Promise((res) => {
        const out = document.createElement('canvas'); out.width = DW; out.height = DH; const o = out.getContext('2d'); o.drawImage(cv, 0, 0);
        const finish = () => out.toBlob((b) => { cur.png = b; cur.updated = Date.now(); artOp('readwrite', (s) => s.put(cur)).then(res, res); }, 'image/png');
        if (!cur.template) { finish(); return; }
        const im = new Image(); im.onload = () => { o.drawImage(im, 0, 0, DW, DH); finish(); }; im.onerror = finish;
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + DW + ' ' + DH + '">' + (ALL_TPL[cur.template] || '') + '</svg>');
      });
    }
    const colorsEl = el.querySelector('.dr-colors'), sizesEl = el.querySelector('.dr-sizes'), er = el.querySelector('#eraser');
    const refresh = () => { colorsEl.querySelectorAll('.dr-color').forEach((b) => b.classList.toggle('on', !dErase && b.dataset.c === dColor)); sizesEl.querySelectorAll('.dr-size').forEach((b) => b.classList.toggle('on', +b.dataset.s === dSize)); er.classList.toggle('on', dErase); };
    DCOLORS.forEach((c) => { const b = $('<button class="dr-color" aria-label="Color" data-c="' + c + '" style="background:' + c + '"></button>'); b.addEventListener('click', () => { dColor = c; dErase = false; refresh(); }); colorsEl.appendChild(b); });
    DSIZES.forEach((s) => { const b = $('<button class="dr-size" aria-label="Brush size" data-s="' + s + '"><i style="width:' + (s * 0.55 + 6) + 'px;height:' + (s * 0.55 + 6) + 'px"></i></button>'); b.addEventListener('click', () => { dSize = s; refresh(); }); sizesEl.appendChild(b); });
    er.addEventListener('click', () => { dErase = !dErase; refresh(); });
    el.querySelector('#undo').addEventListener('click', () => { if (strokes.length) { strokes.pop(); redraw(); dirty = true; clearTimeout(saveT); saveT = setTimeout(saveNow, 800); } });
    const leave = (next) => () => { clearTimeout(saveT); document.onvisibilitychange = null; saveNow().then(() => { log({ t: Date.now(), g: 'draw', title: cur.png || strokes.length ? 'Drawing' : 'Drawing (empty)', r: 'done', tries: 0, secs: 0, d: '' }); next(); }); };
    el.querySelector('#home').addEventListener('click', leave(artMenu));
    el.querySelector('#gal').addEventListener('click', leave(artGallery));
    el.querySelector('#new').addEventListener('click', () => { clearTimeout(saveT); saveNow().then(() => tplPicker(el)); });
    document.onvisibilitychange = () => { if (document.visibilityState !== 'visible') { clearTimeout(saveT); saveNow(); } };
    refresh();
  }

  let pickerTab = 'trucks';
  function tplPicker(el) {
    const ov = $('<div class="overlay"><div class="dr-picker2"><div class="dr-tabs"></div><div class="dr-pgrid"></div></div></div>');
    const tabs = ov.querySelector('.dr-tabs'), grid = ov.querySelector('.dr-pgrid');
    const fill = () => {
      grid.innerHTML = '';
      const blank = $('<button class="dr-tpl blank" aria-label="Blank page"></button>'); blank.addEventListener('click', () => studio(null)); grid.appendChild(blank);
      Object.keys(PAGE_GROUPS[pickerTab]).forEach((k) => { const b = $('<button class="dr-tpl" aria-label="' + k + ' to color">' + tplSvg(k, 'dr-tpl-svg') + '</button>'); b.addEventListener('click', () => studio({ id: 'p' + Date.now(), template: k, png: null, updated: Date.now() })); grid.appendChild(b); });
      tabs.querySelectorAll('button[data-t]').forEach((t) => t.classList.toggle('on', t.dataset.t === pickerTab));
      grid.scrollTop = 0;
    };
    Object.keys(PAGE_GROUPS).forEach((t) => {
      const icon = { trucks: 'firetruck', heroes: 'starhero', more: 'pumpkin' }[t];
      const b = $('<button class="dr-tab" data-t="' + t + '" aria-label="' + t + '">' + tplSvg(icon, 'dr-tab-svg') + '</button>');
      b.addEventListener('click', () => { pickerTab = t; fill(); }); tabs.appendChild(b);
    });
    const close = $('<button class="dr-tab close" aria-label="Close">' + DI.x + '</button>'); close.addEventListener('click', () => ov.remove()); tabs.appendChild(close);
    fill();
    el.appendChild(ov);
  }

  function artGallery() {
    freeArtUrls();
    const el = $('<div class="screen dr-gal"><div class="bar"><button class="round-btn" id="home" aria-label="Back">' + ART.icon.home + '</button>' +
      '<div class="dr-row" style="gap:16px"><button class="round-btn dr-hold" id="trash" aria-label="Grown-ups: press and hold to delete pictures"><span class="dr-fill"></span>' + DI.trash + '</button><button class="round-btn" id="save" aria-label="Grown-ups: save all pictures" style="display:none">' + DI.save + '</button><button class="round-btn next" id="new" aria-label="New page">' + DI.plus + '</button></div></div><div class="dr-grid"></div></div>');
    show('art', el);
    const grid = el.querySelector('.dr-grid');
    allArt().then((pics) => {
      pics = pics.filter((p) => p.png);
      if (!pics.length) { const e0 = $('<div class="dr-empty"><button class="kid-btn go huge" aria-label="Start drawing">' + DI.plus + '</button></div>'); e0.querySelector('button').addEventListener('click', () => studio(null)); grid.appendChild(e0); }
      pics.forEach((p) => {
        const t = $('<div class="dr-thumb" role="button" aria-label="Open picture"><img alt="" src="' + artUrl(p.png) + '"><button class="dr-x" aria-label="Delete picture">' + DI.x + '</button></div>');
        t.addEventListener('click', () => { if (!el.classList.contains('del-mode')) studio(p); });
        t.querySelector('.dr-x').addEventListener('click', (e) => { e.stopPropagation(); artOp('readwrite', (s) => s.delete(p.id)).then(() => t.remove()); });
        grid.appendChild(t);
      });
    });
    el.querySelector('#home').addEventListener('click', artMenu);
    el.querySelector('#new').addEventListener('click', () => tplPicker(el));
    const tr = el.querySelector('#trash'); let tm = null, justEntered = false;
    tr.addEventListener('pointerdown', () => { if (el.classList.contains('del-mode')) return; tr.classList.add('holding'); tm = setTimeout(() => { tm = null; justEntered = true; tr.classList.remove('holding'); el.classList.add('del-mode'); tr.innerHTML = DI.check; tr.classList.add('next'); el.querySelector('#save').style.display = 'flex'; }, 2000); });
    const stop = () => { clearTimeout(tm); tr.classList.remove('holding'); };
    tr.addEventListener('pointerup', stop); tr.addEventListener('pointerleave', stop); tr.addEventListener('pointercancel', stop);
    tr.addEventListener('click', () => { if (justEntered) { justEntered = false; return; } if (el.classList.contains('del-mode')) artGallery(); });
    el.querySelector('#save').addEventListener('click', () => allArt().then((pics) => {
      const files = pics.filter((p) => p.png).map((p, i) => new File([p.png], 'kiwi-play-picture-' + new Date(p.updated).toISOString().slice(0, 10) + '-' + (i + 1) + '.png', { type: 'image/png' }));
      if (!files.length) return;
      try { if (navigator.canShare && navigator.canShare({ files })) { navigator.share({ files, title: 'My pictures' }).catch(() => {}); return; } } catch (e) { /* fall back to downloads */ }
      files.forEach((f, i) => setTimeout(() => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }, i * 300));
    }));
  }

  /* ---------- grown-ups lock: press and hold 3 seconds ---------- */
  function grownLockHtml() { return '<button class="lock" aria-label="Grown-ups: press and hold"><span class="lock-ring"></span>' + ART.icon.lock + '<span class="lock-txt">Grown-ups</span></button>'; }
  function wireLock(el) {
    const b = el.querySelector('.lock'); if (!b) return;
    let timer = null;
    const start = (e) => { e.preventDefault(); b.classList.add('holding'); timer = setTimeout(() => { b.classList.remove('holding'); grownups(); }, 3000); };
    const stop = () => { clearTimeout(timer); b.classList.remove('holding'); };
    b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function fmtTime(ms) { const d = new Date(ms); return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }

  function grownups(note) {
    rollDay();
    const L = load('log', []);
    const usedMin = Math.floor(usage.secs / 60), limMin = Math.round(limitSecs() / 60);
    const stepper = (key, label, min, max, step, unit) => '<div class="set-row"><span>' + label + '</span><div class="stepper" data-k="' + key + '" data-min="' + min + '" data-max="' + max + '" data-step="' + step + '"><button aria-label="Less">−</button><b>' + settings[key] + (unit || '') + '</b><button aria-label="More">+</button></div></div>';
    const el = $('<div class="screen grown">' +
      '<div class="g-top"><div><h1>Grown-ups</h1><div class="sub">Lesson pack: ' + esc(lessons.version) + ' · app ' + APP_VERSION + ' · ' + (navigator.onLine ? 'online' : 'offline') + ' · <span id="offl">checking offline copy…</span><br><span id="savechk">checking saving…</span></div></div><div class="g-btns" style="margin:0"><button class="g-btn primary" id="back">Back to the kid screen</button></div></div>' +
      (note ? '<div class="g-note">' + esc(note) + '</div>' : '') +
      '<div class="g-grid">' +
      '<section class="g-card"><h2>Today</h2><div class="big-stat">' + usedMin + ' <small>of ' + limMin + ' min</small></div><div class="g-btns"><button class="g-btn" id="plus">+15 min today</button><button class="g-btn" id="resetday">Reset today’s time</button></div>' +
      '<h2>This week</h2><ul class="focus">' + (lessons.focus || []).map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></section>' +
      '<section class="g-card"><h2>Play one game</h2><div class="g-games">' + Object.keys(GAMES).filter((k) => AREAS.some((a) => a.games.indexOf(k) >= 0)).map((k) => '<button class="g-btn" data-g="' + k + '">' + esc(GAMES[k].title) + '</button>').join('') + '</div>' +
      '<h2>Settings</h2>' + stepper('dailyMin', 'Daily limit', 5, 60, 5, ' min') + stepper('countMax', 'Count up to', 3, 20, 1) +
      '<div class="set-row"><span>Child’s name (stays on this tablet)</span><input id="kidname" class="g-input" type="text" maxlength="20" value="' + esc(kidName()) + '" placeholder="Name"></div>' +
      '<div class="set-row"><span>Voice</span><button class="g-btn" id="voice">' + (settings.sound ? 'On' : 'Off') + '</button></div></section>' +
      '<section class="g-card wide"><div class="g-head"><h2>' + (kidName() ? esc(kidName()) + '’s work' : 'Work log') + '</h2><div class="g-btns"><button class="g-btn" id="export">Send / save log</button><button class="g-btn" id="update">Check for new lessons</button><button class="g-btn" id="clear">Clear log</button></div></div>' +
      '<div class="log"><table><thead><tr><th>When</th><th>Game</th><th>How it went</th><th>Wrong tries</th><th>Time</th></tr></thead><tbody>' +
      (L.length ? L.slice(-60).reverse().map((e) => '<tr><td>' + fmtTime(e.t) + '</td><td>' + esc(e.title) + (e.d ? ' <span class="muted">(' + esc(e.d) + ')</span>' : '') + '</td><td>' + (e.r === 'done' ? 'Finished' : e.r === 'stopped' ? 'Stopped early' : 'Skipped') + '</td><td>' + e.tries + '</td><td>' + (e.secs < 60 ? e.secs + ' s' : Math.round(e.secs / 60) + ' min') + '</td></tr>').join('') : '<tr><td colspan="5" class="muted">Nothing yet.</td></tr>') +
      '</tbody></table></div></section></div></div>');
    show('grown', el);
    storageStatus().then((t) => { const o = el.querySelector('#savechk'); if (o) { o.textContent = t.text; o.className = t.ok ? 'ok' : 'warn-txt'; } });
    offlineStatus().then((s) => { const o = el.querySelector('#offl'); if (!o) return; o.textContent = !s ? 'offline copy: not available in this browser' : s.ok ? 'Ready for offline \u2713 (everything saved on this tablet)' : 'Not fully saved yet (' + s.have + '/' + OFFLINE_FILES.length + '). Open the app once on Wi-Fi.'; o.className = s && s.ok ? 'ok' : 'warn-txt'; });
    el.querySelector('#back').addEventListener('click', () => (overLimit() ? rest() : home()));
    const am = el.querySelector('#audiomgr'); if (am) am.addEventListener('click', () => audioManager()); // Audio books page hidden with Stories
    el.querySelector('#plus').addEventListener('click', () => { const ex = settings.extra && settings.extra.date === today() ? settings.extra.mins : 0; settings.extra = { date: today(), mins: ex + 15 }; save('settings', settings); grownups('Added 15 minutes for today.'); });
    el.querySelector('#resetday').addEventListener('click', () => { usage = { date: today(), secs: 0 }; save('usage', usage); grownups('Today’s time reset.'); });
    el.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => startSet(GAMES[b.dataset.g].area, b.dataset.g)));
    el.querySelectorAll('.stepper').forEach((s) => {
      const k = s.dataset.k, mn = +s.dataset.min, mx = +s.dataset.max, st = +s.dataset.step;
      const [minus, plus] = s.querySelectorAll('button');
      const set = (v) => { settings[k] = Math.max(mn, Math.min(mx, v)); save('settings', settings); s.querySelector('b').textContent = settings[k] + (k === 'dailyMin' ? ' min' : ''); };
      minus.addEventListener('click', () => set(settings[k] - st)); plus.addEventListener('click', () => set(settings[k] + st));
    });
    const kn = el.querySelector('#kidname'); const saveName = () => { settings.childName = kn.value.trim(); save('settings', settings); }; kn.addEventListener('input', saveName); kn.addEventListener('change', saveName); kn.addEventListener('blur', saveName);
    el.querySelector('#voice').addEventListener('click', (e) => { settings.sound = !settings.sound; save('settings', settings); e.target.textContent = settings.sound ? 'On' : 'Off'; });
    el.querySelector('#export').addEventListener('click', exportLog);
    el.querySelector('#update').addEventListener('click', () => {
      if (!navigator.onLine) { grownups('You’re offline. Connect to Wi-Fi and try again.'); return; }
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
      Promise.all([fetchLessons(true), fetchStories(true).catch(() => false)]).then(([a, b]) => grownups(a || b ? 'New lessons or stories loaded.' : 'Already up to date.')).catch(() => grownups('Couldn’t reach the lessons. Try again on Wi-Fi.'));
    });
    const clr = el.querySelector('#clear');
    clr.addEventListener('click', () => { if (clr.dataset.sure) { save('log', []); grownups('Log cleared.'); } else { clr.dataset.sure = '1'; clr.textContent = 'Tap again to clear'; clr.classList.add('warn'); } });
  }

  function exportLog() {
    const L = load('log', []);
    const rows = [['date', 'time', 'game', 'result', 'wrong_tries', 'seconds', 'detail']].concat(L.map((e) => { const d = new Date(e.t); return [d.toLocaleDateString('en-CA'), d.toTimeString().slice(0, 5), e.title, e.r, e.tries, e.secs, e.d]; }));
    const csv = rows.map((r) => r.map((v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const name = 'kiwi-play-log-' + today() + '.csv';
    try {
      const file = new File([csv], name, { type: 'text/csv' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Kiwi Play log' }).catch(() => {}); return; }
    } catch (e) { /* fall through to download */ }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- start ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  fetchStories(false).then(cacheBundledAudio).catch(() => {});
  fetchLessons(false).catch(() => {}).finally(() => { if (screen === 'boot') boot(); });
  boot();
})();
