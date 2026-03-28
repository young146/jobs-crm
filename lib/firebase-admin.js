import admin from "firebase-admin";

let db;

export function getDb() {
  if (!db) {
    if (!admin.apps.length) {
      let serviceAccount;

      // 1. 배포 환경(Vercel)에서는 환경 변수에서 JSON 문자열을 가져옴
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } else {
        // 2. 로컬 개발 환경에서는 파일에서 읽어옴
        const { readFileSync } = require("fs");
        const { join } = require("path");
        const serviceAccountPath = join(process.cwd(), "serviceAccount.json");
        serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    db = admin.firestore();
  }
  return db;
}
