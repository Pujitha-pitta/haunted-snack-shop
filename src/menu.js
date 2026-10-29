export const MENU = {
  burger: { name: "Ghost Burger", icon: "🍔", station: "grill", seconds: 5 },
  fries: { name: "Witch Fries", icon: "🍟", station: "fryer", seconds: 4 },
  shake: { name: "Phantom Shake", icon: "🥤", station: "mixer", seconds: 3 },
  pie: { name: "Moon Pie", icon: "🥧", station: "oven", seconds: 6 }
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

