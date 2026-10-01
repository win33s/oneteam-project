import { api } from "../api.js";
import { useBoot } from "../App.jsx";

const DIETS = ["채식", "해산물 불가", "매운 음식 불가"];
const ALCOHOL = ["좋아함", "조금", "안 마심"];

/** 여러 개를 고르는 작은 드롭다운 */
function MultiDrop({ value, options, empty, onChange }) {
  const labels = options.filter(([k]) => value.includes(k)).map(([, l]) => l);
  return (
    <details className="mini-dd">
      <summary>{labels.length ? labels.join(", ") : <span className="muted">{empty}</span>}</summary>
      <div className="mini-dd-menu">
        {options.map(([k, l]) => (
          <label key={k}>
            <input type="checkbox" checked={value.includes(k)} onChange={() => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])} />
            {l}
          </label>
        ))}
      </div>
    </details>
  );
}

export default function Profile() {
  const { me, dept, employees, categories, reloadBoot } = useBoot();
  const members = employees.filter((e) => e.deptId === me.deptId);
  const likeOptions = Object.entries(categories);

  const update = async (emp, patch) => {
    await api.put(`/employees/${emp.id}/prefs`, { ...emp.prefs, ...patch });
    reloadBoot();
  };

  return (
    <div className="page">
      <p className="eyebrow">{dept.name}</p>
      <h1 className="page-title">부서원 선호 프로필</h1>
      <p className="muted">바꾸면 바로 저장되고, 다음 장소 추천부터 반영됩니다.</p>
      <section className="panel">
        <div className="table-wrap profile-table">
          <table>
            <thead><tr><th>이름</th><th>식이 제한</th><th>음주</th><th>좋아하는 활동 유형</th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className={m.id === me.id ? "mine" : ""}>
                  <td><b>{m.name}</b> <span className="muted small">{m.title}</span>{m.id === me.id && <em className="tag">나</em>}</td>
                  <td><MultiDrop value={m.prefs.diet} options={DIETS.map((d) => [d, d])} empty="없음" onChange={(diet) => update(m, { diet })} /></td>
                  <td>
                    <select className="mini-select" value={m.prefs.alcohol} onChange={(e) => update(m, { alcohol: e.target.value })}>
                      {ALCOHOL.map((a) => <option key={a}>{a}</option>)}
                    </select>
                  </td>
                  <td><MultiDrop value={m.prefs.likes} options={likeOptions} empty="선택 안 함" onChange={(likes) => update(m, { likes })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
