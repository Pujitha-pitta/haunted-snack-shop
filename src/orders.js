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

export const PANTRY_NAMES = { moonmilk: "Moonmilk", sugar: "Sugar", ectoplasm: "Ectoplasm", spice: "Star spice" };

export function makeDeck() {
  return [...ORDER_DECK].sort(() => Math.random() - 0.5).slice(0, 9);
}

