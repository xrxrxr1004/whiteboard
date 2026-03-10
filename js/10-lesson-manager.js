// ===== LESSON MANAGER =====
const STORAGE_KEY = 'wb_lessons';
const CURRENT_KEY = 'wb_current';

function getLessonStore() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveLessonStoreLocal(store) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch(e) { /* localStorage unavailable */ }
}
function saveLessonStore(store) {
  saveLessonStoreLocal(store);
  pushLessonsToSB(store); // 논블로킹
}
function setCurrentLessonId(id) {
  try { localStorage.setItem(CURRENT_KEY, id); } catch(e) { /* localStorage unavailable */ }
}
function getCurrentLessonId() {
  try { return localStorage.getItem(CURRENT_KEY) || ''; } catch(e) { return ''; }
}

function parseLessonInput(text) {
  text = text.trim();
  // 1) LESSON_LIBRARY.push() IIFE 형식 (Claude가 생성한 lessons/*.js 파일)
  if (text.includes('LESSON_LIBRARY') && text.includes('push')) {
    try {
      const sandbox = { LESSON_LIBRARY: [] };
      const fn = new Function('window', text);
      fn(sandbox);
      if (sandbox.LESSON_LIBRARY.length > 0) return sandbox.LESSON_LIBRARY[0];
    } catch(e) {}
  }
  // 2) window.LESSON_DATA = ... wrapper
  const m = text.match(/(?:window\.)?LESSON_DATA\s*=\s*([\s\S]+?);?\s*$/);
  if (m) text = m[1];
  // 3) Try JSON parse
  try { return JSON.parse(text); } catch {}
  // 4) Try eval as JS object literal
  try { return (new Function('return (' + text + ')'))(); } catch {}
  return null;
}

function loadLessonData(data, lessonKey) {
  STATE.lesson = data;
  const s = data.settings || {};
  STATE.fontSize = s.defaultFontSize || 32;
  STATE.bgIndex = BACKGROUNDS.indexOf(s.defaultBg || 'white');
  if (STATE.bgIndex < 0) STATE.bgIndex = 0;
  STATE.currentSlide = 0;
  STATE.slideDrawings = loadDrawingsLocal(lessonKey || getCurrentLessonId());
  STATE.undoStack = {};
  STATE.twoFActive = false;
  STATE.isDrawing = false;
  STATE.isErasing = false;
  // 블랙아웃 해제
  if (STATE.blackout) { STATE.blackout = false; blackoutEl.classList.remove('active'); }
  // notes는 localStorage 기반 — 레슨 전환 시 별도 초기화 불필요
  // Close side panel if open
  if (STATE.panelOpen) { sidePanel.classList.remove('open'); STATE.panelOpen = false; }
  // 도구 포인터로 초기화
  setTool('navigate');
  applyBackground();
  slideContainer.style.fontSize = STATE.fontSize + 'px';
  renderAllSlides();

  renderPanel();
  setupCanvas();
  initPassageResize();
  restoreNotes();
  slideTrack.style.transform = 'translateX(0)';
  updateUI();
  $('#lesson-title-bar').textContent = data.title || '';
  $('#status-lesson').textContent = data.title || '';
}

function lmToast(msg) {
  const t = $('#lm-toast');
  t.innerHTML = `<span>${msg}</span>`;
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); t.innerHTML = ''; }, 2200);
}

// ── Undo toast (삭제 취소용) ──
let pendingUndo = null;

function showUndoToast(msg, onUndo) {
  const t = $('#lm-toast');
  t.innerHTML = `<span>${msg}</span><button id="lm-undo-btn">실행 취소</button><span id="lm-undo-countdown">5</span>`;
  t.classList.add('show');
  let sec = 5;
  const tick = setInterval(() => {
    sec--;
    const cd = document.getElementById('lm-undo-countdown');
    if (cd) cd.textContent = sec;
    if (sec <= 0) clearInterval(tick);
  }, 1000);
  document.getElementById('lm-undo-btn').addEventListener('click', () => {
    clearInterval(tick);
    onUndo();
  });
  if (pendingUndo) pendingUndo._tick = tick;
}

