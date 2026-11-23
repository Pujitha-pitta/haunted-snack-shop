// Versus race: 2–8 players cook the same level with the same customers on
// their own devices. The server (worker/race.ts) keeps the lobby, start time,
// live scores and pranks. Each kitchen runs locally, so there is no input lag.
import { LEVELS } from "./data.js";
import { applyQuestStats } from "./save.js";
import { sfx } from "./audio.js";
import { startLevel, showMap, leaveGame, topNav, esc, banner, getSave, savePersist, appRoot, kitchenEl } from "./ui.js";

const API = "/api/race";
const KEY = "hss-race";
const POLL_MS = 1000;
const PRANK_COOLDOWN_MS = 6000;
const MAX_CHARGES = 3;

export const STAGES = {
  3: { name: "Snack Dash", icon: "🍔", blurb: "Burgers, fries and shakes for Hungry Ghosts." },
  6: { name: "Lights Out Rush", icon: "🌑", blurb: "Angry Zombies and flickering lights." },
  9: { name: "Ghost King Showdown", icon: "👑", blurb: "Who can feed the Ghost King's feast first?" },
  14: { name: "Midnight Mayhem", icon: "🌙", blurb: "All five recipes, every customer, total chaos." }
};
const PRANKS = {
  lights: { icon: "🌑", name: "Lights Out", text: "turned off your lights" },
  thief: { icon: "👻", name: "Thief Ghost", text: "sent a thief ghost. Tap it" },
  boo: { icon: "😱", name: "BOO!", text: "spooked your customers" }
};
const MEDALS = ["🥇", "🥈", "🥉"];

let session = loadSession();     // { code, playerId, name }
let room = null;
let screen = null;               // "home" | "lobby" | "countdown" | "race" | "waiting" | "podium"
let pollTimer = 0;
let countdownTimer = 0;
let offset = 0;                  // server clock minus local clock
let busy = false;
let race = null;                 // per-round local state while racing

function loadSession() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } }
function saveSession() { try { session ? localStorage.setItem(KEY, JSON.stringify(session)) : localStorage.removeItem(KEY); } catch {} }
const serverNow = () => Date.now() + offset;
const myName = () => session?.name || getSave().playerName || "";

async function api(action, payload = {}) {
  const get = action === "get";
  const url = get ? `${API}?room=${encodeURIComponent(session?.code || "")}&player=${encodeURIComponent(session?.playerId || "")}` : API;
  let res;
  try {
    res = await fetch(url, {
      method: get ? "GET" : "POST",
      headers: get ? undefined : { "content-type": "application/json" },
      body: get ? undefined : JSON.stringify({ action, code: session?.code, playerId: session?.playerId, ...payload }),
      cache: "no-store"
    });
  } catch {
    throw Object.assign(new Error("Can't reach the race server. Check your connection."), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "The ghosts are having trouble. Try again."), { status: res.status });
  if (data.room?.now) offset = data.room.now - Date.now();
  return data;
}

function toast(text, kind = "") {
  let el = document.getElementById("race-toast");
  if (!el) { el = document.createElement("div"); el.id = "race-toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = text;
  el.className = `race-toast show ${kind}`;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.className = "race-toast"; }, 2600);
}

function stopPolling() { clearInterval(pollTimer); pollTimer = 0; }
function startPolling() { stopPolling(); pollTimer = setInterval(tick, POLL_MS); }

function forget(message) {
  stopPolling();
  clearInterval(countdownTimer);
  session = null; room = null; race = null; screen = null;
  saveSession();
  leaveGame();
  showRaceHome("");
  if (message) toast(message, "bad");
}

