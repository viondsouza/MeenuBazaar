"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FishThumb } from "./FishPhoto";
import { FishName } from "./bits";
import { CheckIcon, TrashIcon } from "../icons";
import { addToCart, clearCart, removeFromCart, stepCartItem, useCart, type CartItem } from "@/lib/cart";
import { setArea, usePrefs } from "@/lib/prefs";
import { AREAS } from "@/lib/areas";
import { CUT_LABEL, FEES, availableKg, deliverySlots, placeOrder, priceCart, useMarket, useOrders, type Order } from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

export default function CartCheckout() {
  const router = useRouter();
  const items = useCart();
  const market = useMarket();
  const orders = useOrders();
  const { area } = usePrefs();
  const [slotPick, setSlotPick] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const slots = market.hour !== null ? deliverySlots(market.hour) : null;
  const earliest = slots?.find((s) => !s.full)?.id ?? null;
  const slotId = slotPick && slots?.some((s) => s.id === slotPick && !s.full) ? slotPick : earliest;
  const bill = priceCart(items, market);
  const totalKg = bill.lines.reduce((s, l) => s + l.filled, 0);
  const toFreeDelivery = FEES.freeDeliveryOver - bill.fish;

  // Put a past order's fish back in the cart, at today's best boats.
  function reorder(order: Order) {
    for (const l of order.lines) {
      addToCart({ fishKey: l.fishKey, fishName: l.fishName, fishKn: l.fishKn, cut: l.cut, kg: l.kg }, availableKg(l.fishKey, market));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(digits)) return setError("Please enter a 10-digit mobile number.");
    if (address.trim().length < 8) return setError("Please enter your house and street.");
    if (!area) return setError("Please choose your area.");
    const slot = slots?.find((s) => s.id === slotId);
    if (!slot || slot.full) return setError("Please choose a delivery slot.");

    setBusy(true);
    const result = placeOrder({ name: name.trim(), phone: digits, address: address.trim(), area, slot: { day: slot.day, label: slot.label } }, items, market);
    if (!result.ok) {
      setBusy(false);
      return setError(result.message);
    }
    clearCart();
    router.push(`/order/${result.code}?new=1`);
  }

  if (items.length === 0) {
    return (
      <div className="pad page-in">
        <h1 className="page-title">Your cart</h1>
        <div className="empty empty-big">
          <div className="empty-photo">
            <Image src="/fish/maanji.jpg" alt="" fill sizes="120px" />
          </div>
          <p className="empty-title">Your cart is empty</p>
          <p>Add some fresh fish from today&apos;s catch.</p>
          <Link href="/" className="btn btn-coral">
            Start shopping
          </Link>
        </div>
        {orders.length > 0 && (
          <section>
            <h2 className="h3">Your orders</h2>
            <ul className="order-links">
              {orders.map((o) => (
                <li key={o.code}>
                  <Link href={`/order/${o.code}`}>
                    <span>
                      <strong>{o.code}</strong>
                      <span className="muted small"> · {o.lines.map((l) => l.fishName).join(", ")}</span>
                    </span>
                    <span>{rupees(o.total)}</span>
                  </Link>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => reorder(o)}>
                    Order again
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <form className="pad checkout page-in" onSubmit={submit} noValidate>
      <h1 className="page-title">Your cart</h1>
      <p className="muted">
        {items.length} {items.length === 1 ? "item" : "items"} · {kgText(totalKg)}
      </p>

      <ul className="cart-list">
        {bill.lines.map((line, i) => {
          const it: CartItem = line.item;
          const max = Math.min(20, availableKg(it.fishKey, market, it.listingId));
          return (
            <li key={`${it.fishKey}-${it.cut}-${it.listingId ?? "best"}`} className="cart-item">
              <FishThumb fishKey={it.fishKey} />
              <div className="cart-info">
                <p className="cart-name">
                  <FishName name={it.fishName} kn={it.fishKn} />
                </p>
                <p className="muted small">
                  {CUT_LABEL[it.cut]} · {line.parts.length === 1 ? line.parts[0].listing.boat.name : `${line.parts.length} boats`} ·{" "}
                  {rupees(Math.round(line.avg))}/kg
                </p>
                {line.parts.length > 1 && (
                  <p className="split-mini">{line.parts.map((p) => `${kgText(p.kg)} ${p.listing.boat.name}`).join(" + ")}</p>
                )}
                {line.short > 0 && <p className="warn small">Only {kgText(line.filled)} available now</p>}
                <div className="cart-controls">
                  <div className="stepper stepper-sm" role="group" aria-label={`Quantity of ${it.fishName}`}>
                    <button type="button" onClick={() => stepCartItem(i, -0.5)} disabled={it.kg <= 0.5} aria-label="Less">
                      −
                    </button>
                    <span>{kgText(it.kg)}</span>
                    <button type="button" onClick={() => stepCartItem(i, 0.5, max)} disabled={it.kg >= max} aria-label="More">
                      +
                    </button>
                  </div>
                  <button type="button" className="icon-btn icon-btn-sm" onClick={() => removeFromCart(i)} aria-label={`Remove ${it.fishName}`}>
                    <TrashIcon size={18} />
                  </button>
                </div>
              </div>
              <strong className="cart-price">{rupees(line.fishTotal)}</strong>
            </li>
          );
        })}
      </ul>
      <Link href="/" className="link add-more">
        + Add more fish
      </Link>

      <h2 className="h3">
        <span className="step-num">1</span> Delivery address
      </h2>
      <div className="fields">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Asha Rao" />
        </label>
        <label className="field">
          <span>Mobile</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="98450 12345" />
        </label>
        <label className="field field-wide">
          <span>House, street, landmark</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="Flat 2, Lighthouse Hill Road" />
        </label>
        <label className="field field-wide">
          <span>Area</span>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Choose your area</option>
            {AREAS.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2 className="h3">
        <span className="step-num">2</span> Delivery slot
      </h2>
      {slots === null ? (
        <p className="muted">Finding slots…</p>
      ) : (
        <div className="slots" role="radiogroup" aria-label="Delivery slot">
          {slots.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={slotId === s.id}
              disabled={s.full}
              className={`slot${slotId === s.id ? " slot-on" : ""}`}
              onClick={() => setSlotPick(s.id)}
            >
              <span className="slot-day">{s.day}</span>
              <strong>{s.label}</strong>
              <span>{s.full ? "Full" : s.id === earliest ? "Earliest" : "Available"}</span>
            </button>
          ))}
        </div>
      )}

      <h2 className="h3">
        <span className="step-num">3</span> Bill
      </h2>
      <div className="bill">
        <p>
          <span>Fish ({kgText(totalKg)})</span>
          <span>{rupees(bill.fish)}</span>
        </p>
        <p>
          <span>Cleaning &amp; cutting</span>
          <span>{rupees(bill.cutting)}</span>
        </p>
        <p>
          <span>Delivery on ice</span>
          <span>{bill.delivery === 0 ? <span className="free">FREE</span> : rupees(bill.delivery)}</span>
        </p>
        <p>
          <span>Platform fee</span>
          <span>{rupees(bill.platform)}</span>
        </p>
        <p className="bill-total">
          <span>To pay</span>
          <span>{rupees(bill.total)}</span>
        </p>
        {toFreeDelivery > 0 ? (
          <div className="free-bar">
            <span style={{ width: `${Math.min(100, (bill.fish / FEES.freeDeliveryOver) * 100)}%` }} />
            <p>Add {rupees(toFreeDelivery)} more fish for free delivery</p>
          </div>
        ) : (
          <p className="bill-tip">🎉 You&apos;ve got free delivery</p>
        )}
      </div>

      <h2 className="h3">
        <span className="step-num">4</span> Payment
      </h2>
      <div className="pay-options" role="radiogroup" aria-label="Payment">
        <div className="pay-option pay-on" role="radio" aria-checked="true">
          <span className="radio-dot" aria-hidden>
            <CheckIcon size={14} />
          </span>
          <div>
            <strong>Pay on delivery</strong>
            <p className="muted small">UPI or cash when your fish arrives</p>
          </div>
        </div>
        <div className="pay-option pay-off" role="radio" aria-checked="false" aria-disabled="true">
          <span className="radio-dot" aria-hidden />
          <div>
            <strong>Pay online now</strong>
            <p className="muted small">Coming soon</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="notice notice-error shake" role="alert" key={error}>
          {error}
        </p>
      )}

      <div className="action-bar">
        <button type="submit" className="btn btn-coral btn-wide" disabled={busy}>
          {busy ? "Placing order…" : `Place order · ${rupees(bill.total)}`}
        </button>
      </div>
    </form>
  );
}
