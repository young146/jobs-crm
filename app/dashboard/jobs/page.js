import { getDb } from "@/lib/firebase-admin";
import JobsClient from "@/components/JobsClient";

export const dynamic = "force-dynamic";

function serializeDoc(data) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(serializeDoc);
  if (typeof data.toDate === "function") return data.toDate().toISOString();
  if (data._seconds !== undefined && data._nanoseconds !== undefined) {
    return new Date(data._seconds * 1000).toISOString();
  }
  const out = {};
  for (const [k, v] of Object.entries(data)) out[k] = serializeDoc(v);
  return out;
}

async function getJobs() {
  const db = getDb();
  const snap = await db.collection("Jobs").orderBy("createdAt", "desc").limit(200).get();
  const all = snap.docs.map((doc) => ({
    id: doc.id,
    ...serializeDoc(doc.data()),
  }));
  return all.filter((j) => !j.jobType || j.jobType === "구인");
}

export default async function JobsPage() {
  const jobs = await getJobs();
  return (
    <>
      <div className="topbar">
        <span className="topbar-title">🏢 채용공고</span>
        <span className="topbar-badge">
          {jobs.filter(j => j.status === "모집중").length}개 모집중 / 총 {jobs.length}건
        </span>
      </div>
      <JobsClient jobs={jobs} />
    </>
  );
}
