// 장소·활동 추천.
// 근거: 이맘때 우리 부서·타부서가 자주 간 곳(경비 전표), 후기 평점, 사내 블로그·동아리 단체 사진, 날씨, 개인 선호.
// 어느 부서도 가 본 적 없는 곳은 "완전히 새로운 제안"으로 따로 뽑는다.
import { seasonOf, SEASON_LABEL, today, dateLabel, addDays, ymd } from "../util.js";
import { forecast } from "./weather.js";

export const CATEGORY_LABEL = {
  restaurant: "식당·회식",
  activity: "게임·액티비티",
  culture: "문화·클래스",
  stay: "숙소·워크숍",
  cafe: "카페",
};

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const seasonName = (s) => SEASON_LABEL[s].split(" · ")[0];

export function venueStats(db, myDeptId) {
  const stats = new Map();
  for (const v of db.venues)
    stats.set(v.id, { ratings: [], otherRatings: [], visitsAll: 0, visitsMine: 0, depts: new Map(), bySeason: {}, perHeads: [], lastVisited: null, lastVisitedMine: null, photoPosts: [] });
  for (const a of db.activities) {
    const s = stats.get(a.venueId);
    if (!s) continue;
    s.visitsAll++;
    s.depts.set(a.deptName, (s.depts.get(a.deptName) || 0) + 1);
    const season = seasonOf(a.date);
    s.bySeason[season] = (s.bySeason[season] || 0) + 1;
    s.perHeads.push(a.perHead);
    if (a.blog) s.photoPosts.push({ source: "사내 블로그", photos: a.blog.photos, title: a.blog.title });
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
  for (const p of db.photoPosts || []) stats.get(p.venueId)?.photoPosts.push({ source: p.source, photos: p.photos });
  return stats;
}

export function venueCard(v, s, season = seasonOf(today())) {
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
    outdoor: Boolean(v.outdoor),
    capacity: v.capacity,
    rating: round1(avg(s.ratings)),
    reviewCount: s.ratings.length,
    otherRating: round1(avg(s.otherRatings)),
    visitsAll: s.visitsAll,
    visitsMine: s.visitsMine,
    seasonVisits: s.bySeason[season] || 0,
    deptCount: s.depts.size,
    deptVisits: [...s.depts].map(([deptName, count]) => ({ deptName, count })).sort((a, b) => b.count - a.count),
    avgPerHead: s.perHeads.length ? Math.round(avg(s.perHeads) / 100) * 100 : v.price,
    lastVisited: s.lastVisited,
    lastVisitedMine: s.lastVisitedMine,
    photoCount: s.photoPosts.length,
    photoPosts: s.photoPosts,
    brandNew: s.visitsAll === 0,
  };
}

export function allVenueCards(db, myDeptId) {
  const stats = venueStats(db, myDeptId);
  return db.venues.map((v) => venueCard(v, stats.get(v.id)));
}

/** 앞으로 7일 예보를 요약한다 (첫 화면의 날씨 기반 추천용) */
function weekWeather() {
  const days = Array.from({ length: 7 }, (_, i) => forecast(ymd(addDays(today(), i))));
  const okDays = days.filter((d) => d.outdoorOk).length;
  return { outdoorOk: okDays >= 4, label: okDays >= 4 ? "이번 주는 대체로 맑음" : "이번 주는 궂은 날이 많음", today: days[0] };
}

