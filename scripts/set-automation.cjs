/**
 * 자동매칭 가동 스위치 — Firestore config/automation 문서를 설정한다.
 * 크론 라우트(app/api/cron/auto-match)가 이 문서를 읽어 동작을 결정.
 *
 * 사용:
 *   node scripts/set-automation.cjs dry [임계=75] [과거일수=0]   # 켜되 발송 없음(검증). 과거일수>0이면 그만큼 거슬러 올라가 시뮬
 *   node scripts/set-automation.cjs live [임계=75]               # 실발송 ON. startAt=지금(=이 시점 이후 등록분만)
 *   node scripts/set-automation.cjs off                          # 끔
 *   node scripts/set-automation.cjs show                         # 현재 설정 보기
 */
const path = require("path");
const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.credential.cert(require(path.join(process.cwd(), "serviceAccount.json"))) });
const db = admin.firestore();
const ref = db.collection("config").doc("automation");

const mode = process.argv[2] || "show";
const threshold = parseInt(process.argv[3], 10) || 75;

(async () => {
  if (mode === "show") {
    const d = await ref.get();
    console.log("현재 config/automation:", d.exists ? JSON.stringify(d.data(), null, 2) : "(없음 → 크론 미작동)");
    return process.exit(0);
  }
  if (mode === "off") {
    await ref.set({ enabled: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    console.log("✅ 자동매칭 OFF (enabled:false)");
    return process.exit(0);
  }
  const daysBack = parseInt(process.argv[4], 10) || 0;
  const startAt = admin.firestore.Timestamp.fromMillis(Date.now() - daysBack * 86400000);
  const cfg = {
    enabled: true,
    dryRun: mode === "dry",
    startAt,
    threshold,
    jobLimit: 100,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(cfg, { merge: true });
  console.log(`✅ 자동매칭 ${mode === "dry" ? "DRY-RUN(발송없음)" : "LIVE(실발송)"} 설정 완료`);
  console.log(`   임계 ${threshold}점 · startAt=${startAt.toDate().toISOString()} (이 시점 이후 등록분만 처리)`);
  process.exit(0);
})().catch((e) => { console.error("오류:", e.message); process.exit(1); });