// ---------------- Home (create / join) ----------------
export function showRaceHome(prefill = "") {
  leaveGame();
  stopPolling();
  if (session && (!prefill || prefill === session.code)) { resume(); return; }
  if (session && prefill !== session.code) { session = null; saveSession(); }
  screen = "home";
  appRoot().innerHTML = `<div class="screen race-screen">
    ${topNav(true)}
    <div class="page-head"><h2>👥 Versus Race</h2><p>Race your friends in your own kitchens. Everyone gets the same customers. The most coins at midnight wins!</p></div>
    <div class="race-how">
      <div><span>1</span><b>Share a room code</b><small>2–8 players, any phone or laptop.</small></div>
      <div><span>2</span><b>Cook the same rush</b><small>Same level, same customers, same clock.</small></div>
      <div><span>3</span><b>Prank the leader</b><small>Combos charge spooky pranks.</small></div>
    </div>
    <div class="race-forms">
      <label class="field"><span>Your chef name</span><input id="race-name" maxlength="18" placeholder="e.g. Mothman" autocomplete="nickname" value="${esc(myName())}"></label>
      <button class="btn primary big" data-act="race-create">Create a race room →</button>
      <div class="or"><span>OR JOIN A ROOM</span></div>
      <label class="field"><span>Room code</span><input id="race-code" class="code-field" maxlength="6" placeholder="ABC123" autocomplete="off" value="${esc(prefill)}"></label>
      <button class="btn big" data-act="race-join">Join race ↗</button>
    </div>
    <p class="race-note">Upgrades don't count in races. Everyone gets the same standard kitchen. Coins you earn still go into your wallet.</p>
  </div>`;
}

function readName() {
  const name = document.getElementById("race-name")?.value.trim() || "";
  if (!name) { toast("Add your chef name first.", "bad"); return ""; }
  const save = getSave();
  save.playerName = name;
  savePersist();
  return name;
}

async function create() {
  const name = readName();
  if (!name || busy) return;
  busy = true;
  try {
    session = null;
    const data = await api("create", { name, code: "AAAAAA" }); // the worker picks the real code
    session = { code: data.room.code, playerId: data.playerId, name };
    saveSession();
    history.replaceState({}, "", "/?race=" + data.room.code);
    applyRoom(data.room);
    startPolling();
  } catch (e) { toast(e.message, "bad"); }
  finally { busy = false; }
}

async function join() {
  const name = readName();
  const code = (document.getElementById("race-code")?.value || "").trim().toUpperCase();
  if (!name || busy) return;
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) { toast("Room codes are 6 letters and numbers.", "bad"); return; }
  busy = true;
  try {
    session = { code, playerId: "", name };
    const data = await api("join", { name });
    session.playerId = data.playerId;
    saveSession();
    history.replaceState({}, "", "/?race=" + code);
    applyRoom(data.room);
    startPolling();
  } catch (e) { session = null; toast(e.message, "bad"); }
  finally { busy = false; }
}

async function resume() {
  try {
    const data = await api("get");
    applyRoom(data.room);
    startPolling();
  } catch (e) {
    const code = session?.code || "";
    session = null; saveSession();
    showRaceHome(code);
    toast(e.status === 404 || e.status === 403 ? "That race room has closed. Create a new one!" : e.message, "bad");
  }
}

// ---------------- Polling & room state ----------------
async function tick() {
  if (busy || !session) return;
  try {
    const r = race;
    const reporting = r && r.run && r.round === room?.round && !r.reportedDone;
    const data = reporting ? await api("report", report(r)) : await api("get");
    if (reporting && r.run.over) r.reportedDone = true;
    applyRoom(data.room);
  } catch (e) {
    if (e.status === 404 || e.status === 403) forget("You left the race room.");
  }
}

function report(r) {
  const run = r.run;
  return { round: r.round, coins: run.coins, served: run.served, combo: run.combo, bestCombo: run.bestCombo,
    lost: run.lost, wasted: run.wasted, stars: run.stars || 0, done: !!run.over };
}

function applyRoom(next) {
  room = next;
  if (room.status === "lobby") {
    if (screen !== "lobby") { leaveGame(); race = null; }
    renderLobby();
  } else if (room.status === "racing") {
    if (!race || race.round !== room.round) beginCountdown();
    else if (screen === "race") receivePranks();
    else if (screen === "waiting") renderWaiting();
  } else if (room.status === "results") {
    // The server ended the race (time limit) while this kitchen was still open.
    if (screen === "race" && race?.run && !race.run.over) { recordRewards(race.run); }
    if (screen === "race" && race?.run?.over && !race.recorded) return; // finishRace will take over
    renderPodium();
  }
}

