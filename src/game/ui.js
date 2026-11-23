// Screens, kitchen rendering and input for Haunted Snack Shop: Midnight Rush.
import { RECIPES, STATIONS, CUSTOMERS, LEVELS, WORLDS, UPGRADES, QUEST_POOL, TOPPINGS } from "./data.js";
import { Run, FLIP_WINDOW, starGoals } from "./engine.js";
import { loadSave, writeSave, ensureDaily, loginReward, claimLogin, applyQuestStats, unlockedCount, totalStars, storageOk } from "./save.js";
import { sfx, unlockAudio, setSound } from "./audio.js";
import { showRaceHome, handleRaceAct } from "./race.js";

const app = document.querySelector("#app");
let save = loadSave();
ensureDaily(save);
writeSave(save);
setSound(save.settings.sound);

let run = null;
let raf = 0;
let lastFrame = 0;
let lastVersion = -1;
let seenCustomers = new Set();
let els = {};
let mode = null; // versus-race hooks while racing: { onFrame, onOver, title }

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const persist = () => writeSave(save);
export const getSave = () => save;
export const savePersist = () => persist();
export const appRoot = () => app;
export const kitchenEl = (id) => document.getElementById(id);
const starRow = (n, size = "") => `<span class="stars ${size}">${[1, 2, 3].map(i => `<i class="${n >= i ? "on" : ""}">★</i>`).join("")}</span>`;

function stopLoop() { cancelAnimationFrame(raf); raf = 0; }
// Stop whatever is running and clear the screen state (used by race screens).
export function leaveGame() { stopLoop(); run = null; mode = null; document.querySelector(".modal-wrap")?.remove(); }

export function topNav(back) {
  return `<header class="topnav">
    ${back ? `<button class="icon-btn" data-act="map" aria-label="Back to map">←</button>` : `<div class="logo-sm"><span>👻</span><b>Haunted<br>Snack Shop</b></div>`}
    <div class="pills">
      <span class="pill coin-pill" title="Coins">🪙 <b>${save.coins}</b></span>
      <span class="pill star-pill" title="Stars">★ <b>${totalStars(save)}</b></span>
      <button class="icon-btn" data-act="sound" aria-label="Toggle sound">${save.settings.sound ? "🔊" : "🔇"}</button>
    </div>
  </header>`;
}

// ---------------- Title ----------------
function showTitle() {
  stopLoop();
  run = null;
  mode = null;
  app.innerHTML = `<div class="screen title-screen">
    <div class="title-sky"><span class="moon"></span><span class="float f1">👻</span><span class="float f2">🍔</span><span class="float f3">🍟</span><span class="float f4">🥤</span><span class="float f5">🎃</span></div>
    <div class="title-card">
      <div class="title-kicker">A cute-spooky cooking rush</div>
      <h1>Haunted<br>Snack Shop</h1>
      <div class="title-sub">MIDNIGHT RUSH</div>
      <p>Flip ghost burgers, shake witch fries and serve picky phantoms before the clock strikes midnight.</p>
      <button class="btn big primary" data-act="${save.levels[0] ? "map" : "first"}">${save.levels[0] ? "Continue" : "Play"} →</button>
      <button class="btn big race-btn" data-act="race">👥 Race friends</button>
      <a class="text-link" href="party.html">Classic co-op party mode ↗</a>
    </div>
    <div class="title-counter"><span>🍳</span><span>🧺</span><span>🌀</span></div>
  </div>`;
}

