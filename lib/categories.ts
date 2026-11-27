/** Categories the app suggests on first use. People can add, rename, recolour and delete their own. */
export type Category = { name: string; color: string };

export const DEFAULT_CATEGORIES: Category[] = [
  { name: "Ruoka", color: "#257de0" },
  { name: "Ravintolat ja kahvilat", color: "#f47230" },
  { name: "Liikenne", color: "#00b894" },
  { name: "Koti ja talous", color: "#f2a600" },
  { name: "Terveys ja hygienia", color: "#ee7fac" },
  { name: "Vapaa-aika", color: "#008a17" },
  { name: "Alkoholi", color: "#6a4ce2" },
];
