import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useApi } from "../api.js";
import { useBoot } from "../App.jsx";

const TYPE = { vote: "날짜 투표", announce: "안내", review: "후기 요청", record: "기록 업데이트" };

export default function Mailbox() {
  const { me, employees } = useBoot();
  const [to, setTo] = useState(me.id);
  const [openId, setOpenId] = useState(null);
  const { data, reload } = useApi(`/mails${to ? `?to=${to}` : ""}`, { intervalMs: 4000 });

  const open = async (m) => {
    setOpenId(openId === m.id ? null : m.id);
    if (!m.read) { await api.post(`/mails/${m.id}/read`); reload(); }
  };

  return (
    <div className="page narrow-wide">
      <p className="eyebrow">데모 메일함</p>
      <h1 className="page-title">에이전트가 보낸 메일</h1>
      <p className="muted">실제 사내 메일 대신, 에이전트가 발송한 메일이 여기에 쌓입니다. 받는 사람을 바꿔 부서원 입장에서 볼 수 있습니다.</p>
      <div className="field-row">
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">전체 받는 사람</option>
          {employees.filter((e) => e.deptId === me.deptId).map((e) => <option key={e.id} value={e.id}>{e.name} {e.title}{e.id === me.id ? " (나)" : ""}</option>)}
        </select>
      </div>
      <ul className="mail-list">
        {(data || []).map((m) => (
          <li key={m.id} className={`${m.read ? "" : "unread"} ${openId === m.id ? "open" : ""}`}>
            <button className="mail-row" onClick={() => open(m)}>
              <em className={`tag t-${m.type}`}>{TYPE[m.type]}</em>
              <span className="mail-subject">{m.subject}</span>
              <span className="muted small">→ {m.toName} · {new Date(m.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </button>
            {openId === m.id && (
              <div className="mail-body">
                <p className="muted small">보낸 사람: {m.from} · 받는 사람: {m.toName} &lt;{m.toEmail}&gt;</p>
                <pre>{m.body}</pre>
                {m.link && <Link className="btn small" to={m.link}>{m.linkLabel}</Link>}
              </div>
            )}
          </li>
        ))}
        {data && !data.length && <li className="muted pad">아직 받은 메일이 없습니다. 기획을 시작하면 투표·안내 메일이 발송됩니다.</li>}
      </ul>
    </div>
  );
}
