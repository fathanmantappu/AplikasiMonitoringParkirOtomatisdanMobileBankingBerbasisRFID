import { api } from "../api.js";
import { requireAdmin } from "../auth.js";
import { USE_MOCK } from "../config.js";
import {
  renderNavbar, formatRupiah, showToast, handleApiError, pesanError,
  setFieldError, clearFieldErrors, cls,
} from "../ui.js";
import { el, icon } from "../dom.js";
import { openModal } from "../modal.js";
import { buildCard } from "../cardview.js";
import { PAYMENT_SOURCES } from "../brands.js";
import { validasiUid, validasiNominal } from "../validators.js";

requireAdmin();
renderNavbar("topup");

const $ = (id) => document.getElementById(id);
const tabsBox = $("tabs"), panel = $("mode-panel"), preview = $("card-preview");
const form = $("topup-form"), amountInput = $("amount"), submitBtn = $("topup-btn");

const MODES = [
  { id: "list", label: "Kartu terdaftar" },
  { id: "scan", label: "Scan kartu" },
  { id: "manual", label: "Input nomor" },
];

let cards = [];          // maks. 200 kartu pertama (cukup untuk lingkup proyek)
let selected = null;
let mode = "list";
let busy = false;
let scanAbort = null;

/* ---------- Tab & panel pilihan kartu ---------- */

function renderTabs() {
  tabsBox.replaceChildren();
  MODES.forEach((m) => {
    const b = el(
      "button",
      "rounded-lg px-3 py-1.5 text-sm font-semibold transition " +
        (m.id === mode ? "bg-white text-brand-dark shadow-sm" : "text-muted hover:text-brand-dark"),
      m.label
    );
    b.type = "button";
    b.addEventListener("click", () => setMode(m.id));
    tabsBox.appendChild(b);
  });
}

function setMode(next) {
  if (scanAbort) { scanAbort.abort(); scanAbort = null; }
  mode = next;
  renderTabs();
  renderPanel();
}

function setMsg(node, text, tone) {
  node.textContent = text;
  node.className = "text-sm " + (tone === "error" ? "text-danger" : tone === "ok" ? "font-medium text-ok" : "text-muted");
}

function selectCard(card) {
  selected = card;
  renderPreview();
}

// Mengembalikan { ok, msg }. Pencarian dilakukan di daftar kartu yang sudah dimuat.
function pickByUid(raw) {
  const v = validasiUid(raw);
  if (!v.ok) { selectCard(null); return { ok: false, msg: v.message }; }
  const c = cards.find((x) => x.uid === v.value);
  if (!c) { selectCard(null); return { ok: false, msg: `Kartu ${v.value} belum terdaftar. Daftarkan dulu di menu Kartu.` }; }
  selectCard(c);
  return { ok: true };
}

