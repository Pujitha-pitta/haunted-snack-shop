# The Haunted Snack Shop

A phone-friendly cooperative shop game. Players join a room with a six-character code, welcome ghost customers as they arrive, read their orders, check a shared pantry, and send kitchen tickets for dishes to serve.

## Rules

- 2–8 players join a shop. The shopkeeper starts the game once at least two players are in the room.
- Each game brings three ghost customers into the shop. Every customer gives a clear order, and the crew checks its shared pantry before preparing a dish.
- Each player sends one kitchen ticket. When the whole crew is ready, the most popular dish is served to the waiting customer. A split kitchen slows the shop down.
- Correct deliveries earn one star for each player who chose the right snack, lower the haunt meter, and restock one ingredient.
- A wrong delivery raises the haunt meter by two and uses the chosen recipe’s ingredients. A tie raises it by one.
- The crew wins if they finish three orders before the haunt meter reaches five. The player with the most stars wins the shop’s bragging rights.

## Run locally

Install Node.js, then run `npm install`, `npm run build`, and `npx netlify dev`. Netlify Dev serves the site and its function together. The local Netlify Blobs store is separate from production.

## Deploy

This project is configured for Netlify Functions and Netlify Blobs. Connect this GitHub repo to Netlify and deploy with the default build settings (`npm run build`, publish directory `dist`). No environment variables or external database setup are needed. Rooms are stored in a strong-consistency Netlify Blobs store with conditional writes.

The game page calls `/.netlify/functions/game` directly. The production backend must run on Netlify for room creation and shared gameplay to work.

