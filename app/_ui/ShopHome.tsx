"use client";

import Link from "next/link";
import { useState } from "react";
import FishArt from "../FishArt";
import { AreaSelect, FishName, LangToggle, Wordmark } from "./bits";
import { CheckIcon, PlusIcon, SearchIcon } from "../icons";
import { addToCart } from "@/lib/cart";
import { usePrefs } from "@/lib/prefs";
import { FISH, LISTINGS, kgLeft, useSold, type Group, type Listing } from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

const CATEGORIES: { value: Group | "all"; label: string; kn: string; art: string }[] = [
  { value: "all", label: "All", kn: "ಎಲ್ಲಾ", art: "bangude" },
  { value: "fish", label: "Fish", kn: "ಮೀನು", art: "maanji" },
  { value: "prawns", label: "Prawns", kn: "ಎಟ್ಟಿ", art: "etti" },
  { value: "shellfish", label: "Crab & more", kn: "ಏಡಿ", art: "denji" },
];

type Sort = "fresh" | "low" | "high";

const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// Cheapest listing of each fish, for the "Best prices today" strip.
const BEST = FISH.map((f) =>
  LISTINGS.filter((l) => l.fish.key === f.key).sort((a, b) => a.price - b.price)[0],
).filter(Boolean) as Listing[];

