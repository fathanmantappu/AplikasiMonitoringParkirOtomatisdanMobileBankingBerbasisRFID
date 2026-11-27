// Pembantu membuat elemen. Teks selalu lewat textContent (aman dari XSS).
const NS = "http://www.w3.org/2000/svg";

export function el(tag, className = "", text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

const ICONS = {
  user: [
    ["circle", { cx: 12, cy: 8, r: 4.2, fill: "currentColor", stroke: "none" }],
    ["path", { d: "M3.5 21c0-4.4 3.8-7.2 8.5-7.2s8.5 2.8 8.5 7.2z", fill: "currentColor", stroke: "none" }],
  ],
  check: [["path", { d: "M5 13l4 4L19 7" }]],
  menu: [["path", { d: "M4 6h16M4 12h16M4 18h16" }]],
  x: [["path", { d: "M6 6l12 12M18 6L6 18" }]],
  wave: [["path", { d: "M8.5 8.5a5 5 0 010 7M12 6a8.5 8.5 0 010 12M15.5 3.5a12 12 0 010 17" }]],
  logout: [
    ["path", { d: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" }],
    ["path", { d: "M16 17l5-5-5-5M21 12H9" }],
  ],
  card: [
    ["rect", { x: 2, y: 5, width: 20, height: 14, rx: 3 }],
    ["path", { d: "M2 10h20" }],
  ],
};

export function icon(name, className = "h-5 w-5") {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("fill", "none");
  s.setAttribute("stroke", "currentColor");
  s.setAttribute("stroke-width", "2");
  s.setAttribute("stroke-linecap", "round");
  s.setAttribute("stroke-linejoin", "round");
  s.setAttribute("class", className);
  s.setAttribute("aria-hidden", "true");
  (ICONS[name] || []).forEach(([tag, attrs]) => {
    const c = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => c.setAttribute(k, v));
    s.appendChild(c);
  });
  return s;
}
