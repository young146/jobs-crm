/**
 * 공고(Jobs)에 등록된 기업을 영업 파이프라인(clients)으로 가져온다.
 * 공고를 올린 회사 = 사람을 뽑으려는 잠재 고객 → 영업 리드.
 * 회사명 기준 중복 제거 + 이미 clients에 있으면 건너뜀(멱등). firebase 주입받아 테스트 가능.
 */

export function mapIndustry(track) {
  const t = String(track || "");
  if (/제조|생산/.test(t)) return "제조업";
  if (/건설|시공/.test(t)) return "건설업";
  if (/IT|소프트|개발/i.test(t)) return "IT";
  if (/요식|식당|외식|F&B/i.test(t)) return "요식업";
  if (/물류|운송|화물/.test(t)) return "물류";
  if (/서비스/.test(t)) return "서비스업";
  if (/농업/.test(t)) return "농업";
  return t ? "기타" : "";
}

export async function importClientsFromJobs(db, serverTimestamp, { dryRun = false } = {}) {
  // 활성 공고
  const jobSnap = await db.collection("Jobs").orderBy("createdAt", "desc").limit(500).get();
  const jobs = jobSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((j) => (!j.jobType || j.jobType === "구인") && j.status === "모집중");

  // 이미 등록된 고객사(회사명)
  const cSnap = await db.collection("clients").get();
  const existing = new Set(cSnap.docs.map((d) => String(d.data().companyName || "").trim()).filter(Boolean));

  // 회사명 기준 중복 제거(최신 공고 우선 — 이미 createdAt desc)
  const seen = new Set();
  const toCreate = [];
  for (const j of jobs) {
    const name = String(j.companyName || "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    if (existing.has(name)) continue;
    toCreate.push({
      companyName: name,
      contactName: "",
      contactPhone: j.contact || j.phone || "",
      contactEmail: j.contactEmail || j.email || j.userEmail || "",
      industry: mapIndustry(j.industryTrack),
      city: j.city || "",
      headcount: "",
      notes: `공고에서 자동 등록 · 최근 공고: ${j.title || ""}`.slice(0, 200),
      stage: "신규 문의",
      source: "jobs-import",
    });
  }

  if (dryRun) {
    return { dryRun: true, alreadyInPipeline: existing.size, uniqueCompanies: seen.size, wouldCreate: toCreate.length, sample: toCreate.slice(0, 10).map((c) => c.companyName) };
  }

  let created = 0;
  for (const c of toCreate) {
    await db.collection("clients").add({ ...c, createdAt: serverTimestamp() });
    created++;
  }
  return { created, skippedExisting: existing.size, uniqueCompanies: seen.size };
}
