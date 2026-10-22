"use client";

// Demo store data: the fish, boats and today's catch shown in the shop.
// This is sample data for the demo. Later the catch will come from boat owners via chat
// (see supabase/ and n8n/), and this file will be replaced by live listings.
import { useSyncExternalStore } from "react";
import { createStore } from "./store";
import type { CartItem, Cut } from "./cart";

export type Group = "fish" | "prawns" | "shellfish";

export type Fish = {
  key: string;
  name: string;
  kn: string;
  english: string;
  group: Group;
  about: string;
  bestFor: string[]; // dishes it's best for
  serves: string; // per kg
  pieces: string; // per kg
  cleanYield: number; // % of the weight left after cleaning
  photo: { fit?: "cover" | "contain"; pos?: string; bg?: string }; // how to frame /fish/<key>.jpg
};

export type Boat = { id: string; name: string; harbour: string; type: string; rating: number };

export type Listing = {
  id: string;
  fish: Fish;
  boat: Boat;
  price: number; // ₹ per kg today
  lastPrice: number; // ₹ per kg last time this boat listed it
  kg: number; // kg landed for sale today
  landed: string; // "05:45"
  checked: boolean; // freshness checked at the harbour
  grade: "A" | "B" | null; // quality grade from the harbour check
};

export const FISH: Fish[] = [
  { key: "bangude", name: "Bangude", kn: "ಬಂಗುಡೆ", english: "Indian mackerel", group: "fish", about: "Mangaluru's favourite for fry and curry. 6–8 fish per kg.",
    bestFor: ["Fry", "Curry", "Tawa"], serves: "3–4 people", pieces: "6–8 fish", cleanYield: 70, photo: { fit: "contain", bg: "#f4f4f2" } },
  { key: "bhutai", name: "Bhutai", kn: "ಬೂತಾಯಿ", english: "Oil sardine", group: "fish", about: "Small, rich and full of flavour. Best as rava fry. 12–15 fish per kg.",
    bestFor: ["Rava fry", "Curry"], serves: "3–4 people", pieces: "12–15 fish", cleanYield: 65, photo: {} },
  { key: "anjal", name: "Anjal", kn: "ಅಂಜಲ್", english: "Seer fish", group: "fish", about: "Firm, boneless steaks. The king of fish fry.",
    bestFor: ["Fry", "Tawa", "Curry"], serves: "4 people", pieces: "8–10 steaks", cleanYield: 80, photo: { fit: "contain", bg: "#ffffff" } },
  { key: "maanji", name: "Maanji", kn: "ಮಾಂಜಿ", english: "White pomfret", group: "fish", about: "Soft, mild white fish. Great tawa fried or in gassi. 3–4 fish per kg.",
    bestFor: ["Tawa fry", "Gassi"], serves: "3–4 people", pieces: "3–4 fish", cleanYield: 70, photo: {} },
  { key: "kappu-maanji", name: "Kappu Maanji", kn: "ಕಪ್ಪು ಮಾಂಜಿ", english: "Black pomfret", group: "fish", about: "Meatier than white pomfret, great for masala fry.",
    bestFor: ["Masala fry", "Curry"], serves: "3–4 people", pieces: "2–3 fish", cleanYield: 70, photo: {} },
  { key: "kane", name: "Kane", kn: "ಕಾಣೆ", english: "Ladyfish", group: "fish", about: "Delicate and sweet. A local favourite for fry.",
    bestFor: ["Fry"], serves: "3 people", pieces: "8–10 fish", cleanYield: 65, photo: { fit: "contain", bg: "#000000" } },
  { key: "balchatte", name: "Balchatte", kn: "ಬಾಳೆ ಮೀನು", english: "Ribbon fish", group: "fish", about: "Long and silvery. Cut into pieces for fry or curry.",
    bestFor: ["Fry", "Curry"], serves: "3–4 people", pieces: "1–2 fish, cut in pieces", cleanYield: 70, photo: {} },
  { key: "kedar", name: "Kedar", kn: "ಕೇದರ್", english: "Tuna", group: "fish", about: "Big, meaty fish. Sold in steaks for curry and sukka.",
    bestFor: ["Curry", "Sukka"], serves: "4 people", pieces: "8–10 steaks", cleanYield: 75, photo: { fit: "contain", bg: "#cfd0cc" } },
  { key: "modhe", name: "Modhe", kn: "ಮೊದೆ", english: "Mullet", group: "fish", about: "Mild river-mouth fish, good for curry.",
    bestFor: ["Curry", "Fry"], serves: "3 people", pieces: "3–4 fish", cleanYield: 65, photo: {} },
  { key: "etti", name: "Etti", kn: "ಎಟ್ಟಿ", english: "Prawns", group: "prawns", about: "Medium white prawns for sukka, ghee roast and pulao.",
    bestFor: ["Sukka", "Ghee roast", "Pulao"], serves: "3–4 people", pieces: "40–50 prawns", cleanYield: 55, photo: {} },
  { key: "tiger-etti", name: "Tiger Etti", kn: "ಟೈಗರ್ ಎಟ್ಟಿ", english: "Tiger prawns", group: "prawns", about: "Large striped prawns. Perfect for tandoori and butter garlic.",
    bestFor: ["Tandoori", "Butter garlic"], serves: "3 people", pieces: "15–20 prawns", cleanYield: 60, photo: {} },
  { key: "denji", name: "Denji", kn: "ಏಡಿ", english: "Crab", group: "shellfish", about: "Live mud crabs for crab gassi and pepper fry.",
    bestFor: ["Gassi", "Pepper fry"], serves: "2–3 people", pieces: "3–4 crabs", cleanYield: 40, photo: { pos: "center 60%" } },
  { key: "bondas", name: "Bondas", kn: "ಬೊಂಡಾಸ್", english: "Squid", group: "shellfish", about: "Tender squid rings for butter garlic and pepper fry.",
    bestFor: ["Butter garlic", "Pepper fry"], serves: "3–4 people", pieces: "8–10 squid", cleanYield: 75, photo: {} },
  { key: "marvai", name: "Marvai", kn: "ಮರ್ವಾಯಿ", english: "Clams", group: "shellfish", about: "Fresh clams for marvai sukka. Cleaned on request.",
    bestFor: ["Sukka"], serves: "3 people", pieces: "60–80 clams", cleanYield: 30, photo: {} },
];

