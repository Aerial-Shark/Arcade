# Afterglow Arcade

Small original browser games with shared leaderboards. Plain HTML, CSS and JavaScript: no build step.

## Games

| Game | Folder | Controls |
|---|---|---|
| Perihelion | `games/perihelion/` | Tap, click or Space |
| Hex Bloom | `games/hexbloom/` | Tap or click a cell; arrows + Space |
| Comet Courier | `games/courier/` | Drag, or arrow keys |
| Core Guard | `games/coreguard/` | Tap or click |
| Ember Leap | `games/emberleap/` | Hold to jump, or Space |
| Word Rush | `games/wordrush/` | Tap letters, or type |
| Echo Lights | `games/echo/` | Tap, or Q W A S |
| Prism Break | `games/prism/` | Drag, or arrow keys |
| Glow Trail | `games/trail/` | Swipe, or arrow keys |
| Beat Drop | `games/beatdrop/` | Tap, or D F J K |
| Sky Stack | `games/skystack/` | Tap, click or Space |
| Flash Tap | `games/flashtap/` | Tap or click |
| Crate Shift | `games/crates/` | Swipe, or arrow keys |
| Glow Hockey | `games/hockey/` | Two players: drag, or WASD vs arrows |

The nine games from Word Rush down share `shared/kit.css` and `shared/kit.js` for their look, start card and sound.

## Leaderboards

`shared/leaderboard.js` gives every game the same results screen and top-10 board.
Scores save by themselves when the results screen closes, as Anonymous if no name was typed.

- With `shared/config.js` empty, scores are kept in each player's browser.
- With a Supabase URL and anon key in `shared/config.js`, scores are shared by everyone.
  Create the table by running `supabase/arcade_scores.sql` in the project's SQL editor.
  The anon key is public by design; the table's rules only allow reading and adding scores.

Scores are reported by the browser, so a determined player can fake one. Delete bad rows in the
Supabase table editor.

## Hosting

GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.

## Adding a game

1. Create `games/<slug>/index.html`.
2. Load `../../shared/config.js` and `../../shared/leaderboard.js`, then call
   `Arcade.showGameOver({ game: '<slug>', score, title, subtitle, stats, onRetry })` when a run ends.
3. Add the game to `GAMES` in `shared/leaderboard.js`, an emblem to `ART` in `index.html`,
   and the slug to the `game` check in `supabase/arcade_scores.sql`.
