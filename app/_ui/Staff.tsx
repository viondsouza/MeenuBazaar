"use client";

import { useState } from "react";
import { TopBar } from "./bits";
import { FishThumb } from "./FishPhoto";
import {
  CUT_LABEL, LISTINGS, isLive, priceWarning, resetDemo, setOps, stockOf, useMarket, useOrders,
} from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

type Tab = "listings" | "packing" | "delivery";

// For MeenuBazaar staff: approve or hold listings, correct weights after the harbour
// checker weighs the catch, and see what each boat must pack and each rider must deliver.
export default function Staff() {
  const market = useMarket();
  const orders = useOrders();
  const [tab, setTab] = useState<Tab>("listings");

  const held = LISTINGS.filter((l) => !isLive(l, market));
  const flagged = LISTINGS.filter((l) => priceWarning(l) && !market.ops.approved[l.id] && !market.ops.held[l.id]);
  const liveKg = LISTINGS.filter((l) => isLive(l, market)).reduce((s, l) => s + stockOf(l, market), 0);
  const revenue = orders.reduce((s, o) => s + o.total, 0);

  // What each boat has to pack, from every order.
  const packing = new Map<string, { code: string; slot: string; fish: string; cut: string; kg: number }[]>();
  for (const o of orders) {
    for (const line of o.lines) {
      for (const p of line.parts) {
        const list = packing.get(p.boat) ?? [];
        list.push({ code: o.code, slot: `${o.slot.day} ${o.slot.label}`, fish: line.fishName, cut: CUT_LABEL[line.cut], kg: p.kg });
        packing.set(p.boat, list);
      }
    }
  }

  // Delivery runs: orders grouped by slot.
  const runs = new Map<string, typeof orders>();
  for (const o of orders) {
    const k = `${o.slot.day} · ${o.slot.label}`;
    runs.set(k, [...(runs.get(k) ?? []), o]);
  }

  const setHeld = (id: string, value: boolean) =>
    setOps((o) => ({ ...o, held: { ...o.held, [id]: value }, approved: value ? o.approved : { ...o.approved, [id]: true } }));
  const setWeight = (id: string, kg: number) => setOps((o) => ({ ...o, kg: { ...o.kg, [id]: kg } }));

  return (
    <div className="pad page-in">
      <TopBar title="Staff" sub="Today at the harbour · demo" />

      <div className="stats">
        <div>
          <strong>{LISTINGS.length - held.length}</strong>
          <span>listings live</span>
        </div>
        <div>
          <strong>{kgText(Math.round(liveKg))}</strong>
          <span>on sale</span>
        </div>
        <div>
          <strong>{orders.length}</strong>
          <span>orders</span>
        </div>
        <div>
          <strong>{rupees(revenue)}</strong>
          <span>to collect</span>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="alert-card">
          <p className="alert-title">⚠️ Held automatically for a price check</p>
          {flagged.map((l) => (
            <div key={l.id} className="alert-row">
              <p>
                <strong>
                  {l.fish.name} · {l.boat.name}
                </strong>
                <span>{priceWarning(l)}. Maybe they meant ₹{l.price * 10}?</span>
              </p>
              <div className="alert-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setHeld(l.id, true)}>
                  Keep on hold
                </button>
                <button type="button" className="btn btn-coral btn-sm" onClick={() => setHeld(l.id, false)}>
                  Approve anyway
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="tabs" role="tablist">
        {(["listings", "packing", "delivery"] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`tab-btn${tab === t ? " tab-btn-on" : ""}`} onClick={() => setTab(t)}>
            {t === "listings" ? "Listings" : t === "packing" ? "Packing by boat" : "Delivery runs"}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        <ul className="staff-list">
          {LISTINGS.map((l) => {
            const live = isLive(l, market);
            return (
              <li key={l.id} className={live ? "" : "is-held"}>
                <FishThumb fishKey={l.fish.key} />
                <div className="staff-info">
                  <p>
                    <strong>{l.fish.name}</strong> · {l.boat.name}
                  </p>
                  <p className="muted small">
                    {rupees(l.price)}/kg · {kgText(stockOf(l, market))} left{priceWarning(l) ? " · price warning" : ""}
                  </p>
                  <label className="weigh">
                    Weighed kg
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={market.ops.kg[l.id] ?? l.kg}
                      onChange={(e) => setWeight(l.id, Math.max(0, Number(e.target.value)))}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className={`status-toggle${live ? " on" : ""}`}
                  aria-pressed={live}
                  onClick={() => setHeld(l.id, live)}
                >
                  {live ? "Live" : "On hold"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "packing" && (
        <div className="staff-groups">
          {packing.size === 0 && <p className="muted">No orders yet. Place an order in the shop to see packing lists here.</p>}
          {[...packing.entries()].map(([boat, list]) => (
            <div key={boat} className="panel">
              <h2 className="h3 tight">⚓ {boat}</h2>
              <ul className="pack-list">
                {list.map((p, i) => (
                  <li key={i}>
                    <span>
                      <strong>{kgText(p.kg)}</strong> {p.fish} · {p.cut}
                    </span>
                    <span className="muted small">
                      {p.code} · {p.slot}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === "delivery" && (
        <div className="staff-groups">
          {runs.size === 0 && <p className="muted">No deliveries yet.</p>}
          {[...runs.entries()].map(([slot, list]) => (
            <div key={slot} className="panel">
              <h2 className="h3 tight">🛵 {slot}</h2>
              <ul className="pack-list">
                {list.map((o) => (
                  <li key={o.code}>
                    <span>
                      <strong>{o.area}</strong> · {o.name}
                    </span>
                    <span className="muted small">
                      {o.code} · collect {rupees(o.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn-outline btn-wide reset"
        onClick={() => {
          if (window.confirm("Reset the demo? Stock goes back to full and all demo orders are removed.")) resetDemo();
        }}
      >
        Reset demo
      </button>
    </div>
  );
}
