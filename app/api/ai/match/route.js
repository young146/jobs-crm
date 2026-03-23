import { getDb } from "@/lib/firebase-admin";
import { getOpenAI } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { jobId, candidateIds } = await request.json();
    const db = getDb();

    const [jobDoc, ...candDocs] = await Promise.all([
      db.collection("Jobs").doc(jobId).get(),
      ...candidateIds.slice(0, 20).map(id => db.collection("candidates").doc(id).get()),
    ]);

    if (!jobDoc.exists) {
      return NextResponse.json({ ok: false, error: "채용공고 없음" }, { status: 404 });
    }
    const job = jobDoc.data();

    const candidatesData = candDocs.filter(d => d.exists).map(d => {
      const c = d.data();
      const profile = c.profile || {};
      const lang = c.language || {};
      const career = c.career || {};
      const ai = c.ai || {};
      return {
        id: d.id,
        name: profile.name,
        nationality: profile.nationality,
        korean: lang.korean || lang.koreanLevel,
        experience: career.experienceYears,
        jobTracks: (career.jobTracks || career.desiredJobTracks || []).join(", "),
        skills: career.skills || career.skillsCertsText,
        aiScore: ai.score,
        aiGrade: ai.grade,
        aiSummary: ai.summaryKo?.split("\n")[0],
      };
    });

    const prompt = `당신은 구인구직 매칭 전문가입니다.
아래 채용공고와 구직자 목록을 분석하여, 상위 5명을 추천하고 반드시 JSON 배열만 출력하세요.

[채용공고]
- 포지션: ${job.title}
- 업종: ${job.industry}
- 지역: ${job.city}
- 고용형태: ${job.employmentType}
- 경력요건: ${job.requirements || "없음"}
- 업무내용: ${job.description || ""}

[구직자 목록]
${candidatesData.map((c, i) => `${i+1}. ID:${c.id} 이름:${c.name} 국적:${c.nationality} 한국어:${c.korean} 경력:${c.experience}년 직무:${c.jobTracks} 기술:${c.skills} AI점수:${c.aiScore||"미분석"}`).join("\n")}

[출력 형식 - JSON 배열만, 다른 텍스트 없이]
[
  {"candidateId": "...", "name": "...", "score": 0~100, "reason": "추천 이유 1문장"},
  ...
]
상위 5명만 출력. score는 이 채용공고에 대한 적합도(%).`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
    });

    const raw = completion.choices[0].message.content.trim();
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    const matches = arrMatch ? JSON.parse(arrMatch[0]) : [];

    return NextResponse.json({ ok: true, matches });
  } catch (err) {
    console.error("match error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
