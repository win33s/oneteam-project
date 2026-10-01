// 날짜 추천: 선택한 부서원의 캘린더와 부서 과제 일정을 보고 후보일에 점수를 매긴다.
import { ymd, parseYmd, addDays, diffDays, dateLabel } from "../util.js";

// 데모용 공휴일 (실서비스에서는 사내 캘린더의 휴일 정보를 사용)
const HOLIDAYS = new Set(["2026-10-05", "2026-10-09", "2026-12-25", "2027-01-01"]);

const WEEKDAY_BONUS = { dinner: [0, -3, 2, 4, 6, -4, 0], lunch: [0, 0, 3, 3, 3, 2, 0], allday: [0, -2, 0, 2, 4, 6, 0] };

export function recommendDates(db, { memberIds, from, to, slot = "dinner", deptId }) {
  const members = db.employees.filter((e) => memberIds.includes(e.id));
  const events = db.calendar.filter((ev) => memberIds.includes(ev.empId));
  const milestones = db.milestones.filter((m) => m.deptId === deptId);
  const out = [];

  for (let d = parseYmd(from); ymd(d) <= to; d = addDays(d, 1)) {
    const date = ymd(d);
    const dow = d.getDay();
    if (dow === 0 || dow === 6 || HOLIDAYS.has(date)) continue;

    const conflicts = [];
    for (const m of members) {
      const ev = events.find((e) => e.empId === m.id && e.from <= date && date <= e.to);
      if (ev) conflicts.push({ empId: m.id, name: m.name, title: m.title, type: ev.type });
    }
    const available = members.length - conflicts.length;
    // 참석 가능 비율을 기본 점수로 삼고, 요일·과제 일정 가산점이 들어갈 여유를 남긴다
    let score = (available / Math.max(1, members.length)) * 84 + 6;
    const notes = [];

    if (conflicts.some((c) => c.title === "팀장")) {
      score -= 15;
      notes.push({ tone: "warn", text: "팀장 일정과 겹침" });
    }
    for (const ms of milestones) {
      const gap = diffDays(ms.date, date);
      if (gap === 0) { score -= 40; notes.push({ tone: "warn", text: `과제 일정 당일: ${ms.title}` }); }
      else if (gap === 1) { score -= 22; notes.push({ tone: "warn", text: `다음 날 과제 일정: ${ms.title}` }); }
      else if (gap === 2) { score -= 8; notes.push({ tone: "info", text: `이틀 뒤 과제 일정: ${ms.title}` }); }
      else if (gap === -1) { score += 5; notes.push({ tone: "good", text: `${ms.title} 끝난 다음 날` }); }
    }
    const bonus = WEEKDAY_BONUS[slot]?.[dow] ?? 0;
    score += bonus;
    if (bonus >= 4) notes.push({ tone: "good", text: slot === "allday" ? "종일 활동에 좋은 요일" : "참석률이 높은 요일" });
    if (!conflicts.length) notes.push({ tone: "good", text: "전원 참석 가능" });

    out.push({
      date,
      label: dateLabel(date),
      score: Math.max(0, Math.min(100, Math.round(score))),
      available,
      total: members.length,
      conflicts,
      notes,
    });
  }
  out.sort((a, b) => b.score - a.score || (a.date < b.date ? -1 : 1));
  return out.slice(0, 6);
}