// ---------------- Map ----------------
export function showMap() {
  stopLoop();
  run = null;
  mode = null;
  ensureDaily(save);
  const unlocked = unlockedCount(save);
  const login = loginReward(save);
  const quests = save.daily.quests.map((q, i) => {
    const def = QUEST_POOL.find(d => d.id === q.id);
    if (!def) return "";
    const done = q.progress >= q.n;
    return `<li class="quest ${done ? "done" : ""} ${q.claimed ? "claimed" : ""}">
      <div><b>${esc(def.text.replace("{n}", q.n))}</b><div class="qbar"><i style="width:${Math.min(100, (q.progress / q.n) * 100)}%"></i></div><small>${Math.min(q.progress, q.n)}/${q.n}</small></div>
      ${q.claimed ? `<span class="claimed-tag">✓ Claimed</span>` : `<button class="btn small ${done ? "primary" : ""}" data-act="quest" data-i="${i}" ${done ? "" : "disabled"}>🪙 ${def.reward}</button>`}
    </li>`;
  }).join("");
  const nodes = LEVELS.map((cfg, i) => {
    const rec = save.levels[i];
    const locked = i >= unlocked;
    const current = i === unlocked - 1 && !rec?.stars;
    return `<button class="node ${locked ? "locked" : ""} ${current ? "current" : ""} ${cfg.boss ? "boss" : ""} ${rec?.stars ? "done" : ""}" data-act="level" data-i="${i}" ${locked ? "disabled" : ""} aria-label="Level ${i + 1} ${esc(cfg.name)}">
      <span class="node-num">${locked ? "🔒" : cfg.boss ? "👑" : i + 1}</span>
      ${starRow(rec?.stars || 0, "tiny")}
      <small>${esc(cfg.name)}</small>
    </button>`;
  }).join("");
  const worlds = WORLDS.slice(1).map(w => `<div class="world-locked"><span>${w.icon}</span><div><b>World ${w.id} · ${esc(w.name)}</b><small>${esc(w.blurb)}</small></div><em>Coming soon</em></div>`).join("");
  app.innerHTML = `<div class="screen map-screen">
    ${topNav(false)}
    ${storageOk ? "" : `<div class="notice">Your browser is blocking storage, so progress won't be saved after you close this tab.</div>`}
    <section class="daily">
      <div class="daily-head"><h2>Today at the shop</h2><small>New quests every day</small></div>
      ${login ? `<div class="login-reward"><span>🎁</span><div><b>Daily treat</b><small>Day ${save.login.last === "" ? 1 : Math.min(7, (save.login.streak || 0) + 1)} streak bonus</small></div><button class="btn primary small" data-act="login">Claim 🪙 ${login}</button></div>` : ""}
      <ul class="quests">${quests}</ul>
    </section>
    <button class="race-card" data-act="race"><span>👥</span><div><b>Versus Race</b><small>Race 2–8 friends live on the same level. Highest coins wins. Prank the leader!</small></div><em>PLAY →</em></button>
    <section class="world">
      <div class="world-head"><span class="world-icon">🏚️</span><div><small>WORLD 1</small><h2>Haunted Snack Shop</h2></div>${save.crown ? `<span class="crown-badge">👑 Cleared</span>` : ""}</div>
      <div class="path">${nodes}</div>
    </section>
    <section class="worlds-more">${worlds}</section>
    <nav class="map-actions">
      <button class="btn" data-act="shop">🛠️ Upgrades</button>
      <button class="btn" data-act="book">📖 Ghost Book</button>
      <a class="btn ghosty" href="party.html">🤝 Co-op</a>
    </nav>
  </div>`;
}

// ---------------- Level intro ----------------
function showIntro(i) {
  const cfg = LEVELS[i];
  const rec = save.levels[i];
  const goals = starGoals(cfg);
  const gift = cfg.gift && !save.upgrades[cfg.gift];
  const modal = document.createElement("div");
  modal.className = "modal-wrap";
  modal.innerHTML = `<div class="modal intro-modal" role="dialog" aria-label="Level ${i + 1}">
    <div class="modal-kicker">${cfg.boss ? "👑 BOSS LEVEL" : "LEVEL"} ${i + 1}</div>
    <h2>${esc(cfg.name)}</h2>
    <p class="intro-text">${esc(cfg.intro)}</p>
    ${gift ? `<div class="gift">🎁 Free upgrade: a second grill slot is now in your kitchen!</div>` : ""}
    <div class="menu-row">${cfg.recipes.map(r => `<span title="${esc(RECIPES[r].name)}">${RECIPES[r].icon}<small>${esc(RECIPES[r].name)}</small></span>`).join("")}</div>
    <ol class="goals">${goals.map((g, n) => `<li class="${rec?.stars > n ? "met" : ""}">${starRow(n + 1, "tiny")}<span>${esc(g)}</span></li>`).join("")}</ol>
    <div class="intro-meta"><span>⏱ ${cfg.time}s until midnight</span><span>👻 ${cfg.customers} customers</span>${rec ? `<span>🏆 Best ${rec.best} coins</span>` : ""}</div>
    ${cfg.teach && RECIPES[cfg.teach] ? `<div class="howto"><b>${RECIPES[cfg.teach].icon} How to cook:</b> ${esc(RECIPES[cfg.teach].how)}</div>` : ""}
    <div class="modal-actions"><button class="btn" data-act="close">Not yet</button><button class="btn primary big" data-act="start" data-i="${i}">Start cooking →</button></div>
  </div>`;
  app.appendChild(modal);
}

// ---------------- Kitchen ----------------
export function startLevel(i, opts = null) {
  document.querySelector(".modal-wrap")?.remove();
  stopLoop();
  mode = opts;
  const cfg = LEVELS[i];
  if (!mode && cfg.gift && !save.upgrades[cfg.gift]) { save.upgrades[cfg.gift] = 1; persist(); }
  run = new Run(i, mode ? mode.upgrades : save.upgrades, { seed: mode?.seed });
  seenCustomers = new Set();
  lastVersion = -1;
  const up = mode ? {} : save.upgrades;
  const decor = `${up["decor.lights"] ? `<div class="decor-lights" aria-hidden="true">${"<i></i>".repeat(14)}</div>` : ""}
    ${up["decor.pumpkins"] ? `<span class="decor-pumpkins" aria-hidden="true">🎃🎃</span>` : ""}
    ${up["decor.furniture"] ? `<span class="decor-furniture" aria-hidden="true">🕯️ 🪑 🕯️</span>` : ""}`;
  app.innerHTML = `<div class="screen kitchen" id="kitchen">
    <header class="hud">
      ${mode ? `<button class="icon-btn" data-act="race-quit" aria-label="Leave race">✕</button>` : `<button class="icon-btn" data-act="pause" aria-label="Pause">⏸</button>`}
      <div class="hud-block hud-level"><small>${mode ? "VERSUS RACE" : `LEVEL ${i + 1}`}</small><b>${esc(mode ? mode.title : cfg.name)}</b></div>
      <div class="hud-block hud-clock"><small>UNTIL MIDNIGHT</small><b id="clock">9:00 PM</b><div class="bar"><i id="clockbar"></i></div></div>
      <div class="hud-block hud-coins"><small>COINS · ★★${cfg.coins}</small><b>🪙 <span id="coins">0</span></b><div class="bar gold"><i id="coinbar"></i></div></div>
      <div class="hud-block hud-served"><small>SERVED · ★${cfg.serve}</small><b>👻 <span id="served">0</span>/${cfg.customers}</b></div>
      <div class="hud-combo" id="combo">COMBO ×0</div>
    </header>
    ${mode ? `<div class="race-board" id="raceboard"></div><div class="prank-bar" id="prankbar"></div>` : ""}
    <div class="hint" id="hint" aria-live="polite"></div>
    <section class="shopfront">
      <div class="window-moon" aria-hidden="true">☾</div>${decor}
      <div class="sign" aria-hidden="true">✦ HAUNTED SNACK SHOP ✦</div>
      <div class="seats" id="seats"></div>
      <div class="counter-top" aria-hidden="true"></div>
    </section>
    <section class="tray-row"><span class="tray-label">🍽️ TRAY</span><div class="tray" id="tray"></div></section>
    <section class="stations" id="stations"></section>
    <div class="lights-overlay" aria-hidden="true"></div>
    <div class="banner" id="banner" role="status"></div>
    <div id="thief-layer"></div>
  </div>`;
  els = { kitchen: document.getElementById("kitchen"), seats: document.getElementById("seats"), tray: document.getElementById("tray"),
    stations: document.getElementById("stations"), clock: document.getElementById("clock"), clockbar: document.getElementById("clockbar"),
    coins: document.getElementById("coins"), coinbar: document.getElementById("coinbar"), served: document.getElementById("served"),
    combo: document.getElementById("combo"), hint: document.getElementById("hint"), banner: document.getElementById("banner"),
    thief: document.getElementById("thief-layer") };
  banner(mode ? "GO! Cook faster than your rivals!" : `Level ${i + 1}: ${cfg.name}`, "start");
  lastFrame = performance.now();
  raf = requestAnimationFrame(frame);
}

function frame(now) {
  if (!run) return;
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;
  run.tick(dt);
  if (run.version !== lastVersion) { lastVersion = run.version; renderDynamic(); }
  updateBars();
  drainEvents();
  if (run && mode) mode.onFrame?.(run);
  if (run && !run.over) raf = requestAnimationFrame(frame);
}

function moodEmoji(c) {
  if (c.leaving === "happy") return "😍";
  if (c.leaving === "angry") return "💢";
  return c.mood === "happy" ? "😊" : c.mood === "meh" ? "😐" : "😠";
}

function renderSeats() {
  els.seats.innerHTML = run.seats.map((c, i) => {
    if (!c) return `<div class="seat empty" data-seat="${i}"><span class="stool"></span></div>`;
    const def = CUSTOMERS[c.type];
    const isNew = !seenCustomers.has(c.id);
    seenCustomers.add(c.id);
    const items = c.items.map(it => `<span class="oi ${it.done ? "done" : ""} ${it.secret ? "secret" : ""} ${it.changed ? "changed" : ""}" title="${esc(RECIPES[it.recipe].name)}${it.secret ? " (secret, must be perfect)" : ""}">${RECIPES[it.recipe].icon}</span>`).join("");
    return `<div class="seat ${c.type === "king" ? "boss" : ""}" data-seat="${i}">
      <div class="cust ${isNew ? "arrive" : ""} ${c.leaving ? "leave-" + c.leaving : ""} mood-${c.mood} ${def.tint ? "tint-" + def.tint : ""} type-${c.type}">
        <div class="bubble">${c.changed ? `<em class="bang">!</em>` : ""}<div class="order">${items}</div><small>${esc(c.line)}</small></div>
        <div class="avatar"><span class="emo">${def.icon}</span>${def.badge ? `<span class="badge">${def.badge}</span>` : ""}<span class="mood">${moodEmoji(c)}</span></div>
        <div class="cname">${esc(def.name)}</div>
        <div class="pbar"><i data-pbar="${i}"></i></div>
      </div>
    </div>`;
  }).join("");
}

function renderTray() {
  let html = "";
  for (let i = 0; i < run.trayCap; i++) {
    const d = run.tray[i];
    html += d
      ? `<div class="plate full"><button class="plate-btn" data-tray="${i}" aria-label="Serve ${esc(RECIPES[d.recipe].name)}">${RECIPES[d.recipe].icon}${d.perfect ? `<i class="pstar">★</i>` : ""}</button><button class="toss" data-toss="${i}" aria-label="Throw away">✕</button></div>`
      : `<div class="plate"><span></span></div>`;
  }
  els.tray.innerHTML = html;
}

function slotHTML(st, idx, slot) {
  const ref = `${st}:${idx}`;
  const recipe = slot.recipe || STATIONS[st].recipe;
  const R = RECIPES[recipe];
  let inner = "";
  let label = "";
  let cls = `slot s-${slot.state} r-${recipe}`;
  switch (slot.state) {
    case "empty":
      inner = `<span class="food idle">${R.raw}</span>`;
      label = `TAP: ${R.icon} ${R.name.toUpperCase()}`;
      break;
    case "cooking":
      inner = `<span class="food">${R.mini === "flip" && slot.flipped ? R.icon : R.raw}</span><span class="steam">♨</span>`;
      label = "COOKING…";
      if (R.mini === "flip" && slot.window > 0) { cls += " floating alert"; label = "TAP TO FLIP!"; inner += `<b class="callout">FLIP!</b>`; }
      if (R.mini === "shake" && slot.inWindow) { cls += " glow alert"; label = "TAP TO SHAKE!"; inner += `<b class="callout">SHAKE!</b>`; }
      if (R.mini === "shake" && slot.shaken) inner += `<i class="pstar">★</i>`;
      if (R.mini === "stir") { inner += `<div class="stirbar"><i data-stir="${ref}"></i></div>`; if (slot.needStir) { cls += " bubbling alert"; label = "TAP TO STIR!"; inner += `<b class="callout">STIR!</b>`; } }
      break;
    case "filling": {
      const [lo, hi] = run.zone();
      inner = `<div class="meter"><b class="zone" style="bottom:${lo * 100}%;height:${(hi - lo) * 100}%"></b><i data-fill="${ref}"></i></div><span class="food small">${R.raw}</span>`;
      label = "TAP IN THE GLOW!";
      cls += " alert-soft";
      break;
    }
    case "prep": {
      const order = TOPPINGS.map((t, n) => `<span class="${n < slot.prepIdx ? "got" : n === slot.prepIdx ? "next" : ""}">${t.icon}</span>`).join("<i>›</i>");
      const buttons = slot.prep.map(id => { const t = TOPPINGS.find(x => x.id === id); return `<button class="top-btn" data-topping="${id}" data-slotref="${ref}" aria-label="${t.name}">${t.icon}</button>`; }).join("");
      return `<div class="${cls}" data-slot="${ref}"><div class="prep-order">${order}</div><div class="prep-btns">${buttons}</div><div class="slot-label">ADD IN ORDER</div></div>`;
    }
    case "ready":
      inner = `<span class="food done">${R.icon}</span><span class="sparkle">✨</span>${slot.perfect ? `<i class="pstar">★</i>` : ""}`;
      label = "TAP TO SERVE";
      cls += " ready-glow";
      break;
    case "burnt":
      inner = `<span class="food burnt">${R.icon}</span><span class="smoke">💨</span>`;
      label = "BURNT · TAP TO CLEAR";
      break;
  }
  const showBar = slot.state === "cooking" || (slot.state === "ready" && Number.isFinite(slot.fresh));
  return `<button class="${cls}" data-slot="${ref}" aria-label="${esc(STATIONS[st].name)}: ${esc(label)}">
    <div class="appliance a-${st}">${inner}</div>
    <div class="slot-label">${esc(label)}</div>
    <div class="sbar ${showBar ? "" : "hidden"}"><i data-sbar="${ref}"></i></div>
  </button>`;
}

function renderStations() {
  els.stations.innerHTML = run.stationIds.map(st => {
    const tier = save.upgrades[st + ".speed"] || 0;
    return `<div class="station st-${st} ${run.stations[st].slots.length > 1 ? "two" : ""}">
      <div class="station-head"><span>${STATIONS[st].icon}</span><b>${esc(STATIONS[st].name)}</b><em class="pips">${"⚡".repeat(tier)}</em></div>
      <div class="slots">${run.stations[st].slots.map((s, i) => slotHTML(st, i, s)).join("")}</div>
    </div>`;
  }).join("");
}

function renderThief() {
  els.thief.innerHTML = run.thief ? `<button class="thief" data-shoo="1" aria-label="Shoo the thief ghost">👻<span>🖐️</span><i class="thief-bar"><b></b></i></button>` : "";
}

function renderDynamic() {
  renderSeats();
  renderTray();
  renderStations();
  renderThief();
  els.kitchen.classList.toggle("dark", run.dark);
  els.kitchen.classList.toggle("rush", run.rushing);
}

function clockText(t, total) {
  const minutes = Math.min(180, Math.floor((t / total) * 180));
  const h = 9 + Math.floor(minutes / 60);
  const m = minutes % 60;
  return h >= 12 ? "12:00 AM" : `${h}:${String(m).padStart(2, "0")} PM`;
}

function hintText() {
  const cfg = run.cfg;
  if (!(cfg.tutorial || (cfg.teach && run.t < 45))) return "";
  const slots = run.stationIds.flatMap(st => run.stations[st].slots);
  if (slots.some(s => s.state === "cooking" && s.window > 0)) return "👆 The patty is floating! Tap it to FLIP before it drifts away.";
  if (slots.some(s => s.state === "cooking" && s.inWindow)) return "👆 The basket is glowing! Tap to SHAKE the fries.";
  if (slots.some(s => s.state === "filling")) return "👆 Tap the mixer when the shake is inside the glowing zone.";
  if (slots.some(s => s.state === "prep")) return "👆 Add toppings in order: 🍅 sauce › 🧀 cheese › 👁️ eyeball.";
  if (slots.some(s => s.state === "cooking" && s.needStir)) return "👆 It's bubbling! Tap the cauldron to STIR.";
  if (slots.some(s => s.state === "ready")) return "👆 Tap the ready dish to serve it. Extras go on the tray.";
  if (slots.some(s => s.state === "burnt")) return "👆 Burnt! Tap to clear the station.";
  if (run.tray.length) return "👆 Tap a dish on the tray to serve it.";
  if (slots.some(s => s.state === "cooking")) return "Cooking… keep an eye on the station!";
  if (run.seats.some(c => c && !c.leaving)) return "👆 Tap a station to start cooking what the ghost ordered.";
  return "A customer is floating in…";
}

function updateBars() {
  const r = run;
  els.clock.textContent = clockText(r.t, r.time);
  els.clockbar.style.width = `${Math.max(0, 100 - (r.t / r.time) * 100)}%`;
  els.clock.parentElement.classList.toggle("urgent", r.time - r.t < 20);
  els.coins.textContent = r.coins;
  els.coinbar.style.width = `${Math.min(100, (r.coins / r.cfg.coins) * 100)}%`;
  els.served.textContent = r.served;
  els.combo.textContent = `COMBO ×${r.combo}`;
  els.combo.classList.toggle("hot", r.combo >= 3);
  const hint = hintText();
  if (els.hint.textContent !== hint) { els.hint.textContent = hint; els.hint.classList.toggle("show", !!hint); }

  els.seats.querySelectorAll("[data-pbar]").forEach(bar => {
    const c = r.seats[+bar.dataset.pbar];
    if (!c) return;
    const ratio = Math.max(0, c.patience / c.max);
    bar.style.width = `${ratio * 100}%`;
    bar.className = ratio > 0.5 ? "ok" : ratio > 0.25 ? "meh" : "bad";
  });
  els.stations.querySelectorAll("[data-sbar]").forEach(bar => {
    const [st, i] = bar.dataset.sbar.split(":");
    const s = r.stations[st]?.slots[+i];
    if (!s) return;
    if (s.state === "cooking" && s.window > 0) { bar.style.width = `${(s.window / FLIP_WINDOW) * 100}%`; bar.className = "bad"; }
    else if (s.state === "cooking") { bar.style.width = `${Math.min(100, s.progress * 100)}%`; bar.className = "ok"; }
    else if (s.state === "ready" && Number.isFinite(s.fresh)) { const f = s.fresh / s.freshMax; bar.style.width = `${f * 100}%`; bar.className = f > 0.4 ? "fresh" : "bad"; }
  });
  els.stations.querySelectorAll("[data-fill]").forEach(bar => {
    const [st, i] = bar.dataset.fill.split(":");
    const s = r.stations[st]?.slots[+i];
    if (s) bar.style.height = `${Math.min(100, s.progress * 100)}%`;
  });
  els.stations.querySelectorAll("[data-stir]").forEach(bar => {
    const [st, i] = bar.dataset.stir.split(":");
    const s = r.stations[st]?.slots[+i];
    if (s) { bar.style.width = `${Math.min(100, s.stir * 100)}%`; bar.className = s.stir > 0.55 ? "bad" : "ok"; }
  });
  if (r.thief) {
    const btn = els.thief.querySelector(".thief");
    const target = thiefTargetEl();
    if (btn && target) {
      const box = target.getBoundingClientRect();
      btn.style.left = `${box.left + box.width / 2}px`;
      btn.style.top = `${box.top}px`;
      btn.querySelector("b").style.width = `${(r.thief.left / r.thief.max) * 100}%`;
    }
  }
}

function thiefTargetEl() {
  const t = run.thief.target;
  const trayIdx = run.tray.indexOf(t);
  if (trayIdx >= 0) return els.tray.querySelector(`[data-tray="${trayIdx}"]`);
  for (const st of run.stationIds) {
    const idx = run.stations[st].slots.indexOf(t);
    if (idx >= 0) return els.stations.querySelector(`[data-slot="${st}:${idx}"]`);
  }
  return null;
}

// ---------------- Effects ----------------
export function floatText(anchor, text, kind = "") {
  if (!anchor) return;
  const box = anchor.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = `floater ${kind}`;
  el.textContent = text;
  el.style.left = `${box.left + box.width / 2}px`;
  el.style.top = `${box.top + box.height * 0.3}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

export function banner(text, kind = "") {
  if (!els.banner) return;
  els.banner.textContent = text;
  els.banner.className = `banner show ${kind}`;
  clearTimeout(banner.timer);
  banner.timer = setTimeout(() => { if (els.banner) els.banner.className = "banner"; }, 2200);
}

const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch {} };
const slotEl = (ref) => els.stations?.querySelector(`[data-slot="${ref}"]`);
const seatEl = (i) => els.seats?.querySelector(`[data-seat="${i}"]`);
const WARN = { lights: "⚡ The lights are flickering…", rush: "🔥 Haunted heat incoming!", thief: "👀 A thief ghost is sneaking in!" };
const WASTE = { floated: "Floated away! 👻", burnt: "Burnt! 🔥", spilled: "Spilled! 💦", monster: "Soup monster! 👹" };

