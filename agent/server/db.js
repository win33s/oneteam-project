// 데이터 저장소.
// - 로컬: data/db.json 파일
// - Vercel: Upstash Redis (환경변수가 있으면). 서버리스는 요청이 끝나면 파일이 사라지므로 외부 DB에 통째로 저장한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSeed } from "./seed.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(here, "..", "data", "db.json");

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const REDIS_KEY = "hbm:db";
const onVercel = Boolean(process.env.VERCEL);
export const storage = REDIS_URL && REDIS_TOKEN ? "redis" : onVercel ? "memory" : "file";

let db = null;
let dirty = false;
let redis = null;

async function getRedis() {
  if (!redis) {
    const { Redis } = await import("@upstash/redis");
    redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  }
  return redis;
}

/** 요청을 처리하기 전에 호출한다. Redis 모드에서는 다른 인스턴스가 쓴 내용을 보기 위해 매번 다시 읽는다. */
export async function loadDb() {
  if (storage === "redis") {
    const stored = await (await getRedis()).get(REDIS_KEY);
    db = stored || buildSeed();
    dirty = !stored;
  } else if (!db) {
    getDb();
  }
  return db;
}

export function getDb() {
  if (db) return db;
  if (storage === "file" && fs.existsSync(DB_PATH)) {
    db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } else {
    db = buildSeed();
    save();
  }
  return db;
}

export function save() {
  if (storage === "file") {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 1), "utf8");
  } else {
    dirty = true;
  }
}

/** 응답을 보내기 직전에 호출한다. 바뀐 내용이 있을 때만 Redis에 쓴다. */
export async function flush() {
  if (storage !== "redis" || !dirty) return;
  dirty = false;
  await (await getRedis()).set(REDIS_KEY, db);
}

export function log(step, msg) {
  const d = getDb();
  d.logs.push({ ts: new Date().toISOString(), step, msg });
  if (d.logs.length > 300) d.logs.splice(0, d.logs.length - 300);
  console.log(`[agent:${step}] ${msg}`);
}
