"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { whatsappLink } from "@/lib/whatsapp";

type Listing = {
  id: string;
  price_per_kg: number;
  previous_price_per_kg: number | null;
  kg_left: number;
  updated_at: string;
  boat_id: string;
  fish: { key: string; name: string; english_name: string } | null;
  boats: { name: string } | null;
};

type Status = "connecting" | "live" | "offline";

const FISH_EMOJI: Record<string, string> = { etti: "🦐", bondas: "🦑", denji: "🦀" };
const SELLING_FAST_KG = 10;

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

export default function PriceBoard() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(0); // set on first load; the clock can't be read while pre-rendering
  const [query, setQuery] = useState("");
  const previous = useRef<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id, price_per_kg, previous_price_per_kg, kg_left, updated_at, boat_id, fish(key, name, english_name), boats(name)",
      )
      .order("updated_at", { ascending: false })
      .returns<Listing[]>();
    if (error) {
      setError(error.message);
      return;
    }
    setError(null);

    // Highlight cards that are new or changed since the last load.
    const changed = new Set<string>();
    for (const l of data) {
      const before = previous.current.get(l.id);
      if (previous.current.size > 0 && before !== l.updated_at) changed.add(l.id);
    }
    previous.current = new Map(data.map((l) => [l.id, l.updated_at]));
    setListings(data);
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
  const shown = (listings ?? []).filter(
    (l) => !q || l.fish?.name.toLowerCase().includes(q) || l.fish?.english_name.toLowerCase().includes(q),
  );
  // Fish you can buy first, sold-out ones last.
  shown.sort((a, b) => Number(Number(a.kg_left) <= 0) - Number(Number(b.kg_left) <= 0));
  const available = (listings ?? []).filter((l) => Number(l.kg_left) > 0);
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
              : `${available.length} fish · ${boats} ${boats === 1 ? "boat" : "boats"}${
                  lastUpdate ? ` · updated ${timeAgo(lastUpdate, now)}` : ""
                }`}
          </p>
        </div>
        <span className={`status status-${status}`}>
          <span className="dot" aria-hidden />
          {status === "live" ? "Live prices" : status === "connecting" ? "Connecting…" : "Offline, refresh"}
        </span>
      </div>

      {(listings?.length ?? 0) > 3 && (
        <input
          className="search"
          type="search"
          placeholder="Search fish, e.g. bangude or prawns"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search fish"
        />
      )}

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
        <p className="notice">No fish matches “{query}”.</p>
      )}

      <ul className="grid">
        {shown.map((l) => (
          <FishCard key={l.id} listing={l} now={now} flash={flashIds.has(l.id)} />
        ))}
      </ul>
    </>
  );
}

function FishCard({ listing: l, now, flash }: { listing: Listing; now: number; flash: boolean }) {
  const [kg, setKg] = useState(1);
  const [cleaned, setCleaned] = useState(false);

  const name = l.fish?.name ?? "Fish";
  const left = Number(l.kg_left);
  const price = Number(l.price_per_kg);
  const soldOut = left <= 0;
  const maxKg = Math.max(0.5, Math.min(left, 20));
  const amount = Math.min(kg, maxKg);
  const prev = l.previous_price_per_kg;
  const move = prev == null ? 0 : price - Number(prev);
  const link = whatsappLink(`Order ${amount} kg ${name}${cleaned ? " cleaned" : ""}`);

  return (
    <li className={`card${flash ? " flash" : ""}${soldOut ? " sold-out" : ""}`}>
      <div className="card-top">
        <span className="fish-emoji" aria-hidden>
          {FISH_EMOJI[l.fish?.key ?? ""] ?? "🐟"}
        </span>
        <div className="fish-names">
          <h3>{name}</h3>
          <p className="english">{l.fish?.english_name}</p>
        </div>
        <div className="price">
          <span className="price-num">{rupees(price)}</span>
          <span className="per">per kg</span>
        </div>
      </div>

      <div className="tags">
        {move !== 0 && (
          <span className={`tag ${move > 0 ? "tag-up" : "tag-down"}`}>
            {move > 0 ? "▲" : "▼"} {rupees(Math.abs(move))} {move > 0 ? "up" : "down"}
          </span>
        )}
        {soldOut ? (
          <span className="tag tag-muted">Sold out</span>
        ) : (
          <span className={`tag ${left < SELLING_FAST_KG ? "tag-warn" : "tag-muted"}`}>
            {left < SELLING_FAST_KG ? `Selling fast · ${kgText(left)} left` : `${kgText(left)} left`}
          </span>
        )}
      </div>

      <p className="meta">
        ⛵ {l.boats?.name ?? "Boat"} · listed {timeAgo(l.updated_at, now)}
      </p>

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
            <span> · final total confirmed on WhatsApp</span>
          </p>
          {link ? (
            <a className="order" href={link} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> Order on WhatsApp
            </a>
          ) : (
            <span className="order disabled">WhatsApp ordering opens soon</span>
          )}
        </>
      )}
    </li>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-1.5-.7-2.3-1.5-.6-.6-1-1.2-1.2-1.6-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.7 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}