const BOATS: Record<string, Boat> = {
  durga: { id: "durga", name: "Sri Durga Prasad", harbour: "Mangaluru Bunder", type: "Trawler", rating: 4.7 },
  lakshmi: { id: "lakshmi", name: "Matsya Lakshmi", harbour: "Malpe", type: "Purse seiner", rating: 4.5 },
  rahman: { id: "rahman", name: "Al-Rahman", harbour: "Gangolli", type: "Gillnet boat", rating: 4.6 },
  sagar: { id: "sagar", name: "Sagar Rani", harbour: "Mangaluru Bunder", type: "Trawler", rating: 4.4 },
  hanuman: { id: "hanuman", name: "Jai Hanuman", harbour: "Malpe", type: "Gillnet boat", rating: 4.8 },
};

const fish = (key: string) => FISH.find((f) => f.key === key)!;
const L = (id: string, f: string, b: string, price: number, lastPrice: number, kg: number, landed: string, checked: boolean): Listing => ({
  id, fish: fish(f), boat: BOATS[b], price, lastPrice, kg, landed, checked,
  grade: checked ? (["kane-durga", "modhe-sagar", "marvai-hanuman"].includes(id) ? "B" : "A") : null,
});

export const LISTINGS: Listing[] = [
  L("bangude-durga", "bangude", "durga", 220, 240, 120, "06:10", true),
  L("bangude-lakshmi", "bangude", "lakshmi", 210, 210, 300, "05:40", true),
  L("bangude-sagar", "bangude", "sagar", 235, 230, 60, "06:30", false),
  L("bhutai-lakshmi", "bhutai", "lakshmi", 160, 190, 400, "05:20", true),
  L("bhutai-durga", "bhutai", "durga", 170, 180, 150, "06:10", true),
  L("anjal-rahman", "anjal", "rahman", 950, 900, 25, "05:55", true),
  L("anjal-durga", "anjal", "durga", 980, 980, 12, "06:10", true),
  L("maanji-rahman", "maanji", "rahman", 1100, 1150, 18, "05:55", true),
  L("maanji-durga", "maanji", "durga", 1150, 1150, 10, "06:10", true),
  L("kappu-maanji-hanuman", "kappu-maanji", "hanuman", 650, 620, 22, "06:20", true),
  L("kane-durga", "kane", "durga", 420, 420, 35, "06:10", true),
  L("kane-sagar", "kane", "sagar", 400, 430, 15, "06:30", false),
  L("balchatte-sagar", "balchatte", "sagar", 260, 250, 70, "06:30", true),
  L("kedar-hanuman", "kedar", "hanuman", 300, 320, 90, "06:20", true),
  L("kedar-lakshmi", "kedar", "lakshmi", 30, 310, 60, "05:40", true), // a typo: ₹30 instead of ₹300
  L("modhe-sagar", "modhe", "sagar", 380, 360, 20, "06:30", true),
  L("etti-rahman", "etti", "rahman", 520, 560, 30, "05:55", true),
  L("etti-durga", "etti", "durga", 540, 540, 25, "06:10", true),
  L("tiger-etti-hanuman", "tiger-etti", "hanuman", 850, 800, 12, "06:20", true),
  L("tiger-etti-rahman", "tiger-etti", "rahman", 880, 880, 8, "05:55", true),
  L("denji-sagar", "denji", "sagar", 420, 450, 20, "06:30", true),
  L("denji-rahman", "denji", "rahman", 440, 440, 12, "05:55", true),
  L("bondas-lakshmi", "bondas", "lakshmi", 380, 400, 45, "05:40", true),
  L("marvai-hanuman", "marvai", "hanuman", 140, 140, 50, "06:20", true),
];

