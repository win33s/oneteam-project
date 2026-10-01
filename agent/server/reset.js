import fs from "node:fs";
import { DB_PATH } from "./db.js";

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
console.log("데모 데이터를 초기화했습니다. 서버를 다시 시작하면 새로 생성됩니다.");
