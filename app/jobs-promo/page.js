export async function generateMetadata({ searchParams }) {
  const resolvedParams = await searchParams;
  const lang = resolvedParams?.lang || 'VN';
  const imgUrl = resolvedParams?.img || 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop';
  const isVN = lang === 'VN';

  const title = isVN ? '🚨 VIỆC LÀM TỐT TẠI CÔNG TY HÀN QUỐC' : '🚨 검증된 우수 한국 기업 채용!';
  const description = isVN 
    ? 'Được vận hành bởi Tạp chí uy tín 25 năm. Tiến cử trực tiếp, lương cao, và bảo mật 100% hồ sơ của bạn!'
    : '신뢰의 25년 - 씬짜오베트남. 이력서를 안전하게 보관하고 검증된 기업에만 매칭해 드립니다!';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/jobs-promo?lang=${lang}`,
      siteName: 'Xin Chao Vietnam',
      images: [
        {
          url: imgUrl,
          width: 800,
          height: 600,
          alt: 'Promo Banner',
        },
      ],
      locale: isVN ? 'vi_VN' : 'ko_KR',
      type: 'website',
    },
  };
}

export default async function JobsPromoPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const lang = resolvedParams?.lang || 'VN';
  const isVN = lang === 'VN';

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', fontFamily: '"Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: '500px', width: '100%', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* 상단 헤더 */}
        <div style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', padding: '30px 20px', textAlign: 'center', color: 'white' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', lineHeight: '1.3' }}>
            {isVN ? 'CỘNG ĐỒNG VIỆC LÀM' : '베트남 한인 취업 커뮤니티'}<br/>XIN CHÀO VIỆT NAM
          </h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '15px', opacity: 0.9 }}>
            {isVN ? 'Kết nối trực tiếp Doanh nghiệp Hàn Quốc' : '검증된 한국 기업과 다이렉트 매칭'}
          </p>
        </div>

        {/* 본문 버튼 영역 */}
        <div style={{ padding: '30px 20px' }}>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '15px', marginBottom: '30px', lineHeight: '1.5' }}>
            {isVN 
              ? 'Vui lòng chọn nhóm trò chuyện bạn muốn tham gia bên dưới.' 
              : '아래 원하시는 목적의 오픈채팅방을 선택해 주세요.'}
          </p>
          
          <a href="https://open.kakao.com/o/gQxdgSji" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', background: '#FEE500', color: '#000', padding: '18px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px', marginBottom: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
             <span style={{ fontSize: '22px', marginRight: '15px' }}>🔥</span> 
             <span style={{ flex: 1, textAlign: 'center', paddingRight: '37px' }}>
               {isVN ? 'NHÓM VIỆC LÀM (HOT)' : '구인/구직 (HOT)'}
             </span>
          </a>
          
          <a href="https://open.kakao.com/o/gDITUGji" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', color: '#333', padding: '18px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px', marginBottom: '15px' }}>
             <span style={{ fontSize: '22px', marginRight: '15px' }}>🛒</span> 
             <span style={{ flex: 1, textAlign: 'center', paddingRight: '37px' }}>
               {isVN ? 'MUA BÁN & RAO VẶT' : '당근/나눔 방 접속'}
             </span>
          </a>

          <a href="https://open.kakao.com/o/g4dOjSji" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', color: '#333', padding: '18px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px' }}>
             <span style={{ fontSize: '22px', marginRight: '15px' }}>🏠</span> 
             <span style={{ flex: 1, textAlign: 'center', paddingRight: '37px' }}>
               {isVN ? 'THUÊ / CHO THUÊ (Nhà Đất)' : '임대 / 부동산 관리'}
             </span>
          </a>
        </div>
      </div>
    </div>
  );
}