// ---------------- Lobby ----------------
function playerRow(p, i, live) {
  const isMe = p.id === session?.playerId;
  return `<li class="${isMe ? "me" : ""} ${p.gone ? "gone" : ""}"><span class="rank">${live ? (MEDALS[i] || `#${i + 1}`) : p.isHost ? "👑" : "👩‍🍳"}</span><b>${esc(p.name)}${isMe ? " (you)" : ""}</b>${live ? `<em>🪙 ${p.coins}</em><small>${p.served} served${p.done && !p.gone ? " · ✓ done" : ""}${p.gone ? " · left" : ""}</small>` : `<small>${p.isHost ? "HOST" : "READY"}</small>`}</li>`;
}

function renderLobby() {
  screen = "lobby";
  const stage = STAGES[room.stage];
  const stages = room.stages.map(i => {
    const s = STAGES[i];
    const on = i === room.stage;
    const inner = `<span>${s.icon}</span><b>${esc(s.name)}</b><small>${esc(s.blurb)}</small><em>${LEVELS[i].time}s</em>`;
    return room.isHost
      ? `<button class="stage-card ${on ? "on" : ""}" data-act="race-stage" data-stage="${i}" aria-pressed="${on}">${inner}</button>`
      : `<div class="stage-card ${on ? "on" : ""}">${inner}</div>`;
  }).join("");
  appRoot().innerHTML = `<div class="screen race-screen">
    <header class="topnav"><button class="icon-btn" data-act="race-leave" aria-label="Leave room">←</button><div class="pills"><span class="pill">👥 ${room.players.length}/8</span></div></header>
    <div class="room-code"><small>ROOM CODE · SHARE WITH FRIENDS</small><b>${esc(room.code)}</b><button class="btn small" data-act="race-copy">Copy invite link 🔗</button></div>
    <section class="race-panel"><h3>Chefs in the room</h3><ul class="race-players">${room.players.map((p, i) => playerRow(p, i, false)).join("")}</ul></section>
    <section class="race-panel"><h3>${room.isHost ? "Pick the race" : `Race: ${stage.icon} ${esc(stage.name)}`}</h3><div class="stage-grid">${stages}</div></section>
    ${room.isHost
      ? `<button class="btn primary big wide" data-act="race-start" ${room.players.length < 2 ? "disabled" : ""}>${room.players.length < 2 ? "Waiting for a rival to join…" : "Start the race! →"}</button>`
      : `<div class="wait-pill"><span class="pulse-dot"></span>Waiting for ${esc(room.hostName)} to start the race…</div>`}
  </div>`;
}

