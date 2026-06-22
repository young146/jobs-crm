import nodemailer from "nodemailer";

// SMTP(nodemailer) 단일 발송 헬퍼.
// daily-news-final과 동일한 SMTP 환경변수 재사용:
//   SMTP_USER, SMTP_PASS (필수) · SMTP_HOST(기본 smtp.gmail.com) · SMTP_PORT(기본 465) · SMTP_SECURE · SMTP_FROM
let transporter = null;
function getTransport() {
  if (transporter) return transporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("SMTP_USER / SMTP_PASS 환경변수가 설정되지 않았습니다.");
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user, pass },
  });
  return transporter;
}

// 발신 주소는 info@chaovietnam.co.kr 로 고정 (daily-news-final과 동일, SMTP 인증된 발신자)
// 모든 고객 발송은 info@chaovietnam.co.kr 로 BCC(참조) 사본을 남긴다 — 관리/모니터링용.
// (bcc: null 을 명시하면 참조 없이 발송. 기본값은 항상 참조 포함)
const MONITOR_BCC = "info@chaovietnam.co.kr";
export async function sendEmail({ to, subject, html, fromName, bcc }) {
  const t = getTransport();
  const fromAddr = process.env.SMTP_FROM || "info@chaovietnam.co.kr";
  const bccAddr = bcc === undefined ? MONITOR_BCC : bcc;
  await t.sendMail({
    from: fromName ? `"${fromName}" <${fromAddr}>` : fromAddr,
    to,
    ...(bccAddr ? { bcc: bccAddr } : {}),
    subject,
    html,
  });
}
