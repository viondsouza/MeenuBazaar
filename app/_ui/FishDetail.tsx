"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import FishPhoto from "./FishPhoto";
import GradeSeal from "./GradeSeal";
import HeartButton from "./HeartButton";
import { FishName } from "./bits";
import PriceTrend from "./PriceTrend";
import { BackIcon, TruckIcon } from "../icons";
import { addToCart, type Cut } from "@/lib/cart";
import { usePrefs } from "@/lib/prefs";
import { AREAS, BUNDER, kmBetween } from "@/lib/areas";
import {
  CUT_LABEL, FEES, RECIPES, allocate, availableKg, cutFee, deliverySlots, getFish, isEvening, offersFor, priceHistory, priceOf, stockOf, useMarket, whyBest,
} from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const CUTS: { value: Cut; note: string; hint: string }[] = [
  { value: "whole", note: "No charge", hint: "As landed" },
  { value: "cleaned", note: `+${rupees(FEES.cleaned)}/kg`, hint: "Scaled & gutted" },
  { value: "fry", note: `+${rupees(FEES.fry)}/kg`, hint: "Cleaned & sliced" },
];

export default function FishDetail() {
  const { id: key } = useParams<{ id: string }>();
  const pinnedFromLink = useSearchParams().get("boat") ?? "";
  const router = useRouter();
  const market = useMarket();
  const { area } = usePrefs();
  const [boatChoice, setBoatChoice] = useState<string>(pinnedFromLink); // "" = best boat for me
  const [cut, setCut] = useState<Cut>("cleaned");
  const [kg, setKg] = useState(1);
  const [added, setAdded] = useState(false);
  const fish = getFish(key);

  if (!fish) {
    return (
      <div className="pad">
        <div className="empty">
          <p className="empty-title">We don&apos;t sell this fish</p>
          <p>
            <Link href="/">See today&apos;s catch</Link>
          </p>
        </div>
      </div>
    );
  }

  const offers = offersFor(fish.key, market);
  const pinned = offers.find((o) => o.id === boatChoice);
  const listingId = pinned?.id;
  const shown = pinned ?? offers[0];
  const maxKg = Math.min(20, availableKg(fish.key, market, listingId));
  const soldOut = maxKg < 0.5;
  const amount = Math.max(0.5, Math.min(kg, maxKg));
  const plan = allocate(fish.key, amount, market, listingId);
  const cutting = cutFee(cut, plan.filled);
  const slot = market.hour !== null ? deliverySlots(market.hour).find((s) => !s.full) : undefined;
  const chosenArea = AREAS.find((a) => a.name === area);
  const km = chosenArea ? kmBetween(BUNDER, chosenArea) : null;
  const evening = isEvening(market);

  function add(goToCart: boolean) {
    if (!fish) return;
    addToCart({ fishKey: fish.key, fishName: fish.name, fishKn: fish.kn, cut, kg: amount, listingId }, maxKg);
    if (goToCart) router.push("/cart");
    else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  }

  return (
    <div className="detail">
      <div className="detail-hero">
        <FishPhoto fish={fish} sizes="520px" priority className="detail-photo" />
        <Link href="/" className="icon-btn icon-btn-float" aria-label="Back to shop">
          <BackIcon />
        </Link>
        <HeartButton fishKey={fish.key} name={fish.name} className="detail-heart" />
        {shown?.grade && (
          <span className="detail-seal" key={shown.id}>
            <GradeSeal grade={shown.grade} size={72} />
          </span>
        )}
      </div>

      <div className="pad detail-body">
        <FishName name={fish.name} kn={fish.kn} as="h1" />
        <p className="muted">{fish.english}</p>
        {shown && (
          <p className="big-price">
            {rupees(priceOf(shown, market))} <span>per kg</span>
            {priceOf(shown, market) < shown.lastPrice && <s className="was">{rupees(shown.lastPrice)}</s>}
            {evening && <span className="deal-pill">Evening deal −10%</span>}
          </p>
        )}
        <p className={`stock${maxKg < 10 ? " low" : ""}`}>
          {soldOut ? "Sold out today" : `${kgText(availableKg(fish.key, market))} available from ${offers.length} ${offers.length === 1 ? "boat" : "boats"}`}
        </p>
        <p className="about">{fish.about}</p>

        <dl className="facts">
          <div>
            <dt>Serves</dt>
            <dd>{fish.serves} per kg</dd>
          </div>
          <div>
            <dt>Pieces</dt>
            <dd>{fish.pieces} per kg</dd>
          </div>
          <div>
            <dt>After cleaning</dt>
            <dd>about {fish.cleanYield}% of the weight</dd>
          </div>
          <div>
            <dt>Best for</dt>
            <dd>{fish.bestFor.join(", ")}</dd>
          </div>
        </dl>

        {shown && (
          <div className="card-block">
            <h2 className="h3 tight">Price, last 7 days</h2>
            <PriceTrend values={priceHistory(fish.key, priceOf(shown, market))} />
          </div>
        )}

        {offers.length > 0 && (
          <>
            <h2 className="h3">Which boat?</h2>
            <div className="boats" role="radiogroup" aria-label="Boat">
              <button
                type="button"
                role="radio"
                aria-checked={!pinned}
                className={`boat boat-auto${!pinned ? " boat-on" : ""}`}
                onClick={() => setBoatChoice("")}
              >
                <span className="boat-top">
                  <strong>✨ Best boat for me</strong>
                  <span className="boat-price">{rupees(priceOf(offers[0], market))}</span>
                </span>
                <span className="boat-sub">
                  {offers[0].boat.name}, {offers[0].boat.harbour} · {whyBest(offers, market)}
                  {offers.length > 1 ? ". Big orders are split across boats automatically." : ""}
                </span>
              </button>
              {offers.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={pinned?.id === o.id}
                  className={`boat${pinned?.id === o.id ? " boat-on" : ""}`}
                  onClick={() => setBoatChoice(o.id)}
                >
                  <span className="boat-top">
                    <strong>{o.boat.name}</strong>
                    <span className="boat-price">{rupees(priceOf(o, market))}</span>
                  </span>
                  <span className="boat-sub">
                    {o.boat.harbour} · {o.boat.type} · ★ {o.boat.rating.toFixed(1)} · landed {time12(o.landed)}
                    {o.grade ? ` · Grade ${o.grade}` : " · not graded yet"} · {kgText(stockOf(o, market))} left
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {shown?.grade && (
          <p className="quality-note">
            <strong>Grade {shown.grade}</strong> · Checked at the harbour for firm flesh, bright eyes and red gills before
            packing.
          </p>
        )}

        {!soldOut && (
          <>
            <h2 className="h3">How do you want it?</h2>
            <div className="cuts" role="radiogroup" aria-label="Cut">
              {CUTS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={cut === o.value}
                  className={`cut${cut === o.value ? " cut-on" : ""}`}
                  onClick={() => setCut(o.value)}
                >
                  <strong>{CUT_LABEL[o.value]}</strong>
                  <span>{o.note}</span>
                  <span className="cut-hint">{o.hint}</span>
                </button>
              ))}
            </div>

            <div className="qty-row">
              <h2 className="h3">Quantity</h2>
              <div className="stepper" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setKg((k) => Math.max(0.5, Math.min(k, maxKg) - 0.5))} disabled={amount <= 0.5} aria-label="Less">
                  −
                </button>
                <span>{kgText(amount)}</span>
                <button type="button" onClick={() => setKg((k) => Math.min(maxKg, Math.min(k, maxKg) + 0.5))} disabled={amount + 0.5 > maxKg} aria-label="More">
                  +
                </button>
              </div>
            </div>
            <div className="quick-kg" role="group" aria-label="Quick amounts">
              {[0.5, 1, 2, 5].filter((n) => n <= maxKg).map((n) => (
                <button key={n} type="button" className={`chip${amount === n ? " chip-on" : ""}`} onClick={() => setKg(n)}>
                  {kgText(n)}
                </button>
              ))}
            </div>

            {plan.parts.length > 1 && (
              <div className="split" aria-live="polite">
                <p className="split-title">
                  ✨ Your {kgText(plan.filled)} comes from {plan.parts.length} boats
                </p>
                <ul>
                  {plan.parts.map((p) => (
                    <li key={p.listing.id}>
                      <span>
                        {kgText(p.kg)} · {p.listing.boat.name}, {p.listing.boat.harbour.replace("Mangaluru ", "")}
                      </span>
                      <span>{rupees(p.price)}/kg</span>
                    </li>
                  ))}
                </ul>
                <p className="split-avg">Average {rupees(Math.round(plan.avg))}/kg. You still get one delivery.</p>
              </div>
            )}

            <div className="eta">
              <TruckIcon />
              <p>
                {slot ? (
                  <>
                    <strong>
                      Earliest delivery: {slot.day}, {slot.label}
                    </strong>
                    {chosenArea ? ` to ${chosenArea.name}, about ${km?.toFixed(1)} km from Bunder` : ""}.{" "}
                    <span className="eta-note">Packed on ice. You choose the slot at checkout.</span>
                  </>
                ) : (
                  "Checking delivery slots…"
                )}
              </p>
            </div>

            <div className="line-total">
              <span>
                {kgText(plan.filled)} fish {rupees(plan.fishTotal)}
                {cutting > 0 ? ` + ${CUT_LABEL[cut].toLowerCase()} ${rupees(cutting)}` : ""}
              </span>
              <strong>{rupees(plan.fishTotal + cutting)}</strong>
            </div>
          </>
        )}

        {RECIPES[fish.key] && (
          <div className="recipe">
            <p className="recipe-kicker">Quick recipe · {RECIPES[fish.key].time}</p>
            <h2 className="h3 tight">{RECIPES[fish.key].title}</h2>
            <ol>
              {RECIPES[fish.key].steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        <div className="tip-card">
          <strong>❄ Keeping it fresh</strong>
          <p>Put it in the fridge as soon as it arrives and cook it the same day, or freeze it in a sealed box for up to 3 months.</p>
        </div>
      </div>

      {!soldOut && (
        <div className="action-bar">
          <button type="button" className="btn btn-outline" onClick={() => add(false)}>
            {added ? "Added ✓" : "Add to cart"}
          </button>
          <button type="button" className="btn btn-coral" onClick={() => add(true)}>
            Buy now · {rupees(plan.fishTotal + cutting)}
          </button>
        </div>
      )}
    </div>
  );
}