function drainEvents() {
  if (!run) return;
  const events = run.queue.splice(0);
  for (const e of events) {
    switch (e.type) {
      case "start": e.recipe === "shake" ? sfx.whoosh() : sfx.sizzle(); break;
      case "flipReady": sfx.tap(); break;
      case "flip": e.perfect ? (sfx.perfect(), floatText(slotEl(e.slot), "PERFECT FLIP!", "good")) : (sfx.flip(), floatText(slotEl(e.slot), "Flipped!")); break;
      case "shake": sfx.perfect(); floatText(slotEl(e.slot), "PERFECT SHAKE!", "good"); break;
      case "stir": sfx.whoosh(); floatText(slotEl(e.slot), "Stirred!"); break;
      case "stop": e.perfect ? (sfx.perfect(), floatText(slotEl(e.slot), "PERFECT POUR!", "good")) : (sfx.tap(), floatText(slotEl(e.slot), "A bit off…")); break;
      case "topping": sfx.tap(); break;
      case "wrong": sfx.bad(); buzz(60); floatText(slotEl(e.slot), e.text, "bad"); break;
      case "ready": sfx.ready(); break;
      case "toTray": sfx.tap(); break;
      case "trayFull": sfx.bad(); floatText(slotEl(e.slot), "Tray full! Serve something first", "bad"); break;
      case "nobody": sfx.bad(); floatText(els.tray.querySelector(`[data-tray="${e.tray}"]`), e.text, "bad"); break;
      case "paid":
        sfx.coin();
        floatText(seatEl(e.seat), `+${e.total} 🪙`, "coin");
        if (e.label) setTimeout(() => floatText(seatEl(e.seat), e.label, "good"), 250);
        if (e.combo >= 2) { els.combo.classList.remove("pop"); void els.combo.offsetWidth; els.combo.classList.add("pop"); }
        if (e.combo === 5 || e.combo === 10) banner(`🔥 COMBO ×${e.combo}!`, "good");
        break;
      case "lost": sfx.bad(); buzz(120); floatText(seatEl(e.seat), "Left hungry! 💢", "bad"); break;
      case "waste": sfx.bad(); buzz(80); floatText(slotEl(e.slot), WASTE[e.reason] || "Wasted!", "bad"); break;
      case "warn": sfx.warn(); banner(WARN[e.event] || "Something spooky…", "warn"); break;
      case "lights": banner("🌑 Lights out! Keep cooking!", "warn"); break;
      case "rush": banner("🔥 HAUNTED HEAT! Stations cook ×2", "warn"); break;
      case "thief": banner("👻 Tap the thief to shoo it!", "warn"); break;
      case "stolen": sfx.bad(); banner("😱 The thief stole a dish!", "bad"); break;
      case "shoo": sfx.coin(); banner("Shoo! +5 🪙", "good"); break;
      case "arrive": sfx.arrive(); if (e.who === "king") banner("👑 THE GHOST KING ARRIVES!", "warn"); break;
      case "changed": sfx.warn(); floatText(seatEl(e.seat), "Changed my mind!", "warn"); break;
      case "hint": floatText(slotEl(e.slot), e.text); break;
      case "toss": sfx.tap(); break;
      case "boo": sfx.bad(); buzz(100); break;
      case "over": if (mode) { const m = mode, r = run; setTimeout(() => m.onOver?.(r), 650); } else setTimeout(showResults, 650); break;
    }
  }
}

