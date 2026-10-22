import { orderText, whatsappLink } from "./whatsapp";

// Which chat app the site sends customers to. For the Telegram demo, set
// NEXT_PUBLIC_TELEGRAM_BOT_USERNAME (e.g. MeenuBazaarBot); otherwise it's WhatsApp.
const telegramBot = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "").trim().replace(/^@/, "");

export const CHANNEL: "Telegram" | "WhatsApp" = telegramBot ? "Telegram" : "WhatsApp";

// Open a chat with the bot. WhatsApp can pre-type a message; Telegram links can't.
export function chatLink(text?: string) {
  return telegramBot ? `https://t.me/${telegramBot}` : whatsappLink(text);
}

// Open the bot with an order. Telegram can't pre-type a message, so the order travels as a
// start code, e.g. t.me/Bot?start=order-bangude-1_5-c-kankanady; the n8n workflow turns it
// back into "Order 1.5 kg bangude cleaned. Deliver to: Kankanady".
export function orderLink(kg: number, fishKey: string, fishName: string, cleaned: boolean, area: string) {
  if (!telegramBot) return whatsappLink(orderText(kg, fishName, cleaned, area));
  const parts = ["order", fishKey, String(kg).replace(".", "_"), cleaned ? "c" : "n"];
  const areaCode = area.toLowerCase().replace(/[^a-z]/g, "");
  if (areaCode) parts.push(areaCode);
  return `https://t.me/${telegramBot}?start=${parts.join("-").slice(0, 64)}`;
}
