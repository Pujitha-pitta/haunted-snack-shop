// Persistent progress in localStorage. Every access is guarded so the game
// still runs (in memory only) when storage is blocked.
import { QUEST_POOL } from "./data.js";

const KEY = "hss-save-v2";
export let storageOk = true;

export function defaultSave() {
  return {
    v: 2,
    coins: 0,
    levels: {},          // { [index]: { stars, best, combo } }
    upgrades: {},        // { [upgradeKey]: tier }
    book: {},            // { [customerType]: { seen, served } }
    daily: { date: "", quests: [] },
    login: { last: "", streak: 0, claimed: "" },
    settings: { sound: true },
    totals: { served: 0, perfect: 0, levels: 0 },
    crown: false
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw);
    const base = defaultSave();
    return { ...base, ...data,
      daily: { ...base.daily, ...data.daily },
      login: { ...base.login, ...data.login },
      settings: { ...base.settings, ...data.settings },
      totals: { ...base.totals, ...data.totals } };
  } catch {
    storageOk = false;
    return defaultSave();
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function unlockedCount(save) {
  // Level i is playable when level i-1 has at least one star.
  let n = 1;
  while (save.levels[n - 1]?.stars > 0) n++;
  return n;
}

export function totalStars(save) {
  return Object.values(save.levels).reduce((s, l) => s + (l.stars || 0), 0);
}

function hash(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Make sure today's three quests exist. Returns true if they were regenerated.
export function ensureDaily(save) {
  const date = today();
  const valid = save.daily.quests.length && save.daily.quests.every(q => Number.isFinite(q.n) && q.n > 0);
  if (save.daily.date === date && valid) return false;
  const reached = unlockedCount(save);
  const pool = QUEST_POOL.filter(q => !q.level || q.level <= reached);
  let seed = hash(date);
  const quests = [];
  const used = new Set();
  while (quests.length < 3 && used.size < pool.length) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const q = pool[seed % pool.length];
    if (used.has(q.id)) continue;
    used.add(q.id);
    const n = q.n[(seed >>> 8) % q.n.length];
    quests.push({ id: q.id, n, progress: 0, claimed: false });
  }
  save.daily = { date, quests };
  return true;
}

// Returns the login reward available today (0 if already claimed).
export function loginReward(save) {
  const date = today();
  if (save.login.claimed === date) return 0;
  const streak = save.login.last === today(-1) ? save.login.streak + 1 : save.login.last === date ? save.login.streak : 1;
  return 20 + 10 * Math.min(streak, 7);
}

export function claimLogin(save) {
  const date = today();
  const amount = loginReward(save);
  if (!amount) return 0;
  save.login.streak = save.login.last === today(-1) ? save.login.streak + 1 : save.login.last === date ? save.login.streak : 1;
  save.login.last = date;
  save.login.claimed = date;
  save.coins += amount;
  return amount;
}

// Apply one finished level's stats to today's quests.
export function applyQuestStats(save, stats) {
  ensureDaily(save);
  const done = [];
  for (const quest of save.daily.quests) {
    const def = QUEST_POOL.find(q => q.id === quest.id);
    if (!def || quest.claimed) continue;
    const before = quest.progress;
    const value = stats[def.stat] || 0;
    quest.progress = def.max ? Math.max(quest.progress, value) : quest.progress + value;
    quest.progress = Math.min(quest.progress, quest.n);
    if (before < quest.n && quest.progress >= quest.n) done.push(def.text.replace("{n}", quest.n));
  }
  return done;
}
