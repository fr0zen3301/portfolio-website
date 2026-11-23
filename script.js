/* Copy email */
(function () {
  var btn = document.getElementById('copy-email');
  if (!btn) return;
  var label = btn.querySelector('.copy-label');
  var timer;
  function done(msg) {
    label.textContent = msg;
    clearTimeout(timer);
    timer = setTimeout(function () { label.textContent = 'Copy'; }, 1800);
  }
  function fallback() {
    var target = document.getElementById(btn.getAttribute('data-target'));
    if (target) {
      var range = document.createRange();
      range.selectNodeContents(target);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    done('Selected');
  }
  btn.addEventListener('click', function () {
    var text = btn.getAttribute('data-copy');
    try {
      navigator.clipboard.writeText(text).then(function () { done('Copied'); }, fallback);
    } catch (e) { fallback(); }
  });
})();

/* Active section in the nav */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (l) { l.removeAttribute('aria-current'); });
      var l = byId[e.target.id];
      if (l) l.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  Object.keys(byId).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) io.observe(el);
  });
})();

/* Three-body figure-eight, velocity Verlet on a fixed timestep */
(function () {
  var canvas = document.getElementById('orbit');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var eOut = document.getElementById('energy');
  var tOut = document.getElementById('simtime');
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  var DT = 0.0025, RATE = 0.55, EPS2 = 1e-6, SAMPLE = 3, PERIOD = 6.32591398;
  var x, y, vx, vy, ax, ay, t, steps, trails, maxTrail = 420;

  function reset() {
    x = [-0.97000436, 0.97000436, 0];
    y = [0.24308753, -0.24308753, 0];
    vx = [0.466203685, 0.466203685, -0.93240737];
    vy = [0.43236573, 0.43236573, -0.86473146];
    ax = [0, 0, 0]; ay = [0, 0, 0];
    t = 0; steps = 0; trails = [[], [], []];
    accel();
  }
  function accel() {
    ax[0] = ax[1] = ax[2] = 0; ay[0] = ay[1] = ay[2] = 0;
    for (var i = 0; i < 3; i++) for (var j = i + 1; j < 3; j++) {
      var dx = x[j] - x[i], dy = y[j] - y[i];
      var r2 = dx * dx + dy * dy + EPS2;
      var inv = 1 / (r2 * Math.sqrt(r2));
      ax[i] += dx * inv; ay[i] += dy * inv;
      ax[j] -= dx * inv; ay[j] -= dy * inv;
    }
  }
  function step() {
    var i;
    for (i = 0; i < 3; i++) {
      vx[i] += 0.5 * ax[i] * DT; vy[i] += 0.5 * ay[i] * DT;
      x[i] += vx[i] * DT; y[i] += vy[i] * DT;
    }
    accel();
    for (i = 0; i < 3; i++) { vx[i] += 0.5 * ax[i] * DT; vy[i] += 0.5 * ay[i] * DT; }
    t += DT; steps++;
    if (steps % SAMPLE === 0) {
      for (i = 0; i < 3; i++) {
        trails[i].push(x[i], y[i]);
        if (trails[i].length > maxTrail * 2) trails[i].splice(0, 2);
      }
    }
  }
  function energy() {
    var k = 0, p = 0, i, j;
    for (i = 0; i < 3; i++) k += 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]);
    for (i = 0; i < 3; i++) for (j = i + 1; j < 3; j++) {
      var dx = x[j] - x[i], dy = y[j] - y[i];
      p -= 1 / Math.sqrt(dx * dx + dy * dy + EPS2);
    }
    return k + p;
  }

  var W = 1, H = 1, dpr = 1, colors = {};
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    colors = {
      fg: cs.getPropertyValue('--fg').trim() || '#FFFFFF',
      muted: cs.getPropertyValue('--orbit-3').trim() || cs.getPropertyValue('--muted').trim() || '#2C2E34',
      accent: cs.getPropertyValue('--accent').trim() || '#D9CFFF',
      line: cs.getPropertyValue('--line').trim() || '#8C8E95'
    };
  }
  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    var s = Math.min(W / 2.5, H / 1.0);
    var cx = W / 2, cy = H / 2;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = dpr;
    ctx.setLineDash([2 * dpr, 5 * dpr]);
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.stroke();
    ctx.setLineDash([]);

    var bodyColors = [colors.accent, colors.fg, colors.muted];
    ctx.lineWidth = 1.6 * dpr;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var b = 0; b < 3; b++) {
      var tr = trails[b], n = tr.length / 2;
      if (n < 2) continue;
      ctx.strokeStyle = bodyColors[b];
      var chunks = 14;
      for (var c = 0; c < chunks; c++) {
        var a = Math.floor(c * (n - 1) / chunks), z = Math.floor((c + 1) * (n - 1) / chunks);
        if (z <= a) continue;
        ctx.globalAlpha = reduced ? 0.85 : 0.06 + 0.8 * ((c + 1) / chunks);
        ctx.beginPath();
        ctx.moveTo(cx + tr[a * 2] * s, cy - tr[a * 2 + 1] * s);
        for (var k = a + 1; k <= z; k++) ctx.lineTo(cx + tr[k * 2] * s, cy - tr[k * 2 + 1] * s);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (var m = 0; m < 3; m++) {
      ctx.fillStyle = bodyColors[m];
      ctx.beginPath();
      ctx.arc(cx + x[m] * s, cy - y[m] * s, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function readout() {
    eOut.textContent = energy().toFixed(5).replace('-', '−');
    tOut.textContent = t.toFixed(2);
  }

  var raf = 0, last = 0, acc = 0, onScreen = true, reduced = reduceQuery.matches;
  function frame(now) {
    raf = 0;
    if (!last) last = now;
    var real = Math.min((now - last) / 1000, 0.1);
    last = now;
    acc += real * RATE;
    while (acc >= DT) { step(); acc -= DT; }
    draw(); readout();
    schedule();
  }
  function schedule() {
    if (!raf && onScreen && !document.hidden && !reduced) raf = requestAnimationFrame(frame);
  }
  function start() {
    reduced = reduceQuery.matches;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    reset();
    if (reduced) {
      maxTrail = 1000;
      while (t < PERIOD) step();
    } else {
      maxTrail = 420;
      for (var i = 0; i < 600; i++) step();
    }
    draw(); readout();
    last = 0; acc = 0;
    schedule();
  }

  readColors();
  resize();
  start();

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { resize(); draw(); }).observe(canvas);
  } else {
    window.addEventListener('resize', function () { resize(); draw(); });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) { last = 0; schedule(); }
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { last = 0; schedule(); });
  function onTheme() { readColors(); draw(); }
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', onTheme);
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', start);
})();
