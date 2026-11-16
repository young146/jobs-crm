/**
 * 🙅 거절 명부 자가 시험 — 가짜 자료로만 돈다(메일·DB·AI 호출 없음).
 * 실행: node scripts/optout-selftest.mjs
 * 보는 것: 거절하신 주소로는 send 가 불리지 않고, 다른 주소로는 그대로 불린다.
 */
import { runAutoMatch } from "../lib/auto-match.js";

const ts = (ms) => ({ toMillis: () => ms });
const now = Date.now();
const mkDoc = (id, data, updates) => ({ id, data: () => data, get: (f) => data[f], ref: { update: async (u) => updates.push({ id, u }) } });
const updates = [];
// 내용이 모자란 공고 둘(업무내용 없음) → 「보완 안내」 메일 대상. 하나는 거절하신 주소.
const jobs = [
  mkDoc("job_refused", { companyName: "거절한 회사", title: "영업", city: "호치민", jobTracks: ["영업"], contactEmail: "No-Thanks@Example.com", email: "No-Thanks@Example.com", createdAt: ts(now) }, updates),
  mkDoc("job_normal", { companyName: "보통 회사", title: "영업", city: "호치민", jobTracks: ["영업"], contactEmail: "hr@example.org", email: "hr@example.org", createdAt: ts(now) }, updates),
];
const cands = [];
const db = { collection: (n) => n === "Jobs"
  ? { orderBy: () => ({ limit: () => ({ get: async () => ({ docs: jobs }) }) }) }
  : n === "candidates" ? { get: async () => ({ docs: cands }) } : { add: async () => {} } };
const sent = [];
const refusedSet = new Set(["no-thanks@example.com"]);
const run = (dryRun) => runAutoMatch({
  db, openai: null, send: async (to) => sent.push(to), serverTimestamp: () => null,
  templates: { jobIncompleteEmail: () => ({ subject: "보완", html: "" }), candidateIncompleteEmail: () => ({ subject: "", html: "" }), matchResultEmail: () => ({ subject: "", html: "" }) },
  isRefused: (to) => refusedSet.has(String(to || "").trim().toLowerCase()),
}, { startAtMs: now - 1000, dryRun });

const real = await run(false);
const dry = await run(true);
const ok = sent.length === 1 && sent[0] === "hr@example.org" && real.refused === 1 && dry.refused === 1 && dry.preview.some((p) => /거절하신 주소/.test(p.note || ""));
console.log("보낸 곳:", sent, "· 거절로 건너뜀:", real.refused, "· 미리보기 표시:", dry.preview.map((p) => `${p.to} — ${p.note}`));
console.log(ok ? "✅ 통과 — 거절하신 주소로는 메일이 나가지 않는다" : "❌ 실패");
process.exit(ok ? 0 : 1);
