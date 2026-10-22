"use client";

// Demo store data: the fish, boats and today's catch shown in the shop.
// This is sample data for the demo. Later the catch will come from boat owners via chat
// (see supabase/ and n8n/), and this file will be replaced by live listings.
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
};

export const FISH: Fish[] = [
  { key: "bangude", name: "Bangude", kn: "ಬಂಗುಡೆ", english: "Indian mackerel", group: "fish", about: "Mangaluru's favourite for fry and curry. 6–8 fish per kg." },
  { key: "bhutai", name: "Bhutai", kn: "ಬೂತಾಯಿ", english: "Oil sardine", group: "fish", about: "Small, rich and full of flavour. Best as rava fry. 12–15 fish per kg." },
  { key: "anjal", name: "Anjal", kn: "ಅಂಜಲ್", english: "Seer fish", group: "fish", about: "Firm, boneless steaks. The king of fish fry." },
  { key: "maanji", name: "Maanji", kn: "ಮಾಂಜಿ", english: "White pomfret", group: "fish", about: "Soft, mild white fish. Great tawa fried or in gassi. 3–4 fish per kg." },
  { key: "kappu-maanji", name: "Kappu Maanji", kn: "ಕಪ್ಪು ಮಾಂಜಿ", english: "Black pomfret", group: "fish", about: "Meatier than white pomfret, great for masala fry." },
  { key: "kane", name: "Kane", kn: "ಕಾಣೆ", english: "Ladyfish", group: "fish", about: "Delicate and sweet. A local favourite for fry." },
  { key: "balchatte", name: "Balchatte", kn: "ಬಾಳೆ ಮೀನು", english: "Ribbon fish", group: "fish", about: "Long and silvery. Cut into pieces for fry or curry." },
  { key: "kedar", name: "Kedar", kn: "ಕೇದರ್", english: "Tuna", group: "fish", about: "Big, meaty fish. Sold in steaks for curry and sukka." },
  { key: "modhe", name: "Modhe", kn: "ಮೊದೆ", english: "Mullet", group: "fish", about: "Mild river-mouth fish, good for curry." },
  { key: "etti", name: "Etti", kn: "ಎಟ್ಟಿ", english: "Prawns", group: "prawns", about: "Medium white prawns for sukka, ghee roast and pulao." },
  { key: "tiger-etti", name: "Tiger Etti", kn: "ಟೈಗರ್ ಎಟ್ಟಿ", english: "Tiger prawns", group: "prawns", about: "Large striped prawns. Perfect for tandoori and butter garlic." },
  { key: "denji", name: "Denji", kn: "ಏಡಿ", english: "Crab", group: "shellfish", about: "Live mud crabs for crab gassi and pepper fry." },
  { key: "bondas", name: "Bondas", kn: "ಬೊಂಡಾಸ್", english: "Squid", group: "shellfish", about: "Tender squid rings for butter garlic and pepper fry." },
  { key: "marvai", name: "Marvai", kn: "ಮರ್ವಾಯಿ", english: "Clams", group: "shellfish", about: "Fresh clams for marvai sukka. Cleaned on request." },
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
  L("kappu-maanji-hanuman", "kappu-maanji", "hanuman", 650, 620, 22, "06:20", true),
  L("kane-durga", "kane", "durga", 420, 420, 35, "06:10", false),
  L("balchatte-sagar", "balchatte", "sagar", 260, 250, 70, "06:30", true),
  L("kedar-hanuman", "kedar", "hanuman", 300, 320, 90, "06:20", true),
  L("modhe-sagar", "modhe", "sagar", 380, 360, 20, "06:30", false),
  L("etti-rahman", "etti", "rahman", 520, 560, 30, "05:55", true),
  L("etti-durga", "etti", "durga", 540, 540, 25, "06:10", true),
  L("tiger-etti-hanuman", "tiger-etti", "hanuman", 850, 800, 12, "06:20", true),
  L("denji-sagar", "denji", "sagar", 420, 450, 20, "06:30", true),
  L("bondas-lakshmi", "bondas", "lakshmi", 380, 400, 45, "05:40", true),
  L("marvai-hanuman", "marvai", "hanuman", 140, 140, 50, "06:20", false),
];

export const HARBOURS = ["Mangaluru Bunder", "Malpe", "Gangolli"];

