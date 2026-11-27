import { API_BASE_URL, USE_MOCK } from "./config.js";

/**
 * Semua panggilan ke backend lewat sini.
 * Sukses  -> mengembalikan json.data
 * Gagal   -> melempar { status, code, message, redirected? }
 *   status 0 = jaringan putus / server tidak terjangkau
 *   redirected = true berarti 401 sudah ditangani (halaman diarahkan ke login)
 */
export async function api(path, { method = "GET", body, query, auth = true } = {}) {
  const token = sessionStorage.getItem("token");
  let status, ok, json;

  if (USE_MOCK) {
    const { mockFetch } = await import("./mock.js");
    ({ status, ok, json } = await mockFetch(path, { method, body, query, token: auth ? token : null }));
  } else {
    let url = API_BASE_URL + path;
    if (query) {
      const qs = new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== "")
      ).toString();
      if (qs) url += "?" + qs;
    }
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(auth && token ? { Authorization: "Bearer " + token } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw { status: 0, code: "NETWORK_ERROR", message: "" };
    }
    json = await res.json().catch(() => ({}));
    status = res.status;
    ok = res.ok;
  }

  // 401 di endpoint yang butuh token = sesi habis. Login (auth:false) tidak ikut.
  if (status === 401 && auth) {
    sessionStorage.clear();
    sessionStorage.setItem("flash", "Sesi habis, silakan login ulang");
    location.href = "index.html";
    throw { status: 401, code: "UNAUTHENTICATED", message: "", redirected: true };
  }

  if (!ok || json.ok === false) {
    const e = json.error || {};
    throw { status, code: e.code, message: e.message || "" };
  }
  return json.data;
}
