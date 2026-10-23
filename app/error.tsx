"use client";

import { useEffect } from "react";
import { clearSavedData } from "@/lib/store";

// Shown if a page crashes. Most often the cause is something saved in this browser, so the
// main button clears the saved cart, orders and demo changes and starts fresh.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  function startFresh() {
    clearSavedData();
    // A full reload, so every saved-data store starts again from empty.
    window.location.reload();
  }

  return (
    <div className="pad page-in">
      <div className="empty empty-big">
        <p className="empty-title">Something went wrong on this page</p>
        <p>Your cart or demo data saved in this browser may be damaged. Starting fresh clears it.</p>
        <button type="button" className="btn btn-coral" onClick={startFresh}>
          Clear saved data and start fresh
        </button>
        <button type="button" className="btn btn-outline" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </div>
  );
}
