# Haunted Snack Shop: Midnight Rush

### 🎮 [Play it live → haunted-snack-shop.nagapujitha456.workers.dev](https://haunted-snack-shop.nagapujitha456.workers.dev)

Race your friends: open the link, tap **Race friends**, and share the room code.

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

The race server lives in `worker/race.ts`. It runs in the Cloudflare Worker's Durable Objects at `/api/race`, separate from the classic co-op rooms. The client is `src/game/race.js`. **Multiplayer needs the Cloudflare Worker deployment.** The Netlify Function only serves the classic co-op game.

## Co-op party mode (`party.html`)

The original multiplayer room game is still available at `/party.html`. 2–8 players join a room with a six-character code and cook together in one shared kitchen. It needs the Netlify Function or Cloudflare Worker backend described below. Old invite links (`/?room=CODE`) redirect to the party page automatically.

## Run locally

Install Node.js and run `npm install`.

- Single-player only: `npm run dev`.
- With multiplayer: in one terminal run `npx wrangler dev --port 8787`, and in a second terminal run `npm run dev`. Vite forwards `/api` requests to the local Worker. On Windows, if Wrangler fails with `SQLITE_CANTOPEN` because the folder path is long, add `--persist-to C:/temp/hss-wrangler`.

## Deploy

This project is configured for Netlify Functions and Netlify Blobs. Connect this GitHub repo to Netlify and deploy with the default build settings (`npm run build`, publish directory `dist`). No environment variables or external database setup are needed. Rooms are stored in a strong-consistency Netlify Blobs store with conditional writes.

The game page calls `/.netlify/functions/game` directly. The production backend must run on Netlify for room creation and shared gameplay to work.

## Cloudflare migration

The parallel Cloudflare Worker backend is in `worker/index.ts`. It keeps each room in its own SQLite-backed Durable Object, so game state is strongly consistent and does not require Netlify Blobs. The Worker serves the Vite build and supports both the existing function URL and `/api/game` during migration.

To deploy it, connect this repository to Cloudflare Workers Builds, keep the project root at the repository root, and use `npm run deploy:cloudflare` as the deploy command. The `wrangler.jsonc` file configures the static asset binding and the `GameRoom` Durable Object. Cloudflare will prompt you to authorize GitHub repository access before it can build on pushes.