// What's been sold in this browser, so stock goes down after an order (demo only).
const sold = createStore<Record<string, number>>("meenubazaar-demo-sold", {});
export const useSold = sold.use;
export const kgLeft = (l: Listing, soldMap: Record<string, number>) => Math.max(0, l.kg - (soldMap[l.id] ?? 0));
export const getListing = (id: string) => LISTINGS.find((l) => l.id === id);

// ─── Fees and delivery slots ────────────────────────────────────────────────

export const FEES = { cleaned: 30, fry: 40, delivery: 40, freeDeliveryOver: 1000, platform: 10 };

export function cutFee(cut: Cut, kg: number) {
  return cut === "cleaned" ? kg * FEES.cleaned : cut === "fry" ? kg * FEES.fry : 0;
}

export const CUT_LABEL: Record<Cut, string> = { whole: "Whole", cleaned: "Cleaned", fry: "Fry cut" };

export type Slot = { id: string; day: string; label: string; startHour: number; full: boolean };

// Today's and tomorrow's slots in India time. A slot can be booked up to 2 hours before
// it starts. (Demo: one slot is shown as full, as it would be on a busy morning.)
export function deliverySlots(now = new Date()): Slot[] {
  const hourNow = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" })) +
    Number(now.toLocaleString("en-US", { minute: "numeric", timeZone: "Asia/Kolkata" })) / 60;
  const times = [
    { label: "8–10 AM", startHour: 8 },
    { label: "11 AM–1 PM", startHour: 11 },
    { label: "5–7 PM", startHour: 17 },
  ];
  const slots: Slot[] = [];
  for (const day of ["Today", "Tomorrow"]) {
    for (const t of times) {
      if (day === "Today" && t.startHour - hourNow < 2) continue;
      slots.push({ id: `${day}-${t.startHour}`, day, label: t.label, startHour: t.startHour, full: day === "Tomorrow" && t.startHour === 11 });
    }
  }
  return slots;
}

// ─── Orders (saved in this browser for the demo) ────────────────────────────

export type Order = {
  code: string;
  placedAt: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  slot: { day: string; label: string };
  items: CartItem[];
  fish: number;
  cutting: number;
  delivery: number;
  platform: number;
  total: number;
};

const orders = createStore<Order[]>("meenubazaar-demo-orders", []);
export const useOrders = orders.use;

export function billFor(items: CartItem[]) {
  const fishTotal = items.reduce((s, i) => s + i.kg * i.pricePerKg, 0);
  const cutting = items.reduce((s, i) => s + cutFee(i.cut, i.kg), 0);
  const delivery = items.length === 0 || fishTotal >= FEES.freeDeliveryOver ? 0 : FEES.delivery;
  const platform = items.length ? FEES.platform : 0;
  return { fish: fishTotal, cutting, delivery, platform, total: fishTotal + cutting + delivery + platform };
}

export type PlaceResult = { ok: true; code: string } | { ok: false; message: string };

// Checks every item is still in stock, then saves the order and takes the kg off the shelf.
// Either the whole order goes through or nothing changes.
export function placeOrder(details: Omit<Order, "code" | "placedAt" | "fish" | "cutting" | "delivery" | "platform" | "total">): PlaceResult {
  const soldMap = sold.get();
  const need: Record<string, number> = {};
  for (const item of details.items) need[item.listingId] = (need[item.listingId] ?? 0) + item.kg;
  for (const [id, kg] of Object.entries(need)) {
    const l = getListing(id);
    if (!l) return { ok: false, message: "One of the fish is no longer on sale. Please remove it." };
    const left = kgLeft(l, soldMap);
    if (kg > left) return { ok: false, message: `Only ${left} kg of ${l.fish.name} is left. Please lower the quantity.` };
  }
  const code = "MB-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const order: Order = { ...details, code, placedAt: new Date().toISOString(), ...billFor(details.items) };
  sold.set((s) => {
    const next = { ...s };
    for (const [id, kg] of Object.entries(need)) next[id] = (next[id] ?? 0) + kg;
    return next;
  });
  orders.set((list) => [order, ...list].slice(0, 20));
  return { ok: true, code };
}

// Puts the demo stock back to full (for presenting the demo again).
export function resetDemo() {
  sold.set({});
  orders.set([]);
}
