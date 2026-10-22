import { TopBar } from "../_ui/bits";
import credits from "@/lib/photo-credits.json";

const NAMES: Record<string, string> = {
  bangude: "Bangude (Indian mackerel)", bhutai: "Bhutai (Oil sardine)", anjal: "Anjal (Seer fish)",
  maanji: "Maanji (White pomfret)", "kappu-maanji": "Kappu Maanji (Black pomfret)", kane: "Kane (Ladyfish)",
  balchatte: "Balchatte (Ribbon fish)", kedar: "Kedar (Tuna)", modhe: "Modhe (Mullet)", etti: "Etti (Prawns)",
  "tiger-etti": "Tiger Etti (Tiger prawns)", denji: "Denji (Crab)", bondas: "Bondas (Squid)", marvai: "Marvai (Clams)",
  harbour: "Fishing trawler off Mangaluru",
};

// The photos are from Wikimedia Commons; their free licences ask us to name the photographer.
export default function CreditsPage() {
  return (
    <div className="pad">
      <TopBar title="Photo credits" sub="Photos from Wikimedia Commons" />
      <ul className="credits">
        {Object.entries(credits as Record<string, { author: string; license: string; source: string }>).map(([key, c]) => (
          <li key={key}>
            <strong>{NAMES[key] ?? key}</strong>
            <span>
              by {c.author === "Unknown" ? "a Wikimedia Commons contributor" : c.author} ·{" "}
              <a href={c.source} target="_blank" rel="noopener noreferrer">
                {c.license}
              </a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
