// ===== INITIALIZATION =====
function init() {
  if (!STATE.lesson) STATE.lesson = window.LESSON_DATA || createFallbackLesson();
  const s = STATE.lesson.settings || {};
  STATE.fontSize = s.defaultFontSize || 32;
  STATE.bgIndex = BACKGROUNDS.indexOf(s.defaultBg || 'white');
  if (STATE.bgIndex < 0) STATE.bgIndex = 0;
  // 저장된 필기 복원
  STATE.slideDrawings = loadDrawingsLocal(getCurrentLessonId());
  applyBackground();
  slideContainer.style.fontSize = STATE.fontSize + 'px';

  renderAllSlides();

  renderPanel();
  updateUI();
  setupCanvas();
  setupEvents();
  initPalette();
  setupPaletteEvents();
  setupPanelCanvasEvents();

  $('#lesson-title-bar').textContent = STATE.lesson.title || '';
  $('#status-lesson').textContent = STATE.lesson.title || '';
}

function createFallbackLesson() {
  return {
    title: 'Empty Lesson',
    settings: {},
    slides: [{ type: 'blank' }],
    resources: []
  };
}


// ===== START =====
importLessonLibrary();
syncFromSupabase(); // 논블로킹 — DB에서 최신 레슨 로드
// Try loading saved lesson first
if (!loadSavedOnStartup()) {
  // Use first library lesson, or LESSON_DATA fallback, or create fallback
  const lib = window.LESSON_LIBRARY;
  STATE.lesson = (lib && lib.length > 0 ? lib[0] : null) || window.LESSON_DATA || createFallbackLesson();
  // Auto-select the first library lesson as current
  if (lib && lib.length > 0 && STATE.lesson === lib[0]) {
    const id = 'lib_' + (lib[0].title || '').replace(/[^a-zA-Z0-9가-힣]/g, '_').substring(0, 40);
    setCurrentLessonId(id);
  }
}

init();
setupLessonManager();
setupMediaModal();

// Clear page 이벤트
$('#btn-clear-page').addEventListener('click', openClearPageModal);
$('#cp-cancel').addEventListener('click', closeClearPageModal);
$('#cp-confirm').addEventListener('click', () => { clearPage(); closeClearPageModal(); });
$('#cp-confirm-all').addEventListener('click', () => { clearAllPages(); closeClearPageModal(); });
$('#cp-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeClearPageModal(); });
// Delete confirm modal 이벤트
$('#del-cancel').addEventListener('click', closeDeleteModal);
$('#del-confirm').addEventListener('click', () => { if (_delConfirmCb) _delConfirmCb(); });
$('#del-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeDeleteModal(); });
