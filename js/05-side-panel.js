// ===== SIDE PANEL =====
function getCurrentExercise() {
  const lesson = STATE.lesson;
  if (!lesson || !lesson.exercises) return null;
  const slide = lesson.slides && lesson.slides[STATE.currentSlide];
  if (!slide || slide.exercise_idx === undefined) return null;
  return lesson.exercises[slide.exercise_idx] || null;
}

function renderPanel() {
  const body = $('#panel-body');
  const tab = STATE.panelTab;

  $$('.panel-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));

  const ex = getCurrentExercise();

  if (tab === 'vocab') {
    const resources = ((ex && ex.resources) || STATE.lesson.resources || []).filter(r => r.type === 'vocabulary');
    if (!resources.length) {
      body.innerHTML = '<p style="color:var(--text-muted);font-size:14px">등록된 핵심 단어가 없습니다.</p>';
      return;
    }
    let html = '';
    resources.forEach(r => {
      (r.items || []).forEach(v => {
        html += `<div class="panel-vocab-item"><span class="panel-vocab-word">${esc(v.word)}</span><span class="panel-vocab-meaning">${esc(v.meaning)}</span></div>`;
      });
    });
    body.innerHTML = html;

  } else if (tab === 'translation') {
    const pairs = (ex && ex.translation) || STATE.lesson.translation;
    if (!pairs || !pairs.length) {
      body.innerHTML = '<p class="panel-empty">번역 데이터 없음</p>';
      return;
    }
    body.innerHTML = `<div class="translation-ko">${esc(pairs.map(p => p.ko).join(' '))}</div>`;

  } else if (tab === 'summary') {
    const s = (ex && ex.summary) || STATE.lesson.summary;
    if (!s) {
      body.innerHTML = '<p class="panel-empty">내용 정리 데이터 없음</p>';
      return;
    }
    /* ── 헤더: 영어 제목 + 한국어 주제문 ── */
    const titleEn = (ex && ex.subtitle) || '';
    const headerHtml = `<div class="summary-header">${
      titleEn ? `<div class="summary-title-en">${esc(titleEn)}</div>` : ''
    }${s.title_ko ? `<div class="summary-title-ko">${esc(s.title_ko)}</div>` : ''
    }</div>`;
    /* ── 논리 흐름: 단일 바 ── */
    const flowHtml = (s.flow && s.flow.length)
      ? `<div class="summary-flow-bar">${s.flow.map(esc).join(' → ')}</div>`
      : '';
    /* ── 핵심 포인트 ── */
    const pointsHtml = (s.points && s.points.length)
      ? `<div class="summary-points">${s.points.map((pt, i) => {
          const label = typeof pt === 'object' ? (pt.label || '') : '';
          const text  = typeof pt === 'object' ? (pt.text  || '') : pt;
          return `<div class="summary-point-row">${
            label ? `<span class="summary-point-label" data-pos="${i}">${esc(label)}</span>` : ''
          }<span class="summary-point-text">${esc(text)}</span></div>`;
        }).join('')}</div>`
      : '';
    /* ── 핵심 문장 ── */
    const quoteHtml = s.quote
      ? `<div class="summary-quote"><div class="summary-quote-text">❝ ${esc(s.quote)}</div></div>`
      : '';
    /* ── 하단 어휘 인라인 ── */
    const vocabItems = ((ex && ex.resources) || STATE.lesson.resources || [])
      .filter(r => r.type === 'vocabulary')
      .flatMap(r => r.items || []);
    const vocabHtml = vocabItems.length
      ? `<div class="summary-vocab-inline">${
          vocabItems.map(v => `<span class="sv">${esc(v.word)}</span> ${esc(v.meaning)}`).join('&ensp;&ensp;')
        }</div>`
      : '';
    body.innerHTML = `<div class="summary-block">${headerHtml}${flowHtml}${pointsHtml}${quoteHtml}${vocabHtml}</div>`;
  }
}

