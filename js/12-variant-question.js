// ===== VARIANT QUESTION SYSTEM =====

const VQ_CATEGORIES = [
  { label: '기본',     keys: ['제목', '주제', '요지'] },
  { label: '사실일치', keys: ['사실일치_A', '사실일치_B', '사실일치_C', '사실일치_D'] },
  { label: '문장순서', keys: ['문장순서_A', '문장순서_B'] },
  { label: '문장삽입', keys: ['문장삽입_A', '문장삽입_B'] },
  { label: '무관한문장', keys: ['무관한문장_A', '무관한문장_B'] },
  { label: '어법추론', keys: ['어법추론_A', '어법추론_B', '어법추론_C', '어법추론_D'] },
  { label: '빈칸추론', keys: ['빈칸추론_A', '빈칸추론_B', '빈칸추론_C'] },
  { label: '어휘추론', keys: ['어휘추론_A', '어휘추론_B'] },
  { label: '어법',     keys: ['어법분석', '어법선택_A', '어법선택_B', '어법수정_A', '어법수정_B'] },
  { label: '어휘선택', keys: ['어휘선택_A', '어휘선택_B'] },
];

const VQ_BTN_LABELS = {
  '제목': '제목', '주제': '주제', '요지': '요지', '어법분석': '분석',
  '어법선택_A': '선A', '어법선택_B': '선B', '어법수정_A': '수A', '어법수정_B': '수B',
};

function vqBtnLabel(key) {
  if (VQ_BTN_LABELS[key]) return VQ_BTN_LABELS[key];
  const m = key.match(/_([A-D])$/);
  return m ? m[1] : key;
}

let vqCurrentExerciseIdx = -1;

// ── Modal: open with multi-select ──
function openVariantModal(exerciseIdx) {
  vqCurrentExerciseIdx = exerciseIdx;
  const ex = STATE.lesson?.exercises?.[exerciseIdx];
  const vq = ex?.variant_questions || {};
  const availCount = Object.keys(vq).length;
  $('#vq-modal-title').textContent =
    `Ex${String(exerciseIdx + 1).padStart(2, '0')} 변형문제 — ${availCount}유형`;

  // Pre-select already injected types for this exercise
  const injectedKeys = new Set(
    (STATE.lesson.slides || [])
      .filter(s => s._injected && s.exercise_idx === exerciseIdx)
      .map(s => s.vq_key)
  );

  let html = '';
  VQ_CATEGORIES.forEach(cat => {
    const btns = cat.keys.map(key => {
      const has = !!vq[key];
      const label = esc(vqBtnLabel(key));
      const sel = injectedKeys.has(key) ? ' selected' : '';
      return has
        ? `<button class="vq-type-btn${sel}" data-vqkey="${key}" title="${key}">${label}</button>`
        : `<button class="vq-type-btn" disabled title="${key} — 미준비">${label}</button>`;
    }).join('');
    html += `<div class="vq-cat-row">
      <div class="vq-cat-label">${esc(cat.label)}</div>
      <div class="vq-cat-btns">${btns}</div>
    </div>`;
  });

  $('#vq-modal-body').innerHTML = html;
  vqUpdateFooter();
  $('#vq-modal').classList.remove('hidden');
}

function closeVariantModal() { $('#vq-modal').classList.add('hidden'); }

function vqUpdateFooter() {
  const selected = $('#vq-modal-body').querySelectorAll('.vq-type-btn.selected');
  const n = selected.length;
  $('#vq-select-count').textContent = `${n}개 선택`;
  $('#vq-confirm-btn').disabled = n === 0;
}

// ── Slide injection ──
function removeVQSlides(exerciseIdx) {
  if (!STATE.lesson?.slides) return;
  STATE.lesson.slides = STATE.lesson.slides.filter(
    s => !(s._injected && s.exercise_idx === exerciseIdx)
  );
}

function injectVQSlides(exerciseIdx, selectedKeys) {
  removeVQSlides(exerciseIdx);
  const slides = STATE.lesson.slides;
  const passageIdx = slides.findIndex(s => s.type === 'passage' && s.exercise_idx === exerciseIdx);
  if (passageIdx < 0) return;

  const total = selectedKeys.length;
  const newSlides = selectedKeys.map((key, i) => ({
    type: 'vq_question',
    exercise_idx: exerciseIdx,
    vq_key: key,
    _injected: true,
    _vq_pos: i + 1,
    _vq_total: total,
  }));

  slides.splice(passageIdx + 1, 0, ...newSlides);
  const targetIdx = passageIdx + 1;
  renderAllSlides();
  goToSlide(targetIdx);
}

