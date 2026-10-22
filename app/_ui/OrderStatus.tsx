"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FishThumb } from "./FishPhoto";
import { FishName } from "./bits";
import { CheckIcon } from "../icons";
import { addToCart } from "@/lib/cart";
import { CUT_LABEL, availableKg, useMarket, useOrders } from "@/lib/catalog";
import { kgText, rupees } from "@/lib/format";

const STEPS = [
  { label: "Order placed", note: "Your fish is reserved with the boats." },
  { label: "Cleaned & packed on ice", note: "At the harbour, before your slot." },
  { label: "Out for delivery", note: "A rider brings it in your slot." },
  { label: "Delivered", note: "Pay by UPI or cash." },
];

export default function OrderStatus() {
  const { code } = useParams<{ code: string }>();
  const justPlaced = useSearchParams().get("new") === "1";
  const order = useOrders().find((o) => o.code === code);
  const router = useRouter();
  const market = useMarket();

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

  function orderAgain() {
    for (const l of order!.lines) {
      addToCart({ fishKey: l.fishKey, fishName: l.fishName, fishKn: l.fishKn, cut: l.cut, kg: l.kg }, availableKg(l.fishKey, market));
    }
    router.push("/cart");
  }

  const boats = new Set(order.lines.flatMap((l) => l.parts.map((p) => p.boat)));

  return (
    <div className="pad page-in">
      {justPlaced && (
        <div className="placed">
          <span className="placed-icon pop">
            <CheckIcon size={28} />
          </span>
          <div>
            <h1 className="page-title">Order placed!</h1>
            <p className="muted">
              Thank you, {order.name.split(" ")[0]}. Your catch is reserved with {boats.size} {boats.size === 1 ? "boat" : "boats"}.
            </p>
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
        {order.lines.map((l, i) => (
          <li key={i} className="cart-item">
            <FishThumb fishKey={l.fishKey} />
            <div className="cart-info">
              <p className="cart-name">
                <FishName name={l.fishName} kn={l.fishKn} />
              </p>
              <p className="muted small">
                {kgText(l.kg)} · {CUT_LABEL[l.cut]}
              </p>
              <p className="split-mini">
                {l.parts.map((p) => `${kgText(p.kg)} from ${p.boat} (${rupees(p.price)}/kg)`).join(" + ")}
              </p>
            </div>
            <strong className="cart-price">{rupees(l.fishTotal)}</strong>
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

      <div className="two-btns">
        <button type="button" className="btn btn-outline" onClick={orderAgain}>
          Order again
        </button>
        <Link href="/" className="btn btn-coral">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
