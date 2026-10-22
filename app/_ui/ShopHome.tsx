"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import FishPhoto from "./FishPhoto";
import GradeSeal from "./GradeSeal";
import HeartButton from "./HeartButton";
import { AreaSelect, LangToggle, Wordmark } from "./bits";
import { CheckIcon, PlusIcon, SearchIcon } from "../icons";
import { addToCart } from "@/lib/cart";
import { useFavs } from "@/lib/favs";
import { usePrefs } from "@/lib/prefs";
import { DISHES, LISTINGS, cooksAs, kgLeft, useSold, type Group, type Listing } from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

const CATEGORIES: { value: Group | "all"; label: string; kn: string; photo: string }[] = [
  { value: "all", label: "All", kn: "ಎಲ್ಲಾ", photo: "bhutai" },
  { value: "fish", label: "Fish", kn: "ಮೀನು", photo: "maanji" },
  { value: "prawns", label: "Prawns", kn: "ಎಟ್ಟಿ", photo: "tiger-etti" },
  { value: "shellfish", label: "Crab & more", kn: "ಏಡಿ", photo: "denji" },
];

type Sort = "fresh" | "low" | "high";

export const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const DEALS = LISTINGS.filter((l) => l.price < l.lastPrice).sort((a, b) => (b.lastPrice - b.price) / b.lastPrice - (a.lastPrice - a.price) / a.lastPrice);

