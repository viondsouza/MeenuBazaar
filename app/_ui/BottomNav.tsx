"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { CartIcon, PricesIcon, ShopIcon } from "../icons";

const TABS = [
  { href: "/", label: "Shop", Icon: ShopIcon },
  { href: "/prices", label: "Prices", Icon: PricesIcon },
  { href: "/cart", label: "Cart", Icon: CartIcon },
];

export default function BottomNav() {
  const path = usePathname();
  const count = useCart().length;
  const active = (href: string) =>
    href === "/" ? path === "/" || path.startsWith("/fish") : path.startsWith(href) || (href === "/cart" && path.startsWith("/order"));

  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={`tab${active(href) ? " tab-on" : ""}`} aria-current={active(href) ? "page" : undefined}>
          <span className="tab-icon">
            <Icon />
            {href === "/cart" && count > 0 && <span className="tab-badge">{count}</span>}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
