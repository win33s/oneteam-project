import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, useApi, dateLabel } from "../api.js";
import { useBoot } from "../App.jsx";

export default function ReviewForm() {
  const { id } = useParams();
  const [qs] = useSearchParams();
  const { employees, me } = useBoot();
  const emp = employees.find((e) => e.id === qs.get("as")) || me;
  const { data: a, error } = useApi(`/activities/${id}`);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [again, setAgain] = useState("");
  const [sent, setSent] = useState(false);

  if (error) return <div className="center-note">{error}</div>;
  if (!a) return <div className="center-note">불러오는 중…</div>;

  const submit = async (e) => {
    e.preventDefault();
    const text = [comment.trim(), again && `(다시 간다면: ${again})`].filter(Boolean).join(" ");
    await api.post(`/activities/${id}/reviews`, { empId: emp.id, rating, comment: text });
    setSent(true);
  };

  return (
    <div className="page narrow">
      <p className="eyebrow">만족도 조사 · {emp.name} {emp.title} 님 화면</p>
      <h1 className="page-title">{a.venueName}, 어떠셨나요?</h1>
      <p className="muted">{dateLabel(a.date)} {a.title}. 실서비스에서는 네이버 폼으로 발송되며, 이 화면은 그 역할을 대신하는 데모 폼입니다.</p>
      {sent ? (
        <section className="panel"><p className="ok">응답해 주셔서 감사합니다. 다음 활동 추천에 반영됩니다.</p></section>
      ) : (
        <form className="panel review-form" onSubmit={submit}>
          <div className="field">
            <span>전체 만족도</span>
            <div className="star-input">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} className={n <= rating ? "on" : ""} onClick={() => setRating(n)} aria-label={`${n}점`}>★</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>다음에 또 가고 싶나요?</span>
            <div className="chips">
              {["또 가고 싶다", "한 번이면 충분", "다른 곳이 좋겠다"].map((x) => (
                <button type="button" key={x} className={`chip ${again === x ? "on" : ""}`} onClick={() => setAgain(x)}>{x}</button>
              ))}
            </div>
          </div>
          <label>한마디 (선택)
            <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="좋았던 점이나 아쉬웠던 점을 적어 주세요" />
          </label>
          <button className="btn" disabled={!rating}>제출</button>
        </form>
      )}
    </div>
  );
}
