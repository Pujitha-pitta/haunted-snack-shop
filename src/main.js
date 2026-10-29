import { request } from "./api.js";
import { MENU, STATIONS } from "./menu.js";
import "./style.css";
import "./arcade.css";

const app = document.querySelector("#app");
const SESSION_KEY = "haunted-snack-shop-player";
const LEVELS = ["Midnight Rush", "Witching Hour", "Ghost King’s Feast"];
let session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
let room = null;
let busy = false;
let pollHandle = null;
let clockHandle = null;

const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const toast = message => {
  const box = document.querySelector("#toast");
  if (!box) return;
  box.textContent = message;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 2600);
};

function shell(content) {
  return `<header class="topbar"><a class="brand" href="/" aria-label="Haunted Snack Shop home"><span class="brand-icon">☾</span><span>HAUNTED<br><b>SNACK SHOP</b></span></a><button class="how-link" data-action="rules">How to play <span>↗</span></button></header><main>${content}</main><footer><span>Open late. Friendly to ghosts.</span><span>✦ &nbsp; A tiny multiplayer game</span></footer><div id="toast" role="status" aria-live="polite"></div>`;
}

function landing(prefill) {
  clearInterval(pollHandle);
  app.innerHTML = shell(`
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="live-dot"></span> NOW SERVING THE AFTERLIFE</div>
        <h1>Midnight rush.<br><em>Ghost customers.</em></h1>
        <p class="lede">A co-op restaurant rush. Take overlapping ghost orders, keep the grill and fryer moving, and serve before patience runs out.</p>
        <div class="feature-row"><span>👥 2–8 cooks</span><span>📱 Any device</span><span>⏱ 90-second shifts · 3 levels</span></div>
        <div class="counter-art" aria-hidden="true"><div class="moon">☾</div><div class="counter"><span>🍔</span><span>🍟</span><span>🥤</span><span>👻</span></div><div class="steam s1">〰</div><div class="steam s2">〰</div></div>
      </div>
      <div class="join-card">
        <div class="card-top"><span class="stamp">OPEN</span><span class="card-stars">✦ ✦ ✦</span></div>
        <h2>Pull up a stool</h2><p class="muted">Open a shop or join your crew.</p>
        <form id="create-form" class="form-stack"><label for="host-name">Your name</label><input id="host-name" name="name" maxlength="18" placeholder="e.g. Mothman" autocomplete="nickname" required /><button class="button primary" type="submit">Open a new shop <span>→</span></button></form>
        <div class="divider"><span>OR JOIN A SHOP</span></div>
        <form id="join-form" class="form-stack"><label for="join-name">Your name</label><input id="join-name" name="name" maxlength="18" placeholder="e.g. Mothman" autocomplete="nickname" required /><label for="room-code">Room code</label><input id="room-code" name="code" class="code-input" maxlength="6" placeholder="ABC123" value="${safe(prefill || "")}" autocomplete="off" required /><button class="button secondary" type="submit">Join the shop <span>↗</span></button></form>
        <div class="card-foot"><span>NO LOGIN</span><span>NO DOWNLOAD</span><span>JUST SNACKS</span></div>
      </div>
    </section>
    <section class="rules-strip" id="rules"><div><span class="step-no">01</span><b>Take the ticket</b><small>Customers order familiar snacks from the counter.</small></div><div><span class="step-no">02</span><b>Cook in parallel</b><small>Start different dishes at the grill, fryer, mixer and oven.</small></div><div><span class="step-no">03</span><b>Serve for tips</b><small>Beat the patience clocks, build a combo and upgrade between levels.</small></div></section>`);
  const code = new URLSearchParams(location.search).get("room") || "";
  if (code && document.querySelector("#room-code")) document.querySelector("#room-code").value = code.toUpperCase().slice(0, 6);
}

function playerChips() {
  return (room.players || []).map(p => `<span class="crew-chip">${p.isHost ? "👑" : "👩‍🍳"} ${safe(p.name)}${p.isHost ? " · HOST" : ""}</span>`).join("");
}

