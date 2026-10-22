import { useId } from "react";

// Flat seafood drawings in one style (like the prototype), one per kind in lib/catalog.ts.
// Pure SVG: sharp on every screen, nothing to download.

type FinFish = {
  len: number; // nose to tail base
  h: number; // half the body height
  back: string;
  body: string;
  belly: string;
  marks?: "waves" | "spots" | "bars" | "none";
  finlets?: string; // tuna: little yellow fins near the tail
};

const FIN: Record<string, FinFish> = {
  bangude: { len: 80, h: 14, back: "#2c5573", body: "#6b91ae", belly: "#e1eaf0", marks: "waves" },
  bhutai: { len: 84, h: 10, back: "#356582", body: "#94b2c4", belly: "#e6eef3", marks: "spots" },
  anjal: { len: 88, h: 11, back: "#2f4e66", body: "#7f9fb6", belly: "#e3ebf1", marks: "bars" },
  kane: { len: 84, h: 9, back: "#5d7f96", body: "#b3c6d3", belly: "#eef3f6", marks: "none" },
  modhe: { len: 80, h: 12, back: "#4f6475", body: "#9aabb8", belly: "#edf1f4", marks: "none" },
  kedar: { len: 82, h: 17, back: "#1d3a55", body: "#557895", belly: "#dfe7ee", marks: "none", finlets: "#e8b730" },
};

function Fin({ f, clip }: { f: FinFish; clip: string }) {
  const x0 = 12;
  const x1 = x0 + f.len;
  const y = 32;
  const body = `M${x0},${y} C${x0 + f.len * 0.25},${y - f.h * 1.35} ${x0 + f.len * 0.72},${y - f.h * 1.1} ${x1},${y - f.h * 0.22}
    L${x1},${y + f.h * 0.22} C${x0 + f.len * 0.72},${y + f.h * 1.1} ${x0 + f.len * 0.25},${y + f.h * 1.2} ${x0},${y} Z`;
  const eyeX = x0 + f.len * 0.13;
  const eyeY = y - f.h * 0.22;
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={`M${x1 - 3},${y} L${x1 + 15},${y - f.h - 3} Q${x1 + 9},${y} ${x1 + 15},${y + f.h + 3} Z`} fill={f.back} />
      <path d={`M${x0 + f.len * 0.42},${y - f.h * 0.95} l8,-${f.h * 0.6} l10,${f.h * 0.55} Z`} fill={f.finlets ?? f.back} />
      <path d={`M${x0 + f.len * 0.55},${y + f.h * 0.9} l6,${f.h * 0.45} l8,-${f.h * 0.4} Z`} fill={f.finlets ?? f.body} />
      {f.finlets &&
        [0, 1, 2, 3].map((i) => (
          <g key={i} fill={f.finlets}>
            <path d={`M${x0 + f.len * 0.7 + i * 5},${y - f.h * 0.72 + i * 1.6} l2,-3 l2,3 Z`} />
            <path d={`M${x0 + f.len * 0.7 + i * 5},${y + f.h * 0.72 - i * 1.6} l2,3 l2,-3 Z`} />
          </g>
        ))}
      <path d={body} fill={f.body} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y={y - 40} width="120" height={40 - f.h * 0.15} fill={f.back} />
        <rect x="0" y={y + f.h * 0.35} width="120" height="40" fill={f.belly} />
        {f.marks === "waves" &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${x0 + 18 + i * 10},${y - f.h} q3,4 0,8`} stroke="#1d3d55" strokeWidth="2" fill="none" strokeLinecap="round" />
          ))}
        {f.marks === "spots" &&
          [0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={i} cx={x0 + 20 + i * 8} cy={y - 2} r="1.6" fill="#2a4e66" />)}
        {f.marks === "bars" &&
          [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={x0 + 22 + i * 8} y={y - 6} width="2.2" height="9" rx="1.1" fill="#3d6079" />
          ))}
        <path d={`M${x0 + 8},${y + 1} L${x1},${y + 1}`} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.2" />
      </g>
      <path d={`M${x0 + f.len * 0.22},${y - f.h * 0.7} q-4,${f.h * 0.7} 0,${f.h * 1.3}`} stroke="#1d3d55" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
      <circle cx={eyeX} cy={eyeY} r="3" fill="#ffffff" />
      <circle cx={eyeX + 0.5} cy={eyeY} r="1.5" fill="#132a3d" />
    </>
  );
}

// Pomfret: a deep, round body with a small forked tail.
function Pomfret({ dark }: { dark?: boolean }) {
  const c = dark
    ? { tail: "#3c4a56", body: "#6f7f8c", back: "#4b5a67", fin: "#3c4a56" }
    : { tail: "#8597a5", body: "#c4d0d9", back: "#8fa3b2", fin: "#8597a5" };
  return (
    <>
      <path d="M86,32 L104,18 Q98,32 104,46 Z" fill={c.tail} />
      <path d="M18,32 C26,6 64,2 88,32 C64,62 26,58 18,32 Z" fill={c.body} />
      <path d="M18,32 C26,6 64,2 88,32 C64,22 30,20 18,32 Z" fill={c.back} />
      <path d="M44,10 C58,2 72,10 78,20" stroke={c.fin} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M44,54 C58,62 72,54 78,44" stroke={c.fin} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M32,22 q-5,10 0,20" stroke="#2c3a46" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
      <circle cx="26" cy="28" r="3" fill="#fff" />
      <circle cx="26.5" cy="28" r="1.5" fill="#132a3d" />
    </>
  );
}

// Prawn: a curled, segmented body with a fan tail and long feelers.
function Prawn({ tiger }: { tiger?: boolean }) {
  const a = tiger ? "#d99a73" : "#f19a7c";
  const b = tiger ? "#3c4b5a" : "#e98a6b";
  const tail = tiger ? "#3c4b5a" : "#d76c4d";
  const feeler = tiger ? "#6d5a4c" : "#c4583c";
  return (
    <>
      <path d="M30,22 C10,10 6,8 4,6 M30,24 C14,20 8,22 2,24" stroke={feeler} strokeWidth="1.3" fill="none" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const ang = Math.PI * (0.95 - i * 0.16);
        return (
          <ellipse key={i} cx={62 + Math.cos(ang) * 30} cy={36 - Math.sin(ang) * 18} rx={10 - i * 0.6} ry={9 - i * 0.7} fill={i % 2 ? b : a} />
        );
      })}
      <path d="M86,44 l12,8 l-2,-12 Z" fill={tail} />
      <path d="M86,44 l14,-2 l-8,-8 Z" fill={tail} />
      <circle cx="35" cy="25" r="2.4" fill="#132a3d" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${44 + i * 8},${44 - i} l-2,8`} stroke={feeler} strokeWidth="1.3" strokeLinecap="round" />
      ))}
    </>
  );
}

