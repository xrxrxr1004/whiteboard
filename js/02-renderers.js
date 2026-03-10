// ===== SLIDE RENDERERS =====
function renderAllSlides() {
  slideTrack.innerHTML = '';
  const slides = STATE.lesson.slides || [];
  STATE.totalSlides = slides.length;
  slides.forEach((data, i) => {
    const el = document.createElement('div');
    el.className = 'slide';
    el.dataset.index = i;
    const renderer = RENDERERS[data.type] || RENDERERS.freeform;
    renderer(el, data, i);
    renderOverlays(el, data);
    slideTrack.appendChild(el);
  });
}

// Wrap text into sentence-level spans for click-to-underline
function wrapSentences(escapedText) {
  if (!escapedText || !escapedText.trim()) return escapedText;
  // Split at sentence boundaries: .!? + space + uppercase (no lookbehind for old browser compat)
  const result = escapedText.replace(/([.!?])\s+(?=[A-Z])/g, '$1</span> <span class="sentence">');
  return '<span class="sentence">' + result + '</span>';
}

const RENDERERS = {
  title(el, data) {
    el.classList.add('slide-title-page');
    const lesson = STATE.lesson;
    const titleText = (lesson && lesson.title) || data.title || '';
    el.innerHTML = `<h1>${esc(titleText)}</h1>`;
  },

  passage(el, data, idx) {
    const exLabel = data.exercise_idx !== undefined ? `Ex${String(data.exercise_idx + 1).padStart(2, '0')} · ` : '';
    const ex = STATE.lesson?.exercises?.[data.exercise_idx];
    const hasVQ = ex?.variant_questions && Object.keys(ex.variant_questions).length > 0;
    const vqBtn = hasVQ ? `<button class="vq-trigger-btn" data-vqidx="${data.exercise_idx}">변형문제</button>` : '';
    let html = `<div class="slide-header"><span>${exLabel}${esc(data.title || 'Passage')}</span>${vqBtn}</div>`;
    let content = data.content || '';
    let result = wrapSentences(esc(content));

    let vocabHtml = '';
    if (data.vocabulary && data.vocabulary.length) {
      vocabHtml += '<div class="vocab-badges">';
      data.vocabulary.forEach(v => {
        vocabHtml += `<span class="vocab-badge"><b>${esc(v.word)}</b> ${esc(v.meaning)}</span>`;
      });
      vocabHtml += '</div>';
    }

    html += `<div class="passage-split">` +
      `<div class="passage-left"><div class="passage-text">${result}</div>${vocabHtml}</div>` +
      `<div class="passage-resize-handle" data-slide="${idx}"></div>` +
      `<div class="passage-notes" data-slide="${idx}">` +
        `<div class="passage-notes-header"><span>Notes</span></div>` +
        `<div class="passage-notes-body">` +
          `<div contenteditable="false" class="notes-area" data-notes-slide="${idx}"></div>` +
        `</div>` +
      `</div>` +
    `</div>`;

    el.innerHTML = html;
  },

  questions(el, data, idx) {
    let html = `<div class="slide-header">${esc(data.title || 'Questions')}</div>`;
    (data.items || []).forEach((q, qi) => {
      html += `<div class="question-block" data-q="${qi}" data-slide="${idx}">`;
      html += `<div class="q-num">Q${qi + 1}</div>`;
      html += `<div class="q-text">${esc(q.question || '')}</div>`;
      html += '<div class="q-options">';
      (q.options || []).forEach((opt, oi) => {
        html += `<div class="q-option" data-answer="${q.answer}" data-opt="${oi}" data-slide="${idx}" data-q="${qi}">` +
          `<span class="q-label">${OPTION_LABELS[oi] || (oi+1)}</span> ${esc(opt)}</div>`;
      });
      html += '</div>';
      if (q.explanation) {
        html += `<div class="q-explanation" data-slide="${idx}" data-q="${qi}">${esc(q.explanation)}</div>`;
      }
      html += '</div>';
    });
    el.innerHTML = html;

    // Click handler for answer reveal
    setTimeout(() => {
      el.querySelectorAll('.q-option').forEach(opt => {
        opt.addEventListener('click', () => {
          if (STATE.drawingMode !== 'navigate') return;
          const answer = parseInt(opt.dataset.answer);
          const optIdx = parseInt(opt.dataset.opt);
          const block = opt.closest('.question-block');
          // Highlight correct answer
          block.querySelectorAll('.q-option').forEach((o, i) => {
            if (i === answer) o.classList.add('correct');
          });
          // Show explanation
          const expl = block.querySelector('.q-explanation');
          if (expl) expl.classList.add('shown');
        });
      });
    }, 0);
  },

  grammar(el, data) {
    let html = `<div class="slide-header">${esc(data.title || 'Grammar')}</div>`;
    (data.points || []).forEach(p => {
      let ex = esc(p.example || '');
      if (p.highlight) {
        const hlEsc = esc(p.highlight);
        ex = ex.replace(new RegExp(`(${escRegex(hlEsc)})`, 'gi'), '<span class="hl">$1</span>');
      }
      html += `<div class="grammar-point">
        <div class="rule">${esc(p.rule || '')}</div>
        <div class="example">${ex}</div>
      </div>`;
    });
    el.innerHTML = html;
  },

  keysentence(el, data) {
    let html = `<div class="slide-header">${esc(data.title || 'Key Sentences')}</div>`;
    (data.sentences || []).forEach(s => {
      html += `<div class="ks-block">
        <div class="ks-en">${esc(s.en || '')}</div>
        <div class="ks-ko">${esc(s.ko || '')}</div>
        ${s.grammar_note ? `<span class="ks-note">${esc(s.grammar_note)}</span>` : ''}
      </div>`;
    });
    el.innerHTML = html;
  },

  freeform(el, data) {
    el.innerHTML = `<div class="slide-header">${esc(data.title || '')}</div>
      <div class="freeform-content">${data.html || ''}</div>`;
  },

  image(el, data) {
    const w = data.width ?? 60;
    const x = data.x ?? (100 - w) / 2;
    const y = data.y ?? 10;
    el.classList.add('media-slide');
    el.innerHTML = `
      <div class="media-wrap" style="left:${x}%;top:${y}%;width:${w}%">
        <img class="slide-image" src="${esc(data.src || '')}" alt="${esc(data.caption || '')}"
          style="object-fit:${data.fit || 'contain'}" onerror="this.alt='이미지를 찾을 수 없습니다'">
        ${data.caption ? `<div class="image-caption">${esc(data.caption)}</div>` : ''}
        <div class="resize-handle tl"></div><div class="resize-handle tr"></div><div class="resize-handle bl"></div><div class="resize-handle br"></div>
      </div>`;
    attachMediaHandles(el, el.querySelector('.media-wrap'), data);
  },

  video(el, data) {
    const w = data.width ?? 60;
    const x = data.x ?? (100 - w) / 2;
    const y = data.y ?? 10;
    el.classList.add('media-slide');
    el.innerHTML = `
      <div class="media-wrap" style="left:${x}%;top:${y}%;width:${w}%">
        <div class="video-drag-bar">⠿ 드래그하여 이동</div>
        <div class="video-wrapper">
          <iframe src="${esc(data.src || '')}" allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
          </iframe>
        </div>
        <div class="resize-handle tl"></div><div class="resize-handle tr"></div><div class="resize-handle bl"></div><div class="resize-handle br"></div>
      </div>`;
    attachMediaHandles(el, el.querySelector('.media-wrap'), data);
  },

  blank(el) {
    el.classList.add('slide-blank');
  }
};

