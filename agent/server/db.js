import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSeed } from "./seed.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(here, "..", "data", "db.json");

let db = null;

export function getDb() {
  if (db) return db;
  if (fs.existsSync(DB_PATH)) {
    db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } else {
    db = buildSeed();
    save();
  }
  return db;
}

export function save() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 1), "utf8");
}

export function log(step, msg) {
  const d = getDb();
  d.logs.push({ ts: new Date().toISOString(), step, msg });
  if (d.logs.length > 300) d.logs.splice(0, d.logs.length - 300);
  console.log(`[agent:${step}] ${msg}`);
}