export default function ShopHome() {
  const sold = useSold();
  const favs = useFavs();
  const { lang } = usePrefs();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group | "all">("all");
  const [dish, setDish] = useState<string>("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("fresh");
  const [added, setAdded] = useState<string | null>(null);
  const kn = lang === "kn";

  const q = query.trim().toLowerCase();
  const shown = LISTINGS.filter(
    (l) =>
      (group === "all" || l.fish.group === group) &&
      (!dish || cooksAs(l.fish, dish)) &&
      (!savedOnly || favs.includes(l.fish.key)) &&
      (!q || [l.fish.name, l.fish.english, l.fish.kn, l.boat.name, l.boat.harbour, ...l.fish.bestFor].some((s) => s.toLowerCase().includes(q))),
  ).sort((a, b) => {
    const outA = kgLeft(a, sold) <= 0 ? 1 : 0;
    const outB = kgLeft(b, sold) <= 0 ? 1 : 0;
    if (outA !== outB) return outA - outB;
    if (sort === "low") return a.price - b.price;
    if (sort === "high") return b.price - a.price;
    return b.landed.localeCompare(a.landed);
  });

  function quickAdd(l: Listing) {
    addToCart(
      { listingId: l.id, fishKey: l.fish.key, fishName: l.fish.name, fishKn: l.fish.kn, boat: l.boat.name, harbour: l.boat.harbour, pricePerKg: l.price, kg: 1, cut: "whole" },
      kgLeft(l, sold),
    );
    setAdded(l.id);
    setTimeout(() => setAdded((cur) => (cur === l.id ? null : cur)), 1800);
  }

  function clearFilters() {
    setQuery("");
    setGroup("all");
    setDish("");
    setSavedOnly(false);
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

      <section className="hero">
        <Image src="/fish/harbour.jpg" alt="Colourful fishing boats at Mangaluru harbour" fill priority sizes="520px" className="hero-img" />
        <div className="hero-shade" />
        <div className="hero-body">
          <p className="hero-kicker">{kn ? "ಇಂದಿನ ತಾಜಾ ಮೀನು" : "Today's catch · Mangaluru coast"}</p>
          <h1 className="hero-title">{kn ? "ದೋಣಿಯಿಂದ ನೇರವಾಗಿ ನಿಮ್ಮ ಮನೆಗೆ" : "From the boat to your kitchen, on ice"}</h1>
          <p className="hero-sub">
            {kn
              ? "ಮಂಗಳೂರು, ಮಲ್ಪೆ ಮತ್ತು ಗಂಗೊಳ್ಳಿಯ ದೋಣಿಗಳಿಂದ ಇಂದು ಬೆಳಿಗ್ಗೆ ಬಂದ ಮೀನು."
              : `${LISTINGS.length} fresh catches landed this morning at Mangaluru, Malpe & Gangolli.`}
          </p>
          <a href="#catch" className="btn btn-coral hero-btn">
            {kn ? "ಮೀನು ನೋಡಿ" : "Shop today's catch"}
          </a>
        </div>
        <svg className="wave" viewBox="0 0 520 40" preserveAspectRatio="none" aria-hidden>
          <path d="M0,22 C70,6 140,38 220,22 C300,6 380,36 460,20 C490,14 510,16 520,18 L520,40 L0,40 Z" />
        </svg>
      </section>

      <div className="wrap">
        <ul className="trust" aria-label="Why MeenuBazaar">
          <li>
            <span className="trust-icon">⚓</span>
            <span>
              <strong>Direct from boats</strong>
              <small>No middlemen</small>
            </span>
          </li>
          <li>
            <span className="trust-icon">✓</span>
            <span>
              <strong>Quality checked</strong>
              <small>Graded at harbour</small>
            </span>
          </li>
          <li>
            <span className="trust-icon">❄</span>
            <span>
              <strong>Packed on ice</strong>
              <small>Fresh to your door</small>
            </span>
          </li>
        </ul>

        <div className="cats" role="group" aria-label="Categories">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`cat${group === c.value ? " cat-on" : ""}`}
              aria-pressed={group === c.value}
              onClick={() => setGroup(c.value)}
            >
              <span className="cat-photo">
                <Image src={`/fish/${c.photo}.jpg`} alt="" fill sizes="72px" />
              </span>
              <span className={kn ? "kn" : ""}>{kn ? c.kn : c.label}</span>
            </button>
          ))}
        </div>

        {DEALS.length > 0 && group === "all" && !dish && !savedOnly && !q && (
          <section aria-labelledby="deals-title">
            <div className="section-row">
              <h2 id="deals-title" className="h2">
                {kn ? "ಇಂದಿನ ಕಡಿಮೆ ದರ" : "Today's price drops"}
              </h2>
              <Link href="/prices" className="link">
                {kn ? "ಎಲ್ಲಾ ದರಗಳು" : "Compare prices"}
              </Link>
            </div>
            <div className="deals">
              {DEALS.map((l) => (
                <Link key={l.id} href={`/fish/${l.id}`} className="deal">
                  <FishPhoto fish={l.fish} sizes="160px" className="deal-photo" />
                  <span className="deal-off">−{Math.round(((l.lastPrice - l.price) / l.lastPrice) * 100)}%</span>
                  <span className="deal-name">{kn ? <span className="kn">{l.fish.kn}</span> : l.fish.name}</span>
                  <span className="deal-price">
                    {rupees(l.price)}
                    <s>{rupees(l.lastPrice)}</s>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section id="catch" aria-labelledby="catch-title" className="catch">
          <div className="section-row">
            <h2 id="catch-title" className="h2">
              {kn ? "ಈಗ ಬಂದ ಮೀನು" : "Fresh catch"}
            </h2>
            <select className="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="fresh">Freshest first</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>

          <label className="search">
            <SearchIcon size={18} />
            <span className="sr-only">Search</span>
            <input
              type="search"
              placeholder={kn ? "ಮೀನು ಹುಡುಕಿ: ಬಂಗುಡೆ, ಅಂಜಲ್…" : "Search fish, dish or boat…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className="chips" role="group" aria-label="Cooking for">
            <span className="chips-label">Cooking</span>
            {DISHES.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip${dish === d ? " chip-on" : ""}`}
                aria-pressed={dish === d}
                onClick={() => setDish(dish === d ? "" : d)}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              className={`chip chip-heart${savedOnly ? " chip-on" : ""}`}
              aria-pressed={savedOnly}
              onClick={() => setSavedOnly(!savedOnly)}
            >
              ♥ Saved{favs.length ? ` (${favs.length})` : ""}
            </button>
          </div>

          {shown.length === 0 && (
            <div className="empty">
              <p className="empty-title">{savedOnly && favs.length === 0 ? "No saved fish yet" : "Nothing matches"}</p>
              <p>{savedOnly && favs.length === 0 ? "Tap ♥ on any fish to save it here." : "Try another fish, dish or filter."}</p>
              <button type="button" className="link-btn" onClick={clearFilters}>
                Show all fish
              </button>
            </div>
          )}

          <ul className="grid">
            {shown.map((l) => {
              const left = kgLeft(l, sold);
              const out = left <= 0;
              const drop = l.price < l.lastPrice;
              return (
                <li key={l.id} className={`tile${out ? " tile-out" : ""}`}>
                  <Link href={`/fish/${l.id}`} className="tile-link">
                    <div className="tile-media">
                      <FishPhoto fish={l.fish} sizes="(max-width: 520px) 50vw, 260px" />
                      {l.grade && (
                        <span className="tile-seal">
                          <GradeSeal grade={l.grade} size={46} />
                        </span>
                      )}
                      {drop && <span className="tile-tag">Price drop</span>}
                      {out && <span className="tile-sold">Sold out</span>}
                    </div>
                    <div className="tile-body">
                      <h3 className="tile-name">
                        {kn ? <span className="kn">{l.fish.kn}</span> : l.fish.name}
                        <span className={`tile-alt${kn ? "" : " kn"}`}>{kn ? l.fish.name : l.fish.kn}</span>
                      </h3>
                      <p className="tile-sub">{l.fish.english}</p>
                      <p className="tile-boat">
                        ⚓ {l.boat.name} · {l.boat.harbour.replace("Mangaluru ", "")}
                      </p>
                      <p className="tile-meta">
                        Landed {time12(l.landed)} · ★ {l.boat.rating.toFixed(1)}
                      </p>
                      <p className="tile-price">
                        <strong>{rupees(l.price)}</strong>
                        <span>/kg</span>
                      </p>
                      <p className={`tile-left${left < 10 ? " low" : ""}`}>{out ? "Sold out today" : `${kgText(left)} left`}</p>
                    </div>
                  </Link>
                  <HeartButton fishKey={l.fish.key} name={l.fish.name} className="tile-heart" />
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

        <footer className="foot">
          <p>
            <strong>MeenuBazaar</strong> · Fresh fish from Mangaluru, Malpe &amp; Gangolli boats
          </p>
          <p>
            Demo store with sample prices and stock · <Link href="/credits">Photo credits</Link>
          </p>
        </footer>
      </div>

      {added && (
        <div className="toast" role="status">
          Added 1 kg to your cart · <Link href="/cart">View cart</Link>
        </div>
      )}
    </>
  );
}