// Today's harbour reference rate per kg (what the auction is paying). Used to catch typos:
// a boat price far from this is held for staff to check instead of going live.
export const REFERENCE_RATE: Record<string, number> = {
  bangude: 220, bhutai: 170, anjal: 950, maanji: 1120, "kappu-maanji": 640, kane: 410, balchatte: 255,
  kedar: 305, modhe: 370, etti: 530, "tiger-etti": 860, denji: 430, bondas: 390, marvai: 140,
};

export const HARBOURS = ["Mangaluru Bunder", "Malpe", "Gangolli"];
export const getListing = (id: string) => LISTINGS.find((l) => l.id === id);
export const getFish = (key: string) => FISH.find((f) => f.key === key);

// ─── What changes during the day (saved in this browser for the demo) ───────

// kg sold per listing, so stock goes down after an order.
const sold = createStore<Record<string, number>>("meenubazaar-demo-sold", {});
export const useSold = sold.use;

// Staff decisions: listings approved despite a price warning, listings put on hold,
// and weights corrected after the harbour checker weighs the catch.
export type Ops = { approved: Record<string, boolean>; held: Record<string, boolean>; kg: Record<string, number> };
const ops = createStore<Ops>("meenubazaar-demo-ops", { approved: {}, held: {}, kg: {} });
export const useOps = ops.use;
export const setOps = ops.set;

