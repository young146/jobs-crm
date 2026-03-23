import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

let db;

export function getDb() {
  if (!db) {
    if (!admin.apps.length) {
      const serviceAccountPath = join(process.cwd(), "serviceAccount.json");
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    db = admin.firestore();
  }
  return db;
}
