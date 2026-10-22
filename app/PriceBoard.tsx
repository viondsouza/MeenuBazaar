"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type Listing = {
  id: string;
  price_per_kg: number;
  previous_price_per_kg: number | null;
  kg_left: number;
  updated_at: string;
  fish: { name: string; english_name: string } | null;
  boats: { name: string } | null;
};

type Status = "connecting" | "live" | "offline";

// The business WhatsApp number customers order on: digits only, e.g. 15551234567.
const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

const rupees = (n: number) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const kg = (n: number) => `${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;

function minutesAgo(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} hr ago` : new Date(iso).toLocaleDateString("en-IN");
}

function orderLink(fishName: string) {
  const text = `Order ${fishName} 1 kg`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}

export default function PriceBoard() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(0); // set on first load; the clock can't be read while pre-rendering
  const previous = useRef<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("listings")
      .select("id, price_per_kg, previous_price_per_kg, kg_left, updated_at, fish(name, english_name), boats(name)")
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
        Supabase keys are missing. Fill in <code>.env.local</code> (see <code>.env.example</code>), then
        restart <code>npm run dev</code>.
      </p>
    );
  }

  return (
    <section>
      <div className="board-bar">
        <h2>Today&apos;s catch</h2>
        <span className={`status status-${status}`}>
          <span className="dot" aria-hidden />
          {status === "live" ? "Live" : status === "connecting" ? "Connecting…" : "Offline, refresh the page"}
        </span>
      </div>

      {error && <p className="notice">Couldn&apos;t load the board: {error}</p>}
      {!error && listings === null && <p className="empty">Loading…</p>}
      {!error && listings?.length === 0 && (
        <p className="empty">No fish listed yet. Boats post their catch on WhatsApp each morning.</p>
      )}

      <ul className="grid">
        {listings?.map((l) => {
          const soldOut = Number(l.kg_left) <= 0;
          const prev = l.previous_price_per_kg;
          const move = prev == null ? 0 : Number(l.price_per_kg) - Number(prev);
          return (
            <li key={l.id} className={`card${flashIds.has(l.id) ? " flash" : ""}${soldOut ? " sold-out" : ""}`}>
              <div className="card-top">
                <div>
                  <h3>{l.fish?.name}</h3>
                  <p className="english">{l.fish?.english_name}</p>
                </div>
                <div className="price">
                  {rupees(l.price_per_kg)}
                  <span className="per">/kg</span>
                  {move !== 0 && (
                    <span className={`move ${move > 0 ? "up" : "down"}`}>
                      {move > 0 ? "▲" : "▼"} {rupees(Math.abs(move))}
                    </span>
                  )}
                </div>
              </div>
              <p className="meta">
                {soldOut ? "Sold out" : `${kg(l.kg_left)} left`} · {l.boats?.name ?? "Boat"} ·{" "}
                {minutesAgo(l.updated_at, now)}
              </p>
              {soldOut ? (
                <span className="order disabled">Sold out</span>
              ) : whatsappNumber ? (
                <a className="order" href={orderLink(l.fish?.name ?? "fish")} target="_blank" rel="noopener noreferrer">
                  Order on WhatsApp
                </a>
              ) : (
                <span className="order disabled" title="Set NEXT_PUBLIC_WHATSAPP_NUMBER in .env.local">
                  WhatsApp number not set yet
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
