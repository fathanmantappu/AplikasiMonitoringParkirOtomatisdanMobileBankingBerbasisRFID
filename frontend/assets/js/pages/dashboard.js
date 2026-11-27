import { api } from "../api.js";
import { requireLogin, getUsername } from "../auth.js";
import { renderNavbar, renderTable, formatTanggal, formatDurasi, handleApiError } from "../ui.js";
import { el } from "../dom.js";

requireLogin();
renderNavbar("dashboard");
document.getElementById("greeting").textContent = `Halo, ${getUsername()}. Ini ringkasan parkir hari ini.`;

function statBox(label, value, box, num) {
  const b = el("div", `rounded-2xl border p-5 ${box}`);
  b.append(el("p", `text-3xl font-extrabold ${num}`, String(value)), el("p", "mt-1 text-sm text-muted", label));
  return b;
}

try {
  const [cards, open] = await Promise.all([
    api("/api/cards", { query: { limit: 200 } }),
    api("/api/sessions", { query: { status: "open", limit: 200 } }),
  ]);
  const aktif = cards.items.filter((c) => c.status === "active").length;
  document.getElementById("stats").append(
    statBox("Kartu terdaftar", cards.total, "border-brand-light bg-brand-mint", "text-brand-dark"),
    statBox("Kartu aktif", aktif, "border-line bg-white", "text-ok"),
    statBox("Kartu diblokir", cards.items.length - aktif, "border-red-200 bg-red-50", "text-danger"),
    statBox("Kendaraan di dalam", open.total, "border-amber-200 bg-amber-50", "text-amber-700")
  );

  const nama = Object.fromEntries(cards.items.map((c) => [c.uid, c.owner_name]));
  renderTable(
    document.getElementById("open-sessions"),
    [
      { label: "UID", render: (r) => el("span", "font-mono text-xs", r.uid) },
      { label: "Pemilik", render: (r) => nama[r.uid] ?? "-" },
      { label: "Waktu masuk", render: (r) => formatTanggal(r.entry_time) },
      { label: "Sudah parkir", render: (r) => formatDurasi(r.entry_time) },
    ],
    open.items,
    "Tidak ada kendaraan di dalam."
  );
} catch (err) {
  handleApiError(err);
}
