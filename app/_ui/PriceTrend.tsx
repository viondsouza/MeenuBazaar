import { rupees } from "@/lib/format";

const DAYS = ["6d", "5d", "4d", "3d", "2d", "Yest.", "Today"];

// A small line chart of the last 7 days' price, with today highlighted.
export default function PriceTrend({ values, compact = false }: { values: number[]; compact?: boolean }) {
  const w = 300;
  const h = compact ? 64 : 92;
  const pad = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const x = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - pad * 2);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1)},${h} L${x(0)},${h} Z`;
  const today = values[values.length - 1];
  const avg = values.slice(0, -1).reduce((s, v) => s + v, 0) / (values.length - 1);
  const diff = Math.round(today - avg);

  return (
    <figure className={`trend${compact ? " trend-compact" : ""}`}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Price over the last 7 days, from ${rupees(min)} to ${rupees(max)}`}>
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f7f80" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0f7f80" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trend-fill)" />
        <path d={line} fill="none" stroke="#0f7f80" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="trend-line" />
        <circle cx={x(values.length - 1)} cy={y(today)} r="5" fill="#e0512f" stroke="#fff" strokeWidth="2" />
      </svg>
      {!compact && (
        <div className="trend-days" aria-hidden>
          {DAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      )}
      <figcaption>
        {today <= min
          ? "Lowest price this week"
          : diff < 0
            ? `${rupees(-diff)}/kg below this week's average`
            : diff > 0
              ? `${rupees(diff)}/kg above this week's average`
              : "Same as this week's average"}
        <span> · week range {rupees(min)}–{rupees(max)}</span>
      </figcaption>
    </figure>
  );
}
