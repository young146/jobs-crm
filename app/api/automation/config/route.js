import { getDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const ref = () => getDb().collection("config").doc("automation");

function serialize(cfg) {
  if (!cfg) return null;
  return {
    enabled: !!cfg.enabled,
    dryRun: cfg.dryRun !== false,
    threshold: cfg.threshold || 75,
    jobLimit: cfg.jobLimit || 100,
    startAt: cfg.startAt?.toDate?.().toISOString() || null,
    updatedAt: cfg.updatedAt?.toDate?.().toISOString() || null,
  };
}

export async function GET() {
  const d = await ref().get();
  return NextResponse.json({ ok: true, config: d.exists ? serialize(d.data()) : null });
}

// 토글: { action: 'enable_dry' | 'enable_live' | 'off' | 'set_threshold', threshold? }
export async function POST(request) {
  try {
    const { action, threshold } = await request.json();
    const now = admin.firestore.FieldValue.serverTimestamp();
    let patch;
    if (action === "off") patch = { enabled: false };
    else if (action === "enable_dry") patch = { enabled: true, dryRun: true };
    else if (action === "enable_live") patch = { enabled: true, dryRun: false, startAt: admin.firestore.Timestamp.now() };
    else if (action === "set_threshold") patch = { threshold: Math.max(0, Math.min(100, parseInt(threshold, 10) || 75)) };
    else return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });

    await ref().set({ ...patch, updatedAt: now }, { merge: true });
    const d = await ref().get();
    return NextResponse.json({ ok: true, config: serialize(d.data()) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
