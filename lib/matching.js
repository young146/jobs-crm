/**
 * AI 매칭 코어 (결정론적 필터 + 사전랭킹 + 프롬프트). 순수 함수 — firebase/openai 의존 없음.
 * scripts/match-dryrun.cjs 에서 검증된 로직을 production용으로 추출.
 * 사용처: app/api/cron/auto-match (자동발송), app/api/ai/match (수동).
 */

export const POOL_CAP = 20;
export const CLOSED_STATUS = /(완료|마감|중단|비활성|종료)/;

// 베트남 지역명(한글) → 권역
const REGION_CITIES = {
  남부: ["호치민", "호찌민", "동나이", "빈증", "빈즈엉", "붕따우", "바리어", "롱안", "떠이닌", "껀터", "까마우", "안장", "끼엔장", "벤째", "짜빈", "속짱", "박리에우", "하우장", "띠엔장", "빈롱", "동탑", "닌투언", "빈투언", "푸꾸옥"],
  중부: ["다낭", "후에", "투아티엔", "꽝남", "호이안", "꽝응아이", "빈딘", "꾸이년", "푸옌", "칸호아", "나트랑", "꽝빈", "꽝찌", "하띤", "응에안", "타인호아", "닥락", "달랏", "럼동", "잘라이", "꼰뚬", "닥농"],
  북부: ["하노이", "하이퐁", "박닌", "박장", "하남", "남딘", "타이빈", "흥옌", "하이즈엉", "빈푹", "푸토", "타이응우옌", "타이웬", "꽝닌", "하롱", "랑선", "까오방", "옌바이", "라오까이", "호아빈", "닌빈", "옌풍"],
};
export const VN_REGION = {};
for (const [region, cities] of Object.entries(REGION_CITIES)) for (const c of cities) VN_REGION[c] = region;

export function regionOf(text) {
  const t = String(text || "");
  for (const key of Object.keys(VN_REGION)) if (t.includes(key)) return VN_REGION[key];
  return null;
}
export function isFlexibleLoc(text) {
  const t = String(text || "").trim();
  return t === "" || /무관|전지역|전 지역|전국|상관없|어디든|아무|전역/.test(t);
}
function koreanScore(lvl) {
  const s = String(lvl || "");
  if (/원어민|native|고급/i.test(s)) return 1;
  if (/중급/.test(s)) return 0.6;
  if (/초급|기초/.test(s)) return 0.3;
  return 0;
}

export const candTracks = (c) => (c.career || {}).jobTracks || (c.career || {}).desiredJobTracks || [];
export const candLoc = (c) => ((c.profile || {}).desiredLocation || (c.profile || {}).jobDesiredLocationText || "").trim();
export const candPhone = (c) => { const p = c.profile || {}; return (p.phone || p.contactPhone || p.mobile || "").replace(/[^0-9]/g, ""); };
export const candEmail = (c) => { const p = c.profile || {}; return p.email || p.contactEmail || ""; };
export const candName = (c) => (c.profile || {}).name || "";
export const jobEmail = (j) => j.contactEmail || j.email || j.userEmail || "";

// ── "제대로 등록" 기준 — 미충족 항목 목록 반환 (빈 배열 = 완전) ──
export function nameLooksBad(name) {
  const n = String(name || "").trim();
  if (!n) return true;
  if (VN_REGION[n]) return true;          // 이름 칸에 지역명
  if (!/\p{L}/u.test(n)) return true;     // 글자(어떤 언어든)가 하나도 없음 = 숫자/기호만
  return false;
}
export function candMissing(c) {
  const ca = c.career || {};
  const miss = [];
  if (nameLooksBad(candName(c))) miss.push("이름");
  if (!candTracks(c).length) miss.push("희망직종");
  if (!candLoc(c)) miss.push("희망지역");
  if (ca.experienceYears == null) miss.push("경력");
  if (!candEmail(c) && !candPhone(c)) miss.push("연락처");
  return miss;
}
export function jobMissing(j) {
  const miss = [];
  if (!String(j.companyName || "").trim()) miss.push("회사명");
  if (!String(j.title || "").trim()) miss.push("제목");
  if (!String(j.city || "").trim()) miss.push("지역");
  if (!(Array.isArray(j.jobTracks) && j.jobTracks.length)) miss.push("직무");
  if (!/.+@.+\..+/.test(jobEmail(j))) miss.push("이메일");
  if (((j.description || "") + (j.requirements || "")).trim().length < 10) miss.push("업무내용");
  return miss;
}

// ── 중복 구직자 제거 (전화 같으면 동일인, 없으면 이름+국적) ──
export function dedupe(cands) {
  const seen = new Map();
  for (const c of cands) {
    const phone = candPhone(c);
    const key = phone ? `p:${phone}` : `n:${candName(c).trim()}|${(c.profile || {}).nationality || ""}`;
    const prev = seen.get(key);
    if (!prev || (c.ai?.score != null && prev.ai?.score == null)) seen.set(key, c);
  }
  return [...seen.values()];
}

