/**
 * clients 가져오기 테스트.
 *   node scripts/import-clients-test.mjs          # 미리보기(dry-run, 쓰기 없음)
 *   node scripts/import-clients-test.mjs go       # 실제 가져오기(clients에 기록)
 */
import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { importClientsFromJobs } from "../lib/import-clients.js";

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(path.join(process.cwd(), "serviceAccount.json"), "utf8"))) });
const db = admin.firestore();
const go = process.argv[2] === "go";

const result = await importClientsFromJobs(db, () => admin.firestore.FieldValue.serverTimestamp(), { dryRun: !go });
console.log(go ? "[실제 가져오기]" : "[미리보기]", JSON.stringify(result, null, 2));
process.exit(0);
