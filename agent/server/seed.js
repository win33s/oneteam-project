// 데모용 가상 데이터. 부서·인물·장소·경비는 모두 지어낸 것이며 실제와 무관하다.
import { rng, pick, ymd, addDays, today, pad } from "./util.js";

export const MY_DEPT = "d1";
export const ME = "e101";

const DEPARTMENTS = [
  { id: "d1", name: "공정개발2팀", group: "제조기술 담당" },
  { id: "d2", name: "공정개발1팀", group: "제조기술 담당" },
  { id: "d3", name: "장비기술팀", group: "제조기술 담당" },
  { id: "d4", name: "소자설계팀", group: "제품개발 담당" },
  { id: "d5", name: "수율분석팀", group: "제품개발 담당" },
  { id: "d6", name: "품질보증팀", group: "제품개발 담당" },
];

// [이름, 직급, 식이 제한, 음주, 선호 카테고리, 메모]
const PEOPLE = {
  d1: [
    ["김하늘", "사원", [], "조금", ["activity", "culture"], "조직문화활동 기획 담당 (입사 1년차)"],
    ["박정우", "팀장", [], "좋아함", ["restaurant"], "좌식보다 테이블석 선호"],
    ["이서연", "책임", ["해산물 불가"], "조금", ["culture", "cafe"], ""],
    ["최민준", "책임", [], "좋아함", ["restaurant", "activity"], ""],
    ["정유진", "선임", ["채식"], "안 마심", ["culture", "cafe"], "채식 메뉴가 있으면 좋음"],
    ["강도현", "선임", [], "조금", ["activity"], "몸 쓰는 활동 선호"],
    ["윤지호", "선임", [], "안 마심", ["activity", "culture"], "자차 출퇴근이라 음주 어려움"],
    ["한소희", "선임", ["해산물 불가"], "조금", ["restaurant", "cafe"], ""],
    ["오세훈", "사원", [], "좋아함", ["activity", "restaurant"], ""],
    ["임채원", "사원", [], "조금", ["culture", "stay"], ""],
    ["서준영", "사원", ["매운 음식 불가"], "조금", ["activity"], ""],
    ["배수아", "사원", [], "안 마심", ["cafe", "culture"], ""],
  ],
  d2: [["조현우", "선임", [], "조금", [], "조직문화활동 기획 담당"], ["문가영", "팀장", [], "조금", [], ""], ["신동혁", "책임", [], "좋아함", [], ""], ["류하린", "사원", [], "조금", [], ""]],
  d3: [["남궁민", "사원", [], "조금", [], "조직문화활동 기획 담당"], ["홍석진", "팀장", [], "좋아함", [], ""], ["전소미", "선임", [], "안 마심", [], ""], ["표지훈", "사원", [], "조금", [], ""]],
  d4: [["안예린", "선임", [], "조금", [], "조직문화활동 기획 담당"], ["황보석", "팀장", [], "조금", [], ""], ["유태오", "책임", [], "좋아함", [], ""], ["진세연", "사원", [], "안 마심", [], ""]],
  d5: [["노은채", "사원", [], "조금", [], "조직문화활동 기획 담당"], ["길상우", "팀장", [], "좋아함", [], ""], ["탁재훈", "선임", [], "조금", [], ""], ["소유나", "사원", [], "조금", [], ""]],
  d6: [["여진구", "선임", [], "조금", [], "조직문화활동 기획 담당"], ["봉태규", "팀장", [], "조금", [], ""], ["채수빈", "책임", [], "안 마심", [], ""], ["금보라", "사원", [], "조금", [], ""]],
};

