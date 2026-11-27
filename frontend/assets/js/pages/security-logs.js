import { api } from "../api.js";
import { requireAdmin } from "../auth.js";
import { renderNavbar, renderTable, renderPager, badge, formatTanggal, handleApiError } from "../ui.js";
import { el } from "../dom.js";

requireAdmin();
renderNavbar("security-logs");

const LIMIT = 20;
let offset = 0;

const EVENTS = {
  UNKNOWN_CARD: ["Kartu tidak dikenal", "warning"],
  BLOCKED_CARD: ["Kartu diblokir dipakai", "danger"],
  INVALID_API_KEY: ["API key salah", "danger"],
  LOGIN_FAILED: ["Login gagal", "warning"],
  UNAUTHORIZED_TOPUP: ["Top-up tanpa izin", "danger"],
  INVALID_TOKEN: ["Token tidak valid", "danger"],
  EXIT_WITHOUT_ENTRY: ["Keluar tanpa masuk", "warning"],
  DUPLICATE_EXIT: ["Keluar ganda", "warning"],
  INVALID_INPUT: ["Input tidak valid", "warning"],
};

function kejadian(r) {
  const known = EVENTS[r.event];
  const wrap = el("div", "flex items-center gap-2");
  if (!known) { wrap.appendChild(badge(r.event, "neutral")); return wrap; }
  wrap.append(badge(known[0], known[1]), el("span", "font-mono text-xs text-muted", r.event));
  return wrap;
}

async function load() {
  try {
    const data = await api("/api/security-logs", { query: { limit: LIMIT, offset } });
    renderTable(
      document.getElementById("table"),
      [
        { label: "Waktu", render: (r) => formatTanggal(r.created_at) },
        { label: "Kejadian", render: kejadian },
        { label: "Detail", render: (r) => r.detail },
        { label: "IP", render: (r) => el("span", "font-mono text-xs", r.ip_address) },
      ],
      data.items,
      "Belum ada kejadian keamanan tercatat."
    );
    renderPager(document.getElementById("pager"), { total: data.total, limit: LIMIT, offset, onChange: (o) => { offset = o; load(); } });
  } catch (err) {
    handleApiError(err);
  }
}

load();