function hideUndoToast() {
  const t = $('#lm-toast');
  t.classList.remove('show');
  t.innerHTML = '';
  if (pendingUndo?._tick) clearInterval(pendingUndo._tick);
}

// ── 실제 삭제 실행 (SB soft-delete) ──
function flushPendingDelete() {
  if (!pendingUndo) return;
  Object.keys(pendingUndo.items)
    .filter(id => !id.startsWith('lib_'))
    .forEach(id => deleteFromSB(id));
  pendingUndo = null;
  hideUndoToast();
}

// ── 삭제 진입점 (개별 + 일괄 공통) ──
function doDeleteLessons(ids) {
  // 기존 pending 있으면 즉시 확정
  if (pendingUndo) {
    clearTimeout(pendingUndo.timer);
    flushPendingDelete();
  }
  const s = getLessonStore();
  const backup = {};
  const currentWas = ids.includes(getCurrentLessonId()) ? getCurrentLessonId() : null;
  ids.forEach(id => { if (s[id]) { backup[id] = s[id]; } delete s[id]; });
  saveLessonStoreLocal(s); // SB push는 undo 시간 후에
  if (currentWas) setCurrentLessonId('');
  renderSavedList();

  const label = ids.length === 1
    ? `"${(backup[ids[0]]?.data?.title || ids[0])}" 삭제됨`
    : `${ids.length}개 레슨 삭제됨`;

  const timer = setTimeout(() => { flushPendingDelete(); }, 5000);
  pendingUndo = { items: backup, timer, currentWas, _tick: null };

  showUndoToast(`🗑 ${label}`, () => {
    clearTimeout(pendingUndo.timer);
    const s2 = getLessonStore();
    Object.entries(pendingUndo.items).forEach(([id, entry]) => { s2[id] = entry; });
    saveLessonStoreLocal(s2);
    if (pendingUndo.currentWas) setCurrentLessonId(pendingUndo.currentWas);
    pendingUndo = null;
    hideUndoToast();
    renderSavedList();
    lmToast('↩ 복구됨');
  });
}

// ── 제목 수정 + DB 동기화 ──
function renameLesson(id, newTitle) {
  if (!newTitle.trim()) return;
  const s = getLessonStore();
  if (!s[id]?.data) return;
  s[id].data.title = newTitle.trim();
  s[id].savedAt = Date.now();
  saveLessonStore(s); // localStorage + SB upsert
  if (getCurrentLessonId() === id) {
    STATE.lesson.title = newTitle.trim();
    $('#lesson-title-bar').textContent = newTitle.trim();
    $('#status-lesson').textContent = newTitle.trim();
  }
  renderSavedList();
}

function openLessonModal() {
  const modal = $('#lesson-modal');
  modal.classList.add('open');
  // Refresh saved list
  renderSavedList();
  // Fill edit tab with current lesson
  $('#lm-edit').value = JSON.stringify(STATE.lesson, null, 2);
  // Activate first tab
  activateLmTab('load');
}

function closeLessonModal() {
  $('#lesson-modal').classList.remove('open');
}

// ===== CLEAR PAGE =====
function _clearSlideEl(slideEl, idx) {
  slideEl.querySelectorAll('.text-hl').forEach(el => el.classList.remove('text-hl'));
  slideEl.querySelectorAll('.sentence-active').forEach(el => el.classList.remove('sentence-active'));
  const ta = slideEl.querySelector(`.notes-area[data-notes-slide="${idx}"]`);
  if (ta) { ta.innerText = ''; clearSlideNoteInStorage(getCurrentLessonId(), idx); }
}
function clearPage() {
  const idx = STATE.currentSlide;
  STATE.slideDrawings[idx] = [];
  STATE.undoStack[idx] = [];
  redrawCanvas(idx);
  saveDrawings();
  const slideEl = slideTrack.children[idx];
  if (slideEl) _clearSlideEl(slideEl, idx);
}
function clearAllPages() {
  const total = (STATE.lesson?.slides?.length) ?? 0;
  for (let i = 0; i < total; i++) {
    STATE.slideDrawings[i] = [];
    STATE.undoStack[i] = [];
    const slideEl = slideTrack.children[i];
    if (slideEl) _clearSlideEl(slideEl, i);
  }
  saveDrawings();
  goToSlide(0);
}
function openClearPageModal() { $('#cp-modal').classList.add('open'); }
function closeClearPageModal() { $('#cp-modal').classList.remove('open'); }

