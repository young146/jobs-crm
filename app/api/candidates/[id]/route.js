import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { pickAllowed } from "@/lib/patchWhitelist";

// PATCH 로 바꿀 수 있는 칸 (2026-09-27 화이트리스트) — CRM 관리 칸과 희망 급여 숫자만
const ALLOWED = ["crm.*", "compensation.desiredSalaryUsdPerMonth"];
const USD = ["compensation.desiredSalaryUsdPerMonth"];

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
    const picked = pickAllowed(await request.json(), ALLOWED, USD);
    if (!picked.ok) return NextResponse.json({ ok: false, error: picked.error }, { status: 400 });
    const db = getDb();
    await db.collection("candidates").doc(id).update(picked.updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