function renderPanel() {
  panel.replaceChildren();

  if (mode === "list") {
    const label = el("label", cls.label, "Pilih kartu");
    label.htmlFor = "card-select";
    const select = el("select", cls.input);
    select.id = "card-select";
    select.add(new Option("Pilih kartu...", ""));
    cards.forEach((c) => {
      const o = new Option(`${c.uid} - ${c.owner_name}${c.status === "blocked" ? " [diblokir]" : ""}`, c.uid);
      o.disabled = c.status === "blocked";
      select.add(o);
    });
    if (selected) select.value = selected.uid;
    select.addEventListener("change", () => selectCard(cards.find((c) => c.uid === select.value) || null));
    panel.append(label, select);
    return;
  }

  if (mode === "scan") {
    const wrap = el("div", "flex flex-col items-center gap-3 py-2 text-center");
    const ring = el("div", "relative flex h-24 w-24 items-center justify-center");
    const ping = el("span", "absolute inline-flex h-full w-full rounded-full bg-brand/30");
    const core = el("span", "relative flex h-20 w-20 items-center justify-center rounded-full bg-brand text-ink");
    core.appendChild(icon("wave", "h-10 w-10"));
    ring.append(ping, core);
    const msg = el("p");
    setMsg(msg, "Tempelkan kartu ke perangkat, lalu tekan Mulai scan.", "muted");

    const row = el("div", "flex flex-wrap justify-center gap-2");
    const start = el("button", cls.btnPrimary, "Mulai scan");
    start.type = "button";
    row.appendChild(start);

    start.addEventListener("click", async () => {
      if (!("NDEFReader" in window)) {
        setMsg(msg, "Browser ini belum mendukung NFC (butuh Chrome di Android). Pakai Kartu terdaftar atau Input nomor.", "error");
        return;
      }
      try {
        scanAbort = new AbortController();
        const reader = new NDEFReader();
        await reader.scan({ signal: scanAbort.signal });
        ping.classList.add("animate-ping");
        setMsg(msg, "Menunggu kartu... tempelkan sekarang.", "muted");
        reader.addEventListener("reading", (ev) => {
          const uid = String(ev.serialNumber || "").replace(/:/g, "").toUpperCase();
          if (scanAbort) scanAbort.abort();
          ping.classList.remove("animate-ping");
          const r = pickByUid(uid);
          setMsg(msg, r.ok ? "Kartu terbaca." : r.msg, r.ok ? "ok" : "error");
        }, { once: true });
        reader.addEventListener("readingerror", () => setMsg(msg, "Kartu tidak bisa dibaca. Coba tempelkan lagi.", "error"));
      } catch {
        ping.classList.remove("animate-ping");
        setMsg(msg, "NFC tidak bisa diakses. Izinkan akses NFC di browser, atau pakai Input nomor.", "error");
      }
    });

    if (USE_MOCK) {
      const sim = el("button", cls.btnOutline, "Simulasi tap kartu");
      sim.type = "button";
      sim.addEventListener("click", () => {
        const pool = cards.filter((c) => c.status === "active");
        if (!pool.length) { setMsg(msg, "Belum ada kartu aktif untuk disimulasikan.", "error"); return; }
        const c = pool[Math.floor(Math.random() * pool.length)];
        pickByUid(c.uid);
        setMsg(msg, "Kartu terbaca (simulasi).", "ok");
      });
      row.appendChild(sim);
    }
    wrap.append(ring, msg, row);
    panel.appendChild(wrap);
    return;
  }

  // mode "manual"
  const label = el("label", cls.label, "Nomor kartu (UID)");
  label.htmlFor = "manual-uid";
  const row = el("div", "flex items-start gap-2");
  const field = el("div", "flex-1");
  const input = el("input", cls.input);
  input.id = "manual-uid";
  input.placeholder = "A1B2C3D4";
  input.autocomplete = "off";
  field.appendChild(input);
  const check = el("button", cls.btnOutline, "Cek kartu");
  check.type = "button";
  const run = () => {
    clearFieldErrors(field);
    const r = pickByUid(input.value);
    if (r.ok) input.value = selected.uid;
    else setFieldError(input, r.msg);
  };
  check.addEventListener("click", run);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
  row.append(field, check);
  panel.append(label, row);
}

function renderPreview() {
  preview.replaceChildren();
  if (!selected) {
    preview.appendChild(el("div", "rounded-2xl border border-dashed border-line py-10 text-center text-sm text-muted", "Belum ada kartu dipilih."));
    return;
  }
  preview.appendChild(buildCard(selected));
}

async function loadCards(keepUid) {
  try {
    const data = await api("/api/cards", { query: { limit: 200 } });
    cards = data.items;
    const uid = keepUid || (selected && selected.uid);
    selected = uid ? cards.find((c) => c.uid === uid) || null : null;
    renderPanel();
    renderPreview();
  } catch (err) {
    handleApiError(err);
  }
}

/* ---------- Nominal & chip cepat ---------- */

[10000, 20000, 50000].forEach((n) => {
  const b = el("button", "rounded-full border border-line bg-white px-3 py-1 text-sm font-medium transition hover:bg-brand-mint", formatRupiah(n));
  b.type = "button";
  b.addEventListener("click", () => { amountInput.value = n; });
  $("quick").appendChild(b);
});

/* ---------- Pilih sumber dana -> proses -> sukses ---------- */