export function homeRows(db, myDeptId) {
  const cards = allVenueCards(db, myDeptId);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const season = seasonOf(today());
  const sName = seasonName(season);
  const weather = weekWeather();
  const members = db.employees.filter((e) => e.deptId === myDeptId);
  const fansOf = (c) => members.filter((m) => m.prefs.likes.includes(c.category)).length;
  const byRating = (a, b) => (b.otherRating ?? 0) - (a.otherRating ?? 0) || b.reviewCount - a.reviewCount;
  const visited = cards.filter((c) => !c.brandNew);

  const recentMine = db.activities
    .filter((a) => a.deptId === myDeptId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10)
    .map((a) => {
      const c = byId.get(a.venueId);
      const mine = round1(avg(a.reviews.map((r) => r.rating)));
      return { ...c, activityId: a.id, badge: dateLabel(a.date), myRating: mine, reason: mine >= 4.5 ? "우리 부서 반응이 좋았던 날!" : c.visitsMine >= 3 ? `우리 부서 단골 (${c.visitsMine}번 방문)` : mine != null ? `우리 부서 평점 ${mine}점` : "우리 부서가 다녀온 곳" };
    });

  const rows = [
    { key: "recent", title: "우리 부서가 최근 다녀온 곳", hint: "ERP 경비 기록에서 자동으로 가져왔습니다", items: recentMine },
    {
      key: "top",
      title: "다른 부서에서 평점이 좋았던 곳",
      hint: "타부서 참석자 후기 평균 기준",
      items: visited.filter((c) => c.otherRating != null && c.reviewCount >= 3).sort(byRating).slice(0, 10)
        .map((c, i) => ({ ...c, badge: `${c.deptCount}개 부서 방문`, reason: i === 0 ? "타부서 평점 TOP 1!" : `타부서 평점 ${i + 1}위 · 후기 ${c.reviewCount}건` })),
    },
    {
      key: "season",
      title: `지금 가기 좋은 곳 — ${SEASON_LABEL[season]}`,
      hint: "이맘때 우리 부서와 다른 부서가 실제로 자주 간 곳",
      items: visited.filter((c) => c.seasons.includes(season) && c.seasonVisits > 0).sort((a, b) => b.seasonVisits - a.seasonVisits || byRating(a, b)).slice(0, 10)
        .map((c, i) => ({ ...c, badge: `${sName} 추천`, reason: i === 0 ? "지금 시즌엔 여기!" : `${sName}에 ${c.seasonVisits}번 다녀간 곳` })),
    },
    {
      key: "photo",
      title: "단체 사진이 많이 올라온 곳",
      hint: "사내 블로그와 동아리 게시판에서 확인한 방문 흔적",
      items: visited.filter((c) => c.photoCount >= 2).sort((a, b) => b.photoCount - a.photoCount).slice(0, 10)
        .map((c, i) => ({ ...c, badge: `사진 게시글 ${c.photoCount}건`, reason: i === 0 ? "사내 블로그·동아리 인증 1위!" : `${[...new Set(c.photoPosts.map((p) => p.source))].slice(0, 2).join(", ")}에 올라온 곳` })),
    },
    {
      key: "new",
      title: "아직 아무 부서도 안 가 본 새로운 곳",
      hint: `${weather.label} · 날씨와 우리 부서 취향으로 골랐습니다`,
      items: cards.filter((c) => c.brandNew && c.seasons.includes(season))
        .sort((a, b) => (weather.outdoorOk ? Number(b.outdoor) - Number(a.outdoor) : Number(a.outdoor) - Number(b.outdoor)) || fansOf(b) - fansOf(a))
        .map((c) => ({ ...c, badge: "완전히 새로운 곳", reason: c.outdoor && weather.outdoorOk ? "이번 주 맑음, 야외에서 새롭게!" : !c.outdoor && !weather.outdoorOk ? "궂은 날씨엔 실내에서 새롭게!" : fansOf(c) ? `우리 부서 ${fansOf(c)}명 취향 저격` : "우리가 첫 방문 부서가 될 곳" })),
    },
  ];
  for (const [cat, label] of Object.entries(CATEGORY_LABEL)) {
    rows.push({
      key: cat, title: label, hint: "", category: cat,
      items: cards.filter((c) => c.category === cat).sort(byRating)
        .map((c, i) => ({ ...c, reason: c.brandNew ? "아직 아무도 안 가 본 곳" : i === 0 ? `${label} 평점 1위!` : c.visitsMine >= 2 ? `우리 부서 단골 (${c.visitsMine}회)` : `${c.deptCount}개 부서가 다녀간 곳` })),
    });
  }
  return { season, seasonLabel: SEASON_LABEL[season], weather, rows };
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
      comments: a.comments,
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
  const target = date || today();
  const season = seasonOf(target);
  const sName = seasonName(season);
  const weather = forecast(target);
  const diet = (word) => members.filter((m) => m.prefs.diet.includes(word));
  const veg = diet("채식"), noSeafood = diet("해산물 불가"), noSpicy = diet("매운 음식 불가");
  const nonDrinkers = members.filter((m) => m.prefs.alcohol === "안 마심");
  const names = (arr) => arr.map((m) => m.name).join(", ");

  // 날씨·예산·개인 선호처럼 방문 이력과 무관한 적합도
  function fit(v, card) {
    const reasons = [];
    let delta = 0;
    if (v.outdoor) {
      if (weather.outdoorOk) { delta += 6; reasons.push({ tone: "good", text: `${weather.label} 예보, 야외 활동하기 좋음` }); }
      else { delta -= 20; reasons.push({ tone: "warn", text: `${weather.label} 예보라 야외는 어려움` }); }
    } else if (!weather.outdoorOk) {
      delta += 5; reasons.push({ tone: "good", text: `${weather.label} 예보에도 문제없는 실내` });
    }
    if (budgetPerHead) {
      if (card.avgPerHead > budgetPerHead * 1.1) { delta -= 15; reasons.push({ tone: "warn", text: `1인당 약 ${card.avgPerHead.toLocaleString()}원으로 예산 초과` }); }
      else { delta += 5; reasons.push({ tone: "good", text: `1인당 약 ${card.avgPerHead.toLocaleString()}원, 예산 이내` }); }
    }
    if (veg.length && (v.category === "restaurant" || v.category === "cafe")) {
      if (v.f.veg) { delta += 4; reasons.push({ tone: "good", text: `채식 메뉴 있음 (${names(veg)})` }); }
      else { delta -= 6 * veg.length; reasons.push({ tone: "warn", text: `채식 메뉴 부족 (${names(veg)})` }); }
    }
    if (noSeafood.length && v.f.seafood) { delta -= 10 * noSeafood.length; reasons.push({ tone: "warn", text: `해산물을 못 드시는 분이 있음 (${names(noSeafood)})` }); }
    if (noSpicy.length && v.f.spicy) { delta -= 6 * noSpicy.length; reasons.push({ tone: "warn", text: `매운 메뉴 위주 (${names(noSpicy)})` }); }
    if (v.f.alcohol && members.length && nonDrinkers.length / members.length >= 0.25) { delta -= 8; reasons.push({ tone: "warn", text: `술 위주인데 비음주 ${nonDrinkers.length}명` }); }
    const fans = members.filter((m) => m.prefs.likes.includes(v.category));
    if (fans.length) { delta += Math.min(10, fans.length * 2); reasons.push({ tone: "good", text: `${CATEGORY_LABEL[v.category]} 선호 ${fans.length}명` }); }
    if (members.length > v.capacity) { delta -= 30; reasons.push({ tone: "warn", text: `수용 인원 ${v.capacity}명으로 부족` }); }
    return { delta, reasons };
  }

  const results = [];
  const fresh = [];
  for (const v of db.venues) {
    if (category && category !== "any" && v.category !== category) continue;
    const card = venueCard(v, stats.get(v.id), season);
    const f = fit(v, card);

    if (card.brandNew) {
      if (!v.seasons.includes(season)) continue;
      fresh.push({ ...card, score: Math.max(0, Math.min(100, Math.round(60 + f.delta))), reasons: [{ tone: "good", text: "어느 부서도 아직 가 보지 않은 곳" }, ...f.reasons], bookingUrl: bookingUrl(v) });
      continue;
    }

    const reasons = [];
    let score = 45;
    if (card.seasonVisits) {
      score += Math.min(18, card.seasonVisits * 4);
      reasons.push({ tone: "good", text: `${sName}에 ${card.seasonVisits}번 방문 (우리·타부서 전표 합산)` });
    } else if (!v.seasons.includes(season)) {
      score -= 12;
      reasons.push({ tone: "warn", text: "이 시기에는 잘 가지 않는 곳" });
    }
    const rating = card.otherRating ?? card.rating;
    if (rating != null) {
      score += (rating - 3.5) * 18;
      if (rating >= 4.2) reasons.push({ tone: "good", text: `후기 평점 ${rating}점 (${card.reviewCount}건)` });
      else if (rating < 3.6) reasons.push({ tone: "warn", text: `후기 평점이 낮은 편 (${rating}점)` });
    }
    if (card.photoCount) {
      score += Math.min(8, card.photoCount * 2);
      reasons.push({ tone: "good", text: `블로그·동아리 단체 사진 ${card.photoCount}건` });
    }
    if (card.visitsMine >= 3) { score -= 6; reasons.push({ tone: "warn", text: `우리 부서 ${card.visitsMine}회 방문 · 새로운 곳도 확인해 보세요` }); }
    else if (card.visitsMine) reasons.push({ tone: "info", text: `우리 부서 ${card.visitsMine}회 방문 (최근 ${card.lastVisitedMine})` });
    else reasons.push({ tone: "info", text: "우리 부서는 처음 가는 곳" });

    const refs = db.activities.filter((a) => a.venueId === v.id).sort((a, b) => (a.date < b.date ? 1 : -1));
    results.push({
      ...card,
      score: Math.max(0, Math.min(100, Math.round(score + f.delta))),
      reasons: [...reasons, ...f.reasons],
      bookingUrl: bookingUrl(v),
      evidence: {
        expenses: refs.slice(0, 4).map((a) => ({ deptName: a.deptName, mine: a.deptId === myDeptId, date: a.date, amount: a.amount, perHead: a.perHead, headcount: a.headcount, accountName: a.accountName, budgetSource: a.budgetSource, docNo: a.docNo })),
        reviews: refs.flatMap((a) => a.reviews.map((r) => ({ ...r, deptName: a.deptName }))).sort((a, b) => b.rating - a.rating).slice(0, 2),
        tips: refs.flatMap((a) => a.comments.map((c) => ({ text: c.text, deptName: a.deptName }))).slice(0, 2),
      },
    });
  }
  results.sort((a, b) => b.score - a.score);
  fresh.sort((a, b) => b.score - a.score);
  return { recommendations: results.slice(0, 6), fresh: fresh.slice(0, 3), weather };
}