function activateLmTab(tab) {
  $$('.lm-tab').forEach(t => t.classList.toggle('active', t.dataset.lmTab === tab));
  $$('.lm-section').forEach(s => s.classList.remove('active'));
  $(`#lm-sec-${tab}`).classList.add('active');
}

let lmSortMode = 'date-desc';

function renderSavedList() {
  const store = getLessonStore();
  const list = $('#lm-saved-list');

  // 정렬 버튼 active 상태 동기화
  $$('.lm-sort-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.sort === lmSortMode));

  const keys = Object.keys(store);
  if (!keys.length) {
    list.innerHTML = '<div class="lm-empty">저장된 수업이 없습니다.<br>📂 새 수업 탭에서 JS 파일을 드롭하거나 붙여넣으세요.</div>';
    $('#lm-bulk-bar').classList.add('hidden');
    return;
  }

  // 정렬
  keys.sort((a, b) => {
    const ia = store[a], ib = store[b];
    switch (lmSortMode) {
      case 'date-asc':   return (ia.savedAt || 0) - (ib.savedAt || 0);
      case 'name-asc':   return ((ia.data && ia.data.title) || a).localeCompare((ib.data && ib.data.title) || b, 'ko');
      case 'slides-desc': {
        const countOf = d => (d.data && d.data.exercises && d.data.exercises.length) || (d.data && d.data.slides && d.data.slides.length) || 0;
        return countOf(ib) - countOf(ia);
      }
      default:           return (ib.savedAt || 0) - (ia.savedAt || 0);
    }
  });

  const currentId = getCurrentLessonId();
  list.innerHTML = keys.map(k => {
    const item = store[k];
    const d = item.savedAt ? new Date(item.savedAt) : null;
    const dateStr = d ? `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}` : '';
    const exercises = (item.data && item.data.exercises && item.data.exercises.length) || 0;
    const slides = (item.data && item.data.slides && item.data.slides.length) || 0;
    const countStr = exercises > 0 ? `${exercises}개 지문` : `${slides}개 슬라이드`;
    const isCurrent = k === currentId;
    return `<li${isCurrent ? ' style="background:rgba(124,58,237,0.08)"' : ''}>
      <input type="checkbox" class="lm-list-check" data-check-id="${esc(k)}" title="선택">
      <div class="lm-list-info" data-lesson-id="${esc(k)}">
        <div class="lm-list-title">${isCurrent ? '▶ ' : ''}${esc((item.data && item.data.title) || k)}</div>
        <div class="lm-list-meta">${item.source === 'library' ? '📁 ' : ''}${countStr} · ${dateStr}</div>
      </div>
      <div class="lm-list-actions">
        <button class="lm-list-btn rename" data-rename-id="${esc(k)}" title="제목 수정">✏️</button>
        <button class="lm-list-btn delete" data-delete-id="${esc(k)}" title="삭제">🗑</button>
      </div>
    </li>`;
  }).join('');

  // 체크박스 → bulk bar 연동
  function updateBulkBar() {
    const checked = list.querySelectorAll('.lm-list-check:checked');
    const bar = $('#lm-bulk-bar');
    if (checked.length > 0) {
      bar.classList.remove('hidden');
      $('#lm-bulk-count').textContent = `${checked.length}개 선택됨`;
    } else {
      bar.classList.add('hidden');
    }
    list.querySelectorAll('.lm-list-check').forEach(cb =>
      cb.closest('li').classList.toggle('lm-selected', cb.checked)
    );
  }
  list.querySelectorAll('.lm-list-check').forEach(cb =>
    cb.addEventListener('change', updateBulkBar)
  );

  // Click to load
  list.querySelectorAll('.lm-list-info').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.lessonId;
      const item = getLessonStore()[id];
      if (item && item.data) {
        setCurrentLessonId(id);
        loadLessonData(item.data, id);
        closeLessonModal();
        lmToast('✅ "' + (item.data.title || id) + '" 로드 완료');
      }
    });
  });

  // 개별 삭제 → undo toast
  list.querySelectorAll('[data-delete-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      doDeleteLessons([el.dataset.deleteId]);
    });
  });

  // 제목 인라인 수정
  list.querySelectorAll('[data-rename-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.renameId;
      const li = btn.closest('li');
      const titleDiv = li.querySelector('.lm-list-title');
      const currentTitle = getLessonStore()[id]?.data?.title || id;
      // 이미 편집 중이면 무시
      if (li.querySelector('.lm-rename-input')) return;
      const input = document.createElement('input');
      input.className = 'lm-rename-input';
      input.value = currentTitle;
      titleDiv.replaceWith(input);
      input.focus(); input.select();
      const commit = () => {
        const newTitle = input.value.trim() || currentTitle;
        renameLesson(id, newTitle);
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { input.removeEventListener('blur', commit); renderSavedList(); }
        ev.stopPropagation();
      });
    });
  });

  // 렌더 시 bulk bar 초기화
  $('#lm-bulk-bar').classList.add('hidden');
}

