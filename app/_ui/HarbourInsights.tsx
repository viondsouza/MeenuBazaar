"use client";

import Link from "next/link";
import type { Fish, Listing } from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

type Card = { fish: Fish; offers: Listing[]; best?: Listing; price: number; kg: number };

const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// A quick read of today's market, worked out from the live listings.
export default function HarbourInsights({ cards }: { cards: Card[] }) {
  const onSale = cards.filter((c) => c.best);
  if (onSale.length === 0) return null;

  // Compare the boats' own prices with last time (the evening deal is on top of this).
  const cheaper = onSale.filter((c) => c.best!.price < c.best!.lastPrice).length;
  const dearer = onSale.filter((c) => c.best!.price > c.best!.lastPrice).length;
  const evening = onSale.some((c) => c.price < c.best!.price);
  const bestValue = [...onSale].sort((a, b) => a.price - b.price)[0];
  const freshest = [...onSale].sort((a, b) => b.best!.landed.localeCompare(a.best!.landed))[0];
  const plenty = [...onSale].sort((a, b) => b.kg - a.kg)[0];
  const totalKg = onSale.reduce((s, c) => s + c.kg, 0);

  const items = [
    { icon: "📉", label: "Cheaper than last time", value: `${cheaper} of ${onSale.length} fish`, note: evening ? "plus 10% evening deal" : dearer ? `${dearer} a little dearer` : "none dearer", href: "/prices" },
    { icon: "💰", label: "Best value", value: `${bestValue.fish.name} ${rupees(bestValue.price)}/kg`, note: bestValue.fish.english, href: `/fish/${bestValue.fish.key}` },
    { icon: "🕕", label: "Freshest catch", value: freshest.fish.name, note: `landed ${time12(freshest.best!.landed)}`, href: `/fish/${freshest.fish.key}` },
    { icon: "🐟", label: "Plenty today", value: plenty.fish.name, note: `${kgText(plenty.kg)} of ${kgText(Math.round(totalKg))} on sale`, href: `/fish/${plenty.fish.key}` },
  ];

  return (
    <section className="insights" aria-labelledby="insights-title">
      <h2 id="insights-title" className="insights-title">
        Today at the harbour
      </h2>
      <ul>
        {items.map((it, i) => (
          <li key={it.label} style={{ "--i": i } as React.CSSProperties}>
            <Link href={it.href}>
              <span className="insight-icon" aria-hidden>
                {it.icon}
              </span>
              <span className="insight-label">{it.label}</span>
              <strong>{it.value}</strong>
              <span className="insight-note">{it.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
