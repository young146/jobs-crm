"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { section: "메인" },
  { href: "/dashboard", icon: "📊", label: "홈 대시보드" },
  { section: "구인구직" },
  { href: "/dashboard/candidates", icon: "👤", label: "구직자 관리" },
  { href: "/dashboard/jobs", icon: "🏢", label: "채용공고" },
  { href: "/dashboard/matching", icon: "🤖", label: "AI 매칭" },
  { href: "/dashboard/automation", icon: "⚙️", label: "자동화 관제" },
  { section: "영업 관리" },
  { href: "/dashboard/clients", icon: "🤝", label: "기업 고객 파이프라인" },
  { href: "/dashboard/promo", icon: "📣", label: "홍보 카드" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🧭</span>
        <div>
          <div className="logo-text">사령탑</div>
          <div className="logo-sub">씬짜오 리쿠르트 CRM</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {nav.map((item, i) =>
          item.section ? (
            <div className="nav-section" key={i}>{item.section}</div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${pathname === item.href ? " active" : ""}`}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </Link>
          )
        )}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", fontSize: "11px", color: "var(--muted)" }}>
        🔴 Firebase: chaovietnam-login
      </div>
    </aside>
  );
}
