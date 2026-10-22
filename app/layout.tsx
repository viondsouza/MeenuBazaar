import type { Metadata, Viewport } from "next";
import { Noto_Sans_Kannada, Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import BottomNav from "./_ui/BottomNav";
import "./globals.css";

const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"] });
const kannada = Noto_Sans_Kannada({ variable: "--font-kn", subsets: ["kannada"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "MeenuBazaar · Fresh fish from Mangaluru boats",
  description: "Today's catch from Mangaluru, Malpe and Gangolli boats, cleaned and delivered on ice.",
};

export const viewport: Viewport = {
  themeColor: "#f3efe6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${kannada.variable}`}>
      <body>
        <div className="app">
          <main className="screen">{children}</main>
          <Suspense fallback={<nav className="bottom-nav" aria-label="Main" />}>
            <BottomNav />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
