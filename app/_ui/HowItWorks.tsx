import Link from "next/link";
import { TopBar } from "./bits";

const STEPS = [
  {
    icon: "💬",
    title: "The boat owner sends the catch",
    text: "One chat message on WhatsApp (or Telegram), like “bangude 50 220”: fish, kg and price per kg.",
  },
  {
    icon: "🤖",
    title: "AI reads it and checks the price",
    text: "Google Gemini turns the message into clean data and repeats it back for a YES. A price far from the harbour rate (₹30 instead of ₹300) is held for staff.",
  },
  {
    icon: "⚖️",
    title: "Weighed and graded at the harbour",
    text: "Our checker weighs the catch and grades it. Grade A means firm flesh, bright eyes and red gills.",
  },
  {
    icon: "✨",
    title: "The best boat is picked for every fish",
    text: "Customers see one price per fish: the lowest, then the best grade, then the freshest. Big orders are split across boats automatically.",
  },
  {
    icon: "🛒",
    title: "Order, choose a slot, pay on delivery",
    text: "Pick whole, cleaned or fry cut, choose a delivery slot (the earliest free one first), and pay by UPI or cash at the door.",
  },
  {
    icon: "🌅",
    title: "Nothing goes to waste",
    text: "From 4 PM prices drop by 10% by themselves, so the day's catch sells fresh instead of going to fishmeal.",
  },
];

export default function HowItWorks() {
  return (
    <div className="pad page-in">
      <TopBar title="How MeenuBazaar works" sub="From the boat to your kitchen" />
      <ol className="how">
        {STEPS.map((s, i) => (
          <li key={s.title} style={{ "--i": i } as React.CSSProperties}>
            <span className="how-icon" aria-hidden>
              {s.icon}
            </span>
            <div>
              <p className="how-num">Step {i + 1}</p>
              <h2 className="h3 tight">{s.title}</h2>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="panel panel-dark">
        <p className="eyebrow">Built with</p>
        <p>Next.js and TypeScript · Supabase · n8n · Google Gemini through OpenRouter · WhatsApp Business / Telegram · Vercel</p>
      </div>
      <Link href="/" className="btn btn-coral btn-wide how-cta">
        Shop today&apos;s catch
      </Link>
    </div>
  );
}
