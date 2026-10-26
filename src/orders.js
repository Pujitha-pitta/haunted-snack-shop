export const ORDER_DECK = [
  {
    ghost: "Captain Crumble",
    icon: "⚓",
    request: "One Moonlit Seafoam, please—extra bubbles, and make it sweet!",
    answer: "seafoam",
    clues: [
      "This ghost misses somewhere quiet and underwater.",
      "Their last favorite taste was sweet.",
      "They want something light, cool, and foamy.",
      "A little sparkle would make this customer feel at home.",
      "They sailed for years and hated anything spicy.",
      "Their favorite color was pale blue.",
      "They always ordered dessert after dinner.",
      "They miss bubbles rising to the surface."
    ],
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
    clues: [
      "The customer was happiest among flowers and herbs.",
      "They remember a soft, earthy smell.",
      "Please avoid anything spicy or fiery.",
      "A warm, milky treat would feel comforting.",
      "They used to grow lavender beside their cottage.",
      "They want a snack that feels like a calm evening.",
      "Sweetness is welcome, but keep it subtle.",
      "They were a gardener who loved moonlit walks."
    ],
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
    clues: [
      "The professor was famous for strange experiments.",
      "A wobble would make this customer laugh.",
      "They like playful, sugary surprises.",
      "A vivid green color would be a bonus.",
      "They once tried to invent dessert that could walk.",
      "They are not looking for anything baked in a pie tin.",
      "They like the oddest thing on the menu.",
      "Their laboratory was full of bubbling flasks."
    ],
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
    clues: [
      "This customer wants a bedtime treat.",
      "Warm milk helps them relax.",
      "A delicate spice is better than a fiery one.",
      "They like cake, especially when sleepy.",
      "The dragon's favorite bedtime story had cinnamon clouds.",
      "They want something soft and sweet.",
      "Too much heat keeps them awake.",
      "They breathe tiny puffs of smoke when they yawn."
    ],
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
    clues: [
      "The customer has a very loud job.",
      "They want a satisfying crunch.",
      "A sweet glaze would be lovely.",
      "They need a snack they can munch between wails.",
      "They used to steal sugar cookies from the pantry.",
      "A soft pudding would not do the trick.",
      "They love the sound of a good crackle.",
      "They are a banshee, but they tip generously."
    ],
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
    clues: [
      "The customer thinks every meal is a royal event.",
      "Presentation matters almost as much as taste.",
      "They prefer something neat and delicate.",
      "They like rich, creamy desserts.",
      "They always bring their own embroidered napkin.",
      "They do not want anything that drips or splatters.",
      "A silver serving plate would impress them.",
      "They have very dramatic opinions about pudding."
    ],
    options: [
      { id: "silk", name: "Silk-Ribbon Truffle", icon: "🍬", ingredients: ["Moonmilk", "Ectoplasm"], cost: { moonmilk: 1, ectoplasm: 1 } },
      { id: "crackle", name: "Sugar-Crackle Bites", icon: "🍪", ingredients: ["Sugar", "Star spice"], cost: { sugar: 1, spice: 1 } },
      { id: "ember", name: "Ember-Pepper Pie", icon: "🥧", ingredients: ["Sugar", "Star spice"], cost: { sugar: 1, spice: 1 } }
    ],
    restock: "ectoplasm"
  }
];

export const PANTRY_NAMES = { moonmilk: "Moonmilk", sugar: "Sugar", ectoplasm: "Ectoplasm", spice: "Star spice" };

export function makeDeck() {
  return [...ORDER_DECK].sort(() => Math.random() - 0.5).slice(0, 3);
}

