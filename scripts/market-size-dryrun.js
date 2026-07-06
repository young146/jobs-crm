// jobs-crm 시장 규모 측정 (Read-only) — 매일 매칭 이메일 가능성 진단
// candidates / Jobs 카운트 + 이메일 보유 비율 + 활성 데이터 비율

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'serviceAccount.json'), 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function main() {
  console.log('=== jobs-crm 시장 규모 dry-run ===\n');

  const candSnap = await db.collection('candidates').get();
  const jobsSnap = await db.collection('Jobs').get();

  console.log(`구직자(candidates) 전체: ${candSnap.size}건`);
  console.log(`채용공고(Jobs) 전체: ${jobsSnap.size}건\n`);

  let candWithEmail = 0;
  let candActive = 0;
  let candWithEmailActive = 0;
  let candStatusCounts = {};
  const candSamples = [];

  candSnap.forEach(doc => {
    const c = doc.data();
    const profile = c.profile || {};
    const email = profile.email || c.email || '';
    const status = c.status || c.profile?.status || 'unknown';
    candStatusCounts[status] = (candStatusCounts[status] || 0) + 1;
    if (email) candWithEmail++;
    // "활성" 정의: 명시적 status === 'active' 또는 status 필드 자체가 없음(기본=활성 가정)
    const isActive = !c.status || c.status === 'active' || c.status === 'open';
    if (isActive) {
      candActive++;
      if (email) candWithEmailActive++;
    }
    if (candSamples.length < 2) candSamples.push({
      id: doc.id,
      name: profile.name,
      hasEmail: !!email,
      status,
      hasAi: !!c.ai,
      jobTracks: (c.career?.jobTracks || c.career?.desiredJobTracks || []).slice(0, 3),
    });
  });

  let jobActive = 0;
  let jobStatusCounts = {};
  const jobSamples = [];
  jobsSnap.forEach(doc => {
    const j = doc.data();
    const status = j.status || 'unknown';
    jobStatusCounts[status] = (jobStatusCounts[status] || 0) + 1;
    const isActive = !j.status || j.status === 'active' || j.status === 'open';
    if (isActive) jobActive++;
    if (jobSamples.length < 2) jobSamples.push({
      id: doc.id,
      title: j.title,
      city: j.city,
      industry: j.industry,
      status,
    });
  });

  console.log('=== 구직자 통계 ===');
  console.log(`이메일 보유: ${candWithEmail}명 (${(candWithEmail/Math.max(candSnap.size,1)*100).toFixed(1)}%)`);
  console.log(`활성(추정): ${candActive}명`);
  console.log(`활성 + 이메일 보유: ${candWithEmailActive}명  ← 매일 매칭 이메일 발송 가능 인원`);
  console.log('상태 분포:', JSON.stringify(candStatusCounts));
  console.log('샘플:', JSON.stringify(candSamples, null, 2));

  console.log('\n=== 채용공고 통계 ===');
  console.log(`활성(추정): ${jobActive}건`);
  console.log('상태 분포:', JSON.stringify(jobStatusCounts));
  console.log('샘플:', JSON.stringify(jobSamples, null, 2));

  console.log('\n=== 매일 이메일 가능 규모 ===');
  console.log(`매일 매칭 발송 가능 구직자: ${candWithEmailActive}명`);
  console.log(`매칭 대상 채용공고: ${jobActive}건`);
  console.log(`기대 매칭 페어 (구직자 1명당 상위 5건): ${candWithEmailActive * Math.min(5, jobActive)}건`);
  console.log(`GPT-4o API 호출 비용 예상 (1매칭당 ~$0.005): $${(candWithEmailActive * 0.005).toFixed(2)}/일`);
}

main().catch(e => { console.error('❌', e.message); console.error(e.stack); process.exitCode = 1; });
