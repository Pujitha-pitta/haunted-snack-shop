import { MENU, STATIONS, CUSTOMER_ORDERS } from "../src/menu.js";

const MAX_PLAYERS = 8;
const LEVELS = ["Midnight Rush", "Witching Hour", "Ghost King’s Feast"];
const CUSTOMER_GOAL = 8;
const COIN_GOAL = 120;
const SHIFT_MS = 90000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, 18);
}
function newId() {
  return crypto.randomUUID();
}
function emptyStation() {
  return { status: "idle", item: null, prepStep: 0, startedAt: null, readyAt: null, burnAt: null, cookedBy: null };
}
function stationSet() {
  return { grill: emptyStation(), fryer: emptyStation(), mixer: emptyStation(), oven: emptyStation() };
}
function resetShift(room: any) {
  room.status = "instructions";
  room.startedAt = null;
  room.endsAt = null;
  room.nextTicketAt = null;
  room.spawned = 0;
  room.served = 0;
  room.lost = 0;
  room.combo = 0;
  room.earned = 0;
  room.tickets = [];
  room.readyItems = [];
  room.stations = stationSet();
  room.result = null;
  room.lastEvent = "The kitchen is ready. Get your crew together!";
}
function migrate(room: any) {
  if (room.mode === "arcade") return;
  room.mode = "arcade";
  room.status = "lobby";
  room.level = 1;
  room.coins = 0;
  room.earned = 0;
  room.served = 0;
  room.lost = 0;
  room.spawned = 0;
  room.combo = 0;
  room.bestCombo = 0;
  room.upgrades = { grill: 0, fryer: 0, mixer: 0, oven: 0 };
  room.players = (room.players || []).slice(0, MAX_PLAYERS).map((p: any) => ({ ...p, stars: 0, online: true }));
  room.tickets = [];
  room.readyItems = [];
  room.stations = stationSet();
  room.result = null;
  room.lastEvent = "A fresh restaurant shift! Invite your crew to open the doors.";
}
function spawnTicket(room: any, now: number) {
  if (room.spawned >= CUSTOMER_GOAL || room.tickets.length >= 3) return;
  const template = CUSTOMER_ORDERS[(room.spawned + (room.level - 1) * 3) % CUSTOMER_ORDERS.length];
  const patience = Math.max(16000, 25000 - (room.level - 1) * 3000);
  room.tickets.push({
    id: newId(), type: template.type, icon: template.icon, items: [...template.items],
    createdAt: now, deadlineAt: Math.min(now + patience, room.endsAt)
  });
  room.spawned += 1;
  room.lastEvent = template.type + " just walked in!";
}
function finishLevel(room: any, now: number) {
  if (room.status !== "playing") return;
  room.status = "result";
  const stars = (room.served >= 4 ? 1 : 0) + (room.earned >= COIN_GOAL ? 1 : 0) + (room.lost === 0 && room.served >= 6 ? 1 : 0);
  room.result = {
    served: room.served, lost: room.lost, earned: room.earned, target: COIN_GOAL,
    stars, bestCombo: room.bestCombo || 0, won: room.served >= 4
  };
  room.lastEvent = room.served >= 4 ? "Shift complete! Your crew kept the diner alive." : "The ghosts took over the diner. Try again!";
  room.endsAt = now;
}
function advance(room: any) {
  if (room.status !== "playing") return;
  const now = Date.now();
  for (const station of Object.values(room.stations) as any[]) {
    if (station.status === "cooking" && now >= station.readyAt) {
      station.status = "ready";
      station.readyAt = now;
      station.burnAt = now + 10000;
      room.lastEvent = MENU[station.item as keyof typeof MENU].name + " is ready! Collect it before it burns.";
    } else if (station.status === "ready" && now >= station.burnAt) {
      station.status = "burnt";
      station.burnAt = null;
      room.combo = 0;
      room.lastEvent = "Oops! " + MENU[station.item as keyof typeof MENU].name + " burnt. Clear the station.";
    }
  }
  const expired = room.tickets.filter((ticket: any) => now >= ticket.deadlineAt);
  if (expired.length) {
    room.lost += expired.length;
    room.tickets = room.tickets.filter((ticket: any) => now < ticket.deadlineAt);
    room.combo = 0;
    room.lastEvent = expired.length === 1 ? expired[0].type + " floated away without their order!" : "Customers lost patience and floated away!";
  }
  if (room.spawned < CUSTOMER_GOAL && room.tickets.length < 3 && now >= room.nextTicketAt && now < room.endsAt) {
    spawnTicket(room, now);
    room.nextTicketAt = now + Math.max(6500, 9000 - (room.level - 1) * 900);
  }
  if (now >= room.endsAt || (room.spawned >= CUSTOMER_GOAL && room.tickets.length === 0)) finishLevel(room, now);
}
function getPlayer(room: any, id: string) {
  const found = (room.players || []).find((p: any) => p.id === id);
  if (!found) fail("That player is not in this room. Rejoin with the room code.", 403);
  return found;
}
function requireHost(room: any, id: string) {
  getPlayer(room, id);
  if (room.hostId !== id) fail("Only the shop owner can do that.", 403);
}
function view(room: any, playerId: string) {
  const now = Date.now();
  return {
    code: room.code, mode: "arcade", status: room.status, isHost: room.hostId === playerId,
    level: room.level || 1, levelName: LEVELS[(room.level || 1) - 1], maxLevels: LEVELS.length,
    customersPerLevel: CUSTOMER_GOAL, coinTarget: COIN_GOAL,
    players: (room.players || []).map((p: any) => ({ id: p.id, name: p.name, stars: p.stars || 0, isHost: p.id === room.hostId, online: p.online !== false })),
    coins: room.coins || 0, earned: room.earned || 0, served: room.served || 0, lost: room.lost || 0,
    spawned: room.spawned || 0, combo: room.combo || 0, bestCombo: room.bestCombo || 0,
    startedAt: room.startedAt || null, endsAt: room.endsAt || null, lastEvent: room.lastEvent || "",
    tickets: (room.tickets || []).map((ticket: any) => ({
      id: ticket.id, type: ticket.type, icon: ticket.icon,
      items: ticket.items.map((id: string) => ({ id, ...MENU[id as keyof typeof MENU] })),
      createdAt: ticket.createdAt, deadlineAt: ticket.deadlineAt, patienceLeft: Math.max(0, ticket.deadlineAt - now)
    })),
    stations: room.stations || stationSet(),
    readyItems: (room.readyItems || []).map((item: any) => ({ ...item, ...MENU[item.dish as keyof typeof MENU] })),
    upgrades: room.upgrades || { grill: 0, fryer: 0, mixer: 0, oven: 0 },
    result: room.result || null, error: null
  };
}
async function mutate(storage: any, callback: (room: any) => unknown) {
  return storage.transaction(async (txn: any) => {
    const room = await txn.get("room");
    if (!room) fail("Room not found. Check the code and try again.", 404);
    migrate(room);
    advance(room);
    const result = callback(room);
    await txn.put("room", room);
    return result;
  });
}
async function handleGameRequest(req: Request, storage: any) {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204 });
    if (req.method === "GET") {
      const url = new URL(req.url);
      const code = (url.searchParams.get("room") || "").toUpperCase();
      const playerId = url.searchParams.get("player") || "";
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) fail("Enter a valid six-character room code.");
      return json(await mutate(storage, room => {
        getPlayer(room, playerId);
        return view(room, playerId);
      }));
    }
    if (req.method !== "POST") return json({ error: "Use GET or POST." }, 405);
    const body = await req.json() as any;
    if (body.action === "create") {
      const name = cleanName(body.name);
      if (!name) fail("Add your name first.");
      const playerId = newId();
      const code = String(body.code || "").trim().toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) fail("Could not make a room code. Try again.", 503);
      const room = {
        code, mode: "arcade", status: "lobby", hostId: playerId, level: 1, coins: 0,
        players: [{ id: playerId, name, stars: 0, online: true }],
        upgrades: { grill: 0, fryer: 0, mixer: 0, oven: 0 }, tickets: [], readyItems: [],
        stations: stationSet(), served: 0, lost: 0, spawned: 0, combo: 0, bestCombo: 0,
        earned: 0, result: null, createdAt: Date.now(), lastEvent: "Invite your crew and start the shift."
      };
      const created = await storage.transaction(async (txn: any) => {
        if (await txn.get("room") !== undefined) return false;
        await txn.put("room", room);
        return true;
      });
      if (!created) fail("ROOM_CODE_TAKEN", 409);
      return json({ room: view(room, playerId), playerId });
    }
    const code = String(body.code || "").trim().toUpperCase();
    const playerId = String(body.playerId || "");
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) fail("Enter a valid six-character room code.");
    if (body.action === "join") {
      const name = cleanName(body.name);
      if (!name) fail("Add your name first.");
      const id = newId();
      const joined = await mutate(storage, room => {
        if (room.status !== "lobby") fail("This shift has already started.", 409);
        if (room.players.length >= MAX_PLAYERS) fail("This shop is full (8 players max).", 409);
        room.players.push({ id, name, stars: 0, online: true });
        return view(room, id);
      });
      return json({ room: joined, playerId: id });
    }
    if (!playerId) fail("Rejoin this room from the same device.", 403);
    const result = await mutate(storage, room => {
      const me = getPlayer(room, playerId);
      if (body.action === "get") return view(room, playerId);
      if (body.action === "start") {
        requireHost(room, playerId);
        if (room.status !== "lobby") fail("The shop is already open.", 409);
        if (room.players.length < 2) fail("Invite at least one more player before starting.");
        room.level = 1;
        room.coins = 0;
        room.upgrades = { grill: 0, fryer: 0, mixer: 0, oven: 0 };
        room.players.forEach((p: any) => { p.stars = 0; });
        resetShift(room);
        return view(room, playerId);
      }
      if (body.action === "begin") {
        requireHost(room, playerId);
        if (room.status !== "instructions") fail("Shift briefing already complete.", 409);
        const now = Date.now();
        room.status = "playing";
        room.startedAt = now;
        room.endsAt = now + SHIFT_MS;
        room.nextTicketAt = now + 9000;
        room.spawned = 0;
        room.tickets = [];
        room.stations = stationSet();
        spawnTicket(room, now);
        return view(room, playerId);
      }
      if (body.action === "cook") {
        if (room.status !== "playing") fail("The shift is not running.", 409);
        const itemId = String(body.item || "");
        const dish = MENU[itemId as keyof typeof MENU];
        if (!dish) fail("Choose an item from the menu.");
        const station = room.stations[dish.station];
        if (station.status !== "idle") fail(STATIONS[dish.station].name + " is busy. Collect or clear its current item first.", 409);
        const speed = Math.max(0.55, 1 - 0.15 * (room.upgrades[dish.station] || 0));
        const startedAt = Date.now();
        station.status = "prepping";
        station.item = itemId;
        station.startedAt = startedAt;
        station.prepStep = 0;
        station.readyAt = null;
        station.burnAt = null;
        station.cookedBy = playerId;
        room.lastEvent = me.name + " started preparing " + dish.name + "!";
        return view(room, playerId);
      }
      if (body.action === "ingredient") {
        if (room.status !== "playing") fail("The shift is not running.", 409);
        const station = room.stations[String(body.station || "")];
        if (!station || station.status !== "prepping") fail("Choose a station with food being prepared.", 409);
        const dish = MENU[station.item as keyof typeof MENU];
        const prepSteps = dish?.prep || ["Prepare the ingredients"];
        station.prepStep = Math.max(0, Number(station.prepStep) || 0);
        if (!dish || station.prepStep >= prepSteps.length) fail("That recipe is already cooking.", 409);
        station.prepStep += 1;
        if (station.prepStep >= prepSteps.length) {
          const stationId = MENU[station.item as keyof typeof MENU].station;
          const speed = Math.max(0.55, 1 - 0.15 * (room.upgrades[stationId] || 0));
          const startedAt = Date.now();
          station.status = "cooking";
          station.startedAt = startedAt;
          station.readyAt = startedAt + Math.round(dish.seconds * speed * 1000);
          room.lastEvent = dish.name + " is cooking. Watch the station!";
        } else {
          room.lastEvent = me.name + " · " + prepSteps[station.prepStep - 1] + "!";
        }
        return view(room, playerId);
      }
      if (body.action === "collect") {
        if (room.status !== "playing") fail("The shift is not running.", 409);
        const station = room.stations[String(body.station || "")];
        if (!station) fail("Choose a kitchen station.");
        if (station.status === "cooking") fail("Still cooking! Watch the timer.", 409);
        if (station.status === "idle") fail("That station is empty.", 409);
        if (station.status === "burnt") {
          Object.assign(station, emptyStation());
          room.lastEvent = "Burnt food cleared. That station is ready again.";
          return view(room, playerId);
        }
        room.readyItems.push({ id: newId(), dish: station.item, collectedAt: Date.now(), cookedBy: station.cookedBy });
        const servedDish = MENU[station.item as keyof typeof MENU].name;
        Object.assign(station, emptyStation());
        room.lastEvent = servedDish + " added to the serving pass!";
        return view(room, playerId);
      }
      if (body.action === "serve") {
        if (room.status !== "playing") fail("The shift is not running.", 409);
        const ticket = room.tickets.find((t: any) => t.id === body.ticketId);
        if (!ticket) fail("That customer has already left.", 409);
        const used: number[] = [];
        for (const dish of ticket.items) {
          const index = room.readyItems.findIndex((item: any, i: number) => item.dish === dish && !used.includes(i));
          if (index < 0) fail("Part of this order is still cooking. Finish the food at the stations first.", 409);
          used.push(index);
        }
        const remaining = ticket.deadlineAt - Date.now();
        used.sort((a, b) => b - a).forEach(index => room.readyItems.splice(index, 1));
        room.tickets = room.tickets.filter((t: any) => t.id !== ticket.id);
        room.combo += 1;
        room.bestCombo = Math.max(room.bestCombo || 0, room.combo);
        const speedTip = remaining > 14000 ? 4 : remaining > 7000 ? 2 : 0;
        const comboTip = Math.min(4, Math.max(0, room.combo - 1));
        const vipTip = ticket.type === "Vampire VIP" ? 2 : 0;
        const reward = 12 + speedTip + comboTip + vipTip;
        room.coins += reward;
        room.earned += reward;
        room.served += 1;
        me.stars += 1 + (room.combo >= 4 ? 1 : 0);
        room.lastEvent = "Order served! +" + reward + " coins" + (room.combo > 1 ? " · " + room.combo + "x combo!" : "");
        return view(room, playerId);
      }
      if (body.action === "upgrade") {
        requireHost(room, playerId);
        if (room.status !== "result") fail("Kitchen upgrades open between levels.", 409);
        const station = String(body.station || "");
        if (!(station in STATIONS)) fail("Choose a valid station.");
        const tier = room.upgrades[station] || 0;
        const cost = 30 + tier * 25;
        if (tier >= 2) fail("That station is fully upgraded.");
        if (room.coins < cost) fail("You need more coins for that upgrade.");
        room.coins -= cost;
        room.upgrades[station] = tier + 1;
        room.lastEvent = STATIONS[station].name + " upgraded! It now cooks 15% faster.";
        return view(room, playerId);
      }
      if (body.action === "next") {
        requireHost(room, playerId);
        if (room.status !== "result") fail("Finish the shift first.", 409);
        if (room.level >= LEVELS.length) {
          room.status = "finished";
          return view(room, playerId);
        }
        room.level += 1;
        resetShift(room);
        return view(room, playerId);
      }
      if (body.action === "replay") {
        requireHost(room, playerId);
        if (room.status !== "finished") fail("Close the current night first.", 409);
        room.level = 1;
        room.coins = 0;
        room.upgrades = { grill: 0, fryer: 0, mixer: 0, oven: 0 };
        room.players.forEach((p: any) => { p.stars = 0; });
        resetShift(room);
        return view(room, playerId);
      }
      fail("Unknown kitchen action.");
    });
    return json({ room: result });
  } catch (error: any) {
    return json({ error: error?.message || "The ghosts are having trouble. Try again." }, error?.status || 500);
  }
}
type Env = { ROOMS: any; ASSETS: any };
function randomRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
}
export class GameRoom {
  constructor(private state: any) {}
  async fetch(request: Request) {
    return handleGameRequest(request, this.state.storage);
  }
}
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/game" && url.pathname !== "/.netlify/functions/game") return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    let body: any = null;
    if (request.method === "POST") {
      try { body = await request.clone().json(); }
      catch { return json({ error: "Send a valid game action." }, 400); }
    }
    if (body?.action === "create") {
      for (let attempt = 0; attempt < 12; attempt++) {
        const code = randomRoomCode();
        const room = env.ROOMS.get(env.ROOMS.idFromName(code));
        const roomUrl = new URL(request.url);
        roomUrl.hostname = "room.internal";
        const roomRequest = new Request(roomUrl, { method: "POST", headers: request.headers, body: JSON.stringify({ ...body, code }) });
        const response = await room.fetch(roomRequest);
        const result = await response.clone().json().catch(() => ({}));
        if (response.status !== 409 || result.error !== "ROOM_CODE_TAKEN") return response;
      }
      return json({ error: "Could not find an open room code. Try again." }, 503);
    }
    const code = String(request.method === "GET" ? url.searchParams.get("room") : body?.code || "").trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return json({ error: "Enter a valid six-character room code." }, 400);
    const room = env.ROOMS.get(env.ROOMS.idFromName(code));
    const roomUrl = new URL(request.url);
    roomUrl.hostname = "room.internal";
    return room.fetch(new Request(roomUrl, request));
  }
};


