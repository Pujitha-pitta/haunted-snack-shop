import { request } from "./api.js";
import { PANTRY_NAMES } from "./orders.js";
import "./style.css";

const app = document.querySelector("#app");
const SESSION_KEY = "haunted-snack-shop-player";
let session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
let room = null;
let busy = false;
let pollHandle = null;

const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const toast = (message) => {
  const box = document.querySelector("#toast");
  if (!box) return;
  box.textContent = message;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 2600);
};

function shell(content) {
  return `<header class="topbar"><a class="brand" href="/" aria-label="The Haunted Snack Shop home"><span class="brand-icon">☾</span><span>HAUNTED<br><b>SNACK SHOP</b></span></a><button class="how-link" data-action="rules">How to play <span>↗</span></button></header><main>${content}</main><footer><span>Open late. Friendly to ghosts.</span><span>✦ &nbsp; A tiny multiplayer game</span></footer><div id="toast" role="status" aria-live="polite"></div>`;
}

function landing(prefill = "") {
  clearInterval(pollHandle);
  app.innerHTML = shell(`
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="live-dot"></span> NOW SERVING THE AFTERLIFE</div>
        <h1>Midnight cravings.<br><em>Ghostly clues.</em></h1>
        <p class="lede">Run a tiny snack shop for very particular ghosts. Combine your secret clues, agree on a treat, and keep the shop from getting too haunted.</p>
        <div class="feature-row"><span>👥 2–8 players</span><span>📱 Any device</span><span>⏱ 3 quick orders</span></div>
        <div class="counter-art" aria-hidden="true"><div class="moon">☾</div><div class="counter"><span>🥧</span><span>🫧</span><span>🍮</span><span>👻</span></div><div class="steam s1">〰</div><div class="steam s2">〰</div></div>
      </div>
      <div class="join-card">
        <div class="card-top"><span class="stamp">OPEN</span><span class="card-stars">✦ ✦ ✦</span></div>
        <h2>Pull up a stool</h2><p class="muted">Create a room or join a friend’s shop.</p>
        <form id="create-form" class="form-stack"><label for="host-name">Your name</label><input id="host-name" name="name" maxlength="18" placeholder="e.g. Mothman" autocomplete="nickname" required /><button class="button primary" type="submit">Open a new shop <span>→</span></button></form>
        <div class="divider"><span>OR JOIN A SHOP</span></div>
        <form id="join-form" class="form-stack"><label for="join-name">Your name</label><input id="join-name" name="name" maxlength="18" placeholder="e.g. Mothman" autocomplete="nickname" required /><label for="room-code">Room code</label><input id="room-code" name="code" class="code-input" maxlength="6" placeholder="ABC123" value="${safe(prefill)}" autocomplete="off" required /><button class="button secondary" type="submit">Join the shop <span>↗</span></button></form>
        <div class="card-foot"><span>NO LOGIN</span><span>NO DOWNLOAD</span><span>JUST SNACKS</span></div>
      </div>
    </section>
    <section class="rules-strip" id="rules"><div><span class="step-no">01</span><b>Read the request</b><small>A ghost tells you what they’re craving.</small></div><div><span class="step-no">02</span><b>Share your clues</b><small>Each player gets a private piece of the puzzle.</small></div><div><span class="step-no">03</span><b>Pick a snack together</b><small>Vote, serve it, and keep the haunt meter low.</small></div></section>`);
  const code = new URLSearchParams(location.search).get("room");
  if (code) document.querySelector("#room-code").value = code.toUpperCase().slice(0, 6);
}

function pantryHTML() {
  return Object.entries(PANTRY_NAMES).map(([key, label]) => `<div class="pantry-item"><span>${{ moonmilk: "🥛", sugar: "🍚", ectoplasm: "🧪", spice: "✨" }[key]}</span><b>${room.pantry[key] ?? 0}</b><small>${label}</small></div>`).join("");
}

function playerList(final = false) {
  const sorted = [...room.players].sort((a, b) => b.stars - a.stars);
  return `<div class="player-list">${sorted.map((p, i) => `<div class="player-row ${p.isHost ? "host-row" : ""}"><span class="player-rank">${final ? `${i === 0 && p.stars > 0 ? "👑" : i + 1}` : p.isHost ? "✦" : "·"}</span><span class="player-name">${safe(p.name)}${p.isHost ? " <small>SHOPKEEPER</small>" : ""}</span><span class="player-score">${p.stars} <small>✦</small></span></div>`).join("")}</div>`;
}

