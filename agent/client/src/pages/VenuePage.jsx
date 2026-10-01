import { Link, useParams } from "react-router-dom";
import { useApi, won, dateLabel } from "../api.js";
import { artStyle, Stars } from "../components/VenueCard.jsx";

export default function VenuePage() {
  const { id } = useParams();
  const { data: v, error } = useApi(`/venues/${id}`);
  if (error) return <div className="center-note">{error}</div>;
  if (!v) return <div className="center-note">불러오는 중…</div>;

  return (
    <div className="page">
      <section className="venue-hero" style={artStyle(v.hue)}>
        <span className="venue-emoji">{v.emoji}</span>
        <div>
          <p className="eyebrow dark">{v.categoryLabel} · {v.sub} · {v.area}</p>
          <h1>{v.name}</h1>
          <div className="venue-actions">
            <Link className="btn" to={`/plan?venue=${v.id}&category=${v.category}`}>이 장소로 기획 시작</Link>
            <a className="btn outline" href={v.bookingUrl} target="_blank" rel="noreferrer">네이버 지도에서 예약·검색 ↗</a>
          </div>
        </div>
      </section>

      {v.visitsMine >= 2 && (
        <div className="callout warn">
          우리 부서가 이미 <b>{v.visitsMine}번</b> 다녀온 곳입니다 (최근 {dateLabel(v.lastVisitedMine)}). 기획을 시작하면 에이전트가 새로운 대안도 함께 추천합니다.
        </div>
      )}

      <div className="stat-grid">
        <div className="stat"><span>전체 평점</span><b><Stars value={v.rating} /></b><small>후기 {v.reviewCount}건</small></div>
        <div className="stat"><span>1인당 평균 경비</span><b>{won(v.avgPerHead)}</b><small>ERP 전표 기준</small></div>
        <div className="stat"><span>방문 부서</span><b>{v.deptCount}개 부서</b><small>총 {v.visitsAll}회</small></div>
        <div className="stat"><span>우리 부서 방문</span><b>{v.visitsMine}회</b><small>{v.lastVisitedMine ? `최근 ${dateLabel(v.lastVisitedMine)}` : "아직 없음"}</small></div>
      </div>

      <section className="panel">
        <h2>경비 처리 기록</h2>
        <p className="muted">ERP에서 수집한 전표입니다. 어느 예산으로 얼마를 썼는지 참고하세요.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>부서</th><th>사용일</th><th>인원</th><th>금액</th><th>1인당</th><th>계정</th><th>예산구분</th><th>전표</th></tr></thead>
            <tbody>
              {v.visits.map((a) => (
                <tr key={a.id} className={a.mine ? "mine" : ""}>
                  <td>{a.deptName}{a.mine && <em className="tag">우리 부서</em>}</td>
                  <td>{dateLabel(a.date)}</td>
                  <td>{a.headcount}명</td>
                  <td className="num">{won(a.amount)}</td>
                  <td className="num">{won(a.perHead)}</td>
                  <td>{a.accountName}</td>
                  <td>{a.budgetSource}</td>
                  <td><Link to={`/history/${a.id}`}>{a.docNo}</Link></td>
                </tr>
              ))}
              {!v.visits.length && <tr><td colSpan="8" className="muted">아직 방문 기록이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>참석자 후기</h2>
          <ul className="reviews">
            {v.reviews.map((r) => (
              <li key={r.id}>
                <div><Stars value={r.rating} /> <span className="muted small">{r.deptName} · {dateLabel(r.date)}</span></div>
                <p>{r.comment}</p>
              </li>
            ))}
            {!v.reviews.length && <li className="muted">아직 후기가 없습니다.</li>}
          </ul>
        </section>
        <section className="panel">
          <h2>담당자 팁과 사내 블로그</h2>
          <ul className="reviews">
            {v.visits.flatMap((a) => a.comments.map((c) => (
              <li key={c.id}><div className="muted small">{a.deptName} 담당자</div><p>{c.text}</p></li>
            )))}
            {v.visits.filter((a) => a.blog).map((a) => (
              <li key={a.id + "b"}><div className="muted small">사내 블로그 · 단체 사진 {a.blog.photos}장</div><p>{a.blog.title}</p></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
