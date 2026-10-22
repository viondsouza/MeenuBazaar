"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import FishArt from "../FishArt";
import { FishName } from "./bits";
import { BackIcon, BoatIcon, TruckIcon } from "../icons";
import { addToCart, type Cut } from "@/lib/cart";
import { usePrefs } from "@/lib/prefs";
import { AREAS, BUNDER, kmBetween } from "@/lib/areas";
import { CUT_LABEL, FEES, LISTINGS, cutFee, deliverySlots, getListing, kgLeft, useSold } from "@/lib/catalog";
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
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sold = useSold();
  const { area } = usePrefs();
  const [cut, setCut] = useState<Cut>("cleaned");
  const [kg, setKg] = useState(1);
  const [added, setAdded] = useState(false);
  const listing = getListing(id);

  if (!listing) {
    return (
      <div className="pad">
        <div className="empty">
          <p className="empty-title">This catch isn&apos;t on sale</p>
          <p>
            <Link href="/">See today&apos;s catch</Link>
          </p>
        </div>
      </div>
    );
  }

  const left = kgLeft(listing, sold);
  const soldOut = left < 0.5;
  const maxKg = Math.max(0.5, Math.min(left, 20));
  const amount = Math.min(kg, maxKg);
  const fishCost = amount * listing.price;
  const cutting = cutFee(cut, amount);
  const slot = deliverySlots().find((s) => !s.full);
  const chosenArea = AREAS.find((a) => a.name === area);
  const km = chosenArea ? kmBetween(BUNDER, chosenArea) : null;
  const others = LISTINGS.filter((l) => l.fish.key === listing.fish.key && l.id !== listing.id);

  function add(goToCart: boolean) {
    if (!listing) return;
    addToCart({
      listingId: listing.id,
      fishKey: listing.fish.key,
      fishName: listing.fish.name,
      fishKn: listing.fish.kn,
      boat: listing.boat.name,
      harbour: listing.boat.harbour,
      pricePerKg: listing.price,
      kg: amount,
      cut,
    }, left);
    if (goToCart) router.push("/cart");
    else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  }

  return (
    <div className="detail">
      <div className="detail-hero">
        <Link href="/" className="icon-btn icon-btn-float" aria-label="Back to shop">
          <BackIcon />
        </Link>
        <FishArt kind={listing.fish.key} className="detail-art" />
        <div className="pills detail-pills">
          {listing.checked && <span className="pill pill-navy">✓ Freshness checked</span>}
          <span className="pill pill-white">Landed {time12(listing.landed)}</span>
        </div>
      </div>

      <div className="pad">
        <FishName name={listing.fish.name} kn={listing.fish.kn} as="h1" />
        <p className="muted">{listing.fish.english} · {listing.fish.about}</p>
        <p className="big-price">
          {rupees(listing.price)} <span>per kg · {soldOut ? "sold out" : `${kgText(left)} left`}</span>
        </p>

        <div className="seller">
          <span className="seller-icon">
            <BoatIcon />
          </span>
          <div>
            <p className="seller-name">{listing.boat.name}</p>
            <p className="muted small">
              {listing.boat.type} · {listing.boat.harbour}
            </p>
          </div>
          <span className="seller-rating">★ {listing.boat.rating.toFixed(1)}</span>
        </div>

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
                  "No delivery slots left for today or tomorrow."
                )}
              </p>
            </div>

            <div className="line-total">
              <span>
                {kgText(amount)} × {rupees(listing.price)}
                {cutting > 0 ? ` + ${CUT_LABEL[cut].toLowerCase()} ${rupees(cutting)}` : ""}
              </span>
              <strong>{rupees(fishCost + cutting)}</strong>
            </div>
          </>
        )}

        {others.length > 0 && (
          <>
            <h2 className="h3">Also from other boats</h2>
            <ul className="others">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={`/fish/${o.id}`}>
                    <span>
                      <strong>{o.boat.name}</strong>
                      <span className="muted small">
                        {" "}
                        · {o.boat.harbour} · ★ {o.boat.rating.toFixed(1)}
                      </span>
                    </span>
                    <strong className={o.price < listing.price ? "cheaper" : ""}>{rupees(o.price)}/kg</strong>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {!soldOut && (
        <div className="action-bar">
          <button type="button" className="btn btn-outline" onClick={() => add(false)}>
            {added ? "Added ✓" : "Add to cart"}
          </button>
          <button type="button" className="btn btn-coral" onClick={() => add(true)}>
            Buy now · {rupees(fishCost + cutting)}
          </button>
        </div>
      )}
    </div>
  );
}
