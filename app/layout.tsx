import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Fraunces: warm, characterful headings. Plus Jakarta Sans: clear body text on small phones.
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MeenuBazaar · Fresh fish from Mangaluru boats",
  description: "Live prices from Mangaluru boats. Pick your fish, choose your area and order on WhatsApp.",
};

export const viewport: Viewport = {
  themeColor: "#0b6e79",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