function gameFrame(content, active = false) {
  const haunt = Math.min(room.haunt, 5);
  return `<section class="game-layout">
    <div class="game-main">
      <div class="room-bar"><div><span class="room-label">YOUR SHOP</span><strong class="room-code">${room.code}</strong></div><button class="copy-button" data-action="copy">Copy invite link <span>↗</span></button></div>
      <div class="progress-line"><div><span>ORDER ${Math.max(room.roundNumber, 1)} <i>/ 3</i></span></div><div class="progress-dots">${[1, 2, 3].map((n) => `<i class="${n <= room.roundNumber ? "filled" : ""} ${n === room.roundNumber ? "current" : ""}"></i>`).join("")}</div></div>
      ${content}
      <div class="game-players"><div class="section-kicker">AT THE COUNTER <span>${room.players.length}/8</span></div>${playerList()}</div>
    </div>
    <aside class="side-panel"><div class="haunt-panel"><div class="section-kicker">HAUNT-O-METER <span>${haunt}/5</span></div><div class="haunt-track">${[0, 1, 2, 3, 4].map((n) => `<i class="${n < haunt ? "lit" : ""}"></i>`).join("")}</div><p>${haunt >= 4 ? "The ghosts are getting restless…" : haunt === 0 ? "All quiet in the shop." : "A little spooky, still manageable."}</p></div><div class="pantry-panel"><div class="section-kicker">SHARED PANTRY <span>✦</span></div><div class="pantry-grid">${pantryHTML()}</div><p class="tiny-note">A wrong order uses the recipe’s ingredients. Serve a ghost to earn one back.</p></div><div class="tip-card"><span>💡</span><p><b>Shop tip</b> Read your clue aloud, then listen to the others. No clue is enough on its own.</p></div></aside>
  </section>`;
}

function lobbyView() {
  const canStart = room.players.length >= 2;
  const start = room.isHost;
  return gameFrame(`<div class="lobby-card"><div class="ghost-mark">👻</div><div class="eyebrow">THE SHOP IS OPENING</div><h1>Waiting for<br><em>the night shift.</em></h1><p class="muted">Send the room code to your crew. Once everyone’s here, the shopkeeper can start.</p><div class="invite-code"><span>ROOM CODE</span><strong>${room.code}</strong></div><div class="lobby-players"><span class="section-kicker">CREW CHECK-IN</span>${playerList()}</div>${start ? `<button class="button primary wide" data-action="start" ${canStart ? "" : "disabled"}>${canStart ? "Start the night shift" : "Waiting for one more player…"} <span>→</span></button><p class="button-note">${canStart ? "Three ghost orders. One shared shop." : "Share the room code to invite someone."}</p>` : `<div class="wait-note"><span class="pulse"></span>Waiting for the shopkeeper to start…</div>`}</div>`);
}

function playingView() {
  const r = room.round;
  const voted = Boolean(r.vote);
  const options = r.options.map((option) => {
    const stocked = Object.entries(option.cost).every(([key, n]) => room.pantry[key] >= n);
    return `<button class="snack-option ${!stocked ? "unavailable" : ""}" data-action="vote" data-choice="${safe(option.id)}" ${voted || !stocked ? "disabled" : ""}><span class="snack-icon">${option.icon}</span><span class="snack-copy"><b>${safe(option.name)}</b><small>${option.ingredients.map(safe).join(" + ")}</small></span><span class="snack-arrow">${voted ? "✓" : stocked ? "→" : "OUT"}</span></button>`;
  }).join("");
  const missing = room.players.length - r.votesIn;
  return gameFrame(`<article class="order-card"><div class="order-heading"><div class="ghost-avatar">${r.icon}</div><div><span class="section-kicker">TONIGHT’S CUSTOMER</span><h2>${safe(r.ghost)}</h2></div><span class="order-ticket">#${String(room.roundNumber).padStart(2, "0")}</span></div><div class="request-box"><span class="quote-mark">“</span><p>${safe(r.request)}</p></div><div class="clue-box"><span class="clue-label">YOUR SECRET CLUE</span><p>${safe(r.clue)}</p><small>Share it with the crew—your screen is private.</small></div><div class="menu-head"><div><span class="section-kicker">WHAT SHOULD WE SERVE?</span><p>Choose the snack that best fits the clues.</p></div><span class="vote-count">${r.votesIn}/${room.players.length}<small>LOCKED</small></span></div><div class="snack-menu">${options}</div>${voted ? `<div class="wait-note"><span class="pulse"></span>Your choice is locked. Waiting for ${missing} ${missing === 1 ? "player" : "players"}…</div>` : `<p class="button-note">Your vote stays private until the order is served.</p>`}</article>`);
}

