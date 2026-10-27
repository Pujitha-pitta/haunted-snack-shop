import { request } from "./api.js";
import { PANTRY_NAMES } from "./orders.js";
import "./style.css";

const app = document.querySelector("#app");
const SESSION_KEY = "haunted-snack-shop-player";
const LEVELS = ["Twilight Shift", "Midnight Rush", "Witching Hour"];
let session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
let room = null;
let busy = false;
let pollHandle = null;
let lastArrivalRound = 0;

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
        <h1>Midnight rush.<br><em>Ghost customers.</em></h1>
        <p class="lede">A cartoon midnight diner rush. Ghosts arrive, the crew races to prep their snacks, and every cooking move shows up live on your friends’ screens.</p>
        <div class="feature-row"><span>👥 2–8 players</span><span>📱 Any device</span><span>🌙 9 orders · 3 levels</span></div>
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
    <section class="rules-strip" id="rules"><div><span class="step-no">01</span><b>Welcome the customer</b><small>Ghosts arrive at your counter with snack orders.</small></div><div><span class="step-no">02</span><b>Work the pantry</b><small>Check shared ingredients before the crew prepares a dish.</small></div><div><span class="step-no">03</span><b>Serve the order</b><small>Keep customers happy, earn tips, and stay open till dawn.</small></div></section>`);
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
  const level = Math.min(3, Math.max(1, Math.ceil(Math.max(room.roundNumber, 1) / 3)));
  const customerInLevel = ((Math.max(room.roundNumber, 1) - 1) % 3) + 1;
  if (active) {
    const teamTips = room.players.reduce((sum, player) => sum + player.stars, 0);
    return `<section class="rush-layout">
      <div class="rush-main">
        <header class="rush-toolbar">
          <div class="rush-room"><span class="rush-lantern">☾</span><span><small>MOONLIGHT DINER · ROOM</small><b>${room.code}</b></span><button class="copy-button" data-action="copy">INVITE +</button></div>
          <div class="rush-level"><span>LEVEL ${level}</span><b>${LEVELS[level - 1]}</b><div class="rush-progress">${Array.from({ length: 9 }, (_, i) => `<i class="${i < room.roundNumber ? "served" : ""} ${i === room.roundNumber - 1 ? "now" : ""}"></i>`).join("")}</div></div>
          <div class="rush-score"><span>✦ <b>${teamTips}</b><small>TIPS</small></span><span>🔥 <b>${room.streak || 0}</b><small>STREAK</small></span><span class="rush-haunt">👻 <b>${haunt}/5</b><small>HAUNT</small></span></div>
        </header>
        ${content}
        <div class="rush-footer"><div class="rush-crew"><span class="rush-crew-title">YOUR CREW</span>${room.players.map((p) => `<span class="rush-player" title="${safe(p.name)}">👩‍🍳 ${safe(p.name)} <b>${p.stars}✦</b></span>`).join("")}</div><div class="rush-pantry"><b>SHARED PANTRY</b>${Object.entries(PANTRY_NAMES).map(([key, label]) => `<span title="${label}">${{ moonmilk: "🥛", sugar: "🍚", ectoplasm: "🧪", spice: "✨" }[key]} ${room.pantry[key] ?? 0}</span>`).join("")}</div></div>
      </div>
    </section>`;
  }
  return `<section class="game-layout">
    <div class="game-main">
      <div class="room-bar"><div><span class="room-label">YOUR SHOP</span><strong class="room-code">${room.code}</strong></div><button class="copy-button" data-action="copy">Copy invite link <span>↗</span></button></div>
      <div class="progress-line"><div><span>LEVEL ${level} · ${LEVELS[level - 1]} <i> / CUSTOMER ${customerInLevel} OF 3</i></span></div><div class="progress-dots">${[1, 2, 3].map((n) => `<i class="${n <= level ? "filled" : ""} ${n === level ? "current" : ""}"></i>`).join("")}</div></div>
      ${room.status === "playing" ? `<div class="streak-ribbon ${room.streak >= 2 ? "hot" : ""}"><span>🔥</span> SERVICE STREAK <b>×${room.streak || 0}</b><small>${room.streak >= 2 ? "Keep the combo alive!" : "Serve customers in a row for bonus tips"}</small></div>` : ""}
      ${content}
      <div class="game-players"><div class="section-kicker">AT THE COUNTER <span>${room.players.length}/8</span></div>${playerList()}</div>
    </div>
    <aside class="side-panel"><div class="haunt-panel"><div class="section-kicker">HAUNT-O-METER <span>${haunt}/5</span></div><div class="haunt-track">${[0, 1, 2, 3, 4].map((n) => `<i class="${n < haunt ? "lit" : ""}"></i>`).join("")}</div><p>${haunt >= 4 ? "The ghosts are getting restless…" : haunt === 0 ? "All quiet in the shop." : "A little spooky, still manageable."}</p></div><div class="pantry-panel"><div class="section-kicker">SHARED PANTRY <span>✦</span></div><div class="pantry-grid">${pantryHTML()}</div><p class="tiny-note">Split prep with your crew. Happy customers restock the shelves.</p></div><div class="tip-card"><span>💡</span><p><b>Kitchen tip</b> Split the kitchen steps with your crew. Each tap updates every player's screen.</p></div></aside>
  </section>`;
}

function lobbyView() {
  const canStart = room.players.length >= 2;
  const start = room.isHost;
  return gameFrame(`<div class="lobby-card"><div class="ghost-mark">👻</div><div class="eyebrow">THE SHOP IS OPENING</div><h1>Waiting for<br><em>the night shift.</em></h1><p class="muted">Send the room code to your crew. Once everyone’s here, the shopkeeper can start.</p><div class="invite-code"><span>ROOM CODE</span><strong>${room.code}</strong></div><div class="lobby-players"><span class="section-kicker">CREW CHECK-IN</span>${playerList()}</div>${start ? `<button class="button primary wide" data-action="start" ${canStart ? "" : "disabled"}>${canStart ? "Start with the shop briefing" : "Waiting for one more player…"} <span>→</span></button><p class="button-note">${canStart ? "Nine ghost customers. Three levels. One shared kitchen." : "Share the room code to invite someone."}</p>` : `<div class="wait-note"><span class="pulse"></span>Waiting for the shopkeeper to continue…</div>`}</div>`);
}

function playingView() {
  if (room.status === "instructions") {
    return gameFrame(`<article class="shift-briefing"><div class="briefing-icon">📋</div><div class="eyebrow">BEFORE THE DOORS OPEN</div><h1>Quick shift<br><em>briefing.</em></h1><p class="briefing-lede">A few seconds to learn the shop. Then the first customer walks in.</p><div class="briefing-steps"><div><span>1</span><p><b>Read the customer ticket</b><small>The order and chef's note explain what to make.</small></p></div><div><span>2</span><p><b>Work as a team</b><small>Anyone can add ingredients, pick a station, or finish the dish. All screens stay in sync.</small></p></div><div><span>3</span><p><b>Keep the kitchen moving</b><small>Split the steps with your crew and watch the station animations.</small></p></div><div><span>4</span><p><b>Beat the patience clock</b><small>Finish the last step to serve automatically. Keep a streak for bonus tips.</small></p></div></div><div class="briefing-goal"><span>🌙</span><p><b>Night shift goal</b><br>Serve nine customers across three levels before the haunt meter fills.</p></div>${room.isHost ? `<button class="button primary wide" data-action="begin">Open the doors &amp; start serving <span>→</span></button>` : `<div class="wait-note"><span class="pulse"></span>Shopkeeper is setting up. Your first customer is almost here…</div>`}</article>`);
  }
  const r = room.round;
  const arriving = lastArrivalRound !== room.roundNumber;
  lastArrivalRound = room.roundNumber;
  const prep = r.prep || { ingredients: [], station: null, finish: null, done: false };
  const surprise = r.surprise;
  const patienceSeconds = Math.max(60, 90 - (Math.ceil(room.roundNumber / 3) - 1) * 15);
  const voted = Boolean(prep.done || r.vote);
  const ingredientChoices = [
    ["moonmilk", "🥛", "Moonmilk", "Cool & creamy"], ["sugar", "🍚", "Sugar", "Sweet crystals"],
    ["ectoplasm", "🧪", "Ectoplasm", "Wobbly green gel"], ["spice", "✨", "Star spice", "A little sparkle"]
  ];
  const stationChoices = [["stove", "🍲", "Stove", "Simmer or steep"], ["oven", "🔥", "Oven", "Bake until ready"], ["mixer", "🥣", "Mixer", "Whip it together"], ["kettle", "🫖", "Kettle", "Heat it up"]];
  const finishChoices = {
    stove: [["chill", "🧊", "Cool it down", "Let it set"], ["steep", "🌿", "Steep gently", "Bring out the aroma"]],
    oven: [["bake", "🥧", "Bake until golden", "Keep it warm"], ["dust", "✨", "Dust with sparkle", "Finish with a shimmer"], ["crunch", "🍪", "Bake till crisp", "Give it a snap"]],
    mixer: [["fizz", "🫧", "Whip in bubbles", "Make it light and fizzy"], ["dip", "🍬", "Dip in glaze", "Coat it smoothly"]],
    kettle: [["pop", "🍿", "Heat until it pops", "Watch the kettle"]]
  };
  let stage = "The mixing bowl";
  let hint = `Choose ingredient ${prep.ingredients.length + 1} of 2. Your crew sees every move.`;
  let choices = ingredientChoices.map(([value, icon, label, detail]) => ["ingredient", value, icon, label, `${detail} · ${room.pantry[value] || 0} left`, (room.pantry[value] || 0) < 1]);
  if (prep.ingredients.length === 2 && !prep.station) {
    stage = "Pick a cooking station"; hint = "Put your ingredients on the right kitchen station.";
    choices = stationChoices.map(([value, icon, label, detail]) => ["station", value, icon, label, detail, false]);
  } else if (prep.station && !prep.finish) {
    stage = "Finish the dish"; hint = "Choose the last cooking action, then serve it.";
    choices = (finishChoices[prep.station] || []).map(([value, icon, label, detail]) => ["finish", value, icon, label, detail, false]);
  }
  const pantryIcons = { moonmilk: "🥛", sugar: "🍚", ectoplasm: "🧪", spice: "✨" };
  const prepSummary = `<div class="rush-recipe-track"><div class="rush-step ${prep.ingredients.length ? "done" : "current"}"><span>${prep.ingredients.length ? prep.ingredients.map((item) => pantryIcons[item]).join("") : "🥣"}</span><small>PREP</small></div><b>›</b><div class="rush-step ${prep.station ? "done" : prep.ingredients.length === 2 ? "current" : ""}"><span>${prep.station ? ({ stove: "🍲", oven: "🔥", mixer: "🥣", kettle: "🫖" }[prep.station]) : "♨️"}</span><small>COOK</small></div><b>›</b><div class="rush-step ${prep.finish ? "done" : prep.station ? "current" : ""}"><span>${prep.finish ? "✨" : "🍽️"}</span><small>SERVE</small></div></div>`;
  const options = choices.map(([kind, value, icon, label, detail, unavailable], index) => `<button class="rush-action ${kind} action-${index + 1} ${unavailable ? "unavailable" : ""}" data-action="prep" data-kind="${kind}" data-value="${value}" ${voted || unavailable ? "disabled" : ""}><span class="rush-food-icon">${icon}</span><span class="rush-action-copy"><b>${safe(label)}</b><small>${safe(detail)}</small></span><span class="rush-action-cta">${voted ? "SERVED ✓" : kind === "ingredient" ? "ADD TO BOWL" : kind === "station" ? "START COOKING" : "FINISH & SERVE"}</span></button>`).join("");
  const queue = r.queue || [];
  const nextGuest = queue[0]?.icon || "👻";
  const afterGuest = queue[1]?.icon || "🧟";
  return gameFrame(`<article class="rush-game ${arriving ? "guest-arriving" : ""}">
    <section class="rush-scene" aria-label="Moonlight Diner kitchen">
      <div class="rush-wall"><div class="rush-window"><span>☾</span></div><div class="rush-shelf"><i>🫙</i><i>🧂</i><i>🌿</i></div><div class="rush-diner-sign">✦ &nbsp; MOONLIGHT DINER &nbsp; ✦</div><div class="rush-pendant p-one"></div><div class="rush-pendant p-two"></div><div class="rush-pendant p-three"></div></div>
      <div class="rush-visitors">
        <div class="rush-visitor queued"><div class="visitor-ticket next-ticket"><small>UP NEXT</small><b>${safe(nextGuest)}</b><i>•••</i></div><div class="ghost-portrait queue-portrait">${safe(nextGuest)}</div><div class="visitor-foot">WAITING</div></div>
        <div class="rush-visitor current-visitor"><div class="visitor-ticket current-ticket"><small>ORDER TICKET #${String(room.roundNumber).padStart(2, "0")}</small><p>${safe(r.request)}</p><i class="ticket-tail"></i></div><div class="ghost-portrait main-portrait">${safe(r.icon)}</div><div class="visitor-foot">AT THE COUNTER <span>♡ ♡ ♡</span></div></div>
        <div class="rush-visitor queued final-queue"><div class="visitor-ticket next-ticket"><small>COMING SOON</small><b>${safe(afterGuest)}</b><i>•••</i></div><div class="ghost-portrait queue-portrait">${safe(afterGuest)}</div><div class="visitor-foot">IN THE QUEUE</div></div>
      </div>
      <div class="rush-kitchen-counter"><div class="counter-lip"><span>THE HAUNTED SNACK BAR</span><b>✦ ✦ ✦</b></div><div class="counter-worktop">
        <div class="workstation prep-station ${prep.ingredients.length ? "station-active" : ""}"><span class="station-glow"></span><b>PREP TABLE</b><strong>${prep.ingredients.length ? prep.ingredients.map((item) => pantryIcons[item]).join(" ") : "🥣"}</strong><small>${prep.ingredients.length}/2 INGREDIENTS</small></div>
        <div class="workstation cook-station ${prep.station ? "station-active" : ""}"><span class="station-glow"></span><b>COOKING</b><strong>${prep.station ? ({ stove: "🍲", oven: "🔥", mixer: "🥣", kettle: "🫖" }[prep.station]) : "🍳"}</strong><small>${prep.station ? safe(prep.station.toUpperCase()) + " · WORKING" : "CHOOSE A STATION"}</small><i class="steam steam-a">〰</i><i class="steam steam-b">〰</i></div>
        <div class="workstation serve-station ${prep.done ? "station-active" : ""}"><span class="station-glow"></span><b>SERVING PASS</b><strong>${prep.done ? (r.options.find((o) => o.id === r.vote)?.icon || "🍽️") : "🍽️"}</strong><small>${prep.done ? "ORDER OUT!" : "READY FOR A PLATE"}</small></div>
      </div><div class="counter-panel-front"><span>🍪</span><span>🥧</span><span>🧁</span><span>🍮</span><span>🍿</span><span>🍩</span></div></div>
      <div class="rush-doorbell">🔔 <span>${arriving ? "DING! A GHOST JUST WALKED IN" : "THE NEXT ORDER IS UP"}</span></div>
    </section>
    ${surprise ? `<section class="surprise-event ${surprise.claimed ? "caught" : ""}"><div class="surprise-icon">${safe(surprise.icon)}</div><div class="surprise-copy"><b>${safe(surprise.claimed ? "Bonus caught! +1 tip" : surprise.title)}</b><p>${safe(surprise.claimed ? "The haunt calmed down." : surprise.prompt)}</p></div><button class="surprise-catch" data-action="surprise" ${surprise.claimed || voted ? "disabled" : ""}>${surprise.claimed ? "CAUGHT ✓" : "GRAB IT!"}</button></section>` : ""}
    <section class="rush-controls"><div class="rush-control-heading"><div><span class="rush-overline">${voted ? "TICKET COMPLETE" : safe(stage.toUpperCase())}</span><h2>${voted ? "Order on its way!" : safe(hint.split(".")[0])}</h2><p>${voted ? "The customer is enjoying the treat. Your crew is on it!" : "Tap a big kitchen button to keep this order moving."}</p></div><div class="rush-control-stats"><div class="patience-panel rush-patience" data-deadline="${r.deadlineAt || 0}" data-duration="${patienceSeconds}"><div class="patience-heading"><span>GUEST PATIENCE</span><b class="patience-time">--:--</b></div><div class="patience-track"><i></i></div></div><div class="rush-cooks">👩‍🍳 <b>${r.votesIn}</b><small>COOKS HELPING</small></div></div></div>${prepSummary}<div class="rush-actions">${options}</div>${voted ? `<div class="rush-served-note"><span>✨</span>Order served! The customer is enjoying their treat.</div>` : `<p class="rush-sync-note">🔄&nbsp; Shared kitchen — every cook’s tap appears here instantly</p>`}</section>
  </article>`, true);
}

