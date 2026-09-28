import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { pickAllowed, checkMinMax } from "@/lib/patchWhitelist";

// PATCH 로 바꿀 수 있는 칸 (2026-09-27 화이트리스트) — 글 내용(제목·연락처 등)은 등록 화면에서만 고친다
const ALLOWED = ["status", "salaryMinUsdPerMonth", "salaryMaxUsdPerMonth"];
const USD = ["salaryMinUsdPerMonth", "salaryMaxUsdPerMonth"];

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.collection("Jobs").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const picked = pickAllowed(await request.json(), ALLOWED, USD);
    if (!picked.ok) return NextResponse.json({ ok: false, error: picked.error }, { status: 400 });
    const db = getDb();
    const ref = db.collection("Jobs").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok: false, error: "공고가 없습니다" }, { status: 404 });
    const mm = checkMinMax(picked.updates, snap.data(), "salaryMinUsdPerMonth", "salaryMaxUsdPerMonth");
    if (mm) return NextResponse.json({ ok: false, error: mm }, { status: 400 });
    await ref.update(picked.updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
