export const ORDER_DECK = [
  {
    ghost: "Captain Crumble",
    icon: "⚓",
    request: "I'm craving something pale and sweet with lots of tiny bubbles, like a fizzy moonlit drink.",
    answer: "seafoam",
    options: [
      { id: "seafoam", name: "Moonlit Seafoam", icon: "🫧", ingredients: ["Moonmilk", "Sugar"], cost: { moonmilk: 1, sugar: 1 } },
      { id: "ember", name: "Ember-Pepper Pie", icon: "🥧", ingredients: ["Sugar", "Star spice"], cost: { sugar: 1, spice: 1 } },
      { id: "jelly", name: "Ectoplasm Jelly", icon: "🟢", ingredients: ["Ectoplasm", "Sugar"], cost: { ectoplasm: 1, sugar: 1 } }
    ],
    restock: "moonmilk"
  },
  {
    ghost: "Mabel the Moon Gardener",
    icon: "🌙",
    request: "I'd love a cool, creamy treat with a gentle garden-flower scent. Keep it mild, please.",
    answer: "garden",
    options: [
      { id: "garden", name: "Lavender Moon Pudding", icon: "🍮", ingredients: ["Moonmilk", "Star spice"], cost: { moonmilk: 1, spice: 1 } },
      { id: "spark", name: "Sparkplug Popcorn", icon: "🍿", ingredients: ["Star spice", "Sugar"], cost: { spice: 1, sugar: 1 } },
      { id: "jelly", name: "Ectoplasm Jelly", icon: "🟢", ingredients: ["Ectoplasm", "Sugar"], cost: { ectoplasm: 1, sugar: 1 } }
    ],
    restock: "spice"
  },
  {
    ghost: "Professor Picklewick",
    icon: "🧪",
    request: "Surprise me with a bright green, sugary treat that jiggles when I tap the plate!",
    answer: "jelly",
    options: [
      { id: "jelly", name: "Ectoplasm Jelly", icon: "🟢", ingredients: ["Ectoplasm", "Sugar"], cost: { ectoplasm: 1, sugar: 1 } },
      { id: "seafoam", name: "Moonlit Seafoam", icon: "🫧", ingredients: ["Moonmilk", "Sugar"], cost: { moonmilk: 1, sugar: 1 } },
      { id: "garden", name: "Lavender Moon Pudding", icon: "🍮", ingredients: ["Moonmilk", "Star spice"], cost: { moonmilk: 1, spice: 1 } }
    ],
    restock: "ectoplasm"
  },
  {
    ghost: "The Sleepy Dragon",
    icon: "🐉",
    request: "A warm, soft baked treat to help me drift off, with just a tiny bit of sparkle.",
    answer: "dreamcake",
    options: [
      { id: "dreamcake", name: "Dreamdust Cake", icon: "🍰", ingredients: ["Moonmilk", "Star spice"], cost: { moonmilk: 1, spice: 1 } },
      { id: "ember", name: "Ember-Pepper Pie", icon: "🥧", ingredients: ["Sugar", "Star spice"], cost: { sugar: 1, spice: 1 } },
      { id: "seafoam", name: "Moonlit Seafoam", icon: "🫧", ingredients: ["Moonmilk", "Sugar"], cost: { moonmilk: 1, sugar: 1 } }
    ],
    restock: "moonmilk"
  },
  {
    ghost: "Auntie Banshee",
    icon: "👻",
    request: "I need a crunchy, sweet bite with a little magical snap. Nothing soft or wobbly!",
    answer: "crackle",
    options: [
      { id: "crackle", name: "Sugar-Crackle Bites", icon: "🍪", ingredients: ["Sugar", "Star spice"], cost: { sugar: 1, spice: 1 } },
      { id: "garden", name: "Lavender Moon Pudding", icon: "🍮", ingredients: ["Moonmilk", "Star spice"], cost: { moonmilk: 1, spice: 1 } },
      { id: "jelly", name: "Ectoplasm Jelly", icon: "🟢", ingredients: ["Ectoplasm", "Sugar"], cost: { ectoplasm: 1, sugar: 1 } }
    ],
    restock: "sugar"
  },
  {
    ghost: "Baron von Napkin",
    icon: "🧛",
    request: "Something smooth and elegant, a tiny sweet I can eat neatly from a little plate.",
    answer: "silk",
    options: [
      { id: "silk", name: "Silk-Ribbon Truffle", icon: "🍬", ingredients: ["Moonmilk", "Ectoplasm"], cost: { moonmilk: 1, ectoplasm: 1 } },
      { id: "crackle", name: "Sugar-Crackle Bites", icon: "🍪", ingredients: ["Sugar", "Star spice"], cost: { sugar: 1, spice: 1 } },
      { id: "ember", name: "Ember-Pepper Pie", icon: "🥧", ingredients: ["Sugar", "Star spice"], cost: { sugar: 1, spice: 1 } }
    ],
    restock: "ectoplasm"
  }
];

