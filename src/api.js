const API = "/.netlify/functions/game";

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