// ── 1) 하드 필터: 활성 + 직종 겹침 ──
export function prefilter(job, candidates) {
  const jobTracks = Array.isArray(job.jobTracks) ? job.jobTracks : [];
  return candidates.filter((c) => {
    if (CLOSED_STATUS.test(c.status || "")) return false;
    const ct = candTracks(c);
    if (jobTracks.length && ct.length && !jobTracks.some((t) => ct.includes(t))) return false;
    return true;
  });
}

// ── 2) 사전 랭킹: 지역권역+경력+한국어로 유망순 정렬 후 상위 POOL_CAP ──
export function preRank(job, pool) {
  const jobRegion = regionOf(job.city) || regionOf(job.district);
  return pool.map((c) => {
    const loc = candLoc(c);
    let locPts;
    if (isFlexibleLoc(loc)) locPts = 2;
    else if (job.city && loc.includes(job.city)) locPts = 3;
    else if (jobRegion && regionOf(loc) === jobRegion) locPts = 2;
    else if (regionOf(loc)) locPts = 0;
    else locPts = 1;
    const expPts = Math.min((c.career || {}).experienceYears || 0, 10) / 10;
    const korPts = koreanScore((c.language || {}).korean || (c.language || {}).koreanLevel);
    const aiPts = c.ai?.score != null ? 0.5 : 0;
    return { c, pre: locPts + expPts + korPts + aiPts };
  }).sort((a, b) => b.pre - a.pre).slice(0, POOL_CAP).map((x) => x.c);
}

// ── 3) AI 평가 프롬프트 (추측성 점수 금지) ──
export function buildMatchPrompt(job, pool) {
  const lines = pool.map((c, i) => {
    const p = c.profile || {}, l = c.language || {}, ca = c.career || {}, w = c.workEligibility || {}, co = c.compensation || {};
    return `${i + 1}. ID:${c.id} 이름:${p.name || "?"} 국적:${p.nationality || "-"} 희망지역:${candLoc(c) || "미기재"} 직종:${candTracks(c).join("/") || "-"} 경력:${ca.experienceYears ?? "-"}년 한국어:${l.korean || l.koreanLevel || "-"} 비자:${w.visaStatus || "-"} 희망급여:${co.desiredSalaryUsdPerMonth || co.desiredUsdPerMonth || "협의"}`;
  }).join("\n");

  return `당신은 한국-베트남 채용 매칭 전문가입니다. 아래 [채용공고]에 대해 [후보] 각각의 적합도를 0~100으로 평가하세요.

평가 규칙(엄격히):
1. 공고의 '포지션 제목'과 '업무내용'을 구체적으로 보고 판단하라. 직종 카테고리가 같다는 이유만으로 높은 점수를 주지 말 것.
2. 지역: 후보 희망지역이 '무관/전지역/미기재'면 지역 감점 없음. 그렇지 않은데 공고와 다른 권역(북부/중부/남부)이면 60점을 넘기지 말 것.
3. 이유는 그 후보만의 구체적 강점/약점을 공고와 연결해 1문장으로. 모든 후보에 똑같은 문구 금지.
4. 후보의 실제 경력·기술·언어가 공고 직무와 맞지 않으면, 지역이 '무관'이어도 75점을 넘기지 마라. '관심/열정/적응 가능성' 같은 추측은 근거로 쓰지 말고, 검증된 이력만으로 평가하라.
점수: 90+ 매우적합 / 75~89 적합 / 60~74 보통 / 60미만 부적합

[채용공고]
회사: ${job.companyName || "-"} | 포지션: ${job.title || "-"}
지역: ${job.city || "-"} · ${job.district || "-"} | 업종: ${job.industryTrack || "-"} | 직무: ${(job.jobTracks || []).join(", ") || "-"}
고용형태: ${job.employmentType || "-"} | 급여(USD/월): ${job.salaryMinUsdPerMonth || "-"}~${job.salaryMaxUsdPerMonth || "-"}
요건: ${(job.requirements || "없음").slice(0, 220)}
업무: ${(job.description || "").slice(0, 220)}

[후보]
${lines}

[출력] 설명 없이 JSON 배열만, 적합도 높은 순:
[{"candidateId":"...","name":"...","score":0~100,"reason":"이 후보만의 구체적 이유 한 문장"}]`;
}

export function parseMatchArray(raw) {
  const m = String(raw || "").match(/\[[\s\S]*\]/);
  if (!m) throw new Error("AI 응답 파싱 실패");
  return JSON.parse(m[0]);
}

/**
 * 완전한 공고 1건에 대해 매칭 후보 산출 (점수 게이트까지).
 * @returns {Promise<Array<{candidateId,name,score,reason}>>} THRESHOLD 이상만, 점수순
 */
export async function matchJob(openai, job, completeCandidates, { threshold = 75, model = "gpt-4o" } = {}) {
  const passed = prefilter(job, completeCandidates);
  if (passed.length === 0) return [];
  const pool = preRank(job, passed);
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: buildMatchPrompt(job, pool) }],
    temperature: 0.2,
    max_tokens: 1600,
  });
  const ranked = parseMatchArray(completion.choices[0].message.content.trim());
  return ranked
    .filter((r) => (r.score || 0) >= threshold)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}
