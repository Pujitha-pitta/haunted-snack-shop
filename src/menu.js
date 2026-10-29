export const MENU = {
  burger: { name: "Ghost Burger", icon: "🍔", station: "grill", seconds: 5, prep: ["Toast the bun", "Add ghost patty", "Top with moon cheese"] },
  fries: { name: "Witch Fries", icon: "🍟", station: "fryer", seconds: 4, prep: ["Slice the potatoes", "Drop in the fryer", "Shake on spell salt"] },
  shake: { name: "Phantom Shake", icon: "🥤", station: "mixer", seconds: 3, prep: ["Pour in moon milk", "Add ectoplasm berries", "Blend the swirl"] },
  pie: { name: "Moon Pie", icon: "🥧", station: "oven", seconds: 6, prep: ["Roll the dough", "Add pumpkin filling", "Dust with moon sugar"] }
};

export const STATIONS = {
  grill: { name: "Haunted Grill", icon: "🍳" },
  fryer: { name: "Fry Basket", icon: "🧺" },
  mixer: { name: "Ghost Mixer", icon: "🥣" },
  oven: { name: "Moon Oven", icon: "🔥" }
};

export const CUSTOMER_ORDERS = [
  { type: "Hungry Ghost", icon: "👻", items: ["burger", "fries"] },
  { type: "Vampire VIP", icon: "🧛", items: ["shake", "pie"] },
  { type: "Zombie Regular", icon: "🧟", items: ["burger", "shake"] },
  { type: "Witch on Break", icon: "🧙‍♀️", items: ["fries", "pie"] },
  { type: "Phantom Sweet-Tooth", icon: "👻", items: ["shake", "pie"] },
  { type: "Hungry Ghost", icon: "👻", items: ["burger", "fries"] },
  { type: "Vampire VIP", icon: "🧛", items: ["burger", "shake"] },
  { type: "Zombie Regular", icon: "🧟", items: ["fries", "shake"] }
];

