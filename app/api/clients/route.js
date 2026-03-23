import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

// GET /api/clients — 전체 고객 목록
export async function GET() {
  try {
    const db = getDb();
    const snap = await db.collection("clients").orderBy("createdAt", "desc").limit(200).get();
    const clients = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : null,
        lastContactedAt: d.lastContactedAt ? d.lastContactedAt.toDate().toISOString() : null,
      };
    });
    return NextResponse.json({ ok: true, clients });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// POST /api/clients — 신규 고객 추가
export async function POST(request) {
  try {
    const body = await request.json();
    const db = getDb();
    const { FieldValue } = await import("firebase-admin/firestore");
    const ref = await db.collection("clients").add({
      ...body,
      stage: body.stage || "신규 문의",
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