const ALL = ["spring", "summer", "autumn", "winter"];
// f: veg(채식 가능) seafood(해산물 위주) alcohol(술 위주) spicy(매운 메뉴 위주) room(단체석)
const VENUES = [
  { id: "v1", name: "화로담 숯불갈비", category: "restaurant", sub: "고깃집", area: "이천 부발읍", price: 38000, base: 4.3, seasons: ALL, emoji: "🥩", hue: 14, f: { alcohol: true, room: true }, capacity: 40 },
  { id: "v2", name: "들밥상 이천쌀밥 한정식", category: "restaurant", sub: "한정식", area: "이천 신둔면", price: 32000, base: 4.5, seasons: ALL, emoji: "🍚", hue: 42, f: { veg: true, room: true }, capacity: 60 },
  { id: "v3", name: "청해 횟집", category: "restaurant", sub: "횟집", area: "이천 중리동", price: 45000, base: 4.0, seasons: ["winter", "autumn"], emoji: "🐟", hue: 200, f: { seafood: true, alcohol: true, room: true }, capacity: 30 },
  { id: "v4", name: "라 테라짜", category: "restaurant", sub: "이탈리안", area: "이천 설봉공원 인근", price: 35000, base: 4.6, seasons: ["spring", "autumn"], emoji: "🍝", hue: 350, f: { veg: true, room: false }, capacity: 24 },
  { id: "v5", name: "양꼬치 삼형제", category: "restaurant", sub: "양꼬치", area: "이천 부발읍", price: 30000, base: 3.8, seasons: ALL, emoji: "🍢", hue: 25, f: { alcohol: true, spicy: true }, capacity: 28 },
  { id: "v6", name: "솥뚜껑 닭볶음탕", category: "restaurant", sub: "한식", area: "이천 대월면", price: 25000, base: 4.1, seasons: ["winter", "autumn"], emoji: "🍲", hue: 8, f: { spicy: true, room: true }, capacity: 36 },
  { id: "v7", name: "온기 샤브샤브", category: "restaurant", sub: "샤브샤브", area: "이천 증포동", price: 28000, base: 4.4, seasons: ["winter", "autumn"], emoji: "🥬", hue: 95, f: { veg: true, room: true }, capacity: 32 },
  { id: "v8", name: "루프탑 비어가든", category: "restaurant", sub: "맥주·야외석", area: "이천 중리동", price: 27000, base: 4.2, seasons: ["summer", "spring"], emoji: "🍺", hue: 45, f: { alcohol: true }, capacity: 50, outdoor: true },
  { id: "v9", name: "스트라이크 볼링센터", category: "activity", sub: "볼링", area: "이천 증포동", price: 15000, base: 4.4, seasons: ALL, emoji: "🎳", hue: 265, f: {}, capacity: 40 },
  { id: "v10", name: "미궁 방탈출 카페", category: "activity", sub: "방탈출", area: "이천 중리동", price: 22000, base: 4.6, seasons: ALL, emoji: "🗝️", hue: 285, f: {}, capacity: 18 },
  { id: "v11", name: "클라임온 실내 클라이밍", category: "activity", sub: "클라이밍", area: "이천 마장면", price: 20000, base: 4.0, seasons: ALL, emoji: "🧗", hue: 170, f: {}, capacity: 16 },
  { id: "v12", name: "설봉 둘레길 산책과 도시락", category: "activity", sub: "야외 산책", area: "이천 설봉공원", price: 12000, base: 4.5, seasons: ["spring", "autumn"], emoji: "🍁", hue: 28, f: { veg: true }, capacity: 60, outdoor: true },
  { id: "v13", name: "레이크 카약 체험", category: "activity", sub: "수상레저", area: "여주 남한강", price: 30000, base: 4.3, seasons: ["summer"], emoji: "🛶", hue: 190, f: {}, capacity: 20, outdoor: true },
  { id: "v14", name: "홈런존 스크린야구", category: "activity", sub: "스크린야구", area: "이천 부발읍", price: 18000, base: 4.1, seasons: ALL, emoji: "⚾", hue: 215, f: { alcohol: true }, capacity: 24 },
  { id: "v15", name: "아이스링크 컬링 체험", category: "activity", sub: "컬링", area: "용인 기흥", price: 25000, base: 4.7, seasons: ["winter"], emoji: "🥌", hue: 205, f: {}, capacity: 24 },
  { id: "v16", name: "주사위 보드게임 라운지", category: "activity", sub: "보드게임", area: "이천 증포동", price: 12000, base: 4.2, seasons: ALL, emoji: "🎲", hue: 320, f: {}, capacity: 30 },
  { id: "v17", name: "도예마을 도자기 공방", category: "culture", sub: "원데이 클래스", area: "이천 신둔면 도예촌", price: 35000, base: 4.7, seasons: ["spring", "autumn"], emoji: "🏺", hue: 30, f: {}, capacity: 20 },
  { id: "v18", name: "향기공방 캔들·향수 클래스", category: "culture", sub: "원데이 클래스", area: "이천 중리동", price: 30000, base: 4.3, seasons: ["winter"], emoji: "🕯️", hue: 55, f: {}, capacity: 14 },
  { id: "v19", name: "시네마 단체관람 대관", category: "culture", sub: "영화 관람", area: "이천 터미널 인근", price: 15000, base: 4.0, seasons: ALL, emoji: "🎬", hue: 240, f: {}, capacity: 80 },
  { id: "v20", name: "MBTI 팀 워크숍 (외부 강사)", category: "culture", sub: "성향 검사·워크숍", area: "사내 대회의실", price: 20000, base: 4.2, seasons: ALL, emoji: "🧩", hue: 150, f: {}, capacity: 40 },
  { id: "v21", name: "한끼 쿠킹 스튜디오", category: "culture", sub: "쿠킹 클래스", area: "이천 증포동", price: 40000, base: 4.5, seasons: ALL, emoji: "👩‍🍳", hue: 18, f: { veg: true }, capacity: 16 },
  { id: "v22", name: "숲속 스테이 워크숍", category: "stay", sub: "펜션·워크숍", area: "양평 용문", price: 90000, base: 4.4, seasons: ["autumn", "spring"], emoji: "🌲", hue: 130, f: { room: true }, capacity: 25, outdoor: true },
  { id: "v23", name: "테르메 온천 리조트", category: "stay", sub: "온천 호텔", area: "이천 모가면", price: 110000, base: 4.6, seasons: ["winter"], emoji: "♨️", hue: 195, f: { room: true }, capacity: 40 },
  { id: "v24", name: "강변 글램핑 파크", category: "stay", sub: "글램핑", area: "여주 강천면", price: 70000, base: 4.1, seasons: ["spring", "summer"], emoji: "⛺", hue: 80, f: { alcohol: true }, capacity: 30, outdoor: true },
  { id: "v25", name: "로스터리 창고", category: "cafe", sub: "대형 카페", area: "이천 마장면", price: 9000, base: 4.3, seasons: ALL, emoji: "☕", hue: 22, f: { veg: true }, capacity: 50 },
  // fresh: 어느 부서도 아직 가 본 적 없는 곳 (경비 전표가 없음). "완전히 새로운 제안"에 쓰인다.
  { id: "v27", name: "별마루 천문대 야간 관측", category: "activity", sub: "천문 관측", area: "여주 세종천문대 인근", price: 18000, base: 4, seasons: ["autumn", "winter"], emoji: "🔭", hue: 235, f: {}, capacity: 30, outdoor: true, fresh: true },
  { id: "v28", name: "레트로 오락실과 LP 라운지", category: "activity", sub: "오락실·음악 감상", area: "이천 중리동", price: 16000, base: 4, seasons: ALL, emoji: "🕹️", hue: 300, f: {}, capacity: 26, fresh: true },
  { id: "v29", name: "딸기·블루베리 농장 체험", category: "activity", sub: "수확 체험", area: "이천 장호원", price: 20000, base: 4, seasons: ["spring", "summer"], emoji: "🍓", hue: 350, f: { veg: true }, capacity: 40, outdoor: true, fresh: true },
  { id: "v30", name: "꽃담 플라워 클래스", category: "culture", sub: "원데이 클래스", area: "이천 증포동", price: 33000, base: 4, seasons: ALL, emoji: "💐", hue: 330, f: {}, capacity: 16, fresh: true },
  { id: "v31", name: "초록식탁 비건 다이닝", category: "restaurant", sub: "채식 코스", area: "이천 설봉공원 인근", price: 34000, base: 4, seasons: ALL, emoji: "🥗", hue: 110, f: { veg: true, room: true }, capacity: 28, fresh: true },
  { id: "v32", name: "과녁 실내 양궁 카페", category: "activity", sub: "양궁", area: "이천 부발읍", price: 17000, base: 4, seasons: ALL, emoji: "🏹", hue: 5, f: {}, capacity: 20, fresh: true },
  { id: "v26", name: "벚꽃길 베이커리 카페", category: "cafe", sub: "베이커리 카페", area: "이천 설봉호수", price: 11000, base: 4.5, seasons: ["spring"], emoji: "🌸", hue: 335, f: { veg: true }, capacity: 35 },
];

