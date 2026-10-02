// ERP 화면 크롤러: 목록 페이지를 넘기며 전표번호를 모으고,
// 회의비/조직활성화 계정인 새 전표만 상세 화면을 열어 필드를 읽는다.
import * as cheerio from "cheerio";
import { getDb, save, log } from "../db.js";
import { registerActivity } from "./records.js";

export const CULTURE_ACCOUNT_CODES = ["53210", "52140"];

/** 로컬 서버용: ERP 화면을 HTTP로 받아 온다 */
export const httpPageFetcher = (baseUrl) => async (path) => {
  const res = await fetch(baseUrl + path);
  if (!res.ok) throw new Error(`ERP 응답 오류 ${res.status}: ${path}`);
  return res.text();
};

let running = false;

/**
 * @param {{getPage: (path: string) => Promise<string|null>|string|null, silent?: boolean, maxPages?: number}} opts
 * getPage는 ERP 경로를 받아 그 화면의 HTML을 돌려준다. silent=true면 알림 메일 없이 기록만 쌓는다 (최초 전체 수집).
 */
export async function crawlErp({ getPage, silent = false, maxPages = 50 }) {
  if (running) return { skipped: true };
  running = true;
  try {
    const db = getDb();
    const load = async (path) => cheerio.load((await getPage(path)) || "");
    const seen = new Set(db.crawledDocNos);
    let scanned = 0;
    let ignored = 0;
    const created = [];
    for (let page = 1; page <= maxPages; page++) {
      const $ = await load(`/erp/expenses?page=${page}`);
      const rows = $("#expense-list tr.expense-row").toArray();
      if (!rows.length) break;
      let newOnPage = 0;
      for (const row of rows) {
        const docNo = $(row).attr("data-doc");
        scanned++;
        if (seen.has(docNo)) continue;
        newOnPage++;
        seen.add(docNo);
        const code = $(row).find("td.account").attr("data-code");
        if (!CULTURE_ACCOUNT_CODES.includes(code)) {
          ignored++;
          continue;
        }
        const $d = await load(`/erp/expenses/${encodeURIComponent(docNo)}`);
        const expense = {};
        $d("#expense-detail td[data-field]").each((_, el) => {
          expense[$d(el).attr("data-field")] = $d(el).text().trim();
        });
        expense.amount = Number(expense.amount) || 0;
        expense.headcount = Number(expense.headcount) || 1;
        created.push(registerActivity(db, expense, { silent }));
      }
      // 주기 동기화에서는 새 전표가 없는 페이지를 만나면 멈춘다 (최신순 목록이므로)
      if (!silent && newOnPage === 0) break;
    }
    if (created.length || ignored || silent) {
      db.crawledDocNos = [...seen];
      log("ERP", `ERP 화면 ${scanned}건 확인 → 조직문화활동 전표 ${created.length}건 기록, 무관한 전표 ${ignored}건 제외`);
      save();
    }
    return { scanned, ignored, created };
  } finally {
    running = false;
  }
}
