// Claude API 선택 연동. 자격 증명이 없으면 모든 함수가 null을 반환하고, 호출부는 규칙 기반 결과를 그대로 쓴다.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
export const llmEnabled = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = llmEnabled ? new Anthropic() : null;

async function ask({ system, user, schema }) {
  if (!client) return null;
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // 안전 분류기가 요청을 거절하면 서버가 권장 대체 모델로 다시 실행한다
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", ...(schema ? { format: { type: "json_schema", schema } } : {}) },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") return null;
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return schema ? JSON.parse(text) : text;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) console.warn("[llm] 요청 한도 초과, 규칙 기반으로 대체합니다");
    else if (err instanceof Anthropic.APIError) console.warn(`[llm] API 오류 ${err.status}: ${err.message}`);
    else console.warn(`[llm] ${err.message}`);
    return null;
  }
}

const PARSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "budgetPerHead", "slot", "weeksAhead", "title"],
  properties: {
    category: { type: "string", enum: ["any", "restaurant", "activity", "culture", "stay", "cafe"] },
    budgetPerHead: { type: "integer", description: "1인당 예산(원). 언급이 없으면 0" },
    slot: { type: "string", enum: ["dinner", "lunch", "allday"] },
    weeksAhead: { type: "integer", description: "오늘부터 몇 주 안에 하려는지. 언급이 없으면 4" },
    title: { type: "string", description: "기획 제목 (20자 이내)" },
  },
};

/** 자유 입력("다음 달에 2만원대로 몸 쓰는 활동")을 기획 조건으로 바꾼다 */
export function parseRequestWithLlm(text, todayStr) {
  return ask({
    system: `너는 사내 조직문화활동 기획을 돕는 에이전트다. 오늘은 ${todayStr}이다. 기획 담당자의 요청 문장에서 조건을 뽑아라.`,
    user: text,
    schema: PARSE_SCHEMA,
  });
}

/** 규칙 기반 추천 결과에 대해 담당자에게 건네는 짧은 조언을 쓴다 */
export function summarizeRecommendations({ members, date, candidates }) {
  return ask({
    system:
      "너는 사내 조직문화활동 기획을 처음 맡은 신입 담당자를 돕는 에이전트다. 주어진 추천 후보와 근거 데이터만 사용해 한국어로 3~4문장의 조언을 써라. 가장 권하는 곳 하나와 그 이유, 주의할 점 하나, 같은 곳이 반복되면 대안 하나를 말한다. 목록이나 머리말 없이 문장만 쓴다. 데이터에 없는 사실은 지어내지 않는다.",
    user: JSON.stringify({ date, memberCount: members.length, preferences: members.map((m) => m.prefs), candidates }),
  });
}
