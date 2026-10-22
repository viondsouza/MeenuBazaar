"use client";

import Link from "next/link";
import { useState } from "react";
import FishArt from "../FishArt";
import { TopBar } from "./bits";
import { usePrefs } from "@/lib/prefs";
import { FISH, LISTINGS } from "@/lib/catalog";
import { rupees } from "@/lib/format";

// Compare today's price of one fish across boats and harbours.
export default function Prices() {
  const { lang } = usePrefs();
  const [fishKey, setFishKey] = useState("bangude");
  const fish = FISH.find((f) => f.key === fishKey)!;
  const rows = LISTINGS.filter((l) => l.fish.key === fishKey).sort((a, b) => a.price - b.price);
  const max = Math.max(...rows.map((r) => r.price));
  const kn = lang === "kn";

  return (
    <div className="pad">
      <TopBar title={kn ? "ಬಂದರು ದರಗಳು" : "Harbour prices"} sub="Today's price per kg, from each boat" />

      <div className="fish-picker" role="group" aria-label="Fish">
        {FISH.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`fish-chip${fishKey === f.key ? " fish-chip-on" : ""}`}
            aria-pressed={fishKey === f.key}
            onClick={() => setFishKey(f.key)}
          >
            <span className="fish-chip-art">
              <FishArt kind={f.key} />
            </span>
            <span className={kn ? "kn" : ""}>{kn ? f.kn : f.name}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="price-head">
          <div className="art-tile art-tile-sm">
            <FishArt kind={fish.key} />
          </div>
          <div>
            <h2 className="h3 tight">
              {fish.name} <span className="kn muted">{fish.kn}</span>
            </h2>
            <p className="muted small">{fish.english}</p>
          </div>
        </div>

        <ul className="bars">
          {rows.map((r, i) => {
            const move = r.price - r.lastPrice;
            return (
              <li key={r.id}>
                <Link href={`/fish/${r.id}`} className="bar-link">
                  <div className="bar-row">
                    <span>
                      <strong>{r.boat.harbour}</strong> · {r.boat.name}
                    </span>
                    <strong>{rupees(r.price)}</strong>
                  </div>
                  <div className="bar">
                    <span className={i === 0 ? "bar-best" : ""} style={{ width: `${(r.price / max) * 100}%` }} />
                  </div>
                  <p className="muted small">
                    {move < 0 ? `▼ ${rupees(-move)} cheaper than last time` : move > 0 ? `▲ ${rupees(move)} up from last time` : "Same as last time"}
                    {i === 0 && rows.length > 1 ? " · Best price" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        {rows.length > 1 ? (
          <p className="tip">
            Best today: <strong>{rows[0].boat.name}</strong> at {rows[0].boat.harbour}, {rupees(rows[0].price)}/kg. You save{" "}
            {rupees(rows[rows.length - 1].price - rows[0].price)}/kg compared with the highest price.
          </p>
        ) : (
          <p className="tip">Only one boat has {fish.name} today.</p>
        )}
      </div>

      <div className="panel panel-dark">
        <p className="eyebrow">Why prices are fair here</p>
        <p>
          Boat owners set their own price and sell straight to you, with no auction agent or middle vendors. You see
          every boat&apos;s price side by side.
        </p>
      </div>

      <p className="demo-note">Demo store · sample prices</p>
    </div>
  );
}
