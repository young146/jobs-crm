import { getDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 최근 발송 기록
export async function GET() {
  const db = getDb();
  const snap = await db.collection("emailLog").orderBy("sentAt", "desc").limit(200).get();
  const rows = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      type: x.type, to: x.to, subject: x.subject, name: x.name || "",
      refType: x.refType || "", refId: x.refId || "",
      status: x.status || "sent",
      responseStatus: x.responseStatus || "대기",
      sentAt: x.sentAt?.toDate?.().toISOString() || null,
      responseAt: x.responseAt?.toDate?.().toISOString() || null,
    };
  });
  return NextResponse.json({ ok: true, rows });
}

// 응답 상태 수동 변경: { id, responseStatus: '대기'|'응답옴'|'처리완료' }
export async function POST(request) {
  try {
    const { id, responseStatus } = await request.json();
    if (!id) return NextResponse.json({ ok: false, error: "id 필요" }, { status: 400 });
    const patch = { responseStatus };
    if (responseStatus === "응답옴") patch.responseAt = admin.firestore.FieldValue.serverTimestamp();
    await getDb().collection("emailLog").doc(id).set(patch, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
