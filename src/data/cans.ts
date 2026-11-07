// Product facts come from redbull.com/in-en product pages (read Nov 2026).
// `world` is concept copy for the pitch: experience content, not product claims.
export type World = {
  name: string;
  hud: { label: string; from: number; to: number; unit: string };
  lines: [string, string, string];
  hint: string;
  scape: "earth" | "ridge" | "road" | "river" | "dusk";
};

export type Can = {
  slug: string;
  name: string;
  subtitle: string;
  blurb: string;
  color: string;
  label: string;
  liquid: [string, string];
  packshot: string;
  sizes: string[];
  facts: { name: string; value: string }[];
  warningExtra?: string;
  buy: { name: string; href: string }[];
  world: World;
};

const base = [
  { name: "Caffeine", value: "75 mg" },
  { name: "Taurine", value: "1000 mg" },
  { name: "Niacin", value: "6 mg" },
  { name: "Vitamin B6", value: "1 mg" },
];
const b2 = { name: "Vitamin B2", value: "0.5 mg" };
const b12 = { name: "Vitamin B12", value: "0.5 μg" };
const sugars = { name: "Sugars", value: "27 g" };

export const WARNING =
  "Caffeinated beverage. High caffeine: 75 mg/250 ml. Not recommended for children, pregnant or lactating women and persons sensitive to caffeine. Consume not more than 500 ml per day.";

