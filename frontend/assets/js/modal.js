import { el } from "./dom.js";
import { cls } from "./styles.js";

export function openModal(content, { dismissible = true, onClose } = {}) {
  const overlay = el("div", "fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  const panel = el("div", "w-full max-w-md rounded-2xl bg-white p-6 shadow-xl");
  panel.appendChild(content);
  overlay.appendChild(panel);

  let closed = false;
  const onKey = (e) => { if (e.key === "Escape" && dismissible) close(); };
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    if (onClose) onClose();
  }
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay && dismissible) close(); });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
  const first = panel.querySelector("button:not([disabled])");
  if (first) first.focus();

  return {
    close,
    panel,
    setContent(node, opts = {}) {
      panel.replaceChildren(node);
      if (opts.dismiss !== undefined) dismissible = opts.dismiss;
    },
  };
}

export function confirmDialog({ title, message, confirmText = "Ya", cancelText = "Batal", danger = false }) {
  return new Promise((resolve) => {
    const box = el("div");
    const row = el("div", "mt-6 flex justify-end gap-2");
    const cancel = el("button", cls.btnOutline, cancelText);
    cancel.type = "button";
    const ok = el("button", danger ? cls.btnDanger : cls.btnPrimary, confirmText);
    ok.type = "button";
    row.append(cancel, ok);
    box.append(el("h2", "text-lg font-bold text-ink", title), el("p", "mt-2 text-sm text-muted", message), row);

    let decided = false;
    const m = openModal(box, { onClose: () => { if (!decided) resolve(false); } });
    cancel.addEventListener("click", () => { decided = true; m.close(); resolve(false); });
    ok.addEventListener("click", () => { decided = true; m.close(); resolve(true); });
  });
}
