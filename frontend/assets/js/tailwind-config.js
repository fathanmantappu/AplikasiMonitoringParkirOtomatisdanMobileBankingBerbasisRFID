// Palet tema hijau segar. Dimuat setelah script Tailwind CDN.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#22C55E", dark: "#15803D", light: "#BBF7D0", mint: "#DCFCE7" },
        ink: "#1F2937",
        muted: "#6B7280",
        line: "#E5E7EB",
        page: "#F9FAFB",
        ok: "#16A34A",
        warn: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"] },
    },
  },
};