// ---------------- Results ----------------
function showResults() {
  if (!run) return;
  stopLoop();
  const i = run.levelIndex;
  const cfg = run.cfg;
  const prev = save.levels[i] || { stars: 0, best: 0, combo: 0 };
  const newBest = run.coins > prev.best;
  save.levels[i] = { stars: Math.max(prev.stars, run.stars), best: Math.max(prev.best, run.coins), combo: Math.max(prev.combo, run.bestCombo) };
  save.coins += run.coins;
  save.totals.served += run.served;
  save.totals.levels += 1;
  for (const type of run.seen) {
    const b = save.book[type] || { seen: true, served: 0 };
    b.seen = true;
    b.served += run.stats["served_" + type] || 0;
    save.book[type] = b;
  }
  let reward = "";
  if (cfg.reward && run.stars > 0 && !save.crown) { save.crown = true; save.coins += cfg.reward.coins; reward = cfg.reward.text; }
  const questsDone = applyQuestStats(save, run.stats);
  persist();

  const goals = starGoals(cfg);
  const won = run.stars > 0;
  const next = i + 1 < LEVELS.length && won;
  const modal = document.createElement("div");
  modal.className = "modal-wrap";
  modal.innerHTML = `<div class="modal result-modal ${won ? "win" : "lose"}" role="dialog" aria-label="Level results">
    <div class="modal-kicker">LEVEL ${i + 1} · ${esc(cfg.name)}</div>
    <h2>${run.stars === 3 ? "Spook-tacular!" : won ? "Shift complete!" : "The ghosts went hungry…"}</h2>
    <div class="big-stars">${[1, 2, 3].map(n => `<i data-star="${n}">★</i>`).join("")}</div>
    <ol class="goals">${goals.map((g, n) => `<li class="${run.stars > n ? "met" : ""}"><span class="check">${run.stars > n ? "✓" : "✗"}</span><span>${esc(g)}</span></li>`).join("")}</ol>
    <div class="result-grid">
      <div><b>🪙 ${run.coins}</b><small>COINS${newBest ? ` · <em>NEW BEST</em>` : ""}</small></div>
      <div><b>${run.served}/${run.total}</b><small>SERVED</small></div>
      <div><b>×${run.bestCombo}</b><small>BEST COMBO</small></div>
      <div><b>${run.lost}</b><small>LEFT HUNGRY</small></div>
      <div><b>${run.wasted}</b><small>WASTED FOOD</small></div>
    </div>
    ${reward ? `<div class="gift">🏆 ${esc(reward)}</div>` : ""}
    ${questsDone.map(q => `<div class="quest-done">✅ Daily quest complete: ${esc(q)}</div>`).join("")}
    ${!won ? `<p class="tip">Tip: ${esc(tipFor(run))}</p>` : run.stars < 3 ? `<p class="tip">So close! ${esc(tipFor(run))}</p>` : ""}
    <div class="modal-actions wrap">
      <button class="btn" data-act="map">🗺️ Map</button>
      <button class="btn" data-act="shop">🛠️ Upgrades</button>
      <button class="btn ${next ? "" : "primary"}" data-act="retry" data-i="${i}">↻ ${won ? "Replay" : "Try again"}</button>
      ${next ? `<button class="btn primary" data-act="intro" data-i="${i + 1}">Next level →</button>` : ""}
    </div>
  </div>`;
  app.appendChild(modal);
  for (let n = 1; n <= run.stars; n++) {
    setTimeout(() => { modal.querySelector(`[data-star="${n}"]`)?.classList.add("on"); sfx.star(n - 1); if (n === 3) sfx.fanfare(); }, 350 * n);
  }
  if (!won) sfx.bad();
}

