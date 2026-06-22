"use client";
import { useState, useEffect, useMemo } from "react";

const STAGES = [
  { key: "신규 문의",  color: "var(--muted)",  icon: "📩" },
  { key: "미팅 예정",  color: "var(--blue)",   icon: "📅" },
  { key: "견적 발송",  color: "var(--yellow)", icon: "📋" },
  { key: "계약 완료",  color: "var(--accent)",  icon: "🤝" },
  { key: "채용 진행",  color: "var(--purple)", icon: "⚙️" },
  { key: "완료",       color: "var(--green)",  icon: "✅" },
];

const INDUSTRIES = ["제조업", "건설업", "서비스업", "IT", "요식업", "물류", "농업", "기타"];

const EMPTY_FORM = {
  companyName: "", contactName: "", contactPhone: "", contactEmail: "",
  industry: "", city: "", headcount: "", notes: "", stage: "신규 문의",
};

export default function ClientsPage() {
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [editId, setEditId]     = useState(null);
  const [dragId, setDragId]     = useState(null);
  const [view, setView]         = useState("kanban"); // kanban | list

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function loadClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e) { showToast("❌ 로딩 실패: " + e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadClients(); }, []);

  async function handleSave() {
    if (!form.companyName) return showToast("❌ 회사명 필수");
    setSaving(true);
    try {
      if (editId) {
        await fetch(`/api/clients/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        showToast("✅ 수정 완료");
      } else {
        await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        showToast("✅ 고객사 추가 완료");
      }
      setShowAdd(false); setEditId(null); setForm(EMPTY_FORM);
      loadClients();
    } catch (e) { showToast("❌ " + e.message); }
    finally { setSaving(false); }
  }

  async function importFromJobs() {
    if (!confirm("등록된 공고의 기업들을 영업 파이프라인으로 가져옵니다. (이미 있는 회사는 건너뜀)")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clients/import-from-jobs", { method: "POST" });
      const data = await res.json();
      if (data.ok) showToast(`✅ ${data.created}개 기업 가져옴 (기존 ${data.skippedExisting}개 제외)`);
      else showToast("❌ " + data.error);
      loadClients();
    } catch (e) { showToast("❌ " + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("이 고객사를 삭제하시겠습니까?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    showToast("🗑️ 삭제됨");
    loadClients();
  }

  async function moveStage(id, newStage) {
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setClients(prev => prev.map(c => c.id === id ? { ...c, stage: newStage } : c));
  }

  function openEdit(client) {
    setForm({ ...EMPTY_FORM, ...client });
    setEditId(client.id);
    setShowAdd(true);
  }

  // 칸반 열별 그룹
  const byStage = useMemo(() => {
    const map = {};
    STAGES.forEach(s => map[s.key] = []);
    clients.forEach(c => {
      const stage = c.stage || "신규 문의";
      if (map[stage]) map[stage].push(c);
      else map["신규 문의"].push(c);
    });
    return map;
  }, [clients]);

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">🏢 기업 고객 파이프라인</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="topbar-badge">{clients.length}개 고객사</span>
          <button className={`btn btn-secondary btn-sm ${view === "kanban" ? "active" : ""}`} onClick={() => setView("kanban")}>칸반</button>
          <button className={`btn btn-secondary btn-sm ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>리스트</button>
          <button className="btn btn-secondary btn-sm" disabled={saving} onClick={importFromJobs}>
            📥 공고 기업 가져오기
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAdd(true); setEditId(null); setForm(EMPTY_FORM); }}>
            + 고객사 추가
          </button>
        </div>
      </div>

      <div className="page" style={{ overflowX: view === "kanban" ? "auto" : undefined }}>
        {/* 요약 통계 */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {STAGES.map(s => (
            <div key={s.key} style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
              padding: "10px 16px", minWidth: 110, textAlign: "center",
              borderTop: `3px solid ${s.color}`,
            }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{byStage[s.key]?.length || 0}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.key}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
        ) : view === "kanban" ? (
          /* ── 칸반 뷰 ── */
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", minWidth: 900 }}>
            {STAGES.map(stage => (
              <div key={stage.key} style={{ flex: "0 0 220px" }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { if (dragId) { moveStage(dragId, stage.key); setDragId(null); } }}>
                <div style={{
                  background: "var(--surface)", borderRadius: "var(--radius)",
                  border: "1px solid var(--border)", borderTop: `3px solid ${stage.color}`,
                  minHeight: 200,
                }}>
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{stage.icon} {stage.key}</span>
                    <span style={{ fontSize: 12, color: stage.color, fontWeight: 700 }}>{byStage[stage.key]?.length}</span>
                  </div>
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    {byStage[stage.key]?.map(c => (
                      <div key={c.id} draggable
                        onDragStart={() => setDragId(c.id)}
                        style={{
                          background: "var(--surface2)", borderRadius: 8, padding: "10px 12px",
                          border: "1px solid var(--border)", cursor: "grab",
                        }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{c.companyName}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                          👤 {c.contactName || "-"} · 📱 {c.contactPhone || "-"}
                        </div>
                        {c.industry && <span className="badge badge-muted" style={{ fontSize: 10 }}>{c.industry}</span>}
                        {c.headcount && <span className="badge badge-blue" style={{ fontSize: 10, marginLeft: 4 }}>채용 {c.headcount}명</span>}
                        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                          <select value={c.stage || "신규 문의"}
                            onChange={e => moveStage(c.id, e.target.value)}
                            style={{ fontSize: 10, background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 4px", flex: 1 }}>
                            {STAGES.map(s => <option key={s.key}>{s.key}</option>)}
                          </select>
                          <button style={{ fontSize: 11, padding: "2px 6px", background: "none", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", cursor: "pointer" }} onClick={() => openEdit(c)}>✏️</button>
                          <button style={{ fontSize: 11, padding: "2px 6px", background: "none", border: "1px solid rgba(248,81,73,0.3)", borderRadius: 4, color: "var(--red)", cursor: "pointer" }} onClick={() => handleDelete(c.id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── 리스트 뷰 ── */
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>회사명</th><th>담당자</th><th>연락처</th><th>업종</th><th>도시</th><th>채용 인원</th><th>단계</th><th>메모</th><th>작업</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr><td colSpan={9} className="empty-state">등록된 고객사가 없습니다.<br/>+ 고객사 추가 버튼으로 시작하세요.</td></tr>
                ) : clients.map(c => {
                  const stage = STAGES.find(s => s.key === c.stage) || STAGES[0];
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700 }}>{c.companyName}</td>
                      <td>{c.contactName || "-"}</td>
                      <td style={{ fontSize: 12 }}>{c.contactPhone || "-"}</td>
                      <td><span className="badge badge-muted" style={{ fontSize: 11 }}>{c.industry || "-"}</span></td>
                      <td style={{ fontSize: 12, color: "var(--blue)" }}>{c.city || "-"}</td>
                      <td style={{ textAlign: "center" }}>{c.headcount ? `${c.headcount}명` : "-"}</td>
                      <td>
                        <select value={c.stage || "신규 문의"} onChange={e => moveStage(c.id, e.target.value)}
                          style={{ fontSize: 11, background: "var(--surface2)", color: stage.color, border: `1px solid ${stage.color}`, borderRadius: 6, padding: "3px 6px", fontWeight: 700 }}>
                          {STAGES.map(s => <option key={s.key}>{s.key}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes || "-"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>✏️</button>
                          <button className="btn btn-sm" onClick={() => handleDelete(c.id)}
                            style={{ background: "rgba(248,81,73,0.1)", color: "var(--red)", border: "1px solid rgba(248,81,73,0.3)" }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 추가/수정 모달 ── */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", padding: 28, width: 460, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>
              {editId ? "✏️ 고객사 수정" : "🏢 신규 고객사 추가"}
            </div>
            {[
              { label: "회사명 *", key: "companyName", placeholder: "예: 씬짜오 베트남 제조" },
              { label: "담당자 이름", key: "contactName", placeholder: "예: 홍길동 법인장" },
              { label: "연락처", key: "contactPhone", placeholder: "+84 xxx" },
              { label: "이메일", key: "contactEmail", placeholder: "contact@company.com" },
              { label: "도시", key: "city", placeholder: "예: 호치민, 빈증" },
              { label: "채용 희망 인원", key: "headcount", placeholder: "예: 3" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5, fontWeight: 600 }}>{f.label}</div>
                <input className="filter-select" style={{ width: "100%", padding: "9px 12px", borderRadius: 8 }}
                  placeholder={f.placeholder}
                  value={form[f.key] || ""}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5, fontWeight: 600 }}>업종</div>
              <select className="filter-select" style={{ width: "100%" }} value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}>
                <option value="">선택...</option>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5, fontWeight: 600 }}>파이프라인 단계</div>
              <select className="filter-select" style={{ width: "100%" }} value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s.key}>{s.key}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5, fontWeight: 600 }}>메모</div>
              <textarea className="filter-select" style={{ width: "100%", borderRadius: 8, padding: "9px 12px", minHeight: 80, resize: "vertical" }}
                placeholder="특이사항, 요청 직종, 비자 조건 등..."
                value={form.notes || ""}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                {saving ? "저장 중..." : editId ? "수정 저장" : "추가"}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setEditId(null); setForm(EMPTY_FORM); }}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </>
  );
}
