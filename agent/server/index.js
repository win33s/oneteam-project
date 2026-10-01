import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./db.js";
import { erpRouter } from "./erp.js";
import { apiRouter } from "./api.js";
import { crawlErp } from "./agent/crawler.js";
import { llmEnabled } from "./agent/llm.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const BASE_URL = `http://localhost:${PORT}`;
const SYNC_INTERVAL_MS = 10_000;

const app = express();
app.use("/erp", erpRouter);
app.use("/api", apiRouter(BASE_URL));

const dist = path.join(here, "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, async () => {
  console.log(`서버 실행: ${BASE_URL}  (Claude 연동: ${llmEnabled ? "켜짐" : "꺼짐, 규칙 기반으로 동작"})`);
  const db = getDb();
  // 최초 실행: ERP 전체 이력을 한 번 긁어 와 부서별 활동 기록을 만든다 (알림 메일 없이)
  if (!db.activities.length) await crawlErp({ baseUrl: BASE_URL, silent: true });
  // 이후: 담당자가 새 전표를 올리면 주기적으로 감지해 기록·알림·후기 폼까지 처리
  setInterval(() => crawlErp({ baseUrl: BASE_URL }).catch((e) => console.warn(`[sync] ${e.message}`)), SYNC_INTERVAL_MS);
});
