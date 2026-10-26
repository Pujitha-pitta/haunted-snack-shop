import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { ORDER_DECK, PREP_RECIPES } from "../../src/orders.js";

const store = getStore({ name: "haunted-snack-shop", consistency: "strong" });
const MAX_PLAYERS = 8;
const MAX_TRIES = 12;
const TOTAL_ROUNDS = 9;
const pantryStart = { moonmilk: 4, sugar: 4, ectoplasm: 4, spice: 4 };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function fail(message: string, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, 18);
}

function newId() {
  return crypto.randomUUID();
}

function makeRoomCode() {
  return Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
}

function view(room: any, playerId: string) {
  const round = room.round;
  return {
    code: room.code,
    status: room.status,
    isHost: room.hostId === playerId,
    roundNumber: room.roundNumber,
    totalRounds: TOTAL_ROUNDS,
    haunt: room.haunt,
    pantry: room.pantry,
    players: room.players.map((p: any) => ({ name: p.name, stars: p.stars, isHost: p.id === room.hostId, online: p.online, voted: Boolean(round?.prep?.[p.id]?.done ?? round?.votes?.[p.id]) })),
    round: round ? {
      ghost: round.order.ghost,
      icon: round.order.icon,
      request: round.order.request,
      options: round.order.options,
      votesIn: Object.values(round.prep || {}).filter((p: any) => p.done).length,
      vote: round.votes[playerId] ?? null,
      prep: round.prep?.[playerId] ?? { ingredients: [], station: null, finish: null, done: false },
      result: round.result
    } : null,
    error: null
  };
}

function player(room: any, playerId: string) {
  const found = room.players.find((p: any) => p.id === playerId);
  if (!found) fail("That player is not in this room. Rejoin with the room code.", 403);
  return found;
}

function host(room: any, playerId: string) {
  player(room, playerId);
  if (room.hostId !== playerId) fail("Only the shop owner can do that.", 403);
}

function resolve(room: any) {
  const round = room.round;
  const counts: Record<string, number> = {};
  Object.values(round.votes).forEach((id: any) => { counts[id] = (counts[id] || 0) + 1; });
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const tied = Object.values(counts).filter((n) => n === winner[1]).length > 1;
  const chosen = tied ? null : winner[0];
  const correct = chosen === round.order.answer;
  const option = round.order.options.find((o: any) => o.id === chosen);

  if (correct) {
    room.players.forEach((p: any) => {
      if (round.votes[p.id] === chosen) p.stars += 1;
    });
    room.haunt = Math.max(0, room.haunt - 1);
    room.pantry[round.order.restock] += 1;
    room.round.result = { success: true, tied: false, chosen, recipe: option.name, message: `${round.order.ghost} loved the order! The kitchen earned a tip and the pantry restocked.` };
  } else {
    const level = Math.ceil(room.roundNumber / 3);
    room.haunt = Math.min(5, room.haunt + (tied ? level : level + 1));
    if (option) Object.keys(option.cost).forEach((key) => { room.pantry[key] = Math.max(0, room.pantry[key] - option.cost[key]); });
    room.round.result = {
      success: false,
      tied,
      chosen,
      recipe: option?.name ?? null,
      answer: round.order.options.find((o: any) => o.id === round.order.answer)?.name,
          message: tied ? `A tie! Nobody could decide, and the shop grew spookier (haunt +${level}).` : `${round.order.ghost} could not eat that order. The wrong dish used pantry supplies (haunt +${level + 1}).`
    };
  }
  room.status = "result";
}

function setupRound(room: any, roundIndex: number) {
  const order = room.deck[roundIndex];
  room.roundNumber = roundIndex + 1;
  room.round = { order, votes: {}, prep: {}, result: null };
  room.status = "playing";
}

async function mutate(code: string, callback: (room: any) => unknown) {
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const current = await store.getWithMetadata(code, { consistency: "strong", type: "json" });
    if (!current) fail("Room not found. Check the code and try again.", 404);
    const room = current.data as any;
    const result = callback(room);
    const saved = await store.setJSON(code, room, { onlyIfMatch: current.etag });
    if (saved.modified) {
      if (!saved.etag) throw new Error("Room update could not be confirmed. Please try again.");
      return result;
    }
  }
  fail("Lots happened at once. Please try that again.", 409);
}

