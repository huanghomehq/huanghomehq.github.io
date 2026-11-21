/* The games. Each game gets a ctx from the app shell:
   ctx.root   element to draw into
   ctx.say(t) speak + show the instruction line      ctx.msg(t) show a message (and speak it)
   ctx.win(detail)  the game is finished (logs it, lights the next arrow)
   ctx.miss()       count a wrong try (never punished, just logged)
   ctx.lessons, ctx.settings, ctx.prog (persistent per-game progress object), ctx.saveProg() */
(function () {
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (t) => ({ leaf: 'leaves', scarecrow: 'scarecrows', hero: 'superheroes', firetruck: 'fire trucks', dumptruck: 'dump trucks', cone: 'cones', bus: 'buses', fish: 'fish', dish: 'dishes' }[t] || t + 's');

  /* ---------------- Letter tracing ---------------- */
  // Letters live in a 100 x 115 box: top 10, midline 40, baseline 80, descender 105.
  function line(x0, y0, x1, y1) { const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2)); const p = []; for (let i = 0; i <= n; i++) p.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); return p; }
  function arc(cx, cy, r, a0, a1) { const n = Math.max(3, Math.ceil(Math.abs(a1 - a0) / 6)); const p = []; for (let i = 0; i <= n; i++) { const t = (a0 + (a1 - a0) * i / n) * Math.PI / 180; p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } return p; }
  const cat = (...parts) => parts.reduce((a, b) => a.concat(a.length ? b.slice(1) : b), []);
  const LETTERS = {
    J: [{ p: cat(line(62, 10, 62, 64), arc(44, 64, 18, 0, 160)) }, { p: line(38, 10, 86, 10), rev: true }],
    a: [{ p: cat(arc(50, 60, 20, -30, -390), line(70, 40, 70, 80)) }],
    y: [{ p: line(30, 40, 50, 80) }, { p: line(70, 40, 40, 105) }],
    d: [{ p: cat(arc(45, 60, 20, -30, -390), line(65, 10, 65, 80)) }],
    e: [{ p: cat(line(30, 60, 70, 60), arc(50, 60, 20, 0, -315)) }],
    n: [{ p: line(32, 40, 32, 80) }, { p: cat(line(32, 80, 32, 56), arc(50, 56, 18, 180, 360), line(68, 56, 68, 80)) }],
    m: [{ p: line(22, 40, 22, 80) }, { p: cat(line(22, 80, 22, 54), arc(36, 54, 14, 180, 360), line(50, 54, 50, 80)) }, { p: cat(line(50, 80, 50, 54), arc(64, 54, 14, 180, 360), line(78, 54, 78, 80)) }],
    o: [{ p: arc(50, 60, 20, -90, -450) }],
    c: [{ p: arc(50, 60, 20, -40, -320) }],
    s: [{ p: cat(arc(50, 50, 10, -20, -270), arc(50, 70, 10, -90, 160)) }],
    t: [{ p: line(50, 18, 50, 80) }, { p: line(36, 40, 64, 40), rev: true }],
    L: [{ p: cat(line(34, 10, 34, 80), line(34, 80, 74, 80)) }],
    T: [{ p: line(50, 10, 50, 80) }, { p: line(24, 10, 76, 10), rev: true }],
    I: [{ p: line(50, 10, 50, 80) }, { p: line(34, 10, 66, 10), rev: true }, { p: line(34, 80, 66, 80), rev: true }],
    O: [{ p: arc(50, 45, 32, -90, -450) }],
    C: [{ p: arc(52, 45, 32, -40, -320) }],
    U: [{ p: cat(line(30, 10, 30, 58), arc(50, 58, 20, 180, 0), line(70, 58, 70, 10)) }],
    H: [{ p: line(28, 10, 28, 80) }, { p: line(72, 10, 72, 80) }, { p: line(28, 45, 72, 45), rev: true }],
    E: [{ p: line(32, 10, 32, 80) }, { p: line(32, 10, 72, 10), rev: true }, { p: line(32, 45, 64, 45), rev: true }, { p: line(32, 80, 72, 80), rev: true }],
    F: [{ p: line(32, 10, 32, 80) }, { p: line(32, 10, 72, 10), rev: true }, { p: line(32, 45, 64, 45), rev: true }],
    A: [{ p: line(50, 10, 24, 80) }, { p: line(50, 10, 76, 80) }, { p: line(34, 54, 66, 54), rev: true }],
    B: [{ p: line(30, 10, 30, 80) }, { p: cat(line(30, 10, 52, 10), arc(52, 27.5, 17.5, -90, 90), line(52, 45, 30, 45)) }, { p: cat(line(30, 45, 55, 45), arc(55, 62.5, 17.5, -90, 90), line(55, 80, 30, 80)) }],
    D: [{ p: line(30, 10, 30, 80) }, { p: cat(line(30, 10, 42, 10), arc(42, 45, 35, -90, 90), line(42, 80, 30, 80)) }],
    G: [{ p: cat(arc(52, 45, 32, -40, -360), line(84, 45, 60, 45)) }],
    K: [{ p: line(30, 10, 30, 80) }, { p: line(72, 10, 30, 50) }, { p: line(44, 37, 72, 80) }],
    M: [{ p: line(22, 80, 22, 10) }, { p: cat(line(22, 10, 50, 52), line(50, 52, 78, 10)) }, { p: line(78, 10, 78, 80) }],
    N: [{ p: line(28, 80, 28, 10) }, { p: line(28, 10, 72, 80) }, { p: line(72, 80, 72, 10) }],
    P: [{ p: line(30, 10, 30, 80) }, { p: cat(line(30, 10, 52, 10), arc(52, 27.5, 17.5, -90, 90), line(52, 45, 30, 45)) }],
    Q: [{ p: arc(50, 45, 32, -90, -450) }, { p: line(58, 58, 80, 82) }],
    R: [{ p: line(30, 10, 30, 80) }, { p: cat(line(30, 10, 52, 10), arc(52, 27.5, 17.5, -90, 90), line(52, 45, 30, 45)) }, { p: line(46, 45, 72, 80) }],
    S: [{ p: cat(arc(50, 27.5, 17.5, -20, -270), arc(50, 62.5, 17.5, -90, 160)) }],
    V: [{ p: cat(line(24, 10, 50, 80), line(50, 80, 76, 10)) }],
    W: [{ p: cat(line(16, 10, 32, 80), line(32, 80, 50, 32), line(50, 32, 68, 80), line(68, 80, 84, 10)) }],
    X: [{ p: line(26, 10, 74, 80) }, { p: line(74, 10, 26, 80) }],
    Y: [{ p: line(26, 10, 50, 45) }, { p: line(74, 10, 50, 45) }, { p: line(50, 45, 50, 80) }],
    Z: [{ p: cat(line(26, 10, 74, 10), line(74, 10, 26, 80), line(26, 80, 74, 80)) }],
    // numbers (same box)
    8: [{ p: cat(arc(50, 27, 17, -20, -270), arc(50, 62, 18, -90, 270), arc(50, 27, 17, 90, -20)) }],
    9: [{ p: cat(arc(50, 30, 18, 0, -360), line(68, 30, 66, 80)) }],
    1: [{ p: cat(line(38, 22, 52, 10), line(52, 10, 52, 80)) }],
    2: [{ p: cat(arc(50, 30, 20, -170, 20), line(68.8, 36.8, 30, 80), line(30, 80, 72, 80)) }],
    3: [{ p: cat(arc(48, 27, 17, -160, 90), arc(48, 61, 19, -90, 160)) }],
    4: [{ p: cat(line(58, 10, 26, 58), line(26, 58, 76, 58)) }, { p: line(60, 30, 60, 80) }],
    5: [{ p: cat(line(36, 10, 34, 40), arc(48, 58, 22, -125, 150)) }, { p: line(36, 10, 70, 10), rev: true }],
    6: [{ p: cat(line(64, 10, 36, 50), arc(50, 62, 18, 180, 540)) }],
    7: [{ p: cat(line(26, 10, 74, 10), line(74, 10, 42, 80)) }],

    0: [{ p: arc(50, 45, 24, -90, -450) }]
  };
  const pathD = (pts) => pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');

  const isDigit = (c) => /^[0-9]$/.test(c);
  const wordFor = (L) => isDigit(L) ? 'the number ' + L : (L === L.toUpperCase() ? 'big ' : 'little ') + L;
  // Letters alternate between the class's letters of the week and his name.
  function chooseLetter(ctx) {
    const week = (ctx.lessons.traceLetters && ctx.lessons.traceLetters.length) ? ctx.lessons.traceLetters : ['U', 'H'];
    const name = (ctx.lessons.nameLetters && ctx.lessons.nameLetters.length) ? ctx.lessons.nameLetters : [];
    const n = ctx.prog.n || 0, useName = name.length > 0 && n % 2 === 1;
    const list = useName ? name : week, key = useName ? 'iName' : 'iWeek';
    const k = (ctx.prog[key] || 0) % list.length, L = list[k];
    return { list, k, L, caption: useName && k === 0 ? L + ' is for ' + ctx.lessons.name : cap(wordFor(L)), done: () => { ctx.prog[key] = k + 1; ctx.prog.n = n + 1; } };
  }
  function chooseNumber(ctx) {
    const list = (ctx.lessons.traceNumbers && ctx.lessons.traceNumbers.length) ? ctx.lessons.traceNumbers.map(String) : ['8', '9'];
    const k = (ctx.prog.i || 0) % list.length, L = list[k];
    return { list, k, L, caption: 'The number ' + L, done: () => { ctx.prog.i = k + 1; } };
  }
  const makeTrace = (id, area, title, choose) => ({
    id, area, title,
    render(ctx) {
      const c = choose(ctx), name = c.list, k = c.k, L = c.L;
      const def = LETTERS[L] || LETTERS.o;
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="main card trace-area"></div><div class="side"></div></div>');
      ctx.root.appendChild(wrap);
      const main = wrap.querySelector('.main'), side = wrap.querySelector('.side');
      const row = $('<div class="name-row"></div>');
      const from = name.length > 9 ? Math.max(0, Math.min(k - 4, name.length - 9)) : 0;
      name.slice(from, from + 9).forEach((ch, j) => { const i = from + j; row.appendChild($('<div class="tile ' + (i === k ? 'on' : i < k ? 'did' : '') + '">' + ch + '</div>')); });
      side.appendChild(row);
      side.appendChild($('<div class="card big-letter"><div class="glyph">' + L + '</div><div>' + c.caption + '</div></div>'));
      const again = $('<button class="kid-btn plain wide" aria-label="Start over">' + ART.icon.restart + '</button>');
      side.appendChild(again);
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 115'); svg.setAttribute('class', 'trace-svg');
      main.appendChild(svg);
      let si = 0, idx = 0, cur = null, down = false, ink = [], misses = 0;
      const strokes = def.map((s) => ({ p: s.p, rev: !!s.rev }));
      function draw() {
        let h = '';
        strokes.forEach((s) => { h += '<path d="' + pathD(s.p) + '" fill="none" stroke="#E3EAE6" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>'; });
        strokes.forEach((s) => { h += '<path d="' + pathD(s.p) + '" fill="none" stroke="#B9C7C3" stroke-width="1.2" stroke-dasharray="1 4" stroke-linecap="round"/>'; });
        for (let i = 0; i < si; i++) h += '<path d="' + pathD(strokes[i].p) + '" fill="none" stroke="#2F6F6A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
        if (si < strokes.length) {
          const pts = cur || strokes[si].p;
          if (idx > 0) h += '<path d="' + pathD(pts.slice(0, idx + 1)) + '" fill="none" stroke="#2F6F6A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
          if (ink.length > 1) h += '<path d="' + pathD(ink) + '" fill="none" stroke="#2F6F6A" stroke-opacity="0.25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
          const st = idx > 0 ? pts[idx] : strokes[si].p[0];
          h += '<circle cx="' + st[0] + '" cy="' + st[1] + '" r="6.5" fill="#F2C46B"/>';
          if (idx === 0) h += '<text x="' + st[0] + '" y="' + (st[1] + 2.6) + '" text-anchor="middle" font-size="7.5" font-weight="700" fill="#1F3B39" font-family="Andika, sans-serif">' + (si + 1) + '</text>';
        }
        svg.innerHTML = h;
      }
      function pt(e) { const m = svg.getScreenCTM(); const q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; const r = q.matrixTransform(m.inverse()); return [r.x, r.y]; }
      const near = (a, b, d) => Math.hypot(a[0] - b[0], a[1] - b[1]) < d;
      svg.addEventListener('pointerdown', (e) => {
        if (si >= strokes.length) return;
        const p = pt(e), s = strokes[si];
        if (idx === 0) {
          if (near(p, s.p[0], 13)) cur = s.p;
          else if (s.rev && near(p, s.p[s.p.length - 1], 13)) cur = s.p.slice().reverse();
          else { misses++; ctx.msg('Start on the yellow dot.'); return; }
        } else if (!near(p, cur[idx], 15)) { ctx.msg('Keep going from the yellow dot.'); return; }
        down = true; ink = [p]; svg.setPointerCapture(e.pointerId); draw();
      });
      svg.addEventListener('pointermove', (e) => {
        if (!down) return;
        const p = pt(e); ink.push(p);
        let best = -1, bd = 12;
        for (let j = idx + 1; j <= Math.min(idx + 9, cur.length - 1); j++) { const d = Math.hypot(p[0] - cur[j][0], p[1] - cur[j][1]); if (d < bd) { bd = d; best = j; } }
        if (best > idx) idx = best;
        if (idx >= cur.length - 2) {
          si++; idx = 0; cur = null; down = false; ink = [];
          if (si >= strokes.length) { draw(); c.done(); ctx.saveProg(); ctx.win({ letter: L, misses }); return; }
          ctx.msg('Good! Now line ' + (si + 1) + '.');
        }
        draw();
      });
      const up = () => { down = false; ink = []; draw(); };
      svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
      again.addEventListener('click', () => { si = 0; idx = 0; cur = null; ink = []; draw(); ctx.say('Trace ' + wordFor(L) + '. Start on the yellow dot.'); });
      draw();
      ctx.say('Trace ' + wordFor(L) + '. Start on the yellow dot.');
      ctx.winText = 'You traced ' + (isDigit(L) ? 'the number ' : '') + L + '!';
    }
  });
  const trace = makeTrace('trace', 'letters', 'Trace a letter', chooseLetter);
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), NUMS = '0123456789'.split('');
  const inOrder = (list, label) => (ctx) => { const k = (ctx.prog.i || 0) % list.length, L = list[k]; return { list, k, L, caption: label(L), done: () => { ctx.prog.i = k + 1; } }; };
  const abc = makeTrace('abc', 'letters', 'ABC trace', inOrder(ABC, (L) => 'Big ' + L));
  const nums = makeTrace('nums', 'numbers', '123 trace', inOrder(NUMS, (L) => 'The number ' + L));
  const traceNum = makeTrace('traceNum', 'numbers', 'Trace a number', chooseNumber);

  /* ---------------- How many? ---------------- */
  const count = {
    id: 'count', area: 'numbers', title: 'How many?',
    render(ctx) {
      const max = ctx.settings.countMax;
      let n; do { n = 1 + Math.floor(Math.random() * max); } while (n === ctx.prog.last && max > 1);
      ctx.prog.last = n; ctx.saveProg();
      const thing = pick(ctx.lessons.countThings || ['apple']);
      const plurals = plural(thing);
      const opts = new Set([n]);
      shuffle([n - 1, n + 1, n + 2, n - 2]).forEach((v) => { if (opts.size < 3 && v >= 1 && v <= max + 2) opts.add(v); });
      const choices = shuffle([...opts]);
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="main card count-card"><div class="sentence">I see <span class="blank">?</span> ' + plurals + '.</div><div class="objects"></div></div><div class="side choices"></div></div>');
      ctx.root.appendChild(wrap);
      const main = wrap.querySelector('.objects'), side = wrap.querySelector('.side'), blank = wrap.querySelector('.blank');
      if (n > 10) main.classList.add('many');
      let tapped = 0, solved = false;
      for (let i = 0; i < n; i++) {
        const b = $('<button class="obj" aria-label="' + thing + '">' + ART.pic(thing) + '<span class="badge"></span></button>');
        b.addEventListener('click', () => { if (b.classList.contains('counted')) return; tapped++; b.classList.add('counted'); b.querySelector('.badge').textContent = tapped; ctx.speak(String(tapped)); });
        main.appendChild(b);
      }
      choices.forEach((v) => {
        const b = $('<button class="num-btn">' + v + '</button>');
        b.addEventListener('click', () => {
          if (solved) return;
          if (v === n) { solved = true; b.classList.add('right'); blank.textContent = n; blank.classList.add('filled'); ctx.winText = 'I see ' + NUMW[n] + ' ' + (n === 1 ? thing : plurals) + '!'; ctx.win({ n, thing }); }
          else { ctx.miss(); b.classList.add('nope'); ctx.msg('Let’s count together. Touch each one.'); }
        });
        side.appendChild(b);
      });
      ctx.say('How many ' + plurals + '? Touch each one and count.');
    }
  };

  /* ---------------- Fill the basket ---------------- */
  const basket = {
    id: 'basket', area: 'numbers', title: 'Fill the basket',
    render(ctx) {
      const max = Math.min(ctx.settings.countMax, 10);
      let n; do { n = 2 + Math.floor(Math.random() * Math.max(1, max - 1)); } while (n === ctx.prog.last && max > 2);
      ctx.prog.last = n; ctx.saveProg();
      const thing = pick(ctx.lessons.countThings || ['acorn']);
      const total = Math.min(n + 3, 12);
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="main card field"></div><div class="side"><div class="card basket"><div class="bcount">0</div><div class="bpic">' + ART.pic('basket') + '</div></div><button class="kid-btn plain wide out" aria-label="Take one out">' + ART.icon.takeOut + '</button></div></div>');
      ctx.root.appendChild(wrap);
      const field = wrap.querySelector('.field'), bc = wrap.querySelector('.bcount');
      if (total > 8) field.classList.add('many');
      let inB = [], done = false;
      const update = () => {
        bc.textContent = inB.length;
        if (done) return;
        if (inB.length === n) { done = true; ctx.winText = cap(NUMW[n]) + '! You did it.'; ctx.win({ n, thing }); }
        else if (inB.length > n) { ctx.miss(); ctx.msg('That’s ' + NUMW[inB.length] + '. Too many — take one out.'); }
        else if (inB.length > 0) ctx.speak(cap(NUMW[inB.length]));
      };
      for (let i = 0; i < total; i++) {
        const b = $('<button class="obj" aria-label="' + thing + '">' + ART.pic(thing) + '</button>');
        b.addEventListener('click', () => { if (done || b.classList.contains('gone')) return; b.classList.add('gone'); inB.push(b); update(); });
        field.appendChild(b);
      }
      wrap.querySelector('.out').addEventListener('click', () => { if (done) return; const b = inB.pop(); if (b) { b.classList.remove('gone'); bc.textContent = inB.length; if (inB.length === n) update(); } });
      ctx.say('Put ' + NUMW[n] + ' ' + plural(thing) + ' in the basket.');
    }
  };

  /* ---------------- Color by number / color by letter ---------------- */
  const BROWN = '#8A5A33', GREEN = '#7E9A4F', RED = '#C9473A', ORANGE = '#E08A3C', YELLOW = '#EBC34F';
  const feather = (deg, want) => { const t = deg * Math.PI / 180, cx = 200 + 112 * Math.cos(t), cy = 215 + 112 * Math.sin(t); return { el: 'ellipse', a: { cx: cx.toFixed(1), cy: cy.toFixed(1), rx: 30, ry: 66, transform: 'rotate(' + (deg + 90) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')' }, want, lx: cx, ly: cy + 8, fs: 26 }; };
  const PICS = {
    pumpkin: { name: 'pumpkin', keys: [['1', ORANGE, 'orange'], ['2', GREEN, 'green'], ['3', BROWN, 'brown']], regions: [
      { el: 'path', a: { d: 'M222 78 C262 36 312 56 324 80 C292 104 250 102 222 78 Z' }, want: '2', lx: 270, ly: 86, fs: 26 },
      { el: 'path', a: { d: 'M186 120 L216 120 L224 62 L192 56 Z' }, want: '3', lx: 206, ly: 100, fs: 26 },
      { el: 'ellipse', a: { cx: 135, cy: 245, rx: 92, ry: 122 }, want: '1', lx: 90, ly: 255, fs: 34 },
      { el: 'ellipse', a: { cx: 265, cy: 245, rx: 92, ry: 122 }, want: '1', lx: 310, ly: 255, fs: 34 },
      { el: 'ellipse', a: { cx: 200, cy: 245, rx: 78, ry: 132 }, want: '1', lx: 200, ly: 255, fs: 34 }] },
    apple: { name: 'apple', keys: [['1', RED, 'red'], ['2', GREEN, 'green'], ['3', BROWN, 'brown'], ['4', '#F2D27E', 'yellow']], regions: [
      { el: 'path', a: { d: 'M206 112 C214 70 232 50 256 44 L262 56 C240 64 226 82 220 114 Z' }, want: '3', lx: 238, ly: 70, fs: 22 },
      { el: 'path', a: { d: 'M228 96 C258 52 312 56 330 76 C300 112 254 116 228 96 Z' }, want: '2', lx: 286, ly: 92, fs: 26 },
      { el: 'path', a: { d: 'M200 120 C150 90 70 110 70 200 C70 300 140 360 200 340 C260 360 330 300 330 200 C330 110 250 90 200 120 Z' }, want: '1', lx: 200, ly: 240, fs: 40 },
      { el: 'ellipse', a: { cx: 140, cy: 180, rx: 18, ry: 30 }, want: '4', lx: 140, ly: 190, fs: 22 }] },
    firetruck: { name: 'fire truck', keys: [['1', '#C9473A', 'red'], ['2', '#2B3B39', 'black'], ['3', '#EBC34F', 'yellow'], ['4', '#4A6FA5', 'blue']], regions: [
      { el: 'rect', a: { x: 60, y: 172, width: 222, height: 100, rx: 6 }, want: '1', lx: 140, ly: 262, fs: 26 },
      { el: 'path', a: { d: 'M280 272 V186 C280 176 288 168 298 168 H326 L352 212 V272 Z' }, want: '1', lx: 318, ly: 258, fs: 22 },
      { el: 'path', a: { d: 'M292 180 H321 L340 210 H292 Z' }, want: '4', lx: 312, ly: 204, fs: 16 },
      { el: 'rect', a: { x: 172, y: 192, width: 86, height: 52, rx: 6 }, want: '4', lx: 215, ly: 226, fs: 22 },
      { el: 'rect', a: { x: 70, y: 148, width: 200, height: 20, rx: 6 }, want: '3', lx: 170, ly: 164, fs: 16 },
      { el: 'rect', a: { x: 296, y: 148, width: 28, height: 16, rx: 5 }, want: '3', lx: 310, ly: 161, fs: 13 },
      { el: 'circle', a: { cx: 110, cy: 220, r: 24 }, want: '3', lx: 110, ly: 228, fs: 20 },
      { el: 'circle', a: { cx: 105, cy: 282, r: 28 }, want: '2', lx: 105, ly: 290, fs: 20 },
      { el: 'circle', a: { cx: 180, cy: 282, r: 28 }, want: '2', lx: 180, ly: 290, fs: 20 },
      { el: 'circle', a: { cx: 318, cy: 282, r: 28 }, want: '2', lx: 318, ly: 290, fs: 20 }],
      decor: '<circle cx="105" cy="282" r="9" fill="#9AABA7"/><circle cx="180" cy="282" r="9" fill="#9AABA7"/><circle cx="318" cy="282" r="9" fill="#9AABA7"/><path d="M80 148 V168 M100 148 V168 M120 148 V168 M140 148 V168 M160 148 V168 M180 148 V168 M200 148 V168 M220 148 V168 M240 148 V168" stroke="#5E6E6B" stroke-width="2"/><path d="M40 312 H360" stroke="#5E6E6B" stroke-width="3"/>' },
    hero: { name: 'superhero', letters: true, keys: [['H', BROWN, 'brown'], ['L', YELLOW, 'yellow'], ['E', RED, 'red'], ['F', GREEN, 'green']], under: '<circle cx="200" cy="100" r="34" fill="#F3D7BE" stroke="#5E6E6B" stroke-width="3"/>', regions: [
      { el: 'path', a: { d: 'M165 150 L110 340 H290 L235 150 Z' }, want: 'E', lx: 128, ly: 320, fs: 20 },
      { el: 'rect', a: { x: 140, y: 150, width: 28, height: 90, rx: 12 }, want: 'F', lx: 154, ly: 205, fs: 16 },
      { el: 'rect', a: { x: 232, y: 150, width: 28, height: 90, rx: 12 }, want: 'F', lx: 246, ly: 205, fs: 16 },
      { el: 'rect', a: { x: 165, y: 145, width: 70, height: 110, rx: 18 }, want: 'F', lx: 222, ly: 232, fs: 14 },
      { el: 'rect', a: { x: 168, y: 250, width: 28, height: 66, rx: 8 }, want: 'F', lx: 182, ly: 290, fs: 16 },
      { el: 'rect', a: { x: 204, y: 250, width: 28, height: 66, rx: 8 }, want: 'F', lx: 218, ly: 290, fs: 16 },
      { el: 'rect', a: { x: 160, y: 312, width: 40, height: 24, rx: 8 }, want: 'H', lx: 180, ly: 330, fs: 15 },
      { el: 'rect', a: { x: 200, y: 312, width: 40, height: 24, rx: 8 }, want: 'H', lx: 220, ly: 330, fs: 15 },
      { el: 'rect', a: { x: 165, y: 236, width: 70, height: 14, rx: 5 }, want: 'L', lx: 200, ly: 248, fs: 12 },
      { el: 'path', a: { d: 'M200 170 L206 184 L221 185 L209 195 L213 210 L200 201 L187 210 L191 195 L179 185 L194 184 Z' }, want: 'L', lx: 200, ly: 197, fs: 10 },
      { el: 'path', a: { d: 'M166 94 C170 58 230 58 234 94 C216 80 184 80 166 94 Z' }, want: 'H', lx: 200, ly: 80, fs: 14 },
      { el: 'path', a: { d: 'M167 102 C185 90 215 90 233 102 C228 118 172 118 167 102 Z' }, want: 'E', lx: 214, ly: 110, fs: 11 }],
      decor: '<circle cx="187" cy="103" r="4" fill="#1F3B39"/><circle cx="213" cy="103" r="4" fill="#1F3B39"/><path d="M188 120 C195 126 205 126 212 120" fill="none" stroke="#1F3B39" stroke-width="3" stroke-linecap="round"/>' },
    // Color by letter, like his class's turkey page: H brown, T orange, L yellow, E red, F green
    turkey: { name: 'turkey', letters: true, keys: [['H', BROWN, 'brown'], ['T', ORANGE, 'orange'], ['L', YELLOW, 'yellow'], ['E', RED, 'red'], ['F', GREEN, 'green']], regions: [
      feather(-165, 'F'), feather(-130, 'L'), feather(-90, 'F'), feather(-50, 'L'), feather(-15, 'F'),
      { el: 'path', a: { d: 'M62 352 C60 318 86 300 112 308 C110 334 92 352 62 352 Z' }, want: 'L', lx: 92, ly: 336, fs: 22 },
      { el: 'path', a: { d: 'M338 352 C340 318 314 300 288 308 C290 334 308 352 338 352 Z' }, want: 'L', lx: 308, ly: 336, fs: 22 },
      { el: 'ellipse', a: { cx: 176, cy: 340, rx: 16, ry: 12 }, want: 'T', lx: 176, ly: 347, fs: 18 },
      { el: 'ellipse', a: { cx: 224, cy: 340, rx: 16, ry: 12 }, want: 'T', lx: 224, ly: 347, fs: 18 },
      { el: 'ellipse', a: { cx: 200, cy: 255, rx: 78, ry: 82 }, want: 'H', lx: 200, ly: 280, fs: 30 },
      { el: 'circle', a: { cx: 200, cy: 165, r: 46 }, want: 'H', lx: 172, ly: 146, fs: 24 },
      { el: 'path', a: { d: 'M186 170 L214 170 L200 194 Z' }, want: 'T', lx: 200, ly: 184, fs: 14 },
      { el: 'ellipse', a: { cx: 222, cy: 198, rx: 10, ry: 18 }, want: 'E', lx: 222, ly: 204, fs: 15 }],
      decor: '<circle cx="182" cy="156" r="7" fill="#1F3B39"/><circle cx="218" cy="156" r="7" fill="#1F3B39"/>' }
  };
  const colorPic = {
    id: 'color', area: 'make', title: 'Color by number or letter',
    render(ctx) {
      const list = (ctx.lessons.colorPictures || ['pumpkin', 'apple']).filter((k) => PICS[k]);
      const key = list[(ctx.prog.i || 0) % list.length]; ctx.prog.i = (ctx.prog.i || 0) + 1; ctx.saveProg();
      const pic = PICS[key];
      const keyOf = {}; pic.keys.forEach((k) => { keyOf[k[0]] = k; });
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="main card center"></div><div class="side paints' + (pic.keys.length > 4 ? ' five' : '') + '"></div></div>');
      ctx.root.appendChild(wrap);
      const main = wrap.querySelector('.main'), side = wrap.querySelector('.side');
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '40 30 320 340'); svg.setAttribute('class', 'color-svg');
      main.appendChild(svg);
      let sel = pic.keys[0][0], done = false;
      const filled = pic.regions.map(() => '');
      if (pic.under) { const u = document.createElementNS(NS, 'g'); u.setAttribute('pointer-events', 'none'); u.innerHTML = pic.under; svg.appendChild(u); }
      pic.regions.forEach((r, i) => {
        const e = document.createElementNS(NS, r.el);
        Object.entries(r.a).forEach(([k, v]) => e.setAttribute(k, v));
        e.setAttribute('fill', '#FFFFFF'); e.setAttribute('stroke', '#5E6E6B'); e.setAttribute('stroke-width', '3');
        e.addEventListener('click', () => {
          if (done) return;
          filled[i] = sel; e.setAttribute('fill', keyOf[sel][1]);
          if (sel !== r.want) { ctx.miss(); ctx.msg(pic.letters ? 'Hmm, look at the letter again.' : 'Hmm, look at the number again.'); }
          else if (filled.every((f, j) => f === pic.regions[j].want)) { done = true; ctx.winText = 'Your ' + pic.name + ' is done! It\u2019s in your pictures.'; if (ctx.saveArt) ctx.saveArt(svg); ctx.win({ picture: key }); }
          else ctx.speak('Yes!');
        });
        svg.appendChild(e);
      });
      if (pic.decor) { const g = document.createElementNS(NS, 'g'); g.setAttribute('pointer-events', 'none'); g.innerHTML = pic.decor; svg.appendChild(g); }
      pic.regions.forEach((r) => { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', r.lx); t.setAttribute('y', r.ly); t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', r.fs); t.setAttribute('font-weight', '700'); t.setAttribute('font-family', 'Andika, sans-serif'); t.setAttribute('fill', '#1F3B39'); t.setAttribute('pointer-events', 'none'); t.textContent = r.want; svg.appendChild(t); });
      const btns = [];
      pic.keys.forEach(([lab, col, cname]) => {
        const b = $('<button class="paint" aria-label="' + cname + ' paint, ' + lab + '"><span class="pot" style="background:' + col + '"></span><span class="pn">' + lab + '</span></button>');
        b.addEventListener('click', () => { sel = lab; btns.forEach((x) => x.classList.toggle('on', x === b)); ctx.speak(pic.letters ? lab + ' is ' + cname : cname); });
        if (lab === sel) b.classList.add('on');
        btns.push(b); side.appendChild(b);
      });
      ctx.say('Color the ' + pic.name + '. Pick a crayon, then find its ' + (pic.letters ? 'letter.' : 'number.'));
    }
  };

  /* ---------------- I spy the letter / number ---------------- */
  const CRAYONS = ['#E89AC7', '#4A6FA5', '#EBC34F', '#7E9A4F', '#C9473A', '#8A6FB0', '#E08A3C', BROWN];
  const makeSpy = (id, area, title, listKey, fallback, pool, noun) => ({
    id, area, title,
    render(ctx) {
      const list = (ctx.lessons[listKey] && ctx.lessons[listKey].length) ? ctx.lessons[listKey].map(String) : fallback;
      // mostly this week's letters/numbers, sometimes any other one for variety
      const T = Math.random() < 0.35 ? pool[Math.floor(Math.random() * pool.length)] : list[(ctx.prog.i || 0) % list.length]; ctx.prog.i = (ctx.prog.i || 0) + 1; ctx.saveProg();
      const others = pool.split('').filter((c) => c !== T);
      const nT = 6, cells = shuffle(Array(nT).fill(T).concat(shuffle(others).slice(0, 18 - nT)));
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="main card spy-grid"></div><div class="side"><div class="card spy-target"><div class="spy-big">' + T + '</div><div class="spy-slots">' + '<i></i>'.repeat(nT) + '</div></div></div></div>');
      ctx.root.appendChild(wrap);
      const grid = wrap.querySelector('.spy-grid'), slots = wrap.querySelectorAll('.spy-slots i');
      let found = 0, done = false;
      cells.forEach((ch) => {
        const b = $('<button class="spy-dot">' + ch + '</button>');
        b.addEventListener('click', () => {
          if (done || b.classList.contains('hit')) return;
          if (ch === T) {
            b.style.background = CRAYONS[found % CRAYONS.length]; slots[found].style.background = CRAYONS[found % CRAYONS.length]; b.classList.add('hit'); found++;
            if (found === nT) { done = true; ctx.winText = 'You found all the ' + T + '’s!'; ctx.win({ target: T }); } else ctx.speak(String(found));
          } else { ctx.miss(); b.classList.add('wobble'); setTimeout(() => b.classList.remove('wobble'), 500); ctx.msg('That’s ' + (noun === 'letter' ? (/[AEFHILMNORSX]/.test(ch) ? 'an ' : 'a ') + ch : ch) + '. Look for ' + T + '.'); }
        });
        grid.appendChild(b);
      });
      ctx.say('I spy the ' + noun + ' ' + T + '! Find all the ' + T + '’s.');
    }
  });
  const spy = makeSpy('spy', 'letters', 'I spy the letter', 'spyLetters', ['U', 'H'], 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'letter');
  const spyNum = makeSpy('spyNum', 'numbers', 'Find the number', 'spyNumbers', ['8', '9'], '1234567890', 'number');

  /* ---------------- Rhyme match ---------------- */
  const rhyme = {
    id: 'rhyme', area: 'words', title: 'Rhyme match',
    render(ctx) {
      const sets = (ctx.lessons.rhymes || []).filter((s) => ART.has(s.word) && ART.has(s.answer));
      const s = sets[(ctx.prog.i || 0) % sets.length]; ctx.prog.i = (ctx.prog.i || 0) + 1; ctx.saveProg();
      const opts = shuffle([s.answer].concat(s.others.filter(ART.has).slice(0, 2)));
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="card prompt-card">' + ART.pic(s.word) + '<div class="word">' + s.word + '</div></div><div class="main grid3"></div></div>');
      ctx.root.appendChild(wrap);
      const main = wrap.querySelector('.main');
      let solved = false;
      const all = [];
      opts.forEach((w) => {
        const b = $('<button class="pic-btn">' + ART.pic(w) + '<span class="lbl">' + w + '</span></button>');
        b.addEventListener('click', () => {
          if (solved) return;
          all.forEach((x) => x.classList.add('show'));
          if (w === s.answer) { solved = true; b.classList.add('right'); ctx.winText = cap(s.word) + ', ' + w + '! They sound the same at the end.'; ctx.win({ word: s.word }); }
          else { ctx.miss(); b.classList.add('nope'); ctx.msg(cap(s.word) + ', ' + w + '… listen to the end. Try again!'); }
        });
        all.push(b); main.appendChild(b);
      });
      ctx.say('What rhymes with ' + s.word + '? ' + opts.join('? ') + '?');
    }
  };

  /* ---------------- Feelings ---------------- */
  const feelings = {
    id: 'feelings', area: 'feelings', title: 'How do they feel?',
    render(ctx) {
      const list = ctx.lessons.feelings || [];
      const s = list[(ctx.prog.i || 0) % list.length]; ctx.prog.i = (ctx.prog.i || 0) + 1; ctx.saveProg();
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="main card feel-card"><div class="feel-pics"><div class="feel-face">' + ART.face(s.answer, '#F0C9A0') + '</div><div class="feel-scene">' + ART.scene(s.scene) + '</div></div><div class="feel-text">' + s.text + '</div></div><div class="side faces"></div></div>');
      ctx.root.appendChild(wrap);
      const side = wrap.querySelector('.side');
      let solved = false;
      ['happy', 'sad', 'mad', 'scared'].forEach((f) => {
        const b = $('<button class="face-btn">' + ART.face(f) + '<span>' + f + '</span></button>');
        b.addEventListener('click', () => {
          if (solved) return;
          if (f === s.answer) { solved = true; b.classList.add('right'); ctx.winText = 'Yes, ' + s.who + ' feels ' + f + '. ' + s.help; ctx.win({ scene: s.scene }); }
          else { ctx.miss(); b.classList.add('nope'); ctx.msg('Hmm. Look at ' + s.who + '’s eyes and mouth. Try again.'); }
        });
        side.appendChild(b);
      });
      ctx.say(s.text + ' How does ' + s.who + ' feel?');
    }
  };

  /* ---------------- Puzzles: finger mazes ---------------- */
  // A new maze is made every time (no two the same), and they get a little bigger as he solves them.
  const MAZE_SIZES = [[3, 2], [4, 3], [5, 3], [6, 4], [7, 4]];
  const MAZE_PAIRS = [['bee', 'flower', 'Help the bee get to the flower.'], ['hen', 'chick', 'Help the hen find her chick.'], ['dog', 'house', 'Help the dog get home.'], ['turtle', 'flower', 'Help the turtle get to the flower.'], ['kid', 'bus', 'Help {name} get to the bus.']];
  function makeMaze(c, r) {
    const open = []; for (let i = 0; i < c * r; i++) open.push({ n: 0, s: 0, e: 0, w: 0 });
    const seen = new Array(c * r).fill(false), stack = [0]; seen[0] = true;
    while (stack.length) {
      const cur = stack[stack.length - 1], x = cur % c, y = Math.floor(cur / c), nb = [];
      if (y > 0 && !seen[cur - c]) nb.push([cur - c, 'n', 's']);
      if (y < r - 1 && !seen[cur + c]) nb.push([cur + c, 's', 'n']);
      if (x < c - 1 && !seen[cur + 1]) nb.push([cur + 1, 'e', 'w']);
      if (x > 0 && !seen[cur - 1]) nb.push([cur - 1, 'w', 'e']);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, d, back] = nb[Math.floor(Math.random() * nb.length)];
      open[cur][d] = 1; open[nx][back] = 1; seen[nx] = true; stack.push(nx);
    }
    return open;
  }
  const nested = (k, x, y, s) => ART.pic(k).replace('<svg ', '<svg x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" ');
  const maze = {
    id: 'maze', area: 'puzzles', title: 'Maze',
    render(ctx) {
      const lv = Math.min(ctx.prog.lv || 0, MAZE_SIZES.length - 1), [c, r] = MAZE_SIZES[lv];
      const pair = MAZE_PAIRS[(ctx.prog.i || 0) % MAZE_PAIRS.length]; ctx.prog.i = (ctx.prog.i || 0) + 1; ctx.saveProg();
      const open = makeMaze(c, r), goal = c * r - 1, S = 100, P = 14;
      window.__maze = { open, c, r }; // used by tests
      const W = c * S + P * 2, H = r * S + P * 2;
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="main card maze-area"></div><div class="side maze-side"><div class="card maze-goal">' + ART.pic(pair[1]) + '</div><button class="kid-btn plain wide" id="mz-again" aria-label="Start over">' + ART.icon.restart + '</button></div></div>');
      ctx.root.appendChild(wrap);
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'maze-svg');
      wrap.querySelector('.maze-area').appendChild(svg);
      const cx = (i) => P + (i % c) * S + S / 2, cy = (i) => P + Math.floor(i / c) * S + S / 2;
      let walls = '<rect x="' + P + '" y="' + P + '" width="' + c * S + '" height="' + r * S + '" rx="10" fill="#F7F4EC"/>';
      for (let i = 0; i < c * r; i++) {
        const x0 = P + (i % c) * S, y0 = P + Math.floor(i / c) * S, o = open[i];
        if (!o.n) walls += '<path d="M' + x0 + ' ' + y0 + ' H' + (x0 + S) + '"/>';
        if (!o.w) walls += '<path d="M' + x0 + ' ' + y0 + ' V' + (y0 + S) + '"/>';
        if (i % c === c - 1 && !o.e) walls += '<path d="M' + (x0 + S) + ' ' + y0 + ' V' + (y0 + S) + '"/>';
        if (Math.floor(i / c) === r - 1 && !o.s) walls += '<path d="M' + x0 + ' ' + (y0 + S) + ' H' + (x0 + S) + '"/>';
      }
      let trail = [0], down = false, done = false;
      function draw() {
        const cur = trail[trail.length - 1];
        let h = '<g>' + walls.replace(/<path /g, '<path stroke="#4F625F" stroke-width="12" stroke-linecap="round" fill="none" ') + '</g>';
        h += nested(pair[1], cx(goal) - 38, cy(goal) - 38, 76);
        if (trail.length > 1) h += '<polyline points="' + trail.map((i) => cx(i) + ',' + cy(i)).join(' ') + '" fill="none" stroke="#2F6F6A" stroke-opacity="0.55" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>';
        h += '<circle cx="' + cx(cur) + '" cy="' + cy(cur) + '" r="44" fill="#F2C46B" fill-opacity="0.5"/>' + nested(pair[0], cx(cur) - 36, cy(cur) - 36, 72);
        svg.innerHTML = h;
      }
      function cellAt(e) { const m = svg.getScreenCTM(), q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; const p = q.matrixTransform(m.inverse()); const x = Math.floor((p.x - P) / S), y = Math.floor((p.y - P) / S); return x < 0 || y < 0 || x >= c || y >= r ? -1 : y * c + x; }
      function step(cell) {
        if (done || cell < 0) return;
        const cur = trail[trail.length - 1]; if (cell === cur) return;
        if (trail.length > 1 && cell === trail[trail.length - 2]) { trail.pop(); draw(); return; }
        const o = open[cur];
        const ok = (cell === cur - c && o.n) || (cell === cur + c && o.s) || (cell === cur + 1 && o.e && cur % c !== c - 1) || (cell === cur - 1 && o.w && cur % c !== 0);
        if (!ok) return;
        trail.push(cell); draw();
        if (cell === goal) { done = true; down = false; ctx.prog.lv = Math.min((ctx.prog.lv || 0) + 1, MAZE_SIZES.length - 1); ctx.saveProg(); ctx.winText = 'You did it! ' + cap(pair[1] === 'house' ? 'home' : 'the ' + pair[1]) + '!'; ctx.win({ size: c + 'x' + r }); }
      }
      svg.addEventListener('pointerdown', (e) => { if (done) return; const cell = cellAt(e), cur = trail[trail.length - 1]; if (cell === cur || (trail.length > 1 && cell === trail[trail.length - 2])) { down = true; svg.setPointerCapture(e.pointerId); step(cell); } else ctx.msg('Put your finger on the ' + pair[0] + '.'); });
      svg.addEventListener('pointermove', (e) => { if (down) step(cellAt(e)); });
      const up = () => { down = false; };
      svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
      wrap.querySelector('#mz-again').addEventListener('click', () => { if (done) return; trail = [0]; draw(); });
      draw();
      ctx.say(String(pair[2]).replace('Help {name} get', ctx.lessons.name ? 'Help ' + ctx.lessons.name + ' get' : 'Help the kid get') + ' Slide your finger along the path.');
    }
  };

  /* ---------------- Puzzles: hidden pictures (Highlights-style) ---------------- */
  // Busy outlined scenes. Each round hides 4 everyday objects plus the letter of the week, drawn as part of the
  // picture in colors close to whatever they sit on. The search panel shows each object in its real colors.
  const OBJ = {
    toothbrush: ['toothbrush', '<rect x="8" y="46" width="64" height="10" rx="5" fill="{A}"/><rect x="68" y="34" width="24" height="14" rx="3" fill="{B}"/>', '#4A6FA5', '#DCE6F2'],
    comb: ['comb', '<rect x="12" y="28" width="76" height="16" rx="4" fill="{A}"/><path d="M20 44 V70 M29 44 V70 M38 44 V70 M47 44 V70 M56 44 V70 M65 44 V70 M74 44 V70 M82 44 V70" stroke="{A}" stroke-width="5"/>', '#E8869A', '#E8869A'],
    pizza: ['slice of pizza', '<path d="M16 18 L88 30 L38 92 Z" fill="{A}"/><path d="M16 18 L88 30" stroke="{B}" stroke-width="10" stroke-linecap="round"/><circle cx="44" cy="40" r="7" fill="{B}"/><circle cx="58" cy="52" r="6" fill="{B}"/><circle cx="42" cy="64" r="5" fill="{B}"/>', '#F2C46B', '#C9473A'],
    clip: ['paper clip', '<path d="M32 84 V28 a14 14 0 0 1 28 0 V72 a8 8 0 0 1 -16 0 V36" fill="none" stroke="{A}" stroke-width="8" stroke-linecap="round"/>', '#9AABA7', '#9AABA7'],
    magnifier: ['magnifying glass', '<circle cx="40" cy="40" r="24" fill="{B}" stroke="{A}" stroke-width="10"/><path d="M58 58 L86 86" stroke="{A}" stroke-width="12" stroke-linecap="round"/>', '#2F6F6A', '#DCEBE8'],
    tophat: ['top hat', '<rect x="30" y="16" width="40" height="52" fill="{A}"/><rect x="30" y="52" width="40" height="9" fill="{B}"/><rect x="12" y="66" width="76" height="11" rx="4" fill="{A}"/>', '#2F4F7F', '#E3B341'],
    icecream: ['ice cream cone', '<path d="M32 46 L50 94 L68 46 Z" fill="{B}"/><circle cx="50" cy="36" r="21" fill="{A}"/>', '#8A5A33', '#E9C99A'],
    moon: ['moon', '<path d="M62 10 C36 12 20 32 20 54 C20 78 40 94 62 92 C46 84 38 70 38 52 C38 34 46 20 62 10 Z" fill="{A}"/>', '#F2D27E', '#F2D27E'],
    shell: ['shell', '<path d="M50 86 L14 40 C22 16 78 16 86 40 Z" fill="{A}"/><path d="M50 86 L30 24 M50 86 L50 18 M50 86 L70 24" stroke="{B}" stroke-width="4"/>', '#EBC34F', '#C99A3A'],
    bulb: ['light bulb', '<circle cx="50" cy="38" r="25" fill="{A}"/><rect x="39" y="60" width="22" height="20" rx="3" fill="{B}"/>', '#F2D27E', '#8A86A0'],
    book: ['book', '<rect x="18" y="14" width="58" height="72" rx="4" fill="{A}"/><rect x="66" y="14" width="12" height="72" fill="{B}"/>', '#4A6FA5', '#2F4F7F'],
    heart: ['heart', '<path d="M50 86 C12 58 14 22 38 22 C46 22 50 30 50 34 C50 30 54 22 62 22 C86 22 88 58 50 86 Z" fill="{A}"/>', '#C9473A', '#C9473A'],
    carrot: ['carrot', '<path d="M18 82 L68 28 L80 40 Z" fill="{A}"/><path d="M72 30 L84 12 M76 36 L94 26" stroke="{B}" stroke-width="7" stroke-linecap="round"/>', '#E08A3C', '#7E9A4F'],
    pencil: ['pencil', '<rect x="38" y="12" width="24" height="60" fill="{A}"/><path d="M38 72 L50 94 L62 72 Z" fill="{B}"/>', '#E3B341', '#E9C99A'],
    ruler: ['ruler', '<rect x="36" y="6" width="28" height="88" rx="3" fill="{A}"/><path d="M36 18 H50 M36 30 H45 M36 42 H50 M36 54 H45 M36 66 H50 M36 78 H45" stroke="{B}" stroke-width="3"/>', '#EBC34F', '#8A5A33'],
    partyhat: ['party hat', '<path d="M50 14 L78 86 H22 Z" fill="{A}"/><circle cx="50" cy="12" r="7" fill="{B}"/><path d="M34 54 H66" stroke="{B}" stroke-width="5"/>', '#E3B341', '#C9473A'],
    boot: ['boot', '<path d="M28 12 H58 V60 L84 66 C92 68 92 86 84 86 H28 Z" fill="{A}"/>', '#B07A45', '#B07A45'],
    glove: ['glove', '<path d="M30 88 V44 C30 36 38 36 38 44 V22 C38 14 46 14 46 22 V18 C46 10 54 10 54 18 V22 C54 14 62 14 62 22 V46 L72 38 C78 34 86 40 80 48 L64 72 V88 Z" fill="{A}"/>', '#7E9A4F', '#7E9A4F'],
    envelope: ['envelope', '<rect x="10" y="24" width="80" height="52" rx="4" fill="{A}"/><path d="M10 26 L50 56 L90 26" fill="none" stroke="{B}" stroke-width="4"/>', '#9FC3E6', '#4A6FA5'],
    fish: ['fish', '<path d="M12 50 C28 26 62 26 74 50 C62 74 28 74 12 50 Z M74 50 L94 32 V68 Z" fill="{A}"/><circle cx="30" cy="46" r="4" fill="{B}"/>', '#4A6FA5', '#FFFFFF'],
    star: ['star', '<path d="M50 6 L62 38 L95 39 L69 59 L78 92 L50 72 L22 92 L31 59 L5 39 L38 38 Z" fill="{A}"/>', '#E3B341', '#E3B341'],
    sock: ['sock', '<path d="M38 8 H64 V58 L80 70 C88 76 82 92 70 88 L36 74 C30 72 38 60 38 54 Z" fill="{A}"/><rect x="38" y="8" width="26" height="12" fill="{B}"/>', '#C9573C', '#E8A08A'],
    banana: ['banana', '<path d="M16 26 C20 70 60 90 90 70 C60 72 34 58 28 24 Z" fill="{A}"/>', '#EBC34F', '#EBC34F']
  };
  const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
  const mix = (a, b, t) => { const x = hex2(a), y = hex2(b); return '#' + x.map((v, i) => Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, '0')).join(''); };
  const OL = ' stroke="#2B3B39" stroke-width="3" stroke-linejoin="round"';
  const many = (n, f) => { let s = ''; for (let i = 0; i < n; i++) s += f(i); return s; };
  const BOOKC = ['#4A6FA5', '#9CC9C0', '#E08A3C', '#C9473A', '#EBC34F', '#8A6FB0'];
  const SCENES = {
    park: {
      art: '<rect width="800" height="600" fill="#CFE4EE"/><circle cx="700" cy="85" r="46" fill="#F2D27E"' + OL + '/>' +
        '<path d="M130 112 C100 112 100 76 136 76 C140 46 190 42 202 70 C220 52 265 62 258 92 C285 94 282 124 256 124 H140 Z" fill="#FFFFFF"' + OL + '/>' +
        '<path d="M0 330 C150 260 300 300 420 280 C560 255 680 300 800 270 V420 H0 Z" fill="#B7CF8E"' + OL + '/>' +
        '<rect x="-4" y="352" width="808" height="14" fill="#F2D27E"' + OL + '/>' + many(20, (i) => '<rect x="' + (12 + i * 40) + '" y="330" width="20" height="78" rx="4" fill="#F2D27E"' + OL + '/>') +
        '<rect x="-4" y="400" width="808" height="204" fill="#A9C77A"' + OL + '/>' +
        '<rect x="122" y="220" width="50" height="200" rx="6" fill="#B07A45"' + OL + '/>' +
        '<path d="M40 220 C10 160 60 100 110 112 C120 60 200 50 230 100 C290 90 310 170 270 200 C290 250 220 280 180 250 C150 280 70 280 40 220 Z" fill="#7E9A4F"' + OL + '/>' +
        '<path d="M410 420 L520 250 L560 260 L450 420 Z" fill="#6B8DBF"' + OL + '/><path d="M560 260 V420 M600 260 V420 M560 300 H600 M560 340 H600 M560 380 H600" stroke="#2B3B39" stroke-width="5"/>' +
        '<ellipse cx="650" cy="430" rx="130" ry="70" fill="#6E8A43"' + OL + '/><ellipse cx="200" cy="525" rx="150" ry="46" fill="#9FC3E6"' + OL + '/>' +
        '<rect x="470" y="480" width="230" height="88" rx="12" fill="#F2D27E"' + OL + '/>' +
        many(6, (i) => '<circle cx="' + (60 + i * 130) + '" cy="' + (455 + (i % 2) * 18) + '" r="9" fill="#E89AC7"' + OL + '/>'),
      spots: [[110, 165, '#7E9A4F'], [215, 150, '#7E9A4F'], [600, 420, '#6E8A43'], [700, 440, '#6E8A43'], [540, 525, '#F2D27E'], [640, 525, '#F2D27E'], [150, 525, '#9FC3E6'], [262, 522, '#9FC3E6'], [400, 180, '#CFE4EE'], [190, 92, '#FFFFFF'], [475, 335, '#6B8DBF'], [360, 470, '#A9C77A'], [70, 560, '#A9C77A'], [330, 300, '#B7CF8E']]
    },
    farm: {
      art: '<rect width="800" height="600" fill="#DDEBF0"/><circle cx="90" cy="80" r="44" fill="#F2D27E"' + OL + '/>' +
        '<path d="M300 112 C270 112 270 74 306 74 C310 46 360 42 372 68 C390 52 432 62 426 90 C452 92 450 120 424 120 H310 Z" fill="#FFFFFF"' + OL + '/>' +
        '<rect x="-4" y="400" width="808" height="204" fill="#B9C98F"' + OL + '/><path d="M0 450 H800 M0 500 H800 M0 550 H800" stroke="#A6B87A" stroke-width="8"/>' +
        '<rect x="700" y="150" width="80" height="260" rx="40" fill="#9AABA7"' + OL + '/>' +
        '<rect x="460" y="200" width="240" height="210" fill="#C9473A"' + OL + '/><path d="M440 206 L580 110 L720 206 Z" fill="#8A3B28"' + OL + '/>' +
        '<rect x="548" y="290" width="70" height="120" fill="#F3EBDD"' + OL + '/><path d="M548 290 L618 410 M618 290 L548 410" stroke="#C9473A" stroke-width="8"/>' +
        '<ellipse cx="210" cy="395" rx="135" ry="92" fill="#EBC34F"' + OL + '/><path d="M110 380 C150 360 260 360 310 382 M120 420 C170 400 250 400 300 424" stroke="#C99A3A" stroke-width="5" fill="none"/>' +
        '<circle cx="390" cy="515" r="34" fill="#E08A3C"' + OL + '/><circle cx="460" cy="540" r="26" fill="#E08A3C"' + OL + '/>' +
        many(8, (i) => '<rect x="' + (20 + i * 50) + '" y="350" width="16" height="60" fill="#F3EBDD"' + OL + '/>') + '<rect x="10" y="365" width="410" height="12" fill="#F3EBDD"' + OL + '/>',
      spots: [[520, 260, '#C9473A'], [655, 265, '#C9473A'], [580, 165, '#8A3B28'], [583, 345, '#F3EBDD'], [150, 385, '#EBC34F'], [262, 410, '#EBC34F'], [110, 525, '#B9C98F'], [300, 560, '#B9C98F'], [600, 540, '#B9C98F'], [380, 210, '#DDEBF0'], [340, 92, '#FFFFFF'], [740, 260, '#9AABA7'], [390, 515, '#E08A3C']]
    },
    storyroom: {
      art: '<rect width="800" height="430" fill="#D8E7C0"/><rect y="420" width="800" height="184" fill="#EFE0C8"' + OL + '/>' +
        many(14, (i) => '<path d="M' + (i * 58) + ' 0 L' + (i * 58 + 58) + ' 0 L' + (i * 58 + 29) + ' 46 Z" fill="' + (i % 2 ? '#E89AC7' : '#EBC34F') + '"' + OL + '/>') +
        '<circle cx="600" cy="160" r="82" fill="#DCE8EE"' + OL + '/><path d="M600 78 V242 M518 160 H682" stroke="#2B3B39" stroke-width="8"/>' +
        '<rect x="36" y="130" width="290" height="300" fill="#B07A45"' + OL + '/>' +
        [150, 240, 330].map((y) => '<rect x="48" y="' + (y - 4) + '" width="266" height="8" fill="#8A5A33"/>' + many(8, (i) => '<rect x="' + (52 + i * 32) + '" y="' + (y - 84) + '" width="28" height="80" fill="' + BOOKC[(i + y) % BOOKC.length] + '"' + OL + '/>')).join('') +
        '<ellipse cx="460" cy="515" rx="320" ry="72" fill="#9CC9C0"' + OL + '/>' + many(10, (i) => '<circle cx="' + (200 + i * 55) + '" cy="' + (500 + (i % 2) * 26) + '" r="6" fill="#7FB0A6"/>') +
        '<path d="M560 420 V330 C560 290 600 280 640 290 H700 C740 280 780 290 780 330 V420 Z" fill="#E3B341"' + OL + '/><rect x="540" y="360" width="40" height="70" rx="12" fill="#E3B341"' + OL + '/>' +
        '<path d="M392 420 V250" stroke="#2B3B39" stroke-width="6"/><path d="M350 250 L372 190 H412 L434 250 Z" fill="#E89AC7"' + OL + '/>',
      spots: [[100, 215, '#4A6FA5'], [230, 300, '#9CC9C0'], [170, 390, '#EBC34F'], [300, 515, '#9CC9C0'], [470, 545, '#9CC9C0'], [620, 520, '#9CC9C0'], [430, 110, '#D8E7C0'], [300, 80, '#D8E7C0'], [560, 125, '#DCE8EE'], [650, 365, '#E3B341'], [730, 330, '#E3B341'], [392, 222, '#E89AC7'], [90, 560, '#EFE0C8'], [740, 560, '#EFE0C8']]
    },
    street: {
      art: '<rect width="800" height="600" fill="#CFE4EE"/>' +
        '<rect x="30" y="120" width="170" height="300" fill="#C9473A"' + OL + '/>' + many(8, (i) => '<rect x="' + (52 + (i % 2) * 80) + '" y="' + (145 + Math.floor(i / 2) * 64) + '' + '" width="46" height="40" fill="#DCE8EE"' + OL + '/>') +
        '<rect x="215" y="190" width="150" height="230" fill="#6B8DBF"' + OL + '/><path d="M215 260 H365" stroke="#2B3B39" stroke-width="3"/>' + '<rect x="262" y="330" width="56" height="90" fill="#F3EBDD"' + OL + '/>' +
        '<rect x="380" y="100" width="190" height="320" fill="#EBC34F"' + OL + '/>' + many(6, (i) => '<rect x="' + (404 + (i % 2) * 90) + '" y="' + (130 + Math.floor(i / 2) * 80) + '" width="54" height="48" fill="#DCE8EE"' + OL + '/>') +
        '<rect x="585" y="200" width="190" height="220" fill="#9CC9C0"' + OL + '/>' + many(6, (i) => '<path d="M' + (585 + i * 31.6) + ' 230 h31.6 v34 h-31.6 Z" fill="' + (i % 2 ? '#FFFFFF' : '#C9473A') + '"' + OL + '/>') +
        '<rect x="-4" y="418" width="808" height="40" fill="#D5DED9"' + OL + '/><rect x="-4" y="456" width="808" height="148" fill="#7D8B88"' + OL + '/>' +
        many(8, (i) => '<rect x="' + (20 + i * 100) + '" y="522" width="56" height="12" rx="4" fill="#FFFFFF"/>'),
      spots: [[95, 260, '#C9473A'], [115, 395, '#C9473A'], [290, 225, '#6B8DBF'], [240, 380, '#6B8DBF'], [475, 115, '#EBC34F'], [475, 390, '#EBC34F'], [660, 330, '#9CC9C0'], [730, 380, '#9CC9C0'], [150, 575, '#7D8B88'], [640, 580, '#7D8B88'], [560, 50, '#CFE4EE'], [240, 70, '#CFE4EE'], [400, 437, '#D5DED9']]
    },
    construction: {
      art: '<rect width="800" height="600" fill="#DDEBF0"/><circle cx="720" cy="80" r="44" fill="#F2D27E"' + OL + '/>' +
        '<rect x="-4" y="400" width="808" height="204" fill="#C9A57A"' + OL + '/>' +
        '<rect x="600" y="80" width="40" height="330" fill="#EBC34F"' + OL + '/>' + many(8, (i) => '<path d="M600 ' + (90 + i * 40) + ' L640 ' + (130 + i * 40) + '" stroke="#2B3B39" stroke-width="3"/>') +
        '<rect x="360" y="70" width="420" height="30" fill="#EBC34F"' + OL + '/><path d="M420 100 V200" stroke="#2B3B39" stroke-width="4"/><path d="M405 200 H435 V222 C435 240 405 240 405 222" fill="none" stroke="#2B3B39" stroke-width="5"/>' +
        '<rect x="400" y="230" width="180" height="180" fill="#9AABA7"' + OL + '/><path d="M400 290 H580 M400 350 H580 M460 230 V410 M520 230 V410" stroke="#2B3B39" stroke-width="3"/>' +
        '<ellipse cx="180" cy="420" rx="150" ry="80" fill="#B07A45"' + OL + '/>' +
        '<path d="M60 560 V490 H240 V430 H300 L340 490 V560 Z" fill="#E08A3C"' + OL + '/><path d="M250 440 H292 L322 488 H250 Z" fill="#DCE6F2"' + OL + '/>' +
        '<circle cx="110" cy="565" r="32" fill="#2B3B39"/><circle cx="290" cy="565" r="32" fill="#2B3B39"/>' +
        '<path d="M650 560 L675 470 L700 560 Z" fill="#E08A3C"' + OL + '/><path d="M720 560 L745 470 L770 560 Z" fill="#E08A3C"' + OL + '/>',
      spots: [[150, 410, '#B07A45'], [240, 430, '#B07A45'], [620, 230, '#EBC34F'], [520, 85, '#EBC34F'], [450, 260, '#9AABA7'], [540, 380, '#9AABA7'], [150, 520, '#E08A3C'], [440, 520, '#C9A57A'], [560, 470, '#C9A57A'], [300, 120, '#DDEBF0'], [740, 230, '#DDEBF0'], [720, 80, '#F2D27E']]
    },
    airport: {
      art: '<rect width="800" height="600" fill="#CFE4EE"/>' +
        '<path d="M130 112 C100 112 100 76 136 76 C140 46 190 42 202 70 C220 52 265 62 258 92 C285 94 282 124 256 124 H140 Z" fill="#FFFFFF"' + OL + '/>' +
        '<rect x="-4" y="420" width="808" height="184" fill="#A9C77A"' + OL + '/><rect x="-4" y="470" width="808" height="92" fill="#7D8B88"' + OL + '/>' + many(7, (i) => '<rect x="' + (30 + i * 115) + '" y="510" width="60" height="10" rx="3" fill="#FFFFFF"/>') +
        '<rect x="40" y="250" width="320" height="180" fill="#DCE6F2"' + OL + '/><rect x="40" y="275" width="320" height="50" fill="#9FC3E6"' + OL + '/><rect x="170" y="350" width="60" height="80" fill="#FFFFFF"' + OL + '/>' +
        '<rect x="560" y="160" width="60" height="270" fill="#D5DED9"' + OL + '/><rect x="525" y="110" width="130" height="60" rx="10" fill="#9FC3E6"' + OL + '/>' +
        '<path d="M380 430 C380 405 400 395 430 395 H700 C740 395 760 410 760 425 C760 440 740 450 700 450 H430 C400 450 380 445 380 430 Z" fill="#FFFFFF"' + OL + '/>' +
        '<path d="M400 400 L370 330 H410 L450 398 Z" fill="#C9473A"' + OL + '/><path d="M540 425 L600 360 H640 L610 425 Z" fill="#9AABA7"' + OL + '/>' + many(6, (i) => '<circle cx="' + (480 + i * 40) + '" cy="418" r="7" fill="#9FC3E6"/>'),
      spots: [[110, 380, '#DCE6F2'], [300, 390, '#DCE6F2'], [250, 300, '#9FC3E6'], [590, 300, '#D5DED9'], [590, 140, '#9FC3E6'], [120, 515, '#7D8B88'], [700, 520, '#7D8B88'], [400, 160, '#CFE4EE'], [730, 250, '#CFE4EE'], [190, 92, '#FFFFFF'], [660, 425, '#FFFFFF'], [420, 590, '#A9C77A']]
    },
    space: {
      art: '<rect width="800" height="600" fill="#23304A"/>' + many(40, (i) => '<circle cx="' + ((i * 197) % 800) + '" cy="' + ((i * 89) % 400) + '" r="' + (2 + (i % 3)) + '" fill="#FFF6D8"/>') +
        '<ellipse cx="620" cy="170" rx="190" ry="40" fill="none" stroke="#F2D27E" stroke-width="10" transform="rotate(-15 620 170)"/><circle cx="620" cy="170" r="110" fill="#E08A3C"' + OL + '/><path d="M520 140 C580 120 660 130 720 160 M515 200 C580 190 670 200 725 215" stroke="#C46A24" stroke-width="10" fill="none"/>' +
        '<circle cx="150" cy="140" r="64" fill="#7E9A4F"' + OL + '/>' +
        '<path d="M-4 450 C150 410 300 440 420 425 C560 405 680 440 804 420 V604 H-4 Z" fill="#B9C0C8"' + OL + '/><ellipse cx="300" cy="510" rx="70" ry="22" fill="#9AA3AD"' + OL + '/><ellipse cx="620" cy="540" rx="50" ry="16" fill="#9AA3AD"' + OL + '/>' +
        '<path d="M470 450 V330 C470 290 500 260 520 245 C540 260 570 290 570 330 V450 Z" fill="#DCE6F2"' + OL + '/><circle cx="520" cy="330" r="22" fill="#9FC3E6"' + OL + '/><path d="M470 400 L430 455 H470 Z M570 400 L610 455 H570 Z" fill="#C9473A"' + OL + '/>',
      spots: [[590, 150, '#E08A3C'], [680, 210, '#E08A3C'], [150, 140, '#7E9A4F'], [120, 520, '#B9C0C8'], [420, 560, '#B9C0C8'], [720, 500, '#B9C0C8'], [300, 510, '#9AA3AD'], [520, 400, '#DCE6F2']]
    }
  };
  const objSvg = (k, A, B, cls) => '<svg viewBox="0 0 100 100" class="' + (cls || '') + '" aria-hidden="true"><g' + OL + '>' + OBJ[k][1].replace(/\{A\}/g, A).replace(/\{B\}/g, B) + '</g></svg>';
  const hidden = {
    id: 'hidden', area: 'puzzles', title: 'Hidden pictures',
    render(ctx) {
      const names = Object.keys(SCENES), scene = SCENES[names[(ctx.prog.i || 0) % names.length]]; ctx.prog.i = (ctx.prog.i || 0) + 1; ctx.saveProg();
      const letters = (ctx.lessons.spyLetters && ctx.lessons.spyLetters.length) ? ctx.lessons.spyLetters : ['U'];
      const letter = letters[Math.floor(Math.random() * letters.length)];
      const objs = shuffle(Object.keys(OBJ)).slice(0, 4).concat(['letter']);
      const spots = shuffle(scene.spots).slice(0, objs.length);
      const said = (k) => k === 'letter' ? 'the letter ' + letter : (/^[aeiou]/.test(OBJ[k][0]) ? 'an ' : 'a ') + OBJ[k][0];
      const letterSvg = (fill, cls) => '<svg viewBox="0 0 100 100" class="' + (cls || '') + '" aria-hidden="true"><text x="50" y="82" text-anchor="middle" font-size="92" font-weight="700" font-family="Andika, sans-serif" fill="' + fill + '"' + OL + '>' + letter + '</text></svg>';
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="main card hp-area"></div><div class="side hp-side"><div class="hp-list"></div><button class="kid-btn sun wide" id="hint" aria-label="Show me a hint">' + ART.icon.bulb + '</button></div></div>');
      ctx.root.appendChild(wrap);
      const list = wrap.querySelector('.hp-list');
      const slots = objs.map((k) => { const s = $('<div class="hp-slot">' + (k === 'letter' ? letterSvg('#2F6F6A', 'hp-ic') : objSvg(k, OBJ[k][2], OBJ[k][3], 'hp-ic')) + '<span class="hp-name">' + (k === 'letter' ? 'letter ' + letter : OBJ[k][0]) + '</span></div>'); list.appendChild(s); return s; });
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 800 600'); svg.setAttribute('class', 'hp-svg');
      wrap.querySelector('.hp-area').appendChild(svg);
      let h = scene.art;
      objs.forEach((k, i) => {
        const [x, y, host] = spots[i], rot = Math.round(Math.random() * 50 - 25), s = 78;
        const A = k === 'letter' ? mix('#2F6F6A', host, 0.6) : mix(OBJ[k][2], host, 0.6), B = k === 'letter' ? A : mix(OBJ[k][3], mix(host, '#2B3B39', 0.25), 0.6);
        const inner = k === 'letter' ? letterSvg(A) : objSvg(k, A, B);
        h += '<g transform="translate(' + (x - s / 2) + ' ' + (y - s / 2) + ') rotate(' + rot + ' ' + s / 2 + ' ' + s / 2 + ')">' + inner.replace('<svg ', '<svg width="' + s + '" height="' + s + '" ') + '</g>';
      });
      objs.forEach((k, i) => { const [x, y] = spots[i]; h += '<circle class="hp-glow" data-i="' + i + '" cx="' + x + '" cy="' + y + '" r="95" fill="#F2C46B" fill-opacity="0.4" visibility="hidden"/><circle class="hp-ring" data-i="' + i + '" cx="' + x + '" cy="' + y + '" r="52" fill="none" stroke="#2F6F6A" stroke-width="8" visibility="hidden"/>'; });
      objs.forEach((k, i) => { const [x, y] = spots[i]; h += '<circle class="hp-hit" data-i="' + i + '" cx="' + x + '" cy="' + y + '" r="54" fill="#fff" fill-opacity="0.001"/>'; });
      svg.innerHTML = h;
      const found = objs.map(() => false); let hints = 0, done = false;
      svg.querySelectorAll('.hp-hit').forEach((c) => c.addEventListener('click', () => {
        const i = +c.dataset.i; if (done || found[i]) return;
        found[i] = true;
        svg.querySelector('.hp-ring[data-i="' + i + '"]').setAttribute('visibility', 'visible');
        svg.querySelector('.hp-glow[data-i="' + i + '"]').setAttribute('visibility', 'hidden');
        slots[i].classList.add('got');
        if (found.every(Boolean)) { done = true; ctx.winText = 'You found them all!'; ctx.win({ hints }); }
        else ctx.speak('You found ' + said(objs[i]) + '!');
      }));
      wrap.querySelector('#hint').addEventListener('click', () => {
        const i = found.indexOf(false); if (i < 0 || done) return;
        hints++; const gl = svg.querySelector('.hp-glow[data-i="' + i + '"]'); gl.setAttribute('visibility', 'visible');
        ctx.speak('Look here for ' + said(objs[i]) + '.');
        setTimeout(() => { if (!found[i]) gl.setAttribute('visibility', 'hidden'); }, 2500);
      });
      ctx.say('Find the hidden pictures! Look for ' + objs.slice(0, -1).map(said).join(', ') + ', and ' + said(objs[objs.length - 1]) + '.');
    }
  };

  /* ---------------- Puzzles: Look and Look Again (spot the differences) ---------------- */
  // Two copies of a picture. The right one has 3 changes: a new color, something missing, or something added.
  // Which things change is picked fresh every round.
  const DIFF_SCENES = [
    { bg: 'field', items: [['sun', 8, 6, 22], ['cloud', 58, 4, 32], ['house', 104, 28, 46], ['tree', 6, 24, 50], ['hen', 56, 60, 26], ['pig', 84, 70, 28], ['flower', 132, 74, 22], ['dog', 28, 74, 26]], free: [[60, 34, 16], [136, 8, 18], [4, 86, 18]] },
    { bg: 'field', items: [['sun', 132, 4, 22], ['cloud', 16, 4, 32], ['house', 6, 30, 42], ['tree', 52, 24, 44], ['bus', 86, 58, 44], ['car', 44, 72, 32], ['flower', 136, 84, 18]], free: [[100, 8, 18], [70, 6, 16], [8, 84, 18]] },
    { bg: 'inside', items: [['bed', 66, 46, 64], ['book', 10, 70, 24], ['ball', 38, 84, 18], ['cat', 110, 34, 24], ['moon', 18, 6, 22], ['star', 46, 8, 14], ['sock', 132, 86, 18], ['cup', 98, 18, 16]], free: [[70, 12, 16], [10, 44, 18], [140, 10, 16]] },
    { bg: 'field', items: [['flower', 6, 70, 26], ['flower', 34, 74, 22], ['flower', 140, 72, 22], ['bee', 58, 18, 22], ['turtle', 66, 72, 30], ['rabbit', 104, 64, 32], ['tree', 116, 8, 42], ['sun', 8, 6, 22]], free: [[36, 24, 18], [86, 30, 16], [20, 46, 16]] },
    { bg: 'field', items: [['sun', 6, 4, 22], ['cloud', 60, 4, 30], ['house', 104, 24, 44], ['dumptruck', 4, 52, 50], ['cone', 60, 68, 18], ['cone', 82, 70, 16], ['flower', 140, 84, 16]], free: [[36, 12, 16], [96, 6, 14], [146, 8, 12]] },
    { bg: 'field', items: [['sun', 130, 4, 22], ['cloud', 10, 6, 30], ['cloud', 72, 12, 26], ['plane', 36, 40, 58], ['tree', 4, 56, 34], ['house', 118, 46, 38], ['car', 70, 76, 28]], free: [[104, 32, 14], [46, 86, 14], [142, 90, 12]] },
    { bg: 'field', items: [['hero', 66, 28, 52], ['house', 6, 36, 46], ['tree', 122, 34, 40], ['star', 20, 6, 14], ['star', 140, 8, 12], ['cloud', 84, 6, 28], ['car', 108, 78, 28], ['ball', 52, 86, 16]], free: [[58, 6, 14], [6, 90, 14], [94, 90, 12]] }
  ];
  const DIFF_EXTRA = ['star', 'apple', 'ball', 'flower', 'bee', 'leaf', 'acorn', 'cone', 'rocket', 'sun'].filter((k) => ART.has(k));
  const diff = {
    id: 'diff', area: 'puzzles', title: 'Look and look again',
    render(ctx) {
      const sc = DIFF_SCENES[(ctx.prog.i || 0) % DIFF_SCENES.length]; ctx.prog.i = (ctx.prog.i || 0) + 1; ctx.saveProg();
      const idx = shuffle(sc.items.map((_, k) => k));
      const kinds = shuffle(['color', 'gone', 'extra', 'color', 'gone']).slice(0, 3);
      if (kinds.filter((k) => k === 'extra').length > 1) kinds[kinds.indexOf('extra')] = 'color';
      const changes = []; let ii = 0;
      kinds.forEach((kd) => {
        if (kd === 'extra') { const f = pick(sc.free); changes.push({ kind: 'extra', pic: pick(DIFF_EXTRA), x: f[0], y: f[1], s: f[2] }); }
        else { const it = sc.items[idx[ii++]]; changes.push({ kind: kd, item: it, x: it[1], y: it[2], s: it[3], hue: 120 + Math.floor(Math.random() * 120) }); }
      });
      const BGC = { field: ['#DCE8EE', '#C9D7A8'], inside: ['#F3EBDD', '#D9C7A8'] }[sc.bg];
      const fid = 'hue' + Math.floor(Math.random() * 1e6);
      function picture(right) {
        let h = '<svg viewBox="0 0 160 110" class="df-svg" data-side="' + (right ? 'r' : 'l') + '"><defs>' + changes.map((c, k) => '<filter id="' + fid + k + '"><feColorMatrix type="hueRotate" values="' + (c.hue || 0) + '"/></filter>').join('') + '</defs>' +
          '<rect width="160" height="110" fill="' + BGC[0] + '"/><rect y="82" width="160" height="28" fill="' + BGC[1] + '"/>';
        sc.items.forEach((it) => {
          const c = changes.findIndex((x) => x.item === it);
          if (right && c >= 0 && changes[c].kind === 'gone') return;
          const pic = nested(it[0], it[1], it[2], it[3]);
          h += right && c >= 0 && changes[c].kind === 'color' ? '<g filter="url(#' + fid + c + ')">' + pic + '</g>' : pic;
        });
        if (right) changes.forEach((c) => { if (c.kind === 'extra') h += nested(c.pic, c.x, c.y, c.s); });
        changes.forEach((c, k) => { h += '<circle class="df-ring" data-k="' + k + '" cx="' + (c.x + c.s / 2) + '" cy="' + (c.y + c.s / 2) + '" r="' + (Math.max(c.s / 2, 10) + 3) + '" fill="none" stroke="#2F6F6A" stroke-width="2.5" visibility="hidden"/>'; });
        changes.forEach((c, k) => { h += '<circle class="df-glow" data-k="' + k + '" cx="' + (c.x + c.s / 2) + '" cy="' + (c.y + c.s / 2) + '" r="' + (Math.max(c.s / 2, 10) + 10) + '" fill="#F2C46B" fill-opacity="0.45" visibility="hidden"/>'; });
        return h + '</svg>';
      }
      ctx.root.innerHTML = '';
      const wrap = $('<div class="play"><div class="main df-pair"><div class="card df-card">' + picture(false) + '</div><div class="card df-card">' + picture(true) + '</div></div><div class="side df-side"><div class="spy-slots df-slots">' + '<i></i>'.repeat(changes.length) + '</div><button class="kid-btn sun wide" id="hint" aria-label="Show me a hint">' + ART.icon.bulb + '</button></div></div>');
      ctx.root.appendChild(wrap);
      const slots = wrap.querySelectorAll('.df-slots i'), found = changes.map(() => false); let hints = 0, done = false;
      const mark = (k, attr, v) => wrap.querySelectorAll('.' + attr + '[data-k="' + k + '"]').forEach((e) => e.setAttribute('visibility', v));
      wrap.querySelectorAll('.df-svg').forEach((svg) => svg.addEventListener('click', (e) => {
        if (done) return;
        const m = svg.getScreenCTM(), q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; const p = q.matrixTransform(m.inverse());
        let best = -1, bd = 1e9;
        changes.forEach((c, k) => { const d = Math.hypot(p.x - (c.x + c.s / 2), p.y - (c.y + c.s / 2)); if (!found[k] && d < Math.max(c.s / 2, 10) + 8 && d < bd) { bd = d; best = k; } });
        if (best < 0) { ctx.miss(); return; }
        found[best] = true; mark(best, 'df-ring', 'visible'); mark(best, 'df-glow', 'hidden');
        slots[found.filter(Boolean).length - 1].style.background = '#2F6F6A';
        if (found.every(Boolean)) { done = true; ctx.winText = 'You found all the differences!'; ctx.win({ hints }); }
        else ctx.speak(['One!', 'Two!', 'Three!', 'Four!'][found.filter(Boolean).length - 1] + ' Keep looking.');
      }));
      wrap.querySelector('#hint').addEventListener('click', () => {
        const k = found.indexOf(false); if (k < 0 || done) return;
        hints++; mark(k, 'df-glow', 'visible'); ctx.speak('Look here, in both pictures.');
        setTimeout(() => { if (!found[k]) mark(k, 'df-glow', 'hidden'); }, 2500);
      });
      ctx.say('Look and look again! These pictures are almost the same. Find ' + NUMW[changes.length] + ' things that are different.');
    }
  };

  window.TRACE_SHAPES = LETTERS; // used by tests
  window.GAMES = { trace, abc, spy, traceNum, nums, count, basket, spyNum, color: colorPic, hidden, diff, maze, rhyme, feelings };
  window.AREAS = [
    { id: 'letters', name: 'Letters', games: ['trace', 'abc', 'spy'], tint: '#DCEBE8' },
    { id: 'numbers', name: 'Numbers', games: ['count', 'traceNum', 'nums', 'spyNum'], tint: '#FBEBD0' },
    { id: 'make', name: 'Art', games: ['color'], tint: '#E6E3F0' },
    { id: 'puzzles', name: 'Puzzles', games: ['hidden', 'diff'], tint: '#E1ECEA' }
    // Hidden for now (code kept): Fill the basket (basket), Stories ({ id: 'stories', name: 'Stories', games: [], tint: '#DCE6F2' }), Mazes (maze), Rhymes and Feelings (games kept): { id: 'words', ... ['rhyme'] }, { id: 'feelings', ... ['feelings'] }
  ];
})();
