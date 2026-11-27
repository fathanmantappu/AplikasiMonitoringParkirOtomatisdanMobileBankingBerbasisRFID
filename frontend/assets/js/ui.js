import { getRole, getUsername, logout } from "./auth.js";
import { USE_MOCK } from "./config.js";
import { el, icon } from "./dom.js";
import { cls } from "./styles.js";
import { confirmDialog } from "./modal.js";

export { cls };

/* ---------- Format ---------- */

export function formatRupiah(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export function formatTanggal(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return "-";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute} WIB`;
}

export function formatDurasi(startIso, endIso) {
  const s = new Date(startIso);
  const e = endIso ? new Date(endIso) : new Date();
  if (isNaN(s) || isNaN(e)) return "-";
  const min = Math.max(0, Math.round((e - s) / 60000));
  if (min < 1) return "< 1 menit";
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} menit`;
  return m ? `${h} jam ${m} menit` : `${h} jam`;
}

/* ---------- Toast ---------- */

const TOAST = {
  success: "bg-ok text-white",
  danger: "bg-danger text-white",
  warning: "bg-warn text-ink",
  info: "bg-brand-dark text-white",
};

export function showToast(message, type = "success") {
  let box = document.getElementById("toast-box");
  if (!box) {
    box = el("div", "fixed right-4 top-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2");
    box.id = "toast-box";
    document.body.appendChild(box);
  }
  const t = el("div", `flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${TOAST[type] || TOAST.info}`);
  t.setAttribute("role", "alert");
  const close = el("button", "ml-auto shrink-0 opacity-80 hover:opacity-100");
  close.type = "button";
  close.setAttribute("aria-label", "Tutup");
  close.appendChild(icon("x", "h-4 w-4"));
  close.addEventListener("click", () => t.remove());
  t.append(el("span", "flex-1", message), close);
  box.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// Pesan sekali tampil, dipakai setelah redirect (mis. sesi habis).
export function showFlash() {
  const msg = sessionStorage.getItem("flash");
  if (msg) {
    sessionStorage.removeItem("flash");
    showToast(msg, "warning");
  }
}

/* ---------- Error API -> pesan Indonesia ---------- */

export function pesanError(err) {
  const byCode = {
    INVALID_CREDENTIALS: "Username atau password salah.",
    TOO_MANY_ATTEMPTS: "Terlalu banyak percobaan, coba lagi beberapa menit.",
    UID_EXISTS: "Kartu ini sudah terdaftar. Cek daftar kartu atau periksa kembali UID.",
    CARD_NOT_FOUND: "Kartu tidak ditemukan. Pilih kartu yang sudah terdaftar.",
    CARD_BLOCKED: "Kartu ini sedang diblokir. Aktifkan kembali sebelum mengisi saldo.",
    FORBIDDEN: "Akun Anda tidak berhak melakukan ini.",
  };
  if (byCode[err.code]) return byCode[err.code];
  if (err.status === 403) return byCode.FORBIDDEN;
  if (err.status === 429) return byCode.TOO_MANY_ATTEMPTS;
  if (err.status === 400 && err.message) return err.message;
  return "Server tidak dapat dihubungi. Coba lagi.";
}

export function handleApiError(err, onField) {
  if (err && err.redirected) return;
  const msg = pesanError(err || {});
  if (err && err.status === 400 && onField) onField(msg);
  else showToast(msg, "danger");
}

/* ---------- Form helpers ---------- */

export function setFieldError(input, message) {
  input.classList.add("!border-danger");
  input.dataset.invalid = "true";
  let fb = input.parentElement.querySelector(`[data-error-for="${input.id}"]`);
  if (!fb) {
    fb = el("p", "mt-1 text-sm text-danger");
    fb.dataset.errorFor = input.id;
    input.insertAdjacentElement("afterend", fb);
  }
  fb.textContent = message;
}

export function clearFieldErrors(container) {
  container.querySelectorAll("[data-invalid]").forEach((i) => {
    i.classList.remove("!border-danger");
    delete i.dataset.invalid;
  });
  container.querySelectorAll("[data-error-for]").forEach((p) => p.remove());
}

export function setLoading(button, loading, loadingText = "Memproses...") {
  if (loading) {
    button.dataset.label = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

/* ---------- Badge, tabel, pager ---------- */

const BADGE = {
  success: "bg-brand-mint text-ok ring-1 ring-brand-light",
  active: "bg-brand-light text-brand-dark",
  danger: "bg-red-50 text-danger ring-1 ring-red-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  neutral: "bg-gray-100 text-muted ring-1 ring-line",
};

export function badge(text, kind = "neutral") {
  return el("span", `inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[kind] || BADGE.neutral}`, text);
}

/**
 * columns: [{ label, render: (row) => string | Node }]
 * Teks lewat textContent; Node hanya untuk elemen yang kita buat sendiri.
 */
export function renderTable(container, columns, rows, emptyText = "Belum ada data.") {
  container.replaceChildren();
  const wrap = el("div", "overflow-x-auto rounded-2xl border border-line bg-white shadow-sm");
  const table = el("table", "min-w-full text-sm");
  const thead = el("thead", "bg-brand-mint text-left text-brand-dark");
  const hr = el("tr");
  columns.forEach((c) => hr.appendChild(el("th", "whitespace-nowrap px-4 py-3 font-semibold", c.label)));
  thead.appendChild(hr);

  const tbody = el("tbody", "divide-y divide-line");
  if (!rows.length) {
    const tr = el("tr");
    const td = el("td", "px-4 py-10 text-center text-muted", emptyText);
    td.colSpan = columns.length;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  rows.forEach((row) => {
    const tr = el("tr", "transition hover:bg-page");
    columns.forEach((c) => {
      const td = el("td", "whitespace-nowrap px-4 py-3 text-ink");
      const v = c.render(row);
      if (v instanceof Node) td.appendChild(v);
      else td.textContent = v ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);
}

export function renderPager(container, { total, limit, offset, onChange }) {
  container.replaceChildren();
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  const wrap = el("div", "flex items-center justify-between gap-2");
  const btns = el("div", "flex gap-2");
  const mk = (label, disabled, target) => {
    const b = el("button", cls.btnOutline + " !px-3 !py-1.5", label);
    b.type = "button";
    b.disabled = disabled;
    b.addEventListener("click", () => onChange(target));
    return b;
  };
  btns.append(mk("Sebelumnya", offset <= 0, Math.max(0, offset - limit)), mk("Berikutnya", offset + limit >= total, offset + limit));
  wrap.append(el("span", "text-sm text-muted", `Halaman ${page} dari ${pages} (${total} data)`), btns);
  container.appendChild(wrap);
}

/* ---------- Navbar ---------- */

const MENU = [
  { id: "dashboard", href: "dashboard.html", label: "Dashboard" },
  { id: "cards", href: "cards.html", label: "Kartu" },
  { id: "topup", href: "topup.html", label: "Top-up", adminOnly: true },
  { id: "transactions", href: "transactions.html", label: "Riwayat" },
  { id: "sessions", href: "sessions.html", label: "Sesi parkir" },
  { id: "security-logs", href: "security-logs.html", label: "Security log", adminOnly: true },
];

export function renderNavbar(activeId) {
  const host = document.getElementById("navbar");
  if (!host) return;
  const isAdmin = getRole() === "admin";
  const items = MENU.filter((m) => isAdmin || !m.adminOnly);

  const header = el("header", "relative z-30 bg-brand-dark text-white shadow");
  const bar = el("div", "mx-auto flex max-w-6xl items-center gap-4 px-4 py-3");

  const brand = el("a", "flex items-center gap-2 text-lg font-bold");
  brand.href = "dashboard.html";
  const logo = el("span", "flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-ink");
  logo.appendChild(icon("card", "h-5 w-5"));
  brand.append(logo, el("span", "", "e-Money Gate"));

  const link = (m, mobile) => {
    const a = el(
      "a",
      (mobile ? "block " : "") +
        "rounded-lg px-3 py-2 text-sm font-medium transition " +
        (m.id === activeId ? "bg-white/20 text-white" : "text-brand-light hover:bg-white/10 hover:text-white"),
      m.label
    );
    a.href = m.href;
    if (m.id === activeId) a.setAttribute("aria-current", "page");
    return a;
  };

  const menu = el("nav", "hidden flex-1 items-center gap-1 md:flex");
  items.forEach((m) => menu.appendChild(link(m, false)));

  /* Avatar + menu akun */
  const right = el("div", "relative ml-auto flex items-center gap-2");
  const avatar = el(
    "button",
    "flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-mint text-brand-dark ring-2 ring-brand-light transition hover:ring-white focus:outline-none focus-visible:ring-white"
  );
  avatar.type = "button";
  avatar.setAttribute("aria-label", "Menu akun");
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-expanded", "false");
  avatar.appendChild(icon("user", "mt-2 h-8 w-8"));

  const dropdown = el("div", "absolute right-0 top-12 z-40 hidden w-60 rounded-xl border border-line bg-white p-2 text-ink shadow-lg");
  dropdown.setAttribute("role", "menu");
  const info = el("div", "px-3 py-2");
  info.append(el("p", "truncate text-sm font-bold", getUsername() || "-"), el("p", "text-xs text-muted", isAdmin ? "Admin" : "Operator"));
  const logoutBtn = el("button", "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-danger transition hover:bg-red-50");
  logoutBtn.type = "button";
  logoutBtn.setAttribute("role", "menuitem");
  logoutBtn.append(icon("logout", "h-4 w-4"), el("span", "", "Keluar"));
  dropdown.append(info, el("div", "my-1 h-px bg-line"), logoutBtn);

  const setOpen = (open) => {
    dropdown.classList.toggle("hidden", !open);
    avatar.setAttribute("aria-expanded", String(open));
  };
  avatar.addEventListener("click", (e) => { e.stopPropagation(); setOpen(dropdown.classList.contains("hidden")); });
  document.addEventListener("click", (e) => { if (!dropdown.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  logoutBtn.addEventListener("click", async () => {
    setOpen(false);
    const yes = await confirmDialog({
      title: "Keluar dari akun?",
      message: "Anda yakin ingin keluar?",
      confirmText: "Ya, keluar",
      danger: true,
    });
    if (yes) logout();
  });

  /* Menu mobile */
  const toggle = el("button", "rounded-lg p-2 hover:bg-white/10 md:hidden");
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Buka menu");
  toggle.appendChild(icon("menu", "h-6 w-6"));
  const mobile = el("nav", "hidden border-t border-white/10 px-4 pb-3 pt-2 md:hidden");
  items.forEach((m) => mobile.appendChild(link(m, true)));
  toggle.addEventListener("click", () => mobile.classList.toggle("hidden"));

  right.append(avatar, dropdown, toggle);
  bar.append(brand, menu, right);
  header.append(bar, mobile);
  host.replaceChildren(header);

  if (USE_MOCK) {
    host.appendChild(
      el("div", "border-b border-amber-200 bg-amber-50 py-1.5 text-center text-xs font-medium text-amber-800", "Mode data tiruan: belum terhubung ke backend.")
    );
  }
  showFlash();
}