// ---------------- Countdown & race ----------------
function beginCountdown() {
  leaveGame();
  race = { round: room.round, seed: room.seed, stage: room.stage, run: null, seen: new Set(), charges: 1,
    lastCombo: 0, cooldownUntil: 0, boardKey: "", prankKey: "", reportedDone: false, recorded: false };
  screen = "countdown";
  const stage = STAGES[room.stage];
  appRoot().innerHTML = `<div class="screen race-countdown">
    <div class="cd-stage">${stage.icon} ${esc(stage.name)}</div>
    <div class="cd-number" id="cd-number">3</div>
    <p>Same customers for everyone. Serve fast, chain combos to charge pranks, and finish with the most coins!</p>
    <ul class="race-players compact">${room.players.map((p, i) => playerRow(p, i, false)).join("")}</ul>
  </div>`;
  clearInterval(countdownTimer);
  let last = -1;
  const step = () => {
    const left = room.startAt - serverNow();
    const n = Math.min(3, Math.ceil(left / 1000));
    const el = document.getElementById("cd-number");
    if (left <= 0) { clearInterval(countdownTimer); startRace(); return; }
    if (el && n !== last) { last = n; el.textContent = n; el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick"); sfx.tap(); }
  };
  step();
  countdownTimer = setInterval(step, 100);
}

function startRace() {
  if (!race || screen !== "countdown") return;
  screen = "race";
  sfx.fanfare();
  const stage = STAGES[race.stage];
  startLevel(race.stage, {
    seed: race.seed,
    upgrades: race.stage >= 7 ? { "grill.slot": 1 } : {},
    title: `${stage.icon} ${stage.name}`,
    onFrame: (run) => { race.run = run; raceFrame(run); },
    onOver: (run) => finishRace(run)
  });
}

function raceFrame(run) {
  // Every third combo step charges one prank.
  if (run.combo > race.lastCombo && run.combo % 3 === 0 && race.charges < MAX_CHARGES) {
    race.charges++;
    banner("🎃 Prank charged! Send it to the leader!", "good");
  }
  race.lastCombo = run.combo;
  renderBoard(run);
  renderPrankBar();
}

function livePlayers(run) {
  const players = room.players.map(p => p.id === session.playerId ? { ...p, coins: run.coins, served: run.served, done: run.over } : p);
  return players.sort((a, b) => b.coins - a.coins || b.served - a.served);
}

function renderBoard(run) {
  const el = kitchenEl("raceboard");
  if (!el) return;
  const players = livePlayers(run);
  const key = players.map(p => `${p.id}:${p.coins}:${p.done}`).join("|");
  if (key === race.boardKey) return;
  race.boardKey = key;
  el.innerHTML = players.map((p, i) => `<span class="rb ${p.id === session.playerId ? "me" : ""} ${p.done ? "done" : ""}"><i>${MEDALS[i] || i + 1}</i>${esc(p.name)}<b>🪙${p.coins}</b>${p.done ? "✓" : ""}</span>`).join("");
}

function renderPrankBar() {
  const el = kitchenEl("prankbar");
  if (!el) return;
  const cooling = Math.max(0, race.cooldownUntil - Date.now());
  const key = `${race.charges}:${Math.ceil(cooling / 1000)}`;
  if (key === race.prankKey) return;
  race.prankKey = key;
  const disabled = race.charges <= 0 || cooling > 0;
  el.innerHTML = `<span class="charges" title="Pranks charged">${Array.from({ length: MAX_CHARGES }, (_, i) => `<i class="${i < race.charges ? "on" : ""}">🎃</i>`).join("")}</span>
    ${Object.entries(PRANKS).map(([k, p]) => `<button class="prank" data-act="race-prank" data-kind="${k}" ${disabled ? "disabled" : ""} aria-label="Send ${p.name} to the leader">${p.icon}<small>${p.name}</small></button>`).join("")}
    <small class="prank-note">${cooling > 0 ? `Recharging ${Math.ceil(cooling / 1000)}s` : race.charges > 0 ? "→ hits the leader" : "Combo ×3 to charge"}</small>`;
}

function receivePranks() {
  if (!race?.run || race.run.over) return;
  for (const msg of room.inbox || []) {
    if (race.seen.has(msg.id)) continue;
    race.seen.add(msg.id);
    const p = PRANKS[msg.kind];
    if (!p) continue;
    const hit = race.run.prank(msg.kind);
    banner(hit ? `${p.icon} ${msg.from} ${p.text}!` : `${msg.from}'s prank fizzled!`, hit ? "bad" : "good");
  }
}

async function sendPrank(kind) {
  if (!race?.run || race.run.over || race.charges <= 0 || Date.now() < race.cooldownUntil) return;
  race.charges--;
  race.cooldownUntil = Date.now() + PRANK_COOLDOWN_MS;
  try {
    const data = await api("prank", { kind });
    banner(`🎯 ${PRANKS[kind].name} sent to ${data.target}!`, "good");
    sfx.whoosh();
    if (data.room) applyRoom(data.room);
  } catch (e) {
    race.charges++;
    race.cooldownUntil = 0;
    banner(e.message, "bad");
  }
}

async function finishRace(run) {
  if (!race) return;
  race.run = run;
  recordRewards(run);
  screen = "waiting";
  renderWaiting();
  try {
    const data = await api("report", report(race));
    race.reportedDone = true;
    applyRoom(data.room);
  } catch { /* the next poll retries */ }
}

function recordRewards(run) {
  if (race.recorded) return;
  race.recorded = true;
  const save = getSave();
  save.coins += run.coins;
  save.totals.served += run.served;
  for (const type of run.seen) {
    const b = save.book[type] || { seen: true, served: 0 };
    b.seen = true;
    b.served += run.stats["served_" + type] || 0;
    save.book[type] = b;
  }
  applyQuestStats(save, run.stats);
  savePersist();
}

function renderWaiting() {
  if (!race?.run) return;
  const players = livePlayers(race.run);
  const waiting = players.filter(p => !p.done && !p.gone).length;
  let modal = document.querySelector(".race-wait");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal-wrap race-wait";
    appRoot().appendChild(modal);
  }
  modal.innerHTML = `<div class="modal"><div class="modal-kicker">YOU FINISHED!</div><h2>🪙 ${race.run.coins} coins</h2>
    <p class="tip">${waiting ? `Waiting for ${waiting} rival${waiting > 1 ? "s" : ""} to finish…` : "Tallying the results…"}</p>
    <ul class="race-players">${players.map((p, i) => playerRow(p, i, true)).join("")}</ul></div>`;
}

