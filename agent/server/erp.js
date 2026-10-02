// Mock ERP: 사내 경비 처리 시스템을 흉내 낸 서버 렌더링 HTML 화면.
// 에이전트는 API가 아니라 이 화면(HTML)을 크롤링해서 경비 전표를 읽어 온다.
import express from "express";
import { getDb, save } from "./db.js";
import { esc, won, today, pad, parseYmd } from "./util.js";

export const erpRouter = express.Router();
const PAGE_SIZE = 20;

const ACCOUNTS = [
  ["회의비", "53210"],
  ["복리후생비-조직활성화", "52140"],
  ["교육훈련비", "53510"],
  ["사무용품비", "54110"],
  ["여비교통비", "53310"],
];

const layout = (title, body) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${esc(title)} | G-ERP 경비관리</title>
<style>
  body{margin:0;font-family:"Malgun Gothic","맑은 고딕",Dotum,sans-serif;font-size:13px;background:#e9edf2;color:#222}
  header{background:#1f3a5f;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:18px}
  header b{font-size:16px;letter-spacing:.5px} header span{opacity:.75;font-size:12px}
  nav{background:#2f4f7a;padding:0 18px} nav a{display:inline-block;color:#dbe6f5;padding:8px 14px;text-decoration:none}
  nav a:hover{background:#3c6399}
  main{padding:18px;max-width:1280px;margin:0 auto}
  h1{font-size:15px;border-left:4px solid #1f3a5f;padding-left:8px;margin:0 0 12px}
  .notice{background:#fff8dc;border:1px solid #e3d48a;padding:8px 12px;margin-bottom:12px;font-size:12px}
  table{border-collapse:collapse;width:100%;background:#fff}
  th,td{border:1px solid #c5ccd6;padding:6px 8px;text-align:left}
  th{background:#dfe6ef;white-space:nowrap}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  tr:hover td{background:#f4f8fd}
  a{color:#1a4f9c}
  .pager{margin-top:10px} .pager a,.pager strong{padding:3px 8px;border:1px solid #c5ccd6;background:#fff;margin-right:3px;text-decoration:none}
  .pager strong{background:#1f3a5f;color:#fff}
  form.filter{margin-bottom:10px;background:#fff;border:1px solid #c5ccd6;padding:8px}
  input,select,textarea{font:inherit;padding:4px 6px;border:1px solid #9aa6b5}
  button,.btn{font:inherit;background:#1f3a5f;color:#fff;border:0;padding:6px 14px;cursor:pointer;text-decoration:none;display:inline-block}
  table.detail th{width:160px}
  .actions{margin-top:12px;display:flex;gap:8px}
</style></head>
<body>
<header><b>G-ERP</b><span>경비관리 · 데모용 가상 시스템</span></header>
<nav><a href="/erp/expenses">경비 전표 조회</a><a href="/erp/new">신규 경비 등록</a><a href="/">HBM으로 돌아가기</a></nav>
<main>${body}</main></body></html>`;

erpRouter.get("/", (_req, res) => res.redirect("/erp/expenses"));

export function listPageHtml(db, { dept = "", page = 1 } = {}) {
  page = Math.max(1, Number(page) || 1);
  const all = db.erpExpenses.filter((e) => !dept || e.dept === dept);
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const q = dept ? `&dept=${encodeURIComponent(dept)}` : "";
  const body = `
  <h1>경비 전표 조회</h1>
  <div class="notice">이 화면은 데모용 가상 ERP입니다. HBM 에이전트가 이 목록과 상세 화면을 주기적으로 읽어 갑니다.</div>
  <form class="filter" method="get">부서
    <select name="dept"><option value="">전체</option>${db.departments
      .map((d) => `<option ${d.name === dept ? "selected" : ""}>${esc(d.name)}</option>`)
      .join("")}</select>
    <button>조회</button> &nbsp; 총 <b id="total-count">${all.length}</b>건
  </form>
  <table id="expense-list"><thead><tr>
    <th>전표번호</th><th>기안일</th><th>사용일</th><th>부서</th><th>기안자</th><th>계정</th><th>예산구분</th><th>제목</th><th>금액</th><th>상태</th>
  </tr></thead><tbody>
  ${rows
    .map(
      (e) => `<tr class="expense-row" data-doc="${esc(e.docNo)}">
      <td class="doc"><a href="/erp/expenses/${encodeURIComponent(e.docNo)}">${esc(e.docNo)}</a></td>
      <td>${e.draftDate}</td><td class="use-date">${e.useDate}</td><td class="dept">${esc(e.dept)}</td><td>${esc(e.drafter)}</td>
      <td class="account" data-code="${e.accountCode}">${esc(e.accountName)} (${e.accountCode})</td>
      <td>${esc(e.budgetSource)}</td><td>${esc(e.title)}</td><td class="num">${won(e.amount)}</td><td>${esc(e.status)}</td></tr>`
    )
    .join("")}
  </tbody></table>
  <div class="pager">${Array.from({ length: pages }, (_, i) =>
    i + 1 === page ? `<strong>${i + 1}</strong>` : `<a href="?page=${i + 1}${q}">${i + 1}</a>`
  ).join("")}</div>`;
  return layout("경비 전표 조회", body);
}

export function detailPageHtml(db, docNo) {
  const e = db.erpExpenses.find((x) => x.docNo === docNo);
  if (!e) return null;
  const row = (label, field, value) => `<tr><th>${label}</th><td data-field="${field}">${esc(value)}</td></tr>`;
  const body = `
  <h1>경비 전표 상세</h1>
  <table class="detail" id="expense-detail">
    ${row("전표번호", "docNo", e.docNo)}
    ${row("기안일", "draftDate", e.draftDate)}
    ${row("사용일", "useDate", e.useDate)}
    ${row("부서", "dept", e.dept)}
    ${row("기안자", "drafter", e.drafter)}
    ${row("계정명", "accountName", e.accountName)}
    ${row("계정코드", "accountCode", e.accountCode)}
    ${row("예산구분", "budgetSource", e.budgetSource)}
    ${row("제목", "title", e.title)}
    ${row("거래처", "vendor", e.vendor)}
    ${row("품목", "item", e.item)}
    ${row("용도", "purpose", e.purpose)}
    ${row("구입·소비 내역", "detail", e.detail)}
    ${row("인원", "headcount", e.headcount)}
    ${row("금액", "amount", e.amount)}
    ${row("결제수단", "payment", "법인카드")}
    ${row("상태", "status", e.status)}
  </table>
  <div class="actions"><a class="btn" href="/erp/expenses">목록</a></div>`;
  return layout(e.title, body);
}

/** 크롤러용: ERP 경로를 받아 그 화면의 HTML을 돌려준다 (HTTP를 거치지 않는 서버리스 환경에서 사용) */
export function renderErpPage(db, pathAndQuery) {
  const url = new URL(pathAndQuery, "http://erp.local");
  const m = url.pathname.match(/^\/erp\/expenses\/(.+)$/);
  if (m) return detailPageHtml(db, decodeURIComponent(m[1]));
  if (url.pathname === "/erp/expenses") return listPageHtml(db, { dept: url.searchParams.get("dept") || "", page: url.searchParams.get("page") });
  return null;
}

erpRouter.get("/expenses", (req, res) => res.send(listPageHtml(getDb(), { dept: req.query.dept || "", page: req.query.page })));

erpRouter.get("/expenses/:docNo", (req, res) => {
  const html = detailPageHtml(getDb(), req.params.docNo);
  return html ? res.send(html) : res.status(404).send(layout("없음", "<h1>전표를 찾을 수 없습니다</h1>"));
});

erpRouter.get("/new", (req, res) => {
  const db = getDb();
  const plan = db.plans.find((p) => p.id === req.query.planId);
  const venue = plan && db.venues.find((v) => v.id === plan.venueId);
  // 기획에서 넘어온 경우 그 기획의 부서·담당자로, 아니면 ?emp= 로 받은 로그인 사용자로 채운다
  const me = db.employees.find((e) => e.id === (plan?.ownerId || req.query.emp)) || db.employees[0];
  const dept = db.departments.find((d) => d.id === (plan?.deptId || me.deptId));
  const headcount = plan ? plan.memberIds.length : 10;
  const pre = {
    useDate: plan?.date || today(),
    title: venue ? `${parseYmd(plan.date).getMonth() + 1}월 조직문화활동 - ${venue.name}` : "",
    vendor: venue?.name || "",
    item: venue?.sub || "",
    purpose: "부서 조직력 강화를 위한 단체 활동",
    detail: venue ? `${venue.sub} ${headcount}인 이용` : "",
    amount: venue ? venue.price * headcount : "",
  };
  const inp = (name, value, extra = "") => `<input name="${name}" value="${esc(value)}" size="50" ${extra}>`;
  const body = `
  <h1>신규 경비 등록</h1>
  <div class="notice">${plan ? "에이전트에서 확정한 계획 내용으로 미리 채웠습니다. " : ""}등록하면 HBM 에이전트가 이 전표를 읽어 부서 활동 기록에 자동으로 올립니다.</div>
  <form method="post" action="/erp/expenses">
  <table class="detail">
    <tr><th>부서</th><td><select name="dept">${db.departments
      .map((d) => `<option ${d.id === dept.id ? "selected" : ""}>${esc(d.name)}</option>`)
      .join("")}</select></td></tr>
    <tr><th>기안자</th><td>${inp("drafter", me.name)}</td></tr>
    <tr><th>사용일</th><td>${inp("useDate", pre.useDate, 'type="date"')}</td></tr>
    <tr><th>계정</th><td><select name="account">${ACCOUNTS.map(
      ([n, c]) => `<option value="${n}|${c}">${n} (${c})</option>`
    ).join("")}</select></td></tr>
    <tr><th>예산구분</th><td><select name="budgetSource"><option>팀장 배정 예산</option><option>부서 공통 예산</option></select></td></tr>
    <tr><th>제목</th><td>${inp("title", pre.title, "required")}</td></tr>
    <tr><th>거래처</th><td>${inp("vendor", pre.vendor, "required")}</td></tr>
    <tr><th>품목</th><td>${inp("item", pre.item)}</td></tr>
    <tr><th>용도</th><td>${inp("purpose", pre.purpose)}</td></tr>
    <tr><th>구입·소비 내역</th><td>${inp("detail", pre.detail)}</td></tr>
    <tr><th>인원</th><td>${inp("headcount", headcount, 'type="number" min="1"')}</td></tr>
    <tr><th>금액(원)</th><td>${inp("amount", pre.amount, 'type="number" min="0" required')}</td></tr>
  </table>
  <div class="actions"><button>법인카드 사용 내역 등록</button><a class="btn" href="/erp/expenses">취소</a></div>
  </form>`;
  res.send(layout("신규 경비 등록", body));
});

erpRouter.post("/expenses", express.urlencoded({ extended: false }), (req, res) => {
  const db = getDb();
  const b = req.body;
  const [accountName, accountCode] = String(b.account || "회의비|53210").split("|");
  const d = new Date();
  const seq = 5000 + db.erpExpenses.length;
  const expense = {
    docNo: `EX${d.getFullYear()}${pad(d.getMonth() + 1)}-${seq}`,
    draftDate: today(),
    useDate: b.useDate || today(),
    dept: b.dept,
    drafter: b.drafter || "",
    accountName,
    accountCode,
    budgetSource: b.budgetSource,
    title: b.title,
    vendor: b.vendor,
    item: b.item || "",
    purpose: b.purpose || "",
    detail: b.detail || "",
    headcount: Number(b.headcount) || 1,
    amount: Number(b.amount) || 0,
    status: "승인완료",
  };
  db.erpExpenses.unshift(expense);
  save();
  res.redirect(`/erp/expenses/${encodeURIComponent(expense.docNo)}`);
});