function resultView() {
  const result = room.round.result;
  const revealed = result.success ? result.recipe : result.answer;
  const level = Math.min(3, Math.ceil(room.roundNumber / 3));
  const nextLevel = level < 3 && room.roundNumber % 3 === 0;
  const nextLabel = room.roundNumber >= 9 || room.haunt >= 5 ? "See the final score" : nextLevel ? `Start Level ${level + 1}: ${LEVELS[level]}` : "Welcome the next customer";
  return gameFrame(`<article class="result-card ${result.success ? "good" : "bad"}"><div class="result-stamp">${result.success ? "ORDER SERVED" : result.rushed ? "CUSTOMER FLOATED OFF" : result.tied ? "KITCHEN SPLIT" : "CUSTOMER TURNED AWAY"}</div><div class="result-icon">${result.success ? "✨" : "👻"}</div><h1>${result.success ? "A perfect" : result.rushed ? "Too slow" : "A spooky"}<br><em>${result.success ? "little treat." : result.rushed ? "next time." : "misunderstanding."}</em></h1><p class="result-message">${safe(result.message)}</p><div class="revealed-dish"><span>${result.success ? "HAPPY CUSTOMER" : "THE CUSTOMER ORDERED"}</span><b>${safe(revealed || "A different snack")}</b></div><div class="round-score"><div class="section-kicker">SHIFT TIPS</div>${playerList(true)}</div>${room.isHost ? `<button class="button primary wide" data-action="next">${nextLabel} <span>→</span></button>` : `<div class="wait-note"><span class="pulse"></span>Waiting for the shopkeeper to continue…</div>`}</article>`);
}

