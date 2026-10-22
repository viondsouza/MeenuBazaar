import PriceBoard from "./PriceBoard";
import { whatsappLink } from "@/lib/whatsapp";

function FishMark() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="var(--sea)" />
      <path
        d="M7 16c3-4.2 7-6 11-6 2.6 0 4.6 1 6 2.4l3-2.4v12l-3-2.4C22.6 21 20.6 22 18 22c-4 0-8-1.8-11-6Z"
        fill="#fff"
      />
      <circle cx="11.5" cy="15" r="1.2" fill="var(--sea)" />
    </svg>
  );
}

const STEPS = [
  { emoji: "🐟", title: "Pick your fish", text: "See today's catch from Mangaluru boats, with the price the boat owner set." },
  { emoji: "💬", title: "Order on WhatsApp", text: "Choose the kg and cleaning, tap the button, and send. We confirm the total." },
  { emoji: "🛵", title: "Pay and receive", text: "Pay the boat by UPI. Fresh fish, iced and cleaned, delivered to your door." },
];

export default function Home() {
  const chat = whatsappLink();
  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a href="#" className="brand">
            <FishMark />
            <span>MeenuBazaar</span>
          </a>
          <nav className="nav">
            <a href="#catch">Today&apos;s catch</a>
            <a href="#how">How it works</a>
            <a href="#sell">For boat owners</a>
          </nav>
          {chat && (
            <a className="btn btn-small" href={chat} target="_blank" rel="noopener noreferrer">
              Chat with us
            </a>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap">
            <p className="eyebrow">Fresh from Mangaluru Bunder</p>
            <h1>
              Fish straight from the boat,
              <br />
              at the boat owner&apos;s price.
            </h1>
            <p className="lede">
              No middlemen. See live prices from local boats, order on WhatsApp, and get it cleaned and
              delivered.
            </p>
            <div className="hero-actions">
              <a className="btn" href="#catch">
                See today&apos;s catch
              </a>
              <a className="btn btn-ghost" href="#how">
                How it works
              </a>
            </div>
          </div>
        </section>

        <section id="catch" className="wrap section">
          <PriceBoard />
        </section>

        <section id="how" className="wrap section">
          <h2 className="section-title">How it works</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-emoji" aria-hidden>
                  {s.emoji}
                </span>
                <span className="step-num">Step {i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="sell" className="wrap section">
          <div className="sell">
            <div>
              <p className="eyebrow">For boat owners</p>
              <h2 className="section-title">Sell your catch in one message</h2>
              <p className="sell-text">
                Send the fish, kg and your price on WhatsApp. We read it, you reply <strong>YES</strong>, and it
                goes live on this board for buyers across Mangaluru. You set the price. You get paid by UPI the
                same day.
              </p>
            </div>
            <div className="chat" aria-label="Example WhatsApp chat">
              <p className="bubble bubble-out">bangude 50 220</p>
              <p className="bubble bubble-in">
                Bangude, 50 kg at ₹220/kg.
                <br />
                Reply YES to put it on the board.
              </p>
              <p className="bubble bubble-out">YES</p>
              <p className="bubble bubble-in">✅ Live on MeenuBazaar now.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span className="brand brand-small">
            <FishMark />
            <span>MeenuBazaar</span>
          </span>
          <span>Prices are set by boat owners and update live. Orders are confirmed on WhatsApp.</span>
        </div>
      </footer>
    </>
  );
}
