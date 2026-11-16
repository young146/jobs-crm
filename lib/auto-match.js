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
  candTracks, candLoc, matchJob, recommendAllowed,
} from "./matching.js";

function enrich(c, m) {
  const p = c.profile || {}, l = c.language || {}, ca = c.career || {};
  return {
    // 🔗 프로필 주소(vnkorlife.com/jobs/<id>)와 📞 적어 주신 연락처를 메일 틀에 넘긴다.
    //    2026-11-15 대표님 「연락처 아끼지 말어. 전화나 SNS 는 공개하라고 했는데」 —
    //    11/14 에 넣었던 동의 조건(consent)을 뺐다. 구직 글 화면에서 회사가 보는 것과 같은 것들이다.
    id: c.id || "",
    name: m.name || p.name || "(이름없음)",
    score: m.score, reason: m.reason,
    nationality: p.nationality || "-",
    korean: l.korean || l.koreanLevel || "-",
    experience: ca.experienceYears != null ? `${ca.experienceYears}년` : "-",
    jobTracks: candTracks(c).join(", ") || "-",
    email: candEmail(c), phone: (p.phone || p.contactPhone || p.mobile || ""),
    zalo: p.zalo || c.zalo || "", kakaoId: p.kakaoId || c.kakaoId || "",
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
    refused: 0, // 🙅 거절하신 주소라 메일을 건너뛴 수
    preview: [],
  };

  // 🙅 답장으로 「보내지 마세요」 하신 주소 (2026-11-16, lib/mail-optout.js) — 메일만 건너뛴다.
  //    추천 기록(matchSends)은 그대로 남긴다: 회사는 메일을 거절했어도 「추천받은 인재」 화면에서는 볼 수 있어야 한다.
  const isRefused = deps.isRefused || (() => false);
  /** @returns "sent" | "refused" | "preview" | "no-email" */
  const maybeSend = async (kind, to, subject, html, meta = {}) => {
    if (to && isRefused(to)) {
      summary.refused++;
      if (dryRun) summary.preview.push({ kind, to, subject, note: `🙅 거절하신 주소 — 보내지 않음 (${meta.note || ""})` });
      return "refused";
    }
    if (dryRun) { summary.preview.push({ kind, to, subject, note: meta.note }); return "preview"; }
    if (!to) return "no-email";
    await send(to, subject, html);
    if (deps.logEmail) await deps.logEmail({ type: kind, to, subject, refType: meta.refType, refId: meta.refId, name: meta.name || "" });
    return "sent";
  };
  const mark = async (ref, action, extra) => {
    if (dryRun) return;
    await ref.update({ autoMatch: { action, ...extra, at: serverTimestamp() } });
  };

  // ── 구직자 로드 → 중복제거 → 완전 풀(매칭 대상) ──
  const candSnap = await db.collection("candidates").get();
  const rawCands = candSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const completePool = dedupe(rawCands).filter((c) => candMissing(c).length === 0 && recommendAllowed(c));
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
      await maybeSend("job-nudge", jobEmail(job), subject, html, { refType: "job", refId: job.id, name: job.companyName, note: `누락:${miss.join(",")}` });
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
    const mailed = await maybeSend("match", jobEmail(job), subject, html, { refType: "job", refId: job.id, name: job.companyName, note: `${matches.length}명 (${matches.map((m) => `${m.name} ${m.score}`).join(", ")})` });
    if (!dryRun) {
      await db.collection("matchSends").add({
        jobId: job.id, jobTitle: job.title || "", companyName: job.companyName || "",
        companyEmail: jobEmail(job), candidateIds: matches.map((m) => m.candidateId),
        candidateCount: matches.length, source: "auto", sentAt: serverTimestamp(),
        // 거절하신 주소면 메일은 안 나갔다 — 화면(/jobs/recommended)에는 그대로 보인다
        status: mailed === "refused" ? "screen-only" : "sent",
        // ── 아래 둘은 회사 화면(/jobs/recommended)을 위해 2026-11-15 더했다 ──
        // ① 공고 글쓴이 — 규칙이 이것만 보고 읽기를 허락한다(없으면 Jobs 를 한 번 더 읽어야 해서 비싸다)
        ownerId: job.userId || "",
        // ② 점수·이유 — 지금껏 **메일에만** 들어가고 저장되지 않아 회사가 다시 볼 수 없었다.
        //    이름도 함께 둔다(구직 글이 지워져도 「누구를 추천했는지」는 남아야 한다 — 지원서 스냅샷과 같은 까닭)
        picks: matches.map((m) => ({
          candidateId: m.candidateId, name: m.name || "", score: m.score ?? 0, reason: m.reason || "",
        })),
      });
    }
    await mark(d.ref, "matched", { count: matches.length, sentTo: mailed === "refused" ? "" : jobEmail(job), ...(mailed === "refused" ? { mailSkipped: "refused" } : {}) });
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
    await maybeSend("cand-nudge", candEmail(c), subject, html, { refType: "candidate", refId: c.id, name: candName(c), note: `누락:${miss.join(",")}` });
    await mark(d.ref, "nudged", { miss });
    summary.candidates.nudged++;
  }

  return summary;
}
