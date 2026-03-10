// ===== NAVIGATION =====
function goToSlide(index) {
  if (index < 0 || index >= STATE.totalSlides) return;
  saveNotes();
  if (STATE.panelOpen) togglePanel();
  STATE.currentSlide = index;
  STATE.twoFActive = false;   // 슬라이드 이동 시 2-F 상태 초기화
  slideTrack.style.transform = `translateX(-${index * 100}%)`;
  redrawCanvas(index);
  updateUI();
}
function nextSlide() { goToSlide(STATE.currentSlide + 1); }
function prevSlide() { goToSlide(STATE.currentSlide - 1); }

function addBlankSlide() {
  if (!STATE.lesson) return;
  STATE.lesson.slides.splice(STATE.currentSlide + 1, 0, { type: 'blank' });
  renderAllSlides();
  goToSlide(STATE.currentSlide + 1);
}

function deleteCurrentSlide() {
  if (!STATE.lesson?.slides) return;
  const slides = STATE.lesson.slides;
  if (slides.length <= 1) { alert('마지막 페이지는 삭제할 수 없습니다.'); return; }
  const idx = STATE.currentSlide;
  openDeleteModal(
    '페이지 삭제',
    `${idx + 1}번 페이지를 삭제합니다. 필기도 함께 삭제됩니다.`,
    () => {
      closeDeleteModal();
      // 실행취소용 스냅샷
      const savedSlide = JSON.parse(JSON.stringify(slides[idx]));
      const savedDrawings = STATE.slideDrawings[idx] ? [...STATE.slideDrawings[idx]] : [];
      const savedUndoStack = STATE.undoStack[idx]   ? [...STATE.undoStack[idx]]   : [];
      // 삭제
      slides.splice(idx, 1);
      delete STATE.slideDrawings[idx];
      delete STATE.undoStack[idx];
      // 인덱스 재배치 (삭제 후 뒤 슬라이드 인덱스 당김)
      const newD = {}, newU = {};
      Object.keys(STATE.slideDrawings).forEach(k => {
        const ki = parseInt(k);
        newD[ki > idx ? ki - 1 : ki] = STATE.slideDrawings[k];
      });
      Object.keys(STATE.undoStack).forEach(k => {
        const ki = parseInt(k);
        newU[ki > idx ? ki - 1 : ki] = STATE.undoStack[k];
      });
      STATE.slideDrawings = newD; STATE.undoStack = newU;
      saveDrawings();
      renderAllSlides();
      goToSlide(Math.min(idx, slides.length - 1));
      persistCurrentLesson();
      // 실행취소 토스트
      showUndoToast('페이지가 삭제됐습니다', () => {
        slides.splice(idx, 0, savedSlide);
        const restD = {}, restU = {};
        Object.keys(STATE.slideDrawings).forEach(k => {
          const ki = parseInt(k);
          restD[ki >= idx ? ki + 1 : ki] = STATE.slideDrawings[k];
        });
        Object.keys(STATE.undoStack).forEach(k => {
          const ki = parseInt(k);
          restU[ki >= idx ? ki + 1 : ki] = STATE.undoStack[k];
        });
        if (savedDrawings.length) restD[idx] = savedDrawings;
        if (savedUndoStack.length) restU[idx] = savedUndoStack;
        STATE.slideDrawings = restD; STATE.undoStack = restU;
        saveDrawings();
        renderAllSlides();
        goToSlide(idx);
        persistCurrentLesson();
      });
    }
  );
}

