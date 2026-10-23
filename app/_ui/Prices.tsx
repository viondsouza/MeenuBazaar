"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FishThumb } from "./FishPhoto";
import { TopBar } from "./bits";
import PriceTrend from "./PriceTrend";
import { usePrefs } from "@/lib/prefs";
import { AUCTION_RATE, FISH, isEvening, offersFor, priceHistory, priceOf, stockOf, useMarket, whyBest } from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

// Compare today's price of one fish across boats and harbours, best pick first.
export default function Prices() {
  const { lang } = usePrefs();
  const market = useMarket();
  const [fishKey, setFishKey] = useState("bangude");
  const fish = FISH.find((f) => f.key === fishKey)!;
  const rows = offersFor(fishKey, market);
  const max = Math.max(1, ...rows.map((r) => priceOf(r, market)));
  const kn = lang === "kn";
  const auction = AUCTION_RATE[fishKey];

  return (
    <div className="pad page-in">
      <TopBar title={kn ? "ಬಂದರು ದರಗಳು" : "Harbour prices"} sub="Every boat's price today, best pick first" />

      <div className="fish-picker" role="group" aria-label="Fish">
        {FISH.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`fish-chip${fishKey === f.key ? " fish-chip-on" : ""}`}
            aria-pressed={fishKey === f.key}
            onClick={() => setFishKey(f.key)}
          >
            <span className="fish-chip-photo">
              <Image src={`/fish/${f.key}.jpg`} alt="" fill sizes="64px" />
            </span>
            <span className={kn ? "kn" : ""}>{kn ? f.kn : f.name}</span>
          </button>
        ))}
      </div>

      <div className="panel" key={fishKey}>
        <div className="price-head">
          <FishThumb fishKey={fish.key} />
          <div>
            <h2 className="h3 tight">
              {fish.name} <span className="kn muted">{fish.kn}</span>
            </h2>
            <p className="muted small">
              {fish.english} · auction pays boats {rupees(auction)}/kg today
            </p>
          </div>
        </div>

        {rows[0] && <PriceTrend values={priceHistory(fish.key, priceOf(rows[0], market))} compact />}
        {rows.length === 0 && <p className="muted">No boat has {fish.name} on sale right now.</p>}
        <ul className="bars">
          {rows.map((r, i) => {
            const price = priceOf(r, market);
            const move = price - r.lastPrice;
            return (
              <li key={r.id} className="bar-item" style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/fish/${fish.key}?boat=${r.id}`} className="bar-link">
                  <div className="bar-row">
                    <span>
                      <strong>{r.boat.harbour}</strong> · {r.boat.name}
                      {i === 0 && <span className="best-pill">Best pick</span>}
                    </span>
                    <strong>{rupees(price)}</strong>
                  </div>
                  <div className="bar">
                    <span className={i === 0 ? "bar-best" : ""} style={{ width: `${(price / max) * 100}%` }} />
                  </div>
                  <p className="muted small">
                    {r.grade ? `Grade ${r.grade}` : "Not graded yet"} · {kgText(stockOf(r, market))} left ·{" "}
                    {move < 0 ? `▼ ${rupees(-move)} vs last time` : move > 0 ? `▲ ${rupees(move)} vs last time` : "same as last time"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        {rows.length > 0 && (
          <p className="tip">
            <strong>Why {rows[0].boat.name}?</strong> {whyBest(rows, market)}.
            {rows.length > 1
              ? ` Save ${rupees(priceOf(rows[rows.length - 1], market) - priceOf(rows[0], market))}/kg compared with the highest price.`
              : ""}
            {isEvening(market) ? " Evening deal prices shown." : ""}
          </p>
        )}
      </div>

      <div className="panel panel-dark">
        <p className="eyebrow">How the best pick works</p>
        <p>
          For every fish we compare all boats and pick the lowest price, then the better quality grade, then the freshest
          catch. If you order more than one boat has, your order is split across boats automatically.
        </p>
      </div>

      <p className="demo-note">Demo store · sample prices</p>
    </div>
  );
}
