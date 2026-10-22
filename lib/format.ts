export const rupees = (n: number) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const kgText = (n: number) => `${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;

// "6:10 AM" in India time.
export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

// "landed 6:10 AM" today, or "landed yesterday" for older catch.
export function landedText(iso: string) {
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const landed = new Date(iso);
  const today = new Date();
  if (day(landed) === day(today)) return `landed ${clockTime(iso)}`;
  const yesterday = new Date(today.getTime() - 86400000);
  if (day(landed) === day(yesterday)) return "landed yesterday";
  return `landed ${landed.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`;
}

// How long ago, for "Landed 3 h ago".
export function hoursAgo(iso: string, now: number) {
  if (!now) return "";
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
