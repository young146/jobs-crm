import "./globals.css";

export const metadata = {
  title: "사령탑 | 씬짜오 리쿠르트 CRM",
  description: "구인구직 AI 매칭 관리 대시보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
