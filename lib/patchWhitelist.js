// PATCH 허용 칸 화이트리스트 — 2026-09-27
// 예전엔 body 를 검사 없이 통째로 update 했다(제목·가격·연락처를 아무 값으로나 덮을 수 있었음).
// 이제 관리용 칸과 급여 숫자만 받고, 급여는 앱·웹 등록 화면과 같은 기준(USD/월, 0 초과·10만 미만, 최소≤최대)으로 본다.

const SALARY_MAX = 100000; // 이 이상이면 동(VND) 금액을 USD 칸에 넣은 것으로 본다

function checkUsd(name, v) {
  if (v === null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n >= SALARY_MAX) return `${name}: USD/월 숫자(1~99,999)만 받습니다`;
  return null;
}

/**
 * @param {object} body 요청 본문
 * @param {string[]} allowed 허용 칸 (점 표기 "crm.status" 가능, "crm.*" 는 crm 아래 전부)
 * @param {string[]} usdFields 급여 USD 숫자 칸
 * @returns {{ok:true, updates:object} | {ok:false, error:string}}
 */
export function pickAllowed(body, allowed, usdFields = []) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "본문이 객체가 아닙니다" };
  const updates = {};
  const rejected = [];
  for (const [k, v] of Object.entries(body)) {
    const ok = allowed.includes(k) || allowed.some((a) => a.endsWith(".*") && k.startsWith(a.slice(0, -1)));
    if (!ok) { rejected.push(k); continue; }
    if (usdFields.includes(k)) {
      const err = checkUsd(k, v);
      if (err) return { ok: false, error: err };
      updates[k] = v === null ? null : Number(String(v).replace(/,/g, ""));
    } else updates[k] = v;
  }
  if (rejected.length) return { ok: false, error: `바꿀 수 없는 칸: ${rejected.join(", ")}` };
  if (!Object.keys(updates).length) return { ok: false, error: "바꿀 칸이 없습니다" };
  return { ok: true, updates };
}

export function checkMinMax(updates, current, minKey, maxKey) {
  const mn = minKey in updates ? updates[minKey] : current?.[minKey];
  const mx = maxKey in updates ? updates[maxKey] : current?.[maxKey];
  if (mn != null && mx != null && Number(mn) > Number(mx)) return "최소 급여가 최대 급여보다 큽니다";
  return null;
}