// The hour in India (e.g. 16.5 = 4:30 PM), ticking every 30 s. null while the page loads.
const hourListeners = new Set<() => void>();
let hourTimer: ReturnType<typeof setInterval> | null = null;
let hourNow: number | null = null;
function readHour() {
  const d = new Date();
  const h = Number(d.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" })) % 24;
  const m = Number(d.toLocaleString("en-US", { minute: "numeric", timeZone: "Asia/Kolkata" }));
  return h + m / 60;
}
function subscribeHour(l: () => void) {
  hourListeners.add(l);
  if (!hourTimer) {
    hourNow = readHour();
    hourTimer = setInterval(() => {
      hourNow = readHour();
      hourListeners.forEach((fn) => fn());
    }, 30000);
  }
  return () => {
    hourListeners.delete(l);
    if (hourListeners.size === 0 && hourTimer) {
      clearInterval(hourTimer);
      hourTimer = null;
    }
  };
}
export function useHour(): number | null {
  return useSyncExternalStore(subscribeHour, () => hourNow ?? (hourNow = readHour()), () => null);
}

// Everything the market rules need, in one bundle.
export type Market = { sold: Record<string, number>; ops: Ops; hour: number | null };
export function useMarket(): Market {
  return { sold: useSold(), ops: useOps(), hour: useHour() };
}

// ─── Market rules ───────────────────────────────────────────────────────────

export const EVENING_DEAL = { fromHour: 16, off: 0.1 }; // 10% off everything after 4 PM

export const isEvening = (m: Market) => m.hour !== null && m.hour >= EVENING_DEAL.fromHour;

// A price far from the harbour rate (under 60% or over 160%) is probably a typo.
export function priceWarning(l: Listing) {
  const ref = REFERENCE_RATE[l.fish.key];
  if (!ref) return null;
  if (l.price < ref * 0.6 || l.price > ref * 1.6) return `₹${l.price}/kg is far from today's harbour rate of ₹${ref}/kg`;
  return null;
}

// Is this listing on sale? Held by staff, or held automatically for a price check, means no.
export function isLive(l: Listing, m: Market) {
  if (m.ops.held[l.id]) return false;
  if (priceWarning(l) && !m.ops.approved[l.id]) return false;
  return true;
}

export const stockOf = (l: Listing, m: Market) => Math.max(0, (m.ops.kg[l.id] ?? l.kg) - (m.sold[l.id] ?? 0));

const round5 = (n: number) => Math.round(n / 5) * 5;
export const priceOf = (l: Listing, m: Market) => (isEvening(m) ? round5(l.price * (1 - EVENING_DEAL.off)) : l.price);

const GRADE_RANK = { A: 0, B: 1 } as const;
const gradeRank = (l: Listing) => (l.grade ? GRADE_RANK[l.grade] : 2);

// The boats selling this fish right now, best first: lowest price, then better grade,
// then the freshest landing, then the best rated boat.
export function offersFor(fishKey: string, m: Market) {
  return LISTINGS.filter((l) => l.fish.key === fishKey && isLive(l, m) && stockOf(l, m) >= 0.5).sort(
    (a, b) =>
      priceOf(a, m) - priceOf(b, m) ||
      gradeRank(a) - gradeRank(b) ||
      b.landed.localeCompare(a.landed) ||
      b.boat.rating - a.boat.rating,
  );
}

// Why the first offer was chosen, in words.
export function whyBest(offers: Listing[], m: Market) {
  const [best, next] = offers;
  if (!best) return "";
  if (!next) return "Only boat with this fish today";
  if (priceOf(best, m) < priceOf(next, m)) return "Lowest price today";
  if (gradeRank(best) < gradeRank(next)) return "Same price, better quality grade";
  if (best.landed > next.landed) return "Same price, landed most recently";
  return "Same price, best rated boat";
}

export type Part = { listing: Listing; kg: number; price: number };

// Fills an order for kg of a fish from the best boats in turn (or from one chosen boat).
// e.g. 30 kg → 20 kg from the cheapest boat, 10 kg from the next.
export function allocate(fishKey: string, kg: number, m: Market, listingId?: string) {
  const pool = listingId ? offersFor(fishKey, m).filter((l) => l.id === listingId) : offersFor(fishKey, m);
  const parts: Part[] = [];
  let need = kg;
  for (const l of pool) {
    if (need <= 0) break;
    const take = Math.min(need, Math.floor(stockOf(l, m) * 2) / 2); // whole half-kilos
    if (take <= 0) continue;
    parts.push({ listing: l, kg: take, price: priceOf(l, m) });
    need -= take;
  }
  const fishTotal = parts.reduce((s, p) => s + p.kg * p.price, 0);
  const filled = kg - need;
  return { parts, filled, short: Math.max(0, need), fishTotal, avg: filled ? fishTotal / filled : 0 };
}

export const availableKg = (fishKey: string, m: Market, listingId?: string) =>
  offersFor(fishKey, m)
    .filter((l) => !listingId || l.id === listingId)
    .reduce((s, l) => s + Math.floor(stockOf(l, m) * 2) / 2, 0);

// ─── Fees and delivery slots ────────────────────────────────────────────────

export const FEES = { cleaned: 30, fry: 40, delivery: 40, freeDeliveryOver: 1000, platform: 10 };

export function cutFee(cut: Cut, kg: number) {
  return cut === "cleaned" ? kg * FEES.cleaned : cut === "fry" ? kg * FEES.fry : 0;
}

export const CUT_LABEL: Record<Cut, string> = { whole: "Whole", cleaned: "Cleaned", fry: "Fry cut" };

export type Slot = { id: string; day: string; label: string; startHour: number; full: boolean };

// Today's and tomorrow's slots in India time. A slot can be booked up to 2 hours before
// it starts. (Demo: one slot is shown as full, as it would be on a busy morning.)
export function deliverySlots(hour: number): Slot[] {
  const times = [
    { label: "8–10 AM", startHour: 8 },
    { label: "11 AM–1 PM", startHour: 11 },
    { label: "5–7 PM", startHour: 17 },
  ];
  const slots: Slot[] = [];
  for (const day of ["Today", "Tomorrow"]) {
    for (const t of times) {
      if (day === "Today" && t.startHour - hour < 2) continue;
      slots.push({ id: `${day}-${t.startHour}`, day, label: t.label, startHour: t.startHour, full: day === "Tomorrow" && t.startHour === 11 });
    }
  }
  return slots;
}

// ─── Bills and orders ───────────────────────────────────────────────────────

export type OrderLine = {
  fishKey: string;
  fishName: string;
  fishKn: string;
  cut: Cut;
  kg: number;
  parts: { listingId: string; boat: string; harbour: string; kg: number; price: number }[];
  fishTotal: number;
  cutting: number;
};

export type Order = {
  code: string;
  placedAt: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  slot: { day: string; label: string };
  lines: OrderLine[];
  fish: number;
  cutting: number;
  delivery: number;
  platform: number;
  total: number;
};

const orders = createStore<Order[]>("meenubazaar-demo-orders-v2", []);
export const useOrders = orders.use;

// Works out every cart line against today's boats. Lines for the same fish share its stock.
export function priceCart(items: CartItem[], m: Market) {
  const running: Market = { ...m, sold: { ...m.sold } };
  const lines = items.map((it) => {
    const a = allocate(it.fishKey, it.kg, running, it.listingId);
    for (const p of a.parts) running.sold[p.listing.id] = (running.sold[p.listing.id] ?? 0) + p.kg;
    return { item: it, ...a, cutting: cutFee(it.cut, a.filled) };
  });
  const fish = lines.reduce((s, l) => s + l.fishTotal, 0);
  const cutting = lines.reduce((s, l) => s + l.cutting, 0);
  const delivery = items.length === 0 || fish >= FEES.freeDeliveryOver ? 0 : FEES.delivery;
  const platform = items.length ? FEES.platform : 0;
  return { lines, fish, cutting, delivery, platform, total: fish + cutting + delivery + platform };
}

export type PlaceResult = { ok: true; code: string } | { ok: false; message: string };

// Checks there is enough of every fish, splits each line across boats, saves the order and
// takes the kg off those boats. Either the whole order goes through or nothing changes.
export function placeOrder(
  details: Pick<Order, "name" | "phone" | "address" | "area" | "slot">,
  items: CartItem[],
  m: Market,
): PlaceResult {
  const bill = priceCart(items, { ...m, sold: sold.get() });
  const short = bill.lines.find((l) => l.short > 0);
  if (short) {
    return { ok: false, message: `Only ${short.filled} kg of ${short.item.fishName} is available now. Please lower the quantity.` };
  }
  const code = "MB-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const order: Order = {
    ...details,
    code,
    placedAt: new Date().toISOString(),
    lines: bill.lines.map((l) => ({
      fishKey: l.item.fishKey,
      fishName: l.item.fishName,
      fishKn: l.item.fishKn,
      cut: l.item.cut,
      kg: l.filled,
      parts: l.parts.map((p) => ({ listingId: p.listing.id, boat: p.listing.boat.name, harbour: p.listing.boat.harbour, kg: p.kg, price: p.price })),
      fishTotal: l.fishTotal,
      cutting: l.cutting,
    })),
    fish: bill.fish,
    cutting: bill.cutting,
    delivery: bill.delivery,
    platform: bill.platform,
    total: bill.total,
  };
  sold.set((s) => {
    const next = { ...s };
    for (const l of bill.lines) for (const p of l.parts) next[p.listing.id] = (next[p.listing.id] ?? 0) + p.kg;
    return next;
  });
  orders.set((list) => [order, ...list].slice(0, 30));
  return { ok: true, code };
}

// Puts the demo back to the start (full stock, no orders, no staff changes).
export function resetDemo() {
  sold.set({});
  orders.set([]);
  ops.set({ approved: {}, held: {}, kg: {} });
}

// Every cooking style used in bestFor, for the "Cooking" filter.
export const DISHES = ["Fry", "Curry", "Tawa", "Sukka", "Butter garlic", "Gassi"];
export const cooksAs = (f: Fish, dish: string) => f.bestFor.some((b) => b.toLowerCase().includes(dish.toLowerCase()));
