// Three layers of waves drifting at different speeds, so the edge of a section looks like moving water.
// Each layer is a strip twice as wide as the box and slides by half its width, so the loop never jumps.
const WAVE = "M0,30 C80,12 160,48 240,30 C320,12 400,48 480,30 C560,12 640,48 720,30 C800,12 880,48 960,30 L960,60 L0,60 Z";

export default function SeaWaves({ className = "" }: { className?: string }) {
  return (
    <div className={`sea-waves ${className}`} aria-hidden>
      {["back", "mid", "front"].map((layer) => (
        <svg key={layer} className={`sea-wave sea-wave-${layer}`} viewBox="0 0 1920 60" preserveAspectRatio="none">
          <path d={WAVE} />
          <path d={WAVE} transform="translate(960 0)" />
        </svg>
      ))}
    </div>
  );
}

// The sea behind every page: light rippling down from the surface, a few rising bubbles,
// and slow waves above the bottom bar. Purely decorative and fixed behind the content.
export function SeaBackdrop() {
  return (
    <div className="sea" aria-hidden>
      <div className="sea-light" />
      <div className="sea-bubbles">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} style={{ "--b": i } as React.CSSProperties} />
        ))}
      </div>
      <SeaWaves className="sea-floor" />
    </div>
  );
}
