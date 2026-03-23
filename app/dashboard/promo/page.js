"use client";
import Link from "next/link";

const PROMO_HTML = `<!-- 씬짜오 리쿠르트 홍보 카드 — 데일리 뉴스 이메일 하단 첨부용 -->
<table cellpadding="0" cellspacing="0" border="0" width="600" style="margin:32px auto 0;font-family:'Malgun Gothic',Arial,sans-serif;border-radius:16px;overflow:hidden;border:1px solid #e0e0e0;">
  <tr>
    <td style="background:linear-gradient(135deg,#0d1117 60%,#1a233a 100%);padding:28px 32px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td>
            <div style="font-size:11px;color:#ff6b35;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">씬짜오 리쿠르트 · Xinchao Recruit</div>
            <div style="font-size:24px;font-weight:900;color:#ffffff;line-height:1.3;margin-bottom:16px;">베트남 인재,<br/>한국 기업을 만나다 🇻🇳🤝🇰🇷</div>
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding-right:24px;">
                  <div style="font-size:13px;color:#adbac7;line-height:2;">
                    ✅ AI 매칭 시스템으로 최적 인재 추천<br/>
                    ✅ 검증된 베트남 현지 인재풀 보유<br/>
                    ✅ 무료 초기 상담 · 빠른 채용 진행<br/>
                    ✅ 비자/법률 서류 지원
                  </div>
                </td>
              </tr>
            </table>
            <a href="mailto:recruit@chaovietnam.co.kr?subject=채용 문의합니다"
              style="display:inline-block;background:#ff6b35;color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:30px;text-decoration:none;letter-spacing:0.5px;">
              채용 문의하기 →
            </a>
            <div style="margin-top:20px;font-size:11px;color:#4a5568;">
              📧 recruit@chaovietnam.co.kr &nbsp;|&nbsp; 📱 +84 xxx xxxx &nbsp;|&nbsp; 🌐 chaovietnam.co.kr
            </div>
          </td>
          <td width="160" style="text-align:right;vertical-align:middle;">
            <div style="font-size:72px;line-height:1;opacity:0.8;">🧭</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

export default function PromoPage() {
  return (
    <>
      <div className="topbar">
        <span className="topbar-title">📣 홍보 카드</span>
        <span className="topbar-badge">데일리 뉴스 이메일 첨부용</span>
      </div>
      <div className="page">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          {/* 미리보기 */}
          <div className="card">
            <div className="card-title">👁️ 미리보기</div>
            <div dangerouslySetInnerHTML={{ __html: PROMO_HTML }} />
          </div>

          {/* HTML 코드 */}
          <div className="card">
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>📋 HTML 코드</span>
              <button className="btn btn-secondary btn-sm"
                onClick={() => { navigator.clipboard.writeText(PROMO_HTML); }}>
                복사
              </button>
            </div>
            <pre style={{
              background: "var(--surface2)", padding: 14, borderRadius: 8,
              fontSize: 10, color: "var(--muted)", overflow: "auto",
              maxHeight: 400, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-all",
            }}>
              {PROMO_HTML}
            </pre>
            <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(88,166,255,0.08)", border: "1px solid var(--blue)", borderRadius: 8, fontSize: 12, color: "var(--blue)" }}>
              💡 <strong>사용법:</strong> daily-news-final 이메일 템플릿 HTML 하단에 이 코드를 붙여넣으세요.
              <br/>이메일 클릭 시 자동으로 recruit@chaovietnam.co.kr 로 채용 문의 이메일이 작성됩니다.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
