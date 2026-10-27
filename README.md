# The Haunted Snack Shop

A phone-friendly cooperative shop game. Players join a room with a six-character code, welcome ghost customers as they arrive, read their orders, check a shared pantry, and send kitchen tickets for dishes to serve.

## Rules

- 2–8 players join a shop. The shopkeeper starts the game once at least two players are in the room. The whole crew sees a short shift briefing before service starts.
- Each game brings nine animated ghost customers to the counter across three levels: Twilight Shift, Midnight Rush, and Witching Hour. Every customer gives a clear order ticket, and the crew checks its shared pantry before preparing a dish.
- Everyone works in one shared kitchen. Any player can add an ingredient, select a station, and finish the order; every move syncs across the room. The last cooking step serves the dish automatically.
- Happy customers tip each cook who ordered the right dish, calm the haunt meter, and restock one ingredient.
- A wrong delivery uses the chosen recipe’s ingredients and raises the haunt meter by two, three, or four depending on the level. A rushed order raises it by one, two, or three. The night gets riskier at each level.
- The crew wins if they finish all nine orders before the haunt meter reaches five. The player with the most stars wins the shop’s bragging rights.

## Run locally

Install Node.js, then run `npm install`, `npm run build`, and `npx netlify dev`. Netlify Dev serves the site and its function together. The local Netlify Blobs store is separate from production.

## Deploy

This project is configured for Netlify Functions and Netlify Blobs. Connect this GitHub repo to Netlify and deploy with the default build settings (`npm run build`, publish directory `dist`). No environment variables or external database setup are needed. Rooms are stored in a strong-consistency Netlify Blobs store with conditional writes.

The game page calls `/.netlify/functions/game` directly. The production backend must run on Netlify for room creation and shared gameplay to work.

