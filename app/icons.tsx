import { CHANNEL } from "@/lib/chat";

export function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="currentColor">
      <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13 1.4 11.5c-1-.3-1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5Z" />
    </svg>
  );
}

// The icon of whichever chat app the site is using (see lib/chat.ts).
export function ChatIcon({ size = 18 }: { size?: number }) {
  return CHANNEL === "Telegram" ? <TelegramIcon size={size} /> : <WhatsAppIcon size={size} />;
}

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-1.5-.7-2.3-1.5-.6-.6-1-1.2-1.2-1.6-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.7 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

export function FishMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="var(--sea)" />
      <path
        d="M7 16c3-4.2 7-6 11-6 2.6 0 4.6 1 6 2.4l3-2.4v12l-3-2.4C22.6 21 20.6 22 18 22c-4 0-8-1.8-11-6Z"
        fill="#fff"
      />
      <circle cx="11.5" cy="15" r="1.2" fill="var(--sea)" />
    </svg>
  );
}

// Line icons for the bottom navigation and buttons (24×24, use currentColor).
function Line({ size = 22, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const ShopIcon = (p: { size?: number }) => (
  <Line {...p}><path d="M4 9h16l-1 11H5L4 9Z" /><path d="M3 9l2-5h14l2 5" /><path d="M9 13h6" /></Line>
);
export const PricesIcon = (p: { size?: number }) => (
  <Line {...p}><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 4-4 3 3 5-6" /></Line>
);
export const SellIcon = (p: { size?: number }) => (
  <Line {...p}><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" /><path d="M8 12c2-3 6-3 8 0-2 3-6 3-8 0Z" /></Line>
);
export const CartIcon = (p: { size?: number }) => (
  <Line {...p}><circle cx="9" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /><path d="M3 4h2l2.4 11h10.8L21 7H6.2" /></Line>
);
export const BoatIcon = (p: { size?: number }) => (
  <Line {...p}><path d="M3 16h18l-2.5 4h-13L3 16Z" /><path d="M12 3v13" /><path d="M12 4l6 9h-6" /><path d="M12 6l-5 7h5" /></Line>
);
export const BackIcon = (p: { size?: number }) => (
  <Line {...p}><path d="m15 5-7 7 7 7" /></Line>
);
export const SearchIcon = (p: { size?: number }) => (
  <Line {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Line>
);
export const PinIcon = (p: { size?: number }) => (
  <Line {...p}><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></Line>
);
export const TruckIcon = (p: { size?: number }) => (
  <Line {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></Line>
);
export const PlusIcon = (p: { size?: number }) => (
  <Line {...p}><path d="M12 5v14M5 12h14" /></Line>
);
export const CheckIcon = (p: { size?: number }) => (
  <Line {...p}><path d="m5 12 5 5 9-10" /></Line>
);
export const TrashIcon = (p: { size?: number }) => (
  <Line {...p}><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></Line>
);
