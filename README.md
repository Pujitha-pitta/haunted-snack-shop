# Haunted Snack Shop: Midnight Rush

A fast, cute-spooky cooking and time-management game for phones and desktops. Cook for ghost customers, keep their patience bars up, and serve everyone before the clock strikes midnight.

## Single-player game (`index.html`)

- **Cooking mini-games:** each recipe plays differently. Flip the Ghost Burger before it floats away, shake the Witch Fries while the basket glows, stop the Phantom Shake mixer in the glowing zone, add Zombie Pizza toppings in order, and stir the Magic Soup before a soup monster climbs out.
- **Customers with personalities:** Little Boo, the Hungry Ghost (2–3 dishes), the Angry Zombie (low patience, big tips), the Vampire VIP (pays double for all-perfect orders), the Baby Phantom (changes its order once), the Witch Queen (secret recipe, must be perfect, pays triple) and the Ghost King boss (a five-dish feast).
- **15 levels in World 1.** A new mechanic arrives every level or two, with boss levels at 10 and 15. Worlds 2–4 are shown on the map as coming soon.
- **Three stars:** ★ serve the target number of customers, ★★ earn the coin target, ★★★ also lose no customers and waste no food. The exact requirements are shown before each level starts.
- **Combos, tips and perfect dishes:** fast service and perfect dishes earn bigger tips, and back-to-back happy customers build a combo multiplier.
- **Surprise events with a warning first:** lights out, haunted heat (stations cook twice as fast) and a thief ghost you tap to shoo away.
- **Persistent upgrades** that show up in the kitchen: faster stations, second slots, a bigger serving tray, a refrigerator that keeps food fresh longer, and decorations that make customers more patient.
- **Retention:** daily quests, a daily login treat with a streak, personal bests, and a Ghost Book collection of every customer you've met.
- Progress is saved in the browser's `localStorage`. Sound effects are synthesized, so there are no audio files.

Code lives in `src/game/`: `data.js` (recipes, customers, levels, upgrades, quests), `engine.js` (the simulation, no DOM), `ui.js` (screens and input), `save.js` and `audio.js`.

## Versus Race multiplayer

Race 2–8 friends live. Tap **Race friends** on the title screen (or the Versus Race card on the map), create a room, and share the 6-letter code or the invite link (`/?race=CODE`).

- The host picks one of four races: Snack Dash, Lights Out Rush, Ghost King Showdown or Midnight Mayhem.
- After a synced 3-2-1 countdown, everyone cooks the same level in their own kitchen with the **same customers in the same order** (a shared random seed). Each kitchen runs on the player's own device, so there is no input lag.
- A live scoreboard shows everyone's coins. The most coins wins.
- Every ×3 combo charges a pumpkin (up to 3). Spend one to send a prank to the leader: **Lights Out**, **Thief Ghost** or **BOO!** (spooks their customers). Pranks have a short recharge and a per-race limit.
- A podium shows the results, and the host can race again or pick a different race. Upgrades don't count in races (everyone gets the same standard kitchen), but coins you earn go into your wallet.

The race server lives in `worker/race.ts`. It runs in the Cloudflare Worker's Durable Objects at `/api/race`, separate from the classic co-op rooms. The client is `src/game/race.js`. **Multiplayer needs the Cloudflare Worker deployment.**

## Co-op party mode (`party.html`)

The original multiplayer room game is still available at `/party.html`. 2–8 players join a room with a six-character code and cook together in one shared kitchen. Its server is also part of the Cloudflare Worker (`worker/index.ts`, at `/api/game`). Old invite links (`/?room=CODE`) redirect to the party page automatically.

## Run locally

Install Node.js and run `npm install`.

- Single-player only: `npm run dev`.
- With multiplayer: in one terminal run `npx wrangler dev --port 8787`, and in a second terminal run `npm run dev`. Vite forwards `/api` requests to the local Worker. On Windows, if Wrangler fails with `SQLITE_CANTOPEN` because the folder path is long, add `--persist-to C:/temp/hss-wrangler`.

## Deploy

Every push to `main` deploys automatically with GitHub Actions:

- **GitHub Pages** (`.github/workflows/pages.yml`) builds the game and publishes it to Pages. The Pages copy sends multiplayer requests to the Cloudflare Worker.
- **Cloudflare** (`.github/workflows/cloudflare.yml`) builds the game and deploys the Worker, which serves the game and runs the multiplayer servers (`worker/index.ts` for co-op, `worker/race.ts` for versus races) in Durable Objects. It needs the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. You can also deploy by hand with `npm run deploy:cloudflare`.

`wrangler.jsonc` configures the Worker, its static assets and the `GameRoom` Durable Object.
