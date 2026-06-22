/**
 * AI 매칭 품질 검증용 DRY-RUN (메일 발송 없음)
 *
 * 목적: 자동발송을 켜기 전에, "결정론적 필터 + 사전랭킹 + AI 평가 + 점수 게이트"가
 *       실제 데이터에서 제대로 된 후보를 뽑는지 눈으로 확인한다.
 *
 * 흐름 (Phase 2에서 lib로 추출 → 크론 자동발송에 재사용 예정):
 *   0) 중복 구직자 제거 (이름+전화)
 *   1) 하드 필터(코드): 활성 상태 + 직종(jobTracks) 겹침 → 말도 안 되는 후보 제거
 *   2) 사전 랭킹(코드): 지역권역·경력·한국어로 점수화 → 가장 유망한 N명만 AI에 (등록순 아님)
 *   3) AI 평가(GPT-4o): 공고 제목·업무까지 보고 구체적으로 점수화
 *   4) 점수 게이트: THRESHOLD 이상만 "발송 대상". 0명이면 발송 안 함
 *
 * 실행: node scripts/match-dryrun.cjs [공고수=3] [임계점수=70]
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const OpenAI = require("openai");

(function loadEnv() {
  try {
    const txt = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* env로 이미 들어와 있으면 무시 */ }
})();

const NUM_JOBS = parseInt(process.argv[2], 10) || 3;
const THRESHOLD = parseInt(process.argv[3], 10) || 70;
const POOL_CAP = 20;
const CLOSED_STATUS = /(완료|마감|중단|비활성|종료)/;

// ── 베트남 지역명(한글) → 권역. 사전랭킹/지역적합 판정용 ──
const VN_REGION = {};
const REGION_CITIES = {
  남부: ["호치민", "호찌민", "동나이", "빈증", "빈즈엉", "붕따우", "바리어", "롱안", "떠이닌", "빈푹남", "껀터", "까마우", "안장", "끼엔장", "벤째", "짜빈", "속짱", "박리에우", "하우장", "띠엔장", "빈롱", "동탑", "닌투언", "빈투언", "푸꾸옥"],
  중부: ["다낭", "후에", "투아티엔", "꽝남", "호이안", "꽝응아이", "빈딘", "꾸이년", "푸옌", "칸호아", "나트랑", "꽝빈", "꽝찌", "하띤", "응에안", "타인호아", "닥락", "달랏", "럼동", "잘라이", "꼰뚬", "닥농"],
  북부: ["하노이", "하이퐁", "박닌", "박장", "하남", "남딘", "타이빈", "흥옌", "하이즈엉", "빈푹", "푸토", "타이응우옌", "타이웬", "꽝닌", "하롱", "랑선", "까오방", "옌바이", "라오까이", "호아빈", "닌빈", "옌풍", "빈푹"],
};
for (const [region, cities] of Object.entries(REGION_CITIES)) for (const c of cities) VN_REGION[c] = region;

