export const ORDER_DECK = [
  {
    ghost: "Captain Crumble",
    icon: "⚓",
    request: "One Moonlit Seafoam, please—extra bubbles, and make it sweet!",
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
    request: "Could I have Lavender Moon Pudding? Something gentle and floral, please. No heat!",
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
    request: "One Ectoplasm Jelly! Make it wobbly, sweet, and bright green!",
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
    request: "Dreamdust Cake, please—warm and soft, with just a tiny pinch of spice.",
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
    request: "Sugar-Crackle Bites, please! Crunchy and sweet to soothe my throat.",
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
    request: "A Silk-Ribbon Truffle, served neatly on a plate, if you please.",
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
  ["Tilly Tidepool", "🧜‍♀️", "Moonlit Seafoam, please! Make it bubbly and extra sweet."],
  ["Fern the Night Owl", "🦉", "Lavender Moon Pudding, please. Soft, floral, and not spicy."],
  ["Dr. Greenbean", "🧟", "Ectoplasm Jelly! I want it wobbly, sugary, and green."],
  ["Dozy the Dragon", "🐲", "Dreamdust Cake before bed, please—warm with just a little spice."],
  ["Banshee Betty", "🎤", "Sugar-Crackle Bites, please. I need something crunchy and sweet."],
  ["Count Crouton", "🧛", "One neat Silk-Ribbon Truffle on a plate, please. Nothing messy."]
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

