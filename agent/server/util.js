export const pad = (n) => String(n).padStart(2, "0");

export function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseYmd(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateOrStr, n) {
  const d = typeof dateOrStr === "string" ? parseYmd(dateOrStr) : new Date(dateOrStr);
  d.setDate(d.getDate() + n);
  return d;
}

export function diffDays(a, b) {
  return Math.round((parseYmd(a) - parseYmd(b)) / 86400000);
}

export const today = () => ymd(new Date());

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function dateLabel(s) {
  const d = parseYmd(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
}

export function seasonOf(dateStr) {
  const m = parseYmd(dateStr).getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export const SEASON_LABEL = {
  spring: "봄 · 벚꽃 시즌",
  summer: "여름 · 시원하게",
  autumn: "가을 · 단풍 시즌",
  winter: "겨울 · 따뜻하게",
};

// 시드 고정 난수 (데모 데이터가 매번 같은 모양으로 생성되도록)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

let counter = 0;
export const uid = (prefix) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

export const won = (n) => `${Math.round(n).toLocaleString("ko-KR")}원`;

export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
