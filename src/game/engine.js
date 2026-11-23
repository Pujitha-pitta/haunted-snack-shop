// The cooking simulation for one level. Pure logic: no DOM.
// The UI calls tick(dt) every frame and reads `queue` for effects.
import { RECIPES, STATIONS, STATION_ORDER, CUSTOMERS, LEVELS, TOPPINGS } from "./data.js";

export const FLIP_WINDOW = 2.6;       // seconds a floating patty waits for a flip
const PERFECT_FLIP = 1.4;             // flip within this many seconds of the window opening = perfect
const SHAKE_WINDOW = [0.45, 0.8];     // fry progress range where shaking counts
const STIR_TIME = 3.6;                // seconds for soup bubbles to fill up
const STIR_ZONE = 0.55;               // bubble level where "STIR!" shows
const SEATS = 4;
const SPEED = [1, 0.85, 0.72, 0.6];   // cook-time multiplier per station speed tier

// Seeded random numbers so every racer in a versus room gets the same customers.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = (rng, a, b) => a + rng() * (b - a);
const randInt = (rng, a, b) => Math.floor(rand(rng, a, b + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function weightedPick(rng, weights) {
  const entries = Object.entries(weights);
  let r = rng() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) if ((r -= w) <= 0) return k;
  return entries[0][0];
}
const emptySlot = () => ({ state: "empty", id: 0 });

export class Run {
  constructor(levelIndex, upgrades = {}, opts = {}) {
    const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 32);
    this.custRng = mulberry32(seed);              // customers: identical for every racer
    this.rng = mulberry32(seed ^ 0x9e3779b9);     // everything that depends on the player's actions
    this.levelIndex = levelIndex;
    this.cfg = LEVELS[levelIndex];
    this.up = upgrades;
    this.t = 0;
    this.time = this.cfg.time;
    this.coins = 0;
    this.served = 0;
    this.lost = 0;
    this.wasted = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.bossServed = false;
    this.stats = {};
    this.seen = new Set();
    this.seats = Array(SEATS).fill(null);
    this.spawned = 0;
    this.total = this.cfg.customers;
    this.nextSpawn = 1.2;
    this.interval = this.cfg.interval || Math.max(4.5, (this.cfg.time * 0.56) / this.cfg.customers);
    this.bossIndex = this.cfg.boss ? (this.cfg.bossAt ?? 2) : -1;
    this.trayCap = 2 + (upgrades.counter || 0);
    this.tray = [];
    this.freshMul = 1 + 0.35 * (upgrades.fridge || 0);
    this.patienceMul = 1 + 0.08 * ["decor.pumpkins", "decor.lights", "decor.furniture"].filter(k => upgrades[k]).length;
    this.zoneBonus = 0.035 * (upgrades["mixer.speed"] || 0);
    this.stations = {};
    for (const recipe of this.cfg.recipes) {
      const st = RECIPES[recipe].station;
      const count = 1 + (upgrades[st + ".slot"] ? 1 : 0);
      this.stations[st] = { id: st, slots: Array.from({ length: count }, emptySlot) };
    }
    this.stationIds = STATION_ORDER.filter(id => this.stations[id]);
    this.schedule = (this.cfg.events || []).map(e => ({ ...e, warned: false, fired: false }));
    this.lightsUntil = 0;
    this.rushUntil = 0;
    this.thief = null;
    this.queue = [];
    this.version = 0;
    this.over = false;
    this.paused = false;
    this.nextId = 1;
  }

  emit(type, data = {}) { this.queue.push({ type, ...data }); }
  bump() { this.version++; }
  stat(key, n = 1) { this.stats[key] = (this.stats[key] || 0) + n; }
  cookTime(st, recipe) { return RECIPES[recipe].cook * SPEED[this.up[st + ".speed"] || 0]; }
  zone() { return [0.68 - this.zoneBonus, 0.86 + this.zoneBonus]; }
  get rushing() { return this.rushUntil > this.t; }
  get dark() { return this.lightsUntil > this.t; }

  // ---------- customers ----------
  makeCustomer() {
    const isBoss = this.spawned === this.bossIndex;
    const type = isBoss ? "king" : weightedPick(this.custRng, this.cfg.types);
    const def = CUSTOMERS[type];
    const count = isBoss ? 5 : Math.min(this.cfg.maxItems || 1, randInt(this.custRng, def.items[0], def.items[1]));
    const items = Array.from({ length: count }, () => ({ recipe: pick(this.custRng, this.cfg.recipes), done: false, perfect: false }));
    if (type === "witch") {
      const choices = this.cfg.recipes.filter(r => r !== "soup");
      items[0].recipe = pick(this.custRng, choices);
      items[0].secret = true;
    }
    const patience = isBoss ? this.cfg.bossTime || 80 : (13 + 6.5 * count) * def.patience * this.patienceMul;
    this.seen.add(type);
    return { id: this.nextId++, type, items, patience, max: patience, mood: "happy", changed: false,
      line: pick(this.custRng, def.lines), leaving: null, leaveT: 0 };
  }

  customerLeaves(c, happy) {
    c.leaving = happy ? "happy" : "angry";
    c.leaveT = 0.9;
    if (!happy) {
      this.lost++;
      this.combo = 0;
      this.emit("lost", { seat: this.seats.indexOf(c), who: c.type });
    }
    this.bump();
  }

  pay(c) {
    const seat = this.seats.indexOf(c);
    const base = c.items.reduce((s, it) => s + RECIPES[it.recipe].coins + (it.perfect ? 3 : 0), 0);
    const ratio = Math.max(0, c.patience / c.max);
    const tip = Math.round(base * 0.5 * ratio * (c.type === "zombie" ? 1.4 : 1));
    let bonus = 0;
    let label = "";
    if (c.type === "vampire" && c.items.every(i => i.perfect)) { bonus += base; label = "VIP PERFECT ×2"; }
    if (c.type === "witch") { const s = c.items.find(i => i.secret); bonus += 2 * (RECIPES[s.recipe].coins + 3); label = "SECRET RECIPE ×3"; }
    if (c.type === "king") { bonus += 100; label = "ROYAL FEAST +100"; this.bossServed = true; }
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = 1 + Math.min(this.combo - 1, 10) * 0.1;
    const total = Math.round((base + tip + bonus) * mult);
    this.coins += total;
    this.served++;
    this.stat("served");
    this.stat("served_" + c.type);
    this.customerLeaves(c, true);
    this.emit("paid", { seat, total, label, combo: this.combo, who: c.type });
  }

  // Find who should receive a dish: most impatient customer that still needs it.
  target(dish) {
    let best = null;
    for (const c of this.seats) {
      if (!c || c.leaving) continue;
      const item = c.items.find(i => !i.done && i.recipe === dish.recipe && (!i.secret || dish.perfect));
      if (!item) continue;
      const r = c.patience / c.max;
      if (!best || r < best.r) best = { c, item, r };
    }
    return best;
  }

  give(dish) {
    const hit = this.target(dish);
    if (!hit) return false;
    hit.item.done = true;
    hit.item.perfect = dish.perfect;
    this.emit("deliver", { seat: this.seats.indexOf(hit.c), recipe: dish.recipe });
    if (hit.c.items.every(i => i.done)) this.pay(hit.c);
    this.bump();
    return true;
  }

  // ---------- player actions ----------
  tapSlot(stId, idx) {
    if (this.over || this.paused) return;
    const slot = this.stations[stId]?.slots[idx];
    if (!slot) return;
    const ref = `${stId}:${idx}`;
    const recipe = slot.recipe || STATIONS[stId].recipe;
    const R = RECIPES[recipe];
    switch (slot.state) {
      case "empty": {
        Object.assign(slot, { state: "cooking", recipe, id: this.nextId++, progress: 0, perfect: false,
          flipped: false, window: 0, shaken: false, inWindow: false, stir: 0, needStir: false, prep: null, prepIdx: 0, mistake: false, counted: false, fresh: 0, freshMax: 0 });
        if (R.mini === "stop") slot.state = "filling";
        if (R.mini === "order") {
          slot.state = "prep";
          slot.prep = [...TOPPINGS].sort(() => this.rng() - 0.5).map(t => t.id);
        }
        this.emit("start", { slot: ref, recipe });
        break;
      }
      case "cooking":
        if (R.mini === "flip" && slot.window > 0) {
          slot.flipped = true;
          slot.perfect = slot.window > FLIP_WINDOW - PERFECT_FLIP;
          slot.window = 0;
          this.emit("flip", { slot: ref, perfect: slot.perfect });
        } else if (R.mini === "shake" && slot.inWindow) {
          slot.shaken = true;
          slot.perfect = true;
          slot.inWindow = false;
          this.emit("shake", { slot: ref });
        } else if (R.mini === "stir" && slot.stir > 0.25) {
          slot.stir = 0;
          slot.needStir = false;
          this.emit("stir", { slot: ref });
        } else {
          this.emit("hint", { slot: ref, text: R.mini === "flip" ? "Wait for it to float…" : R.mini === "shake" ? "Wait for the glow…" : "Cooking…" });
        }
        break;
      case "filling": {
        const [lo, hi] = this.zone();
        slot.perfect = slot.progress >= lo && slot.progress <= hi;
        slot.state = "ready";
        slot.fresh = Infinity;
        this.emit("stop", { slot: ref, perfect: slot.perfect });
        break;
      }
      case "ready": {
        const dish = { recipe: slot.recipe, perfect: slot.perfect, id: slot.id };
        if (this.give(dish)) { this.clearThiefFor(slot); Object.assign(slot, emptySlot()); }
        else if (this.tray.length < this.trayCap) {
          this.tray.push(dish);
          this.clearThiefFor(slot);
          Object.assign(slot, emptySlot());
          this.emit("toTray", { slot: ref });
        } else this.emit("trayFull", { slot: ref });
        break;
      }
      case "burnt":
        Object.assign(slot, emptySlot());
        this.emit("clear", { slot: ref });
        break;
      default:
        return;
    }
    this.bump();
  }

  tapTopping(stId, idx, topping) {
    if (this.over || this.paused) return;
    const slot = this.stations[stId]?.slots[idx];
    if (!slot || slot.state !== "prep") return;
    const ref = `${stId}:${idx}`;
    if (TOPPINGS[slot.prepIdx].id === topping) {
      slot.prepIdx++;
      this.emit("topping", { slot: ref });
      if (slot.prepIdx >= TOPPINGS.length) {
        slot.state = "cooking";
        slot.perfect = !slot.mistake;
      }
    } else {
      slot.prepIdx = 0;
      slot.mistake = true;
      this.emit("wrong", { slot: ref, text: "Wrong order! Start again" });
    }
    this.bump();
  }

  tapTray(i) {
    if (this.over || this.paused) return;
    const dish = this.tray[i];
    if (!dish) return;
    if (this.give(dish)) {
      if (this.thief?.target === dish) this.thief = null;
      this.tray.splice(i, 1);
    } else this.emit("nobody", { tray: i, text: "Nobody needs that right now" });
    this.bump();
  }

  tossTray(i) {
    if (!this.tray[i]) return;
    if (this.thief?.target === this.tray[i]) this.thief = null;
    this.tray.splice(i, 1);
    this.emit("toss");
    this.bump();
  }

  shoo() {
    if (!this.thief) return;
    this.thief = null;
    this.coins += 5;
    this.stat("shoo");
    this.emit("shoo");
    this.bump();
  }

  // Versus-mode pranks sent by rivals. Returns false if it had no effect.
  prank(kind) {
    if (this.over) return false;
    if (kind === "lights") { this.lightsUntil = this.t + 4.5; this.bump(); return true; }
    if (kind === "thief") {
      if (this.thief) return false;
      const e = { type: "thief" };
      this.fire(e);
      // The race screen shows its own "who pranked you" banner, so drop the generic one.
      this.queue = this.queue.filter(q => q.type !== "thief");
      return !!this.thief;
    }
    if (kind === "boo") {
      let hit = false;
      for (const c of this.seats) if (c && !c.leaving) { c.patience = Math.max(1, c.patience - c.max * 0.15); hit = true; }
      if (hit) { this.emit("boo"); this.bump(); }
      return hit;
    }
    return false;
  }

  clearThiefFor(slot) { if (this.thief?.target === slot) this.thief = null; }

  // ---------- events ----------
  fire(e) {
    if (e.type === "lights") { this.lightsUntil = this.t + 6; this.emit("lights"); }
    if (e.type === "rush") { this.rushUntil = this.t + 8; this.emit("rush"); }
    if (e.type === "thief") {
      let target = this.tray.length ? pick(this.rng, this.tray) : null;
      if (!target) {
        const ready = this.stationIds.flatMap(id => this.stations[id].slots).filter(s => s.state === "ready");
        target = ready.length ? pick(this.rng, ready) : null;
      }
      if (!target) { e.fired = false; e.at = this.t + 3; return; } // try again soon, no warning spam
      this.thief = { target, left: 4.5, max: 4.5 };
      this.emit("thief");
    }
    this.bump();
  }

  steal() {
    const target = this.thief.target;
    this.thief = null;
    const trayIdx = this.tray.indexOf(target);
    if (trayIdx >= 0) this.tray.splice(trayIdx, 1);
    else if (target.state === "ready") Object.assign(target, emptySlot());
    else return this.bump();
    this.wasted++;
    this.combo = 0;
    this.emit("stolen");
    this.bump();
  }

  waste(slot, reason, ref) {
    Object.assign(slot, emptySlot());
    this.wasted++;
    this.combo = 0;
    this.emit("waste", { slot: ref, reason });
    this.bump();
  }

  // ---------- main loop ----------
  tick(dt) {
    if (this.over || this.paused) return;
    dt = Math.min(dt, 0.1);
    this.t += dt;

    for (const e of this.schedule) {
      if (!e.warned && this.t >= e.at - 2.5) { e.warned = true; this.emit("warn", { event: e.type }); }
      if (!e.fired && this.t >= e.at) { e.fired = true; this.fire(e); }
    }
    if (this.lightsUntil && !this.dark) { this.lightsUntil = 0; this.bump(); }
    if (this.rushUntil && !this.rushing) { this.rushUntil = 0; this.bump(); }
    if (this.thief) { this.thief.left -= dt; if (this.thief.left <= 0) this.steal(); }

    // spawn
    const free = this.seats.indexOf(null);
    if (this.spawned < this.total && free >= 0) {
      if (this.seats.every(s => !s || s.leaving)) this.nextSpawn = Math.min(this.nextSpawn, this.t + 1);
      if (this.t >= this.nextSpawn) {
        const c = this.makeCustomer();
        this.seats[free] = c;
        this.spawned++;
        this.nextSpawn = this.t + this.interval * rand(this.custRng, 0.8, 1.2) * (c.type === "king" ? 1.6 : 1);
        this.emit("arrive", { seat: free, who: c.type });
        this.bump();
      }
    }

    // customers
    for (let i = 0; i < this.seats.length; i++) {
      const c = this.seats[i];
      if (!c) continue;
      if (c.leaving) {
        c.leaveT -= dt;
        if (c.leaveT <= 0) { this.seats[i] = null; this.bump(); }
        continue;
      }
      c.patience -= dt;
      const r = c.patience / c.max;
      const mood = r > 0.5 ? "happy" : r > 0.25 ? "meh" : "angry";
      if (mood !== c.mood) { c.mood = mood; this.bump(); }
      if (c.type === "baby" && !c.changed && r < 0.55) {
        c.changed = true;
        const open = c.items.filter(it => !it.done);
        const options = this.cfg.recipes.filter(x => !open.some(it => it.recipe === x));
        if (open.length && options.length) {
          const it = pick(this.rng, open);
          it.recipe = pick(this.rng, options);
          it.changed = true;
          c.patience = Math.min(c.max, c.patience + c.max * 0.3);
          c.line = `Actually… ${RECIPES[it.recipe].name}!`;
          this.emit("changed", { seat: i, recipe: it.recipe });
          this.bump();
        }
      }
      if (c.patience <= 0) this.customerLeaves(c, false);
    }

    // stations
    const heat = this.rushing ? 2 : 1;
    for (const id of this.stationIds) {
      this.stations[id].slots.forEach((slot, idx) => this.updateSlot(id, idx, slot, dt, heat));
    }

    if ((this.spawned >= this.total && this.seats.every(s => !s)) || this.t >= this.time) this.finish();
  }

  updateSlot(st, idx, slot, dt, heat) {
    const ref = `${st}:${idx}`;
    const R = RECIPES[slot.recipe] || null;
    if (slot.state === "cooking") {
      if (R.mini === "flip" && slot.window > 0) {
        slot.window -= dt;
        if (slot.window <= 0) this.waste(slot, "floated", ref);
        return;
      }
      slot.progress += (dt * heat) / this.cookTime(st, slot.recipe);
      if (R.mini === "flip" && !slot.flipped && slot.progress >= 0.45) {
        slot.progress = 0.45;
        slot.window = FLIP_WINDOW;
        this.emit("flipReady", { slot: ref });
        this.bump();
      }
      if (R.mini === "shake") {
        const inWin = !slot.shaken && slot.progress >= SHAKE_WINDOW[0] && slot.progress <= SHAKE_WINDOW[1];
        if (inWin !== slot.inWindow) { slot.inWindow = inWin; this.bump(); }
      }
      if (R.mini === "stir") {
        slot.stir += dt / STIR_TIME;
        if (slot.stir >= 1) return this.waste(slot, "monster", ref);
        const need = slot.stir > STIR_ZONE;
        if (need !== slot.needStir) { slot.needStir = need; this.bump(); }
        slot.perfect = true;
      }
      if (slot.progress >= 1) {
        slot.state = "ready";
        slot.inWindow = false;
        slot.needStir = false;
        slot.fresh = R.burn ? R.burn * this.freshMul : Infinity;
        slot.freshMax = slot.fresh;
        if (slot.recipe === "burger" && slot.perfect) this.stat("perfect_burger");
        if (slot.recipe === "fries" && slot.perfect) this.stat("perfect_fries");
        this.emit("ready", { slot: ref, perfect: slot.perfect });
        this.bump();
      }
    } else if (slot.state === "filling") {
      slot.progress += dt / R.fill;
      if (slot.progress >= 1) this.waste(slot, "spilled", ref);
    } else if (slot.state === "ready" && slot.fresh !== Infinity) {
      slot.fresh -= dt;
      if (slot.fresh <= 0) {
        slot.state = "burnt";
        this.clearThiefFor(slot);
        this.wasted++;
        this.combo = 0;
        this.emit("waste", { slot: ref, reason: "burnt" });
        this.bump();
      }
    }
    if (slot.state === "ready" && slot.recipe === "shake" && slot.perfect && !slot.counted) {
      slot.counted = true;
      this.stat("perfect_shake");
    }
  }

  finish() {
    if (this.over) return;
    for (const c of this.seats) if (c && !c.leaving) { this.lost++; c.leaving = "angry"; }
    this.over = true;
    const c = this.cfg;
    const s1 = this.served >= c.serve && (!c.boss || this.bossServed);
    const s2 = s1 && this.coins >= c.coins;
    const s3 = s2 && this.lost === 0 && this.wasted === 0;
    this.stars = s3 ? 3 : s2 ? 2 : s1 ? 1 : 0;
    this.stats.coins = this.coins;
    this.stats.bestCombo = this.bestCombo;
    this.stats.clean = this.stars > 0 && this.wasted === 0 ? 1 : 0;
    this.stats.three = this.stars === 3 ? 1 : 0;
    this.emit("over");
    this.bump();
  }
}

export function starGoals(cfg) {
  return [
    cfg.boss ? `Serve the Ghost King and ${cfg.serve} customers in total` : `Serve ${cfg.serve} of ${cfg.customers} customers`,
    `Earn ${cfg.coins} coins`,
    `Earn ${cfg.coins} coins, lose no customers and waste no food`
  ];
}
