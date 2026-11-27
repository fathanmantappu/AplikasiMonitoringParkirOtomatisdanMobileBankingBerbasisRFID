// Backend tiruan sesuai dokumen 07_Protokol_API. HANYA untuk pengembangan.
// Data disimpan di localStorage agar bertahan antar halaman.
// Reset data: localStorage.removeItem("mockdb_v1") di Console browser.
const KEY = "mockdb_v1";
const MAX_TOPUP = 500000;
const USERS = {
  admin: { password: "admin123", role: "admin" },
  operator: { password: "operator123", role: "operator" },
};
const UID_RE = /^[0-9A-F]{8,20}$/;
const wib = (ms) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 19) + "+07:00";

function seed() {
  const n = Date.now(), h = 3600e3;
  return {
    seq: { card: 3, tx: 3, sess: 3, log: 3 },
    lastScanUid: "F1E2D3C4",
    loginFails: [],
    cards: [
      { id: 1, uid: "A1B2C3D4", owner_name: "Budi Santoso", balance: 18000, status: "active" },
      { id: 2, uid: "B2C3D4E5", owner_name: "Siti Rahma", balance: 500, status: "active" },
      { id: 3, uid: "C3D4E5F6", owner_name: "<script>alert('xss')</script>", balance: 0, status: "blocked" },
    ],
    transactions: [
      { id: 1, uid: "A1B2C3D4", type: "topup", amount: 20000, balance_before: 0, balance_after: 20000, status: "success", performed_by: "admin", created_at: wib(n - 30 * h) },
      { id: 2, uid: "A1B2C3D4", type: "parking_fee", amount: 2000, balance_before: 20000, balance_after: 18000, status: "success", performed_by: "gate", created_at: wib(n - 27 * h) },
      { id: 3, uid: "B2C3D4E5", type: "topup", amount: 500, balance_before: 0, balance_after: 500, status: "success", performed_by: "admin", created_at: wib(n - 20 * h) },
    ],
    sessions: [
      { id: 1, uid: "A1B2C3D4", entry_time: wib(n - 29 * h), exit_time: wib(n - 27 * h), fee: 2000, status: "closed" },
      { id: 2, uid: "A1B2C3D4", entry_time: wib(n - 2 * h), exit_time: null, fee: null, status: "open" },
      { id: 3, uid: "B2C3D4E5", entry_time: wib(n - 1 * h), exit_time: null, fee: null, status: "open" },
    ],
    logs: [
      { id: 1, event: "UNKNOWN_CARD", detail: "UID F1E2D3C4 tidak terdaftar", ip_address: "192.168.1.30", created_at: wib(n - 5 * h) },
      { id: 2, event: "LOGIN_FAILED", detail: "username admin", ip_address: "192.168.1.20", created_at: wib(n - 4 * h) },
      { id: 3, event: "UNAUTHORIZED_TOPUP", detail: "operator mencoba top-up", ip_address: "192.168.1.20", created_at: wib(n - 3 * h) },
    ],
  };
}

function load() {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch {}
  return seed();
}
function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }

const ok = (data, status = 200) => ({ status, ok: true, json: { ok: true, data } });
const fail = (status, code, message) => ({ status, ok: false, json: { ok: false, error: { code, message } } });

function addLog(db, event, detail) {
  db.logs.push({ id: ++db.seq.log, event, detail, ip_address: "127.0.0.1", created_at: wib(Date.now()) });
}
function page(items, q) {
  const limit = Math.min(Number(q.limit) || 50, 200);
  const offset = Number(q.offset) || 0;
  return { items: items.slice(offset, offset + limit), total: items.length };
}
const newestFirst = (a, b) => b.id - a.id;

