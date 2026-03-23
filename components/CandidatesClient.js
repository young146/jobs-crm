"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CITIES = ["전체", "호치민", "하노이", "다낭", "냐짱", "붕따우", "빈증", "동나이", "기타"];
const NATIONALITIES = ["전체", "대한민국", "베트남", "기타"];
const STATUSES = ["전체", "신규 등록", "이력서 확인 필요", "AI 추천 생성", "추천안 검토", "추천안 발송", "진행중", "완료"];
const BULK_STATUSES = ["신규 등록", "이력서 확인 필요", "AI 추천 생성", "추천안 검토", "추천안 발송", "진행중", "완료"];

const BULK_ACTIONS = ["상태 변경", "AI 일괄분석", "삭제"];

const STATUS_BADGE = {
  "신규 등록": "badge-muted", "이력서 확인 필요": "badge-yellow",
  "AI 추천 생성": "badge-blue", "추천안 검토": "badge-purple",
  "추천안 발송": "badge-green", "진행중": "badge-accent", "완료": "badge-green",
};

function gradeColor(score) {
  if (!score) return "var(--muted)";
  if (score >= 85) return "var(--accent)";
  if (score >= 70) return "var(--green)";
  if (score >= 55) return "var(--blue)";
  return "var(--muted)";
}

function normalize(c) {
  const profile = c.profile || {};
  const lang    = c.language || {};
  const career  = c.career || {};
  const ai      = c.ai || {};
  const crm     = c.crm || {};
  return {
    name:        profile.name || c.title || c.name || "(이름없음)",
    nationality: profile.nationality || c.nationality || "",
    city:        profile.jobDesiredLocationText || profile.desiredLocation || c.city || "",
    korean:      lang.korean || lang.koreanLevel || c.korean || c.koreanLevel || "",
    expYears:    career.experienceYears ?? c.experienceYears ?? null,
    jobTracks:   career.jobTracks || career.desiredJobTracks || c.jobTracks || [],
    score:       ai.score,
    grade:       ai.grade,
    status:      crm.status || c.status || "신규 등록",
    needsReview: crm.adminNeedsReview || false,
    date:        c.createdAt ? new Date(c.createdAt).toLocaleDateString("ko-KR") : "-",
  };
}

