// 장소·활동 추천: 타부서 경비 기록, 후기 평점, 우리 부서 방문 횟수, 시기, 개인 선호를 점수로 합친다.
import { seasonOf, SEASON_LABEL, today, dateLabel } from "../util.js";

export const CATEGORY_LABEL = {
  restaurant: "식당·회식",
  activity: "게임·액티비티",
  culture: "문화·클래스",
  stay: "숙소·워크숍",
  cafe: "카페",
};

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

export function venueStats(db, myDeptId) {
  const stats = new Map();
  for (const v of db.venues)
    stats.set(v.id, { ratings: [], otherRatings: [], visitsAll: 0, visitsMine: 0, depts: new Set(), perHeads: [], lastVisited: null, lastVisitedMine: null, blogCount: 0 });
  for (const a of db.activities) {
    const s = stats.get(a.venueId);
    if (!s) continue;
    s.visitsAll++;
    s.depts.add(a.deptName);
    s.perHeads.push(a.perHead);
    if (a.blog) s.blogCount++;
    if (!s.lastVisited || a.date > s.lastVisited) s.lastVisited = a.date;
    const mine = a.deptId === myDeptId;
    if (mine) {
      s.visitsMine++;
      if (!s.lastVisitedMine || a.date > s.lastVisitedMine) s.lastVisitedMine = a.date;
    }
    for (const r of a.reviews) {
      s.ratings.push(r.rating);
      if (!mine) s.otherRatings.push(r.rating);
    }
  }
  return stats;
}

export function venueCard(v, s) {
  return {
    id: v.id,
    name: v.name,
    category: v.category,
    categoryLabel: CATEGORY_LABEL[v.category],
    sub: v.sub,
    area: v.area,
    emoji: v.emoji,
    hue: v.hue,
    seasons: v.seasons,
    price: v.price,
    features: v.f,
    capacity: v.capacity,
    rating: round1(avg(s.ratings)),
    reviewCount: s.ratings.length,
    otherRating: round1(avg(s.otherRatings)),
    visitsAll: s.visitsAll,
    visitsMine: s.visitsMine,
    deptCount: s.depts.size,
    avgPerHead: s.perHeads.length ? Math.round(avg(s.perHeads) / 100) * 100 : v.price,
    lastVisited: s.lastVisited,
    lastVisitedMine: s.lastVisitedMine,
    blogCount: s.blogCount,
  };
}

export function allVenueCards(db, myDeptId) {
  const stats = venueStats(db, myDeptId);
  return db.venues.map((v) => venueCard(v, stats.get(v.id)));
}

export function homeRows(db, myDeptId) {
  const cards = allVenueCards(db, myDeptId);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const season = seasonOf(today());
  const byRating = (a, b) => (b.otherRating ?? 0) - (a.otherRating ?? 0) || b.reviewCount - a.reviewCount;

  const recentMine = db.activities
    .filter((a) => a.deptId === myDeptId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10)
    .map((a) => ({ ...byId.get(a.venueId), activityId: a.id, badge: dateLabel(a.date), myRating: round1(avg(a.reviews.map((r) => r.rating))) }));

  const rows = [
    { key: "recent", title: "우리 부서가 최근 다녀온 곳", hint: "ERP 경비 기록에서 자동으로 가져왔습니다", items: recentMine },
    {
      key: "top",
      title: "다른 부서에서 평점이 좋았던 곳",
      hint: "타부서 참석자 후기 평균 기준",
      items: cards.filter((c) => c.otherRating != null && c.reviewCount >= 3).sort(byRating).slice(0, 10).map((c) => ({ ...c, badge: `${c.deptCount}개 부서 방문` })),
    },
    {
      key: "season",
      title: `지금 가기 좋은 곳 — ${SEASON_LABEL[season]}`,
      hint: "이 시기에 다른 부서들이 실제로 다녀온 곳 위주",
      items: cards.filter((c) => c.seasons.includes(season) && c.seasons.length < 4).sort(byRating).slice(0, 10).map((c) => ({ ...c, badge: SEASON_LABEL[season].split(" · ")[0] + " 추천" })),
    },
    {
      key: "fresh",
      title: "우리 부서는 아직 안 가 본 곳",
      hint: "같은 곳이 반복될 때 새로운 선택지",
      items: cards.filter((c) => c.visitsMine === 0 && c.otherRating != null).sort(byRating).slice(0, 10).map((c) => ({ ...c, badge: "새로운 곳" })),
    },
  ];
  for (const [cat, label] of Object.entries(CATEGORY_LABEL)) {
    rows.push({ key: cat, title: label, hint: "", category: cat, items: cards.filter((c) => c.category === cat).sort(byRating) });
  }
  return { season, seasonLabel: SEASON_LABEL[season], rows };
}

export function venueDetail(db, venueId, myDeptId) {
  const v = db.venues.find((x) => x.id === venueId);
  if (!v) return null;
  const card = venueCard(v, venueStats(db, myDeptId).get(v.id));
  const activities = db.activities.filter((a) => a.venueId === venueId).sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    ...card,
    bookingUrl: bookingUrl(v),
    visits: activities.map((a) => ({
      id: a.id, deptName: a.deptName, mine: a.deptId === myDeptId, date: a.date, amount: a.amount, headcount: a.headcount,
      perHead: a.perHead, accountName: a.accountName, accountCode: a.accountCode, budgetSource: a.budgetSource, docNo: a.docNo,
      blog: a.blog, comments: a.comments,
    })),
    reviews: activities.flatMap((a) => a.reviews.map((r) => ({ ...r, deptName: a.deptName, date: a.date }))).slice(0, 30),
  };
}

