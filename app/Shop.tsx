"use client";

import { useState } from "react";
import PriceBoard from "./PriceBoard";
import { AREAS, BUNDER, kmBetween, nearestArea } from "@/lib/areas";
import { CHANNEL, chatLink } from "@/lib/chat";
import { ChatIcon } from "./icons";

type Locating = "idle" | "busy" | "denied" | "unsupported";

// The delivery area picker, the price board and the floating chat button,
// sharing the chosen area so every order message says where to deliver.
export default function Shop() {
  const [area, setArea] = useState("");
  const [locating, setLocating] = useState<Locating>("idle");

  const chosen = AREAS.find((a) => a.name === area);
  const km = chosen ? kmBetween(BUNDER, chosen) : null;

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setLocating("unsupported");
      return;
    }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setArea(nearestArea({ lat: pos.coords.latitude, lng: pos.coords.longitude }).name);
        setLocating("idle");
      },
      () => setLocating("denied"),
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  const chat = chatLink(`Hi MeenuBazaar! What fish do you have today?${area ? `\nI'm in ${area}.` : ""}`);

  return (
    <>
      <div className="area-bar" id="delivery-area">
        <div className="area-label">
          <span className="area-pin" aria-hidden>
            📍
          </span>
          <label htmlFor="area">Deliver to</label>
        </div>
        <select id="area" className="area-select" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Choose your area</option>
          {AREAS.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn-locate" onClick={locateMe} disabled={locating === "busy"}>
          {locating === "busy" ? "Finding you…" : "Use my location"}
        </button>
        <p className="area-note" aria-live="polite">
          {locating === "denied"
            ? "Couldn't get your location. Please choose your area from the list."
            : locating === "unsupported"
              ? "Your browser can't share location. Please choose your area."
              : km != null
                ? `${area} is about ${km.toFixed(1)} km from Bunder. Fresh fish, cleaned and delivered in 2–3 hours.`
                : "Pick your area and we'll add it to your order."}
        </p>
      </div>

      <PriceBoard area={area} />

      {chat && (
        <a className={`fab fab-${CHANNEL.toLowerCase()}`} href={chat} target="_blank" rel="noopener noreferrer" aria-label={`Chat on ${CHANNEL}`}>
          <ChatIcon size={26} />
        </a>
      )}
    </>
  );
}