function resultView() {
  const result = room.round.result;
  const revealed = result.success ? result.recipe : result.answer;
  return gameFrame(`<article class="result-card ${result.success ? "good" : "bad"}"><div class="result-stamp">${result.success ? "ORDER SERVED" : result.tied ? "A TIE" : "WRONG ORDER"}</div><div class="result-icon">${result.success ? "✨" : "👻"}</div><h1>${result.success ? "A perfect" : "A spooky"}<br><em>${result.success ? "little treat." : "misunderstanding."}</em></h1><p class="result-message">${safe(result.message)}</p><div class="revealed-dish"><span>${result.success ? "THE GHOST LOVED" : "THEY WERE CRAVING"}</span><b>${safe(revealed || "A different snack")}</b></div><div class="round-score"><div class="section-kicker">SHOP SCOREBOARD</div>${playerList(true)}</div>${room.isHost ? `<button class="button primary wide" data-action="next">${room.roundNumber >= 3 || room.haunt >= 5 ? "See the final score" : "Take the next order"} <span>→</span></button>` : `<div class="wait-note"><span class="pulse"></span>Waiting for the shopkeeper to continue…</div>`}</article>`);
}

function finishedView() {
  const standings = [...room.players].sort((a, b) => b.stars - a.stars);
  const won = room.haunt < 5;
  return gameFrame(`<article class="result-card final ${won ? "good" : "bad"}"><div class="result-stamp">SHOP CLOSED</div><div class="result-icon">${won ? "🌙" : "💥"}</div><h1>${won ? "A night well" : "Too haunted"}<br><em>${won ? "served." : "done."}</em></h1><p class="result-message">${won ? "Your crew made it through the midnight rush. The ghosts will be back." : "The haunting took over the shop. Better luck on the next night shift."}</p><div class="round-score"><div class="section-kicker">FINAL STANDINGS</div>${playerList(true)}</div><button class="button secondary wide" data-action="new-shop">Open another shop <span>↗</span></button></article>`);
}

function render() {
  if (!room) return landing();
  if (room.status === "lobby") app.innerHTML = shell(lobbyView());
  if (room.status === "playing") app.innerHTML = shell(playingView());
  if (room.status === "result") app.innerHTML = shell(resultView());
  if (room.status === "finished") app.innerHTML = shell(finishedView());
}

// The lobby is rendered separately so its layout can share the game sidebar.
function renderRoom() {
  if (!room) return landing();
  if (room.status === "lobby") app.innerHTML = shell(lobbyView());
  else render();
}

async function act(action, payload = {}) {
  if (busy) return;
  busy = true;
  try {
    const result = await request(action, { code: room?.code, playerId: session?.playerId, ...payload });
    if (result.room) room = result.room;
    renderRoom();
  } catch (error) { toast(error.message); }
  finally { busy = false; }
}

async function enterRoom(code, name, action) {
  const result = await request(action, { code, name });
  session = { code: result.room.code, playerId: result.playerId, name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  room = result.room;
  history.replaceState({}, "", `/?room=${room.code}`);
  renderRoom();
  startPolling();
}

function startPolling() {
  clearInterval(pollHandle);
  pollHandle = setInterval(async () => {
    if (!session || busy) return;
    try {
      room = await request("get", { code: session.code, playerId: session.playerId });
      renderRoom();
    } catch (error) {
      if (error.message.includes("not found")) {
        clearInterval(pollHandle);
        room = null;
        session = null;
        localStorage.removeItem(SESSION_KEY);
        landing();
        toast("That room has closed. Open a new shop.");
      }
    }
  }, 1800);
}

async function copyInvite() {
  const url = `${location.origin}/?room=${room.code}`;
  try { await navigator.clipboard.writeText(url); toast("Invite link copied. Send it to your crew!"); }
  catch { toast(`Room code: ${room.code}`); }
}

app.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "create-form") {
    const name = new FormData(form).get("name").toString().trim();
    try { await enterRoom("", name, "create"); } catch (error) { toast(error.message); }
  }
  if (form.id === "join-form") {
    const data = new FormData(form);
    try { await enterRoom(data.get("code").toString().trim().toUpperCase(), data.get("name").toString().trim(), "join"); }
    catch (error) { toast(error.message); }
  }
});

app.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "rules") { document.querySelector("#rules")?.scrollIntoView({ behavior: "smooth" }); return; }
  if (action === "copy") { await copyInvite(); return; }
  if (action === "new-shop") {
    room = null; session = null; localStorage.removeItem(SESSION_KEY); history.replaceState({}, "", "/"); landing(); return;
  }
  if (action === "vote") { await act("vote", { choice: button.dataset.choice }); return; }
  await act(action);
});

async function resume() {
  if (!session) return landing();
  try {
    room = await request("get", { code: session.code, playerId: session.playerId });
    renderRoom();
    startPolling();
  } catch {
    session = null;
    localStorage.removeItem(SESSION_KEY);
    landing(new URLSearchParams(location.search).get("room") || "");
  }
}

resume();