function row(label, value, strong) {
  const r = el("div", "flex items-center justify-between gap-4 text-sm");
  r.append(el("span", "text-muted", label), el("span", strong ? "font-bold text-brand-dark" : "font-medium text-ink", value));
  return r;
}

function processingView(src) {
  const v = el("div", "flex flex-col items-center gap-4 py-6 text-center");
  v.append(
    el("div", "h-12 w-12 animate-spin rounded-full border-4 border-brand-light border-t-brand"),
    el("p", "font-semibold text-ink", `Memproses pembayaran dari ${src.name}...`),
    el("p", "text-sm text-muted", "Jangan tutup halaman ini.")
  );
  return v;
}

function successView(d, card, src, modal) {
  const v = el("div", "text-center");
  const circle = el("div", "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-mint text-ok ring-8 ring-brand-mint/60");
  circle.appendChild(icon("check", "h-8 w-8"));
  const info = el("div", "mt-5 space-y-2 rounded-xl bg-brand-mint p-4 text-left");
  info.append(
    row("Kartu", d.uid),
    row("Pemilik", card.owner_name),
    row("Sumber dana", `${src.name} (simulasi)`),
    row("Saldo sebelum", formatRupiah(d.balance_before)),
    row("Saldo sesudah", formatRupiah(d.balance_after), true)
  );
  const done = el("button", cls.btnPrimary + " mt-5 w-full", "Selesai");
  done.type = "button";
  done.addEventListener("click", () => modal.close());
  v.append(
    circle,
    el("h2", "mt-4 text-lg font-bold text-ink", "Saldo bertambah"),
    el("p", "mt-1 text-3xl font-extrabold text-ok", "+" + formatRupiah(d.amount)),
    info,
    done
  );
  return v;
}

async function pay(card, amount, src, modal) {
  busy = true;
  submitBtn.disabled = true;
  modal.setContent(processingView(src), { dismiss: false });
  try {
    await new Promise((r) => setTimeout(r, 1200)); // simulasi proses pembayaran
    const d = await api("/api/topup", { method: "POST", body: { uid: card.uid, amount } });
    modal.setContent(successView(d, card, src, modal), { dismiss: true });
    amountInput.value = "";
    await loadCards(d.uid); // saldo di pratinjau ikut diperbarui dari server
  } catch (err) {
    modal.close();
    handleApiError(err, (msg) => setFieldError(amountInput, msg));
    if (err.code === "CARD_BLOCKED" || err.code === "CARD_NOT_FOUND") loadCards(card.uid);
  } finally {
    busy = false;
    submitBtn.disabled = false;
  }
}

function chooseSource(card, amount) {
  const box = el("div");
  box.append(
    el("h2", "text-lg font-bold text-ink", "Isi saldo pakai apa?"),
    el("p", "mt-1 text-sm text-muted", `${formatRupiah(amount)} ke kartu ${card.uid} (${card.owner_name})`)
  );
  const list = el("div", "mt-4 grid gap-2");
  const cancel = el("button", cls.btnOutline + " mt-4 w-full", "Batal");
  cancel.type = "button";
  box.append(list, cancel);
  const modal = openModal(box);
  cancel.addEventListener("click", () => modal.close());

  PAYMENT_SOURCES.forEach((src) => {
    const b = el("button", "flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition hover:border-brand hover:bg-brand-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50");
    b.type = "button";
    const dot = el("span", "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-extrabold text-white", src.short);
    dot.style.backgroundColor = src.color;
    b.append(dot, el("span", "flex-1 text-sm font-semibold text-ink", src.name), el("span", "text-xs text-muted", "Simulasi"));
    b.addEventListener("click", () => { if (!busy) pay(card, amount, src, modal); });
    list.appendChild(b);
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (busy) return;
  clearFieldErrors(form);
  if (!selected) { showToast("Pilih, scan, atau input kartu terlebih dahulu.", "warning"); return; }
  if (selected.status === "blocked") { showToast(pesanError({ code: "CARD_BLOCKED" }), "warning"); return; }
  const v = validasiNominal(amountInput.value);
  if (!v.ok) { setFieldError(amountInput, v.message); return; }
  chooseSource(selected, v.value);
});

renderTabs();
renderPanel();
renderPreview();
loadCards();
