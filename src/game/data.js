// Static game content: recipes, stations, customers, levels, upgrades, quests.

export const RECIPES = {
  burger: { name: "Ghost Burger", icon: "🍔", raw: "🥩", station: "grill", cook: 6, burn: 5, coins: 10, mini: "flip",
    how: "Tap to flip the patty when it starts to float, or it drifts away." },
  fries: { name: "Witch Fries", icon: "🍟", raw: "🥔", station: "fryer", cook: 5, burn: 5, coins: 8, mini: "shake",
    how: "Tap the basket while it glows to shake it. A shaken basket is perfect." },
  shake: { name: "Phantom Shake", icon: "🥤", raw: "🥛", station: "mixer", fill: 3.2, coins: 8, mini: "stop",
    how: "Tap to stop the mixer inside the glowing zone. If it overflows, it spills." },
  pizza: { name: "Zombie Pizza", icon: "🍕", raw: "🫓", station: "oven", cook: 7, burn: 6, coins: 14, mini: "order",
    how: "Add the toppings in order: sauce, cheese, then eyeball. Then it bakes." },
  soup: { name: "Magic Soup", icon: "🍲", raw: "🫕", station: "cauldron", cook: 8, burn: 7, coins: 13, mini: "stir",
    how: "Tap to stir whenever it bubbles up, or it turns into a soup monster." }
};

export const TOPPINGS = [
  { id: "sauce", icon: "🍅", name: "Sauce" },
  { id: "cheese", icon: "🧀", name: "Cheese" },
  { id: "eye", icon: "👁️", name: "Eyeball" }
];

export const STATIONS = {
  grill: { name: "Haunted Grill", icon: "🍳", recipe: "burger" },
  fryer: { name: "Witch Fryer", icon: "🧺", recipe: "fries" },
  mixer: { name: "Phantom Mixer", icon: "🌀", recipe: "shake" },
  oven: { name: "Enchanted Oven", icon: "🔥", recipe: "pizza" },
  cauldron: { name: "Bubbling Cauldron", icon: "🪄", recipe: "soup" }
};
export const STATION_ORDER = ["grill", "fryer", "mixer", "oven", "cauldron"];

export const CUSTOMERS = {
  ghost: { name: "Little Boo", icon: "👻", items: [1, 2], patience: 1, firstLevel: 1,
    bio: "A polite regular who haunts the corner booth. Always says thank you, even through walls.",
    lines: ["One snack, please!", "Boo-tiful service!", "Smells spooky good!"] },
  hungry: { name: "Hungry Ghost", icon: "👻", badge: "🍴", tint: "hungry", items: [2, 3], patience: 1.2, firstLevel: 4,
    bio: "Orders two or three dishes at once. Nobody knows where the food goes.",
    lines: ["I'm SO hungry!", "Bring it all!", "Double portions!"] },
  zombie: { name: "Angry Zombie", icon: "🧟", items: [1, 2], patience: 0.62, firstLevel: 6,
    bio: "Loses patience fast. Serve quickly and the grumbling turns into a big tip.",
    lines: ["FOOD. NOW.", "Hurry uuup…", "Grrrumble!"] },
  vampire: { name: "Vampire VIP", icon: "🧛", items: [1, 2], patience: 0.95, firstLevel: 8,
    bio: "A night-life critic. Pays double when every dish is perfect.",
    lines: ["Only perfection.", "Impress me.", "Exquisite, darling."] },
  baby: { name: "Baby Phantom", icon: "👻", badge: "🍼", tint: "baby", items: [1, 2], patience: 1.05, firstLevel: 13,
    bio: "Changes its mind halfway through. Watch for the “!” bubble and give it a little more time.",
    lines: ["Wawa!", "Num num!", "Hehe!"] },
  witch: { name: "Witch Queen", icon: "🧙‍♀️", items: [1, 2], patience: 1.15, firstLevel: 14,
    bio: "Requests a secret recipe that must be made perfectly. Pays triple for it.",
    lines: ["A secret recipe…", "Perfection, please.", "Make it magical."] },
  king: { name: "Ghost King", icon: "👻", badge: "👑", tint: "king", items: [5, 5], patience: 1, firstLevel: 10, boss: true,
    bio: "Ruler of the afterlife's appetite. Arrives with a royal feast order and a countdown.",
    lines: ["A FEAST, peasant!", "Royal hunger!", "Impress your King!"] }
};

