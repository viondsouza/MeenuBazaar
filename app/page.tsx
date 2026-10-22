import Image from "next/image";
import Shop from "./Shop";
import { FishMark, WhatsAppIcon } from "./icons";
import { whatsappLink } from "@/lib/whatsapp";
import { AREAS } from "@/lib/areas";
import { PHOTO_CREDITS } from "@/lib/fish";

const STEPS = [
  { emoji: "🐟", title: "Pick your fish", text: "See today's catch from Mangaluru boats, at the price the boat owner set." },
  { emoji: "💬", title: "Order on WhatsApp", text: "Choose the kg, cleaning and your area. Tap the button and send. The bot confirms the total." },
  { emoji: "🛵", title: "Pay and receive", text: "Pay the boat by UPI. Fresh fish, iced and cleaned, at your door in 2–3 hours." },
];

const FAQ = [
  {
    q: "How do I pay?",
    a: "By UPI, straight to the boat owner. After you reply YES on WhatsApp, the bot sends you the total and the UPI ID.",
  },
  {
    q: "Can you clean and cut the fish?",
    a: "Yes. Tick “Cleaned” on the card, or write “cleaned” in your WhatsApp message. A partner vendor at the harbour cleans it before delivery.",
  },
  {
    q: "How fresh is it?",
    a: "Every listing shows the boat and when it was posted. Our checker at Bunder looks at the fish before it is packed in ice.",
  },
  {
    q: "Where do you deliver?",
    a: `Across Mangaluru: ${AREAS.map((a) => a.name).join(", ")}. Choose your area above the fish so it goes into your order.`,
  },
  {
    q: "I'm a boat owner. How do I sell?",
    a: "Send your catch on WhatsApp, like “bangude 50 220” (fish, kg, price per kg). Reply YES and it goes live on this board.",
  },
];

export default function Home() {
  const chat = whatsappLink("Hi MeenuBazaar! What fish do you have today?");
  const sell = whatsappLink("bangude 50 220");
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
            <a href="#delivery">Delivery</a>
            <a href="#how">How it works</a>
            <a href="#sell">Boat owners</a>
            <a href="#faq">FAQ</a>
          </nav>
          {chat && (
            <a className="btn btn-small" href={chat} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={16} /> Chat
            </a>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <Image src="/photos/harbour.jpg" alt="Colourful fishing boats at Mangaluru harbour" fill priority sizes="100vw" />
          <div className="hero-shade" />
          <div className="wrap hero-inner">
            <p className="eyebrow eyebrow-light">Fresh from Mangaluru Bunder</p>
            <h1>
              Fish straight from the boat, <em>at the boat owner&apos;s price.</em>
            </h1>
            <p className="lede">
              No middlemen. See live prices from local boats, order on WhatsApp, and get it cleaned and delivered
              across Mangaluru.
            </p>
            <div className="hero-actions">
              <a className="btn btn-light" href="#catch">
                See today&apos;s catch
              </a>
              {chat && (
                <a className="btn btn-whatsapp" href={chat} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> Order on WhatsApp
                </a>
              )}
            </div>
            <ul className="trust">
              <li>⛵ Straight from local boats</li>
              <li>🔪 Cleaned on request</li>
              <li>💸 Pay the boat by UPI</li>
            </ul>
          </div>
        </section>

        <section id="catch" className="wrap section">
          <Shop />
        </section>

        <section id="delivery" className="wrap section">
          <div className="delivery">
            <div>
              <p className="eyebrow">Delivery</p>
              <h2 className="section-title">From Bunder to your door</h2>
              <p className="muted">
                The boats land at Mangaluru&apos;s Old Port (Bunder) before dawn. Your fish is checked, iced, cleaned if
                you like, and delivered in 2–3 hours.
              </p>
              <ul className="area-chips">
                {AREAS.map((a) => (
                  <li key={a.name}>{a.name}</li>
                ))}
              </ul>
            </div>
            <div className="map">
              <iframe
                title="Map of Mangaluru Old Port (Bunder)"
                src="https://www.google.com/maps?q=Mangalore+Old+Port+Bunder&z=14&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

        <section id="how" className="wrap section">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title">Three taps, one WhatsApp message</h2>
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
              <p className="muted">
                Send the fish, kg and your price on WhatsApp. We read it, you reply <strong>YES</strong>, and it goes
                live on this board for buyers across Mangaluru. You set the price. You get paid by UPI the same day.
              </p>
              {sell && (
                <a className="btn" href={sell} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> Post my catch
                </a>
              )}
            </div>
            <div className="chat" aria-label="Example WhatsApp chat">
              <p className="bubble bubble-out">bangude 50 220</p>
              <p className="bubble bubble-in">
                Please check your catch:
                <br />• Bangude: 50 kg at ₹220/kg
                <br />
                Reply <strong>YES</strong> to put it live.
              </p>
              <p className="bubble bubble-out">YES</p>
              <p className="bubble bubble-in">✅ Live on the MeenuBazaar board now.</p>
            </div>
          </div>
        </section>

        <section id="faq" className="wrap section">
          <p className="eyebrow">Questions</p>
          <h2 className="section-title">Good to know</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-top">
            <span className="brand brand-small">
              <FishMark size={24} />
              <span>MeenuBazaar</span>
            </span>
            <span>Prices are set by boat owners and update live. Orders are confirmed on WhatsApp.</span>
          </div>
          <p className="credits">
            Photos from Wikimedia Commons:{" "}
            {Object.entries(PHOTO_CREDITS).map(([key, c], i, all) => (
              <span key={key}>
                <a href={c.source} target="_blank" rel="noopener noreferrer">
                  {key === "harbour" ? "harbour" : key}
                </a>{" "}
                by {c.author} ({c.license}){i < all.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </div>
      </footer>
    </>
  );
}
