import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, useApi, won, dateLabel } from "../api.js";
import { useBoot } from "../App.jsx";
import { artStyle, Stars } from "../components/VenueCard.jsx";

export default function History() {
  const { dept } = useBoot();
  const { data, reload } = useApi("/activities?scope=mine", { intervalMs: 5000 });
  const [syncing, setSyncing] = useState(false);

  const counts = useMemo(() => {
    const m = new Map();
    for (const a of data || []) {
      const c = m.get(a.venueId) || { id: a.venueId, name: a.venueName, emoji: a.emoji, n: 0, last: a.date };
      c.n++;
      m.set(a.venueId, c);
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [data]);

  const sync = async () => {
    setSyncing(true);
    try { await api.post("/agent/sync-erp"); await reload(); } finally { setSyncing(false); }
  };

  if (!data) return <div className="center-note">불러오는 중…</div>;
  const total = data.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{dept.name}</p>
          <h1 className="page-title">우리 부서 조직문화활동 기록</h1>
          <p className="muted">내가 입사하기 전 기록까지 ERP 전표에서 자동으로 가져왔습니다. 총 {data.length}건 · {won(total)}</p>
        </div>
        <button className="btn outline" onClick={sync} disabled={syncing}>{syncing ? "ERP 확인 중…" : "지금 ERP 동기화"}</button>
      </div>

      <div className="history-layout">
        <ol className="timeline">
          {data.map((a) => (
            <li key={a.id}>
              <Link to={`/history/${a.id}`} className="tl-item">
                <div className="tl-art" style={artStyle(a.hue)}>{a.emoji}</div>
                <div className="tl-body">
                  <div className="card-kicker">{dateLabel(a.date)} · {a.date.slice(0, 4)}년 · {a.sub}</div>
                  <h3>{a.venueName} {a.visitNo >= 2 && <em className="tag warn">{a.visitNo}번째 방문</em>}</h3>
                  <div className="tl-meta">
                    <Stars value={a.rating} />
                    <span>{a.headcount}명 · {won(a.amount)}</span>
                    <span>{a.accountName} · {a.budgetSource}</span>
                    <span>코멘트 {a.comments.length}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>

        <aside className="panel side">
          <h2>많이 간 곳</h2>
          <ul className="count-list">
            {counts.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link to={`/venue/${c.id}`}>{c.emoji} {c.name}</Link>
                <b className={c.n >= 3 ? "hot" : ""}>{c.n}회</b>
              </li>
            ))}
          </ul>
          {counts[0]?.n >= 3 && (
            <div className="callout warn">
              <b>{counts[0].name}</b>에 {counts[0].n}번 다녀왔습니다. 다음에는 새로운 곳을 추천받아 보세요.
              <Link className="btn small" to="/plan">새로운 곳 추천받기</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
