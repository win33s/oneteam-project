// 데모용 가상 날씨 예보. 실서비스에서는 기상청 중기예보 API로 교체한다.
import { parseYmd, seasonOf } from "../util.js";

const BY_SEASON = {
  spring: [["맑음", 0.5], ["흐림", 0.25], ["비", 0.25]],
  summer: [["맑음", 0.4], ["흐림", 0.2], ["비", 0.4]],
  autumn: [["맑음", 0.6], ["흐림", 0.25], ["비", 0.15]],
  winter: [["맑음", 0.45], ["흐림", 0.3], ["눈", 0.25]],
};
const AVG_TEMP = [0, 2, 8, 14, 19, 24, 27, 27, 22, 16, 9, 2];
const ICON = { 맑음: "☀️", 흐림: "☁️", 비: "🌧️", 눈: "❄️" };

export function forecast(dateStr) {
  const d = parseYmd(dateStr);
  // 같은 날짜에는 항상 같은 예보가 나오도록 날짜로 난수를 만든다
  const h = Math.abs(Math.sin(d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) * 10000) % 1;
  let roll = h;
  let condition = "맑음";
  for (const [c, p] of BY_SEASON[seasonOf(dateStr)]) {
    if (roll < p) { condition = c; break; }
    roll -= p;
  }
  const temp = AVG_TEMP[d.getMonth()] + Math.round((h - 0.5) * 6);
  const outdoorOk = (condition === "맑음" || condition === "흐림") && temp >= 5 && temp <= 29;
  return { condition, temp, icon: ICON[condition], label: `${ICON[condition]} ${condition} ${temp}℃`, outdoorOk };
}
