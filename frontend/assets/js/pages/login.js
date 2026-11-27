import { api } from "../api.js";
import { USE_MOCK } from "../config.js";
import { saveSession, isLoggedIn } from "../auth.js";
import { handleApiError, pesanError, setLoading, showFlash } from "../ui.js";

if (isLoggedIn()) location.href = "dashboard.html";
showFlash();
if (USE_MOCK) document.getElementById("mock-hint").classList.remove("hidden");

const form = document.getElementById("login-form");
const errBox = document.getElementById("login-error");
const btn = document.getElementById("login-btn");

function showError(msg) {
  errBox.textContent = msg;
  errBox.classList.remove("hidden");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errBox.classList.add("hidden");

  const username = form.username.value.trim();
  const password = form.password.value;
  if (!username || !password) {
    showError("Isi username dan password terlebih dahulu.");
    return;
  }

  setLoading(btn, true, "Masuk...");
  try {
    const data = await api("/api/admin/login", {
      method: "POST",
      body: { username, password },
      auth: false, // 401 di sini = salah login, bukan sesi habis
    });
    saveSession({ token: data.token, username: data.username, role: data.role });
    location.href = "dashboard.html";
  } catch (err) {
    if (err.status === 401 || err.status === 400 || err.status === 429) showError(pesanError(err));
    else handleApiError(err);
    form.password.value = "";
  } finally {
    setLoading(btn, false);
  }
});
