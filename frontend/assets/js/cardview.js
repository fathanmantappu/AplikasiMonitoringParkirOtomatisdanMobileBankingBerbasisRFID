import { el } from "./dom.js";
import { brandOf, brandMark } from "./brands.js";
import { formatRupiah } from "./ui.js";

const groupUid = (uid) => String(uid).replace(/(.{4})/g, "$1 ").trim();

/** Kartu visual. `action` (opsional) = elemen tombol di kiri bawah. */
export function buildCard(card, { action } = {}) {
  const blocked = card.status === "blocked";
  const root = el(
    "article",
    "relative overflow-hidden rounded-2xl p-5 text-white shadow-md " +
      (blocked ? "bg-gradient-to-br from-gray-600 to-gray-500" : "bg-gradient-to-br from-brand-dark to-ok")
  );
  root.append(
    el("div", "pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-light/20"),
    el("div", "pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-white/10")
  );

  const body = el("div", "relative flex flex-col gap-4");

  const top = el("div", "flex items-start justify-between");
  top.append(
    el("div", "h-7 w-10 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 ring-1 ring-amber-500/40"),
    el(
      "span",
      "rounded-full px-2.5 py-0.5 text-xs font-semibold " +
        (blocked ? "bg-white/90 text-danger" : "bg-brand-light text-brand-dark"),
      blocked ? "Diblokir" : "Aktif"
    )
  );

  const saldo = el("div");
  saldo.append(el("p", "text-xs text-white/80", "Saldo"), el("p", "text-2xl font-bold", formatRupiah(card.balance)));

  const bottom = el("div", "flex items-end justify-between gap-3");
  const left = el("div", "min-w-0");
  if (action) left.appendChild(action);
  bottom.append(left, brandMark(brandOf(card)));

  body.append(
    top,
    el("p", "font-mono text-lg tracking-widest", groupUid(card.uid)),
    el("p", "truncate text-sm font-semibold", card.owner_name),
    saldo,
    bottom
  );
  root.appendChild(body);
  return root;
}
