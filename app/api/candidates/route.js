import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  const db = getDb();
  const snap = await db.collection("candidates").orderBy("createdAt", "desc").limit(100).get();
  const candidates = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: undefined }));
  return NextResponse.json({ candidates });
}
