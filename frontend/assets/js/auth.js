// Data sesi hanya untuk tampilan. Hak akses sebenarnya selalu dicek backend.
export function saveSession({ token, username, role }) {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("username", username);
  sessionStorage.setItem("role", role);
}

export const getToken = () => sessionStorage.getItem("token");
export const getRole = () => sessionStorage.getItem("role");
export const getUsername = () => sessionStorage.getItem("username");
export const isLoggedIn = () => !!getToken();

export function requireLogin() {
  if (!isLoggedIn()) {
    location.href = "index.html";
    throw new Error("Belum login");
  }
}

export function requireAdmin() {
  requireLogin();
  if (getRole() !== "admin") {
    sessionStorage.setItem("flash", "Halaman ini hanya untuk admin");
    location.href = "dashboard.html";
    throw new Error("Bukan admin");
  }
}

export function logout() {
  sessionStorage.clear();
  location.href = "index.html";
}
