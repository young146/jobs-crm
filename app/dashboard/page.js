import { getDb } from "@/lib/firebase-admin";

async function getStats() {
  const db = getDb();
  const [candidatesSnap, jobsSnap] = await Promise.all([
    db.collection("candidates").get(),
    db.collection("Jobs").get(),
  ]);

  // candidates 컬렉션
  let aiAnalyzed = 0;
  let pendingReview = 0;
  candidatesSnap.forEach((doc) => {
    const d = doc.data();
    if (d.ai?.score) aiAnalyzed++;
    if (d.crm?.adminNeedsReview) pendingReview++;
  });

  // Jobs 컬렉션: 구인 / 구직 분리 (jobType 필드 기준)
  let totalJobs = 0;  // 구인 공고
  let openJobs = 0;
  let legacyCandidates = 0; // 구직자 (legacy)
  jobsSnap.forEach((doc) => {
    const d = doc.data();
    if (!d.jobType || d.jobType === "구인") {
      totalJobs++;
      if (d.status === "모집중") openJobs++;
    } else if (d.jobType === "구직") {
      legacyCandidates++;
    }
  });

  const totalCandidates = candidatesSnap.size + legacyCandidates;

  return { totalCandidates, totalJobs, aiAnalyzed, pendingReview, openJobs, legacyCandidates, newCandidates: candidatesSnap.size };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">📊 홈 대시보드</span>
        <span className="topbar-badge">🟢 Firebase 연결됨</span>
      </div>
      <div className="page">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>사령탑 <span style={{ color: "var(--accent)" }}>대시보드</span></h1>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>씬짜오 리쿠르트 CRM · Firebase chaovietnam-login</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">👤 총 구직자</div>
            <div className="stat-value" style={{ color: "var(--blue)" }}>{stats.totalCandidates}</div>
            <div className="stat-sub">신규 {stats.newCandidates}명 · 구 앱 {stats.legacyCandidates}명</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">🤖 AI 분석 완료</div>
            <div className="stat-value" style={{ color: "var(--accent)" }}>{stats.aiAnalyzed}</div>
            <div className="stat-sub">점수화된 인재</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">⚠️ 검토 필요</div>
            <div className="stat-value" style={{ color: "var(--yellow)" }}>{stats.pendingReview}</div>
            <div className="stat-sub">관리자 확인 필요</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">🏢 채용공고(구인)</div>
            <div className="stat-value" style={{ color: "var(--purple)" }}>{stats.totalJobs}</div>
            <div className="stat-sub">등록된 포지션</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">✅ 모집중</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>{stats.openJobs}</div>
            <div className="stat-sub">활성 공고</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card">
            <div className="card-title">🚀 빠른 작업</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { href: "/dashboard/candidates", icon: "👤", label: "구직자 목록 보기", sub: `${stats.totalCandidates}명 등록됨` },
                { href: "/dashboard/jobs", icon: "🏢", label: "채용공고 보기", sub: `${stats.openJobs}개 모집중` },
                { href: "/dashboard/matching", icon: "🤖", label: "AI 매칭 실행", sub: "적합 인재 자동 추천" },
              ].map((item) => (
                <a key={item.href} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)",
                  transition: "border-color 0.15s",
                }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.sub}</div>
                  </div>
                  <span style={{ marginLeft: "auto", color: "var(--muted)" }}>→</span>
                </a>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">📋 사업 로드맵</div>
            {[
              { done: true,  label: "Firebase 연동", sub: "chaovietnam-login" },
              { done: true,  label: "Notion CRM 구축", sub: "구직자/구인 파이프라인" },
              { done: true,  label: "사령탑 웹앱", sub: "현재 보고 있는 화면" },
              { done: false, label: "AI 자동 매칭 고도화", sub: "3~4주차" },
              { done: false, label: "Zalo 미니앱 배포", sub: "5~8주차" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{item.done ? "✅" : "⬜"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: item.done ? 500 : 400, color: item.done ? "var(--text)" : "var(--muted)" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