export default function CandidatesClient({ candidates }) {
  const router = useRouter();
  const [filterCity, setFilterCity]     = useState("전체");
  const [filterNat,  setFilterNat]      = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState(new Set());
  const [bulkStatus, setBulkStatus]     = useState("");
  const [loading, setLoading]           = useState(false);
  const [toast, setToast]               = useState("");
  // 개별 AI 분석 로딩 상태
  const [analyzingIds, setAnalyzingIds] = useState(new Set());

  // 필터 적용
  const filtered = useMemo(() => {
    return candidates.filter(c => {
      const n = normalize(c);
      if (filterCity !== "전체" && !n.city.includes(filterCity)) return false;
      if (filterNat  !== "전체") {
        const nat = n.nationality.toLowerCase();
        if (filterNat === "대한민국" && !["대한민국","korea","한국"].includes(nat)) return false;
        if (filterNat === "베트남"   && !["베트남","vietnam"].includes(nat)) return false;
        if (filterNat === "기타"     && (["대한민국","korea","한국","베트남","vietnam"].includes(nat))) return false;
      }
      if (filterStatus !== "전체" && n.status !== filterStatus) return false;
      if (search && !n.name.includes(search) && !n.city.includes(search) && !n.jobTracks.join(",").includes(search)) return false;
      return true;
    });
  }, [candidates, filterCity, filterNat, filterStatus, search]);

  const allChecked = filtered.length > 0 && filtered.every(c => selected.has(c.id));

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  }
  function toggleOne(id) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleDelete(id) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    if ((await res.json()).ok) { showToast("🗑️ 삭제됨"); router.refresh(); }
  }

  async function handleAnalyze(id) {
    setAnalyzingIds(prev => new Set([...prev, id]));
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: id }),
      });
      const data = await res.json();
      if (data.ok) { showToast(`✅ AI 분석 완료! ${data.score}점 (${data.grade}등급)`); router.refresh(); }
      else showToast(`❌ 분석 실패: ${data.error}`);
    } catch (e) {
      showToast(`❌ 오류: ${e.message}`);
    } finally {
      setAnalyzingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleBulkAnalyze() {
    if (selected.size === 0) return;
    const ids = [...selected];
    showToast(`🤖 ${ids.length}명 AI 분석 시작... (시간이 걸립니다)`);
    setSelected(new Set());
    let done = 0;
    for (const id of ids) {
      try {
        const res = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: id }),
        });
        const data = await res.json();
        if (data.ok) done++;
      } catch {}
    }
    showToast(`✅ AI 분석 완료: ${done}/${ids.length}명`);
    router.refresh();
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}명을 삭제하시겠습니까?`)) return;
    setLoading(true);
    const res = await fetch("/api/candidates/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: [...selected] }),
    });
    const data = await res.json();
    showToast(`🗑️ ${data.success}명 삭제 완료`);
    setSelected(new Set());
    setLoading(false);
    router.refresh();
  }

  async function handleBulkStatus() {
    if (selected.size === 0 || !bulkStatus) return;
    setLoading(true);
    const res = await fetch("/api/candidates/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", ids: [...selected], value: bulkStatus }),
    });
    const data = await res.json();
    showToast(`✅ ${data.success}명 상태 변경 완료`);
    setSelected(new Set());
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="page">
      {/* ── 필터 바 ── */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>🔍 필터</span>
          <input
            className="table-search"
            placeholder="이름/직무 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 160 }}
          />
          <select className="filter-select" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filterNat} onChange={e => setFilterNat(e.target.value)}>
            {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
            {filtered.length}/{candidates.length}명 표시
          </span>
          {(filterCity !== "전체" || filterNat !== "전체" || filterStatus !== "전체" || search) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterCity("전체"); setFilterNat("전체"); setFilterStatus("전체"); setSearch(""); }}>
              ✕ 초기화
            </button>
          )}
        </div>
      </div>

      {/* ── 일괄처리 바 (선택 시 표시) ── */}
      {selected.size > 0 && (
        <div style={{ background: "rgba(255,107,53,0.1)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
            ☑ {selected.size}명 선택됨
          </span>
          <button className="btn btn-sm" onClick={handleBulkAnalyze} disabled={loading}
            style={{ background: "rgba(188,140,255,0.15)", color: "var(--purple)", border: "1px solid var(--purple)" }}>
            🤖 AI 일괄분석
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="filter-select" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">상태 변경...</option>
              {BULK_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={handleBulkStatus} disabled={!bulkStatus || loading}>
              ✅ 일괄 상태 변경
            </button>
          </div>
          <button className="btn btn-sm" onClick={handleBulkDelete} disabled={loading}
            style={{ background: "rgba(248,81,73,0.15)", color: "var(--red)", border: "1px solid var(--red)" }}>
            🗑️ 일괄 삭제
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>취소</button>
        </div>
      )}

      {/* ── 테이블 ── */}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">구직자 목록</span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            AI분석: {candidates.filter(c => c.ai?.score).length}/{candidates.length}명
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll}
                  style={{ cursor: "pointer", accentColor: "var(--accent)", width: 15, height: 15 }} />
              </th>
              <th>이름</th>
              <th>국적</th>
              <th>희망도시</th>
              <th>한국어</th>
              <th>경력</th>
              <th>희망직무</th>
              <th>AI점수</th>
              <th>상태</th>
              <th>등록일</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="empty-state">조건에 맞는 구직자가 없습니다</td></tr>
            ) : filtered.map((c) => {
              const n = normalize(c);
              const natFlag = (n.nationality === "대한민국" || n.nationality === "korea" || n.nationality === "한국") ? "🇰🇷"
                : (n.nationality === "베트남" || n.nationality === "vietnam") ? "🇻🇳"
                : n.nationality ? "🌏" : "-";

              return (
                <tr key={c.id} style={{ background: selected.has(c.id) ? "rgba(255,107,53,0.05)" : undefined }}>
                  <td>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)}
                      style={{ cursor: "pointer", accentColor: "var(--accent)", width: 15, height: 15 }} />
                  </td>
                  <td>
                    <Link href={`/dashboard/candidates/${c.id}`} style={{ color: "var(--text)", fontWeight: 600 }}>
                      {n.name}
                      {n.needsReview && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--yellow)" }}>⚠️</span>}
                    </Link>
                  </td>
                  <td><span style={{ fontSize: 14 }}>{natFlag}</span></td>
                  <td style={{ fontSize: 12, color: "var(--blue)" }}>{n.city || "-"}</td>
                  <td><span style={{ fontSize: 12 }}>{n.korean || "-"}</span></td>
                  <td>{n.expYears != null ? `${n.expYears}년` : "-"}</td>
                  <td style={{ maxWidth: 130 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {n.jobTracks.slice(0, 2).join(", ") || "-"}
                    </span>
                  </td>
                  <td>
                    {n.score
                      ? <span style={{ fontWeight: 700, color: gradeColor(n.score), fontSize: 14 }}>{n.score}{n.grade && <span style={{ fontSize: 11, marginLeft: 4 }}>({n.grade})</span>}</span>
                      : <span style={{ fontSize: 11, color: "var(--muted)" }}>미분석</span>}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[n.status] || "badge-muted"}`}>{n.status}</span></td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{n.date}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleAnalyze(c.id)}
                        disabled={analyzingIds.has(c.id)}
                        title="AI 분석 실행"
                        style={{ background: "rgba(188,140,255,0.15)", color: "var(--purple)", border: "1px solid rgba(188,140,255,0.3)", padding: "5px 8px" }}>
                        {analyzingIds.has(c.id) ? "⏳" : "🤖"}
                      </button>
                      <Link href={`/dashboard/candidates/${c.id}`} className="btn btn-secondary btn-sm">✏️</Link>
                      <button className="btn btn-sm" onClick={() => handleDelete(c.id)}
                        style={{ background: "rgba(248,81,73,0.1)", color: "var(--red)", border: "1px solid rgba(248,81,73,0.3)", padding: "5px 8px" }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="toast-wrap">
          <div className="toast">{toast}</div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="spinner" style={{ margin: 0 }} />
        </div>
      )}
    </div>
  );
}
