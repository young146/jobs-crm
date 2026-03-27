'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';

export default function PromoCenter() {
  const [isLoaded, setIsLoaded] = useState(false);
  // 사용자가 직접 이미지 주소를 바꿀 수 있는 상태 관리
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop");
  const [language, setLanguage] = useState("VN"); // "VN" | "KR"

  const jobLink = "https://open.kakao.com/o/gQxdgSji";
  const marketLink = "https://open.kakao.com/o/gDITUGji";
  const websiteLink = "https://chaovietnam.co.kr"; // 페이스북/잘로 공유용 홈페이지 링크

  const initKakao = () => {
    if (!window.Kakao) {
      alert("카카오 SDK가 아직 로드되지 않았습니다.");
      return false;
    }
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
    }
    return true;
  };

  const handleShareKakao = () => {
    if (!initKakao()) return;
    
    const isVN = language === "VN";
    
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: isVN ? '🚨 VIỆC LÀM TỐT TẠI CÔNG TY HÀN QUỐC' : '🚨 검증된 한국 기업 취업! 최상의 대우 보장',
        description: isVN 
          ? 'Được vận hành bởi Tạp chí uy tín 25 năm.\nTiến cử trực tiếp, lương cao, và bảo mật 100% hồ sơ của bạn!' 
          : '신뢰의 25년 - 씬짜오베트남.\n이력서를 안전하게 보관하고 우수 기업에만 직접 매칭해 드립니다!',
        imageUrl: imageUrl, // ★ 입력창에서 설정한 이미지가 그대로 날아갑니다!
        link: { mobileWebUrl: jobLink, webUrl: jobLink },
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

  const handleShareFB = () => {
    // 페이스북은 웹사이트 주소 자체를 공유하며, 해당 웹사이트의 og태그를 긁어갑니다.
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(websiteLink)}`, '_blank', 'width=600,height=400');
  };

  const handleShareZalo = () => {
    // 잘로(Zalo) 전용 공유 링크
    window.open(`https://sp.zalo.me/share_url?url=${encodeURIComponent(websiteLink)}`, '_blank', 'width=600,height=500');
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
            디자이너가 제작한 카드뉴스 이미지를 홈페이지(서버)나 블로그에 업로드하신 뒤, 해당 이미지 주소(http://...)를 이곳에 붙여넣으시면 카카오톡 전송 이미지가 즉각 변경됩니다!
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

      {/* 시각적 카드 미리보기 (블랙버튼 대체) */}
      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '15px' }}>
         👀 실제로 발송될 카카오톡 화면 모습
      </label>
      <div style={{ border: '1px solid #dcdfe6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', backgroundColor: '#fff', marginBottom: '30px' }}>
         {/* 이미지 영역 */}
         <div style={{ width: '100%', height: '320px', backgroundColor: '#e4e7ed', overflow: 'hidden' }}>
            {imageUrl ? (
               <img src={imageUrl} alt="Promo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {e.target.style.display='none';}} />
            ) : (
               <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#909399' }}>이미지가 없습니다</div>
            )}
         </div>
         {/* 텍스트 및 버튼 영역 */}
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

      {/* 3단계: SNS 공유 액션 */}
      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '15px', fontSize: '15px' }}>
         🚀 3. 발송 채널을 선택하세요
      </label>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '50px' }}>
         <button onClick={handleShareKakao} disabled={!isLoaded} style={{ flex: '1 1 200px', padding: '18px', background: '#FEE500', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '16px', cursor: isLoaded ? 'pointer' : 'not-allowed' }}>
            💬 카카오 공식템플릿 보내기
         </button>
         <button onClick={handleShareFB} style={{ flex: '1 1 140px', padding: '18px', background: '#1877F2', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
            📘 페이스북 (뉴스피드)
         </button>
         <button onClick={handleShareZalo} style={{ flex: '1 1 140px', padding: '18px', background: '#0068FF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
            💬 자국민 메신저 Zalo
         </button>
      </div>
    </div>
  );
}
