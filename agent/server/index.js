// 로컬 실행용 서버. Vercel에서는 api/index.js가 대신 쓰인다.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storage } from "./db.js";
import { createApp } from "./app.js";
import { httpPageFetcher } from "./agent/crawler.js";
import { llmEnabled } from "./agent/llm.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const BASE_URL = `http://localhost:${PORT}`;
const SYNC_INTERVAL_MS = 10_000;

// 로컬에서는 에이전트가 ERP 화면에 실제로 HTTP 접속해서 읽는다
const { app, crawl } = createApp({ getPage: httpPageFetcher(BASE_URL), syncOnPoll: false });

const dist = path.join(here, "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`서버 실행: ${BASE_URL}  (저장소: ${storage}, Claude 연동: ${llmEnabled ? "켜짐" : "꺼짐, 규칙 기반으로 동작"})`);
  // 담당자가 새 전표를 올리면 주기적으로 감지해 기록·알림·후기 폼까지 처리
  // (최초 전체 수집은 첫 요청 때 app.js에서 한다)
  fetch(`${BASE_URL}/api/status`).catch(() => {});
  setInterval(() => crawl().catch((e) => console.warn(`[sync] ${e.message}`)), SYNC_INTERVAL_MS);
});
