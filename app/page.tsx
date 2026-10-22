import PriceBoard from "./PriceBoard";

export default function Home() {
  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Mangaluru · Bunder</p>
        <h1>MeenuBazaar</h1>
        <p className="lede">
          Fresh catch straight from the boat, at the price the boat owner sets. Tap a fish to order on WhatsApp.
        </p>
      </header>
      <PriceBoard />
      <footer className="footer">
        Prices are set by the boat owners and update live. Orders are confirmed on WhatsApp.
      </footer>
    </main>
  );
}
