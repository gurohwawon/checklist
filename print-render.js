// ============================================================
//  공통 인쇄 렌더링 — index.html + admin.html 공유
//  renderPrintData(d) : 데이터 객체를 받아 인쇄 오버레이를 채움
// ============================================================

const SCORE_LABELS_13 = {'1':'(1점) 거의 없다','2':'(2점) 조금 그렇다','3':'(3점) 자주 그렇다'};
const SCORE_LABELS_45 = {'0':'(0점) 있다','1':'(1점) 없다'};

const Q2_LABELS = {
  q2_1:'(위생관리) 개인위생과 집안 청소 등 관리가 되고 있다.',
  q2_2:'(식사관리) 끼니를 거르거나 폭식하지 않고 꾸준히 식사관리를 한다.',
  q2_3:'(재정관리) 생활비, 용돈과 공과금 납부를 잘 관리한다.',
  q2_4:'(건강관리) 건강에 문제가 있을 때 병원도 가고 약도 잘 챙겨 먹는다.',
  q2_5:'(외출/은둔) 혼자 필요한 활동을 하거나 누군가를 만나기 위해 외출한다.',
  q2_6:'(대인관계) 다른 사람과 직접 만나서 대화하거나 교류한다.',
  q2_7:'(생활패턴) 일상생활이나 수면 패턴이 규칙적이다.'
};

const Q3_LABELS = [
  '장애나 만성적 질병이 있고 관리하고 있지 않다.',
  '돌봄 서비스 및 치료(입원)를 해야 하지만 이용하지 않거나 중단했다.',
  '나는 지난 1년간 심각하게 자살을 생각해 본 적이 있다.',
  '이혼, 사별 등 가까운 사람과의 이별로 고통 받았고 지금도 이어진다.',
  '실직, 실패, 사기피해, 파산, 채무불이행 등으로 고통 받았고 지금도 이어진다.',
  '치매, 중증질환 등으로 돌봄이 필요한 가족과 동거하고 전적으로 돌보고 있어서 힘들다.'
];

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '';
}

