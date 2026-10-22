"use client";

import Link from "next/link";
import FishPhoto from "./FishPhoto";
import HarbourInsights from "./HarbourInsights";
import { FISH, availableKg, getFish, offersFor, priceHistory, priceOf, useMarket } from "@/lib/catalog";
import ai from "@/lib/ai-insights.json";
import { rupees } from "@/lib/format";

// AI Insights: a market summary and smart picks written by Google Gemini from today's
// listings (scripts/ai-insights.mts), plus live numbers worked out in the app.
export default function AiInsights() {
  const market = useMarket();
  const cards = FISH.map((fish) => {
    const offers = offersFor(fish.key, market);
    const best = offers[0];
    return { fish, offers, best, price: best ? priceOf(best, market) : 0, kg: availableKg(fish.key, market) };
  });

  // Biggest moves against each fish's weekly average.
  const movers = cards
    .filter((c) => c.best)
    .map((c) => {
      // The boat's own price (before any evening deal), so it matches the AI summary.
      const own = c.best!.price;
      const week = priceHistory(c.fish.key, own);
      const avg = week.slice(0, -1).reduce((s, v) => s + v, 0) / 6;
      return { ...c, change: Math.round(((own - avg) / avg) * 100) };
    })
    .sort((a, b) => a.change - b.change);
  const drops = movers.filter((m) => m.change < 0).slice(0, 3);
  const rises = movers.filter((m) => m.change > 0).reverse().slice(0, 3);

  const written = new Date(ai.generatedAt).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  });

  return (
    <div className="pad page-in">
      <header className="ai-head">
        <span className="ai-badge" aria-hidden>
          ✨
        </span>
        <div>
          <h1 className="page-title">AI Insights</h1>
          <p className="muted small">What&apos;s worth buying today, explained</p>
        </div>
      </header>

      <section className="ai-card">
        <p className="ai-kicker">Today&apos;s market in a minute</p>
        <h2 className="ai-headline">{ai.headline}</h2>
        <p className="ai-summary">{ai.summary}</p>
        <p className="ai-by">
          Written by Google Gemini ({ai.model.replace("google/", "")}) from this morning&apos;s prices · {written} · demo data
        </p>
      </section>

      <h2 className="h3">Smart picks</h2>
      <div className="picks">
        {ai.picks.map((p, i) => {
          const fish = getFish(p.fishKey)!;
          const card = cards.find((c) => c.fish.key === p.fishKey);
          return (
            <Link key={p.label} href={`/fish/${fish.key}`} className="pick" style={{ "--i": i } as React.CSSProperties}>
              <FishPhoto fish={fish} sizes="120px" className="pick-photo" />
              <div>
                <p className="pick-label">{p.label}</p>
                <p className="pick-name">
                  {fish.name} <span className="kn">{fish.kn}</span>
                </p>
                <p className="pick-reason">{p.reason}</p>
                {card?.best && <p className="pick-price">{rupees(card.price)}/kg now</p>}
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="h3">What the AI noticed</h2>
      <ul className="ai-list">
        {ai.insights.map((it, i) => (
          <li key={it.title} style={{ "--i": i } as React.CSSProperties}>
            <Link href={`/fish/${it.fishKey}`}>
              <span className="ai-emoji" aria-hidden>
                {it.emoji}
              </span>
              <span>
                <strong>{it.title}</strong>
                <span>{it.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="tip-card ai-tip">
        <strong>💡 Tip of the day</strong>
        <p>{ai.tip}</p>
      </div>

      <HarbourInsights cards={cards} />

      <h2 className="h3">Price movers this week</h2>
      <div className="movers">
        <div>
          <p className="movers-title down">▼ Cheaper than usual</p>
          {drops.map((m) => (
            <Link key={m.fish.key} href={`/fish/${m.fish.key}`} className="mover">
              <span>{m.fish.name}</span>
              <strong className="down">{m.change}%</strong>
            </Link>
          ))}
        </div>
        <div>
          <p className="movers-title up">▲ Dearer than usual</p>
          {rises.length === 0 && <p className="muted small">None today</p>}
          {rises.map((m) => (
            <Link key={m.fish.key} href={`/fish/${m.fish.key}`} className="mover">
              <span>{m.fish.name}</span>
              <strong className="up">+{m.change}%</strong>
            </Link>
          ))}
        </div>
      </div>
      <p className="demo-note">Compared with each fish&apos;s average over the last 6 days · demo data</p>
    </div>
  );
}