export const CANS: Can[] = [
  {
    slug: "energy-drink",
    name: "Red Bull Energy Drink",
    subtitle: "The Original Red Bull",
    blurb:
      "Appreciated worldwide by top athletes, busy professionals, university students and travellers on long journeys.",
    color: "#14296e",
    label: "/labels/energy-drink.webp",
    liquid: ["#f26b05", "#ffcc1f"],
    packshot: "https://img.redbull.com/images/c_limit,w_4000/e_trim:0:transparent/c_limit,w_800/q_auto,f_auto/redbullcom/2026/3/20/oiyohcx4t3ylhzlnjvqn/red-bull-energy-drink",
    sizes: ["250 ml", "355 ml"],
    facts: [...base, b2, b12, sugars],
    buy: [
      { name: "Blinkit", href: "https://link.blinkit.com/b/v6qi5ovw" },
      { name: "Swiggy", href: "https://www.swiggy.com/stores/instamart/item/RUR8E3DZ69" },
      { name: "Zepto", href: "https://zepto-prod.onelink.me/tC90/yxuwnlk1" },
    ],
    world: {
      name: "The Stratosphere",
      hud: { label: "Altitude", from: 39000, to: 0, unit: "m" },
      lines: ["The edge of space.", "Nothing below but air.", "Vitalizes body and mind®."],
      hint: "Move to steer your fall",
      scape: "earth",
    },
  },
  {
    slug: "sugarfree",
    name: "Red Bull Sugarfree",
    subtitle: "Wiiings without sugar",
    blurb: "Same benefits of the original Energy Drink, without sugar.",
    color: "#22ace0",
    label: "/labels/sugarfree.webp",
    liquid: ["#9fdcff", "#f3fbff"],
    packshot: "https://img.redbull.com/images/c_limit,w_4000/e_trim:0:transparent/c_limit,w_800/q_auto,f_auto/redbullcom/2023/8/21/xxjnj0gedzaeglcj550a/red-bull-sugarfree",
    sizes: ["250 ml"],
    facts: [...base, b2, b12, { name: "Sweeteners", value: "Sucralose + Ace K" }],
    warningExtra: "Contains non-caloric sweeteners: an admixture of sucralose and acesulfame potassium.",
    buy: [
      { name: "Blinkit", href: "https://link.blinkit.com/b/dw5qn5vl" },
      { name: "Swiggy", href: "https://www.swiggy.com/stores/instamart/item/PKGH8JLDJ3" },
      { name: "Zepto", href: "https://zepto-prod.onelink.me/tC90/agi3z60d" },
    ],
    world: {
      name: "Himalayan Ice",
      hud: { label: "Wingsuit speed", from: 0, to: 220, unit: "km/h" },
      lines: ["Thin air. Clean line.", "The ridge drops away.", "Wiiings without sugar."],
      hint: "Move to carve the valley",
      scape: "ridge",
    },
  },
  {
    slug: "red-edition",
    name: "The Red Edition",
    subtitle: "Watermelon",
    blurb: "The Red Bull Red Edition offers the taste of watermelon.",
    color: "#c8102e",
    label: "/labels/red-edition.avif",
    liquid: ["#c8102e", "#ff7a6b"],
    packshot: "https://img.redbull.com/images/c_limit,w_4000/e_trim:0:transparent/c_limit,w_800/q_auto,f_auto/redbullcom/2024/5/31/eybnzphwwit6y9l3gtwx/red-bull-red-edition-image",
    sizes: ["250 ml"],
    facts: [...base, b2, b12, sugars],
    buy: [
      { name: "Blinkit", href: "https://link.blinkit.com/b/460klz56" },
      { name: "Swiggy", href: "https://www.swiggy.com/instamart/item/M9QXZYJMLV" },
      {
        name: "Zepto",
        href: "https://www.zepto.com/pn/red-bull-watermelon-energy-drink-energizing-refreshing/pvid/e391d937-e19b-40d5-ae92-34a1351d228b",
      },
    ],
    world: {
      name: "Night Circuit",
      hud: { label: "Speed", from: 0, to: 300, unit: "km/h" },
      lines: ["Lights out.", "Apex after apex.", "The taste of watermelon."],
      hint: "Scroll is your throttle",
      scape: "road",
    },
  },
  {
    slug: "green-edition",
    name: "The Green Edition",
    subtitle: "Curuba Elderflower",
    blurb: "The exotic taste of Curuba rounded off with Elderflower notes.",
    color: "#5d9e22",
    label: "/labels/green-edition.webp",
    liquid: ["#5d9e22", "#d9ff7a"],
    packshot: "https://img.redbull.com/images/c_limit,w_4000/e_trim:0:transparent/c_limit,w_800/q_auto,f_auto/redbullcom/2026/9/9/w5pdokxftfvmcayhcw74/red-bull-green-edition---image",
    sizes: ["250 ml"],
    facts: [...base, b2, b12, sugars],
    buy: [
      {
        name: "Blinkit",
        href: "https://blinkit.com/dc/?collection_uuid=636f79bf-de0d-4c3d-bef2-ff3b9e3c6c5d&short_id=ao1usdel",
      },
      {
        name: "Zepto",
        href: "https://www.zepto.com/pn/red-bull-energy-drink-ready-to-drink-beverage/pvid/0c666b3e-a810-47f1-8194-b59ff6757f5a",
      },
    ],
    world: {
      name: "Whitewater",
      hud: { label: "Current", from: 0, to: 40, unit: "km/h" },
      lines: ["The river decides.", "Paddle in.", "Curuba. Elderflower."],
      hint: "Move to dodge the rocks",
      scape: "river",
    },
  },
  {
    slug: "pink-edition",
    name: "The Pink Edition",
    subtitle: "White Peach",
    blurb: "The taste of white peach, a touch of citrus peel and floral notes.",
    color: "#e0648f",
    label: "/labels/pink-edition.webp",
    liquid: ["#f47aa8", "#ffe0c9"],
    packshot: "https://img.redbull.com/images/c_limit,w_4000/e_trim:0:transparent/c_limit,w_800/q_auto,f_auto/redbullcom/2026/1/26/fnrwphbh9enn79pm8wdh/red-bull-peach-edition-image",
    sizes: ["250 ml"],
    facts: [...base, b12, sugars],
    buy: [
      { name: "Blinkit", href: "https://link.blinkit.com/b/su2dtp2w" },
      { name: "Swiggy", href: "https://www.swiggy.com/stores/instamart/item/UO0UO043DQ" },
      { name: "Zepto", href: "https://zepto-prod.onelink.me/tC90/u0vjwkv8" },
    ],
    world: {
      name: "Golden Hour Gap",
      hud: { label: "Run-up", from: 0, to: 100, unit: "%" },
      lines: ["Dusk. One clean run.", "Commit.", "White peach, citrus peel, floral notes."],
      hint: "Scroll to land the kickflip",
      scape: "dusk",
    },
  },
];

export const getCan = (slug: string) => CANS.find((c) => c.slug === slug);
