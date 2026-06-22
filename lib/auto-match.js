/**
 * 자동 매칭 오케스트레이터.
 * "지금부터(startAtMs 이후) 올라온" 공고/구직자만 처리. 과거는 건드리지 않음.
 * 공고: 이메일없음→스킵(보존) / 불완전+이메일→보완안내 / 완전→매칭발송
 * 구직자: 불완전+이메일→보완안내 / 그 외→플래그만
 * 처리된 문서엔 autoMatch 플래그를 남겨 중복발송을 막는다.
 *
 * 부수효과(DB쓰기·메일발송)는 모두 dryRun=true 면 건너뛰고 미리보기만 수집.
 * firebase/openai 를 직접 import 하지 않고 주입받아 테스트 가능하게 유지.
 */
import {
  dedupe, candMissing, jobMissing, jobEmail, candEmail, candName,
  candTracks, candLoc, matchJob,
} from "./matching.js";

function enrich(c, m) {
  const p = c.profile || {}, l = c.language || {}, ca = c.career || {};
  return {
    name: m.name || p.name || "(이름없음)",
    score: m.score, reason: m.reason,
    nationality: p.nationality || "-",
    korean: l.korean || l.koreanLevel || "-",
    experience: ca.experienceYears != null ? `${ca.experienceYears}년` : "-",
    jobTracks: candTracks(c).join(", ") || "-",
    email: candEmail(c), phone: (p.phone || p.contactPhone || p.mobile || ""),
  };
}

export async function runAutoMatch(deps, opts = {}) {
  const { db, openai, send, serverTimestamp } = deps;
  const { startAtMs = 0, threshold = 75, dryRun = true, jobLimit = 100 } = opts;
  const tpl = deps.templates; // { jobIncompleteEmail, candidateIncompleteEmail, matchResultEmail }

  const summary = {
    dryRun, threshold, startAt: new Date(startAtMs).toISOString(),
    jobs: { matched: 0, matchedZero: 0, nudged: 0, skippedNoEmail: 0 },
    candidates: { nudged: 0, ok: 0, skippedNoEmail: 0 },
    preview: [],
  };

  const maybeSend = async (kind, to, subject, html, note) => {
    if (dryRun) { summary.preview.push({ kind, to, subject, note }); return; }
    if (to) await send(to, subject, html);
  };
  const mark = async (ref, action, extra) => {
    if (dryRun) return;
    await ref.update({ autoMatch: { action, ...extra, at: serverTimestamp() } });
  };

  // ── 구직자 로드 → 중복제거 → 완전 풀(매칭 대상) ──
  const candSnap = await db.collection("candidates").get();
  const rawCands = candSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const completePool = dedupe(rawCands).filter((c) => candMissing(c).length === 0);
  const candById = new Map(completePool.map((c) => [c.id, c]));

  // ── 새 공고 처리 ──
  const jobSnap = await db.collection("Jobs").orderBy("createdAt", "desc").limit(jobLimit).get();
  for (const d of jobSnap.docs) {
    const job = { id: d.id, ...d.data() };
    const createdMs = d.get("createdAt")?.toMillis?.() ?? 0;
    if (createdMs <= startAtMs || job.autoMatch) continue; // 과거 or 이미처리

    const miss = jobMissing(job);
    if (miss.includes("이메일")) {
      await mark(d.ref, "skipped_no_email", { miss });
      summary.jobs.skippedNoEmail++;
      continue;
    }
    if (miss.length) {
      const { subject, html } = tpl.jobIncompleteEmail(job, miss);
      await maybeSend("job-nudge", jobEmail(job), subject, html, `누락:${miss.join(",")}`);
      await mark(d.ref, "nudged", { miss });
      summary.jobs.nudged++;
      continue;
    }
    // 완전 → 매칭
    const matches = await matchJob(openai, job, completePool, { threshold });
    if (matches.length === 0) {
      await mark(d.ref, "matched", { count: 0 });
      summary.jobs.matchedZero++;
      continue;
    }
    const enriched = matches.map((m) => enrich(candById.get(m.candidateId) || {}, m));
    const { subject, html } = tpl.matchResultEmail(job, job.companyName, enriched);
    await maybeSend("match", jobEmail(job), subject, html, `${matches.length}명 (${matches.map((m) => `${m.name} ${m.score}`).join(", ")})`);
    if (!dryRun) {
      await db.collection("matchSends").add({
        jobId: job.id, jobTitle: job.title || "", companyName: job.companyName || "",
        companyEmail: jobEmail(job), candidateIds: matches.map((m) => m.candidateId),
        candidateCount: matches.length, source: "auto", sentAt: serverTimestamp(), status: "sent",
      });
    }
    await mark(d.ref, "matched", { count: matches.length, sentTo: jobEmail(job) });
    summary.jobs.matched++;
  }

  // ── 새 구직자 처리 (보완안내) ──
  for (const d of candSnap.docs) {
    const c = { id: d.id, ...d.data() };
    const createdMs = d.get("createdAt")?.toMillis?.() ?? 0;
    if (createdMs <= startAtMs || c.autoMatch) continue;

    const miss = candMissing(c);
    if (miss.length === 0) { await mark(d.ref, "ok", {}); summary.candidates.ok++; continue; }
    if (!candEmail(c)) { await mark(d.ref, "skipped_no_email", { miss }); summary.candidates.skippedNoEmail++; continue; }
    const { subject, html } = tpl.candidateIncompleteEmail(c, miss);
    await maybeSend("cand-nudge", candEmail(c), subject, html, `${candName(c)} 누락:${miss.join(",")}`);
    await mark(d.ref, "nudged", { miss });
    summary.candidates.nudged++;
  }

  return summary;
}
