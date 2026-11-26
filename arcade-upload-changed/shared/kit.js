/*
  Small helper kit for Afterglow Arcade games. Load after leaderboard.js.
  Kit.start({ title, eyebrow, text, hue, onStart })  start card + sound toggle
  Kit.hud([labels])  returns set(a, b, c) for the three HUD values
  Kit.canvas(onResize)  full-screen canvas: { cv, ctx, w, h }
  Kit.loop(fn)  calls fn(dt, t) every frame
  Kit.over(slug, score, title, subtitle, stats, onRetry)  shared results screen
*/
(function () {
  'use strict';
  const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  let AC = null, muted = false;
  try { muted = localStorage.getItem('arcade-mute') === '1'; } catch (e) {}

  function beep(f, d, type, vol) {
    if (muted) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
      d = d || .12;
      o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(vol || .12, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
    } catch (e) {}
  }

  function hud(labels) {
    const h = $('div', 'k-hud');
    const vals = labels.map(l => { const s = $('div', 'k-stat'), v = $('span', 'k-val', '0'); s.append($('span', 'k-lbl', l), v); h.append(s); return v; });
    document.body.append(h);
    return (...a) => a.forEach((x, i) => { if (x != null && vals[i].textContent !== String(x)) vals[i].textContent = x; });
  }

  function canvas(onResize) {
    const cv = $('canvas', 'k-cv'); document.body.prepend(cv);
    const K = { cv, ctx: cv.getContext('2d'), w: 0, h: 0 };
    function fit() {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      K.w = window.innerWidth; K.h = window.innerHeight;
      cv.width = Math.round(K.w * d); cv.height = Math.round(K.h * d);
      K.ctx.setTransform(d, 0, 0, d, 0, 0);
      if (onResize) onResize(K);
    }
    window.addEventListener('resize', fit); fit();
    return K;
  }

  function start(o) {
    document.documentElement.style.setProperty('--hue', o.hue);
    const ov = $('div', 'k-ov'), c = $('div', 'k-card'), b = $('button', 'k-btn', 'Play'); b.type = 'button';
    c.append($('p', 'k-eye', o.eyebrow), $('h1', '', o.title), $('p', '', o.text), b); ov.append(c); document.body.append(ov);
    const m = $('button', 'k-mute'); m.type = 'button';
    const lab = () => { m.textContent = muted ? 'Sound off' : 'Sound on'; m.setAttribute('aria-pressed', String(!muted)); };
    lab();
    m.addEventListener('click', e => { e.stopPropagation(); muted = !muted; try { localStorage.setItem('arcade-mute', muted ? '1' : '0'); } catch (err) {} lab(); m.blur(); });
    m.addEventListener('pointerdown', e => e.stopPropagation());
    document.body.append(m);
    let on = false;
    function go(e) { if (on) return; on = true; if (e) e.stopPropagation(); ov.hidden = true; beep(660, .08); o.onStart(); }
    ov.addEventListener('click', go);
    ov.addEventListener('pointerdown', e => e.stopPropagation());
    window.addEventListener('keydown', e => { if (!on && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopImmediatePropagation(); go(); } }, true);
    setTimeout(() => b.focus(), 50);
  }

  function loop(fn) {
    let last = 0;
    function f(t) { const dt = Math.min(.05, (t - last) / 1000 || 0); last = t; fn(dt, t / 1000); requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }

  function over(game, score, title, subtitle, stats, onRetry) {
    beep(180, .4, 'sawtooth', .08);
    return Arcade.showGameOver({ game, score, title, subtitle, stats, onRetry });
  }

  window.Kit = {
    $, beep, hud, canvas, start, loop, over,
    busy: () => Arcade.isOverlayOpen(),
    rnd: (a, b) => a + Math.random() * (b - a),
    pick: a => a[Math.random() * a.length | 0]
  };
})();
