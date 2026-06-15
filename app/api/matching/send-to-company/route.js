import admin from "firebase-admin";
import { getDb } from "@/lib/firebase-admin";
import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/matching/send-to-company
// body: { jobId, companyEmail, companyName, matches: [{candidateId, name, score, reason}] }
// AI 매칭 결과를 기업 담당자 이메일로 전송. 연락처 포함(직접 연결). 발송이력 기록.
export async function POST(request) {
  try {
    const { jobId, companyEmail, companyName, matches } = await request.json();

    if (!jobId) return NextResponse.json({ ok: false, error: "jobId 누락" }, { status: 400 });
    if (!companyEmail || !/.+@.+\..+/.test(companyEmail))
      return NextResponse.json({ ok: false, error: "유효한 기업 이메일이 필요합니다." }, { status: 400 });
    if (!Array.isArray(matches) || matches.length === 0)
      return NextResponse.json({ ok: false, error: "보낼 인재가 없습니다." }, { status: 400 });

    const db = getDb();
    const jobDoc = await db.collection("Jobs").doc(jobId).get();
    if (!jobDoc.exists) return NextResponse.json({ ok: false, error: "채용공고 없음" }, { status: 404 });
    const job = jobDoc.data();

    // 후보 연락처·프로필을 Firestore에서 보강 (매칭 결과엔 연락처가 없음)
    const ids = matches.map((m) => m.candidateId).filter(Boolean).slice(0, 10);
    const candDocs = await Promise.all(ids.map((id) => db.collection("candidates").doc(id).get()));
    const candById = {};
    candDocs.forEach((d) => { if (d.exists) candById[d.id] = d.data(); });

    const enriched = matches.map((m) => {
      const c = candById[m.candidateId] || {};
      const p = c.profile || {}, lang = c.language || {}, career = c.career || {};
      return {
        name: m.name || p.name || "(이름없음)",
        score: m.score,
        reason: m.reason,
        nationality: p.nationality || "-",
        korean: lang.korean || lang.koreanLevel || "-",
        experience: career.experienceYears != null ? `${career.experienceYears}년` : "-",
        jobTracks: (career.jobTracks || career.desiredJobTracks || []).join(", ") || "-",
        email: p.email || p.contactEmail || "",
        phone: p.phone || p.contactPhone || p.mobile || "",
      };
    });

    const html = buildReport(job, companyName, enriched);
    const subject = `[씬짜오 채용 매칭] ${job.title || "채용공고"} — 추천 인재 ${enriched.length}명`;

    await sendEmail({ to: companyEmail, subject, html });

    // 발송 이력 (나중에 활성화/수익화 측정 기반)
    await db.collection("matchSends").add({
      jobId,
      jobTitle: job.title || "",
      companyName: companyName || job.companyName || "",
      companyEmail,
      candidateIds: ids,
      candidateCount: enriched.length,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "sent",
    });

    return NextResponse.json({ ok: true, sentTo: companyEmail, count: enriched.length });
  } catch (err) {
    console.error("send-to-company error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function buildReport(job, companyName, cands) {
  const rows = cands.map((c, i) => `
    <tr><td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top">
      <div style="font-weight:700;font-size:15px;color:#111">${i + 1}. ${esc(c.name)}
        <span style="background:#fff1e9;color:#d9480f;font-size:12px;padding:2px 8px;border-radius:10px">${esc(c.score)}% 적합</span></div>
      <div style="font-size:13px;color:#555;margin:4px 0">${esc(c.reason || "")}</div>
      <div style="font-size:12px;color:#777">국적 ${esc(c.nationality)} · 한국어 ${esc(c.korean)} · 경력 ${esc(c.experience)} · 직무 ${esc(c.jobTracks)}</div>
      <div style="font-size:13px;color:#111;margin-top:6px">📞 ${esc(c.phone) || "연락처 미등록"}${c.email ? ` · ✉️ ${esc(c.email)}` : ""}</div>
    </td></tr>`).join("");

  return `<!DOCTYPE html><html lang="ko"><body style="margin:0;background:#f6f7f9;font-family:-apple-system,'Malgun Gothic',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
      <div style="background:#0f172a;color:#fff;padding:20px 24px">
        <div style="font-size:18px;font-weight:700">씬짜오 채용 매칭</div>
        <div style="font-size:13px;color:#cbd5e1;margin-top:2px">${esc(companyName || job.companyName || "")} 님께 추천드리는 인재</div>
      </div>
      <div style="padding:20px 24px">
        <div style="font-size:14px;color:#333;margin-bottom:6px">
          <strong>${esc(job.title || "")}</strong> (${esc(job.industry || "-")} · ${esc(job.city || "-")}) 공고에 맞춰
          AI가 분석한 추천 인재 <strong>${cands.length}명</strong>입니다.</div>
        <div style="font-size:12px;color:#888;margin-bottom:14px">관심 있는 인재에게 바로 연락하시거나, 본 메일에 회신 주시면 도와드리겠습니다.</div>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
      <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #eee;font-size:11px;color:#94a3b8">
        24년 베트남 한인사회와 함께한 씬짜오베트남 · 본 추천은 무료입니다.
      </div>
    </div>
  </div></body></html>`;
}