// Clams: three ridged shells.
function Clams() {
  const shell = (x: number, y: number, s: number, fill: string, ridge: string) => (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M0,10 C2,-6 30,-6 32,10 C28,20 4,20 0,10 Z" fill={fill} />
      {[6, 11, 16, 21, 26].map((rx) => (
        <path key={rx} d={`M16,16 L${rx},-1`} stroke={ridge} strokeWidth="1.2" />
      ))}
      <path d="M0,10 C4,20 28,20 32,10" stroke={ridge} strokeWidth="1.5" fill="none" />
    </g>
  );
  return (
    <>
      {shell(16, 30, 1.1, "#d8c3a5", "#a88a66")}
      {shell(52, 34, 1.15, "#c9ad8a", "#97795a")}
      {shell(36, 14, 1, "#e4d3ba", "#b19674")}
    </>
  );
}

export default function FishArt({ kind, className }: { kind: string; className?: string }) {
  const clip = useId().replace(/:/g, "");
  let art: React.ReactNode;

  if (FIN[kind]) art = <Fin f={FIN[kind]} clip={clip} />;
  else if (kind === "maanji") art = <Pomfret />;
  else if (kind === "kappu-maanji") art = <Pomfret dark />;
  else if (kind === "etti") art = <Prawn />;
  else if (kind === "tiger-etti") art = <Prawn tiger />;
  else if (kind === "marvai") art = <Clams />;
  else if (kind === "balchatte") {
    // Ribbon fish: a long, thin silver ribbon.
    art = (
      <>
        <path d="M14,30 C34,18 58,42 84,28 S108,26 116,22" stroke="#7d93a3" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M14,30 C34,18 58,42 84,28 S108,26 116,22" stroke="#d3dde4" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M24,24 C40,16 56,36 80,26" stroke="#5f7686" strokeWidth="1.5" strokeDasharray="2 3" fill="none" />
        <circle cx="16" cy="28" r="2.4" fill="#fff" />
        <circle cx="16.3" cy="28" r="1.2" fill="#132a3d" />
      </>
    );
  } else if (kind === "bondas") {
    // Squid: a long mantle with side fins and trailing arms.
    art = (
      <>
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M42,${28 + i * 2} C30,${22 + i * 4} 20,${20 + i * 6} 8,${16 + i * 8}`} stroke="#c7a395" strokeWidth="2" fill="none" strokeLinecap="round" />
        ))}
        <path d="M86,22 L110,14 L104,32 L110,50 L86,42 Z" fill="#d9b8aa" />
        <path d="M40,32 C44,20 96,22 104,32 C96,42 44,44 40,32 Z" fill="#ecd9cf" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={56 + i * 7} cy={30 + (i % 2) * 4} r="1.6" fill="#c98f79" />
        ))}
        <circle cx="46" cy="30" r="2.6" fill="#fff" />
        <circle cx="46.3" cy="30" r="1.3" fill="#132a3d" />
      </>
    );
  } else if (kind === "denji") {
    // Crab: a wide shell, two claws and legs.
    art = (
      <>
        {[0, 1, 2].map((i) => (
          <g key={i} stroke="#b9512f" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d={`M40,${38 + i * 4} l-12,${6 + i * 3}`} />
            <path d={`M80,${38 + i * 4} l12,${6 + i * 3}`} />
          </g>
        ))}
        <path d="M44,28 L30,16 M76,28 L90,16" stroke="#b9512f" strokeWidth="4" strokeLinecap="round" />
        <circle cx="27" cy="13" r="7" fill="#d9663f" />
        <circle cx="93" cy="13" r="7" fill="#d9663f" />
        <path d="M24,10 l6,4 M96,10 l-6,4" stroke="#8f3a1f" strokeWidth="1.5" />
        <ellipse cx="60" cy="36" rx="24" ry="15" fill="#e2744c" />
        <ellipse cx="60" cy="32" rx="18" ry="8" fill="#ec8c66" />
        <circle cx="53" cy="24" r="2.4" fill="#132a3d" />
        <circle cx="67" cy="24" r="2.4" fill="#132a3d" />
      </>
    );
  } else art = <Fin f={FIN.bangude} clip={clip} />;

  return (
    <svg viewBox="0 0 120 64" className={className} role="img" aria-hidden>
      {art}
    </svg>
  );
}
