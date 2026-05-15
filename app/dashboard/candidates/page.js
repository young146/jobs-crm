import { getDb } from "@/lib/firebase-admin";
import CandidatesClient from "@/components/CandidatesClient";

export const dynamic = "force-dynamic";

// Firestore Timestamp / 중첩 객체 → 순수 JSON 직렬화
function serializeDoc(data) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(serializeDoc);
  // Firestore Timestamp (toDate 메서드 보유 or _seconds 존재)
  if (typeof data.toDate === "function") return data.toDate().toISOString();
  if (data._seconds !== undefined && data._nanoseconds !== undefined) {
    return new Date(data._seconds * 1000).toISOString();
  }
  const out = {};
  for (const [k, v] of Object.entries(data)) out[k] = serializeDoc(v);
  return out;
}

async function getCandidates() {
  const db = getDb();
  const snap = await db.collection("candidates").orderBy("createdAt", "desc").limit(200).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...serializeDoc(doc.data()),
  }));
}

export default async function CandidatesPage() {
  const candidates = await getCandidates();
  return (
    <>
      <div className="topbar">
        <span className="topbar-title">👤 구직자 관리</span>
        <span className="topbar-badge">{candidates.length}명 등록</span>
      </div>
      <CandidatesClient candidates={candidates} />
    </>
  );
}
