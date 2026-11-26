/*
  Afterglow Arcade shared scoreboard.

  Load in every game, after config.js:
    <script src="../../shared/config.js"></script>
    <script src="../../shared/leaderboard.js"></script>

  API (window.Arcade):
    Arcade.showGameOver({ game, score, title, subtitle, stats, onRetry })
        Opens the results screen: score, optional stats [[label, value], ...],
        a name box to save the score, the top 10 for this game, "Play again" (calls onRetry)
        and a link back to all games. Returns { isBest }.
    Arcade.isOverlayOpen()   true while the results screen is open; games should ignore
                             their own key handlers while it is.
    Arcade.topScores(game, limit)  Promise of [{ name, score, created_at }]
    Arcade.submitScore(game, name, score)  Promise
    Arcade.personalBest(game)      number saved on this device
    Arcade.online                  true when the shared online scoreboard is configured
    Arcade.GAMES                   catalog metadata
*/
(function () {
  'use strict';
  const cfg = window.ARCADE_CONFIG || {};
  const online = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const NAME_KEY = 'arcade-name';
  const MAX_SCORE = 10000000;

  const GAMES = [
    { slug: 'perihelion', name: 'Perihelion', tagline: 'Let go of crumbling planets and slingshot upward through gravity.', controls: 'Tap, click or Space', hue: '#ffcf73' },
    { slug: 'hexbloom', name: 'Hex Bloom', tagline: 'Plant seeds on a hex garden. Three alike bloom into something bigger.', controls: 'Tap or click a cell', hue: '#8fe3a1' },
    { slug: 'courier', name: 'Comet Courier', tagline: 'Thread a comet through falling debris and grab every parcel.', controls: 'Drag, or arrow keys', hue: '#6fc8ff' },
    { slug: 'coreguard', name: 'Core Guard', tagline: 'Pop the crawlers before they reach the core. Misses cost energy.', controls: 'Tap or click', hue: '#ff6f91' },
    { slug: 'emberleap', name: 'Ember Leap', tagline: 'Run the night rooftops. Hold to leap, and feed your lantern embers.', controls: 'Hold to jump, or Space', hue: '#ff9f4a' }
  ];

  const safe = fn => { try { return fn(); } catch (e) { return undefined; } };
  const cleanName = n => String(n || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const getName = () => safe(() => localStorage.getItem(NAME_KEY)) || '';
  const setName = n => safe(() => localStorage.setItem(NAME_KEY, n));
  const localKey = g => 'arcade-local-' + g;
  const localList = g => safe(() => JSON.parse(localStorage.getItem(localKey(g)) || '[]')) || [];
  const personalBest = g => parseInt(safe(() => localStorage.getItem('arcade-best-' + g)) || '0', 10) || 0;

  function headers(extra) {
    return Object.assign({ apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey }, extra || {});
  }

  async function topScores(game, limit) {
    limit = limit || 10;
    if (online) {
      const url = cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/arcade_scores?select=name,score,created_at' +
        '&game=eq.' + encodeURIComponent(game) + '&order=score.desc,created_at.asc&limit=' + limit;
      const r = await fetch(url, { headers: headers() });
      if (!r.ok) throw new Error('Could not load scores (error ' + r.status + ').');
      return r.json();
    }
    return localList(game).sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async function submitScore(game, name, score) {
    name = cleanName(name);
    score = Math.max(0, Math.min(MAX_SCORE, Math.floor(score)));
    if (!name) throw new Error('Type a name first.');
    if (online) {
      const r = await fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/arcade_scores', {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ game, name, score })
      });
      if (!r.ok) throw new Error(r.status === 429 ? 'Too many scores at once. Wait a minute and try again.' : 'Could not save your score (error ' + r.status + ').');
    } else {
      const l = localList(game);
      l.push({ name, score, created_at: new Date().toISOString() });
      l.sort((a, b) => b.score - a.score);
      safe(() => localStorage.setItem(localKey(game), JSON.stringify(l.slice(0, 50))));
    }
    setName(name);
  }

  // ---------- results screen ----------
  const CSS = `
  .ar-ov{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;overflow-y:auto;background:rgba(7,8,22,.78);
    padding-block:calc(env(safe-area-inset-top,0px) + 20px) calc(env(safe-area-inset-bottom,0px) + 20px);
    padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));
    font-family:"Outfit",system-ui,-apple-system,"Segoe UI",sans-serif;color:#f3eefe;color-scheme:dark}
  .ar-card{width:100%;max-width:420px;display:flex;flex-direction:column;gap:14px;align-items:stretch;text-align:center;
    background:#141233;border:1px solid rgba(178,171,216,.22);border-radius:18px;padding:22px 20px}
  .ar-card h2{margin:0;font:700 clamp(22px,6vw,28px)/1.1 "Unbounded",system-ui,sans-serif;text-wrap:balance}
  .ar-sub{margin:0;color:#b2abd8;font-size:14px}
  .ar-score{font:700 44px/1 "Unbounded",system-ui,sans-serif;font-variant-numeric:tabular-nums;color:var(--ar-hue,#ffcf73)}
  .ar-badge{align-self:center;font:700 11px "Unbounded",system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#0a0c24;background:var(--ar-hue,#ffcf73);padding:4px 10px;border-radius:999px}
  .ar-stats{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 18px;font-size:13px;color:#b2abd8}
  .ar-stats b{color:#f3eefe;font-variant-numeric:tabular-nums}
  .ar-form{display:flex;gap:8px}
  .ar-form input{flex:1;min-width:0;background:#0d0c26;color:#f3eefe;border:1px solid rgba(178,171,216,.35);border-radius:10px;padding:10px 12px;font:500 15px inherit;font-family:inherit}
  .ar-form input:focus-visible,.ar-btn:focus-visible,.ar-link:focus-visible{outline:2px solid var(--ar-hue,#ffcf73);outline-offset:2px}
  .ar-btn{border:0;border-radius:10px;padding:10px 16px;font:700 14px "Unbounded",system-ui,sans-serif;cursor:pointer;background:var(--ar-hue,#ffcf73);color:#0a0c24}
  .ar-btn.ar-ghost{background:transparent;color:#f3eefe;border:1px solid rgba(178,171,216,.4)}
  .ar-btn:disabled{opacity:.5;cursor:default}
  .ar-msg{min-height:18px;margin:0;font-size:13px;color:#b2abd8}
  .ar-msg.ar-err{color:#ff8f8f}
  .ar-board{text-align:left;border-top:1px solid rgba(178,171,216,.18);padding-top:12px}
  .ar-board h3{margin:0 0 8px;font:600 11px "Outfit",system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#b2abd8;display:flex;justify-content:space-between}
  .ar-board ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;font-size:14px}
  .ar-board li{display:grid;grid-template-columns:2ch 1fr auto;gap:10px;padding:5px 8px;border-radius:8px;font-variant-numeric:tabular-nums}
  .ar-board li.ar-me{background:rgba(255,255,255,.08);color:var(--ar-hue,#ffcf73)}
  .ar-board .ar-n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
  .ar-rank{color:#b2abd8}
  .ar-actions{display:flex;gap:8px}.ar-actions .ar-btn{flex:1}
  .ar-link{color:#b2abd8;font-size:13px}
  .ar-back{position:fixed;z-index:900;left:max(12px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 12px);
    font:600 12px "Outfit",system-ui,sans-serif;letter-spacing:.06em;color:#b2abd8;text-decoration:none;border:1px solid rgba(178,171,216,.3);border-radius:999px;padding:6px 12px;background:rgba(7,8,22,.5)}
  .ar-back:focus-visible{outline:2px solid #ffcf73;outline-offset:2px}`;

  function injectCSS() {
    if (document.getElementById('ar-style')) return;
    const s = document.createElement('style'); s.id = 'ar-style'; s.textContent = CSS; document.head.appendChild(s);
  }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const fmt = n => Number(n).toLocaleString();

  let open = null;
  function close() { if (open) { open.remove(); open = null; } }

  async function fillBoard(list, game, mine, msgEl) {
    list.textContent = '';
    try {
      const rows = await topScores(game, 10);
      if (!rows.length) { const li = el('li'); li.append(el('span', 'ar-rank', ''), el('span', 'ar-n', 'No scores yet. Be the first.'), el('span')); list.append(li); return; }
      rows.forEach((r, i) => {
        const li = el('li');
        if (mine && r.name === mine.name && r.score === mine.score) { li.className = 'ar-me'; mine = null; }
        li.append(el('span', 'ar-rank', String(i + 1)), el('span', 'ar-n', r.name), el('span', '', fmt(r.score)));
        list.append(li);
      });
    } catch (e) {
      if (msgEl) { msgEl.textContent = e.message; msgEl.classList.add('ar-err'); }
    }
  }

  function showGameOver(opts) {
    injectCSS();
    close();
    const game = opts.game, score = Math.max(0, Math.floor(opts.score || 0));
    const meta = GAMES.find(g => g.slug === game) || {};
    const prevBest = personalBest(game);
    const isBest = score > prevBest;
    if (isBest) safe(() => localStorage.setItem('arcade-best-' + game, String(score)));

    const ov = el('div', 'ar-ov'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.style.setProperty('--ar-hue', meta.hue || '#ffcf73');
    const card = el('div', 'ar-card');
    const h = el('h2', '', opts.title || 'Game over'); h.id = 'ar-title'; ov.setAttribute('aria-labelledby', 'ar-title');
    card.append(h);
    if (opts.subtitle) card.append(el('p', 'ar-sub', opts.subtitle));
    if (isBest && score > 0) card.append(el('span', 'ar-badge', 'New personal best'));
    card.append(el('div', 'ar-score', fmt(score)));
    const stats = el('div', 'ar-stats');
    (opts.stats || []).forEach(([k, v]) => { const s = el('span', '', k + ' '); s.append(el('b', '', String(v))); stats.append(s); });
    const pb = el('span', '', 'Best '); pb.append(el('b', '', fmt(Math.max(prevBest, score)))); stats.append(pb);
    card.append(stats);

    const msg = el('p', 'ar-msg', online ? '' : 'Scores are saved on this device until the online scoreboard is connected.');
    let input = null, saveBtn = null;
    if (score > 0) {
      const form = el('form', 'ar-form');
      input = el('input'); input.id = 'ar-name'; input.maxLength = 16; input.placeholder = 'Your name'; input.autocomplete = 'nickname';
      input.setAttribute('aria-label', 'Your name for the scoreboard'); input.value = getName();
      saveBtn = el('button', 'ar-btn', 'Save score'); saveBtn.type = 'submit';
      form.append(input, saveBtn);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        saveBtn.disabled = true; msg.classList.remove('ar-err'); msg.textContent = 'Saving…';
        try {
          const name = cleanName(input.value);
          await submitScore(game, name, score);
          msg.textContent = 'Saved.'; saveBtn.textContent = 'Saved'; input.disabled = true;
          await fillBoard(list, game, { name, score }, msg);
          retry.focus();
        } catch (err) {
          msg.textContent = err.message; msg.classList.add('ar-err'); saveBtn.disabled = false;
        }
      });
      card.append(form);
    }
    card.append(msg);

    const board = el('div', 'ar-board');
    const bh = el('h3'); bh.append(el('span', '', 'Top 10'), el('span', '', online ? 'Everyone' : 'This device'));
    const list = el('ol');
    board.append(bh, list);
    card.append(board);

    const actions = el('div', 'ar-actions');
    const retry = el('button', 'ar-btn', 'Play again'); retry.type = 'button';
    retry.addEventListener('click', () => { close(); if (opts.onRetry) opts.onRetry(); });
    const home = el('a', 'ar-btn ar-ghost', 'All games'); home.href = '../../';
    home.style.textDecoration = 'none'; home.style.display = 'grid'; home.style.placeItems = 'center';
    actions.append(retry, home);
    card.append(actions);

    ov.append(card);
    ov.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') retry.click(); });
    ov.addEventListener('pointerdown', e => e.stopPropagation());
    document.body.appendChild(ov);
    open = ov;
    fillBoard(list, game, null, msg);
    setTimeout(() => { (input && !input.value ? input : retry).focus(); }, 50);
    return { isBest };
  }

  function addBackLink() {
    injectCSS();
    if (document.querySelector('.ar-back')) return;
    const a = el('a', 'ar-back', '← All games'); a.href = '../../';
    document.body.appendChild(a);
  }
  if (/\/games\//.test(location.pathname)) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBackLink); else addBackLink();
  }

  window.Arcade = {
    online, GAMES, topScores, submitScore, showGameOver, personalBest,
    isOverlayOpen: () => !!open, closeOverlay: close, cleanName
  };
})();
