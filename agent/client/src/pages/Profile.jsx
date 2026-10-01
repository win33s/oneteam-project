import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useBoot } from "../App.jsx";

const DIETS = ["채식", "해산물 불가", "매운 음식 불가"];
const ALCOHOL = ["좋아함", "조금", "안 마심"];

export default function Profile() {
  const { me, employees, categories, reloadBoot } = useBoot();
  const [empId, setEmpId] = useState(me.id);
  const emp = employees.find((e) => e.id === empId);
  const [prefs, setPrefs] = useState(emp.prefs);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setPrefs(emp.prefs); setSaved(false); }, [empId]);

  const toggle = (key, value) => setPrefs((p) => ({ ...p, [key]: p[key].includes(value) ? p[key].filter((x) => x !== value) : [...p[key], value] }));
  const save = async (e) => {
    e.preventDefault();
    await api.put(`/employees/${empId}/prefs`, prefs);
    await reloadBoot();
    setSaved(true);
  };

  return (
    <div className="page narrow">
      <p className="eyebrow">개인 프로필</p>
      <h1 className="page-title">선호 설정</h1>
      <p className="muted">여기 적어 둔 내용은 기획 담당자가 장소를 추천받을 때 자동으로 반영됩니다.</p>
      <form className="panel" onSubmit={save}>
        <label>구성원 (데모: 다른 부서원 프로필도 편집 가능)
          <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
            {employees.filter((e) => e.deptId === me.deptId).map((e) => <option key={e.id} value={e.id}>{e.name} {e.title}</option>)}
          </select>
        </label>
        <div className="field"><span>식이 제한</span>
          <div className="chips">{DIETS.map((d) => <button type="button" key={d} className={`chip ${prefs.diet.includes(d) ? "on" : ""}`} onClick={() => toggle("diet", d)}>{d}</button>)}</div>
        </div>
        <div className="field"><span>음주</span>
          <div className="chips">{ALCOHOL.map((a) => <button type="button" key={a} className={`chip ${prefs.alcohol === a ? "on" : ""}`} onClick={() => setPrefs((p) => ({ ...p, alcohol: a }))}>{a}</button>)}</div>
        </div>
        <div className="field"><span>좋아하는 활동 유형</span>
          <div className="chips">{Object.entries(categories).map(([k, l]) => <button type="button" key={k} className={`chip ${prefs.likes.includes(k) ? "on" : ""}`} onClick={() => toggle("likes", k)}>{l}</button>)}</div>
        </div>
        <label>메모<textarea rows="2" value={prefs.note} onChange={(e) => setPrefs((p) => ({ ...p, note: e.target.value }))} /></label>
        <button className="btn">저장</button>
        {saved && <p className="ok">저장했습니다. 다음 추천부터 반영됩니다.</p>}
      </form>
    </div>
  );
}
