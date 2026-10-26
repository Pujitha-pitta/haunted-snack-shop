# The Haunted Snack Shop

A phone-friendly multiplayer party game. Players join a room with a six-character code, get different private clues about the same ghost, then vote on what snack the group should serve.

## Rules

- 2–8 players join a shop. The shopkeeper starts the game once at least two players are in the room.
- Each game has three ghost customers. Every player receives one private clue on their own screen; share clues out loud to work out the best snack.
- Everyone locks in one snack. When the crew has voted, the most popular snack is served. A tie counts as an order gone wrong.
- Correct deliveries earn one star for each player who chose the right snack, lower the haunt meter, and restock one ingredient.
- A wrong delivery raises the haunt meter by two and uses the chosen recipe’s ingredients. A tie raises it by one.
- The crew wins if they finish three orders before the haunt meter reaches five. The player with the most stars wins the shop’s bragging rights.

## Run locally

Install Node.js, then run `npm install`, `npm run build`, and `npx netlify dev`. Netlify Dev serves the site and its function together. The local Netlify Blobs store is separate from production.

## Deploy

This project is configured for Netlify Functions and Netlify Blobs. Connect this GitHub repo to Netlify and deploy with the default build settings (`npm run build`, publish directory `dist`). No environment variables or external database setup are needed. Rooms are stored in a strong-consistency Netlify Blobs store with conditional writes.

The game page calls `/.netlify/functions/game` directly. The production backend must run on Netlify for room creation and shared gameplay to work.