function roomTop() {
  const remaining = Math.max(0, Number(room.endsAt || 0) - Date.now());
  return `<header class="arcade-toolbar">
    <div class="arcade-room"><span class="arcade-moon">☾</span><div><small>MOONLIGHT DINER · ROOM</small><b>${safe(room.code)}</b></div><button class="arcade-share" data-action="copy">INVITE +</button></div>
    <div class="arcade-shift"><span>LEVEL ${room.level}</span><b>${safe(room.levelName || LEVELS[room.level - 1])}</b><strong class="shift-clock" data-shift-clock data-ends="${room.endsAt || 0}">${formatTime(remaining)}</strong><div class="shift-track"><i style="width:${Math.max(0, Math.min(100, 100 * remaining / 90000))}%"></i></div><small>90 SECOND SHIFT</small></div>
    <div class="arcade-stats"><div class="arcade-stat coin-stat"><span>🪙</span><b>${room.earned || 0}</b><small>COINS · GOAL ${room.coinTarget || 120}</small></div><div class="arcade-stat"><span>👻</span><b>${room.served || 0}/${room.customersPerLevel || 8}</b><small>CUSTOMERS</small></div><div class="arcade-stat combo-stat"><span>🔥</span><b>×${Math.max(1, room.combo || 0)}</b><small>COMBO</small></div></div>
  </header>
  <div class="arcade-level-rail"><div class="level-name"><span>LEVEL ${room.level}</span><b>${safe(room.levelName || "")}</b></div><div class="level-dots">${LEVELS.map((name, i) => `<i class="${i < room.level - 1 ? "complete" : i === room.level - 1 ? "current" : ""}" title="${safe(name)}"></i>`).join("")}</div><span class="target-note">🎯 SERVE 8 · EARN 120 COINS</span></div>`;
}

function inventoryHas(ticket) {
  const available = (room.readyItems || []).map(item => item.dish);
  const needed = [...ticket.items.map(item => item.id)];
  return needed.every(id => {
    const index = available.indexOf(id);
    if (index < 0) return false;
    available.splice(index, 1);
    return true;
  });
}

function ticketCard(ticket, index) {
  const ready = inventoryHas(ticket);
  const items = ticket.items.map(item => `<span class="order-dish" title="${safe(item.name)}"><b>${item.icon}</b><small>${safe(item.name)}</small></span>`).join("");
  return `<article class="customer-ticket ticket-${index + 1}">
    <div class="ticket-heading"><span class="ticket-ghost">${ticket.icon}</span><div><small>${index === 0 ? "AT THE COUNTER" : "IN THE QUEUE"}</small><b>${safe(ticket.type)}</b></div><span class="ticket-position">#${String(index + 1).padStart(2, "0")}</span></div>
    <div class="ticket-order-label">ORDER</div><div class="ticket-dishes">${items}</div>
    <div class="ticket-patience"><div><span>⏳ CUSTOMER PATIENCE</span><b data-patience data-deadline="${ticket.deadlineAt}" data-total="${Math.max(1, ticket.deadlineAt - ticket.createdAt)}">--:--</b></div><div class="patience-meter"><i></i></div></div>
    <button class="serve-button ${ready ? "serve-ready" : ""}" data-action="serve" data-ticket="${ticket.id}" ${ready ? "" : "disabled"}>${ready ? "SERVE ORDER  ·  + COINS" : "COOK THE ORDER FIRST"}</button>
  </article>`;
}

