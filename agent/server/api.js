import express from "express";
import { getDb, save, log } from "./db.js";
import { MY_DEPT, ME } from "./seed.js";
import { uid, today, ymd, addDays, dateLabel, won } from "./util.js";
import { recommendDates } from "./agent/scheduler.js";
import { homeRows, venueDetail, recommendVenues, allVenueCards, bookingUrl, CATEGORY_LABEL } from "./agent/recommender.js";
import { sendMail } from "./agent/mailer.js";
import { crawlErp } from "./agent/crawler.js";
import { llmEnabled, parseRequestWithLlm, summarizeRecommendations } from "./agent/llm.js";

export function apiRouter(baseUrl) {
  const api = express.Router();
  api.use(express.json());
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  const notFound = (res, what) => res.status(404).json({ error: `${what}을(를) 찾을 수 없습니다` });

  api.get("/bootstrap", (_req, res) => {
    const db = getDb();
    res.json({
      me: db.employees.find((e) => e.id === ME),
      dept: db.departments.find((d) => d.id === MY_DEPT),
      departments: db.departments,
      employees: db.employees,
      categories: CATEGORY_LABEL,
      llmEnabled,
      today: today(),
    });
  });

  api.get("/home", (_req, res) => res.json(homeRows(getDb(), MY_DEPT)));
  api.get("/venues", (_req, res) => res.json(allVenueCards(getDb(), MY_DEPT)));
  api.get("/venues/:id", (req, res) => {
    const v = venueDetail(getDb(), req.params.id, MY_DEPT);
    return v ? res.json(v) : notFound(res, "장소");
  });

  // --- 에이전트: 자유 입력 해석 ---
  api.post("/agent/parse", wrap(async (req, res) => {
    const text = String(req.body.text || "");
    const viaLlm = await parseRequestWithLlm(text, today());
    const parsed = viaLlm || parseByRules(text);
    log("해석", `"${text}" → ${CATEGORY_LABEL[parsed.category] || "유형 무관"}, ${parsed.budgetPerHead ? won(parsed.budgetPerHead) + " 이내, " : ""}${parsed.weeksAhead}주 안 (${viaLlm ? "Claude" : "규칙 기반"})`);
    save();
    res.json({ ...parsed, from: ymd(addDays(today(), 3)), to: ymd(addDays(today(), 3 + parsed.weeksAhead * 7)), engine: viaLlm ? "claude" : "rules" });
  }));

  api.post("/agent/sync-erp", wrap(async (_req, res) => {
    const result = await crawlErp({ baseUrl });
    res.json({ created: (result.created || []).map((a) => a.id), scanned: result.scanned || 0 });
  }));

  // --- 기획 ---
  const expandPlan = (db, plan) => {
    const poll = db.polls.find((p) => p.id === plan.pollId);
    const venueRaw = db.venues.find((v) => v.id === plan.venueId);
    return {
      ...plan,
      poll: poll ? expandPoll(db, poll) : null,
      venue: venueRaw ? { id: venueRaw.id, name: venueRaw.name, emoji: venueRaw.emoji, hue: venueRaw.hue, sub: venueRaw.sub, area: venueRaw.area, category: venueRaw.category, bookingUrl: bookingUrl(venueRaw) } : null,
    };
  };

  api.get("/plans", (_req, res) => {
    const db = getDb();
    res.json(db.plans.map((p) => expandPlan(db, p)).reverse());
  });

  api.post("/plans", (req, res) => {
    const db = getDb();
    const b = req.body;
    const plan = {
      id: uid("p"),
      title: b.title || "조직문화활동",
      category: b.category || "any",
      budgetPerHead: Number(b.budgetPerHead) || 0,
      slot: b.slot || "dinner",
      from: b.from,
      to: b.to,
      memberIds: b.memberIds || [],
      preferVenueId: b.preferVenueId || null,
      status: "draft",
      date: null,
      venueId: null,
      pollId: null,
      createdAt: new Date().toISOString(),
    };
    log("캘린더", `부서원 ${plan.memberIds.length}명의 일정과 부서 과제 일정을 ${plan.from} ~ ${plan.to} 범위로 조회`);
    plan.dateCandidates = recommendDates(db, { ...plan, deptId: MY_DEPT });
    log("날짜", `후보 ${plan.dateCandidates.length}개 산출. 1순위 ${plan.dateCandidates[0]?.label ?? "없음"} (${plan.dateCandidates[0]?.available ?? 0}/${plan.memberIds.length}명 가능)`);
    db.plans.push(plan);
    save();
    res.json(expandPlan(db, plan));
  });

  api.get("/plans/:id", (req, res) => {
    const db = getDb();
    const plan = db.plans.find((p) => p.id === req.params.id);
    return plan ? res.json(expandPlan(db, plan)) : notFound(res, "기획");
  });

  api.post("/plans/:id/poll", (req, res) => {
    const db = getDb();
    const plan = db.plans.find((p) => p.id === req.params.id);
    if (!plan) return notFound(res, "기획");
    const dates = [...(req.body.dates || [])].sort();
    if (dates.length < 2) return res.status(400).json({ error: "투표에는 날짜 후보가 2개 이상 필요합니다" });
    const poll = { id: uid("poll"), planId: plan.id, dates, voterIds: plan.memberIds, votes: {}, status: "open", createdAt: new Date().toISOString() };
    db.polls.push(poll);
    plan.pollId = poll.id;
    plan.status = "voting";
    for (const id of poll.voterIds) {
      sendMail(db, {
        to: id,
        type: "vote",
        subject: `[날짜 투표] ${plan.title} 가능한 날짜를 골라 주세요`,
        body: `${plan.title} 일정을 정하려고 합니다. 가능한 날짜를 모두 선택해 주세요.\n\n후보: ${dates.map(dateLabel).join(", ")}`,
        link: `/vote/${poll.id}?as=${id}`,
        linkLabel: "투표하러 가기",
      });
    }
    log("메일", `날짜 투표 메일 ${poll.voterIds.length}통 발송 (후보 ${dates.length}개)`);
    save();
    res.json(expandPlan(db, plan));
  });

  api.post("/plans/:id/date", (req, res) => {
    const db = getDb();
    const plan = db.plans.find((p) => p.id === req.params.id);
    if (!plan) return notFound(res, "기획");
    plan.date = req.body.date;
    plan.status = "date_confirmed";
    plan.venueAdvice = null;
    const poll = db.polls.find((p) => p.id === plan.pollId);
    if (poll) poll.status = "closed";
    log("날짜", `${plan.title} 날짜 확정: ${dateLabel(plan.date)}`);
    save();
    res.json(expandPlan(db, plan));
  });

  api.get("/plans/:id/venues", wrap(async (req, res) => {
    const db = getDb();
    const plan = db.plans.find((p) => p.id === req.params.id);
    if (!plan) return notFound(res, "기획");
    const recs = recommendVenues(db, { ...plan, myDeptId: MY_DEPT });
    if (!plan.venueAdvice) {
      log("추천", `타부서 경비 기록·후기·방문 횟수·개인 선호를 종합해 ${recs.length}곳 추천. 1순위 ${recs[0]?.name}`);
      const members = db.employees.filter((e) => plan.memberIds.includes(e.id));
      const text = await summarizeRecommendations({
        members,
        date: plan.date,
        candidates: recs.slice(0, 5).map((r) => ({ name: r.name, type: r.sub, score: r.score, reasons: r.reasons.map((x) => x.text), visitsByOurDept: r.visitsMine, avgPerHead: r.avgPerHead })),
      });
      plan.venueAdvice = { text: text || ruleAdvice(recs), engine: text ? "claude" : "rules" };
      save();
    }
    // 가고 싶다고 미리 고른 곳이 이미 여러 번 간 곳이면 대안을 알려 준다
    const preferred = plan.preferVenueId && allVenueCards(db, MY_DEPT).find((v) => v.id === plan.preferVenueId);
    res.json({ recommendations: recs, advice: plan.venueAdvice, preferred: preferred || null });
  }));

  api.post("/plans/:id/confirm", (req, res) => {
    const db = getDb();
    const plan = db.plans.find((p) => p.id === req.params.id);
    const venue = db.venues.find((v) => v.id === req.body.venueId);
    if (!plan || !venue) return notFound(res, "기획 또는 장소");
    plan.venueId = venue.id;
    plan.status = "confirmed";
    const slot = { dinner: "저녁", lunch: "점심", allday: "종일" }[plan.slot];
    for (const id of plan.memberIds) {
      sendMail(db, {
        to: id,
        type: "announce",
        subject: `[안내] ${plan.title} — ${dateLabel(plan.date)} ${venue.name}`,
        body: `일정이 확정되었습니다.\n\n· 일시: ${dateLabel(plan.date)} ${slot}\n· 장소: ${venue.name} (${venue.area})\n· 내용: ${venue.sub}\n\n참석이 어려우면 기획 담당자에게 알려 주세요.`,
      });
    }
    log("메일", `안내 메일 ${plan.memberIds.length}통 발송: ${dateLabel(plan.date)} ${venue.name}`);
    log("예약", `네이버 지도 예약·검색 페이지 준비: ${venue.name}`);
    save();
    res.json(expandPlan(db, plan));
  });

  // --- 투표 ---
  function expandPoll(db, poll) {
    const name = (id) => db.employees.find((e) => e.id === id)?.name || id;
    const voted = Object.keys(poll.votes);
    return {
      ...poll,
      tallies: poll.dates.map((d) => {
        const voters = voted.filter((id) => poll.votes[id].includes(d));
        return { date: d, label: dateLabel(d), count: voters.length, voters: voters.map(name) };
      }),
      votedCount: voted.length,
      pending: poll.voterIds.filter((id) => !poll.votes[id]).map((id) => ({ id, name: name(id) })),
      title: db.plans.find((p) => p.id === poll.planId)?.title,
    };
  }

  api.get("/polls/:id", (req, res) => {
    const db = getDb();
    const poll = db.polls.find((p) => p.id === req.params.id);
    return poll ? res.json(expandPoll(db, poll)) : notFound(res, "투표");
  });

  api.post("/polls/:id/vote", (req, res) => {
    const db = getDb();
    const poll = db.polls.find((p) => p.id === req.params.id);
    if (!poll) return notFound(res, "투표");
    if (poll.status !== "open") return res.status(400).json({ error: "마감된 투표입니다" });
    const { voterId, dates } = req.body;
    if (!poll.voterIds.includes(voterId)) return res.status(403).json({ error: "투표 대상자가 아닙니다" });
    poll.votes[voterId] = (dates || []).filter((d) => poll.dates.includes(d));
    save();
    res.json(expandPoll(db, poll));
  });

  // 데모용: 아직 응답하지 않은 부서원 몇 명이 각자 캘린더에 맞춰 투표한 것처럼 처리
  api.post("/polls/:id/simulate", (req, res) => {
    const db = getDb();
    const poll = db.polls.find((p) => p.id === req.params.id);
    if (!poll) return notFound(res, "투표");
    const pending = poll.voterIds.filter((id) => !poll.votes[id]);
    for (const id of pending.slice(0, Number(req.body.count) || 3)) {
      const free = poll.dates.filter((d) => !db.calendar.some((ev) => ev.empId === id && ev.from <= d && d <= ev.to));
      const chosen = free.filter(() => Math.random() < 0.8);
      poll.votes[id] = chosen.length ? chosen : free.slice(0, 1);
    }
    save();
    res.json(expandPoll(db, poll));
  });

  // --- 활동 기록 ---
  const expandActivity = (db, a) => {
    const v = db.venues.find((x) => x.id === a.venueId);
    const ratings = a.reviews.map((r) => r.rating);
    return {
      ...a,
      mine: a.deptId === MY_DEPT,
      venueName: v?.name,
      emoji: v?.emoji,
      hue: v?.hue,
      sub: v?.sub,
      area: v?.area,
      rating: ratings.length ? Math.round((ratings.reduce((x, y) => x + y, 0) / ratings.length) * 10) / 10 : null,
      visitNo: db.activities.filter((x) => x.deptId === a.deptId && x.venueId === a.venueId && x.date <= a.date).length,
    };
  };

  api.get("/activities", (req, res) => {
    const db = getDb();
    const { scope, category, q, dept } = req.query;
    let list = db.activities;
    if (scope === "mine") list = list.filter((a) => a.deptId === MY_DEPT);
    if (scope === "others") list = list.filter((a) => a.deptId !== MY_DEPT);
    if (dept) list = list.filter((a) => a.deptId === dept);
    if (category) list = list.filter((a) => a.category === category);
    let out = list.map((a) => expandActivity(db, a));
    if (q) out = out.filter((a) => `${a.venueName} ${a.title} ${a.sub} ${a.deptName}`.includes(q));
    out.sort((a, b) => (a.date < b.date ? 1 : -1));
    res.json(out);
  });

  api.get("/activities/:id", (req, res) => {
    const db = getDb();
    const a = db.activities.find((x) => x.id === req.params.id);
    return a ? res.json(expandActivity(db, a)) : notFound(res, "활동 기록");
  });

  api.post("/activities/:id/comments", (req, res) => {
    const db = getDb();
    const a = db.activities.find((x) => x.id === req.params.id);
    if (!a) return notFound(res, "활동 기록");
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "코멘트 내용을 입력해 주세요" });
    a.comments.push({ id: uid("c"), author: db.employees.find((e) => e.id === ME).name, text, createdAt: today() });
    save();
    res.json(expandActivity(db, a));
  });

  api.post("/activities/:id/reviews", (req, res) => {
    const db = getDb();
    const a = db.activities.find((x) => x.id === req.params.id);
    if (!a) return notFound(res, "활동 기록");
    const emp = db.employees.find((e) => e.id === req.body.empId);
    const rating = Math.max(1, Math.min(5, Number(req.body.rating) || 0));
    if (!emp || !rating) return res.status(400).json({ error: "응답자와 평점이 필요합니다" });
    a.reviews = a.reviews.filter((r) => r.empId !== emp.id);
    a.reviews.push({ id: uid("r"), empId: emp.id, author: emp.name, rating, comment: String(req.body.comment || ""), createdAt: today() });
    log("후기", `${emp.name} 님 후기 수집 (${rating}점) → 다음 추천에 반영`);
    save();
    res.json(expandActivity(db, a));
  });

  // --- 메일함 · 로그 · 프로필 ---
  api.get("/mails", (req, res) => {
    const db = getDb();
    const to = req.query.to;
    res.json(db.mails.filter((m) => !to || m.to === to).slice(0, 200));
  });
  api.post("/mails/:id/read", (req, res) => {
    const mail = getDb().mails.find((m) => m.id === req.params.id);
    if (mail) { mail.read = true; save(); }
    res.json({ ok: true });
  });
  api.get("/logs", (_req, res) => res.json(getDb().logs.slice(-60).reverse()));
  api.get("/status", (_req, res) => {
    const db = getDb();
    res.json({ unread: db.mails.filter((m) => m.to === ME && !m.read).length, activityCount: db.activities.length });
  });

  api.put("/employees/:id/prefs", (req, res) => {
    const db = getDb();
    const emp = db.employees.find((e) => e.id === req.params.id);
    if (!emp) return notFound(res, "구성원");
    const { diet, alcohol, likes, note } = req.body;
    emp.prefs = { diet: diet || [], alcohol: alcohol || "조금", likes: likes || [], note: note || "" };
    save();
    res.json(emp);
  });

  api.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });
  return api;
}

