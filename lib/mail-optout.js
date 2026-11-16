/**
 * 🙅 거절 명부 — 답장으로 「보내지 마세요」·수신 거부 하신 주소에는 메일을 보내지 않는다.
 * (2026-11-16 대표님 「보내지 마세요나 수신 거부 메일을 받으면 바로 적용되게」 → 「구인구직 자동 추천 메일에도 적용해」)
 *
 * 명부의 원본은 daily-news-final(lib/reply-optout.mjs)이 15분마다 info@ 메일함의 답장에서 채우고,
 * 같은 내용을 Firestore `MailOptOut/replies` 에 적어 둔다 — { emails: { "주소": { at, phrase } } }.
 * 소라쇼핑 서버(chao-vn-app functions soraMailRefused)도 같은 문서를 본다. 여기서는 읽기만 한다.
 *
 * 명부를 못 읽으면 「아무도 거절 안 함」으로 돌려준다 — 추천 메일은 회사가 기다리는 서비스라,
 * 읽기 실패 한 번으로 그날 추천이 통째로 멈추는 쪽이 더 나쁘다(실패는 기록에 남긴다).
 */
export async function loadRefused(db) {
  let emails = {};
  try {
    const d = await db.collection("MailOptOut").doc("replies").get();
    emails = (d.exists && d.data().emails) || {};
  } catch (e) {
    console.warn("🙅 거절 명부 읽기 실패:", e && e.message);
  }
  return (to) => !!emails[String(to || "").trim().toLowerCase()];
}
