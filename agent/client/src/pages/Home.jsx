import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, useApi, won } from "../api.js";
import { useBoot } from "../App.jsx";
import { Carousel, Stars, artStyle } from "../components/VenueCard.jsx";

const EXAMPLES = ["이번 달 3만원대 회식 장소 추천해 줘", "다음 달에 몸 쓰는 활동 하고 싶어", "MBTI 같은 문화 활동 2만원 이내"];

export default function Home() {
  const { me, dept, categories, llmEnabled } = useBoot();
  const { data } = useApi("/home");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  async function ask(q) {
    const query = (q ?? text).trim();
    if (!query) return navigate("/plan");
    setBusy(true);
    try {
      const p = await api.post("/agent/parse", { text: query });
      const params = new URLSearchParams({ category: p.category, budget: p.budgetPerHead, slot: p.slot, from: p.from, to: p.to, title: p.title });
      navigate(`/plan?${params}`);
    } finally {
      setBusy(false);
    }
  }

  const pick = data?.rows.find((r) => r.key === "season")?.items[0] || data?.rows.find((r) => r.key === "top")?.items[0];
  const rows = (data?.rows || []).filter((r) => (filter === "all" ? true : r.category === filter));

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{dept.name} · {data?.seasonLabel || ""}</p>
          <h1>{me.name} 님,<br />이번 달엔 <em>어디서 한자리</em> 할까요?</h1>
          <p className="lede">다른 부서가 실제로 다녀온 곳과 경비 기록, 참석자 후기를 모아 두었습니다. 날짜 잡기부터 예약, 후기 수집까지 에이전트가 함께합니다.</p>
          <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="예) 다음 달에 2만원대로 몸 쓰는 활동 하고 싶어" />
            <button disabled={busy}>{busy ? "해석 중…" : "기획 시작"}</button>
          </form>
          <div className="examples">
            {EXAMPLES.map((ex) => <button key={ex} className="chip" onClick={() => ask(ex)}>{ex}</button>)}
            <span className="muted small">{llmEnabled ? "Claude가 문장을 해석합니다" : "규칙 기반으로 문장을 해석합니다"}</span>
          </div>
        </div>
        {pick && (
          <Link to={`/venue/${pick.id}`} className="hero-pick" style={artStyle(pick.hue)}>
            <span className="hero-pick-label">이번 시즌 첫 번째 추천</span>
            <span className="hero-pick-emoji">{pick.emoji}</span>
            <div className="hero-pick-body">
              <div className="card-kicker">{pick.sub} · {pick.area}</div>
              <h3>{pick.name}</h3>
              <div className="card-meta">
                <Stars value={pick.otherRating ?? pick.rating} />
                <span>{pick.deptCount}개 부서 방문 · 1인 {won(pick.avgPerHead)}</span>
              </div>
            </div>
          </Link>
        )}
      </section>

      <div className="filterbar">
        <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>전체 추천</button>
        {Object.entries(categories).map(([key, label]) => (
          <button key={key} className={`chip ${filter === key ? "on" : ""}`} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>

      {!data && <div className="center-note">추천을 불러오는 중…</div>}
      {rows.map((r) => (
        <Carousel
          key={r.key}
          title={r.title}
          hint={r.hint}
          items={r.items}
          action={r.category ? <Link className="link" to={`/plan?category=${r.category}`}>이 유형으로 기획</Link> : null}
        />
      ))}
    </div>
  );
}
