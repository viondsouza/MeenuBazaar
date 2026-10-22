"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import FishArt from "../FishArt";
import { FishName } from "./bits";
import { CheckIcon } from "../icons";
import { CUT_LABEL, useOrders } from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

const STEPS = [
  { label: "Order placed", note: "Your fish is reserved." },
  { label: "Cleaned & packed on ice", note: "At the harbour, before your slot." },
  { label: "Out for delivery", note: "A rider brings it in your slot." },
  { label: "Delivered", note: "Pay by UPI or cash." },
];

export default function OrderStatus() {
  const { code } = useParams<{ code: string }>();
  const justPlaced = useSearchParams().get("new") === "1";
  const order = useOrders().find((o) => o.code === code);

  if (!order) {
    return (
      <div className="pad">
        <div className="empty">
          <p className="empty-title">Order not found</p>
          <p>
            Orders are saved in this browser. <Link href="/cart">See your orders</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pad">
      {justPlaced && (
        <div className="placed">
          <span className="placed-icon">
            <CheckIcon size={28} />
          </span>
          <div>
            <h1 className="page-title">Order placed!</h1>
            <p className="muted">Thank you, {order.name.split(" ")[0]}. Your fresh catch is reserved.</p>
          </div>
        </div>
      )}

      <div className="order-head">
        <div>
          <p className="order-label">Order</p>
          <p className="order-code">{order.code}</p>
        </div>
        <div className="order-slot">
          <p className="order-label">Delivery</p>
          <p>
            <strong>{order.slot.day}</strong>, {order.slot.label}
          </p>
        </div>
      </div>

      <ol className="timeline">
        {STEPS.map((s, i) => (
          <li key={s.label} className={i === 0 ? "now" : ""}>
            <span className="timeline-dot" aria-hidden>
              {i === 0 ? <CheckIcon size={14} /> : null}
            </span>
            <div>
              <p className="timeline-label">{s.label}</p>
              <p className="muted small">{s.note}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="h3">Your fish</h2>
      <ul className="cart-list">
        {order.items.map((it, i) => (
          <li key={i} className="cart-item">
            <div className="art-tile art-tile-sm">
              <FishArt kind={it.fishKey} />
            </div>
            <div className="cart-info">
              <p className="cart-name">
                <FishName name={it.fishName} kn={it.fishKn} />
              </p>
              <p className="muted small">
                {kgText(it.kg)} · {CUT_LABEL[it.cut]} · {it.boat}
              </p>
            </div>
            <strong className="cart-price">{rupees(it.kg * it.pricePerKg)}</strong>
          </li>
        ))}
      </ul>

      <div className="bill">
        <p>
          <span>Fish</span>
          <span>{rupees(order.fish)}</span>
        </p>
        <p>
          <span>Cleaning &amp; cutting</span>
          <span>{rupees(order.cutting)}</span>
        </p>
        <p>
          <span>Delivery on ice</span>
          <span>{order.delivery === 0 ? <span className="free">FREE</span> : rupees(order.delivery)}</span>
        </p>
        <p>
          <span>Platform fee</span>
          <span>{rupees(order.platform)}</span>
        </p>
        <p className="bill-total">
          <span>Pay on delivery</span>
          <span>{rupees(order.total)}</span>
        </p>
      </div>

      <p className="muted small deliver-to">
        Delivering to {order.name}, {order.address}, {order.area} · {order.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
      </p>

      <Link href="/" className="btn btn-outline btn-wide">
        Continue shopping
      </Link>
    </div>
  );
}
