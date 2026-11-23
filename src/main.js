import "./game.css";
import { boot } from "./game/ui.js";

// Old co-op invite links pointed at /?room=CODE. Send them to the party page.
const room = new URLSearchParams(location.search).get("room");
if (room) location.replace("/party.html?room=" + encodeURIComponent(room));
else boot();
