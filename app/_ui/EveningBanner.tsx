"use client";

import { EVENING_DEAL, useHour } from "@/lib/catalog";

// The evening deal runs by itself: 10% off every fish from 4 PM, so the day's catch sells
// out instead of going to waste. Before 4 PM it counts down.
export default function EveningBanner() {
  const hour = useHour();
  if (hour === null) return null;
  const off = Math.round(EVENING_DEAL.off * 100);

  if (hour >= EVENING_DEAL.fromHour) {
    return (
      <div className="evening evening-on" role="status">
        <span className="evening-icon" aria-hidden>
          🌅
        </span>
        <p>
          <strong>Evening deal is on: {off}% off every fish</strong>
          <span>Prices drop automatically after 4 PM so today&apos;s catch doesn&apos;t go to waste.</span>
        </p>
      </div>
    );
  }

  const mins = Math.round((EVENING_DEAL.fromHour - hour) * 60);
  const left = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
  return (
    <div className="evening">
      <span className="evening-icon" aria-hidden>
        ⏳
      </span>
      <p>
        <strong>
          Evening deal in {left}: {off}% off at 4 PM
        </strong>
        <span>Prices drop by themselves so the day&apos;s catch sells fresh.</span>
      </p>
    </div>
  );
}
