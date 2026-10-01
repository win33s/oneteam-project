import { useApi } from "../api.js";

export default function AgentLog({ open, onClose }) {
  const { data } = useApi(open ? "/logs" : null, { intervalMs: 2500 });
  return (
    <aside className={`log-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="log-head">
        <strong>에이전트 로그</strong>
        <button className="ghost" onClick={onClose}>닫기</button>
      </div>
      <p className="muted small">에이전트가 캘린더·ERP·메일을 다룬 내역이 최신순으로 쌓입니다.</p>
      <ol className="log-list">
        {(data || []).map((l, i) => (
          <li key={l.ts + i}>
            <span className="log-step">{l.step}</span>
            <span>{l.msg}</span>
            <time>{new Date(l.ts).toLocaleTimeString("ko-KR")}</time>
          </li>
        ))}
        {data && !data.length && <li className="muted">아직 기록이 없습니다.</li>}
      </ol>
    </aside>
  );
}
