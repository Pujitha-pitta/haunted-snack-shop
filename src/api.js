// GitHub Pages only serves static files, so game API calls go to the Cloudflare Worker there.
export const API_ORIGIN = location.hostname.endsWith("github.io") ? "https://haunted-snack-shop.nagapujitha456.workers.dev" : "";
// Folder this page is served from: "/" on Cloudflare, "/haunted-snack-shop/" on GitHub Pages.
export const BASE = location.pathname.replace(/[^/]*$/, "");
const API = API_ORIGIN + "/.netlify/functions/game";

export async function request(action, payload = {}) {
  const url = action === "get"
    ? `${API}?room=${encodeURIComponent(payload.code || "")}&player=${encodeURIComponent(payload.playerId || "")}`
    : API;
  const response = await fetch(url, {
    method: action === "get" ? "GET" : "POST",
    headers: action === "get" ? undefined : { "content-type": "application/json" },
    body: action === "get" ? undefined : JSON.stringify({ action, ...payload }),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The ghosts are having trouble. Try again.");
  return data;
}

