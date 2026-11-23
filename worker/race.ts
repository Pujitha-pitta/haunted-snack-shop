// Versus race rooms for Midnight Rush. Every player cooks in their own kitchen
// on their own device; this room only keeps the lobby, a shared start time and
// seed, live scores, and pranks sent between players.
import { LEVELS } from "../src/game/data.js";

export const RACE_STAGES = [3, 6, 9, 14]; // level indexes players can race on
const MAX_PLAYERS = 8;
const COUNTDOWN_MS = 4000;
const PRANKS = ["lights", "thief", "boo"];
const PRANK_COOLDOWN_MS = 6000;
const MAX_PRANKS_PER_RACE = 6;
const LOBBY_TIMEOUT_MS = 30000;
const RACE_TIMEOUT_MS = 20000;

type Player = {
  id: string; name: string; seen: number; joinedAt: number;
  coins: number; served: number; combo: number; bestCombo: number; lost: number; wasted: number;
  stars: number; done: boolean; gone: boolean; pranks: number; lastPrankAt: number;
};
export type RaceRoom = {
  code: string; status: "lobby" | "racing" | "results"; hostId: string; stage: number;
  seed: number; round: number; startAt: number; endsAt: number; prankSeq: number;
  players: Player[]; inbox: Record<string, { id: number; kind: string; from: string; round: number }[]>;
  createdAt: number;
};

export class RaceError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const fail = (message: string, status = 400): never => { throw new RaceError(message, status); };
const cleanName = (value: unknown) => String(value ?? "").trim().replace(/[<>]/g, "").slice(0, 18);
const num = (value: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));

function blankStats(p: Player) {
  Object.assign(p, { coins: 0, served: 0, combo: 0, bestCombo: 0, lost: 0, wasted: 0, stars: 0, done: false, pranks: 0, lastPrankAt: 0 });
}

function newPlayer(id: string, name: string, now: number): Player {
  const p = { id, name, seen: now, joinedAt: now, gone: false } as Player;
  blankStats(p);
  return p;
}

export function createRoom(code: string, playerId: string, name: string, now: number): RaceRoom {
  const clean = cleanName(name);
  if (!clean) fail("Add your name first.");
  return { code, status: "lobby", hostId: playerId, stage: RACE_STAGES[0], seed: 0, round: 0, startAt: 0, endsAt: 0,
    prankSeq: 0, players: [newPlayer(playerId, clean, now)], inbox: {}, createdAt: now };
}

function me(room: RaceRoom, playerId: string) {
  const p = room.players.find(x => x.id === playerId);
  if (!p) fail("You're not in this room anymore. Join again with the code.", 403);
  return p!;
}

function requireHost(room: RaceRoom, playerId: string) {
  if (room.hostId !== playerId) fail("Only the host can do that.", 403);
}

function ranked(room: RaceRoom) {
  return [...room.players].sort((a, b) => b.coins - a.coins || b.served - a.served || a.joinedAt - b.joinedAt);
}

// Housekeeping on every request: drop idle lobby players, end finished races.
export function advance(room: RaceRoom, now: number) {
  if (room.status !== "racing") {
    room.players = room.players.filter(p => p.id === room.hostId || now - p.seen < LOBBY_TIMEOUT_MS);
    const host = room.players.find(p => p.id === room.hostId);
    if (host && now - host.seen > LOBBY_TIMEOUT_MS && room.players.length > 1) {
      room.players = room.players.filter(p => p.id !== host.id);
      room.hostId = room.players[0].id;
    }
  } else {
    for (const p of room.players) if (!p.done && now - p.seen > RACE_TIMEOUT_MS) { p.gone = true; p.done = true; }
    const active = room.players.filter(p => !p.gone);
    if (now > room.endsAt || active.every(p => p.done)) room.status = "results";
  }
}

export function view(room: RaceRoom, playerId: string, now: number) {
  const host = room.players.find(p => p.id === room.hostId);
  return {
    code: room.code, status: room.status, isHost: room.hostId === playerId, hostName: host?.name || "",
    stage: room.stage, stages: RACE_STAGES, seed: room.seed, round: room.round, startAt: room.startAt,
    endsAt: room.endsAt, now, me: playerId,
    players: ranked(room).map(p => ({ id: p.id, name: p.name, isHost: p.id === room.hostId, coins: p.coins, served: p.served,
      combo: p.combo, bestCombo: p.bestCombo, lost: p.lost, wasted: p.wasted, stars: p.stars, done: p.done, gone: p.gone })),
    inbox: (room.inbox[playerId] || []).filter(m => m.round === room.round)
  };
}

export function join(room: RaceRoom, playerId: string, name: string, now: number) {
  const clean = cleanName(name);
  if (!clean) fail("Add your name first.");
  if (room.status === "racing") fail("A race is running in this room. Try again when it ends.", 409);
  if (room.players.length >= MAX_PLAYERS) fail("This room is full (8 players max).", 409);
  room.players.push(newPlayer(playerId, clean, now));
}

