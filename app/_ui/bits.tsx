"use client";

import Link from "next/link";
import { AREAS } from "@/lib/areas";
import { setArea, setLang, usePrefs } from "@/lib/prefs";
import { BackIcon, PinIcon } from "../icons";

// "Bangude ಬಂಗುಡೆ" in English mode; Kannada first in ಕನ್ನಡ mode.
export function FishName({ name, kn, as: Tag = "span" }: { name: string; kn: string | null; as?: "span" | "h1" | "h3" }) {
  const { lang } = usePrefs();
  if (lang === "kn" && kn) {
    return (
      <Tag className="fish-name">
        <span className="kn">{kn}</span> <span className="fish-name-alt">{name}</span>
      </Tag>
    );
  }
  return (
    <Tag className="fish-name">
      {name} {kn && <span className="kn fish-name-alt">{kn}</span>}
    </Tag>
  );
}

export function LangToggle() {
  const { lang } = usePrefs();
  return (
    <div className="lang" role="group" aria-label="Language">
      <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")} aria-pressed={lang === "en"}>
        EN
      </button>
      <button type="button" className={`kn${lang === "kn" ? " on" : ""}`} onClick={() => setLang("kn")} aria-pressed={lang === "kn"}>
        ಕನ್ನಡ
      </button>
    </div>
  );
}

export function AreaSelect({ compact = false }: { compact?: boolean }) {
  const { area } = usePrefs();
  return (
    <label className={`area${compact ? " area-compact" : ""}`}>
      <PinIcon size={16} />
      <span className="sr-only">Deliver to</span>
      <select value={area} onChange={(e) => setArea(e.target.value)}>
        <option value="">Choose delivery area</option>
        {AREAS.map((a) => (
          <option key={a.name} value={a.name}>
            Deliver to {a.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="MeenuBazaar home">
      Meenu<span>Bazaar</span>
    </Link>
  );
}

export function TopBar({ title, sub, back = "/" }: { title: string; sub?: React.ReactNode; back?: string }) {
  return (
    <header className="topbar">
      <Link href={back} className="icon-btn" aria-label="Back">
        <BackIcon />
      </Link>
      <div>
        <h1 className="topbar-title">{title}</h1>
        {sub && <p className="topbar-sub">{sub}</p>}
      </div>
    </header>
  );
}

// A small grey tag on anything that is demo data, so nobody mistakes it for real.
export function DemoTag() {
  return <span className="pill pill-demo">Demo listing</span>;
}

// A clear strip on the cart and order pages: this is a demo, nothing is really delivered.
export function DemoBanner() {
  return (
    <p className="demo-banner" role="note">
      <strong>Demo shop</strong> · sample boats and prices. No fish is delivered and nothing is charged.
    </p>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <p className="notice">{children}</p>;
}
