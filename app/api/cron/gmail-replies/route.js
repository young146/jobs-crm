import { getDb } from "@/lib/firebase-admin";
import { ImapFlow } from "imapflow";
import admin from "firebase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * info@ 받은편지함(IMAP)을 훑어 "답장"을 자동 감지 → emailLog의 해당 발송을 '응답옴'으로 표시.
 * SMTP_USER/SMTP_PASS(앱 비밀번호) 재사용. 보내기용 자격증명이 IMAP 읽기도 커버.
 * 읽기 전용 — 메일을 건드리지 않음. 대기→응답옴 만 바꾸므로 반복 실행 안전(멱등).
 */
export async function GET(request) {
  const auth = request.headers.get("authorization") || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!user || !pass) return NextResponse.json({ ok: false, error: "SMTP_USER/PASS 없음" }, { status: 500 });

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || "imap.gmail.com",
    port: 993, secure: true, auth: { user, pass }, logger: false,
  });

  const replies = new Map(); // 보낸이 이메일(소문자) → 가장 최근 답장 시각
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 7 * 86400000); // 최근 7일
      const uids = await client.search({ since }, { uid: true });
      if (uids && uids.length) {
        for await (const msg of client.fetch(uids, { envelope: true }, { uid: true })) {
          const from = msg.envelope?.from?.[0]?.address?.toLowerCase();
          const date = msg.envelope?.date ? new Date(msg.envelope.date) : null;
          if (from && date) {
            const prev = replies.get(from);
            if (!prev || date > prev) replies.set(from, date);
          }
        }
      }
    } finally { lock.release(); }
    await client.logout();
  } catch (err) {
    try { await client.logout(); } catch {}
    return NextResponse.json({ ok: false, error: `IMAP 오류: ${err.message}` }, { status: 500 });
  }

  // 대기 중 발송과 대조 — 보낸이 일치 + 답장이 발송 이후면 '응답옴'
  const db = getDb();
  const snap = await db.collection("emailLog").where("responseStatus", "==", "대기").limit(500).get();
  let matched = 0;
  for (const d of snap.docs) {
    const x = d.data();
    const replyAt = replies.get(String(x.to || "").toLowerCase());
    if (!replyAt) continue;
    const sentAt = x.sentAt?.toDate?.();
    if (sentAt && replyAt < sentAt) continue; // 발송 전 메일이면 답장 아님
    await d.ref.set({ responseStatus: "응답옴", responseAt: admin.firestore.Timestamp.fromDate(replyAt) }, { merge: true });
    matched++;
  }

  return NextResponse.json({ ok: true, scannedSenders: replies.size, marked: matched });
}
