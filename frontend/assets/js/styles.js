// Kelas Tailwind yang dipakai berulang, satu sumber agar tampilan konsisten.
const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

export const cls = {
  btnPrimary: `${btn} bg-brand text-ink shadow-sm hover:bg-brand-dark hover:text-white focus-visible:ring-brand/50`,
  btnOutline: `${btn} border border-line bg-white text-ink hover:bg-brand-mint focus-visible:ring-brand/50`,
  btnDanger: `${btn} bg-danger text-white hover:bg-red-600 focus-visible:ring-danger/50`,
  input:
    "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
  label: "mb-1 block text-sm font-medium text-ink",
  panel: "rounded-2xl border border-line bg-white p-5 shadow-sm",
};
