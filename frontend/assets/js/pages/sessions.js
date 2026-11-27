import { api } from "../api.js";
import { requireLogin } from "../auth.js";
import { renderNavbar, renderTable, renderPager, badge, formatRupiah, formatTanggal, formatDurasi, handleApiError, setFieldError, clearFieldErrors } from "../ui.js";
import { el } from "../dom.js";
import { validasiUid } from "../validators.js";

requireLogin();
renderNavbar("sessions");

const LIMIT = 20;
let offset = 0, uid = "", status = "";
const form = document.getElementById("filter");

async function load() {
  try {
    const data = await api("/api/sessions", { query: { uid, status, limit: LIMIT, offset } });
    renderTable(
      document.getElementById("table"),
      [
        { label: "UID", render: (r) => el("span", "font-mono text-xs", r.uid) },
        { label: "Masuk", render: (r) => formatTanggal(r.entry_time) },
        { label: "Keluar", render: (r) => formatTanggal(r.exit_time) },
        { label: "Durasi", render: (r) => formatDurasi(r.entry_time, r.exit_time) },
        { label: "Tarif", render: (r) => r.fee == null ? "-" : formatRupiah(r.fee) },
        { label: "Status", render: (r) => r.status === "open" ? badge("Di dalam", "active") : badge("Sudah keluar", "neutral") },
      ],
      data.items,
      "Belum ada sesi parkir."
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
  status = document.getElementById("f-status").value;
  offset = 0;
  load();
});

load();
