import { Suspense } from "react";
import FishDetail from "../../_ui/FishDetail";

export default function FishPage() {
  return (
    <Suspense fallback={<div className="detail-skeleton" aria-busy="true" />}>
      <FishDetail />
    </Suspense>
  );
}