const W = (o) => o;
// serve = 1★ target, coins = 2★ target, 3★ = 2★ + no lost customers + no wasted food.
export const LEVELS = [
  W({ name: "Opening Night", recipes: ["burger"], customers: 4, serve: 3, coins: 55, time: 80, maxItems: 1,
    types: { ghost: 1 }, tutorial: true, teach: "burger",
    intro: "Ghosts want Ghost Burgers! Tap the grill, flip the patty when it floats, then tap the burger to serve." }),
  W({ name: "Fry Night", recipes: ["burger", "fries"], customers: 6, serve: 5, coins: 85, time: 95, maxItems: 1,
    types: { ghost: 1 }, tutorial: true, teach: "fries", intro: "New: Witch Fries. Shake the basket while it glows for perfect fries." }),
  W({ name: "Shake It Up", recipes: ["burger", "fries", "shake"], customers: 7, serve: 6, coins: 100, time: 100, maxItems: 1,
    types: { ghost: 1 }, tutorial: true, teach: "shake", intro: "New: Phantom Shakes. Stop the mixer in the glowing zone." }),
  W({ name: "Double Trouble", recipes: ["burger", "fries", "shake"], customers: 7, serve: 6, coins: 150, time: 110, maxItems: 2,
    types: { ghost: 2, hungry: 2 }, intro: "New: Hungry Ghosts order two dishes at once. Cook in parallel!" }),
  W({ name: "Full House", recipes: ["burger", "fries", "shake"], customers: 8, serve: 7, coins: 175, time: 120, maxItems: 2,
    types: { ghost: 1, hungry: 2 }, intro: "Busier tables tonight. Use the serving tray to hold dishes that are ready early." }),
  W({ name: "Zombie Hour", recipes: ["burger", "fries", "shake"], customers: 8, serve: 7, coins: 150, time: 115, maxItems: 2,
    types: { ghost: 2, hungry: 1, zombie: 2 }, intro: "New: Angry Zombies lose patience fast. Serve them first!" }),
  W({ name: "Lights Out", recipes: ["burger", "fries", "shake"], customers: 9, serve: 8, coins: 175, time: 125, maxItems: 2,
    types: { ghost: 2, hungry: 2, zombie: 2 }, events: [{ at: 35, type: "lights" }, { at: 85, type: "lights" }],
    intro: "New: the lights flicker out for a few seconds. Keep cooking. You'll get a warning first." }),
  W({ name: "Second Grill", recipes: ["burger", "fries", "shake"], customers: 9, serve: 8, coins: 200, time: 125, maxItems: 2,
    types: { ghost: 2, hungry: 2, zombie: 1, vampire: 2 }, gift: "grill.slot",
    intro: "New: a second grill slot, free! Vampire VIPs pay double when every dish is perfect." }),
  W({ name: "Haunted Heat", recipes: ["burger", "fries", "shake"], customers: 10, serve: 9, coins: 220, time: 135, maxItems: 2,
    types: { ghost: 1, hungry: 2, zombie: 2, vampire: 2 }, events: [{ at: 30, type: "rush" }, { at: 70, type: "lights" }, { at: 100, type: "rush" }],
    intro: "New: haunted heat makes stations cook twice as fast for a moment. Watch for burning!" }),
  W({ name: "The Ghost King", recipes: ["burger", "fries", "shake"], customers: 7, serve: 6, coins: 270, time: 150, maxItems: 2,
    types: { ghost: 2, hungry: 2, zombie: 1, vampire: 1 }, boss: true, bossAt: 2, bossTime: 80, events: [{ at: 60, type: "rush" }],
    intro: "BOSS: The Ghost King orders a five-dish feast. Serve all five before his countdown ends to earn a star." }),
  W({ name: "Pizza Panic", recipes: ["burger", "fries", "shake", "pizza"], customers: 9, serve: 7, coins: 230, time: 135, maxItems: 2,
    types: { ghost: 2, hungry: 2, zombie: 1, vampire: 1 }, teach: "pizza", events: [{ at: 50, type: "thief" }, { at: 95, type: "thief" }],
    intro: "New: Zombie Pizza (toppings in order). And watch out: a thief ghost tries to steal ready dishes. Tap it to shoo it away!" }),
  W({ name: "Cauldron Club", recipes: ["burger", "fries", "shake", "pizza", "soup"], customers: 10, serve: 8, coins: 220, time: 145, maxItems: 2,
    types: { ghost: 2, hungry: 2, zombie: 2, vampire: 1 }, teach: "soup", events: [{ at: 40, type: "lights" }, { at: 90, type: "thief" }],
    intro: "New: Magic Soup. Stir it whenever it bubbles up, or a soup monster climbs out." }),
  W({ name: "Tiny Tantrums", recipes: ["burger", "fries", "shake", "pizza", "soup"], customers: 10, serve: 8, coins: 240, time: 145, maxItems: 2,
    types: { ghost: 1, hungry: 2, zombie: 1, vampire: 1, baby: 3 }, events: [{ at: 45, type: "rush" }, { at: 95, type: "thief" }],
    intro: "New: Baby Phantoms change their order once. Watch for the “!” bubble. They give you extra time when they do." }),
  W({ name: "Secret Menu", recipes: ["burger", "fries", "shake", "pizza", "soup"], customers: 10, serve: 8, coins: 300, time: 150, maxItems: 3,
    types: { ghost: 1, hungry: 2, zombie: 1, vampire: 1, baby: 1, witch: 3 }, events: [{ at: 35, type: "lights" }, { at: 80, type: "thief" }, { at: 115, type: "rush" }],
    intro: "New: the Witch Queen orders a ✨secret recipe✨. Only a perfect dish counts, but she pays triple." }),
  W({ name: "Midnight Rush", recipes: ["burger", "fries", "shake", "pizza", "soup"], customers: 10, serve: 8, coins: 360, time: 170, maxItems: 3,
    types: { ghost: 1, hungry: 2, zombie: 2, vampire: 2, baby: 1, witch: 1 }, boss: true, bossAt: 4, bossTime: 85,
    events: [{ at: 30, type: "thief" }, { at: 60, type: "lights" }, { at: 100, type: "rush" }, { at: 135, type: "thief" }],
    reward: { coins: 300, text: "Finale bonus: +300 coins and the World 1 crown!" },
    intro: "FINALE: everything at once, and the Ghost King returns. Survive until midnight!" })
];

