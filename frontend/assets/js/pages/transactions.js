import { api } from "../api.js";
import { requireLogin } from "../auth.js";
import { renderNavbar, renderTable, renderPager, badge, formatRupiah, formatTanggal, handleApiError, setFieldError, clearFieldErrors } from "../ui.js";
import { el } from "../dom.js";
import { validasiUid } from "../validators.js";

requireLogin();
renderNavbar("transactions");

const LIMIT = 20;
let offset = 0, uid = "", type = "";
const form = document.getElementById("filter");

function jumlah(r) {
  const masuk = r.type === "topup";
  return el("span", `font-semibold ${masuk ? "text-ok" : "text-danger"}`, (masuk ? "+" : "-") + formatRupiah(r.amount));
}

async function load() {
  try {
    const data = await api("/api/transactions", { query: { uid, type, limit: LIMIT, offset } });
    renderTable(
      document.getElementById("table"),
      [
        { label: "Waktu", render: (r) => formatTanggal(r.created_at) },
        { label: "UID", render: (r) => el("span", "font-mono text-xs", r.uid) },
        { label: "Jenis", render: (r) => r.type === "topup" ? badge("Top-up", "success") : badge("Tarif parkir", "warning") },
        { label: "Jumlah", render: jumlah },
        { label: "Saldo sebelum", render: (r) => formatRupiah(r.balance_before) },
        { label: "Saldo sesudah", render: (r) => el("span", "font-semibold", formatRupiah(r.balance_after)) },
        { label: "Status", render: (r) => r.status === "success" ? badge("Berhasil", "success") : badge(r.status, "neutral") },
        { label: "Oleh", render: (r) => r.performed_by ?? "-" },
      ],
      data.items,
      "Belum ada transaksi."
    );
    renderPager(document.getElementById("pager"), { total: data.total, limit: LIMIT, offset, onChange: (o) => { offset = o; load(); } });
  } catch (err) {
    handleApiError(err);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearFieldErrors(form);
  const input = document.getElementById("f-uid");
  if (input.value.trim()) {
    const v = validasiUid(input.value);
    if (!v.ok) { setFieldError(input, v.message); return; }
    uid = v.value;
  } else uid = "";
  type = document.getElementById("f-type").value;
  offset = 0;
  load();
});

load();