// ---------------- Podium ----------------
function renderPodium() {
  if (screen !== "podium") leaveGame();
  screen = "podium";
  const players = room.players;
  const myIndex = players.findIndex(p => p.id === session.playerId);
  const me = players[myIndex];
  const won = myIndex === 0;
  if (race && !race.podiumSound) { race.podiumSound = true; won ? sfx.fanfare() : sfx.star(0); }
  const top = players.slice(0, 3);
  const order = [[top[1], 2], [top[0], 1], [top[2], 3]];
  const podium = order.map(([p, place]) => p
    ? `<div class="podium-step p${place}"><span class="pd-medal">${MEDALS[place - 1]}</span><b>${esc(p.name)}</b><em>🪙 ${p.coins}</em><div class="pd-block">${place}</div></div>`
    : `<div class="podium-step empty"></div>`).join("");
  const stage = STAGES[room.stage];
  appRoot().innerHTML = `<div class="screen race-screen podium-screen">
    <div class="page-head center"><div class="modal-kicker">${stage.icon} ${esc(stage.name)} · RESULTS</div><h2>${won ? "🏆 You win!" : me ? `You placed ${MEDALS[myIndex] || "#" + (myIndex + 1)}` : "Race over"}</h2>
    ${me ? `<p>${me.coins} coins · ${me.served} served · best combo ×${me.bestCombo}. Your coins were added to your wallet.</p>` : ""}</div>
    <div class="podium">${podium}</div>
    <section class="race-panel"><ul class="race-players">${players.map((p, i) => playerRow(p, i, true)).join("")}</ul></section>
    ${room.isHost
      ? `<div class="modal-actions wrap"><button class="btn primary big" data-act="race-start" ${players.length < 2 ? "disabled" : ""}>↻ Race again</button><button class="btn" data-act="race-lobby">Change race</button></div>`
      : `<div class="wait-pill"><span class="pulse-dot"></span>Waiting for ${esc(room.hostName)} to start another race…</div>`}
    <button class="btn ghosty wide" data-act="race-leave">Leave room</button>
  </div>`;
}

// ---------------- Actions from ui.js click handler ----------------
export function handleRaceAct(act, btn) {
  switch (act) {
    case "race": showRaceHome(""); break;
    case "race-create": create(); break;
    case "race-join": join(); break;
    case "race-copy": {
      const url = `${location.origin}/?race=${room.code}`;
      navigator.clipboard?.writeText(url).then(() => toast("Invite link copied!")).catch(() => toast(`Room code: ${room.code}`));
      break;
    }
    case "race-stage":
      api("stage", { stage: Number(btn.dataset.stage) }).then(d => applyRoom(d.room)).catch(e => toast(e.message, "bad"));
      break;
    case "race-start":
      btn.disabled = true;
      api("start").then(d => applyRoom(d.room)).catch(e => { btn.disabled = false; toast(e.message, "bad"); });
      break;
    case "race-lobby":
      api("lobby").then(d => applyRoom(d.room)).catch(e => toast(e.message, "bad"));
      break;
    case "race-prank": sendPrank(btn.dataset.kind); break;
    case "race-quit":
      if (confirm("Leave this race? Your score so far stays on the board.")) leaveRoom();
      break;
    case "race-leave": leaveRoom(); break;
  }
}

async function leaveRoom() {
  stopPolling();
  clearInterval(countdownTimer);
  if (session) api("leave").catch(() => {});
  session = null; room = null; race = null; screen = null;
  saveSession();
  history.replaceState({}, "", "/");
  showMap();
}
