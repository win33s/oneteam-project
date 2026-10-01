import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, useApi } from "../api.js";
import { useBoot } from "../App.jsx";

export default function VotePage() {
  const { id } = useParams();
  const [qs] = useSearchParams();
  const { employees, me } = useBoot();
  const voter = employees.find((e) => e.id === qs.get("as")) || me;
  const { data: poll, error, setData } = useApi(`/polls/${id}`);
  const [picked, setPicked] = useState(new Set());
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (poll?.votes[voter.id]) setPicked(new Set(poll.votes[voter.id]));
  }, [poll?.id, voter.id]);

  if (error) return <div className="center-note">{error}</div>;
  if (!poll) return <div className="center-note">불러오는 중…</div>;

  const toggle = (d) => setPicked((prev) => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; });
  const submit = async () => {
    try {
      setData(await api.post(`/polls/${id}/vote`, { voterId: voter.id, dates: [...picked] }));
      setSent(true);
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <div className="page narrow">
      <p className="eyebrow">날짜 투표 · {voter.name} {voter.title} 님 화면</p>
      <h1 className="page-title">{poll.title}</h1>
      <section className="panel">
        <p>가능한 날짜를 모두 골라 주세요.</p>
        <ul className="vote-list">
          {poll.tallies.map((t) => (
            <li key={t.date}>
              <label className={picked.has(t.date) ? "on" : ""}>
                <input type="checkbox" checked={picked.has(t.date)} disabled={poll.status !== "open"} onChange={() => toggle(t.date)} />
                <b>{t.label}</b>
                <span className="muted small">현재 {t.count}표</span>
              </label>
            </li>
          ))}
        </ul>
        {poll.status === "open" ? (
          <button className="btn" onClick={submit}>{sent ? "다시 제출" : "투표 제출"}</button>
        ) : <p className="muted">마감된 투표입니다.</p>}
        {sent && <p className="ok">투표가 반영되었습니다. 기획 담당자 화면에 바로 보입니다.</p>}
        {message && <p className="err">{message}</p>}
      </section>
    </div>
  );
}
