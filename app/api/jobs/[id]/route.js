import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

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
    const body = await request.json();
    const db = getDb();
    await db.collection("Jobs").doc(id).update(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
