import { useMemo, useState } from "react";
import { api, setSession } from "../api.js";

/** 1번 화면: 사번·이름·비밀번호 → 2번 화면: 소속 그룹·팀 선택 → 메인 */
export default function Login({ onDone }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ empNo: "", name: "", password: "" });
  const [departments, setDepartments] = useState([]);
  const [group, setGroup] = useState("");
  const [deptId, setDeptId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const groups = useMemo(() => [...new Set(departments.map((d) => d.group))], [departments]);

  async function run(fn) {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const login = (e) => {
    e.preventDefault();
    run(async () => {
      const res = await api.post("/login", form);
      setDepartments(res.departments);
      const known = res.departments.find((d) => d.id === res.known);
      if (known) { setGroup(known.group); setDeptId(known.id); }
      setStep(2);
    });
  };

  const enter = (e) => {
    e.preventDefault();
    run(async () => {
      const { empId } = await api.post("/session", { empNo: form.empNo, name: form.name, deptId });
      setSession(empId);
      onDone();
    });
  };

  return (
    <div className="login">
      <aside className="login-brand">
        <div className="login-logo">HBM</div>
        <p className="login-full"><b>H</b>appy <b>B</b>onding <b>M</b>emory</p>
        <ul>
          <li><b>Bonding</b> 칩을 쌓아 붙이듯, 부서원 사이의 유대감을 쌓습니다.</li>
          <li><b>Memory</b> 우리가 만드는 메모리처럼, 조직문화활동의 기억과 방문·기획 이력을 남깁니다.</li>
        </ul>
        <span className="login-foot">조직문화활동 기획자를 위한 에이전트</span>
      </aside>

      <main className="login-main">
        <ol className="login-steps">
          <li className={step === 1 ? "now" : "done"}><b>1</b>로그인</li>
          <li className={step === 2 ? "now" : ""}><b>2</b>소속 선택</li>
        </ol>

        {step === 1 ? (
          <form className="login-form" onSubmit={login}>
            <h1>로그인</h1>
            <p className="muted">사번과 이름, 비밀번호를 입력해 주세요.</p>
            <label>사번<input value={form.empNo} onChange={set("empNo")} inputMode="numeric" placeholder="예) 20260001" autoFocus required /></label>
            <label>이름<input value={form.name} onChange={set("name")} placeholder="예) 김하늘" required /></label>
            <label>비밀번호<input type="password" value={form.password} onChange={set("password")} placeholder="4자 이상" autoComplete="off" required /></label>
            {error && <p className="err">{error}</p>}
            <button className="btn big" disabled={busy}>{busy ? "확인 중…" : "다음"}</button>
            <p className="muted small">데모 화면입니다. 형식만 확인하며 비밀번호는 저장하지 않습니다. 실제 사내 비밀번호를 입력하지 마세요.</p>
          </form>
        ) : (
          <form className="login-form" onSubmit={enter}>
            <h1>{form.name} 님의 소속을 선택해 주세요</h1>
            <p className="muted">선택한 팀의 활동 기록과 부서원 일정을 기준으로 추천합니다.</p>
            <div className="field">
              <span>그룹</span>
              <div className="chips">
                {groups.map((g) => (
                  <button type="button" key={g} className={`chip ${group === g ? "on" : ""}`} onClick={() => { setGroup(g); setDeptId(""); }}>{g}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>팀</span>
              <div className="chips">
                {departments.filter((d) => d.group === group).map((d) => (
                  <button type="button" key={d.id} className={`chip ${deptId === d.id ? "on" : ""}`} onClick={() => setDeptId(d.id)}>{d.name}</button>
                ))}
                {!group && <span className="muted small">그룹을 먼저 선택해 주세요.</span>}
              </div>
            </div>
            {error && <p className="err">{error}</p>}
            <div className="login-actions">
              <button type="button" className="btn outline" onClick={() => setStep(1)}>이전</button>
              <button className="btn big" disabled={busy || !deptId}>{busy ? "들어가는 중…" : "HBM 시작하기"}</button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