function handle(db, path, method, body, q, token) {
  if (path === "/api/health") return ok({ status: "ok" });

  if (path === "/api/admin/login" && method === "POST") {
    const now = Date.now();
    db.loginFails = db.loginFails.filter((t) => now - t < 300000);
    if (db.loginFails.length >= 5) return fail(429, "TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan");
    const u = USERS[body.username];
    if (!u || u.password !== body.password) {
      db.loginFails.push(now);
      addLog(db, "LOGIN_FAILED", "username " + String(body.username).slice(0, 50));
      return fail(401, "INVALID_CREDENTIALS", "Username atau password salah");
    }
    db.loginFails = [];
    return ok({ token: "mock-" + u.role, expires_in: 3600, username: body.username, role: u.role });
  }

  const role = token === "mock-admin" ? "admin" : token === "mock-operator" ? "operator" : null;
  if (!role) { addLog(db, "INVALID_TOKEN", "token tidak ada atau tidak valid"); return fail(401, "UNAUTHENTICATED", "Token tidak valid"); }
  const isAdmin = role === "admin";
  const forbid = () => fail(403, "FORBIDDEN", "Role tidak cukup");

  if (path === "/api/cards" && method === "GET") return ok(page([...db.cards].sort(newestFirst), q));

  if (path === "/api/cards" && method === "POST") {
    if (!isAdmin) return forbid();
    const uid = String(body.uid ?? "");
    const name = String(body.owner_name ?? "").trim();
    if (!UID_RE.test(uid)) { addLog(db, "INVALID_INPUT", "format UID salah"); return fail(400, "VALIDATION_ERROR", "UID tidak sesuai format (8-20 karakter heksadesimal huruf besar)"); }
    if (!name || name.length > 100) return fail(400, "VALIDATION_ERROR", "Nama pemilik wajib diisi, maksimal 100 karakter");
    if (db.cards.some((c) => c.uid === uid)) return fail(409, "UID_EXISTS", "UID sudah terdaftar");
    const card = { id: ++db.seq.card, uid, owner_name: name, balance: 0, status: "active" };
    db.cards.push(card);
    return ok(card, 201);
  }

  const m = path.match(/^\/api\/cards\/([^/]+)$/);
  if (m && method === "PATCH") {
    if (!isAdmin) return forbid();
    const card = db.cards.find((c) => c.uid === decodeURIComponent(m[1]));
    if (!card) return fail(404, "CARD_NOT_FOUND", "Kartu tidak ada");
    if (!["active", "blocked"].includes(body.status)) return fail(400, "VALIDATION_ERROR", "Status harus active atau blocked");
    card.status = body.status;
    return ok(card);
  }

  if (path === "/api/last-scan" && method === "GET") {
    if (!isAdmin) return forbid();
    if (db.cards.some((c) => c.uid === db.lastScanUid)) return ok(null);
    return ok({ uid: db.lastScanUid, scanned_at: wib(Date.now() - 60000), registered: false });
  }

  if (path === "/api/topup" && method === "POST") {
    if (!isAdmin) { addLog(db, "UNAUTHORIZED_TOPUP", "operator mencoba top-up"); return forbid(); }
    const a = body.amount;
    if (!Number.isInteger(a) || a <= 0 || a > MAX_TOPUP) { addLog(db, "INVALID_INPUT", "nominal tidak valid"); return fail(400, "INVALID_AMOUNT", "Nominal harus bilangan bulat lebih dari 0 dan tidak melebihi Rp" + MAX_TOPUP.toLocaleString("id-ID")); }
    const card = db.cards.find((c) => c.uid === body.uid);
    if (!card) return fail(404, "CARD_NOT_FOUND", "Kartu tidak ada");
    if (card.status === "blocked") return fail(409, "CARD_BLOCKED", "Kartu diblokir");
    const before = card.balance;
    card.balance += a;
    const tx = { id: ++db.seq.tx, uid: card.uid, type: "topup", amount: a, balance_before: before, balance_after: card.balance, status: "success", performed_by: "admin", created_at: wib(Date.now()) };
    db.transactions.push(tx);
    return ok({ transaction_id: tx.id, uid: card.uid, amount: a, balance_before: before, balance_after: card.balance });
  }

  if (path === "/api/transactions" && method === "GET") {
    let items = db.transactions;
    if (q.uid) items = items.filter((t) => t.uid === q.uid);
    if (q.type) items = items.filter((t) => t.type === q.type);
    return ok(page([...items].sort(newestFirst), q));
  }

  if (path === "/api/sessions" && method === "GET") {
    let items = db.sessions;
    if (q.uid) items = items.filter((s) => s.uid === q.uid);
    if (q.status) items = items.filter((s) => s.status === q.status);
    return ok(page([...items].sort(newestFirst), q));
  }

  if (path === "/api/security-logs" && method === "GET") {
    if (!isAdmin) return forbid();
    return ok(page([...db.logs].sort(newestFirst), q));
  }

  return fail(404, "NOT_FOUND", "Endpoint tidak ada");
}

export async function mockFetch(path, { method = "GET", body, query, token } = {}) {
  await new Promise((r) => setTimeout(r, 250)); // meniru latensi jaringan
  const db = load();
  const out = handle(db, path, method, body || {}, query || {}, token);
  save(db);
  return out;
}
