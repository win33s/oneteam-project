// Express 앱 조립. 로컬 서버(index.js)와 Vercel 함수(api/index.js)가 함께 쓴다.
import express from "express";
import { loadDb, flush, getDb } from "./db.js";
import { erpRouter } from "./erp.js";
import { apiRouter } from "./api.js";
import { crawlErp } from "./agent/crawler.js";

/**
 * @param {{getPage: (path: string) => any, syncOnPoll: boolean}} opts
 * getPage: 크롤러가 ERP 화면 HTML을 얻는 방법. syncOnPoll: 타이머 대신 화면의 상태 조회 때 새 전표를 확인할지.
 */
export function createApp({ getPage, syncOnPoll }) {
  const app = express();
  const crawl = (opts = {}) => crawlErp({ getPage, ...opts });

  // 요청마다: 저장소에서 읽고 → (처음이면 ERP 전체 이력 수집) → 처리 → 응답 직전에 바뀐 내용 저장
  app.use(async (_req, res, next) => {
    try {
      await loadDb();
      if (!getDb().activities.length) await crawl({ silent: true });
      const end = res.end.bind(res);
      res.end = (...args) => {
        flush().catch((e) => console.error(`[db] 저장 실패: ${e.message}`)).finally(() => end(...args));
        return res;
      };
      next();
    } catch (e) {
      next(e);
    }
  });

  app.use("/erp", erpRouter);
  app.use("/api", apiRouter({ crawl, syncOnPoll }));
  return { app, crawl };
}