function tipFor(r) {
  if (r.cfg.boss && !r.bossServed) return "Cook the Ghost King's dishes early and park extras on the tray.";
  if (r.wasted > 0) return "Watch the shrinking bars on ready food. Serve or tray it before it burns.";
  if (r.lost > 0) return "Serve the reddest patience bar first. Angry Zombies can't wait long.";
  if (r.coins < r.cfg.coins) return "Perfect dishes, fast service and combos earn bigger tips. Upgrades help too!";
  return "Keep the combo going!";
}

// ---------------- Pause ----------------
function pause() {
  if (!run || run.over || run.paused || mode) return;
  run.paused = true;
  const modal = document.createElement("div");
  modal.className = "modal-wrap";
  modal.innerHTML = `<div class="modal pause-modal" role="dialog" aria-label="Paused"><h2>Paused</h2><p>The ghosts will wait. Just this once.</p>
    <div class="modal-actions col"><button class="btn primary big" data-act="resume">▶ Resume</button><button class="btn" data-act="retry" data-i="${run.levelIndex}">↻ Restart level</button><button class="btn" data-act="map">🗺️ Quit to map</button></div></div>`;
  app.appendChild(modal);
}

function resume() {
  document.querySelector(".modal-wrap")?.remove();
  if (!run) return;
  run.paused = false;
  lastFrame = performance.now();
  if (!raf) raf = requestAnimationFrame(frame);
}