// ===== 2-F TOGGLE =====
// 첫 2문장 + 마지막 1문장만 표시, 나머지 숨김 토글
function toggle2F() {
  const idx = STATE.currentSlide;
  const data = STATE.lesson.slides[idx];
  if (!data || data.type !== 'passage') return;
  const slideEl = slideTrack.querySelector(`.slide[data-index="${idx}"]`);
  if (!slideEl) return;
  const passageText = slideEl.querySelector('.passage-text');
  if (!passageText) return;
  const sentences = passageText.querySelectorAll('.sentence');
  if (sentences.length <= 3) return; // 3문장 이하면 토글 불필요

  // 현재 상태 확인: 이미 숨김 중인지
  const isHidden = passageText.querySelector('.twoF-hidden');
  // 기존 ellipsis 제거
  passageText.querySelectorAll('.twoF-ellipsis').forEach(el => el.remove());

  if (isHidden) {
    // 복원: 모든 문장 다시 보이기
    sentences.forEach(s => s.classList.remove('twoF-hidden'));
    STATE.twoFActive = false;
  } else {
    // 숨기기: 첫 2문장 + 마지막 1문장만 남기고 나머지 숨김
    const last = sentences.length - 1;
    for (let i = 2; i < last; i++) {
      sentences[i].classList.add('twoF-hidden');
    }
    // 생략 표시 삽입 (두 번째 문장 뒤)
    const ellipsis = document.createElement('span');
    ellipsis.className = 'twoF-ellipsis';
    ellipsis.textContent = ' [...] ';
    sentences[1].after(ellipsis);
    STATE.twoFActive = true;
  }
  updateUI();
}

// ===== PASSAGE NOTES RESIZE =====
function initPassageResize() {
  const handles = slideTrack.querySelectorAll('.passage-resize-handle');
  handles.forEach(handle => {
    handle.addEventListener('pointerdown', startResize);
  });
}

function startResize(e) {
  e.preventDefault();
  e.stopPropagation();
  const handle = e.currentTarget;
  handle.classList.add('dragging');
  const split = handle.closest('.passage-split');
  const notes = split.querySelector('.passage-notes');
  const startX = e.clientX;
  const startWidth = notes.offsetWidth;
  const maxW = split.offsetWidth * 0.6;
  let pendingW = startWidth;
  let rafId = 0;
  notes.style.willChange = 'width';

  function applyWidth() {
    rafId = 0;
    notes.style.width = pendingW + 'px';
  }
  function onMove(ev) {
    ev.preventDefault();
    const delta = startX - ev.clientX;
    pendingW = Math.max(180, Math.min(maxW, startWidth + delta));
    if (!rafId) rafId = requestAnimationFrame(applyWidth);
  }
  function onUp() {
    handle.classList.remove('dragging');
    notes.style.willChange = '';
    if (rafId) { cancelAnimationFrame(rafId); applyWidth(); }
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

// 슬라이드 간 노트 내용 보존 (localStorage 영속화)
// 저장 키: 'wb_notes_{lessonKey}' → JSON { [data-notes-slide값]: 텍스트 }
function notesKey(lessonKey) { return NOTES_KEY_PREFIX + lessonKey; }
function saveNotes() {
  const lessonKey = getCurrentLessonId();
  if (!lessonKey) return;
  const lsKey = notesKey(lessonKey);
  let map = {};
  try { map = JSON.parse(localStorage.getItem(lsKey) || '{}'); } catch(e) {}
  slideTrack.querySelectorAll('.notes-area[data-notes-slide]').forEach(el => {
    map[el.dataset.notesSlide] = el.innerText;
  });
  try { localStorage.setItem(lsKey, JSON.stringify(map)); } catch(e) {}
}
function restoreNotes() {
  const lessonKey = getCurrentLessonId();
  if (!lessonKey) return;
  let map = {};
  try { map = JSON.parse(localStorage.getItem(notesKey(lessonKey)) || '{}'); } catch(e) {}
  slideTrack.querySelectorAll('.notes-area[data-notes-slide]').forEach(el => {
    el.innerText = map[el.dataset.notesSlide] ?? '';
  });
}
function clearSlideNoteInStorage(lessonKey, slideIdx) {
  if (!lessonKey) return;
  const lsKey = notesKey(lessonKey);
  try {
    const map = JSON.parse(localStorage.getItem(lsKey) || '{}');
    delete map[slideIdx];
    localStorage.setItem(lsKey, JSON.stringify(map));
  } catch(e) {}
}


