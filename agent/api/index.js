// Vercel 서버리스 함수 진입점. /api/* 와 /erp/* 요청이 모두 여기로 들어온다 (vercel.json의 rewrites).
import { createApp } from "../server/app.js";
import { getDb } from "../server/db.js";
import { renderErpPage } from "../server/erp.js";

// 서버리스에는 계속 도는 타이머가 없고 자기 자신에게 HTTP로 접속하기도 어렵다.
// 그래서 ERP 화면 HTML을 함수 안에서 만들어 크롤러에 넘기고, 화면이 상태를 물어볼 때 새 전표를 확인한다.
const { app } = createApp({ getPage: (path) => renderErpPage(getDb(), path), syncOnPoll: true });

export default app;