// ---------------- Shop ----------------
function showShop() {
  stopLoop();
  run = null;
  mode = null;
  const reached = unlockedCount(save);
  const groups = ["Kitchen", "Serving", "Decor"].map(group => {
    const cards = UPGRADES.filter(u => u.group === group).map(u => {
      const tier = save.upgrades[u.key] || 0;
      const maxed = tier >= u.costs.length;
      const cost = u.costs[tier];
      const locked = u.level > reached;
      const pips = u.costs.length > 1 ? `<div class="tier">${u.costs.map((_, n) => `<i class="${n < tier ? "on" : ""}"></i>`).join("")}</div>` : "";
      return `<div class="upgrade ${locked ? "locked" : ""} ${maxed ? "maxed" : ""}">
        <span class="up-icon">${locked ? "🔒" : u.icon}</span>
        <div class="up-copy"><b>${esc(u.name)}</b><small>${esc(u.desc)}</small>${pips}</div>
        ${locked ? `<em>Level ${u.level}</em>` : maxed ? `<em class="owned">${u.costs.length > 1 ? "MAX" : "Owned"}</em>` : `<button class="btn small ${save.coins >= cost ? "primary" : ""}" data-act="buy" data-key="${u.key}" ${save.coins >= cost ? "" : "disabled"}>🪙 ${cost}</button>`}
      </div>`;
    }).join("");
    return `<section class="up-group"><h3>${group}</h3>${cards}</section>`;
  }).join("");
  app.innerHTML = `<div class="screen shop-screen">${topNav(true)}
    <div class="page-head"><h2>Upgrade the shop</h2><p>Upgrades show up in your kitchen and stay with you between levels.</p></div>
    <div class="shop-preview" aria-hidden="true">
      ${save.upgrades["decor.lights"] ? `<div class="decor-lights">${"<i></i>".repeat(14)}</div>` : ""}
      <span class="pv-moon">☾</span><span class="pv-counter">🍳${save.upgrades["grill.slot"] ? "🍳" : ""} 🧺${save.upgrades["fryer.slot"] ? "🧺" : ""} 🌀${save.upgrades["mixer.slot"] ? "🌀" : ""}</span>
      ${save.upgrades["decor.pumpkins"] ? `<span class="pv-pumpkins">🎃🎃</span>` : ""}${save.upgrades["decor.furniture"] ? `<span class="pv-furn">🕯️🪑🕯️</span>` : ""}
    </div>
    ${groups}</div>`;
}

