"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import FishPhoto from "./FishPhoto";
import GradeSeal from "./GradeSeal";
import HeartButton from "./HeartButton";
import EveningBanner from "./EveningBanner";
import ai from "@/lib/ai-insights.json";
import { AreaSelect, LangToggle, Wordmark } from "./bits";
import { CheckIcon, PlusIcon, SearchIcon } from "../icons";
import { addToCart } from "@/lib/cart";
import { useFavs } from "@/lib/favs";
import { setArea, usePrefs } from "@/lib/prefs";
import { AREAS } from "@/lib/areas";
import { DISHES, FISH, availableKg, cooksAs, deliverySlots, offersFor, priceOf, useMarket, type Fish, type Group } from "@/lib/catalog";
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

export default function ShopHome() {
  const market = useMarket();
  const favs = useFavs();
  const { lang, area } = usePrefs();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group | "all">("all");
  const [dish, setDish] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("fresh");
  const [added, setAdded] = useState<string | null>(null);
  const kn = lang === "kn";

  // One card per fish, priced at its best offer right now.
  const cards = FISH.map((fish) => {
    const offers = offersFor(fish.key, market);
    const best = offers[0];
    return { fish, offers, best, price: best ? priceOf(best, market) : 0, kg: availableKg(fish.key, market) };
  });

  const deals = cards
    .filter((c) => c.best && c.price < c.best.lastPrice)
    .sort((a, b) => (b.best!.lastPrice - b.price) / b.best!.lastPrice - (a.best!.lastPrice - a.price) / a.best!.lastPrice);

  const q = query.trim().toLowerCase();
  const shown = cards
    .filter(
      ({ fish }) =>
        (group === "all" || fish.group === group) &&
        (!dish || cooksAs(fish, dish)) &&
        (!savedOnly || favs.includes(fish.key)) &&
        (!q || [fish.name, fish.english, fish.kn, ...fish.bestFor].some((s) => s.toLowerCase().includes(q))),
    )
    .sort((a, b) => {
      const outA = a.best ? 0 : 1;
      const outB = b.best ? 0 : 1;
      if (outA !== outB) return outA - outB;
      if (sort === "low") return a.price - b.price;
      if (sort === "high") return b.price - a.price;
      return (b.best?.landed ?? "").localeCompare(a.best?.landed ?? "");
    });

  function quickAdd(fish: Fish) {
    addToCart({ fishKey: fish.key, fishName: fish.name, fishKn: fish.kn, cut: "whole", kg: 1 }, availableKg(fish.key, market));
    setAdded(fish.key);
    setTimeout(() => setAdded((cur) => (cur === fish.key ? null : cur)), 1800);
  }

  function clearFilters() {
    setQuery("");
    setGroup("all");
    setDish("");
    setSavedOnly(false);
  }

  const firstSlot = market.hour !== null ? deliverySlots(market.hour).find((sl) => !sl.full) : undefined;
  const boatsToday = new Set(cards.flatMap((c) => c.offers.map((o) => o.boat.id))).size;

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
        <div className="hero-photo">
          <Image src="/fish/harbour-trawler.jpg" alt="A blue fishing trawler on the water off Mangaluru" fill priority sizes="520px" className="hero-img" />
        </div>
        <div className="hero-shade" />
        <div className="hero-body">
          <p className="hero-kicker">
            <span className="live-dot" aria-hidden /> {kn ? "ಇಂದು ಬೆಳಿಗ್ಗೆ ಬಂದ ಮೀನು" : "Landed this morning · Bunder, Malpe, Gangolli"}
          </p>
          <h1 className="hero-title">
            {kn ? (
              "ಮಂಗಳೂರಿನ ದೋಣಿಗಳಿಂದ ಇಂದಿನ ಮೀನು"
            ) : (
              <>
                <span>Today&apos;s catch from</span> <span className="hero-accent">Mangaluru boats</span>
              </>
            )}
          </h1>
          <label className="hero-deliver">
            <span aria-hidden>📍</span>
            <span className="sr-only">Deliver to</span>
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">{kn ? "ನಿಮ್ಮ ಪ್ರದೇಶ ಆಯ್ಕೆಮಾಡಿ" : "Choose where you live"}</option>
              {AREAS.map((a) => (
                <option key={a.name} value={a.name}>
                  {kn ? a.name : `Deliver to ${a.name}`}
                </option>
              ))}
            </select>
            {firstSlot && (
              <span className="hero-slot">
                {firstSlot.day} {firstSlot.label}
              </span>
            )}
          </label>
          <ul className="hero-stats">
            <li>
              <strong>{boatsToday}</strong> boats
            </li>
            <li>
              <strong>{cards.filter((c) => c.best).length}</strong> fish today
            </li>
            <li>
              from <strong>{rupees(Math.min(...cards.filter((c) => c.best).map((c) => c.price)))}</strong>/kg
            </li>
          </ul>
          <div className="hero-actions">
            <a href="#catch" className="btn btn-white">
              {kn ? "ಮೀನು ನೋಡಿ" : "Shop today's catch"}
            </a>
            <Link href="/how-it-works" className="btn btn-ghost">
              {kn ? "ಹೇಗೆ?" : "How it works"}
            </Link>
          </div>
        </div>
        <svg className="wave" viewBox="0 0 1040 40" preserveAspectRatio="none" aria-hidden>
          <path d="M0,22 C70,6 140,38 220,22 C300,6 380,36 460,20 C540,6 600,34 680,22 C760,8 830,36 900,20 C960,8 1000,18 1040,22 L1040,40 L0,40 Z" />
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
              <strong>Quality graded</strong>
              <small>At the harbour</small>
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

        <EveningBanner />
        <Link href="/insights" className="ai-teaser">
          <span className="ai-badge ai-badge-sm" aria-hidden>
            ✨
          </span>
          <span>
            <strong>{ai.headline}</strong>
            <span>AI Insights: today&apos;s best buys and smart picks →</span>
          </span>
        </Link>

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

        {deals.length > 0 && group === "all" && !dish && !savedOnly && !q && (
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
              {deals.map(({ fish, best, price }) => (
                <Link key={fish.key} href={`/fish/${fish.key}`} className="deal">
                  <FishPhoto fish={fish} sizes="160px" className="deal-photo" />
                  <span className="deal-off">−{Math.round(((best!.lastPrice - price) / best!.lastPrice) * 100)}%</span>
                  <span className="deal-name">{kn ? <span className="kn">{fish.kn}</span> : fish.name}</span>
                  <span className="deal-price">
                    {rupees(price)}
                    <s>{rupees(best!.lastPrice)}</s>
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
              placeholder={kn ? "ಮೀನು ಹುಡುಕಿ: ಬಂಗುಡೆ, ಅಂಜಲ್…" : "Search fish or dish, e.g. tandoori"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className="chips" role="group" aria-label="Cooking">
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
            {shown.map(({ fish, offers, best, price, kg }, i) => {
              const out = !best;
              const drop = best && price < best.lastPrice;
              return (
                <li key={fish.key} className={`tile${out ? " tile-out" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                  <Link href={`/fish/${fish.key}`} className="tile-link">
                    <div className="tile-media">
                      <FishPhoto fish={fish} sizes="(max-width: 520px) 50vw, 260px" />
                      {best?.grade && (
                        <span className="tile-seal">
                          <GradeSeal grade={best.grade} size={46} />
                        </span>
                      )}
                      {drop && <span className="tile-tag">Price drop</span>}
                      {out && <span className="tile-sold">Sold out today</span>}
                    </div>
                    <div className="tile-body">
                      <h3 className="tile-name">
                        {kn ? <span className="kn">{fish.kn}</span> : fish.name}
                        <span className={`tile-alt${kn ? "" : " kn"}`}>{kn ? fish.name : fish.kn}</span>
                      </h3>
                      <p className="tile-sub">{fish.english}</p>
                      {best && (
                        <>
                          <p className="tile-boat">
                            ⚓ {best.boat.name} · {best.boat.harbour.replace("Mangaluru ", "")}
                          </p>
                          <p className="tile-meta">
                            Landed {time12(best.landed)}
                            {offers.length > 1 ? ` · ${offers.length} boats` : ""}
                          </p>
                          <p className="tile-price">
                            {offers.length > 1 && <span className="from">from </span>}
                            <strong>{rupees(price)}</strong>
                            <span>/kg</span>
                          </p>
                          <p className={`tile-left${kg < 10 ? " low" : ""}`}>{kgText(kg)} available</p>
                        </>
                      )}
                    </div>
                  </Link>
                  <HeartButton fishKey={fish.key} name={fish.name} className="tile-heart" />
                  {!out && (
                    <button
                      type="button"
                      className={`add-btn${added === fish.key ? " add-btn-done" : ""}`}
                      onClick={() => quickAdd(fish)}
                      aria-label={`Add 1 kg ${fish.name} to cart`}
                    >
                      {added === fish.key ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
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
            Demo store with sample prices and stock · <Link href="/how-it-works">How it works</Link> ·{" "}
            <Link href="/credits">Photo credits</Link> · <Link href="/staff">Staff</Link>
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