function stationCard(id) {
  const station = room.stations[id] || { status: "idle" };
  const item = station.item ? MENU[station.item] : null;
  const prepSteps = item?.prep || ["Gather ingredients", "Prepare the recipe", "Finish the prep"];
  const upgrade = room.upgrades[id] || 0;
  let action = "";
  let stage = "READY FOR A DISH";
  if (station.status === "cooking") {
    stage = "COOKING · WATCH THE CLOCK";
  } else if (station.status === "prepping") {
    const prepStep = Math.max(0, Number(station.prepStep) || 0);
    const step = prepSteps[prepStep] || "Recipe ready";
    stage = `PREP ${Math.min(prepStep + 1, prepSteps.length)}/${prepSteps.length} · ${safe(step).toUpperCase()}`;
    action = `<button class="station-action prep-action" data-action="ingredient" data-station="${id}">ADD INGREDIENT →</button>`;
  } else if (station.status === "ready") {
    stage = "READY! COLLECT BEFORE IT BURNS";
    action = `<button class="station-action collect-action" data-action="collect" data-station="${id}">COLLECT</button>`;
  } else if (station.status === "burnt") {
    stage = "BURNT · CLEAR THE STATION";
    action = `<button class="station-action clear-action" data-action="collect" data-station="${id}">CLEAR</button>`;
  }
  const progress = station.status === "cooking" ? 0 : 100;
  return `<article class="station-card station-${id} ${station.status}">
    <div class="station-topline"><span>${STATIONS[id].icon}</span><small>${STATIONS[id].name.toUpperCase()}</small><b>${upgrade ? "⚡".repeat(upgrade) : ""}</b></div>
    <div class="station-equipment"><span class="station-fire">${station.status === "prepping" ? "✨" : station.status === "cooking" ? "〰" : station.status === "ready" ? "✨" : station.status === "burnt" ? "💨" : "♨"}</span><strong>${item ? item.icon : "🍽️"}</strong></div>
    <div class="station-dish">${item ? safe(item.name) : "Empty station"}</div>
    <div class="station-status-text">${stage}</div>
    <div class="station-timer" data-cook-timer data-status="${station.status}" data-start="${station.startedAt || 0}" data-ready="${station.readyAt || 0}" data-burn="${station.burnAt || 0}" data-seconds="${item ? item.seconds : 0}"><span>${station.status === "cooking" ? "00:00" : station.status === "ready" ? "READY" : station.status === "burnt" ? "BURNT" : ""}</span><i style="width:${progress}%"></i></div>
    ${action}
  </article>`;
}

function kitchenView() {
  const guests = room.tickets || [];
  const queue = guests.map(ticketCard).join("");
  const ready = (room.readyItems || []).map(item => `<span class="pass-item" title="${safe(item.name)}">${item.icon} <small>${safe(item.name)}</small></span>`).join("");
  const menu = Object.entries(MENU).map(([id, item]) => {
    const status = room.stations[item.station]?.status || "idle";
    const disabled = status !== "idle";
    const prepCount = item.prep?.length || 3;
    return `<button class="menu-tile menu-${id}" data-action="cook" data-item="${id}" ${disabled ? "disabled" : ""}><span class="menu-art">${item.icon}</span><span class="menu-copy"><b>${safe(item.name)}</b><small>${STATIONS[item.station].name} · ${prepCount} prep steps · ${item.seconds} sec cook</small></span><span class="menu-tap">${disabled ? status.toUpperCase() : "PREP THIS DISH"}</span></button>`;
  }).join("");
  return `<section class="arcade-page">
    ${roomTop()}
    <div class="arcade-scene">
      <div class="diner-backdrop"><span class="diner-window">☾<small>OPEN ALL NIGHT</small></span><span class="diner-shelf">🫙 🧂 🌿</span><div class="diner-sign">✦ &nbsp; THE HAUNTED SNACK BAR &nbsp; ✦</div></div>
      <div class="guest-lane"><div class="guest-lane-label"><span>GHOSTS WALKING IN</span><b>${guests.length}/3 AT THE COUNTER</b></div><div class="walkway" aria-hidden="true"><span class="walking-customer">${guests[0]?.icon || "👻"}</span><span class="walk-dust">⋯</span><span class="walk-sign">NEXT!</span></div><div class="ticket-row">${queue || `<div class="empty-queue"><span>👻</span><b>Next customer is on the way…</b></div>`}</div></div>
      <div class="kitchen-floor"><div class="kitchen-floor-label"><span>YOUR SHARED KITCHEN</span><small>COOK DIFFERENT ORDERS AT THE SAME TIME</small></div><div class="station-grid">${["grill", "fryer", "mixer", "oven"].map(stationCard).join("")}</div></div>
    </div>
    <section class="cook-panel"><div class="cook-panel-heading"><div><span class="panel-kicker">THE MENU</span><h2>Prep, cook, then serve</h2><p>Choose a recipe, tap through its ingredient steps, then watch the station and collect it before it burns.</p></div><div class="cook-tip">👩‍🍳 <b>${room.players.length}</b><small>COOKS ON SHIFT</small></div></div><div class="menu-grid">${menu}</div></section>
    <section class="pass-and-crew"><div class="serving-pass"><div class="pass-heading"><span>🍽️ SERVING PASS</span><small>READY TO DELIVER</small></div><div class="pass-items">${ready || `<span class="pass-empty">Fresh food you collect appears here.</span>`}</div></div><div class="crew-panel"><div class="pass-heading"><span>👩‍🍳 YOUR CREW</span><small>${room.players.length}/8</small></div><div class="crew-chips">${playerChips()}</div></div></section>
    <div class="live-callout" role="status"><span class="callout-light"></span><b>${safe(room.lastEvent || "The kitchen is open!")}</b><small>SHARED LIVE WITH YOUR CREW</small></div>
  </section>`;
}