function buy(key) {
  const u = UPGRADES.find(x => x.key === key);
  const tier = save.upgrades[key] || 0;
  const cost = u?.costs[tier];
  if (!u || cost === undefined || save.coins < cost) return;
  save.coins -= cost;
  save.upgrades[key] = tier + 1;
  persist();
  sfx.coin();
  showShop();
}

// ---------------- Ghost book ----------------
function showBook() {
  stopLoop();
  run = null;
  mode = null;
  const cards = Object.entries(CUSTOMERS).map(([id, c]) => {
    const rec = save.book[id];
    if (!rec?.seen) return `<div class="ghost-card unknown"><span class="gc-avatar">❔</span><b>???</b><small>Appears from level ${c.firstLevel}</small></div>`;
    return `<div class="ghost-card ${c.tint ? "tint-" + c.tint : ""}"><span class="gc-avatar"><span class="emo">${c.icon}</span>${c.badge ? `<span class="badge">${c.badge}</span>` : ""}</span><b>${esc(c.name)}</b><small>${esc(c.bio)}</small><em>Served ${rec.served}×</em></div>`;
  }).join("");
  const found = Object.keys(CUSTOMERS).filter(id => save.book[id]?.seen).length;
  app.innerHTML = `<div class="screen book-screen">${topNav(true)}
    <div class="page-head"><h2>📖 Ghost Book</h2><p>${found}/${Object.keys(CUSTOMERS).length} customers discovered. Each new face you serve is added here.</p></div>
    <div class="ghost-grid">${cards}</div></div>`;
}