export const WORLDS = [
  { id: 1, name: "Haunted Snack Shop", blurb: "Burgers, fries, shakes and basic cooking.", icon: "🏚️", levels: 15 },
  { id: 2, name: "Witch's Candy Kitchen", blurb: "Magical desserts, candy combos and potions.", icon: "🍭" },
  { id: 3, name: "Vampire's Midnight Café", blurb: "Premium customers and more complex orders.", icon: "🦇" },
  { id: 4, name: "Phantom Pirate Ship", blurb: "Moving cooking stations and storm challenges.", icon: "🏴‍☠️" }
];

// Upgrades. `key` is stored in save.upgrades as a tier number.
export const UPGRADES = [
  { key: "grill.speed", group: "Kitchen", icon: "🍳", name: "Haunted Grill", desc: "Burgers cook faster.", costs: [60, 140, 260], level: 1 },
  { key: "fryer.speed", group: "Kitchen", icon: "🧺", name: "Witch Fryer", desc: "Fries cook faster.", costs: [60, 140, 260], level: 2 },
  { key: "mixer.speed", group: "Kitchen", icon: "🌀", name: "Phantom Mixer", desc: "Wider perfect zone.", costs: [60, 140, 260], level: 3 },
  { key: "grill.slot", group: "Kitchen", icon: "➕", name: "Second Grill", desc: "Cook two burgers at once.", costs: [220], level: 4 },
  { key: "fryer.slot", group: "Kitchen", icon: "➕", name: "Second Fry Basket", desc: "Fry two baskets at once.", costs: [220], level: 6 },
  { key: "mixer.slot", group: "Kitchen", icon: "➕", name: "Second Mixer", desc: "Blend two shakes at once.", costs: [220], level: 7 },
  { key: "oven.speed", group: "Kitchen", icon: "🔥", name: "Enchanted Oven", desc: "Pizza bakes faster.", costs: [90, 180, 300], level: 11 },
  { key: "oven.slot", group: "Kitchen", icon: "➕", name: "Second Oven Rack", desc: "Bake two pizzas at once.", costs: [260], level: 12 },
  { key: "cauldron.speed", group: "Kitchen", icon: "🪄", name: "Bubbling Cauldron", desc: "Soup simmers faster.", costs: [90, 180, 300], level: 12 },
  { key: "counter", group: "Serving", icon: "🍽️", name: "Ghost-proof Counter", desc: "Hold one more dish on the serving tray.", costs: [80, 160, 300], level: 2 },
  { key: "fridge", group: "Serving", icon: "🧊", name: "Magical Refrigerator", desc: "Ready food stays fresh longer before burning.", costs: [70, 150, 280], level: 3 },
  { key: "decor.pumpkins", group: "Decor", icon: "🎃", name: "Pumpkin Patch", desc: "Cozy pumpkins. Customers wait 8% longer.", costs: [120], level: 4 },
  { key: "decor.lights", group: "Decor", icon: "✨", name: "Spooky Fairy Lights", desc: "Twinkly lights. Customers wait 8% longer.", costs: [180], level: 6 },
  { key: "decor.furniture", group: "Decor", icon: "🕯️", name: "Ghost Furniture", desc: "Floating candles and chairs. Customers wait 8% longer.", costs: [260], level: 9 }
];

// Daily quests. `stat` is a counter key the engine reports at the end of each level.
export const QUEST_POOL = [
  { id: "serve", text: "Serve {n} customers", stat: "served", n: [10, 15, 20], reward: 50 },
  { id: "burgers", text: "Make {n} perfect burgers", stat: "perfect_burger", n: [4, 6, 8], reward: 50 },
  { id: "fries", text: "Make {n} perfect fries", stat: "perfect_fries", n: [3, 5], reward: 45, level: 2 },
  { id: "shakes", text: "Stop {n} shakes in the perfect zone", stat: "perfect_shake", n: [3, 5], reward: 45, level: 3 },
  { id: "clean", text: "Finish levels without wasting food", stat: "clean", n: [1, 2, 3], reward: 70 },
  { id: "combo", text: "Reach a ×{n} combo", stat: "bestCombo", n: [4, 5, 6], reward: 60, max: true },
  { id: "coins", text: "Earn {n} coins in levels", stat: "coins", n: [150, 250, 400], reward: 60 },
  { id: "stars", text: "Earn three stars on a level", stat: "three", n: [1, 2], reward: 80 },
  { id: "zombies", text: "Serve {n} Angry Zombies", stat: "served_zombie", n: [3, 5], reward: 55, level: 6 }
];
