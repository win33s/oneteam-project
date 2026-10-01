import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi, won, dateLabel } from "../api.js";
import { useBoot } from "../App.jsx";
import { Stars } from "../components/VenueCard.jsx";

const SEASONS = { all: "전체 시기", spring: "봄 (3~5월)", summer: "여름 (6~8월)", autumn: "가을 (9~11월)", winter: "겨울 (12~2월)" };
const seasonOfMonth = (m) => (m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter");

export default function Explore() {
  const { departments, dept: myDept, categories } = useBoot();
  const [category, setCategory] = useState("");
  const [dept, setDept] = useState("");
  const [season, setSeason] = useState("all");
  const [q, setQ] = useState("");
  const params = new URLSearchParams({ scope: "others" });
  if (category) params.set("category", category);
  if (dept) params.set("dept", dept);
  if (q) params.set("q", q);
  const { data } = useApi(`/activities?${params}`);
  const list = (data || []).filter((a) => season === "all" || seasonOfMonth(Number(a.date.split("-")[1])) === season);

  return (
    <div className="page">
      <p className="eyebrow">옆 부서는 어디로 갔을까</p>
      <h1 className="page-title">타부서 레퍼런스</h1>
      <p className="muted">회의비·조직활성화 계정으로 처리된 전 부서의 전표를 에이전트가 모았습니다. 시기와 유형으로 좁혀 보세요.</p>

      <div className="filters">
        <div className="chips">
          <button className={`chip ${!category ? "on" : ""}`} onClick={() => setCategory("")}>전체 유형</button>
          {Object.entries(categories).map(([k, l]) => <button key={k} className={`chip ${category === k ? "on" : ""}`} onClick={() => setCategory(k)}>{l}</button>)}
        </div>
        <div className="field-row">
          <select value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">전체 부서</option>
            {departments.filter((d) => d.id !== myDept.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={season} onChange={(e) => setSeason(e.target.value)}>
            {Object.entries(SEASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="장소·활동 검색" />
        </div>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>시기</th><th>부서</th><th>장소·활동</th><th>평점</th><th>인원</th><th>금액</th><th>1인당</th><th>계정 · 예산구분</th><th>담당자 팁</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>{a.date.slice(0, 4)}년 {dateLabel(a.date)}</td>
                  <td>{a.deptName}</td>
                  <td><Link to={`/venue/${a.venueId}`}>{a.emoji} {a.venueName}</Link><div className="muted small">{a.sub}</div></td>
                  <td><Stars value={a.rating} /></td>
                  <td>{a.headcount}명</td>
                  <td className="num">{won(a.amount)}</td>
                  <td className="num">{won(a.perHead)}</td>
                  <td>{a.accountName}<div className="muted small">{a.budgetSource}</div></td>
                  <td className="small">{a.comments[0]?.text || <span className="muted">-</span>} <Link to={`/history/${a.id}`}>상세</Link></td>
                </tr>
              ))}
              {data && !list.length && <tr><td colSpan="9" className="muted">조건에 맞는 기록이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