export function bookingUrl(v) {
  // 데모 장소명은 가상이므로 "지역 + 업종"으로 네이버 지도 검색을 연다
  const query = v.autoCreated ? v.name : `${v.area.split(" ")[0]} ${v.sub} 단체`;
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

export function recommendVenues(db, { memberIds = [], category, budgetPerHead, date, myDeptId }) {
  const members = db.employees.filter((e) => memberIds.includes(e.id));
  const stats = venueStats(db, myDeptId);
  const season = seasonOf(date || today());
  const diet = (word) => members.filter((m) => m.prefs.diet.includes(word));
  const veg = diet("채식"), noSeafood = diet("해산물 불가"), noSpicy = diet("매운 음식 불가");
  const nonDrinkers = members.filter((m) => m.prefs.alcohol === "안 마심");
  const names = (arr) => arr.map((m) => m.name).join(", ");

  const results = [];
  for (const v of db.venues) {
    if (category && category !== "any" && v.category !== category) continue;
    const s = stats.get(v.id);
    const card = venueCard(v, s);
    const reasons = [];
    let score = 50;

    const rating = card.otherRating ?? card.rating;
    if (rating != null) {
      score += (rating - 3.5) * 20;
      if (rating >= 4.2) reasons.push({ tone: "good", text: `타부서 후기 평점 ${rating}점 (${card.reviewCount}건)` });
      else if (rating < 3.6) reasons.push({ tone: "warn", text: `후기 평점이 낮은 편 (${rating}점)` });
    } else {
      reasons.push({ tone: "info", text: "아직 후기 데이터가 없음" });
    }

    if (v.seasons.includes(season) && v.seasons.length < 4) {
      score += 10;
      reasons.push({ tone: "good", text: `${SEASON_LABEL[season].split(" · ")[0]}철에 다녀온 부서가 많음` });
    } else if (!v.seasons.includes(season)) {
      score -= 12;
      reasons.push({ tone: "warn", text: "이 시기에는 잘 가지 않는 곳" });
    }

    if (card.visitsMine === 0) {
      score += 8;
      reasons.push({ tone: "good", text: "우리 부서는 처음 가는 곳" });
    } else {
      score -= card.visitsMine * 8;
      reasons.push({ tone: card.visitsMine >= 2 ? "warn" : "info", text: `우리 부서 ${card.visitsMine}회 방문 (최근 ${card.lastVisitedMine})` });
    }

    if (budgetPerHead) {
      if (card.avgPerHead > budgetPerHead * 1.1) {
        score -= 15;
        reasons.push({ tone: "warn", text: `1인당 평균 ${card.avgPerHead.toLocaleString()}원으로 예산 초과` });
      } else {
        score += 5;
        reasons.push({ tone: "good", text: `1인당 평균 ${card.avgPerHead.toLocaleString()}원, 예산 이내` });
      }
    }

    if (veg.length && (v.category === "restaurant" || v.category === "cafe")) {
      if (v.f.veg) { score += 4; reasons.push({ tone: "good", text: `채식 메뉴 있음 (${names(veg)})` }); }
      else { score -= 6 * veg.length; reasons.push({ tone: "warn", text: `채식 메뉴 부족 (${names(veg)})` }); }
    }
    if (noSeafood.length && v.f.seafood) { score -= 10 * noSeafood.length; reasons.push({ tone: "warn", text: `해산물을 못 드시는 분이 있음 (${names(noSeafood)})` }); }
    if (noSpicy.length && v.f.spicy) { score -= 6 * noSpicy.length; reasons.push({ tone: "warn", text: `매운 메뉴 위주 (${names(noSpicy)})` }); }
    if (v.f.alcohol && members.length && nonDrinkers.length / members.length >= 0.25) {
      score -= 8;
      reasons.push({ tone: "warn", text: `술 위주인데 비음주 ${nonDrinkers.length}명` });
    }
    const fans = members.filter((m) => m.prefs.likes.includes(v.category));
    if (fans.length) { score += Math.min(10, fans.length * 2); reasons.push({ tone: "good", text: `${CATEGORY_LABEL[v.category]} 선호 ${fans.length}명` }); }
    if (members.length > v.capacity) { score -= 30; reasons.push({ tone: "warn", text: `수용 인원 ${v.capacity}명으로 부족` }); }

    const others = db.activities.filter((a) => a.venueId === v.id && a.deptId !== myDeptId).sort((a, b) => (a.date < b.date ? 1 : -1));
    results.push({
      ...card,
      score: Math.max(0, Math.min(100, Math.round(score))),
      reasons,
      bookingUrl: bookingUrl(v),
      evidence: {
        expenses: others.slice(0, 3).map((a) => ({ deptName: a.deptName, date: a.date, amount: a.amount, perHead: a.perHead, headcount: a.headcount, accountName: a.accountName, budgetSource: a.budgetSource, docNo: a.docNo })),
        reviews: others.flatMap((a) => a.reviews.map((r) => ({ ...r, deptName: a.deptName }))).sort((a, b) => b.rating - a.rating).slice(0, 2),
        tips: others.flatMap((a) => a.comments.map((c) => ({ text: c.text, deptName: a.deptName }))).slice(0, 2),
        blogCount: card.blogCount,
      },
    });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 8);
}
