"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CITIES = ["전체", "호치민", "하노이", "다낭", "냐짱", "붕따우", "빈증", "동나이", "기타"];
const STATUSES_FILTER = ["전체", "모집중", "일시중지", "마감", "마감임박"];
const STATUSES_BULK   = ["모집중", "일시중지", "마감"];
const STATUS_BADGE    = { "모집중": "badge-green", "일시중지": "badge-yellow", "마감": "badge-muted", "마감임박": "badge-accent" };

export default function JobsClient({ jobs }) {
  const router = useRouter();
  const [filterCity,   setFilterCity]   = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");
  const [search,       setSearch]       = useState("");
  const [selected,     setSelected]     = useState(new Set());
  const [bulkStatus,   setBulkStatus]   = useState("");
  const [loading,      setLoading]      = useState(false);
  const [toast,        setToast]        = useState("");

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (filterCity   !== "전체" && j.city !== filterCity) return false;
      if (filterStatus !== "전체" && j.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (![j.title, j.companyName, j.industry, j.city].some(v => v?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [jobs, filterCity, filterStatus, search]);

  const allChecked = filtered.length > 0 && filtered.every(j => selected.has(j.id));

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map(j => j.id)));
  }
  function toggleOne(id) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleDelete(id) {
    if (!confirm("이 채용공고를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if ((await res.json()).ok) { showToast("🗑️ 삭제됨"); router.refresh(); }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 공고를 삭제하시겠습니까?`)) return;
    setLoading(true);
    const res = await fetch("/api/jobs/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: [...selected] }),
    });
    const data = await res.json();
    showToast(`🗑️ ${data.success}개 삭제 완료`);
    setSelected(new Set()); setLoading(false); router.refresh();
  }

  async function handleBulkStatus() {
    if (selected.size === 0 || !bulkStatus) return;
    setLoading(true);
    const res = await fetch("/api/jobs/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", ids: [...selected], value: bulkStatus }),
    });
    const data = await res.json();
    showToast(`✅ ${data.success}개 상태 변경 완료`);
    setSelected(new Set()); setLoading(false); router.refresh();
  }

  return (
    <div className="page">
      {/* ── 필터 바 ── */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>🔍 필터</span>
          <input className="table-search" placeholder="공고명/회사/업종 검색..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
          <select className="filter-select" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUSES_FILTER.map(s => <option key={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
            {filtered.length}/{jobs.length}건 표시
          </span>
          {(filterCity !== "전체" || filterStatus !== "전체" || search) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterCity("전체"); setFilterStatus("전체"); setSearch(""); }}>✕ 초기화</button>
          )}
        </div>
      </div>

      {/* ── 일괄처리 바 ── */}
      {selected.size > 0 && (
        <div style={{ background: "rgba(255,107,53,0.1)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>☑ {selected.size}개 선택됨</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="filter-select" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">상태 변경...</option>
              {STATUSES_BULK.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={handleBulkStatus} disabled={!bulkStatus || loading}>✅ 일괄 변경</button>
          </div>
          <button className="btn btn-sm" onClick={handleBulkDelete} disabled={loading}
            style={{ background: "rgba(248,81,73,0.15)", color: "var(--red)", border: "1px solid rgba(248,81,73,0.3)" }}>
            🗑️ 일괄 삭제
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>취소</button>
        </div>
      )}

      {/* ── 테이블 ── */}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">채용공고 목록</span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            모집중: {jobs.filter(j => j.status === "모집중").length}개
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ cursor: "pointer", accentColor: "var(--accent)", width: 15, height: 15 }} />
              </th>
              <th>공고명</th>
              <th>회사</th>
              <th>업종</th>
              <th>도시</th>
              <th>고용형태</th>
              <th>급여(USD/월)</th>
              <th>상태</th>
              <th>등록일</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="empty-state">조건에 맞는 채용공고가 없습니다</td></tr>
            ) : filtered.map(j => {
              const norm = j.normalized || {};
              const salMin = norm.salaryMinUsdPerMonth ?? j.salaryMinUsdPerMonth;
              const salMax = norm.salaryMaxUsdPerMonth ?? j.salaryMaxUsdPerMonth;
              const salary = (salMin || salMax) ? `$${salMin||"?"}~${salMax||"?"}` : (j.salary || "-");
              const date = j.createdAt ? new Date(j.createdAt).toLocaleDateString("ko-KR") : "-";
              const status = j.status || "모집중";

              return (
                <tr key={j.id} style={{ background: selected.has(j.id) ? "rgba(255,107,53,0.05)" : undefined }}>
                  <td>
                    <input type="checkbox" checked={selected.has(j.id)} onChange={() => toggleOne(j.id)} style={{ cursor: "pointer", accentColor: "var(--accent)", width: 15, height: 15 }} />
                  </td>
                  <td>
                    <Link href={`/dashboard/jobs/${j.id}`} style={{ color: "var(--text)", fontWeight: 600 }}>
                      {j.title || "(제목없음)"}
                    </Link>
                  </td>
                  <td style={{ fontSize: 12 }}>{norm.companyName || j.companyName || "-"}</td>
                  <td><span className="badge badge-muted" style={{ fontSize: 11 }}>{j.industry || j.industryTrack || "-"}</span></td>
                  <td style={{ fontSize: 12, color: "var(--blue)" }}>{j.city || "-"}</td>
                  <td style={{ fontSize: 12 }}>{j.employmentType || "-"}</td>
                  <td style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>{salary}</td>
                  <td><span className={`badge ${STATUS_BADGE[status] || "badge-muted"}`}>{status}</span></td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{date}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/dashboard/jobs/${j.id}`} className="btn btn-secondary btn-sm">✏️</Link>
                      <button className="btn btn-sm" onClick={() => handleDelete(j.id)}
                        style={{ background: "rgba(248,81,73,0.1)", color: "var(--red)", border: "1px solid rgba(248,81,73,0.3)" }}>
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

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="spinner" style={{ margin: 0 }} />
        </div>
      )}
    </div>
  );
}