const REVIEW_TEXT = {
  5: ["다들 정말 좋아했어요. 또 가고 싶다는 얘기가 많았습니다.", "분위기도 좋고 진행도 매끄러웠습니다. 강력 추천합니다.", "평소 말이 없던 분들도 많이 웃으셨어요.", "예약부터 마무리까지 수월했습니다."],
  4: ["전반적으로 만족스러웠습니다. 주차가 조금 아쉬웠어요.", "가격 대비 괜찮았습니다.", "재미있었는데 시간이 조금 빠듯했습니다.", "단체로 가기 무난하게 좋았습니다."],
  3: ["나쁘지 않았지만 특별하지는 않았습니다.", "인원이 많아서 조금 정신없었습니다.", "호불호가 갈렸습니다.", "대기 시간이 길었습니다."],
  2: ["단체석이 좁아서 불편했습니다.", "시끄러워서 대화가 어려웠습니다.", "이동 거리가 너무 멀었습니다."],
  1: ["다시 가고 싶지 않습니다. 응대가 아쉬웠어요."],
};

const PLANNER_COMMENT = [
  "최소 2주 전에 예약해야 단체석을 잡을 수 있습니다.",
  "법인카드 결제 시 단체 할인을 먼저 요청하세요.",
  "셔틀 시간에 맞춰 18시 30분 시작으로 잡으니 참석률이 좋았습니다.",
  "인원 변동이 있으면 전날까지 연락 달라고 합니다.",
  "팀을 섞어서 조를 짜니 분위기가 훨씬 좋았습니다.",
];

