export const metadata = {
  title: '🚨 VIỆC LÀM TỐT TẠI CÔNG TY HÀN QUỐC',
  description: 'Được vận hành bởi Tạp chí uy tín 25 năm. Tiến cử trực tiếp, lương cao, và bảo mật 100% hồ sơ của bạn!',
  openGraph: {
    title: '🚨 VIỆC LÀM TỐT TẠI CÔNG TY HÀN QUỐC',
    description: 'Tạp chí uy tín 25 năm. Tiến cử trực tiếp, lương cao, bảo mật 100% hồ sơ!',
    url: 'https://chaovietnam.co.kr/jobs-promo',
    siteName: 'Xin Chao Vietnam',
    images: [
      {
        // ★ 잘로(Zalo)나 페이스북에 링크를 붙여넣었을 때 뜨게 될 카드의 '메인 대표 사진' 주소입니다.
        // 추후에 원하시는 전단지 이미지 주소로 꼭 변경해 주세요!
        url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop',
        width: 800,
        height: 600,
        alt: 'Promo Banner',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
};

export default function JobsPromoPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', fontFamily: '"Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: '500px', width: '100%', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* 상단 헤더 */}
        <div style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', padding: '30px 20px', textAlign: 'center', color: 'white' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', lineHeight: '1.3' }}>CỘNG ĐỒNG VIỆC LÀM<br/>XIN CHÀO VIỆT NAM</h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '15px', opacity: 0.9 }}>Kết nối trực tiếp Doanh nghiệp Hàn Quốc</p>
        </div>

        {/* 본문 버튼 영역 */}
        <div style={{ padding: '30px 20px' }}>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '15px', marginBottom: '30px', lineHeight: '1.5' }}>
            Vui lòng chọn nhóm trò chuyện bạn muốn tham gia bên dưới.
            <br/>(아래 원하시는 목적의 채팅방을 선택해 주세요)
          </p>
          
          <a href="https://open.kakao.com/o/gQxdgSji" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', background: '#FEE500', color: '#000', padding: '18px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px', marginBottom: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
             <span style={{ fontSize: '22px', marginRight: '15px' }}>🔥</span> 
             <span style={{ flex: 1, textAlign: 'center', paddingRight: '37px' }}>NHÓM VIỆC LÀM (HOT)</span>
          </a>
          
          <a href="https://open.kakao.com/o/gDITUGji" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', color: '#333', padding: '18px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px', marginBottom: '15px' }}>
             <span style={{ fontSize: '22px', marginRight: '15px' }}>🛒</span> 
             <span style={{ flex: 1, textAlign: 'center', paddingRight: '37px' }}>MUA BÁN & RAO VẶT</span>
          </a>

          {/* 카카오링크(피드)에는 칸이 없어서 뺐던 부동산 방도 여기서는 무제한 넣을 수 있습니다! */}
          <a href="https://open.kakao.com/o/g4dOjSji" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', color: '#333', padding: '18px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px' }}>
             <span style={{ fontSize: '22px', marginRight: '15px' }}>🏠</span> 
             <span style={{ flex: 1, textAlign: 'center', paddingRight: '37px' }}>THUÊ / CHO THUÊ (Nhà Đất)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
