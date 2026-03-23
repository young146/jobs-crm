/**
 * migrate-candidates.js
 * Jobs 컬렉션의 구직자 문서들을 candidates 컬렉션으로 이전
 * 실행: node scripts/migrate-candidates.js
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Firebase 초기화
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../serviceAccount.json"), "utf8")
);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// 이전할 문서 ID 목록 (Jobs 컬렉션 → candidates 컬렉션)
const IDS_TO_MIGRATE = [
  "01aeqODePsjPINYl13cf",
  "5mreg6aa2t47NIm32dVI",
  "Kb9z002spz9icMdDVWGh",
  "ReOhpOG4qeIIUeQqydQg",
  "aNLy2Nbv8uwCTXthCuH8",
  "eYewzx8LMSEAOaG4pu2G",
  "h3MheOJHWOmxYvkbKPMD",
  "yrCgYNr5dRsf9CLERePF",
];

async function migrate() {
  console.log(`\n🚀 마이그레이션 시작: ${IDS_TO_MIGRATE.length}개 문서\n`);
  let success = 0, failed = 0;

  for (const id of IDS_TO_MIGRATE) {
    try {
      // 1. Jobs에서 읽기
      const srcRef = db.collection("Jobs").doc(id);
      const srcDoc = await srcRef.get();

      if (!srcDoc.exists) {
        console.log(`⚠️  [${id}] Jobs에서 찾을 수 없음 — 건너뜀`);
        failed++;
        continue;
      }

      const data = srcDoc.data();
      console.log(`📄 [${id}] 원본: "${data.title || data.name || "(제목없음)"}" (${data.jobType || "jobType없음"})`);

      // 2. candidates에 동일 ID로 쓰기 (원본 ID 유지)
      const dstRef = db.collection("candidates").doc(id);
      await dstRef.set({
        ...data,
        _migratedFromJobs: true,
        _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✅ candidates/${id} 저장 완료`);

      // 3. Jobs에서 삭제
      await srcRef.delete();
      console.log(`  🗑️  Jobs/${id} 삭제 완료\n`);

      success++;
    } catch (err) {
      console.error(`  ❌ [${id}] 오류: ${err.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 결과: 성공 ${success}개 / 실패 ${failed}개`);
  console.log("✅ 마이그레이션 완료!\n");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ 치명적 오류:", err);
  process.exit(1);
});
