'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function KakaoShareButton() {
  const [isLoaded, setIsLoaded] = useState(false);

  // 카카오 SDK 초기화 통합 함수
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

  // 🇻🇳 베트남어 발송
  const handleShareVN = () => {
    if (!initKakao()) return;

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '🚨 VIỆC LÀM TỐT TẠI CÔNG TY HÀN QUỐC',
        description: 'Được vận hành bởi Tạp chí uy tín 25 năm.\nTiến cử trực tiếp, lương cao, và bảo mật 100% hồ sơ của bạn!',
        // [베트남어] 실제 사진 URL로 교체하세요
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop', 
        link: {
          mobileWebUrl: 'https://open.kakao.com/o/gQxdgSji',
          webUrl: 'https://open.kakao.com/o/gQxdgSji',
        },
      },
      buttons: [
        {
          title: '🔥 Nhóm Việc Làm (HOT)',
          link: { mobileWebUrl: 'https://open.kakao.com/o/gQxdgSji', webUrl: 'https://open.kakao.com/o/gQxdgSji' },
        },
        {
          title: '🛒 Mua Bán & Nhà Đất',
          link: { mobileWebUrl: 'https://open.kakao.com/o/gDITUGji', webUrl: 'https://open.kakao.com/o/gDITUGji' },
        }
      ],
    });
  };

  // 🇰🇷 한국어 발송
  const handleShareKR = () => {
    if (!initKakao()) return;

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '🚨 검증된 한국 기업 취업! 최상의 대우 보장',
        description: '신뢰의 25년 - 씬짜오베트남.\n이력서를 안전하게 보관하고 우수 기업에만 직접 매칭해 드립니다!',
        // [한국어] 실제 사진 URL로 교체하세요
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop', 
        link: {
          mobileWebUrl: 'https://open.kakao.com/o/gQxdgSji',
          webUrl: 'https://open.kakao.com/o/gQxdgSji',
        },
      },
      buttons: [
        {
          title: '🔥 구인/구직 (HOT)',
          link: { mobileWebUrl: 'https://open.kakao.com/o/gQxdgSji', webUrl: 'https://open.kakao.com/o/gQxdgSji' },
        },
        // 버튼 텍스트에 부동산도 함께 명시
        {
          title: '🛒 당근/나눔 방 접속',
          link: { mobileWebUrl: 'https://open.kakao.com/o/gDITUGji', webUrl: 'https://open.kakao.com/o/gDITUGji' },
        }
      ],
    });
  };

  return (
    <>
      <Script 
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js" 
        onLoad={() => setIsLoaded(true)}
        strategy="lazyOnload"
      />
      
      <div className="flex flex-col gap-4 mt-8">
        {/* 베트남어 버튼 */}
        <button 
          onClick={handleShareVN}
          disabled={!isLoaded}
          className={`w-full py-4 px-6 text-[17px] font-bold rounded-xl transition-all shadow-md flex items-center justify-between border ${
            isLoaded 
              ? 'bg-[#FEE500] border-[#FEE500] text-[#000000] hover:bg-[#E5CD00]' 
              : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3">
             <span className="text-3xl leading-none">🇻🇳</span>
             <span>베트남어 카드 발송하기</span>
          </div>
          <svg viewBox="0 0 24 24" className="w-[20px] h-[20px] fill-current opacity-60">
            <path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.6 6.5l-1.3 4.4c-.1.4.3.7.6.5l5.2-3.4c2.9.2 5.9-1.2 5.9-1.2 2.8-1.3 4.6-3.7 4.6-6.5C22 6.5 17.5 3 12 3" />
          </svg>
        </button>

        {/* 한국어 버튼 */}
        <button 
          onClick={handleShareKR}
          disabled={!isLoaded}
          className={`w-full py-4 px-6 text-[17px] font-bold rounded-xl transition-all shadow-md flex items-center justify-between border ${
            isLoaded 
              ? 'bg-[#FEE500] border-[#FEE500] text-[#000000] hover:bg-[#E5CD00]' 
              : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3">
             <span className="text-3xl leading-none">🇰🇷</span>
             <span>한국어 카드 발송하기</span>
          </div>
          <svg viewBox="0 0 24 24" className="w-[20px] h-[20px] fill-current opacity-60">
            <path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.6 6.5l-1.3 4.4c-.1.4.3.7.6.5l5.2-3.4c2.9.2 5.9-1.2 5.9-1.2 2.8-1.3 4.6-3.7 4.6-6.5C22 6.5 17.5 3 12 3" />
          </svg>
        </button>
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-gray-500 text-center leading-relaxed">
          원하시는 언어의 버튼을 클릭하면, 각각의 언어에 맞게 번역된 <b>카카오 메시지 카드</b>가 생성되어 카카오톡으로 전송됩니다.<br/><br/>
          (추후 소스코드 내의 <code>imageUrl</code>에 각각 한글/베트남어 전단지 사진 주소를 다르게 넣어주시면 더욱 완벽합니다.)
        </p>
      </div>
    </>
  );
}
