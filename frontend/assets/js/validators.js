// Hanya kenyamanan pengguna. Backend tetap memvalidasi ulang.
// TODO: samakan dengan MAX_TOPUP dan batas panjang nama di backend.
export const MAX_TOPUP = 500000;
export const MAX_NAMA = 100;

const UID_RE = /^[0-9A-F]{8,20}$/;

export function normalisasiUid(raw) {
  return String(raw ?? "").trim().toUpperCase();
}

export function validasiUid(raw) {
  const uid = normalisasiUid(raw);
  if (!UID_RE.test(uid)) {
    return { ok: false, message: "UID harus 8 sampai 20 karakter heksadesimal (0-9, A-F), contoh A1B2C3D4." };
  }
  return { ok: true, value: uid };
}

export function validasiNama(raw) {
  const nama = String(raw ?? "").trim();
  if (!nama) return { ok: false, message: "Nama pemilik wajib diisi." };
  if (nama.length > MAX_NAMA) return { ok: false, message: `Nama maksimal ${MAX_NAMA} karakter.` };
  return { ok: true, value: nama };
}

export function validasiNominal(raw) {
  const s = String(raw ?? "").trim();
  if (!/^\d+$/.test(s)) return { ok: false, message: "Nominal harus berupa angka bulat tanpa titik atau koma, contoh 20000." };
  const n = Number(s);
  if (n <= 0) return { ok: false, message: "Nominal harus lebih dari 0." };
  if (n > MAX_TOPUP) return { ok: false, message: "Nominal melebihi batas top-up per transaksi." };
  return { ok: true, value: n }; // integer, bukan string
}
