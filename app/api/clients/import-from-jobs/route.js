import { getDb } from "@/lib/firebase-admin";
import { importClientsFromJobs } from "@/lib/import-clients";
import admin from "firebase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/clients/import-from-jobs — 공고 기업을 파이프라인으로 가져오기 (중복 건너뜀)
export async function POST() {
  try {
    const db = getDb();
    const result = await importClientsFromJobs(db, () => admin.firestore.FieldValue.serverTimestamp());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
