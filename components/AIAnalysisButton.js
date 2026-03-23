"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AIAnalysisButton({ candidateId, hasScore }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  async function runAnalysis() {
    setLoading(true);
    setMsg("");
    setIsError(false);
    try {
      const res = await fetch(`/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg(`✅ AI 분석 완료! 점수: ${data.score}점 (${data.grade}등급) — 새로고침 중...`);
        setTimeout(() => router.refresh(), 1500);
      } else {
        setIsError(true);
        setMsg(`❌ 오류: ${data.error}`);
      }
    } catch (e) {
      setIsError(true);
      setMsg(`❌ 네트워크 오류: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        className="btn btn-primary"
        onClick={runAnalysis}
        disabled={loading}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {loading ? "⏳ AI 분석 중... (10~20초)" : hasScore ? "🔄 AI 재분석" : "🤖 AI 분석 실행"}
      </button>
      {loading && (
        <div style={{ marginTop: 10, textAlign: "center" }}>
          <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2, margin: "8px auto" }} />
          <div style={{ fontSize: 11, color: "var(--muted)" }}>GPT-4o가 이력서를 분석하고 있습니다...</div>
        </div>
      )}
      {msg && (
        <div style={{
          marginTop: 10, fontSize: 12, padding: "10px 12px", borderRadius: 8,
          background: isError ? "rgba(248,81,73,0.1)" : "rgba(63,185,80,0.1)",
          border: `1px solid ${isError ? "var(--red)" : "var(--green)"}`,
          color: isError ? "var(--red)" : "var(--green)",
        }}>
          {msg}
        </div>
      )}
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>
        GPT-4o 분석 → Firebase 저장 → Notion 자동 동기화
      </p>
    </div>
  );
}
