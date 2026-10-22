"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FishArt from "../FishArt";
import { FishName } from "./bits";
import { CheckIcon, TrashIcon } from "../icons";
import { clearCart, removeFromCart, stepCartItem, useCart } from "@/lib/cart";
import { setArea, usePrefs } from "@/lib/prefs";
import { AREAS } from "@/lib/areas";
import { CUT_LABEL, FEES, billFor, deliverySlots, getListing, kgLeft, placeOrder, useOrders, useSold, type Slot } from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

export default function CartCheckout() {
  const router = useRouter();
  const items = useCart();
  const sold = useSold();
  const orders = useOrders();
  const { area } = usePrefs();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Slots depend on the current time, so they're worked out once the page is open.
  useEffect(() => {
    const t = setTimeout(() => {
      const s = deliverySlots();
      setSlots(s);
      setSlotId(s.find((x) => !x.full)?.id ?? null);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const bill = billFor(items);
  const totalKg = items.reduce((s, i) => s + i.kg, 0);
  const toFreeDelivery = FEES.freeDeliveryOver - bill.fish;

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
    const result = placeOrder({ name: name.trim(), phone: digits, address: address.trim(), area, slot: { day: slot.day, label: slot.label }, items });
    if (!result.ok) {
      setBusy(false);
      return setError(result.message);
    }
    clearCart();
    router.push(`/order/${result.code}?new=1`);
  }

  if (items.length === 0) {
    return (
      <div className="pad">
        <h1 className="page-title">Your cart</h1>
        <div className="empty empty-big">
          <FishArt kind="maanji" className="empty-art" />
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
                      <span className="muted small"> · {o.items.length} {o.items.length === 1 ? "item" : "items"}</span>
                    </span>
                    <span>{rupees(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <form className="pad checkout" onSubmit={submit} noValidate>
      <h1 className="page-title">Your cart</h1>
      <p className="muted">
        {items.length} {items.length === 1 ? "item" : "items"} · {kgText(totalKg)}
      </p>

      <ul className="cart-list">
        {items.map((it, i) => {
          const l = getListing(it.listingId);
          const left = l ? kgLeft(l, sold) : 0;
          return (
            <li key={`${it.listingId}-${it.cut}`} className="cart-item">
              <div className="art-tile art-tile-sm">
                <FishArt kind={it.fishKey} />
              </div>
              <div className="cart-info">
                <p className="cart-name">
                  <FishName name={it.fishName} kn={it.fishKn} />
                </p>
                <p className="muted small">
                  {CUT_LABEL[it.cut]} · {it.boat} · {rupees(it.pricePerKg)}/kg
                </p>
                {it.kg > left && <p className="warn small">Only {kgText(left)} left</p>}
                <div className="cart-controls">
                  <div className="stepper stepper-sm" role="group" aria-label={`Quantity of ${it.fishName}`}>
                    <button type="button" onClick={() => stepCartItem(i, -0.5)} disabled={it.kg <= 0.5} aria-label="Less">
                      −
                    </button>
                    <span>{kgText(it.kg)}</span>
                    <button type="button" onClick={() => stepCartItem(i, 0.5, left)} disabled={it.kg >= Math.min(20, left)} aria-label="More">
                      +
                    </button>
                  </div>
                  <button type="button" className="icon-btn icon-btn-sm" onClick={() => removeFromCart(i)} aria-label={`Remove ${it.fishName}`}>
                    <TrashIcon size={18} />
                  </button>
                </div>
              </div>
              <strong className="cart-price">{rupees(it.kg * it.pricePerKg)}</strong>
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
          {slots.map((s) => {
            const earliest = slots.find((x) => !x.full)?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={slotId === s.id}
                disabled={s.full}
                className={`slot${slotId === s.id ? " slot-on" : ""}`}
                onClick={() => setSlotId(s.id)}
              >
                <span className="slot-day">{s.day}</span>
                <strong>{s.label}</strong>
                <span>{s.full ? "Full" : earliest ? "Earliest" : "Available"}</span>
              </button>
            );
          })}
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
        {toFreeDelivery > 0 && (
          <p className="bill-tip">Add {rupees(toFreeDelivery)} more fish for free delivery.</p>
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
        <p className="notice notice-error" role="alert">
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
