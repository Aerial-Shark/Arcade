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

## Leaderboards

`shared/leaderboard.js` gives every game the same results screen and top-10 board.

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