export default async (req: Request, _context: Context) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" } });
    if (req.method === "GET") {
      const code = (new URL(req.url).searchParams.get("room") || "").toUpperCase();
      const playerId = new URL(req.url).searchParams.get("player") || "";
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) fail("Enter a valid six-character room code.");
      const room = await store.get(code, { consistency: "strong", type: "json" }) as any;
      if (!room) fail("Room not found. Check the code and try again.", 404);
      player(room, playerId);
      return json(view(room, playerId));
    }
    if (req.method !== "POST") return json({ error: "Use GET or POST." }, 405);

    const body = await req.json() as any;
    const { action } = body;

    if (action === "create") {
      const name = cleanName(body.name);
      if (!name) fail("Add your name first.");
      const playerId = newId();
      for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
        const code = makeRoomCode();
        const room = {
          code, status: "lobby", hostId: playerId, roundNumber: 0, haunt: 0,
          pantry: { ...pantryStart }, deck: [], round: null,
          players: [{ id: playerId, name, stars: 0, online: true }], createdAt: Date.now()
        };
        const saved = await store.setJSON(code, room, { onlyIfNew: true });
        if (saved.modified) return json({ room: view(room, playerId), playerId });
      }
      fail("Could not find an open room code. Try again.", 503);
    }

    const code = String(body.code || "").trim().toUpperCase();
    const playerId = String(body.playerId || "");
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) fail("Enter a valid six-character room code.");

    if (action === "join") {
      const name = cleanName(body.name);
      if (!name) fail("Add your name first.");
      const id = newId();
      const result = await mutate(code, (room) => {
        if (room.status !== "lobby") fail("This game has already started.", 409);
        if (room.players.length >= MAX_PLAYERS) fail("This shop is full (8 players max).", 409);
        room.players.push({ id, name, stars: 0, online: true });
        return view(room, id);
      });
      return json({ room: result, playerId: id });
    }

    if (!playerId) fail("Rejoin this room from the same device.", 403);
    const result = await mutate(code, (room) => {
      const me = player(room, playerId);
      if (action === "get") return view(room, playerId);
      if (action === "start") {
        host(room, playerId);
        if (room.status !== "lobby") fail("The game has already started.", 409);
        if (room.players.length < 2) fail("Invite at least one more player before starting.");
        room.deck = [...ORDER_DECK].sort(() => Math.random() - 0.5).slice(0, TOTAL_ROUNDS);
        room.players.forEach((p: any) => { p.stars = 0; });
        room.haunt = 0;
        room.pantry = { ...pantryStart };
        setupRound(room, 0);
        room.status = "instructions";
        return view(room, playerId);
      }
      if (action === "begin") {
        host(room, playerId);
        if (room.status !== "instructions") fail("The shift briefing is already complete.", 409);
        room.status = "playing";
        return view(room, playerId);
      }
      if (action === "prep") {
        if (room.status !== "playing") fail("The kitchen ticket window is closed.", 409);
        room.round.prep ||= {};
        const progress = room.round.prep[playerId] ||= { ingredients: [], station: null, finish: null, done: false };
        if (progress.done) fail("Your order is already cooking.", 409);
        const { kind, value } = body;
        if (kind === "ingredient") {
          if (progress.ingredients.length >= 2) fail("The mixing bowl is ready for the stove.", 409);
          if (!(value in pantryStart) || room.pantry[value] < 1) fail("That ingredient is out of stock.", 409);
          progress.ingredients.push(value);
        } else if (kind === "station") {
          if (progress.ingredients.length !== 2 || progress.station) fail("Add two ingredients before choosing a station.", 409);
          if (!["stove", "oven", "mixer", "kettle"].includes(value)) fail("Choose a kitchen station.");
          progress.station = value;
        } else if (kind === "finish") {
          if (!progress.station || progress.finish) fail("Choose a station before finishing the dish.", 409);
          if (!["bake", "chill", "crunch", "dip", "dust", "fizz", "pop", "steep"].includes(value)) fail("Choose how to finish the order.");
          progress.finish = value;
          const ingredients = [...progress.ingredients].sort().join("+");
          const recipe = Object.entries(PREP_RECIPES).find(([, prep]: any) => [...prep.ingredients].sort().join("+") === ingredients && prep.station === progress.station && prep.finish === value);
          const chosen = recipe && room.round.order.options.some((o: any) => o.id === recipe[0]) ? recipe[0] : "mystery";
          progress.done = true;
          room.round.votes[playerId] = chosen;
          if (Object.values(room.round.prep).filter((p: any) => p.done).length === room.players.length) resolve(room);
        } else {
          fail("That kitchen action is not available.");
        }
        return view(room, playerId);
      }
      if (action === "next") {
        host(room, playerId);
        if (room.status !== "result") fail("Finish the current order first.", 409);
        if (room.roundNumber >= TOTAL_ROUNDS || room.haunt >= 5) {
          room.status = "finished";
          return view(room, playerId);
        }
        setupRound(room, room.roundNumber);
        return view(room, playerId);
      }
      if (action === "rejoin") {
        me.online = true;
        return view(room, playerId);
      }
      fail("Unknown game action.");
    });
    return json({ room: result });
  } catch (error: any) {
    return json({ error: error?.message || "The ghosts are having trouble. Try again." }, error?.status || 500);
  }
};