function parseByRules(text) {
  const has = (re) => re.test(text);
  let category = "any";
  if (has(/워크숍|숙소|호텔|1박|펜션|글램핑/)) category = "stay";
  else if (has(/게임|볼링|액티비티|몸|방탈출|운동|체험|야구/)) category = "activity";
  else if (has(/mbti|클래스|공방|영화|문화|검사/i)) category = "culture";
  else if (has(/카페|커피|티타임/)) category = "cafe";
  else if (has(/회식|식당|맛집|저녁|고기|밥|점심/)) category = "restaurant";
  const man = text.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  const weeksAhead = has(/다음\s*주|이번\s*주/) ? 2 : has(/다음\s*달/) ? 8 : 4;
  const slot = has(/점심/) ? "lunch" : has(/종일|하루|1박/) ? "allday" : "dinner";
  return {
    category,
    budgetPerHead: man ? Math.round(Number(man[1]) * 10000) : 0,
    slot,
    weeksAhead,
    title: `${new Date().getMonth() + 1}월 조직문화활동`,
  };
}

function ruleAdvice(recs) {
  if (!recs.length) return "조건에 맞는 곳을 찾지 못했습니다. 유형이나 예산 조건을 넓혀 보세요.";
  const [top] = recs;
  const good = top.reasons.filter((r) => r.tone === "good").slice(0, 2).map((r) => r.text).join(", ");
  const warn = top.reasons.find((r) => r.tone === "warn");
  const fresh = recs.find((r) => r.visitsMine === 0 && r.id !== top.id);
  let text = `가장 권하는 곳은 ${top.name}입니다.${good ? ` 근거: ${good}.` : ""}`;
  if (warn) text += ` 확인할 점: ${warn.text}.`;
  if (top.visitsMine > 0 && fresh) text += ` 이미 가 본 곳이 부담스럽다면 처음 가는 ${fresh.name}도 좋은 대안입니다.`;
  return text;
}