function setupMediaModal() {
  $('#mm-close').addEventListener('click', closeMediaModal);
  $('#media-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeMediaModal(); });

  // 탭 전환
  $$('.mm-tab').forEach(t => {
    t.addEventListener('click', () => {
      $$('.mm-tab').forEach(x => x.classList.remove('active'));
      $$('.mm-section').forEach(x => x.classList.add('hidden'));
      t.classList.add('active');
      $('#ms-' + t.dataset.mtab).classList.remove('hidden');
    });
  });

  // ── 이미지 URL 탭 ──
  $('#m-btn-url').addEventListener('click', () => {
    const src = $('#m-img-url').value.trim();
    if (!src) { lmToast('⚠️ URL을 입력하세요'); return; }
    const caption = $('#m-img-caption').value.trim();
    const fit = $('#m-img-fit').value;
    addMediaSlide({ type: 'image', title: caption || '', src, caption, fit });
  });

  // ── YouTube / 영상 탭 ──
  $('#m-btn-video').addEventListener('click', () => {
    const raw = $('#m-video-url').value.trim();
    if (!raw) { lmToast('⚠️ URL을 입력하세요'); return; }
    const embedUrl = toEmbedUrl(raw);
    addMediaSlide({ type: 'video', title: '', src: embedUrl, width: 60 });
  });
}

function setupLessonManager() {
  $('#btn-lesson-mgr').addEventListener('click', openLessonModal);
  $('#lm-close').addEventListener('click', closeLessonModal);
  $('#lesson-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLessonModal();
  });

  // Tabs
  $$('.lm-tab').forEach(t => {
    t.addEventListener('click', () => activateLmTab(t.dataset.lmTab));
  });

  // Load & Save
  $('#lm-btn-load').addEventListener('click', () => {
    const text = $('#lm-paste').value;
    if (!text.trim()) { lmToast('⚠️ 데이터를 붙여넣으세요'); return; }
    const data = parseLessonInput(text);
    if (!data || !data.slides) { lmToast('❌ 파싱 실패 — 데이터 형식을 확인하세요'); return; }
    const id = data.title || ('수업_' + Date.now());
    const store = getLessonStore();
    store[id] = { data, savedAt: Date.now() };
    saveLessonStore(store);
    setCurrentLessonId(id);
    loadLessonData(data);
    closeLessonModal();
    $('#lm-paste').value = '';
    lmToast('✅ "' + (data.title || '새 수업') + '" 저장 & 로드 완료');
  });

  // Edit save
  $('#lm-btn-save-edit').addEventListener('click', () => {
    const text = $('#lm-edit').value;
    const data = parseLessonInput(text);
    if (!data || !data.slides) { lmToast('❌ JSON 파싱 실패'); return; }
    const id = data.title || getCurrentLessonId() || ('수업_' + Date.now());
    const store = getLessonStore();
    store[id] = { data, savedAt: Date.now() };
    saveLessonStore(store);
    setCurrentLessonId(id);
    loadLessonData(data);
    closeLessonModal();
    lmToast('✅ 수정 저장 완료');
  });

  // Copy
  $('#lm-btn-copy').addEventListener('click', () => {
    const ta = $('#lm-edit');
    ta.select();
    document.execCommand('copy');
    lmToast('📋 클립보드에 복사됨');
  });

  // ── JS 파일 드래그 앤 드롭 ──
  function handleLessonFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.js')) { lmToast('⚠️ .js 파일만 지원됩니다'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const data = parseLessonInput(text);
      if (!data || !data.slides) { lmToast('❌ 파싱 실패 — 올바른 레슨 JS 파일인지 확인하세요'); return; }
      const id = 'usr_' + (data.title || '').replace(/[^a-zA-Z0-9가-힣]/g, '_').substring(0, 40) || ('수업_' + Date.now());
      const store = getLessonStore();
      store[id] = { data, savedAt: Date.now() };
      saveLessonStore(store);
      setCurrentLessonId(id);
      loadLessonData(data);
      closeLessonModal();
      lmToast('✅ "' + (data.title || '새 수업') + '" 저장 & 로드 완료');
    };
    reader.readAsText(file);
  }

  const dropzone = $('#lm-dropzone');
  const fileInput = $('#lm-file-input');

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', (e) => {
    if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove('drag-over');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    handleLessonFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    handleLessonFile(e.target.files[0]);
    fileInput.value = '';
  });

  // Keyboard: L to open
  // (added in handleKey)

  // Prevent keyboard shortcuts when modal textarea is focused
  $('#lesson-modal').addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA') e.stopPropagation();
  }, true);

  // ── 정렬 버튼 ──
  $$('.lm-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lmSortMode = btn.dataset.sort;
      renderSavedList();
    });
  });

  // ── 선택 해제 ──
  $('#lm-bulk-deselect').addEventListener('click', () => {
    $('#lm-saved-list').querySelectorAll('.lm-list-check').forEach(cb => {
      cb.checked = false;
      cb.closest('li').classList.remove('lm-selected');
    });
    $('#lm-bulk-bar').classList.add('hidden');
  });

  // ── 일괄 삭제 → undo toast ──
  $('#lm-bulk-delete').addEventListener('click', () => {
    const checked = $('#lm-saved-list').querySelectorAll('.lm-list-check:checked');
    if (!checked.length) return;
    const ids = Array.from(checked).map(cb => cb.dataset.checkId);
    doDeleteLessons(ids);
  });
}