function finishedView() {
  const standings = [...room.players].sort((a, b) => b.stars - a.stars);
  const won = room.haunt < 5;
  return gameFrame(`<article class="result-card final ${won ? "good" : "bad"}"><div class="result-stamp">SHOP CLOSED</div><div class="result-icon">${won ? "🌙" : "💥"}</div><h1>${won ? "A night well" : "Too haunted"}<br><em>${won ? "served." : "done."}</em></h1><p class="result-message">${won ? "Your crew made it through the midnight rush. The ghosts will be back." : "The haunting took over the shop. Better luck on the next night shift."}</p><div class="round-score"><div class="section-kicker">FINAL SHIFT TIPS</div>${playerList(true)}</div><button class="button secondary wide" data-action="new-shop">Open another shop <span>↗</span></button></article>`);
}

function render() {
  if (!room) return landing();
  if (room.status === "lobby") app.innerHTML = shell(lobbyView());
  if (room.status === "instructions") app.innerHTML = shell(playingView());
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
      const latestRoom = await request("get", { code: session.code, playerId: session.playerId });
      if (JSON.stringify(latestRoom) !== JSON.stringify(room)) {
        room = latestRoom;
        renderRoom();
      }
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

function updatePatience() {
  const panel = document.querySelector(".patience-panel");
  if (!panel) return;
  const deadline = Number(panel.dataset.deadline);
  const duration = Number(panel.dataset.duration) * 1000;
  if (!deadline) return;
  const remaining = Math.max(0, deadline - Date.now());
  const ratio = Math.min(1, remaining / duration);
  const seconds = Math.ceil(remaining / 1000);
  panel.querySelector(".patience-time").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  panel.querySelector(".patience-track i").style.width = `${ratio * 100}%`;
  panel.classList.toggle("urgent", seconds <= 20);
  panel.classList.toggle("expired", seconds === 0);
}

setInterval(updatePatience, 250);

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
  if (action === "prep") { await act("prep", { kind: button.dataset.kind, value: button.dataset.value }); return; }
  if (action === "surprise") { await act("surprise"); return; }
  if (action === "serve") { await act("serve", { choice: button.dataset.choice }); return; }
  if (action === "begin") { await act("begin"); return; }
  await act(action);
});

async function resume() {
  const invite = new URLSearchParams(location.search).get("room") || "";
  if (session && invite && invite.toUpperCase() !== session.code) {
    session = null;
    localStorage.removeItem(SESSION_KEY);
  }
  if (!session) return landing(invite);
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

