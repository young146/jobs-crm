/**
 * 자동매칭 오케스트레이터 로컬 DRY-RUN (메일·DB쓰기 없음).
 * 과거 N일을 컷오프로 잡아, "그 이후 등록분"이 자동시스템에서 어떻게 라우팅되는지(보완안내/매칭/스킵) 시뮬레이션.
 *
 * 실행: node scripts/auto-match-dryrun.mjs [과거일수=60] [공고상한=8] [임계=75]
 */
import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import OpenAI from "openai";
import { runAutoMatch } from "../lib/auto-match.js";
import { jobIncompleteEmail, candidateIncompleteEmail, matchResultEmail } from "../lib/email-templates.js";

// .env.local 로드
try {
  const txt = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const DAYS = parseInt(process.argv[2], 10) || 60;
const JOB_LIMIT = parseInt(process.argv[3], 10) || 8;
const THRESHOLD = parseInt(process.argv[4], 10) || 75;

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(path.join(process.cwd(), "serviceAccount.json"), "utf8"))) });
const db = admin.firestore();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const startAtMs = Date.now() - DAYS * 86400000;
console.log(`\n[DRY-RUN] 컷오프 ${new Date(startAtMs).toISOString().slice(0,10)} 이후 등록분 · 공고 상한 ${JOB_LIMIT} · 임계 ${THRESHOLD}\n`);

const summary = await runAutoMatch(
  {
    db, openai,
    send: async () => {},           // 발송 없음
    serverTimestamp: () => null,    // 쓰기 없음
    templates: { jobIncompleteEmail, candidateIncompleteEmail, matchResultEmail },
  },
  { startAtMs, threshold: THRESHOLD, dryRun: true, jobLimit: JOB_LIMIT }
);

console.log("집계:", JSON.stringify(summary.jobs), JSON.stringify(summary.candidates));
console.log("\n발송 미리보기:");
for (const p of summary.preview) console.log(`  [${p.kind}] → ${p.to || "(이메일없음)"}  ${p.subject}\n      ${p.note || ""}`);
console.log("");
process.exit(0);
