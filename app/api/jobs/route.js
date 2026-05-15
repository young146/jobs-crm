import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const snap = await db.collection("Jobs").orderBy("createdAt", "desc").limit(100).get();
  const jobs = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: undefined }));
  return NextResponse.json({ jobs });
}
