import { getDb } from "@/lib/firebase-admin";
import { getOpenAI } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { candidateId } = await request.json();
    if (!candidateId) {
      return NextResponse.json({ ok: false, error: "candidateId 필요" }, { status: 400 });
    }

    const db = getDb();
    const docRef = db.collection("candidates").doc(candidateId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ ok: false, error: "구직자를 찾을 수 없습니다" }, { status: 404 });
    }

    const c = doc.data();
    const profile = c.profile || {};
    const lang = c.language || {};
    const career = c.career || {};
    const we = c.workEligibility || {};
    const comp = c.compensation || {};

    const prompt = `당신은 한국-베트남 구인구직 전문 인재 평가 AI입니다.
아래 구직자 정보를 분석하여 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

[구직자 정보]
- 이름: ${profile.name || "미상"}
- 국적: ${profile.nationality || "미상"}
- 한국어: ${lang.korean || lang.koreanLevel || "없음"}
- 베트남어: ${lang.vietnamese || lang.vietnameseLevel || "없음"}
- 영어: ${lang.english || lang.englishLevel || "없음"}
- 경력: ${career.experienceYears || 0}년
- 학력: ${career.education || "미상"}
- 희망 직무: ${(career.jobTracks || career.desiredJobTracks || []).join(", ") || "미상"}
- 기술/자격증: ${career.skills || career.skillsCertsText || "없음"}
- 비자: ${we.visaStatus || "미상"}
- 희망 급여: $${comp.desiredSalaryUsdPerMonth || comp.desiredUsdPerMonth || "협의"}/월
- 희망 근무지: ${profile.desiredLocation || profile.jobDesiredLocationText || "미상"}

[출력 형식 - 반드시 이 JSON만 출력]
{
  "score": 0~100 숫자 (종합 추천 점수),
  "grade": "S" or "A" or "B" or "C",
  "summaryKo": "핵심 5줄 요약. 각 줄은 \\n으로 구분",
  "coreCompetencies": ["역량1", "역량2", "역량3"],
  "recommendedTrack": ["직무트랙1", "직무트랙2"],
  "recommendedRegion": "추천 근무 권역 (북부/남부/중부 중 하나)",
  "rationaleKo": "추천 근거 2~3문장",
  "risksKo": "리스크 또는 확인 필요 사항 1~2문장"
}

[점수 기준]
- 한국어 고급/원어민 + 경력 3년 이상: +30점
- 다국어 가능: +20점
- 전문 기술/자격증: +20점
- 베트남 취업 비자/워크퍼밋 보유: +15점
- 나머지: 기타 +15점`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const raw = completion.choices[0].message.content.trim();
    // JSON 파싱
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ ok: false, error: "AI 응답 파싱 실패", raw }, { status: 500 });
    }
    const ai = JSON.parse(jsonMatch[0]);

    // Firebase 업데이트
    const today = new Date().toISOString().slice(0, 10);
    await docRef.update({
      ai: {
        score: ai.score,
        grade: ai.grade,
        summaryKo: ai.summaryKo,
        coreCompetencies: ai.coreCompetencies || [],
        recommendedTrack: ai.recommendedTrack || [],
        recommendedRegion: ai.recommendedRegion || "",
        rationaleKo: ai.rationaleKo,
        risksKo: ai.risksKo,
        analyzedAt: today,
      },
      "crm.lastAiAnalyzedAt": today,
    });

    return NextResponse.json({ ok: true, score: ai.score, grade: ai.grade });
  } catch (err) {
    console.error("AI analyze error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