const EXTRA_CUSTOMERS = [
  ["Tilly Tidepool", "🧜‍♀️", "I'm craving something pale and sweet with lots of tiny bubbles, like a fizzy moonlit drink."],
  ["Fern the Night Owl", "🦉", "I'd love a cool, creamy treat with a gentle garden-flower scent. Keep it mild, please."],
  ["Dr. Greenbean", "🧟", "Surprise me with a bright green, sugary treat that jiggles when I tap the plate!"],
  ["Dozy the Dragon", "🐲", "A warm, soft baked treat to help me drift off, with just a tiny bit of sparkle."],
  ["Banshee Betty", "🎤", "I need a crunchy, sweet bite with a little magical snap. Nothing soft or wobbly!"],
  ["Count Crouton", "🧛", "Something smooth and elegant, a tiny sweet I can eat neatly from a little plate."]
];

ORDER_DECK.push(...EXTRA_CUSTOMERS.map(([ghost, icon, request], index) => ({
  ...ORDER_DECK[index],
  ghost,
  icon,
  request
})));

const NEW_DISHES = {
  moonpie: { name: "Moonbeam Hand Pie", icon: "🥟", ingredients: ["Moonmilk", "Sugar"], cost: { moonmilk: 1, sugar: 1 } },
  spooktea: { name: "Wispberry Tea", icon: "🫖", ingredients: ["Ectoplasm", "Star spice"], cost: { ectoplasm: 1, spice: 1 } },
  starpop: { name: "Comet Popcorn", icon: "🍿", ingredients: ["Moonmilk", "Star spice"], cost: { moonmilk: 1, spice: 1 } },
  ectotart: { name: "Ectoplasm Tartlet", icon: "🧁", ingredients: ["Ectoplasm", "Sugar"], cost: { ectoplasm: 1, sugar: 1 } }
};

const snack = (id) => ({ id, ...NEW_DISHES[id] });
const familiar = (id) => ORDER_DECK.find((order) => order.options.some((option) => option.id === id)).options.find((option) => option.id === id);

ORDER_DECK.push(
  {
    ghost: "Madame Mallow", icon: "🦇",
    request: "A little golden pocket pastry, warm from the oven, with a creamy filling and a sweet dusting.",
    answer: "moonpie", options: [snack("moonpie"), familiar("seafoam"), familiar("silk")], restock: "sugar"
  },
  {
    ghost: "The Tea Wraith", icon: "🫖",
    request: "Please steep a steaming, herbal cup with a deep forest color and a gentle sparkle.",
    answer: "spooktea", options: [snack("spooktea"), familiar("jelly"), familiar("garden")], restock: "ectoplasm"
  },
  {
    ghost: "Comet the Cat", icon: "🐈‍⬛",
    request: "I heard a tiny snack popping in the kettle! Make it crisp, warm, and dusted with stardust.",
    answer: "starpop", options: [snack("starpop"), familiar("crackle"), familiar("ember")], restock: "spice"
  },
  {
    ghost: "Cousin Curdle", icon: "🧛‍♀️",
    request: "A tiny tart with a smooth green filling, baked in the oven and topped with a sweet glaze.",
    answer: "ectotart", options: [snack("ectotart"), familiar("dreamcake"), snack("moonpie")], restock: "sugar"
  }
);

export const PANTRY_NAMES = { moonmilk: "Moonmilk", sugar: "Sugar", ectoplasm: "Ectoplasm", spice: "Star spice" };

// Each dish is assembled from pantry goods, then prepared at a station and finished.
// The dish names stay hidden during play; only the customer clue and kitchen actions show.
export const PREP_RECIPES = {
  seafoam: { ingredients: ["moonmilk", "sugar"], station: "mixer", finish: "fizz" },
  ember: { ingredients: ["sugar", "spice"], station: "oven", finish: "bake" },
  jelly: { ingredients: ["ectoplasm", "sugar"], station: "stove", finish: "chill" },
  garden: { ingredients: ["moonmilk", "spice"], station: "stove", finish: "steep" },
  spark: { ingredients: ["sugar", "spice"], station: "kettle", finish: "pop" },
  dreamcake: { ingredients: ["moonmilk", "spice"], station: "oven", finish: "dust" },
  crackle: { ingredients: ["sugar", "spice"], station: "oven", finish: "crunch" },
  silk: { ingredients: ["moonmilk", "ectoplasm"], station: "mixer", finish: "dip" }
  ,moonpie: { ingredients: ["moonmilk", "sugar"], station: "oven", finish: "bake" }
  ,spooktea: { ingredients: ["ectoplasm", "spice"], station: "kettle", finish: "steep" }
  ,starpop: { ingredients: ["moonmilk", "spice"], station: "kettle", finish: "pop" }
  ,ectotart: { ingredients: ["ectoplasm", "sugar"], station: "oven", finish: "dip" }
};

export function makeDeck() {
  return [...ORDER_DECK].sort(() => Math.random() - 0.5).slice(0, 9);
}

