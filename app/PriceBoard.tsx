"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { CHANNEL, chatLink, orderLink } from "@/lib/chat";
import { FISH_INFO, type Group } from "@/lib/fish";
import { ChatIcon } from "./icons";

type Fish = { key: string; name: string; english_name: string };
type Listing = {
  id: string;
  price_per_kg: number;
  previous_price_per_kg: number | null;
  kg_left: number;
  updated_at: string;
  boat_id: string;
  fish: Fish | null;
  boats: { name: string } | null;
};

type Status = "connecting" | "live" | "offline";
type Filter = "all" | Group;
type Sort = "newest" | "cheapest" | "priciest";

const SELLING_FAST_KG = 10;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Prawns, crab & squid" },
];

const rupees = (n: number) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const kgText = (n: number) => `${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;

function timeAgo(iso: string, now: number) {
  if (!now) return "";
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} hr ago` : new Date(iso).toLocaleDateString("en-IN");
}

export default function PriceBoard({ area }: { area: string }) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [allFish, setAllFish] = useState<Fish[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(0); // set on first load; the clock can't be read while pre-rendering
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const previous = useRef<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!supabase) return;
    const [listingRes, fishRes] = await Promise.all([
      supabase
        .from("listings")
        .select(
          "id, price_per_kg, previous_price_per_kg, kg_left, updated_at, boat_id, fish(key, name, english_name), boats(name)",
        )
        .order("updated_at", { ascending: false })
        .returns<Listing[]>(),
      supabase.from("fish").select("key, name, english_name").order("name").returns<Fish[]>(),
    ]);
    const err = listingRes.error ?? fishRes.error;
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    const data = listingRes.data ?? [];

    // Highlight cards that are new or changed since the last load.
    const changed = new Set<string>();
    for (const l of data) {
      const before = previous.current.get(l.id);
      if (previous.current.size > 0 && before !== l.updated_at) changed.add(l.id);
    }
    previous.current = new Map(data.map((l) => [l.id, l.updated_at]));
    setListings(data);
    setAllFish(fishRes.data ?? []);
    setNow(Date.now());
    if (changed.size) {
      setFlashIds(changed);
      setTimeout(() => setFlashIds(new Set()), 2500);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let stopped = false; // ignore messages from a connection we already closed
    // Load as soon as the live connection answers (even if it fails, so the board still shows),
    // then reload whenever Supabase says a listing changed.
    const channel = client
      .channel("price-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => load())
      .subscribe((s) => {
        if (stopped) return;
        if (s === "SUBSCRIBED") {
          setStatus("live");
          load();
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("offline");
          load();
        }
      });
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      stopped = true;
      clearInterval(tick);
      client.removeChannel(channel);
    };
  }, [load]);

  if (!supabaseConfigured) {
    return (
      <p className="notice">
        Supabase keys are missing. Fill in <code>.env.local</code> (see <code>.env.example</code>), then restart{" "}
        <code>npm run dev</code>.
      </p>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = (f: Fish | null) =>
    !!f &&
    (filter === "all" || FISH_INFO[f.key]?.group === filter) &&
    (!q || f.name.toLowerCase().includes(q) || f.english_name.toLowerCase().includes(q));

  const available = (listings ?? []).filter((l) => Number(l.kg_left) > 0);
  const shown = (listings ?? []).filter((l) => matches(l.fish));
  shown.sort((a, b) => {
    const soldOut = Number(Number(a.kg_left) <= 0) - Number(Number(b.kg_left) <= 0);
    if (soldOut) return soldOut; // fish you can buy first, sold-out last
    if (sort === "cheapest") return Number(a.price_per_kg) - Number(b.price_per_kg);
    if (sort === "priciest") return Number(b.price_per_kg) - Number(a.price_per_kg);
    return 0; // already newest first
  });
  const listedKeys = new Set(available.map((l) => l.fish?.key));
  const notToday = allFish.filter((f) => !listedKeys.has(f.key) && matches(f));
  const boats = new Set(available.map((l) => l.boat_id)).size;
  const lastUpdate = listings?.[0]?.updated_at;

  return (
    <>
      <div className="board-head">
        <div>
          <h2 className="section-title">Today&apos;s catch</h2>
          <p className="board-summary">
            {listings === null
              ? "Loading prices…"
              : `${available.length} on sale · ${boats} ${boats === 1 ? "boat" : "boats"}${
                  lastUpdate ? ` · updated ${timeAgo(lastUpdate, now)}` : ""
                }`}
          </p>
        </div>
        <span className={`status status-${status}`}>
          <span className="dot" aria-hidden />
          {status === "live" ? "Live prices" : status === "connecting" ? "Connecting…" : "Offline, refresh"}
        </span>
      </div>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`chip${filter === f.value ? " chip-on" : ""}`}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <input
            className="search"
            type="search"
            placeholder="Search bangude, prawns…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search fish"
          />
          <select className="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="cheapest">Price: low to high</option>
            <option value="priciest">Price: high to low</option>
          </select>
        </div>
      </div>

      {error && <p className="notice">Couldn&apos;t load prices: {error}</p>}

      {!error && listings === null && (
        <ul className="grid" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="card skeleton" />
          ))}
        </ul>
      )}

      {!error && listings?.length === 0 && (
        <div className="empty">
          <span className="empty-emoji" aria-hidden>
            ⛵
          </span>
          <p className="empty-title">The boats are still at sea</p>
          <p>Today&apos;s catch appears here as soon as boat owners post it. Check back after sunrise.</p>
        </div>
      )}

      {!error && listings && listings.length > 0 && shown.length === 0 && (
        <p className="notice">Nothing on sale matches that. Try another filter or search.</p>
      )}

      <ul className="grid">
        {shown.map((l) => (
          <FishCard key={l.id} listing={l} now={now} flash={flashIds.has(l.id)} area={area} />
        ))}
      </ul>

      {listings && notToday.length > 0 && (
        <>
          <h3 className="subhead">Not in today&apos;s catch</h3>
          <ul className="mini-grid">
            {notToday.map((f) => {
              const ask = chatLink(`Hi MeenuBazaar! Is ${f.name} available today?`);
              return (
                <li key={f.key} className="mini">
                  <div className="mini-photo">
                    {FISH_INFO[f.key] && (
                      <Image src={FISH_INFO[f.key].photo} alt={f.english_name} fill sizes="160px" />
                    )}
                  </div>
                  <div className="mini-text">
                    <span className="mini-name">{f.name}</span>
                    <span className="mini-english">{f.english_name}</span>
                    {ask && (
                      <a href={ask} target="_blank" rel="noopener noreferrer" className={`mini-ask mini-ask-${CHANNEL.toLowerCase()}`}>
                        Ask on {CHANNEL}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

function FishCard({ listing: l, now, flash, area }: { listing: Listing; now: number; flash: boolean; area: string }) {
  const [kg, setKg] = useState(1);
  const [cleaned, setCleaned] = useState(false);

  const name = l.fish?.name ?? "Fish";
  const info = FISH_INFO[l.fish?.key ?? ""];
  const left = Number(l.kg_left);
  const price = Number(l.price_per_kg);
  const soldOut = left <= 0;
  const maxKg = Math.max(0.5, Math.min(left, 20));
  const amount = Math.min(kg, maxKg);
  const prev = l.previous_price_per_kg;
  const move = prev == null ? 0 : price - Number(prev);
  const link = l.fish ? orderLink(amount, l.fish.key, name, cleaned, area) : "";

  return (
    <li className={`card${flash ? " flash" : ""}${soldOut ? " sold-out" : ""}`}>
      <div className="photo">
        {info && <Image src={info.photo} alt={l.fish?.english_name ?? name} fill sizes="(max-width: 700px) 100vw, 340px" />}
        <span className="price-badge">
          {rupees(price)}
          <small>/kg</small>
        </span>
        {move !== 0 && (
          <span className={`move-badge ${move > 0 ? "up" : "down"}`}>
            {move > 0 ? "▲" : "▼"} {rupees(Math.abs(move))}
          </span>
        )}
      </div>

      <div className="card-body">
        <div>
          <h3>{name}</h3>
          <p className="english">{l.fish?.english_name}</p>
        </div>

        <div className="tags">
          {soldOut ? (
            <span className="tag tag-muted">Sold out</span>
          ) : (
            <span className={`tag ${left < SELLING_FAST_KG ? "tag-warn" : "tag-fresh"}`}>
              {left < SELLING_FAST_KG ? `Selling fast · ${kgText(left)} left` : `${kgText(left)} left`}
            </span>
          )}
          <span className="tag tag-muted">
            ⛵ {l.boats?.name ?? "Boat"} · {timeAgo(l.updated_at, now)}
          </span>
        </div>

        {!soldOut && (
          <div className="picker">
            <div className="stepper" role="group" aria-label={`Amount of ${name}`}>
              <button type="button" onClick={() => setKg(Math.max(0.5, amount - 0.5))} disabled={amount <= 0.5} aria-label="Less">
                −
              </button>
              <span className="stepper-value">{kgText(amount)}</span>
              <button type="button" onClick={() => setKg(Math.min(maxKg, amount + 0.5))} disabled={amount + 0.5 > maxKg} aria-label="More">
                +
              </button>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={cleaned} onChange={(e) => setCleaned(e.target.checked)} />
              <span>Cleaned</span>
            </label>
          </div>
        )}

        {soldOut ? (
          <span className="order disabled">Sold out today</span>
        ) : (
          <>
            <p className="estimate">
              About <strong>{rupees(Math.round(amount * price))}</strong>
              <span>{area ? ` · deliver to ${area}` : ` · total confirmed on ${CHANNEL}`}</span>
            </p>
            {link ? (
              <a className={`order order-${CHANNEL.toLowerCase()}`} href={link} target="_blank" rel="noopener noreferrer">
                <ChatIcon /> Order on {CHANNEL}
              </a>
            ) : (
              <span className="order disabled">{CHANNEL} ordering opens soon</span>
            )}
          </>
        )}
      </div>
    </li>
  );
}
