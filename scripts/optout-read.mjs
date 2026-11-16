// 🙅 이 저장소가 거절 명부(Firestore MailOptOut/replies)를 읽을 수 있는지 — 읽기만. 실행: node scripts/optout-read.mjs [주소]
import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { loadRefused } from "../lib/mail-optout.js";
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(path.join(process.cwd(), "serviceAccount.json"), "utf8"))) });
const db = admin.firestore();
const d = await db.collection("MailOptOut").doc("replies").get();
console.log("명부", d.exists ? `${Object.keys(d.data().emails || {}).length}곳` : "없음", "· 프로젝트", admin.app().options.credential ? db.projectId || "" : "");
const isRefused = await loadRefused(db);
for (const e of process.argv.slice(2)) console.log(" ", e, "→", isRefused(e) ? "거절하신 주소" : "보내도 되는 주소");
process.exit(0);