function lobbyView() {
  return `<section class="arcade-lobby"><div class="lobby-illustration"><span>🍔</span><span>🍟</span><span>🥤</span><b>👻</b></div><div class="eyebrow">THE NIGHT SHIFT</div><h1>Get the kitchen<br><em>crew together.</em></h1><p>Invite a friend with this room code. You’ll cook different orders at the same time and race the customer patience clocks.</p><div class="room-code-card"><small>ROOM CODE · SHARE WITH YOUR CREW</small><b>${safe(room.code)}</b><button data-action="copy">COPY INVITE LINK ↗</button></div><div class="lobby-crew"><span>CREW CHECK-IN</span><div class="crew-chips">${playerChips()}</div><small>2–8 players · Any phone or laptop · No login needed</small></div>${room.isHost ? `<button class="button primary lobby-start" data-action="start" ${room.players.length < 2 ? "disabled" : ""}>${room.players.length < 2 ? "WAITING FOR ONE MORE COOK…" : "START THE NIGHT SHIFT →"}</button>` : `<div class="wait-note"><span class="pulse"></span>Waiting for the shopkeeper to open the doors…</div>`}</section>`;
}

function instructionsView() {
  return `<section class="shift-briefing arcade-briefing"><div class="briefing-icon">🍳</div><div class="eyebrow">LEVEL ${room.level} · ${safe(room.levelName)}</div><h1>Ready, set,<br><em>serve!</em></h1><p class="briefing-lede">The clock starts when the shopkeeper opens the doors. Keep an eye on every station.</p><div class="briefing-steps"><div><span>1</span><p><b>Read the whole ticket</b><small>Ghosts order burgers, fries, shakes and pies.</small></p></div><div><span>2</span><p><b>Cook in parallel</b><small>Start a dish at each free station. Teammates can cook and collect too.</small></p></div><div><span>3</span><p><b>Watch the timers</b><small>Collect food when it is ready. Leave it too long and it burns.</small></p></div><div><span>4</span><p><b>Serve for coins</b><small>Match the order before patience runs out to build a combo.</small></p></div></div><div class="briefing-goal"><span>🌙</span><p><b>Shift goal</b><br>Serve 8 customers and earn 120 coins in 90 seconds. Upgrade a station between levels.</p></div>${room.isHost ? `<button class="button primary wide" data-action="begin">OPEN THE DOORS &amp; START COOKING →</button>` : `<div class="wait-note"><span class="pulse"></span>The shopkeeper is getting the kitchen ready…</div>`}</section>`;
}