function renderPrintData(d) {
  // ── PAGE 1: 1-1 ~ 1-3 ──
  [['q1_1','po_q1_1'],['q1_2','po_q1_2'],['q1_3','po_q1_3']].forEach(([k,id]) => {
    const s = d[k] || '';
    _setText(id+'_ans',  s ? (SCORE_LABELS_13[s] || s) : '-');
    _setText(id+'_score', s || '-');
  });
  _setText('po_lonely_total', d.lonelinessScore ?? d['외로움점수(합계)'] ?? '-');

  // 1-4, 1-5
  [['q1_4','po_q1_4'],['q1_5','po_q1_5']].forEach(([k,id]) => {
    const s = d[k] || '';
    _setText(id+'_ans',  s !== '' ? (SCORE_LABELS_45[s] || s) : '-');
    _setText(id+'_score', s !== '' ? s : '-');
  });
  _setText('po_isolation_total', d.isolationScore ?? d['사회적고립점수(합계)'] ?? '-');

  // 관계 평가
  const relOk = (d.relationNeedHelp || d['관계단절_도움필요여부'] || '') === '도움필요';
  const relEl = document.getElementById('po_rel_eval');
  if (relEl) { relEl.textContent = relOk ? '☑ 도움필요' : '□ 해당없음'; relEl.style.color = relOk ? '#C00' : '#555'; }

  // 일상생활 7문항
  const dailyTbody = document.getElementById('po_daily_rows');
  if (dailyTbody) {
    dailyTbody.innerHTML = '';
    ['q2_1','q2_2','q2_3','q2_4','q2_5','q2_6','q2_7'].forEach((k, i) => {
      const rawKey = k; // 시트에서는 'q2_1' 형태 그대로
      const val = d[rawKey] || d[k.replace('_','-')] || '';
      const isYes = val === 'yes' || val === '그렇다';
      const isNo  = val === 'no'  || val === '아니다';
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="po-num">2-'+(i+1)+'</td>' +
        '<td>'+Q2_LABELS[k]+'</td>' +
        '<td style="text-align:center;background:'+(isYes?'#E8F5E9':'')+'">'+( isYes?'✔':'')+'</td>' +
        '<td style="text-align:center;background:'+(isNo ?'#FFEBEE':'')+'">'+( isNo ?'✔':'')+'</td>';
      dailyTbody.appendChild(tr);
    });
  }
  const dailyOk = (d.dailyNeedHelp || d['일상생활관리_도움필요여부'] || '') === '도움필요';
  const dailyEl = document.getElementById('po_daily_eval');
  if (dailyEl) { dailyEl.textContent = dailyOk ? '☑ 도움필요' : '□ 해당없음'; dailyEl.style.color = dailyOk ? '#C00' : '#555'; }

  // 위기 6문항
  const crisisTbody = document.getElementById('po_crisis_rows');
  if (crisisTbody) {
    crisisTbody.innerHTML = '';
    ['q3_1','q3_2','q3_3','q3_4','q3_5','q3_6'].forEach((k, i) => {
      const val = d[k] || '';
      const isYes = val === 'yes' || val === '그렇다';
      const isNo  = val === 'no'  || val === '아니다';
      const isDash = !val || val === '-';
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="po-num">3-'+(i+1)+'</td>' +
        '<td>'+Q3_LABELS[i]+'</td>' +
        (isDash
          ? '<td colspan="2" style="text-align:center;color:#aaa;">미진행</td>'
          : '<td style="text-align:center;background:'+(isYes?'#E8F5E9':'')+'">'+( isYes?'✔':'')+'</td>' +
            '<td style="text-align:center;background:'+(isNo ?'#FFEBEE':'')+'">'+( isNo ?'✔':'')+'</td>');
      crisisTbody.appendChild(tr);
    });
  }

  // 유형 판별 체크
  const typeMap = {
    '관계지원군':'po_type_rel','일상지원군':'po_type_daily',
    '일상위험고립군':'po_type_iso','집중관리군':'po_type_int','긴급위기군':'po_type_emg'
  };
  Object.values(typeMap).forEach(id => _setText(id, ''));
  const rType = d.resultType || d['판별유형'] || '';
  if (rType && typeMap[rType]) {
    const el = document.getElementById(typeMap[rType]);
    if (el) { el.textContent = '∨'; el.style.color = '#C00'; el.style.fontWeight = '700'; }
  }

  // ── PAGE 2: 기본현황 ──
  _setText('po_name',        d.name   || d['성명']   || '');
  _setText('po_birth',       d.birth  || d['생년월일'] || '');
  _setText('po_phone',       d.phone  || d['휴대전화'] || '');
  _setText('po_address',     d.address || d['주소'] || '');
  _setText('po_household',   d.household  || d['가구원수'] || '');
  _setText('po_employment',  d.employment || d['경제활동'] || '');
  _setText('po_health',      d.health     || d['건강상태'] || '');
  _setText('po_housing_type',d.housingType || d['주거유형'] || '');
  _setText('po_housing_own', d.housingOwn  || d['보유형태'] || '');
  _setText('po_housing_cond',d.housingCond || d['주거환경'] || '');
  _setText('po_protection',  d.protection  || d['보호구분'] || '');
  _setText('po_family',      d.family      || d['가족유무'] || '');
  _setText('po_family_exchange', d.familyExchange || d['가족교류여부'] || '-');

  // 성별 박스
  const g = d.gender || d['성별'] || '';
  const gEl = document.getElementById('po_gender');
  if (gEl) gEl.innerHTML =
    '<span style="display:inline-block;width:10pt;height:10pt;border:1px solid #000;text-align:center;line-height:10pt;font-size:8pt;margin-right:2pt;vertical-align:middle;'+(g==='남'?'background:#000;color:#fff;':'')+'">남</span> 남 &nbsp;&nbsp; '+
    '<span style="display:inline-block;width:10pt;height:10pt;border:1px solid #000;text-align:center;line-height:10pt;font-size:8pt;margin-right:2pt;vertical-align:middle;'+(g==='여'?'background:#000;color:#fff;':'')+'">여</span> 여';

  // ── PAGE 3: 동의서 ──
  const name = d.name || d['성명'] || '';
  _setText('po_name2', name);
  _setText('po_name3', name);

  const cl = v => (v === '동의함')
    ? '<span style="color:#00529B;font-weight:700;">동의함 ☑</span>'
    : '<span style="color:#C00;font-weight:700;">☑ 동의하지 않음</span>';

  const c1el = document.getElementById('po_consent1_display');
  const c2el = document.getElementById('po_consent2_display');
  const c3el = document.getElementById('po_consent3_display');
  const c4el = document.getElementById('po_consent4_display');
  if (c1el) c1el.innerHTML = cl(d.consent1 || d['기본개인정보동의'] || '');
  if (c2el) c2el.innerHTML = cl(d.consent2 || d['민감정보동의']    || '');
  if (c3el) c3el.innerHTML = cl(d.consent3 || d['제3자제공동의']   || '');
  if (c4el) c4el.innerHTML = cl(d.consent4 || d['서울시복지재단동의'] || '');

  // 서명 이미지
  const sigImg = document.getElementById('po_sig_img');
  const sigSrc = d.signatureImage || d['서명이미지'] || '';
  if (sigImg) {
    if (sigSrc) { sigImg.src = sigSrc; sigImg.style.display = 'block'; }
    else        { sigImg.style.display = 'none'; }
  }
}
