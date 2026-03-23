"use client";
import { useState } from "react";

export default function MatchingPage() {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const [ran, setRan] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [jRes, cRes] = await Promise.all([
        fetch("/api/jobs").then(r => r.json()),
        fetch("/api/candidates").then(r => r.json()),
      ]);
      setJobs(jRes.jobs || []);
      setCandidates(cRes.candidates || []);
      setInitialized(true);
    } catch (e) {
      setError(`데이터 로딩 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function runMatching() {
    if (!selectedJob) return;
    setLoading(true);
    setMatches([]);
    setError("");
    setRan(false);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJob.id,
          candidateIds: candidates.slice(0, 20).map(c => c.id),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(`매칭 실패: ${data.error}`);
      } else {
        setMatches(data.matches || []);
      }
    } catch (e) {
      setError(`네트워크 오류: ${e.message}`);
    } finally {
      setLoading(false);
      setRan(true);
    }
  }

  const aiAnalyzedCount = candidates.filter(c => c.ai?.score).length;

  function scoreColor(score) {
    if (score >= 80) return "var(--accent)";
    if (score >= 65) return "var(--green)";
    if (score >= 50) return "var(--blue)";
    return "var(--muted)";
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">🤖 AI 매칭 엔진</span>
        <span className="topbar-badge">구직자 ↔ 채용공고 적합도 분석</span>
      </div>
      <div className="page">
        {!initialized ? (
          <div style={{ textAlign: "center", marginTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>AI 매칭 엔진</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
              채용공고를 선택하면 AI가 가장 적합한 구직자를 자동으로 분석해 추천합니다.
              <br/>AI 분석이 완료된 구직자일수록 매칭 정확도가 높아집니다.
            </div>
            <button className="btn btn-primary" onClick={loadData} disabled={loading}
              style={{ fontSize: 15, padding: "12px 28px" }}>
              {loading ? "⏳ 로딩 중..." : "📂 데이터 불러오기"}
            </button>
            {error && <div style={{ marginTop: 16, color: "var(--red)", fontSize: 13 }}>❌ {error}</div>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
            {/* 채용공고 선택 */}
            <div>
              <div className="card" style={{ position: "sticky", top: 80 }}>
                <div className="card-title">🏢 채용공고 선택</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "55vh", overflowY: "auto" }}>
                  {jobs.length === 0 && (
                    <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                      채용공고가 없습니다
                    </div>
                  )}
                  {jobs.map(j => (
                    <button key={j.id} onClick={() => { setSelectedJob(j); setMatches([]); setRan(false); setError(""); }}
                      style={{
                        padding: "10px 12px", borderRadius: 8, border: "1px solid",
                        borderColor: selectedJob?.id === j.id ? "var(--accent)" : "var(--border)",
                        background: selectedJob?.id === j.id ? "rgba(255,107,53,0.1)" : "var(--surface2)",
                        color: "var(--text)", textAlign: "left", cursor: "pointer",
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{j.title || "(제목없음)"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                        {j.industry || j.industryTrack || "-"} · {j.city || "-"}
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 14 }}>
                  {selectedJob ? (
                    <>
                      <button className="btn btn-primary" onClick={runMatching} disabled={loading}
                        style={{ width: "100%", justifyContent: "center" }}>
                        {loading ? "🤖 매칭 분석 중..." : "✨ AI 매칭 실행"}
                      </button>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, textAlign: "center" }}>
                        구직자 {candidates.length}명 중 AI분석 완료 {aiAnalyzedCount}명
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "10px 0" }}>
                      ← 공고를 선택해주세요
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 매칭 결과 */}
            <div>
              {/* 에러 */}
              {error && (
                <div className="card" style={{ borderColor: "var(--red)", marginBottom: 0 }}>
                  <div style={{ color: "var(--red)", fontSize: 14 }}>❌ {error}</div>
                </div>
              )}

              {/* 로딩 */}
              {loading && (
                <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div className="spinner" style={{ margin: "0 auto 16px" }} />
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    GPT-4o가 구직자 적합도를 분석하고 있습니다...<br/>
                    <span style={{ fontSize: 11 }}>최대 20-30초 소요될 수 있습니다</span>
                  </div>
                </div>
              )}

              {/* 초기 안내 */}
              {!loading && !ran && !error && (
                <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
                  <div style={{ color: "var(--muted)", fontSize: 14 }}>
                    {selectedJob
                      ? <>공고 선택됨: <strong style={{ color: "var(--text)" }}>{selectedJob.title}</strong><br/>AI 매칭 실행 버튼을 누르세요</>
                      : "왼쪽에서 채용공고를 선택하세요"}
                  </div>
                  {aiAnalyzedCount === 0 && (
                    <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(210,153,34,0.1)", border: "1px solid var(--yellow)", borderRadius: 8, fontSize: 12, color: "var(--yellow)" }}>
                      ⚠️ AI 분석된 구직자가 없습니다.<br/>
                      구직자 목록에서 AI 분석을 먼저 실행하면 매칭 정확도가 높아집니다.
                    </div>
                  )}
                </div>
              )}

              {/* 결과 없음 */}
              {!loading && ran && matches.length === 0 && !error && (
                <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>매칭 결과가 없습니다</div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>
                    현재 등록된 구직자 중 이 공고에 적합한 후보가 없거나,<br/>
                    AI가 매칭 점수를 산출하지 못했습니다.
                  </div>
                  <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(88,166,255,0.1)", border: "1px solid var(--blue)", borderRadius: 8, fontSize: 12, color: "var(--blue)" }}>
                    💡 구직자 상세 페이지에서 AI 분석을 먼저 실행해보세요
                  </div>
                </div>
              )}

              {/* 매칭 결과 */}
              {!loading && matches.length > 0 && (
                <div className="card">
                  <div className="card-title">
                    🏆 매칭 결과 — <span style={{ color: "var(--text)", fontWeight: 500 }}>{selectedJob?.title}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
                      Top {matches.length}명
                    </span>
                  </div>

                  {matches.map((m, i) => (
                    <div key={m.candidateId || i} className="match-row">
                      <div style={{
                        fontSize: 20, fontWeight: 800, minWidth: 36, textAlign: "center",
                        color: i === 0 ? "var(--accent)" : i === 1 ? "var(--yellow)" : "var(--muted)"
                      }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name || "(이름없음)"}</span>
                          <span className="badge badge-accent" style={{ fontSize: 11 }}>{m.score}% 적합</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{m.reason}</div>
                        <div className="match-score-bar" style={{ marginTop: 8 }}>
                          <div className="match-score-fill" style={{ width: `${m.score}%` }} />
                        </div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 22, color: scoreColor(m.score), minWidth: 56, textAlign: "right" }}>
                        {m.score}%
                      </div>
                      <a href={`/dashboard/candidates/${m.candidateId}`}
                        className="btn btn-secondary btn-sm" style={{ whiteSpace: "nowrap" }}>
                        상세 보기
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
