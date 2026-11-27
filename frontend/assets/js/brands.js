import { el, icon } from "./dom.js";

// Penanda merek hanya untuk tampilan (bukan logo resmi).
export const BRANDS = {
  brizzi: { name: "BRIZZI", bg: "#0F4C9A", fg: "#FFFFFF" },
  flazz: { name: "Flazz", bg: "#FFFFFF", fg: "#0B63CE" },
  emoney: { name: "e-money", bg: "#FFC20E", fg: "#0A2E6E" },
  tapcash: { name: "TapCash", bg: "#F97316", fg: "#FFFFFF" },
  jakcard: { name: "JakCard", bg: "#DC2626", fg: "#FFFFFF" },
};
const KEYS = Object.keys(BRANDS);

// Pakai card.brand bila backend menyediakannya; jika tidak, tentukan dari UID
// supaya satu kartu selalu tampil dengan merek yang sama.
export function brandOf(card) {
  if (card && BRANDS[card.brand]) return card.brand;
  let h = 0;
  for (const ch of String((card && card.uid) || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return KEYS[h % KEYS.length];
}

export function brandMark(key) {
  const b = BRANDS[key];
  const m = el("span", "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-extrabold italic tracking-wide shadow-sm");
  m.style.backgroundColor = b.bg;
  m.style.color = b.fg;
  m.title = b.name;
  m.append(icon("wave", "h-3.5 w-3.5"), el("span", "", b.name));
  return m;
}

// Sumber dana untuk simulasi top-up (belum terhubung ke layanan apa pun).
export const PAYMENT_SOURCES = [
  { id: "gopay", name: "GoPay", short: "GP", color: "#00AED6" },
  { id: "shopeepay", name: "ShopeePay", short: "SP", color: "#EE4D2D" },
  { id: "dana", name: "DANA", short: "DA", color: "#118EEA" },
  { id: "ovo", name: "OVO", short: "OVO", color: "#4C2A86" },
  { id: "linkaja", name: "LinkAja", short: "LA", color: "#E82529" },
];
