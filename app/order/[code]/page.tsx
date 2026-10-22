import { Suspense } from "react";
import OrderStatus from "../../_ui/OrderStatus";

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="detail-skeleton" aria-busy="true" />}>
      <OrderStatus />
    </Suspense>
  );
}