export default function ShopHome() {
  const sold = useSold();
  const { lang } = usePrefs();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group | "all">("all");
  const [sort, setSort] = useState<Sort>("fresh");
  const [added, setAdded] = useState<string | null>(null);
  const kn = lang === "kn";

  const q = query.trim().toLowerCase();
  const shown = LISTINGS.filter(
    (l) =>
      (group === "all" || l.fish.group === group) &&
      (!q || [l.fish.name, l.fish.english, l.fish.kn, l.boat.name, l.boat.harbour].some((s) => s.toLowerCase().includes(q))),
  ).sort((a, b) => {
    const outA = kgLeft(a, sold) <= 0 ? 1 : 0;
    const outB = kgLeft(b, sold) <= 0 ? 1 : 0;
    if (outA !== outB) return outA - outB;
    if (sort === "low") return a.price - b.price;
    if (sort === "high") return b.price - a.price;
    return b.landed.localeCompare(a.landed);
  });

  function quickAdd(l: Listing) {
    addToCart({
      listingId: l.id,
      fishKey: l.fish.key,
      fishName: l.fish.name,
      fishKn: l.fish.kn,
      boat: l.boat.name,
      harbour: l.boat.harbour,
      pricePerKg: l.price,
      kg: 1,
      cut: "whole",
    }, kgLeft(l, sold));
    setAdded(l.id);
    setTimeout(() => setAdded((cur) => (cur === l.id ? null : cur)), 1800);
  }

  return (
    <>
      <header className="home-head">
        <div className="home-head-row">
          <Wordmark />
          <LangToggle />
        </div>
        <AreaSelect compact />
      </header>

      <div className="wrap">
        <section className="hero">
          <div>
            <p className="hero-kicker">{kn ? "ಇಂದಿನ ತಾಜಾ ಮೀನು" : "Today's catch"}</p>
            <h1 className="hero-title">
              {kn ? "ದೋಣಿಯಿಂದ ನೇರವಾಗಿ ನಿಮ್ಮ ಮನೆಗೆ" : "Fresh from the boat, straight to your home"}
            </h1>
            <p className="hero-sub">
              {kn
                ? "ಮಂಗಳೂರು, ಮಲ್ಪೆ ಮತ್ತು ಗಂಗೊಳ್ಳಿಯ ದೋಣಿಗಳಿಂದ. ನಿಮಗೆ ಬೇಕಾದಂತೆ ಸ್ವಚ್ಛಗೊಳಿಸಿ, ಐಸ್‌ನಲ್ಲಿ ಪ್ಯಾಕ್ ಮಾಡಲಾಗುತ್ತದೆ."
                : `${LISTINGS.length} catches from 5 boats at Mangaluru, Malpe & Gangolli. Cleaned the way you like, packed on ice.`}
            </p>
          </div>
          <div className="hero-art" aria-hidden>
            <FishArt kind="anjal" className="hero-fish hero-fish-1" />
            <FishArt kind="bangude" className="hero-fish hero-fish-2" />
          </div>
        </section>

        <div className="cats" role="group" aria-label="Categories">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`cat${group === c.value ? " cat-on" : ""}`}
              aria-pressed={group === c.value}
              onClick={() => setGroup(c.value)}
            >
              <span className="cat-art">
                <FishArt kind={c.art} />
              </span>
              <span className={kn ? "kn" : ""}>{kn ? c.kn : c.label}</span>
            </button>
          ))}
        </div>

        <section aria-labelledby="best-title">
          <div className="section-row">
            <h2 id="best-title" className="h2">
              {kn ? "ಇಂದಿನ ಕಡಿಮೆ ದರ" : "Best prices today"}
            </h2>
            <Link href="/prices" className="link">
              {kn ? "ಎಲ್ಲಾ ದರಗಳು" : "Compare harbours"}
            </Link>
          </div>
          <div className="rates">
            {BEST.filter((l) => group === "all" || l.fish.group === group).map((l) => {
              const move = l.price - l.lastPrice;
              return (
                <Link key={l.id} href={`/fish/${l.id}`} className="rate">
                  <span className="rate-name">
                    {kn ? <span className="kn">{l.fish.kn}</span> : l.fish.name} · {l.fish.english}
                  </span>
                  <span className="rate-price">
                    {rupees(l.price)}
                    <small>/kg</small>
                  </span>
                  <span className={`rate-move ${move > 0 ? "up" : move < 0 ? "down" : ""}`}>
                    {move < 0 ? `▼ ${rupees(-move)} cheaper` : move > 0 ? `▲ ${rupees(move)} up` : "Same as last time"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <label className="search">
          <SearchIcon size={18} />
          <span className="sr-only">Search</span>
          <input
            type="search"
            placeholder={kn ? "ಮೀನು ಹುಡುಕಿ: ಬಂಗುಡೆ, ಅಂಜಲ್…" : "Search bangude, anjal, prawns…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <section aria-labelledby="catch-title">
          <div className="section-row">
            <h2 id="catch-title" className="h2">
              {kn ? "ಈಗ ಬಂದ ಮೀನು" : "Fresh catch, just landed"}
            </h2>
            <select className="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="fresh">Freshest first</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>

          {shown.length === 0 && (
            <div className="empty">
              <p className="empty-title">Nothing matches “{query}”</p>
              <p>Try another name, like bangude, prawns or crab.</p>
            </div>
          )}

          <ul className="cards">
            {shown.map((l) => {
              const left = kgLeft(l, sold);
              const out = left <= 0;
              return (
                <li key={l.id} className={`card${out ? " card-out" : ""}`}>
                  <Link href={`/fish/${l.id}`} className="card-link">
                    <div className="art-tile">
                      <FishArt kind={l.fish.key} />
                    </div>
                    <div className="card-info">
                      <FishName name={l.fish.name} kn={l.fish.kn} as="h3" />
                      <p className="card-sub">
                        {l.fish.english} · {l.boat.name}
                      </p>
                      <p className="card-sub">
                        Landed {time12(l.landed)} at {l.boat.harbour.replace("Mangaluru ", "")}
                      </p>
                      <div className="pills">
                        <span className="pill pill-plain">★ {l.boat.rating.toFixed(1)}</span>
                        {l.checked && <span className="pill pill-teal">✓ Freshness checked</span>}
                        {l.price < l.lastPrice && <span className="pill pill-coral">Price drop</span>}
                      </div>
                      <p className="card-price">
                        <strong>{rupees(l.price)}</strong>/kg
                        <span className={left < 10 ? "low" : ""}>{out ? " · Sold out" : ` · ${kgText(left)} left`}</span>
                      </p>
                    </div>
                  </Link>
                  {!out && (
                    <button
                      type="button"
                      className={`add-btn${added === l.id ? " add-btn-done" : ""}`}
                      onClick={() => quickAdd(l)}
                      aria-label={`Add 1 kg ${l.fish.name} to cart`}
                    >
                      {added === l.id ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <p className="demo-note">Demo store · sample prices and stock for the MeenuBazaar prototype</p>
      </div>

      {added && (
        <div className="toast" role="status">
          Added 1 kg to your cart · <Link href="/cart">View cart</Link>
        </div>
      )}
    </>
  );
}
