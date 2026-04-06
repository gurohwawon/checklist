// ============================================================
//  서울시 외로움 및 고립위험 체크리스트 — 메인 로직
//  판별 기준: 체크리스트 원문 준수
// ============================================================

// ── 상태 ──────────────────────────────────────────────────
let currentStep = 0;
let needsCrisisSection = false; // 위기상황 섹션 진입 여부

// Google Apps Script 웹앱 엔드포인트 (배포 후 교체)
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz5X38sqo4OkQRC3yWKMoa5G2VkYXnfiQjeSJPhRQOKjZdMmRUAjG2gldSzTiu3Q1zM/exec';

const TOTAL_STEPS = 6; // 0~6

// ── 진행바 ────────────────────────────────────────────────
function updateProgress(step) {
  const pct = (step / TOTAL_STEPS) * 100;
  document.getElementById('progressBar').style.width = pct + '%';
}

// ── 스텝 이동 ─────────────────────────────────────────────
function goStep(n) {
  try {
    if (n === 5) {
      // 동의서 날짜 표시
      try {
        const now = new Date();
        const dateStr = now.getFullYear() + '년 ' + (now.getMonth()+1) + '월 ' + now.getDate() + '일';
        const dateEl = document.getElementById('consentDateDisplay');
        if (dateEl) dateEl.textContent = dateStr;
      } catch(e) {}

      // 만 14세 미만 체크
      try {
        const age = getCalcAge();
        const guardianBlock = document.getElementById('guardianSignBlock');
        if (guardianBlock) {
          if (age !== '' && Number(age) < 14) {
            guardianBlock.style.display = 'block';
            try { initGuardianSignature(); } catch(e) {}
          } else {
            guardianBlock.style.display = 'none';
          }
        }
      } catch(e) {}
    }

    document.getElementById('step-' + currentStep).classList.remove('active');
    currentStep = n;
    document.getElementById('step-' + currentStep).classList.add('active');
    updateProgress(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch(e) {
    // 오류가 나도 강제로 이동
    console.error('goStep error:', e);
    try {
      document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
      document.getElementById('step-' + n).classList.add('active');
      currentStep = n;
    } catch(e2) {}
  }
}

// ── 토스트 알림 ───────────────────────────────────────────
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── STEP 1 유효성 검사 ────────────────────────────────────
function validateStep1() {
  const name    = document.getElementById('name').value.trim();
  const birth   = document.getElementById('birth').value.trim();
  const gender  = document.querySelector('input[name="gender"]:checked');
  const addrDong   = document.getElementById('addrDong').value;
  const addrStreet  = document.getElementById('addressStreet').value.trim();
  const address = document.getElementById('address').value.trim();
  const phone   = document.getElementById('phone').value.trim();
  const household = document.getElementById('household').value;
  const family  = document.querySelector('input[name="family"]:checked');
  const employment = document.getElementById('employment').value;
  const health  = document.getElementById('health').value;
  const housingType = document.getElementById('housingType').value;
  const housingOwn  = document.getElementById('housingOwn').value;
  const housingCond = document.getElementById('housingCond').value;
  const protectionChecked = document.querySelectorAll('input[name="protection"]:checked').length;

  if (!name)      return showToast('성명을 입력해 주세요.');
  if (!birth)     return showToast('생년월일을 입력해 주세요.');
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(birth)) return showToast('생년월일을 년.월.일 형식으로 입력해 주세요. 예: 1975.03.15');
  if (!gender)    return showToast('성별을 선택해 주세요.');
  if (!addrDong)  return showToast('동을 선택해 주세요.');
  if (!phone)     return showToast('휴대전화를 입력해 주세요.');
  if (!/^\d{3}-\d{3,4}-\d{4}$/.test(phone)) return showToast('전화번호를 올바른 형식으로 입력해 주세요. 예: 010-1234-5678');
  if (!household) return showToast('가구원수를 선택해 주세요.');
  if (!protectionChecked) return showToast('보호구분을 하나 이상 선택해 주세요.');
  if (!family)    return showToast('가족유무를 선택해 주세요.');
  if (!employment) return showToast('경제활동을 선택해 주세요.');
  if (!health)     return showToast('건강상태를 선택해 주세요.');
  if (!housingType) return showToast('주거유형을 선택해 주세요.');
  if (!housingOwn)  return showToast('보유형태를 선택해 주세요.');
  if (!housingCond) return showToast('주거환경을 선택해 주세요.');
  const userType = document.querySelector('input[name="userType"]:checked');
  if (!userType) return showToast('이용자 구분을 선택해 주세요.');

  goStep(2);
}

// ── 가족유무 토글 ─────────────────────────────────────────
function toggleFamilyExchange(show) {
  document.getElementById('familyExchangeGroup').style.display = show ? 'block' : 'none';
}

// ── STEP 2 유효성 검사 (관계 단절) ───────────────────────
function validateStep2() {
  const qs = ['q1_1','q1_2','q1_3','q1_4','q1_5'];
  for (const q of qs) {
    if (!document.querySelector(`input[name="${q}"]:checked`)) {
      const el = document.getElementById(q.replace('_', '-'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return showToast('모든 문항에 답해 주세요. (스크롤을 내려 확인해 주세요)');
    }
  }
  // 답변 시 카드 시각 표시
  qs.forEach(q => markAnswered(q));
  goStep(3);
}

// ── STEP 3 유효성 검사 (일상생활 관리) ───────────────────
function validateStep3() {
  const qs = ['q2_1','q2_2','q2_3','q2_4','q2_5','q2_6','q2_7'];
  for (const q of qs) {
    if (!document.querySelector(`input[name="${q}"]:checked`)) {
      const el = document.getElementById(q.replace('_', '-'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return showToast('모든 문항에 답해 주세요. (스크롤을 내려 확인해 주세요)');
    }
  }
  qs.forEach(q => markAnswered(q));

  // ── 중간 판별: 위기상황 섹션 진입 여부 결정 ──
  const rel = calcRelationScore();   // { loneliness, isolation, needHelp }
  const daily = calcDailyScore();    // { noCount, needHelp }

  needsCrisisSection = rel.needHelp && daily.needHelp;

  if (needsCrisisSection) {
    goStep(4); // 위기상황으로
  } else {
    goStep(5); // 개인정보 동의로
  }
}

// ── STEP 4 유효성 검사 (위기 상황) ───────────────────────
function validateStep4() {
  const qs = ['q3_1','q3_2','q3_3','q3_4','q3_5','q3_6'];
  // 디버그: 각 문항 선택 상태 확인
  const status = qs.map(q => {
    const checked = document.querySelector('input[name="' + q + '"]:checked');
    const all = document.querySelectorAll('input[name="' + q + '"]');
    return q + '=' + (checked ? checked.value : '미선택') + '(총' + all.length + '개)';
  });
  console.log('[step4 debug]', status.join(', '));

  for (const q of qs) {
    if (!document.querySelector('input[name="' + q + '"]:checked')) {
      const el = document.getElementById(q.replace('_', '-'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('미선택: ' + q + ' — 스크롤을 내려 모든 문항을 선택해 주세요.');
      return;
    }
  }
  qs.forEach(q => markAnswered(q));
  goStep(5);
}

// ── STEP 5 개인정보 동의 유효성 검사 ─────────────────────
function validateStep5() {
  const c1 = document.querySelector('input[name="consent1"]:checked');
  const c2 = document.querySelector('input[name="consent2"]:checked');
  const c3 = document.querySelector('input[name="consent3"]:checked');
  const c4 = document.querySelector('input[name="consent4"]:checked');
  const cf = document.getElementById('consentFinal').checked;

  if (!c1) return showToast('기본 개인정보 수집·이용 동의를 선택해 주세요.');
  if (!c2) return showToast('선택정보 및 민감정보 동의를 선택해 주세요.');
  if (!c3) return showToast('개인정보 제3자 제공 동의를 선택해 주세요.');
  if (!c4) return showToast('서울시복지재단 제공 동의를 선택해 주세요.');
  if (!cf) return showToast('안내받았음을 확인해 주세요.');
  if (!hasSigned) return showToast('서명을 해주세요.');

  goStep(6);
}

// ── 이전 버튼 (동의 → 위기 or 일상) ─────────────────────
function goConsentBack() {
  if (needsCrisisSection) goStep(4);
  else goStep(3);
}

// ── 점수 계산 ──────────────────────────────────────────────

// 관계 단절 상황
function calcRelationScore() {
  const l1 = parseInt(document.querySelector('input[name="q1_1"]:checked')?.value || 0);
  const l2 = parseInt(document.querySelector('input[name="q1_2"]:checked')?.value || 0);
  const l3 = parseInt(document.querySelector('input[name="q1_3"]:checked')?.value || 0);
  const i4 = parseInt(document.querySelector('input[name="q1_4"]:checked')?.value || 0);
  const i5 = parseInt(document.querySelector('input[name="q1_5"]:checked')?.value || 0);

  const loneliness  = l1 + l2 + l3;   // 최대 9점
  const isolation   = i4 + i5;         // 최대 2점
  const needHelp    = loneliness >= 5 && isolation >= 1;

  return { loneliness, isolation, needHelp };
}

// 일상생활 관리 상황
function calcDailyScore() {
  const names = ['q2_1','q2_2','q2_3','q2_4','q2_5','q2_6','q2_7'];
  let noCount = 0;
  names.forEach(n => {
    if (document.querySelector(`input[name="${n}"]:checked`)?.value === 'no') noCount++;
  });
  const needHelp = noCount >= 2;
  return { noCount, needHelp };
}

// 위기 상황
function calcCrisisScore() {
  const urgentNames = ['q3_2','q3_3'];           // ★ 긴급 2문항
  const generalNames = ['q3_1','q3_4','q3_5','q3_6']; // 일반 4문항

  let urgentYes  = 0;
  let generalYes = 0;

  urgentNames.forEach(n => {
    if (document.querySelector(`input[name="${n}"]:checked`)?.value === 'yes') urgentYes++;
  });
  generalNames.forEach(n => {
    if (document.querySelector(`input[name="${n}"]:checked`)?.value === 'yes') generalYes++;
  });

  const isUrgentCrisis  = urgentYes >= 1;                  // 긴급위기군
  const isGeneralCrisis = generalYes >= 2 && !isUrgentCrisis; // 집중관리군

  return { urgentYes, generalYes, isUrgentCrisis, isGeneralCrisis };
}

// ── 유형 판별 ──────────────────────────────────────────────
function determineType(rel, daily, crisis) {
  if (!rel.needHelp && !daily.needHelp) {
    return { code: 'normal', name: '일반시민', color: '#4CAF50', bg: '#E8F5E9',
      desc: '현재 관계망과 일상생활이 비교적 양호한 상태입니다.',
      service: '외로움과 고립 위험에 대한 인식을 넓히는 예방적 서비스 안내를 받으실 수 있습니다.'};
  }
  if (rel.needHelp && !daily.needHelp) {
    return { code: 'relation', name: '관계지원군', color: '#1976D2', bg: '#E3F2FD',
      desc: '관계 단절 상황만 도움이 필요한 것으로 확인되었습니다. 사회적 지지 연계가 필요합니다.',
      service: '운동·문화·예술 등 서울시 관계망 서비스, 자조모임(1인가구지원센터), 생애주기모임(청년·50+·노인복지관), 서울연결처방 등을 연계해 드립니다.'};
  }
  if (!rel.needHelp && daily.needHelp) {
    return { code: 'daily', name: '일상지원군', color: '#0097A7', bg: '#E0F7FA',
      desc: '일상생활관리 상황만 도움이 필요한 것으로 확인되었습니다. 일상 돌봄 지원이 필요합니다.',
      service: '돌봄SOS서비스(식사·동행·주택관리), 일상돌봄서비스, 노인맞춤돌봄, 노인장기요양(방문요양), 스마트 안부확인 등을 연계해 드립니다.'};
  }
  // 두 영역 모두 도움필요
  if (!needsCrisisSection || (!crisis.isUrgentCrisis && !crisis.isGeneralCrisis)) {
    return { code: 'isolated', name: '일상위험고립군', color: '#F57C00', bg: '#FFF3E0',
      desc: '관계 단절과 일상생활관리 두 영역 모두 도움이 필요한 상태입니다. 통합적인 서비스 연계가 필요합니다.',
      service: '서울연결처방, 일상회복(식사·재정·수면패턴관리), 자기돌봄(위생·건강관리), 관계은둔(대인·외출), 특화돌봄 서비스(돌봄SOS·복지관) 등을 연계해 드립니다.'};
  }
  if (crisis.isUrgentCrisis) {
    return { code: 'emergency', name: '긴급위기군', color: '#C62828', bg: '#FFEBEE',
      desc: '고독사 위험, 자살 위험 등 생명 안전과 관련된 긴급 상황이 확인되었습니다. 즉각적인 지원이 필요합니다.',
      service: '정신건강 상담 및 치료 우선 지원, 은둔 거부 맞춤형지원사업, 응급대응(입원 등), 긴급지원, 우리동네돌봄단 모니터링 등을 연계해 드립니다.'};
  }
  return { code: 'intensive', name: '집중관리군', color: '#7B1FA2', bg: '#F3E5F5',
    desc: '자기방임 등 위기상황이 염려되는 상태로 장기적인 모니터링이 필요합니다.',
    service: '은둔 거부 맞춤형지원사업, 서울연결처방, 은둔청년지원, 우리동네돌봄단 모니터링, 통합사례관리, 자원연계 등을 연계해 드립니다.'};
}

// ── 문항 답변 시각화 ──────────────────────────────────────
function markAnswered(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  if (!checked) return;
  const item = checked.closest('.question-item');
  if (item) item.classList.add('answered');
}

// ── 라디오 변경 시 자동 시각화 ───────────────────────────
document.addEventListener('change', function(e) {
  if (e.target.type === 'radio') {
    const item = e.target.closest('.question-item');
    if (item) item.classList.add('answered');
  }
});

// ── 폼 제출 ───────────────────────────────────────────────

// ── 욕구내용 제출 ──────────────────────────────────────────
function submitNeeds() {
  const checked = [...document.querySelectorAll('input[name="needs"]:checked')].map(c => c.value);
  if (checked.length === 0) return showToast('필요한 서비스를 1개 이상 선택해 주세요.');
  const needsValue = checked.join(', ');

  // 구글 시트 욕구내용 전송
  if (SHEET_ENDPOINT && SHEET_ENDPOINT !== 'YOUR_APPS_SCRIPT_ENDPOINT_HERE') {
    const name   = document.getElementById('name').value.trim();
    const birth  = document.getElementById('birth').value.trim();
    const gender = document.querySelector('input[name="gender"]:checked')?.value || '';
    const dong   = document.getElementById('addrDong')?.value || '';
    const phone  = document.getElementById('phone').value.trim();
    const age    = getCalcAge();
    const resultType = document.getElementById('resultTypeBox')?.dataset?.code || window._lastResultType || '';

    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'needs',
        submittedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        name, birth, age, gender, dong, phone,
        resultType,
        needs: needsValue
      })
    }).catch(err => console.warn('욕구 전송 오류:', err));
  }

  submitForm();
}

function submitForm() {
  const rel    = calcRelationScore();
  const daily  = calcDailyScore();
  const crisis = needsCrisisSection ? calcCrisisScore() : { urgentYes: 0, generalYes: 0, isUrgentCrisis: false, isGeneralCrisis: false };
  const type   = determineType(rel, daily, crisis);

  // 보호구분 체크박스 값 수집
  const protectionChecked = [...document.querySelectorAll('input[name="protection"]:checked')].map(c => c.value);

  // 데이터 패키지
  const payload = {
    // 기본 현황
    name:         document.getElementById('name').value.trim(),
    birth:        document.getElementById('birth').value.trim(),
    gender:       document.querySelector('input[name="gender"]:checked')?.value || '',
    dong:         document.getElementById('addrDong')?.value || '',
    age:          getCalcAge(),
    address:      document.getElementById('address').value.trim(),
    phone:        document.getElementById('phone').value.trim(),
    household:    document.getElementById('household').value,
    protection:   protectionChecked.join(', '),
    family:       document.querySelector('input[name="family"]:checked')?.value || '',
    familyExchange: document.querySelector('input[name="familyExchange"]:checked')?.value || '-',
    employment:   document.getElementById('employment').value,
    health:       document.getElementById('health').value,
    housingType:  document.getElementById('housingType').value,
    housingOwn:   document.getElementById('housingOwn').value,
    housingCond:  document.getElementById('housingCond').value,
    userType:     document.querySelector('input[name="userType"]:checked')?.value || '',

    // 관계 단절 점수
    q1_1: document.querySelector('input[name="q1_1"]:checked')?.value || '',
    q1_2: document.querySelector('input[name="q1_2"]:checked')?.value || '',
    q1_3: document.querySelector('input[name="q1_3"]:checked')?.value || '',
    q1_4: document.querySelector('input[name="q1_4"]:checked')?.value || '',
    q1_5: document.querySelector('input[name="q1_5"]:checked')?.value || '',
    lonelinessScore: rel.loneliness,
    isolationScore:  rel.isolation,
    relationNeedHelp: rel.needHelp ? '도움필요' : '해당없음',

    // 일상생활 점수
    q2_1: document.querySelector('input[name="q2_1"]:checked')?.value || '',
    q2_2: document.querySelector('input[name="q2_2"]:checked')?.value || '',
    q2_3: document.querySelector('input[name="q2_3"]:checked')?.value || '',
    q2_4: document.querySelector('input[name="q2_4"]:checked')?.value || '',
    q2_5: document.querySelector('input[name="q2_5"]:checked')?.value || '',
    q2_6: document.querySelector('input[name="q2_6"]:checked')?.value || '',
    q2_7: document.querySelector('input[name="q2_7"]:checked')?.value || '',
    dailyNoCount:   daily.noCount,
    dailyNeedHelp:  daily.needHelp ? '도움필요' : '해당없음',

    // 위기 상황 (해당 시)
    q3_1: needsCrisisSection ? (document.querySelector('input[name="q3_1"]:checked')?.value || '') : '-',
    q3_2: needsCrisisSection ? (document.querySelector('input[name="q3_2"]:checked')?.value || '') : '-',
    q3_3: needsCrisisSection ? (document.querySelector('input[name="q3_3"]:checked')?.value || '') : '-',
    q3_4: needsCrisisSection ? (document.querySelector('input[name="q3_4"]:checked')?.value || '') : '-',
    q3_5: needsCrisisSection ? (document.querySelector('input[name="q3_5"]:checked')?.value || '') : '-',
    q3_6: needsCrisisSection ? (document.querySelector('input[name="q3_6"]:checked')?.value || '') : '-',
    crisisUrgentYes:  crisis.urgentYes,
    crisisGeneralYes: crisis.generalYes,

    // 개인정보 동의
    consent1: document.querySelector('input[name="consent1"]:checked')?.value || '',
    consent2: document.querySelector('input[name="consent2"]:checked')?.value || '',
    consent3: document.querySelector('input[name="consent3"]:checked')?.value || '',
    consent4: document.querySelector('input[name="consent4"]:checked')?.value || '',

    // 판별 결과
    resultType: type.name,
    resultCode: type.code,
    submittedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),

    // 자필 서명 (base64 이미지)
    signatureImage: (function() {
      const canvas = document.getElementById('signatureCanvas');
      return canvas ? canvas.toDataURL('image/png') : '';
    })(),

    // 보호자(만 14세 미만)
    guardianName: document.getElementById('guardianName')?.value.trim() || '',
    guardianRelation: document.getElementById('guardianRelation')?.value || '',
    guardianSignatureImage: (function() {
      const canvas = document.getElementById('guardianSignatureCanvas');
      if (!canvas) return '';
      // 보호자 서명이 있을 때만
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const hasContent = Array.from(data).some((v, i) => i % 4 === 3 && v > 0);
      return hasContent ? canvas.toDataURL('image/png') : '';
    })()
  };

  // 구글 시트로 전송 (엔드포인트 설정된 경우)
  if (SHEET_ENDPOINT && SHEET_ENDPOINT !== 'YOUR_APPS_SCRIPT_ENDPOINT_HERE') {
    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.warn('시트 전송 오류:', err));
  }

  // 결과 화면 렌더링 후 이동
  renderResult(type, rel, daily, crisis);
  goStep(7);
}

// ── 결과 화면 렌더링 ──────────────────────────────────────
function renderResult(type, rel, daily, crisis) {
  // 유형 박스
  window._lastResultType = type.name;
  const typeBox = document.getElementById('resultTypeBox');
  typeBox.style.background  = type.bg;
  typeBox.style.border      = `1.5px solid ${type.color}40`;
  typeBox.innerHTML = `
    <div class="result-type-title" style="color:${type.color}">판별 유형</div>
    <div class="result-type-name" style="color:${type.color}">${type.name}</div>
    <div class="result-type-desc" style="color:#3D3D3D">${type.desc}</div>
  `;

  // 점수 칩
  const scoresEl = document.getElementById('resultScores');
  let crisisHtml = '';
  if (needsCrisisSection) {
    crisisHtml = `
      <div class="score-chip">
        <div class="score-chip-label">위기상황</div>
        <div class="score-chip-value" style="color:${crisis.isUrgentCrisis ? '#C62828' : crisis.isGeneralCrisis ? '#7B1FA2' : '#4CAF50'}">${crisis.urgentYes + crisis.generalYes}개</div>
        <div class="score-chip-sub">그렇다 응답</div>
      </div>`;
  }
  scoresEl.innerHTML = `
    <div class="score-chip">
      <div class="score-chip-label">외로움 점수</div>
      <div class="score-chip-value">${rel.loneliness}점</div>
      <div class="score-chip-sub">기준 5점 이상</div>
    </div>
    <div class="score-chip">
      <div class="score-chip-label">사회적 고립</div>
      <div class="score-chip-value">${rel.isolation}점</div>
      <div class="score-chip-sub">기준 1점 이상</div>
    </div>
    <div class="score-chip">
      <div class="score-chip-label">일상관리</div>
      <div class="score-chip-value">${daily.noCount}개</div>
      <div class="score-chip-sub">아니다 응답 수</div>
    </div>
    ${crisisHtml}
  `;

  // 서비스 안내
  document.getElementById('resultService').innerHTML = `
    <div class="result-service-title">연계 서비스 안내</div>
    <div class="result-service-list">${type.service}</div>
  `;

  // 긴급 위기 공지
  if (crisis.isUrgentCrisis) {
    document.getElementById('resultCrisisNotice').style.display = 'block';
  }
}

// ============================================================
//  자필 서명 패드
// ============================================================

let isDrawing = false;
let lastX = 0, lastY = 0;
let hasSigned = false;
let ctx = null;

function initSignature() {
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  // 캔버스 실제 크기 설정 (선명도 유지)
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth || 560;
  const h = 160;
  canvas.width  = w * window.devicePixelRatio;
  canvas.height = h * window.devicePixelRatio;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';

  ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth   = 2.2;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  // 마우스 이벤트
  canvas.addEventListener('mousedown',  startDraw);
  canvas.addEventListener('mousemove',  draw);
  canvas.addEventListener('mouseup',    endDraw);
  canvas.addEventListener('mouseleave', endDraw);

  // 터치 이벤트 (모바일)
  canvas.addEventListener('touchstart',  e => { e.preventDefault(); startDraw(e.touches[0]); }, { passive: false });
  canvas.addEventListener('touchmove',   e => { e.preventDefault(); draw(e.touches[0]); },      { passive: false });
  canvas.addEventListener('touchend',    e => { e.preventDefault(); endDraw(); },                { passive: false });
}

function getPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX || e.pageX) - rect.left,
    y: (e.clientY || e.pageY) - rect.top
  };
}