function resultView() {
  const result = room.result || { served: room.served, lost: room.lost, earned: room.earned, target: room.coinTarget, stars: 0, won: false, bestCombo: room.bestCombo };
  const upgrades = ["grill", "fryer", "mixer", "oven"].map(id => {
    const tier = room.upgrades[id] || 0;
    const cost = 30 + tier * 25;
    const disabled = !room.isHost || tier >= 2 || room.coins < cost;
    return `<div class="upgrade-card"><span>${STATIONS[id].icon}</span><b>${STATIONS[id].name}</b><small>${tier >= 2 ? "MAX LEVEL" : "LEVEL " + tier + " → " + (tier + 1)}</small><button data-action="upgrade" data-station="${id}" ${disabled ? "disabled" : ""}>${tier >= 2 ? "MAXED" : "UPGRADE · " + cost + " 🪙"}</button></div>`;
  }).join("");
  const nextText = room.level >= room.maxLevels ? "CLOSE THE SHOP" : "START LEVEL " + (room.level + 1) + " →";
  return `<section class="shift-result ${result.won ? "result-win" : "result-loss"}"><div class="result-badge">${result.won ? "SHIFT COMPLETE" : "SHIFT OVER"}</div><div class="result-mascot">${result.won ? "🎉" : "👻"}</div><h1>${result.won ? "The crew did it!" : "The ghosts got hungry!"}</h1><p>${safe(room.levelName)} · ${result.served}/8 customers served · ${result.lost} floated away</p><div class="result-stars">${[1,2,3].map(n => `<span class="${result.stars >= n ? "earned-star" : ""}">★</span>`).join("")}</div><div class="result-score-grid"><div><b>${result.earned}</b><small>COINS THIS SHIFT</small></div><div><b>${result.target}</b><small>COIN GOAL</small></div><div><b>×${result.bestCombo}</b><small>BEST COMBO</small></div></div><section class="upgrade-section"><div class="panel-kicker">KITCHEN UPGRADES</div><h2>Spend coins to cook faster</h2><div class="upgrade-grid">${upgrades}</div><small class="upgrade-note">Shopkeeper can buy upgrades for the whole crew before the next level.</small></section>${room.isHost ? `<button class="button primary wide result-next" data-action="${room.level >= room.maxLevels ? "next" : "next"}">${nextText}</button>` : `<div class="wait-note"><span class="pulse"></span>Waiting for the shopkeeper to continue…</div>`}</section>`;
}

function finishedView() {
  return `<section class="shift-result result-win"><div class="result-badge">THE SHOP IS CLOSED</div><div class="result-mascot">🌙</div><h1>What a night!</h1><p>Your crew survived all three levels and earned ${room.coins} coins.</p><div class="crew-chips final-crew">${playerChips()}</div>${room.isHost ? `<button class="button primary wide result-next" data-action="replay">OPEN A NEW NIGHT SHIFT →</button>` : `<div class="wait-note">The shopkeeper can open another night shift.</div>`}</section>`;
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}

function render() {
  if (!room) return landing("");
  if (room.status === "lobby") app.innerHTML = shell(lobbyView());
  else if (room.status === "instructions") app.innerHTML = shell(instructionsView());
  else if (room.status === "playing") app.innerHTML = shell(kitchenView());
  else if (room.status === "result") app.innerHTML = shell(resultView());
  else if (room.status === "finished") app.innerHTML = shell(finishedView());
  updateTimers();
}

async function act(action, payload) {
  if (busy || !room) return;
  busy = true;
  try {
    const response = await request(action, { code: room.code, playerId: session.playerId, ...(payload || {}) });
    if (response.room) room = response.room;
    render();
  } catch (error) {
    toast(error.message);
    try { room = await request("get", { code: session.code, playerId: session.playerId }); render(); } catch {}
  } finally {
    busy = false;
  }
}

