import { createContext, useContext, useState } from "react";
import { NavLink, Route, Routes, Link } from "react-router-dom";
import { useApi } from "./api.js";
import AgentLog from "./components/AgentLog.jsx";
import Home from "./pages/Home.jsx";
import VenuePage from "./pages/VenuePage.jsx";
import PlanPage from "./pages/PlanPage.jsx";
import VotePage from "./pages/VotePage.jsx";
import History from "./pages/History.jsx";
import ActivityPage from "./pages/ActivityPage.jsx";
import Explore from "./pages/Explore.jsx";
import Mailbox from "./pages/Mailbox.jsx";
import ReviewForm from "./pages/ReviewForm.jsx";
import Profile from "./pages/Profile.jsx";

const BootContext = createContext(null);
export const useBoot = () => useContext(BootContext);

export default function App() {
  const { data: boot, error, reload } = useApi("/bootstrap");
  const { data: status } = useApi("/status", { intervalMs: 4000 });
  const [logOpen, setLogOpen] = useState(false);

  if (error) return <div className="center-note">서버에 연결할 수 없습니다. <code>npm run dev</code>로 서버가 켜져 있는지 확인해 주세요.</div>;
  if (!boot) return <div className="center-note">불러오는 중…</div>;

  return (
    <BootContext.Provider value={{ ...boot, reloadBoot: reload }}>
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">한자리</span>
          <span className="brand-sub">조직문화활동 기획 에이전트</span>
        </Link>
        <nav>
          <NavLink to="/" end>추천</NavLink>
          <NavLink to="/plan">새 활동 기획</NavLink>
          <NavLink to="/history">우리 부서 기록</NavLink>
          <NavLink to="/explore">타부서 레퍼런스</NavLink>
          <NavLink to="/mailbox">
            메일함{status?.unread ? <em className="count">{status.unread}</em> : null}
          </NavLink>
          <a href="/erp/expenses" target="_blank" rel="noreferrer">ERP ↗</a>
        </nav>
        <div className="topbar-right">
          <button className="ghost" onClick={() => setLogOpen((v) => !v)}>에이전트 로그</button>
          <Link to="/profile" className="me">
            <span className="avatar">{boot.me.name[0]}</span>
            <span>{boot.me.name}<small>{boot.dept.name}</small></span>
          </Link>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/venue/:id" element={<VenuePage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/plan/:id" element={<PlanPage />} />
          <Route path="/vote/:id" element={<VotePage />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<ActivityPage />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/mailbox" element={<Mailbox />} />
          <Route path="/review/:id" element={<ReviewForm />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<div className="center-note">없는 페이지입니다.</div>} />
        </Routes>
      </main>

      <AgentLog open={logOpen} onClose={() => setLogOpen(false)} />
    </BootContext.Provider>
  );
}
