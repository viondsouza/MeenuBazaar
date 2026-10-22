"use client";

import { toggleFav, useFavs } from "@/lib/favs";

export default function HeartButton({ fishKey, name, className = "" }: { fishKey: string; name: string; className?: string }) {
  const on = useFavs().includes(fishKey);
  return (
    <button
      type="button"
      className={`heart${on ? " heart-on" : ""} ${className}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFav(fishKey);
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
