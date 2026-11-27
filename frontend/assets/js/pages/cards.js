import { api } from "../api.js";
import { requireLogin, getRole } from "../auth.js";
import {
  renderNavbar, renderPager, showToast, handleApiError, pesanError,
  setLoading, setFieldError, clearFieldErrors,
} from "../ui.js";
import { el } from "../dom.js";
import { buildCard } from "../cardview.js";
import { confirmDialog } from "../modal.js";
import { validasiUid, validasiNama, normalisasiUid } from "../validators.js";

requireLogin();
renderNavbar("cards");

const isAdmin = getRole() === "admin";
const LIMIT = 12;
let offset = 0;

const grid = document.getElementById("cards-grid");
const pager = document.getElementById("cards-pager");
const form = document.getElementById("card-form");
const uidInput = document.getElementById("uid");
const ownerInput = document.getElementById("owner");
const submitBtn = document.getElementById("card-submit");

function actionButton(card) {
  const blocked = card.status === "blocked";
  const btn = el("button", "rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 disabled:opacity-60", blocked ? "Aktifkan" : "Blokir");
  btn.type = "button";
  btn.addEventListener("click", async () => {
    if (!blocked) {
      const yes = await confirmDialog({
        title: "Blokir kartu ini?",
        message: `Kartu ${card.uid} tidak akan bisa dipakai di gerbang sampai diaktifkan lagi.`,
        confirmText: "Ya, blokir",
        danger: true,
      });
      if (!yes) return;
    }
    btn.disabled = true;
    try {
      await api(`/api/cards/${encodeURIComponent(card.uid)}`, {
        method: "PATCH",
        body: { status: blocked ? "active" : "blocked" },
      });
      showToast(blocked ? "Kartu diaktifkan" : "Kartu diblokir");
      await load();
    } catch (err) {
      handleApiError(err);
      btn.disabled = false;
    }
  });
  return btn;
}

async function load() {
  try {
    const data = await api("/api/cards", { query: { limit: LIMIT, offset } });
    grid.replaceChildren();
    if (!data.items.length) {
      grid.appendChild(el("p", "col-span-full rounded-2xl border border-dashed border-line bg-white py-12 text-center text-muted", "Belum ada kartu terdaftar."));
    }
    data.items.forEach((c) => grid.appendChild(buildCard(c, { action: isAdmin ? actionButton(c) : undefined })));
    renderPager(pager, { total: data.total, limit: LIMIT, offset, onChange: (o) => { offset = o; load(); } });
  } catch (err) {
    handleApiError(err);
  }
}

async function fillFromReader(silent) {
  try {
    const d = await api("/api/last-scan");
    if (d && !d.registered) {
      uidInput.value = d.uid;
      if (!silent) showToast("UID terisi dari kartu terakhir yang ditap");
    } else if (!silent) {
      showToast("Belum ada kartu baru di reader. Ketik UID secara manual.", "info");
    }
  } catch (err) {
    if (!silent) handleApiError(err);
  }
}

if (isAdmin) {
  document.getElementById("scan-btn").addEventListener("click", () => fillFromReader(false));
  fillFromReader(true);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const u = validasiUid(uidInput.value);
    const n = validasiNama(ownerInput.value);
    if (!u.ok) setFieldError(uidInput, u.message);
    if (!n.ok) setFieldError(ownerInput, n.message);
    if (!u.ok || !n.ok) return;

    setLoading(submitBtn, true);
    try {
      await api("/api/cards", { method: "POST", body: { uid: u.value, owner_name: n.value } });
      showToast("Kartu berhasil didaftarkan");
      form.reset();
      offset = 0;
      await load();
    } catch (err) {
      if (err.code === "UID_EXISTS") setFieldError(uidInput, pesanError(err));
      else handleApiError(err, (msg) => setFieldError(/UID/i.test(msg) ? uidInput : ownerInput, msg));
    } finally {
      setLoading(submitBtn, false);
    }
  });
  uidInput.addEventListener("blur", () => { uidInput.value = normalisasiUid(uidInput.value); });
} else {
  document.getElementById("card-form-box").remove();
}

load();