function regionOf(text) {
  const t = String(text || "");
  for (const key of Object.keys(VN_REGION)) if (t.includes(key)) return VN_REGION[key];
  return null;
}
function isFlexibleLoc(text) {
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

admin.initializeApp({ credential: admin.credential.cert(require(path.join(process.cwd(), "serviceAccount.json"))) });
const db = admin.firestore();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const candTracks = (c) => (c.career || {}).jobTracks || (c.career || {}).desiredJobTracks || [];
const candLoc = (c) => ((c.profile || {}).desiredLocation || (c.profile || {}).jobDesiredLocationText || "").trim();
const candPhone = (c) => { const p = c.profile || {}; return (p.phone || p.contactPhone || p.mobile || "").replace(/[^0-9]/g, ""); };

// ── 0) 중복 제거: 전화(숫자) 같으면 동일인. 전화 없으면 이름+국적 ──
function dedupe(cands) {
  const seen = new Map();
  for (const c of cands) {
    const phone = candPhone(c);
    const key = phone ? `p:${phone}` : `n:${((c.profile || {}).name || "").trim()}|${(c.profile || {}).nationality || ""}`;
    const prev = seen.get(key);
    // 더 완성도 높은 레코드(ai분석 있음 우선) 유지
    if (!prev || (c.ai?.score != null && prev.ai?.score == null)) seen.set(key, c);
  }
  return [...seen.values()];
}

// ── 1) 하드 필터 ──
function prefilter(job, candidates) {
  const jobTracks = Array.isArray(job.jobTracks) ? job.jobTracks : [];
  const dropped = { status: 0, track: 0, incomplete: 0 };
  const passed = candidates.filter((c) => {
    if (CLOSED_STATUS.test(c.status || "")) { dropped.status++; return false; }
    // 완성도 가드: 이름이 없거나, 직종·경력·지역이 전혀 없는 빈 프로필은 매칭에서 제외
    const p = c.profile || {};
    const hasSignal = candTracks(c).length || (c.career || {}).experienceYears != null || candLoc(c);
    if (!String(p.name || "").trim() || !hasSignal) { dropped.incomplete++; return false; }
    const ct = candTracks(c);
    if (jobTracks.length && ct.length && !jobTracks.some((t) => ct.includes(t))) { dropped.track++; return false; }
    return true;
  });
  return { passed, dropped, trackFilter: jobTracks.length > 0 };
}

// ── 2) 사전 랭킹: 지역권역+경력+한국어로 코드 점수 → 유망순 정렬 ──
function preRank(job, pool) {
  const jobRegion = regionOf(job.city) || regionOf(job.district);
  return pool.map((c) => {
    const loc = candLoc(c);
    let locPts;
    if (isFlexibleLoc(loc)) locPts = 2;                          // 지역 무관
    else if (job.city && loc.includes(job.city)) locPts = 3;      // 도시 정확히 일치
    else if (jobRegion && regionOf(loc) === jobRegion) locPts = 2; // 같은 권역
    else if (regionOf(loc)) locPts = 0;                          // 다른 권역
    else locPts = 1;                                             // 판별 불가
    const expPts = Math.min((c.career || {}).experienceYears || 0, 10) / 10; // 0~1
    const korPts = koreanScore((c.language || {}).korean || (c.language || {}).koreanLevel);
    const aiPts = c.ai?.score != null ? 0.5 : 0;
    return { c, pre: locPts + expPts + korPts + aiPts, jobRegion, candRegion: regionOf(loc), flexible: isFlexibleLoc(loc) };
  }).sort((a, b) => b.pre - a.pre);
}

// ── 3) AI 평가 프롬프트 (구체 평가 강제) ──
function buildPrompt(job, pool) {
  const lines = pool.map((c, i) => {
    const p = c.profile || {}, l = c.language || {}, ca = c.career || {}, w = c.workEligibility || {}, co = c.compensation || {};
    return `${i + 1}. ID:${c.id} 이름:${p.name || "?"} 국적:${p.nationality || "-"} 희망지역:${candLoc(c) || "미기재"} 직종:${candTracks(c).join("/") || "-"} 경력:${ca.experienceYears ?? "-"}년 한국어:${l.korean || l.koreanLevel || "-"} 비자:${w.visaStatus || "-"} 희망급여:${co.desiredSalaryUsdPerMonth || co.desiredUsdPerMonth || "협의"}`;
  }).join("\n");

  return `당신은 한국-베트남 채용 매칭 전문가입니다. 아래 [채용공고]에 대해 [후보] 각각의 적합도를 0~100으로 평가하세요.

평가 규칙(엄격히):
1. 공고의 '포지션 제목'과 '업무내용'을 구체적으로 보고 판단하라. 단순히 직종 카테고리가 같다는 이유로 높은 점수를 주지 말 것.
2. 지역: 후보 희망지역이 '무관/전지역/미기재'면 지역 감점 없음. 그렇지 않은데 공고와 다른 권역(북부/중부/남부)이면 60점을 넘기지 말 것.
3. 이유는 그 후보만의 구체적 강점/약점을 공고와 연결해 1문장으로. 모든 후보에 똑같은 문구를 쓰지 말 것.
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

async function rankWithAI(job, pool) {
  const r = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: buildPrompt(job, pool) }],
    temperature: 0.2,
    max_tokens: 1600,
  });
  const raw = r.choices[0].message.content.trim();
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("AI 파싱 실패: " + raw.slice(0, 120));
  return JSON.parse(m[0]);
}

(async () => {
  console.log(`\n===== AI 매칭 DRY-RUN (공고 ${NUM_JOBS}건 · 임계 ${THRESHOLD}점 · 발송 안 함) =====`);

  const candSnap = await db.collection("candidates").get();
  const rawCands = candSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const candidates = dedupe(rawCands);
  console.log(`구직자: ${rawCands.length}명 → 중복제거 후 ${candidates.length}명\n`);

  const jobSnap = await db.collection("Jobs").orderBy("createdAt", "desc").limit(NUM_JOBS * 12).get();
  const jobDocs = jobSnap.docs
    .filter((d) => { const j = d.data(); return (!j.jobType || j.jobType === "구인") && j.status === "모집중"; })
    .slice(0, NUM_JOBS);

  for (const jd of jobDocs) {
    const job = jd.data();
    console.log("─".repeat(72));
    console.log(`📋 [${job.companyName || "-"}] ${job.title}`);
    console.log(`   지역:${job.city || "-"}·${job.district || "-"} (권역:${regionOf(job.city) || regionOf(job.district) || "?"}) | 직무:${(job.jobTracks || []).join("/") || "(없음)"}`);

    const { passed, dropped, trackFilter } = prefilter(job, candidates);
    console.log(`   🔍 하드필터: ${candidates.length} → ${passed.length}명 (직종제외 ${dropped.track}${trackFilter ? "" : "·공고직종없음"}, 빈프로필제외 ${dropped.incomplete}, 비활성제외 ${dropped.status})`);
    if (passed.length === 0) { console.log("   ⚠️  0명 → 발송 안 함\n"); continue; }

    const rankedPre = preRank(job, passed);
    const pool = rankedPre.slice(0, POOL_CAP).map((x) => x.c);
    const flexN = rankedPre.slice(0, POOL_CAP).filter((x) => x.flexible).length;
    const regionN = rankedPre.slice(0, POOL_CAP).filter((x) => !x.flexible && x.candRegion === x.jobRegion).length;
    console.log(`   📊 사전랭킹 상위 ${pool.length}명 AI 평가 (지역무관 ${flexN} · 동일권역 ${regionN})${passed.length > POOL_CAP ? ` [${passed.length}명 중]` : ""}`);

    let ranked;
    try { ranked = await rankWithAI(job, pool); }
    catch (e) { console.log(`   ❌ AI 오류: ${e.message}\n`); continue; }

    ranked.sort((a, b) => (b.score || 0) - (a.score || 0));
    const sendable = ranked.filter((r) => (r.score || 0) >= THRESHOLD);
    console.log(`   🤖 AI 평가 ${ranked.length}명 | ✅ ${THRESHOLD}점↑ 발송대상 ${sendable.length}명`);
    ranked.slice(0, 7).forEach((r) => {
      const mark = (r.score || 0) >= THRESHOLD ? "✅" : "  ";
      console.log(`     ${mark} ${String(r.score).padStart(3)}점  ${r.name}  — ${r.reason}`);
    });
    if (sendable.length === 0) console.log("   → 발송대상 0명: 메일 안 나감");
    console.log("");
  }

  console.log("===== DRY-RUN 종료 (실제 메일 발송 없음) =====\n");
  process.exit(0);
})().catch((e) => { console.error("DRY-RUN 오류:", e.message); process.exit(1); });