// Apply one player action. The caller returns view() afterwards.
export function act(room: RaceRoom, playerId: string, body: any, now: number): any {
  const p = me(room, playerId);
  p.seen = now;
  switch (body.action) {
    case "get":
      return;
    case "stage": {
      requireHost(room, playerId);
      if (room.status === "racing") fail("Wait for this race to finish.", 409);
      const stage = Number(body.stage);
      if (!RACE_STAGES.includes(stage)) fail("Pick one of the race stages.");
      room.stage = stage;
      return;
    }
    case "start": {
      requireHost(room, playerId);
      if (room.status === "racing") fail("The race already started.", 409);
      if (room.players.length < 2) fail("You need at least one rival. Share the room code!", 409);
      room.status = "racing";
      room.round += 1;
      room.seed = (crypto.getRandomValues(new Uint32Array(1))[0] >>> 0) || 1;
      room.startAt = now + COUNTDOWN_MS;
      room.endsAt = room.startAt + LEVELS[room.stage].time * 1000 + 15000;
      room.inbox = {};
      for (const x of room.players) { blankStats(x); x.gone = false; x.seen = now; }
      return;
    }
    case "report": {
      if (room.status !== "racing" || Number(body.round) !== room.round || p.done) return;
      p.coins = num(body.coins, 9999);
      p.served = num(body.served, 50);
      p.combo = num(body.combo, 99);
      p.bestCombo = Math.max(p.bestCombo, num(body.bestCombo, 99));
      p.lost = num(body.lost, 50);
      p.wasted = num(body.wasted, 99);
      p.stars = num(body.stars, 3);
      if (body.done) p.done = true;
      advance(room, now);
      return;
    }
    case "prank": {
      if (room.status !== "racing" || now < room.startAt) fail("Pranks only work during a race.", 409);
      if (p.done) fail("You've already finished this race.", 409);
      const kind = String(body.kind);
      if (!PRANKS.includes(kind)) fail("Unknown prank.");
      if (now - p.lastPrankAt < PRANK_COOLDOWN_MS) fail("Your prank ghost is still recharging.", 429);
      if (p.pranks >= MAX_PRANKS_PER_RACE) fail("You're out of pranks for this race.", 429);
      // Target the leader, or the runner-up if you're in the lead.
      const rivals = ranked(room).filter(x => x.id !== p.id && !x.done && !x.gone);
      if (!rivals.length) fail("Everyone else has finished.", 409);
      const target = rivals[0];
      p.pranks += 1;
      p.lastPrankAt = now;
      room.prankSeq += 1;
      const box = (room.inbox[target.id] ||= []);
      box.push({ id: room.prankSeq, kind, from: p.name, round: room.round });
      if (box.length > 10) box.splice(0, box.length - 10);
      return { target: target.name };
    }
    case "lobby":
      requireHost(room, playerId);
      if (room.status !== "results") fail("Finish the race first.", 409);
      room.status = "lobby";
      return;
    case "leave":
      room.players = room.players.filter(x => x.id !== playerId);
      if (room.hostId === playerId && room.players.length) room.hostId = room.players[0].id;
      if (room.status === "racing") advance(room, now);
      return;
    default:
      fail("Unknown action.");
  }
}

// ---- Durable Object storage glue ----
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export async function handleRaceRequest(req: Request, storage: any) {
  try {
    const now = Date.now();
    const url = new URL(req.url);
    const body: any = req.method === "GET"
      ? { action: "get", code: url.searchParams.get("room"), playerId: url.searchParams.get("player") }
      : await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) fail("Enter a valid six-character room code.");

    if (body.action === "create") {
      const playerId = crypto.randomUUID();
      const room = createRoom(code, playerId, body.name, now);
      const created = await storage.transaction(async (txn: any) => {
        if ((await txn.get("race")) !== undefined) return false;
        await txn.put("race", room);
        return true;
      });
      if (!created) fail("ROOM_CODE_TAKEN", 409);
      return json({ room: view(room, playerId, now), playerId });
    }

    const result = await storage.transaction(async (txn: any) => {
      const room = (await txn.get("race")) as RaceRoom | undefined;
      if (!room) fail("Room not found. Check the code and try again.", 404);
      advance(room!, now);
      let playerId = String(body.playerId || "");
      let extra: any = undefined;
      if (body.action === "join") {
        playerId = crypto.randomUUID();
        join(room!, playerId, body.name, now);
      } else {
        extra = act(room!, playerId, body, now);
      }
      await txn.put("race", room);
      if (body.action === "leave") return { left: true };
      return { room: view(room!, playerId, now), playerId, ...(extra || {}) };
    });
    return json(result);
  } catch (error: any) {
    const status = error instanceof RaceError ? error.status : 500;
    return json({ error: error?.message || "The ghosts are having trouble. Try again." }, status);
  }
}