// ── Question content HTML (reused in slide renderer) ──
function buildVariantQuestionHtml(vq) {
  let html = '';
  if (vq.passage_modified) {
    html += `<div class="vq-passage-mod">${esc(vq.passage_modified)}</div>`;
  }
  if (vq.insert_sentence) {
    html += `<div class="vq-insert-sentence"><strong>삽입 문장:</strong> ${esc(vq.insert_sentence)}</div>`;
  }
  if (vq.blocks && vq.blocks.length) {
    html += '<div class="vq-blocks">';
    vq.blocks.forEach(b => {
      html += `<div class="vq-block"><span class="vq-block-label">${esc(b.label)}</span>${esc(b.text)}</div>`;
    });
    html += '</div>';
  }
  if (vq.question) {
    html += `<div class="vq-question-text">${esc(vq.question)}</div>`;
  }
  if (vq.options && vq.options.length) {
    html += `<div class="vq-options-list" data-answer="${vq.answer ?? ''}">`;
    vq.options.forEach((opt, i) => {
      html += `<div class="vq-option" data-optidx="${i}">${esc(opt)}</div>`;
    });
    html += '</div>';
  }
  if (vq.analysis && vq.analysis.length) {
    html += '<div class="vq-analysis">';
    vq.analysis.forEach(a => {
      html += `<div class="vq-analysis-item">
        <span class="vq-analysis-orig">${esc(a.original)}</span>
        → <span class="vq-analysis-correct">${esc(a.correct)}</span>
        <span class="vq-analysis-note">${esc(a.explanation || '')}</span>
      </div>`;
    });
    html += '</div>';
  }
  if (vq.answer !== undefined || vq.explanation) {
    const labels = ['①','②','③','④','⑤'];
    const ansText = vq.answer !== undefined ? `정답: ${labels[vq.answer] || (vq.answer + 1)}` : '';
    html += `<button class="vq-answer-toggle">정답 보기</button>
    <div class="vq-answer-section">
      ${ansText ? `<div class="vq-answer-label">${ansText}</div>` : ''}
      ${vq.explanation ? `<div class="vq-explanation">${esc(vq.explanation)}</div>` : ''}
    </div>`;
  }
  return html;
}

// ── VQ slide renderer ──
RENDERERS.vq_question = function(el, data) {
  const ex = STATE.lesson?.exercises?.[data.exercise_idx];
  const vq = ex?.variant_questions?.[data.vq_key];
  const exLabel = `Ex${String(data.exercise_idx + 1).padStart(2, '0')}`;
  const typeLabel = (data.vq_key || '').replace(/_/g, ' ');
  const counter = `${data._vq_pos} / ${data._vq_total}`;

  let html = `<div class="vq-slide-header">
    <button class="vq-back-btn" data-vqback="${data.exercise_idx}">← 지문으로</button>
    <span class="vq-slide-title">${exLabel} · ${esc(typeLabel)}</span>
    <span class="vq-slide-counter">${counter}</span>
  </div>`;

  if (vq) {
    html += buildVariantQuestionHtml(vq);
  } else {
    html += `<div class="vq-question-text" style="color:#94a3b8">문제 데이터가 없습니다.</div>`;
  }
  el.innerHTML = html;

  // Answer toggle
  const toggleBtn = el.querySelector('.vq-answer-toggle');
  const ansSection = el.querySelector('.vq-answer-section');
  if (toggleBtn && ansSection) {
    toggleBtn.addEventListener('click', () => {
      const shown = ansSection.classList.toggle('shown');
      toggleBtn.textContent = shown ? '정답 숨기기' : '정답 보기';
    });
  }
  // Option click — reveal answer
  el.querySelectorAll('.vq-options-list').forEach(list => {
    const correctIdx = parseInt(list.dataset.answer);
    list.querySelectorAll('.vq-option').forEach((opt, i) => {
      opt.addEventListener('click', () => {
        list.querySelectorAll('.vq-option').forEach((o, j) => {
          o.classList.toggle('correct', j === correctIdx);
          if (j !== correctIdx) o.classList.remove('wrong');
        });
        if (i !== correctIdx) opt.classList.add('wrong');
      });
    });
  });
};

// ── VQ event delegation ──
$('#vq-modal-close').addEventListener('click', closeVariantModal);
$('#vq-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeVariantModal(); });

// Type button toggle (multi-select)
$('#vq-modal-body').addEventListener('click', e => {
  const btn = e.target.closest('.vq-type-btn');
  if (!btn || btn.disabled) return;
  btn.classList.toggle('selected');
  vqUpdateFooter();
});

// Confirm → inject slides
$('#vq-confirm-btn').addEventListener('click', () => {
  const selectedKeys = Array.from($('#vq-modal-body').querySelectorAll('.vq-type-btn.selected'))
    .map(b => b.dataset.vqkey);
  closeVariantModal();
  if (selectedKeys.length > 0) injectVQSlides(vqCurrentExerciseIdx, selectedKeys);
});

// Back-to-passage button — event delegation via slideTrack
slideTrack.addEventListener('click', e => {
  const backBtn = e.target.closest('.vq-back-btn');
  if (backBtn) {
    const exerciseIdx = parseInt(backBtn.dataset.vqback);
    const passageIdx = STATE.lesson.slides.findIndex(
      s => s.type === 'passage' && s.exercise_idx === exerciseIdx
    );
    if (passageIdx >= 0) goToSlide(passageIdx);
    return;
  }
  const triggerBtn = e.target.closest('.vq-trigger-btn');
  if (triggerBtn) openVariantModal(parseInt(triggerBtn.dataset.vqidx));
});

init();
setupLessonManager();
setupMediaModal();
// Clear page
$('#btn-clear-page').addEventListener('click', openClearPageModal);
$('#cp-cancel').addEventListener('click', closeClearPageModal);
$('#cp-confirm').addEventListener('click', () => { clearPage(); closeClearPageModal(); });
$('#cp-confirm-all').addEventListener('click', () => { clearAllPages(); closeClearPageModal(); });
$('#cp-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeClearPageModal(); });
