import { getDb } from "@/lib/firebase-admin";
import { getOpenAI } from "@/lib/openai";
import { sendEmail } from "@/lib/email";
import { runAutoMatch } from "@/lib/auto-match";
import { jobIncompleteEmail, candidateIncompleteEmail, matchResultEmail } from "@/lib/email-templates";
import admin from "firebase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 매칭에 GPT 호출 다수 → 넉넉히 (Vercel Pro 필요)

/**
 * 자동 매칭 크론 — Vercel Cron 또는 외부 스케줄러가 주기 호출.
 * 동작은 Firestore config/automation 문서로 제어:
 *   { enabled:boolean, startAt:Timestamp, dryRun:boolean, threshold:number, jobLimit:number }
 * enabled=false 또는 문서 없음 → 아무것도 안 함(안전 기본값).
 */
export async function GET(request) {
  const auth = request.headers.get("authorization") || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const db = getDb();
    const cfgDoc = await db.collection("config").doc("automation").get();
    const cfg = cfgDoc.exists ? cfgDoc.data() : null;
    if (!cfg || !cfg.enabled) {
      return NextResponse.json({ ok: true, skipped: "automation disabled", enabled: !!cfg?.enabled });
    }
    const startAtMs = cfg.startAt?.toMillis?.() ?? Date.now();
    const summary = await runAutoMatch(
      {
        db,
        openai: getOpenAI(),
        send: (to, subject, html) => sendEmail({ to, subject, html }),
        serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
        templates: { jobIncompleteEmail, candidateIncompleteEmail, matchResultEmail },
      },
      { startAtMs, threshold: cfg.threshold || 75, dryRun: !!cfg.dryRun, jobLimit: cfg.jobLimit || 100 }
    );
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("auto-match cron error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