// ---------------- Input ----------------
function gameplayTarget(target) {
  if (!run || run.over || run.paused) return false;
  const shoo = target.closest("[data-shoo]");
  if (shoo) { run.shoo(); return true; }
  const top = target.closest("[data-topping]");
  if (top) { const [st, i] = top.dataset.slotref.split(":"); run.tapTopping(st, +i, top.dataset.topping); return true; }
  const toss = target.closest("[data-toss]");
  if (toss) { run.tossTray(+toss.dataset.toss); return true; }
  const tray = target.closest("[data-tray]");
  if (tray) { run.tapTray(+tray.dataset.tray); return true; }
  const slot = target.closest("button[data-slot]");
  if (slot) { const [st, i] = slot.dataset.slot.split(":"); run.tapSlot(st, +i); return true; }
  return false;
}

app.addEventListener("pointerdown", (event) => {
  unlockAudio();
  if (gameplayTarget(event.target)) {
    event.preventDefault();
    // Apply the effects of this tap right away instead of waiting a frame.
    if (run && run.version !== lastVersion) { lastVersion = run.version; renderDynamic(); }
    drainEvents();
  }
});
document.body.addEventListener("pointerdown", (event) => {
  if (event.target.closest("#app")) return;
  unlockAudio();
});

app.addEventListener("click", (event) => {
  // Keyboard activation (detail 0) still reaches gameplay controls.
  if (event.detail === 0 && gameplayTarget(event.target)) { drainEvents(); return; }
  const btn = event.target.closest("[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  const i = Number(btn.dataset.i);
  unlockAudio();
  sfx.tap();
  if (act.startsWith("race")) { handleRaceAct(act, btn); return; }
  switch (act) {
    case "first": showMap(); showIntro(0); break;
    case "map": showMap(); break;
    case "level": showIntro(i); break;
    case "intro": document.querySelector(".modal-wrap")?.remove(); showMap(); showIntro(i); break;
    case "close": document.querySelector(".modal-wrap")?.remove(); break;
    case "start": startLevel(i); break;
    case "retry": document.querySelector(".modal-wrap")?.remove(); startLevel(i); break;
    case "pause": pause(); break;
    case "resume": resume(); break;
    case "shop": showShop(); break;
    case "book": showBook(); break;
    case "buy": buy(btn.dataset.key); break;
    case "sound":
      save.settings.sound = !save.settings.sound;
      setSound(save.settings.sound);
      persist();
      btn.textContent = save.settings.sound ? "🔊" : "🔇";
      break;
    case "login": { const n = claimLogin(save); persist(); if (n) sfx.coin(); showMap(); break; }
    case "quest": {
      const q = save.daily.quests[i];
      const def = QUEST_POOL.find(d => d.id === q?.id);
      if (q && def && !q.claimed && q.progress >= q.n) { q.claimed = true; save.coins += def.reward; persist(); sfx.coin(); }
      showMap();
      break;
    }
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (run && !run.over) run.paused ? resume() : pause();
    else if (document.querySelector(".intro-modal")) document.querySelector(".modal-wrap")?.remove();
  }
});
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

export function boot() {
  const raceCode = new URLSearchParams(location.search).get("race");
  if (raceCode) showRaceHome(raceCode.toUpperCase().slice(0, 6));
  else showTitle();
  if (import.meta.env.DEV) window.__hss = { run: () => run, save: () => save };
}
