/**
 * 자동발송 이메일 템플릿 — 보완요청(공고/구직자) + 매칭결과.
 * 반환: { subject, html }
 */

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function shell(title, bodyHtml) {
  return `<!DOCTYPE html><html lang="ko"><body style="margin:0;background:#f6f7f9;font-family:-apple-system,'Malgun Gothic',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
      <div style="background:#0f172a;color:#fff;padding:20px 24px">
        <div style="font-size:18px;font-weight:700">씬짜오 채용</div>
        <div style="font-size:13px;color:#cbd5e1;margin-top:2px">${esc(title)}</div>
      </div>
      <div style="padding:20px 24px">${bodyHtml}</div>
      <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #eee;font-size:11px;color:#94a3b8">
        24년 베트남 한인사회와 함께한 씬짜오베트남 · 본 안내는 무료입니다.
      </div>
    </div>
  </div></body></html>`;
}

const FIELD_LABEL = { 이름: "이름", 희망직종: "희망 직종", 희망지역: "희망 근무지역", 경력: "경력(연수)", 연락처: "연락처", 회사명: "회사명", 제목: "공고 제목", 지역: "근무 지역", 직무: "직무(직종)", 이메일: "담당자 이메일", 업무내용: "업무 내용/요건" };

function missingList(missing) {
  return `<ul style="margin:8px 0 0;padding-left:18px;color:#b91c1c;font-size:14px">${missing.map((m) => `<li>${esc(FIELD_LABEL[m] || m)}</li>`).join("")}</ul>`;
}

// 공고 보완요청 (기업 담당자에게)
export function jobIncompleteEmail(job, missing) {
  const subject = `[씬짜오 채용] 공고를 완성하시면 맞춤 인재를 자동으로 보내드립니다`;
  const html = shell("공고 정보 보완 안내", `
    <div style="font-size:14px;color:#333;line-height:1.6">
      <strong>${esc(job.companyName || "고객")}</strong> 님, 등록해 주신 공고
      <strong>「${esc(job.title || "채용공고")}」</strong> 감사합니다.<br/><br/>
      씬짜오는 등록된 공고에 맞는 인재를 <strong>AI가 자동으로 분석해 추천</strong>해 드립니다.
      다만 아래 항목이 비어 있어 현재 자동 추천에서 제외되고 있습니다:
    </div>
    ${missingList(missing)}
    <div style="font-size:14px;color:#333;line-height:1.6;margin-top:14px">
      앱 또는 <a href="https://vnkorlife.com" style="color:#2563eb">vnkorlife.com</a> 에서
      위 항목을 채워 다시 등록해 주시면, <strong>적합한 인재가 올라오는 즉시 자동으로 메일을 보내드립니다.</strong>
    </div>`);
  return { subject, html };
}

// 구직자 프로필 보완요청 (구직자에게)
export function candidateIncompleteEmail(cand, missing) {
  const name = (cand.profile || {}).name || "구직자";
  const subject = `[씬짜오 채용] 프로필을 완성하면 맞춤 채용공고에 자동 추천됩니다`;
  const html = shell("프로필 보완 안내", `
    <div style="font-size:14px;color:#333;line-height:1.6">
      <strong>${esc(name)}</strong> 님, 씬짜오 인재 등록 감사합니다.<br/><br/>
      씬짜오는 등록 인재를 채용공고에 <strong>AI가 자동으로 매칭</strong>해 기업에 추천합니다.
      다만 아래 항목이 비어 있어 현재 추천 대상에서 제외되고 있습니다:
    </div>
    ${missingList(missing)}
    <div style="font-size:14px;color:#333;line-height:1.6;margin-top:14px">
      앱 또는 <a href="https://vnkorlife.com" style="color:#2563eb">vnkorlife.com</a> 에서
      프로필을 완성해 주시면, <strong>맞는 공고에 자동으로 추천</strong>되어 더 많은 기회를 받으실 수 있습니다.
    </div>`);
  return { subject, html };
}

// 매칭 결과 (기업 담당자에게) — enriched: [{name,score,reason,nationality,korean,experience,jobTracks,email,phone}]
export function matchResultEmail(job, companyName, enriched) {
  const subject = `[씬짜오 채용 매칭] ${job.title || "채용공고"} — 추천 인재 ${enriched.length}명`;
  const rows = enriched.map((c, i) => `
    <tr><td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top">
      <div style="font-weight:700;font-size:15px;color:#111">${i + 1}. ${esc(c.name)}
        <span style="background:#fff1e9;color:#d9480f;font-size:12px;padding:2px 8px;border-radius:10px">${esc(c.score)}% 적합</span></div>
      <div style="font-size:13px;color:#555;margin:4px 0">${esc(c.reason || "")}</div>
      <div style="font-size:12px;color:#777">국적 ${esc(c.nationality)} · 한국어 ${esc(c.korean)} · 경력 ${esc(c.experience)} · 직무 ${esc(c.jobTracks)}</div>
      <div style="font-size:13px;color:#111;margin-top:6px">📞 ${esc(c.phone) || "연락처 미등록"}${c.email ? ` · ✉️ ${esc(c.email)}` : ""}</div>
    </td></tr>`).join("");
  const html = shell(`${companyName || job.companyName || ""} 님께 추천드리는 인재`, `
    <div style="font-size:14px;color:#333;margin-bottom:6px">
      <strong>${esc(job.title || "")}</strong> (${esc(job.industryTrack || job.industry || "-")} · ${esc(job.city || "-")}) 공고에 맞춰
      AI가 분석한 추천 인재 <strong>${enriched.length}명</strong>입니다.</div>
    <div style="font-size:12px;color:#888;margin-bottom:14px">관심 있는 인재에게 바로 연락하시거나, 본 메일에 회신 주시면 도와드리겠습니다.</div>
    <table style="width:100%;border-collapse:collapse">${rows}</table>`);
  return { subject, html };
}