async function enterRoom(code, name, action) {
  const response = await request(action, { code, name });
  session = { code: response.room.code, playerId: response.playerId, name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  room = response.room;
  history.replaceState({}, "", "?room=" + room.code);
  render();
  startPolling();
}

function startPolling() {
  clearInterval(pollHandle);
  pollHandle = setInterval(async () => {
    if (!session || busy) return;
    try {
      const latest = await request("get", { code: session.code, playerId: session.playerId });
      if (JSON.stringify(latest) !== JSON.stringify(room)) {
        room = latest;
        render();
      } else {
        updateTimers();
      }
    } catch (error) {
      clearInterval(pollHandle);
      room = null;
      session = null;
      localStorage.removeItem(SESSION_KEY);
      landing(new URLSearchParams(location.search).get("room") || "");
      toast(error.message || "That shop is no longer open.");
    }
  }, 900);
}

function updateTimers() {
  const clock = document.querySelector("[data-shift-clock]");
  if (clock) {
    const remaining = Math.max(0, Number(clock.dataset.ends || 0) - Date.now());
    clock.textContent = formatTime(remaining);
    clock.classList.toggle("clock-urgent", remaining < 20000);
    const track = clock.parentElement.querySelector(".shift-track i");
    if (track) track.style.width = Math.max(0, Math.min(100, remaining / 90000 * 100)) + "%";
  }
  document.querySelectorAll("[data-patience]").forEach(panel => {
    const remaining = Math.max(0, Number(panel.dataset.deadline) - Date.now());
    const total = Number(panel.dataset.total) || 1;
    const seconds = Math.ceil(remaining / 1000);
    const timer = panel.querySelector("b");
    if (timer) timer.textContent = formatTime(remaining);
    const fill = panel.querySelector(".patience-meter i");
    if (fill) fill.style.width = Math.max(0, Math.min(100, remaining / total * 100)) + "%";
    panel.classList.toggle("patience-urgent", seconds <= 8);
  });
  document.querySelectorAll("[data-cook-timer]").forEach(panel => {
    const status = panel.dataset.status;
    const started = Number(panel.dataset.start);
    const readyAt = Number(panel.dataset.ready);
    const burnAt = Number(panel.dataset.burn);
    const label = panel.querySelector("span");
    const fill = panel.querySelector("i");
    if (status === "cooking") {
      const left = Math.max(0, readyAt - Date.now());
      if (label) label.textContent = formatTime(left);
      if (fill) fill.style.width = Math.min(100, (Date.now() - started) / Math.max(1, readyAt - started) * 100) + "%";
    } else if (status === "ready") {
      const left = Math.max(0, burnAt - Date.now());
      if (label) label.textContent = "READY · " + formatTime(left);
      if (fill) fill.style.width = Math.max(0, left / 10000 * 100) + "%";
    }
  });
}

function copyInvite() {
  const url = location.origin + "/?room=" + room.code;
  navigator.clipboard?.writeText(url).then(() => toast("Invite link copied!")).catch(() => toast("Room code: " + room.code));
}

app.addEventListener("submit", async event => {
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

app.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "rules") {
    if (!room) document.querySelector("#rules")?.scrollIntoView({ behavior: "smooth" });
    else toast("Tap a recipe, add each ingredient at its station, collect it after cooking, then serve the complete ticket.");
    return;
  }
  if (action === "copy") { copyInvite(); return; }
  if (action === "cook") { await act("cook", { item: button.dataset.item }); return; }
  if (action === "ingredient") { await act("ingredient", { station: button.dataset.station }); return; }
  if (action === "collect") { await act("collect", { station: button.dataset.station }); return; }
  if (action === "serve") { await act("serve", { ticketId: button.dataset.ticket }); return; }
  if (action === "upgrade") { await act("upgrade", { station: button.dataset.station }); return; }
  if (action === "new-shop") {
    room = null; session = null; localStorage.removeItem(SESSION_KEY); history.replaceState({}, "", "/"); landing("");
    return;
  }
  await act(action);
});

function resume() {
  const invite = new URLSearchParams(location.search).get("room") || "";
  if (session && invite && invite.toUpperCase() !== session.code) {
    session = null;
    localStorage.removeItem(SESSION_KEY);
  }
  if (!session) return landing(invite);
  request("get", { code: session.code, playerId: session.playerId }).then(state => {
    room = state;
    render();
    startPolling();
  }).catch(() => {
    session = null;
    localStorage.removeItem(SESSION_KEY);
    landing(invite);
  });
}

clockHandle = setInterval(updateTimers, 200);
resume();


