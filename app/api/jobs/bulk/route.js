import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { action, ids, value } = await request.json();
    if (!ids || ids.length === 0) return NextResponse.json({ ok: false, error: "ids 필요" }, { status: 400 });

    const db = getDb();
    const results = { success: 0, failed: 0 };

    for (const id of ids) {
      try {
        if (action === "delete") {
          await db.collection("Jobs").doc(id).delete();
        } else if (action === "status" && value) {
          await db.collection("Jobs").doc(id).update({ status: value });
        }
        results.success++;
      } catch { results.failed++; }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