// ===== AUTO-IMPORT LESSON LIBRARY =====
function importLessonLibrary() {
  const lib = window.LESSON_LIBRARY;
  if (!lib || !lib.length) return;
  const store = getLessonStore();
  let imported = 0;
  // Build set of valid library IDs
  const validIds = new Set();
  lib.forEach(data => {
    if (!data || !data.slides) return;
    const id = 'lib_' + (data.title || '').replace(/[^a-zA-Z0-9가-힣]/g, '_').substring(0, 40);
    validIds.add(id);
    // 사용자 수정 여부: source가 'user'이거나, 어느 슬라이드든 overlay/blank가 있으면 덮어쓰지 않음
    const userModified = store[id] && (
      store[id].source === 'user' ||
      store[id].data?.slides?.some(s => s.overlays?.length || s.type === 'blank')
    );
    if (!store[id] || (!userModified && store[id].source === 'library')) {
      store[id] = { data, savedAt: 0, source: 'library' };  // 0 = 항상 클라우드/user 데이터에 yield
      imported++;
    }
  });
  // Clean up removed library lessons from cache
  let cleaned = 0;
  Object.keys(store).forEach(id => {
    if (id.startsWith('lib_') && !validIds.has(id)) {
      delete store[id]; cleaned++;
    }
  });
  if (imported > 0 || cleaned > 0) saveLessonStore(store);
  // Reset current lesson if it was removed
  const curId = getCurrentLessonId();
  if (curId && curId.startsWith('lib_') && !validIds.has(curId)) {
    setCurrentLessonId('');
  }
  return imported;
}

