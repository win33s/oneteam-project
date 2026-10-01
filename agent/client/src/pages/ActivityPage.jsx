import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, useApi, won, dateLabel } from "../api.js";
import { artStyle, Stars } from "../components/VenueCard.jsx";

export default function ActivityPage() {
  const { id } = useParams();
  const { data: a, error, setData } = useApi(`/activities/${id}`, { intervalMs: 4000 });
  const [text, setText] = useState("");
  if (error) return <div className="center-note">{error}</div>;
  if (!a) return <div className="center-note">불러오는 중…</div>;

  const addComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setData(await api.post(`/activities/${id}/comments`, { text }));
    setText("");
  };

  return (
    <div className="page">
      <section className="venue-hero small" style={artStyle(a.hue)}>
        <span className="venue-emoji">{a.emoji}</span>
        <div>
          <p className="eyebrow dark">{a.deptName} · {dateLabel(a.date)} {a.date.slice(0, 4)}</p>
          <h1>{a.title}</h1>
          <p><Link to={`/venue/${a.venueId}`}>{a.venueName}</Link> · {a.area} {a.visitNo >= 2 && <em className="tag warn">{a.visitNo}번째 방문</em>}</p>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>ERP 경비 처리 내용 <span className="muted">전표에서 자동 수집</span></h2>
          <dl className="kv">
            <dt>전표번호</dt><dd>{a.docNo}</dd>
            <dt>계정</dt><dd>{a.accountName} ({a.accountCode})</dd>
            <dt>예산구분</dt><dd>{a.budgetSource}</dd>
            <dt>품목</dt><dd>{a.item}</dd>
            <dt>용도</dt><dd>{a.purpose}</dd>
            <dt>구입·소비 내역</dt><dd>{a.detail}</dd>
            <dt>인원</dt><dd>{a.headcount}명</dd>
            <dt>금액</dt><dd>{won(a.amount)} (1인당 {won(a.perHead)})</dd>
            <dt>기안자</dt><dd>{a.drafter}</dd>
          </dl>
          {a.blog && <p className="muted small">사내 블로그: {a.blog.title} (단체 사진 {a.blog.photos}장)</p>}
        </section>

        <section className="panel">
          <h2>담당자 코멘트</h2>
          <ul className="reviews">
            {a.comments.map((c) => <li key={c.id}><div className="muted small">{c.author} · {c.createdAt}</div><p>{c.text}</p></li>)}
            {!a.comments.length && <li className="muted">아직 코멘트가 없습니다.</li>}
          </ul>
          {a.mine ? (
            <form className="comment-form" onSubmit={addComment}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows="3" placeholder="이번에 좋았던 점, 아쉬웠던 점, 어떤 활동을 했는지, 다음 담당자가 알면 좋을 것" />
              <button className="btn">코멘트 추가</button>
            </form>
          ) : <p className="muted small">다른 부서의 기록은 읽기만 할 수 있습니다.</p>}
        </section>
      </div>

      <section className="panel">
        <h2>참석자 후기 <Stars value={a.rating} /> <span className="muted">{a.reviews.length}건{a.participantIds.length ? ` / 요청 ${a.participantIds.length}명` : ""}</span></h2>
        <ul className="reviews grid">
          {a.reviews.map((r) => <li key={r.id}><div><Stars value={r.rating} /> <span className="muted small">{r.author}</span></div><p>{r.comment}</p></li>)}
          {!a.reviews.length && <li className="muted">{a.reviewFormSent ? "후기 폼이 발송되었습니다. 응답이 들어오면 여기에 표시됩니다." : "아직 후기 폼을 보내지 않았습니다."}</li>}
        </ul>
        {a.mine && !a.reviewFormSent && (
          <div className="callout ask">
            <b>참석자에게 후기를 묻는 폼을 작성해 발송할까요?</b>
            <div className="ask-actions"><button className="btn small" onClick={async () => setData(await api.post(`/activities/${id}/review-form`))}>후기 폼 발송</button></div>
          </div>
        )}
        {a.reviewFormSent && a.participantIds[0] && (
          <p className="muted small"><Link to={`/review/${a.id}?as=${a.participantIds[1] || a.participantIds[0]}`} target="_blank">참석자 화면에서 후기 폼 작성해 보기 ↗</Link></p>
        )}
      </section>
    </div>
  );
}