const NOISE = [
  ["사무용품비", "54110", "사무용품 구매", "토너 및 A4 용지", "사무용품 보충"],
  ["여비교통비", "53310", "청주 캠퍼스 출장 교통비", "KTX 왕복", "공정 이관 회의 참석"],
  ["교육훈련비", "53510", "외부 세미나 참가비", "반도체 공정 세미나", "직무 교육"],
  ["도서인쇄비", "54210", "기술 서적 구입", "도서 3권", "팀 스터디"],
];

function accountFor(venue, r) {
  if (venue.category === "restaurant" || venue.category === "cafe")
    return r() < 0.6 ? ["회의비", "53210"] : ["복리후생비-조직활성화", "52140"];
  return ["복리후생비-조직활성화", "52140"];
}

export function buildSeed() {
  const r = rng(20261001);
  const now = today();

  const employees = [];
  for (const dept of DEPARTMENTS) {
    PEOPLE[dept.id].forEach(([name, title, diet, alcohol, likes, note], i) => {
      const num = Number(dept.id.slice(1)) * 100 + i + 1;
      employees.push({
        id: `e${num}`,
        name,
        title,
        deptId: dept.id,
        email: `user${num}@demo-corp.example`,
        isPlanner: i === 0,
        prefs: { diet, alcohol, likes },
      });
    });
  }
  const byDept = (id) => employees.filter((e) => e.deptId === id);

  // --- ERP 경비 전표 (지난 18개월) ---
  const erpExpenses = [];
  const reviewSeeds = {};
  const blogPosts = {};
  const commentSeeds = {};
  let seq = 1000;
  // 우리 부서는 같은 곳을 반복해서 간 이력을 일부러 넣는다 (중복 체크 데모용)
  const myFixed = { 1: "v1", 3: "v9", 4: "v1", 6: "v8", 8: "v1", 10: "v9", 12: "v7", 14: "v2" };

  for (let back = 18; back >= 1; back--) {
    for (const dept of DEPARTMENTS) {
      if (r() < 0.12) continue;
      const base = addDays(now, -back * 30 + Math.floor(r() * 20) - 10);
      while (base.getDay() === 0 || base.getDay() === 6) base.setDate(base.getDate() - 1);
      const date = ymd(base);
      const m = base.getMonth() + 1;
      const season = m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
      let venue;
      if (dept.id === MY_DEPT && myFixed[back]) venue = VENUES.find((v) => v.id === myFixed[back]);
      else {
        const pool = VENUES.filter((v) => v.seasons.includes(season) && !v.fresh);
        venue = pick(r, pool);
      }
      const members = byDept(dept.id);
      const headcount = dept.id === MY_DEPT ? 9 + Math.floor(r() * 4) : 8 + Math.floor(r() * 10);
      const amount = Math.round((venue.price * headcount * (0.9 + r() * 0.25)) / 100) * 100;
      const [accountName, accountCode] = accountFor(venue, r);
      const docNo = `EX${base.getFullYear()}${pad(m)}-${seq++}`;
      erpExpenses.push({
        docNo,
        draftDate: ymd(addDays(date, 1 + Math.floor(r() * 3))),
        useDate: date,
        dept: dept.name,
        drafter: members[0].name,
        accountName,
        accountCode,
        budgetSource: r() < 0.5 ? "팀장 배정 예산" : "부서 공통 예산",
        title: `${m}월 조직문화활동 - ${venue.name}`,
        vendor: venue.name,
        item: venue.sub,
        purpose: `부서 조직력 강화를 위한 ${venue.category === "restaurant" ? "회식" : "단체 활동"}`,
        detail: `${venue.sub} ${headcount}인 이용`,
        headcount,
        amount,
        status: "승인완료",
      });

      const n = 2 + Math.floor(r() * 4);
      reviewSeeds[docNo] = Array.from({ length: n }, () => {
        const rating = Math.max(1, Math.min(5, Math.round(venue.base + (r() - 0.5) * 2)));
        return { author: pick(r, members).name, rating, comment: pick(r, REVIEW_TEXT[rating]) };
      });
      if (r() < 0.35)
        blogPosts[docNo] = { title: `[${dept.name}] ${venue.name} 다녀왔습니다`, photos: 3 + Math.floor(r() * 9) };
      if (r() < 0.5) commentSeeds[docNo] = pick(r, PLANNER_COMMENT);
    }
    // 조직문화활동이 아닌 전표 (에이전트가 걸러내야 하는 노이즈)
    for (let k = 0; k < 2; k++) {
      const dept = pick(r, DEPARTMENTS);
      const [accountName, accountCode, title, detail, purpose] = pick(r, NOISE);
      const d = addDays(now, -back * 30 + Math.floor(r() * 25));
      erpExpenses.push({
        docNo: `EX${d.getFullYear()}${pad(d.getMonth() + 1)}-${seq++}`,
        draftDate: ymd(d),
        useDate: ymd(d),
        dept: dept.name,
        drafter: byDept(dept.id)[1 + Math.floor(r() * 3)].name,
        accountName,
        accountCode,
        budgetSource: "부서 공통 예산",
        title,
        vendor: "-",
        item: detail,
        purpose,
        detail,
        headcount: 1,
        amount: 20000 + Math.floor(r() * 30) * 5000,
        status: "승인완료",
      });
    }
  }
  erpExpenses.sort((a, b) => (a.useDate < b.useDate ? 1 : -1));

  // --- 캘린더 (앞으로 7주) ---
  const calendar = [];
  const EVENT_TYPES = [
    ["휴가", 0.4, 1, 3],
    ["출장", 0.25, 1, 2],
    ["교육", 0.2, 1, 2],
    ["야간 근무", 0.15, 1, 1],
  ];
  for (const e of employees) {
    const count = 2 + Math.floor(r() * 4);
    for (let i = 0; i < count; i++) {
      let roll = r();
      let type = EVENT_TYPES[0];
      for (const t of EVENT_TYPES) {
        if (roll < t[1]) { type = t; break; }
        roll -= t[1];
      }
      const start = addDays(now, 3 + Math.floor(r() * 45));
      const len = type[2] + Math.floor(r() * (type[3] - type[2] + 1));
      calendar.push({ empId: e.id, from: ymd(start), to: ymd(addDays(start, len - 1)), type: type[0] });
    }
  }
  // 부서 과제 일정. important=true인 기간은 날짜 후보에서 자동으로 빠진다.
  const MILESTONE_TITLES = ["평가 Lot 결과 보고", "분기 과제 중간 리뷰", "신규 공정 조건 확정 회의"];
  const milestones = [];
  DEPARTMENTS.forEach((dept, i) => {
    [[12, 3, true], [26, 2, true], [40, 1, false]].forEach(([offset, len, important], k) => {
      const start = addDays(now, offset + i * 2);
      milestones.push({ deptId: dept.id, from: ymd(start), to: ymd(addDays(start, len - 1)), title: MILESTONE_TITLES[k], important });
    });
  });

  // 사내 블로그·동아리 게시판에 올라온 단체 사진 (경비 전표와 별개로 수집되는 방문 흔적)
  const CLUBS = ["볼링 동아리", "러닝 크루", "사진 동아리", "보드게임 동아리", "미식 동호회"];
  const photoPosts = [];
  for (const v of VENUES) {
    if (v.fresh) continue;
    const n = Math.floor(r() * 4);
    for (let i = 0; i < n; i++) photoPosts.push({ venueId: v.id, source: r() < 0.5 ? "사내 블로그" : pick(r, CLUBS), photos: 2 + Math.floor(r() * 10) });
  }

  return {
    meta: { seededAt: now },
    departments: DEPARTMENTS,
    employees,
    venues: VENUES,
    erpExpenses,
    reviewSeeds,
    blogPosts,
    commentSeeds,
    calendar,
    milestones,
    photoPosts,
    activities: [],
    crawledDocNos: [],
    plans: [],
    polls: [],
    mails: [],
    logs: [],
  };
}