function startDraw(e) {
  const canvas = document.getElementById('signatureCanvas');
  isDrawing = true;
  const pos = getPos(e, canvas);
  lastX = pos.x; lastY = pos.y;
  canvas.parentElement.classList.add('active');
}

function draw(e) {
  if (!isDrawing || !ctx) return;
  const canvas = document.getElementById('signatureCanvas');
  const pos = getPos(e, canvas);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  lastX = pos.x; lastY = pos.y;
  hasSigned = true;
  canvas.parentElement.classList.add('has-sig');
  document.getElementById('sigStatus').textContent = '서명 완료';
}

function endDraw() {
  isDrawing = false;
  const canvas = document.getElementById('signatureCanvas');
  if (canvas) canvas.parentElement.classList.remove('active');
}

function clearSignature() {
  if (!ctx) return;
  const canvas = document.getElementById('signatureCanvas');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSigned = false;
  canvas.parentElement.classList.remove('has-sig');
  document.getElementById('sigStatus').textContent = '';
}

// step-5 진입 시 서명 패드 초기화
document.addEventListener('DOMContentLoaded', function() {
  // goStep 오버라이드: step-5 진입 시 서명 패드 초기화
  const _orig = window.goStep;
  window.goStep = function(n) {
    _orig(n);
    if (n === 5) setTimeout(initSignature, 150);
  };
});

