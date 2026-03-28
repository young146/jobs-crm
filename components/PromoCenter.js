'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';

export default function PromoCenter() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop");
  const [language, setLanguage] = useState("VN"); // "VN" | "KR"

  const jobLink = "https://open.kakao.com/o/gQxdgSji";
  const marketLink = "https://open.kakao.com/o/gDITUGji";

  // 공유용 동적 링크 (배포 주소 기준으로 자동 생성)
  const [dynamicWebsiteLink, setDynamicWebsiteLink] = useState('https://jobs-crm-khaki.vercel.app/jobs-promo');

  useEffect(() => {
    const baseUrl = window.location.origin;
    setDynamicWebsiteLink(`${baseUrl}/jobs-promo?lang=${language}&img=${encodeURIComponent(imageUrl)}`);
  }, [language, imageUrl]);

  // ── 카카오 공유 ──────────────────────────────────────────
  const handleShareKakao = () => {
    if (!window.Kakao) {
      alert('카카오 SDK가 아직 로딩 중입니다. 잠시 후 다시 눌러주세요.');
      return;
    }
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
    }

    const isVN = language === "VN";

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: isVN ? '🚨 VIỆC LÀM TỐT TẠI CÔNG TY HÀN QUỐC' : '🚨 검증된 한국 기업 취업! 최상의 대우 보장',
        description: isVN
          ? 'Được vận hành bởi Tạp chí uy tín 25 năm.\nTiến cử trực tiếp, lương cao, và bảo mật 100% hồ sơ của bạn!'
          : '신뢰의 25년 - 씬짜오베트남.\n이력서를 안전하게 보관하고 우수 기업에만 직접 매칭해 드립니다!',
        imageUrl: imageUrl,
        link: { mobileWebUrl: dynamicWebsiteLink, webUrl: dynamicWebsiteLink },
      },
      buttons: [
        {
          title: isVN ? '🔥 Nhóm Việc Làm (HOT)' : '🔥 구인/구직 (HOT)',
          link: { mobileWebUrl: jobLink, webUrl: jobLink },
        },
        {
          title: isVN ? '🛒 Mua Bán & Nhà Đất' : '🛒 당근/나눔 방 접속',
          link: { mobileWebUrl: marketLink, webUrl: marketLink },
        }
      ],
    });
  };

  // ── 페이스북 공유 ─────────────────────────────────────────
  // 페이스북 로봇이 dynamicWebsiteLink 페이지의 OG 태그를 읽어 카드 생성
  // (로컬호스트에서는 카드 미리보기 안 뜸 → 배포 URL에서 정상 작동)
  const handleShareFB = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(dynamicWebsiteLink)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  // ── Zalo 공유 ─────────────────────────────────────────────
  // sp.zalo.me/share_url 은 폐기됨 → 링크 복사 방식으로 대체
  const handleShareZalo = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      // 모바일: Zalo 앱 딥링크 시도 → 실패 시 클립보드 복사
      window.location.href = `zalo://forward?link=${encodeURIComponent(dynamicWebsiteLink)}`;
      setTimeout(() => {
        navigator.clipboard.writeText(dynamicWebsiteLink)
          .then(() => alert('📋 Zalo 앱이 열리지 않으면 링크가 복사되었습니다!\nZalo 채팅창에 붙여넣기(길게 누르기) 해주세요.'));
      }, 1500);
    } else {
      // PC: 클립보드 복사 후 안내
      navigator.clipboard.writeText(dynamicWebsiteLink)
        .then(() => alert('📋 Zalo 공유 링크가 복사되었습니다!\n\nZalo 앱 또는 Zalo 웹(zalo.me)에서\n채팅창을 열고 붙여넣기(Ctrl+V) 해주세요.'))
        .catch(() => {
          prompt('아래 링크를 복사(Ctrl+C)하여 Zalo에 붙여넣으세요:', dynamicWebsiteLink);
        });
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', fontFamily: '"Malgun Gothic", "Segoe UI", sans-serif', color: '#333' }}>
      <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js" onLoad={() => setIsLoaded(true)} strategy="lazyOnload" />

      {/* 헤더 */}
      <h2 style={{ fontSize: '26px', fontWeight: 'bold', borderBottom: '3px solid #ff5e00', paddingBottom: '12px', marginBottom: '20px' }}>
         🚀 마케팅 카드뉴스 송출 현황판
      </h2>

      {/* 1단계: 이미지 변경 */}
      <div style={{ background: '#f5f7fa', border: '1px solid #dcdfe6', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
         <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '15px' }}>
           🖼️ 1. 홍보 카드 이미지(사진) 주소 변경
         </label>
         <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', marginBottom: '8px', boxSizing: 'border-box' }}
            placeholder="http:// 이미지 주소를 넣어주세요..."
         />
         <p style={{ fontSize: '13px', color: '#606266', margin: 0, lineHeight: 1.5 }}>
            디자이너가 제작한 카드뉴스 이미지를 서버나 블로그에 업로드 후, 해당 이미지 주소를 이곳에 붙여넣으세요.
         </p>
      </div>

      {/* 2단계: 언어 선택 */}
      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '15px' }}>
         🌐 2. 누구를 대상으로 보낼까요? (언어 선택)
      </label>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
         <button onClick={() => setLanguage("VN")} style={{ flex: 1, padding: '14px', background: language === 'VN' ? '#ff5e00' : '#e4e7ed', color: language === 'VN' ? 'white' : '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: '0.2s' }}>🇻🇳 현지인 (베트남어)</button>
         <button onClick={() => setLanguage("KR")} style={{ flex: 1, padding: '14px', background: language === 'KR' ? '#ff5e00' : '#e4e7ed', color: language === 'KR' ? 'white' : '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: '0.2s' }}>🇰🇷 한인 교민 (한국어)</button>
      </div>

      {/* 카드 미리보기 */}
      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '15px' }}>
         👀 실제로 발송될 카카오톡 화면 모습
      </label>
      <div style={{ border: '1px solid #dcdfe6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', backgroundColor: '#fff', marginBottom: '30px' }}>
         <div style={{ width: '100%', height: '320px', backgroundColor: '#e4e7ed', overflow: 'hidden' }}>
            {imageUrl ? (
               <img src={imageUrl} alt="Promo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
               <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#909399' }}>이미지가 없습니다</div>
            )}
         </div>
         <div style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '19px', color: '#303133' }}>
              {language === 'VN' ? '🚨 VIỆC LÀM TỐT TẠI CÔNG TY HÀN QUỐC' : '🚨 검증된 우수 한국 기업 채용!'}
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#606266', fontSize: '14px', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {language === 'VN'
                ? 'Được vận hành bởi Tạp chí uy tín 25 năm.\nTiến cử trực tiếp, lương cao, và bảo mật 100% hồ sơ của bạn!'
                : '신뢰의 25년 - 씬짜오베트남.\n이력서를 안전하게 보관하고 검증된 기업에만 직접 매칭해 드립니다!'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ background: '#f4f4f5', padding: '12px', borderRadius: '6px', textAlign: 'center', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                {language === 'VN' ? '🔥 Nhóm Việc Làm (HOT)' : '🔥 구인/구직 (HOT)'}
              </div>
              <div style={{ background: '#f4f4f5', padding: '12px', borderRadius: '6px', textAlign: 'center', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                {language === 'VN' ? '🛒 Mua Bán & Nhà Đất' : '🛒 당근/나눔 & 부동산 관리'}
              </div>
            </div>
         </div>
      </div>

      {/* 3단계: SNS 공유 */}
      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '15px', fontSize: '15px' }}>
         🚀 3. 발송 채널을 선택하세요
      </label>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '50px' }}>
         <button onClick={handleShareKakao} style={{ flex: '1 1 200px', padding: '18px', background: '#FEE500', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '16px', cursor: 'pointer' }}>
            💬 카카오 공식템플릿 보내기
         </button>
         <button onClick={handleShareFB} style={{ flex: '1 1 140px', padding: '18px', background: '#1877F2', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
            📘 페이스북 (뉴스피드)
         </button>
         <button onClick={handleShareZalo} style={{ flex: '1 1 140px', padding: '18px', background: '#0068FF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
            💬 Zalo 링크 복사
         </button>
      </div>
    </div>
  );
}
