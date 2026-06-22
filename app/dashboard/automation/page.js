"use client";
import { useEffect, useState, useCallback } from "react";

const TYPE_LABEL = { match: "매칭발송", "job-nudge": "공고 보완안내", "cand-nudge": "구직자 보완안내" };
const RESP = ["대기", "응답옴", "처리완료"];

export default function AutomationPage() {
  const [cfg, setCfg] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [thr, setThr] = useState(75);

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([
      fetch("/api/automation/config").then((r) => r.json()),
      fetch("/api/automation/log").then((r) => r.json()),
    ]);
    setCfg(c.config);
    if (c.config?.threshold) setThr(c.config.threshold);
    setRows(l.rows || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(action, extra = {}) {
    if (action === "enable_live" && !confirm("실가동을 켜면 지금 이후 등록되는 공고/구직자에게 실제 이메일이 자동 발송됩니다. 진행할까요?")) return;
    setBusy(true);
    await fetch("/api/automation/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    await load();
    setBusy(false);
  }
  async function setResp(id, responseStatus) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, responseStatus } : r)));
    await fetch("/api/automation/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, responseStatus }) });
  }

  const state = !cfg?.enabled ? { t: "⚪ 꺼짐", c: "var(--muted)" }
    : cfg.dryRun ? { t: "🟡 검증 모드 (발송 안 함)", c: "var(--yellow)" }
    : { t: "🟢 실가동 (자동 발송 중)", c: "var(--green)" };

  const stat = (f) => rows.filter(f).length;

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">⚙️ 자동화 관제</span>
        <span className="topbar-badge">신규 등록 → AI 매칭 자동 발송</span>
      </div>
      <div className="page">
        {loading ? <div style={{ padding: 40 }}>불러오는 중…</div> : (
          <>
            {/* 상태 + 제어 */}
            <div className="card">
              <div className="card-title">현재 상태</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: state.c, marginBottom: 6 }}>{state.t}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                임계점수 {cfg?.threshold ?? 75}점 · 시작시점 {cfg?.startAt ? new Date(cfg.startAt).toLocaleString("ko-KR") : "—"}
                {cfg?.startAt ? " 이후 등록분만 처리" : ""}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn btn-secondary" disabled={busy} onClick={() => act("enable_dry")}>🟡 검증 모드</button>
                <button className="btn btn-primary" disabled={busy} onClick={() => act("enable_live")}>🟢 실가동 ON</button>
                <button className="btn btn-secondary" disabled={busy} onClick={() => act("off")}>⚪ 끄기</button>
                <span style={{ marginLeft: 16, fontSize: 13, color: "var(--muted)" }}>임계점수</span>
                <input type="number" value={thr} min={0} max={100} onChange={(e) => setThr(e.target.value)}
                  style={{ width: 64, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }} />
                <button className="btn btn-secondary" disabled={busy} onClick={() => act("set_threshold", { threshold: thr })}>적용</button>
              </div>
            </div>

            {/* 통계 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, margin: "16px 0" }}>
              {[
                ["매칭 발송", stat((r) => r.type === "match"), "var(--accent)"],
                ["보완 안내", stat((r) => r.type !== "match"), "var(--blue)"],
                ["🔥 응답옴", stat((r) => r.responseStatus === "응답옴"), "var(--green)"],
                ["처리완료", stat((r) => r.responseStatus === "처리완료"), "var(--muted)"],
              ].map(([label, n, c]) => (
                <div className="card" key={label} style={{ textAlign: "center", margin: 0 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: c }}>{n}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* 발송 기록 */}
            <div className="card">
              <div className="card-title">발송 기록 (최근 {rows.length}건)</div>
              {rows.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
                  아직 발송 기록이 없습니다. (검증 모드에선 기록되지 않습니다 — 실가동 후 쌓입니다)
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 6px" }}>시각</th><th>유형</th><th>받는이</th><th>제목</th><th style={{ width: 120 }}>응답상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 6px", whiteSpace: "nowrap", color: "var(--muted)" }}>{r.sentAt ? new Date(r.sentAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{TYPE_LABEL[r.type] || r.type}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{r.name || "-"}<br /><span style={{ color: "var(--muted)", fontSize: 11 }}>{r.to}</span></td>
                          <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subject}</td>
                          <td>
                            <select value={r.responseStatus} onChange={(e) => setResp(r.id, e.target.value)}
                              style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: r.responseStatus === "응답옴" ? "rgba(63,185,80,0.15)" : "var(--surface2)", color: "var(--text)" }}>
                              {RESP.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
