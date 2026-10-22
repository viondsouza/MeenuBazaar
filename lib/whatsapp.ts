// The MeenuBazaar WhatsApp number customers order on: digits only, e.g. 15551234567.
const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

// A link that opens WhatsApp with the message already typed. Empty until the number is set.
export function whatsappLink(text?: string) {
  if (!number) return "";
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// The order message the bot reads, e.g. "Hi MeenuBazaar! Order 1 kg Bangude cleaned.\nDeliver to: Bejai"
export function orderText(kg: number, fishName: string, cleaned: boolean, area: string) {
  return `Hi MeenuBazaar! Order ${kg} kg ${fishName}${cleaned ? " cleaned" : ""}.${area ? `\nDeliver to: ${area}` : ""}`;
}
