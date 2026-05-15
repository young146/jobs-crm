import { getDb } from "@/lib/firebase-admin";
import Link from "next/link";
import AIAnalysisButton from "@/components/AIAnalysisButton";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getCandidate(id) {
  const db = getDb();
  const doc = await db.collection("candidates").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export default async function CandidateDetailPage({ params }) {
  const { id } = await params;
  const c = await getCandidate(id);
  if (!c) notFound();

  const profile = c.profile || {};
  const lang = c.language || {};
  const career = c.career || {};
  const we = c.workEligibility || {};
  const comp = c.compensation || {};
  const crm = c.crm || {};
  const ai = c.ai || {};

  const natFlag = (profile.nationality === "대한민국" || profile.nationality === "korea") ? "🇰🇷 한국"
    : (profile.nationality === "베트남" || profile.nationality === "vietnam") ? "🇻🇳 베트남"
    : profile.nationality || "-";

  const scoreColor = ai.score >= 85 ? "var(--accent)" : ai.score >= 70 ? "var(--green)" : ai.score >= 55 ? "var(--blue)" : "var(--muted)";

  return (
    <>
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/dashboard/candidates" className="btn btn-secondary btn-sm">← 목록</Link>
          <span className="topbar-title">{profile.name || "(이름없음)"}</span>
        </div>
        <span className="topbar-badge">ID: {c.id.slice(0, 8)}…</span>
      </div>
      <div className="page">
        <div className="detail-grid">
          {/* 왼쪽: 프로필 정보 */}
          <div>
            {/* 기본 정보 */}
            <div className="card">
              <div className="card-title">👤 기본 정보</div>
              {[
                ["이름", profile.name],
                ["국적", natFlag],
                ["연락처", profile.phone || profile.contactPhone],
                ["이메일", profile.email || profile.contactEmail],
                ["취업 희망 지역", profile.desiredLocation || profile.jobDesiredLocationText],
              ].map(([label, value]) => (
                <div className="field-row" key={label}>
                  <span className="field-label">{label}</span>
                  <span className="field-value">{value || "-"}</span>
                </div>
              ))}
            </div>

            {/* 언어 능력 */}
            <div className="card">
              <div className="card-title">🗣️ 언어 능력</div>
              {[
                ["🇰🇷 한국어", lang.korean || lang.koreanLevel],
                ["🇻🇳 베트남어", lang.vietnamese || lang.vietnameseLevel],
                ["🇺🇸 영어", lang.english || lang.englishLevel],
              ].map(([label, value]) => (
                <div className="field-row" key={label}>
                  <span className="field-label">{label}</span>
                  <span className="field-value">
                    <span className={`badge ${value && value !== "없음" && value !== "None" ? "badge-green" : "badge-muted"}`}>
                      {value || "없음"}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* 경력 */}
            <div className="card">
              <div className="card-title">💼 경력 및 역량</div>
              {[
                ["경력", career.experienceYears != null ? `${career.experienceYears}년` : null],
                ["학력", career.education],
                ["희망 직무", (career.jobTracks || career.desiredJobTracks || []).join(", ")],
                ["기술/자격증", career.skills || career.skillsCertsText],
              ].map(([label, value]) => (
                <div className="field-row" key={label}>
                  <span className="field-label">{label}</span>
                  <span className="field-value" style={{ fontSize: 13 }}>{value || "-"}</span>
                </div>
              ))}
            </div>

            {/* 비자 / 급여 */}
            <div className="card">
              <div className="card-title">📋 비자 및 급여</div>
              {[
                ["비자 상태", we.visaStatus],
                ["근무 가능 시작일", we.availableStartDate],
                ["희망 급여", comp.desiredSalaryUsdPerMonth || comp.desiredUsdPerMonth ? `$${comp.desiredSalaryUsdPerMonth || comp.desiredUsdPerMonth} / 월` : null],
              ].map(([label, value]) => (
                <div className="field-row" key={label}>
                  <span className="field-label">{label}</span>
                  <span className="field-value">{value || "-"}</span>
                </div>
              ))}
            </div>

            {/* YouTube */}
            {c.youtubeUrl && (
              <div className="card">
                <div className="card-title">📹 자기소개 영상</div>
                <a href={c.youtubeUrl} target="_blank" className="btn btn-secondary" style={{ fontSize: 13 }}>
                  ▶ YouTube 보기
                </a>
              </div>
            )}
          </div>

          {/* 오른쪽: AI 분석 */}
          <div>
            {/* AI 점수 카드 */}
            <div className="card ai-panel" style={{ marginBottom: 16 }}>
              <div className="card-title">🤖 AI 분석 결과</div>

              {ai.score ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <div className="score-ring" style={{ borderColor: scoreColor, color: scoreColor }}>
                      {ai.score}
                      <small>/ 100</small>
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>{ai.grade || "-"} 등급</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>추천 등급</div>
                    </div>
                  </div>

                  {ai.summaryKo && (
                    <>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>📝 AI 핵심 요약</div>
                      <div className="ai-summary-text">{ai.summaryKo}</div>
                    </>
                  )}

                  {ai.coreCompetencies?.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 14, marginBottom: 6, fontWeight: 600 }}>⭐ 핵심 역량</div>
                      <div className="ai-tags">
                        {ai.coreCompetencies.map((t) => (
                          <span key={t} className="badge badge-accent">{t}</span>
                        ))}
                      </div>
                    </>
                  )}

                  {ai.recommendedTrack?.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 14, marginBottom: 6, fontWeight: 600 }}>🎯 추천 트랙</div>
                      <div className="ai-tags">
                        {ai.recommendedTrack.map((t) => (
                          <span key={t} className="badge badge-blue">{t}</span>
                        ))}
                      </div>
                    </>
                  )}

                  {ai.rationaleKo && (
                    <>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 14, marginBottom: 6, fontWeight: 600 }}>💡 추천 근거</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{ai.rationaleKo}</div>
                    </>
                  )}

                  {ai.risksKo && (
                    <>
                      <div style={{ fontSize: 11, color: "var(--yellow)", marginTop: 14, marginBottom: 6, fontWeight: 600 }}>⚠️ 리스크 / 확인 필요</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{ai.risksKo}</div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
                  AI 분석이 아직 실행되지 않았습니다.<br/>
                  <span style={{ fontSize: 12 }}>아래 버튼을 눌러 분석을 시작하세요.</span>
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <AIAnalysisButton candidateId={c.id} hasScore={!!ai.score} />
              </div>
            </div>

            {/* CRM 상태 */}
            <div className="card">
              <div className="card-title">📊 CRM 상태</div>
              {[
                ["파이프라인", crm.status || "신규 등록"],
                ["관리자 검토 필요", crm.adminNeedsReview ? "⚠️ 예" : "✅ 아니요"],
                ["관리자 메모", crm.adminOverrideMessage || crm.notes || "-"],
                ["최종 AI 분석일", crm.lastAiAnalyzedAt || ai.analyzedAt || "-"],
                ["등록일", c.createdAt?.toDate?.()?.toLocaleString("ko-KR") || "-"],
              ].map(([label, value]) => (
                <div className="field-row" key={label}>
                  <span className="field-label">{label}</span>
                  <span className="field-value" style={{ fontSize: 12 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
