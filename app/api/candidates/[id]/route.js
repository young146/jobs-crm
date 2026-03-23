import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

// DELETE /api/candidates/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.collection("candidates").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/candidates/[id]  — 필드 업데이트
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();
    await db.collection("candidates").doc(id).update(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