// ============================================================
//  인쇄 페이지 열기 (인라인 오버레이 방식 — 팝업/URL 제한 없음)
// ============================================================
function openPrintPage() {
  const rel   = calcRelationScore();
  const daily = calcDailyScore();
  const crisis = needsCrisisSection
    ? calcCrisisScore()
    : { urgentYes:0, generalYes:0, isUrgentCrisis:false, isGeneralCrisis:false };
  const type  = determineType(rel, daily, crisis);

  const protectionChecked = [...document.querySelectorAll('input[name="protection"]:checked')].map(c => c.value);
  const canvas = document.getElementById('signatureCanvas');

  const d = {
    name:         document.getElementById('name').value.trim(),
    birth:        document.getElementById('birth').value.trim(),
    gender:       document.querySelector('input[name="gender"]:checked')?.value || '',
    dong:         document.getElementById('addrDong')?.value || '',
    age:          getCalcAge(),
    address:      document.getElementById('address').value.trim(),
    phone:        document.getElementById('phone').value.trim(),
    household:    document.getElementById('household').value,
    protection:   protectionChecked.join(', '),
    family:       document.querySelector('input[name="family"]:checked')?.value || '',
    familyExchange: document.querySelector('input[name="familyExchange"]:checked')?.value || '-',
    employment:   document.getElementById('employment').value,
    health:       document.getElementById('health').value,
    housingType:  document.getElementById('housingType').value,
    housingOwn:   document.getElementById('housingOwn').value,
    housingCond:  document.getElementById('housingCond').value,
    userType:     document.querySelector('input[name="userType"]:checked')?.value || '',
    serviceWill:  document.querySelector('input[name="serviceWill"]:checked')?.value || '',
    q1_1: document.querySelector('input[name="q1_1"]:checked')?.value || '',
    q1_2: document.querySelector('input[name="q1_2"]:checked')?.value || '',
    q1_3: document.querySelector('input[name="q1_3"]:checked')?.value || '',
    q1_4: document.querySelector('input[name="q1_4"]:checked')?.value || '',
    q1_5: document.querySelector('input[name="q1_5"]:checked')?.value || '',
    lonelinessScore:  rel.loneliness,
    isolationScore:   rel.isolation,
    relationNeedHelp: rel.needHelp ? '도움필요' : '해당없음',
    q2_1: document.querySelector('input[name="q2_1"]:checked')?.value || '',
    q2_2: document.querySelector('input[name="q2_2"]:checked')?.value || '',
    q2_3: document.querySelector('input[name="q2_3"]:checked')?.value || '',
    q2_4: document.querySelector('input[name="q2_4"]:checked')?.value || '',
    q2_5: document.querySelector('input[name="q2_5"]:checked')?.value || '',
    q2_6: document.querySelector('input[name="q2_6"]:checked')?.value || '',
    q2_7: document.querySelector('input[name="q2_7"]:checked')?.value || '',
    dailyNoCount:  daily.noCount,
    dailyNeedHelp: daily.needHelp ? '도움필요' : '해당없음',
    q3_1: needsCrisisSection ? (document.querySelector('input[name="q3_1"]:checked')?.value || '') : '-',
    q3_2: needsCrisisSection ? (document.querySelector('input[name="q3_2"]:checked')?.value || '') : '-',
    q3_3: needsCrisisSection ? (document.querySelector('input[name="q3_3"]:checked')?.value || '') : '-',
    q3_4: needsCrisisSection ? (document.querySelector('input[name="q3_4"]:checked')?.value || '') : '-',
    q3_5: needsCrisisSection ? (document.querySelector('input[name="q3_5"]:checked')?.value || '') : '-',
    q3_6: needsCrisisSection ? (document.querySelector('input[name="q3_6"]:checked')?.value || '') : '-',
    crisisUrgentYes:  crisis.urgentYes,
    crisisGeneralYes: crisis.generalYes,
    consent1: document.querySelector('input[name="consent1"]:checked')?.value || '',
    consent2: document.querySelector('input[name="consent2"]:checked')?.value || '',
    consent3: document.querySelector('input[name="consent3"]:checked')?.value || '',
    consent4: document.querySelector('input[name="consent4"]:checked')?.value || '',
    resultType:     type.name,
    signatureImage: canvas ? canvas.toDataURL('image/png') : ''
  };

  // 공통 렌더링 함수 호출 (print-render.js)
  renderPrintData(d);

  // 날짜 표시
  const now = new Date();
  const dateEl = document.getElementById('po_date_row');
  if (dateEl) {
    dateEl.textContent = now.getFullYear() + ' 년  ' + (now.getMonth()+1) + ' 월  ' + now.getDate() + ' 일';
    dateEl.style.textAlign = 'right';
    dateEl.style.fontSize = '9pt';
    dateEl.style.margin = '8pt 0 4pt';
  }

  // 보호자 서명 (만 14세 미만인 경우)
  const guardianBlock = document.getElementById('guardianSignBlock');
  const poGuardianField = document.getElementById('po_guardian_field');
  if (guardianBlock && poGuardianField) {
    const isMinor = guardianBlock.style.display !== 'none';
    poGuardianField.style.display = isMinor ? '' : 'none';
    if (isMinor) {
      const gCanvas = document.getElementById('guardianSignatureCanvas');
      const gImg    = document.getElementById('po_guardian_sig_img');
      const gNameEl = document.getElementById('po_guardian_name_label');
      const gName   = document.getElementById('guardianName')?.value.trim() || '법정대리인';
      const gRel    = document.getElementById('guardianRelation')?.value || '';
      if (gNameEl) gNameEl.textContent = gName + (gRel ? ' (' + gRel + ')' : '');
      if (gImg && gCanvas && !isCanvasBlank(gCanvas)) {
        gImg.src = gCanvas.toDataURL('image/png');
        gImg.style.display = 'block';
      }
    }
  }

  // 오버레이 표시
  document.getElementById('printOverlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
  document.getElementById('printOverlay').scrollTop = 0;
}


// setText 헬퍼 (오버레이 요소용)
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ============================================================
//  인쇄 오버레이 닫기
// ============================================================
function closePrintOverlay() {
  document.getElementById('printOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

// ============================================================
//  생년월일 자동 포맷 (년.월.일)
// ============================================================
function formatBirth(input) {
  let v = input.value.replace(/[^0-9]/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  let result = '';
  if (v.length <= 4) {
    result = v;
  } else if (v.length <= 6) {
    result = v.slice(0,4) + '.' + v.slice(4);
  } else {
    result = v.slice(0,4) + '.' + v.slice(4,6) + '.' + v.slice(6);
  }
  input.value = result;
}

// ============================================================
//  만 나이 자동 계산
// ============================================================
function calcAge() {
  let val = document.getElementById('birth').value.trim();
  const display = document.getElementById('ageDisplay');
  if (!display) return;
  let y, m, d;
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(val)) {
    [y, m, d] = val.split('.').map(Number);
  } else if (/^\d{8}$/.test(val)) {
    y = parseInt(val.slice(0,4)); m = parseInt(val.slice(4,6)); d = parseInt(val.slice(6,8));
  } else {
    display.style.display = 'none';
    return;
  }
  const today = new Date();
  const ty = today.getFullYear(), tm = today.getMonth() + 1, td = today.getDate();
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age--;
  if (age < 0 || age > 120) { display.style.display = 'none'; return; }
  display.textContent = '만 ' + age + '세';
  display.style.display = 'inline-block';
  return age;
}

function getCalcAge() {
  let val = document.getElementById('birth').value.trim();
  let y, m, d;
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(val)) {
    // 1975.03.15 형식
    [y, m, d] = val.split('.').map(Number);
  } else if (/^\d{8}$/.test(val)) {
    // 19750315 형식 (숫자만)
    y = parseInt(val.slice(0,4)); m = parseInt(val.slice(4,6)); d = parseInt(val.slice(6,8));
  } else {
    return '';
  }
  const today = new Date();
  const ty = today.getFullYear(), tm = today.getMonth() + 1, td = today.getDate();
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age--;
  return (age >= 0 && age <= 120) ? age : '';
}


// ============================================================
//  전화번호 자동 하이픈
// ============================================================
function formatPhone(input) {
  let v = input.value.replace(/[^0-9]/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  let result = '';
  if (v.startsWith('02')) {
    if (v.length <= 2) result = v;
    else if (v.length <= 6) result = v.slice(0,2) + '-' + v.slice(2);
    else result = v.slice(0,2) + '-' + v.slice(2,6) + '-' + v.slice(6);
  } else {
    if (v.length <= 3) result = v;
    else if (v.length <= 7) result = v.slice(0,3) + '-' + v.slice(3);
    else result = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7);
  }
  input.value = result;
}

// ============================================================
//  주소 입력: 시/도 → 시/군/구 드롭다운
// ============================================================




// ============================================================
//  구로구 주소 자동완성
// ============================================================

function syncConsent1(radio) {
  const radios = document.querySelectorAll('input[name="consent1"]');
  radios.forEach(r => { r.checked = (r.value === radio.value); });
}

// ============================================================
//  주소 필드 조합 (서울특별시 구로구 + 동 + 도로/지번 + 상세)
// ============================================================
function updateAddressField() {
  const dong    = document.getElementById('addrDong')?.value || '';
  const street  = document.getElementById('addressStreet')?.value.trim() || '';
  const detail  = document.getElementById('addressDetail')?.value.trim() || '';

  const parts = ['서울특별시 구로구'];
  if (dong)   parts.push(dong);
  if (street) parts.push(street);
  if (detail) parts.push(detail);

  const full = parts.join(' ');

  // hidden 필드 업데이트
  const hiddenAddr = document.getElementById('address');
  if (hiddenAddr) hiddenAddr.value = full;

  // 미리보기
  const preview = document.getElementById('addrPreview');
  if (preview) {
    if (dong || street) {
      preview.textContent = '📍 ' + full;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  }
}


// ============================================================
//  관리자 비밀번호 확인 → 결과지 출력 버튼 표시
// ============================================================
function checkAdminPw() {
  const pw = prompt('관리자 비밀번호를 입력하세요:');
  if (pw === 'hwawon2025') {
    document.getElementById('adminPrintArea').style.display = 'block';
  } else if (pw !== null) {
    alert('비밀번호가 올바르지 않습니다.');
  }
}

// ============================================================
//  보호자 서명 패드
// ============================================================
function initGuardianSignature() {
  const canvas = document.getElementById('guardianSignatureCanvas');
  if (!canvas) return;
  if (canvas.dataset.initialized === 'true') return;
  canvas.dataset.initialized = 'true';

  const wrap = canvas.closest('.signature-wrap') || canvas.parentElement;
  canvas.width  = wrap.offsetWidth  || 320;
  canvas.height = wrap.offsetHeight || 160;

  const ctx = canvas.getContext('2d');
  let drawing = false, lastX = 0, lastY = 0;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }
  function start(e) {
    e.preventDefault(); drawing = true;
    const p = getPos(e); lastX = p.x; lastY = p.y;
  }
  function draw(e) {
    if (!drawing) return; e.preventDefault();
    const p = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    lastX = p.x; lastY = p.y;
  }
  function end() { drawing = false; }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', draw,  { passive: false });
  canvas.addEventListener('touchend', end);
}

function clearGuardianSignature() {
  const canvas = document.getElementById('guardianSignatureCanvas');
  if (!canvas) return;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  const status = document.getElementById('guardianSigStatus');
  if (status) status.textContent = '서명이 지워졌습니다.';
}
