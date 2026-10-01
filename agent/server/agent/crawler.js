// ERP 화면 크롤러: 목록 페이지를 넘기며 전표번호를 모으고,
// 회의비/조직활성화 계정인 새 전표만 상세 화면을 열어 필드를 읽는다.
import * as cheerio from "cheerio";
import { getDb, save, log } from "../db.js";
import { registerActivity } from "./records.js";

export const CULTURE_ACCOUNT_CODES = ["53210", "52140"];

async function getHtml(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ERP 응답 오류 ${res.status}: ${url}`);
  return cheerio.load(await res.text());
}

async function readDetail(baseUrl, docNo) {
  const $ = await getHtml(`${baseUrl}/erp/expenses/${encodeURIComponent(docNo)}`);
  const out = {};
  $("#expense-detail td[data-field]").each((_, el) => {
    out[$(el).attr("data-field")] = $(el).text().trim();
  });
  out.amount = Number(out.amount) || 0;
  out.headcount = Number(out.headcount) || 1;
  return out;
}

let running = false;

/** @param {{baseUrl:string, silent?:boolean, maxPages?:number}} opts silent=true면 알림 메일 없이 기록만 쌓는다 (최초 전체 수집) */
export async function crawlErp({ baseUrl, silent = false, maxPages = 50 }) {
  if (running) return { skipped: true };
  running = true;
  try {
    const db = getDb();
    const seen = new Set(db.crawledDocNos);
    let scanned = 0;
    let ignored = 0;
    const created = [];
    for (let page = 1; page <= maxPages; page++) {
      const $ = await getHtml(`${baseUrl}/erp/expenses?page=${page}`);
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
        const expense = await readDetail(baseUrl, docNo);
        created.push(registerActivity(db, expense, { silent }));
      }
      // 주기 동기화에서는 새 전표가 없는 페이지를 만나면 멈춘다 (최신순 목록이므로)
      if (!silent && newOnPage === 0) break;
    }
    db.crawledDocNos = [...seen];
    if (created.length || silent) {
      log("ERP", `ERP 화면 ${scanned}건 확인 → 조직문화활동 전표 ${created.length}건 기록, 무관한 전표 ${ignored}건 제외`);
      save();
    }
    return { scanned, ignored, created };
  } finally {
    running = false;
  }
}
