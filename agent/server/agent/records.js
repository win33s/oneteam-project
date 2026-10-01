// 크롤링한 경비 전표를 부서 활동 기록으로 변환한다.
import { log } from "../db.js";
import { uid, diffDays, dateLabel, won } from "../util.js";
import { sendMail } from "./mailer.js";

const CATEGORY_RULES = [
  ["stay", /호텔|리조트|펜션|글램핑|숙박|스테이|워크숍/],
  ["activity", /볼링|방탈출|클라이밍|야구|카약|컬링|보드게임|산책|체험|게임/],
  ["culture", /클래스|공방|영화|관람|MBTI|전시|공연/i],
  ["cafe", /카페|커피|베이커리/],
];

function inferCategory(text) {
  for (const [cat, re] of CATEGORY_RULES) if (re.test(text)) return cat;
  return "restaurant";
}

function ensureVenue(db, expense) {
  let venue = db.venues.find((v) => v.name === expense.vendor);
  if (venue) return venue;
  const category = inferCategory(`${expense.vendor} ${expense.item} ${expense.title}`);
  venue = {
    id: uid("v"),
    name: expense.vendor,
    category,
    sub: expense.item || "기타",
    area: "ERP 전표에서 자동 등록",
    price: Math.round(expense.amount / Math.max(1, expense.headcount)),
    base: 4,
    seasons: ["spring", "summer", "autumn", "winter"],
    emoji: { restaurant: "🍽️", activity: "🎯", culture: "🎨", stay: "🏨", cafe: "☕" }[category],
    hue: 210,
    f: {},
    capacity: 99,
    autoCreated: true,
  };
  db.venues.push(venue);
  log("ERP", `처음 보는 거래처 "${venue.name}" → 장소 DB에 새로 등록 (분류: ${category})`);
  return venue;
}

/** 참석자에게 후기 폼(네이버 폼 대체) 링크를 메일로 보낸다 */
export function sendReviewForm(db, activity) {
  if (activity.reviewFormSent) return;
  const venue = db.venues.find((v) => v.id === activity.venueId);
  for (const id of activity.participantIds) {
    sendMail(db, {
      to: id,
      type: "review",
      subject: `[후기 요청] ${dateLabel(activity.date)} ${venue.name} 어떠셨나요?`,
      body: `참석해 주셔서 감사합니다. 1분이면 끝나는 만족도 조사입니다.
응답은 다음 활동 장소 추천에 반영됩니다.`,
      link: `/review/${activity.id}?as=${id}`,
      linkLabel: "후기 폼 열기",
    });
  }
  activity.reviewFormSent = true;
  log("메일", `참석자 ${activity.participantIds.length}명에게 후기 폼 발송`);
}

export function registerActivity(db, expense, { silent }) {
  const dept = db.departments.find((d) => d.name === expense.dept);
  const venue = ensureVenue(db, expense);
  const members = db.employees.filter((e) => e.deptId === dept?.id);
  const planners = members.filter((e) => e.isPlanner);

  const activity = {
    id: uid("a"),
    docNo: expense.docNo,
    deptId: dept?.id || null,
    deptName: expense.dept,
    date: expense.useDate,
    title: expense.title,
    venueId: venue.id,
    category: venue.category,
    amount: expense.amount,
    headcount: expense.headcount,
    perHead: Math.round(expense.amount / Math.max(1, expense.headcount)),
    accountName: expense.accountName,
    accountCode: expense.accountCode,
    budgetSource: expense.budgetSource,
    item: expense.item,
    purpose: expense.purpose,
    detail: expense.detail,
    drafter: expense.drafter,
    source: "erp",
    participantIds: [],
    reviews: (db.reviewSeeds[expense.docNo] || []).map((r) => ({ id: uid("r"), ...r, createdAt: expense.useDate })),
    comments: db.commentSeeds[expense.docNo]
      ? [{ id: uid("c"), author: expense.drafter, text: db.commentSeeds[expense.docNo], createdAt: expense.draftDate }]
      : [],
    blog: db.blogPosts[expense.docNo] || null,
    reviewFormSent: silent,
    createdAt: new Date().toISOString(),
  };

  if (!silent) {
    // 확정된 기획과 같은 장소·비슷한 날짜면 그 기획의 결과로 연결한다
    const plan = db.plans.find(
      (p) => p.status === "confirmed" && p.venueId === venue.id && Math.abs(diffDays(p.date, expense.useDate)) <= 1
    );
    if (plan) {
      plan.status = "done";
      plan.activityId = activity.id;
      activity.planId = plan.id;
      activity.participantIds = plan.memberIds;
    } else {
      activity.participantIds = members.map((e) => e.id);
    }
    log("기록", `${expense.dept} 전표 ${expense.docNo} → "${venue.name}" 활동 기록 자동 등록${plan ? " (기획과 연결)" : ""}`);

    const willSend = plan?.reviewForm === "scheduled";
    for (const planner of planners) {
      sendMail(db, {
        to: planner.id,
        type: "record",
        subject: `[기록 업데이트] ${dateLabel(expense.useDate)} ${venue.name} 활동이 부서 기록에 올라갔습니다`,
        body: `ERP에 등록된 전표(${expense.docNo}, ${won(expense.amount)}, ${expense.accountName})를 읽어 부서 조직문화활동 기록으로 올렸습니다.

이번 활동이 어땠는지, 다음 담당자가 알아 두면 좋을 점을 코멘트로 남겨 주세요.
${willSend ? "미리 요청하신 대로 참석자에게 후기 폼을 발송했습니다." : "후기 폼은 아직 보내지 않았습니다. 기록 화면에서 발송할 수 있습니다."}`,
        link: `/history/${activity.id}`,
        linkLabel: "기록 보고 코멘트 남기기",
      });
    }
    log("메일", `담당자 ${planners.length}명에게 기록 업데이트 알림 발송`);
    if (willSend) {
      sendReviewForm(db, activity);
      plan.reviewForm = "sent";
    }
  }

  db.activities.push(activity);
  return activity;
}
