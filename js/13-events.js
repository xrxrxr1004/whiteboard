// ===== EVENTS =====
function setupEvents() {
  // Pointer events on canvas
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);

  // Keyboard
  document.addEventListener('keydown', handleKey);

  // Toolbar buttons
  $$('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));

  $('#btn-prev').addEventListener('click', prevSlide);
  $('#btn-next').addEventListener('click', nextSlide);

  // 슬라이드 번호 클릭 → 직접 입력 점프
  const slideCounterText = $('#slide-counter-text');
  const slideJumpInput   = $('#slide-jump-input');
  $('#slide-counter').addEventListener('click', () => {
    slideCounterText.style.display = 'none';
    slideJumpInput.style.display   = 'inline-block';
    slideJumpInput.value = STATE.currentSlide + 1;
    slideJumpInput.max   = STATE.totalSlides;
    slideJumpInput.select();
    slideJumpInput.focus();
  });
  const commitJump = () => {
    slideJumpInput.style.display   = 'none';
    slideCounterText.style.display = 'inline';
    const v = parseInt(slideJumpInput.value);
    if (!isNaN(v)) goToSlide(Math.max(0, Math.min(STATE.totalSlides - 1, v - 1)));
  };
  slideJumpInput.addEventListener('blur', commitJump);
  slideJumpInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.stopPropagation(); commitJump(); }
    if (e.key === 'Escape') { slideJumpInput.style.display = 'none'; slideCounterText.style.display = 'inline'; }
  });
  $('#btn-font-up').addEventListener('click', () => adjustFontSize(2));
  $('#btn-font-down').addEventListener('click', () => adjustFontSize(-2));
  $('#btn-bg').addEventListener('click', cycleBackground);
  $('#btn-twoF').addEventListener('click', toggle2F);
  $('#btn-panel').addEventListener('click', togglePanel);
  $('#btn-fullscreen').addEventListener('click', toggleFullscreen);
  $('#btn-add-slide').addEventListener('click', addBlankSlide);
  $('#btn-add-media').addEventListener('click', openMediaModal);
  $('#btn-delete-slide').addEventListener('click', deleteCurrentSlide);
  // 슬라이드 영역 클릭 시 overlay 선택 해제
  slideTrack.addEventListener('mousedown', e => {
    if (!e.target.closest('.media-wrap')) {
      document.querySelectorAll('.media-wrap.selected').forEach(w => w.classList.remove('selected'));
    }
  });
  $('#panel-close-btn').addEventListener('click', togglePanel);
  $$('.panel-tab').forEach(btn => btn.addEventListener('click', () => {
    STATE.panelTab = btn.dataset.tab;
    renderPanel();
  }));

  // ── 사이드 패널 너비 조절 (최초 init() 1회만 등록) ──
  if (!window._panelResizeSetup) {
    window._panelResizeSetup = true;
    const handle = $('#panel-resize-handle');
    const panel  = $('#side-panel');
    const MIN_W  = 240;
    const getMaxW = () => Math.round(slideContainer.offsetWidth * 0.4);
    let startX = 0, startW = 0, dragging = false;

    // 저장된 너비 복원 (페이지 로드 시 1회)
    const saved = localStorage.getItem(PANEL_WIDTH_KEY);
    if (saved) document.documentElement.style.setProperty('--panel-width', saved);

    handle.addEventListener('pointerdown', e => {
      dragging = true;
      startX = e.clientX;
      startW = panel.getBoundingClientRect().width;
      handle.setPointerCapture(e.pointerId);
      handle.classList.add('dragging');
      panel.classList.add('resizing');
      document.body.classList.add('panel-resizing');
      e.preventDefault();
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      const w = Math.max(MIN_W, Math.min(getMaxW(), startW + (startX - e.clientX)));
      document.documentElement.style.setProperty('--panel-width', Math.round(w) + 'px');
    });
    const endDrag = e => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      panel.classList.remove('resizing');
      document.body.classList.remove('panel-resizing');
      const w = getComputedStyle(document.documentElement).getPropertyValue('--panel-width').trim();
      localStorage.setItem(PANEL_WIDTH_KEY, w);
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  // Nav touch zones — handled on slide-container since nav-zone pointer-events are disabled
  // (slide-track has z-index:6 > nav-zone z-index:5 to allow buttons inside to be clickable)
  const navPrev = $('#nav-prev'), navNext = $('#nav-next');
  slideContainer.addEventListener('click', e => {
    if (e.target.closest('button, a, input, select, textarea, [role="button"]')) return;
    const rect = slideContainer.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (ratio < 0.12) prevSlide();
    else if (ratio > 0.88) nextSlide();
  });
  slideContainer.addEventListener('mousemove', e => {
    const rect = slideContainer.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    navPrev.style.opacity = ratio < 0.12 ? '1' : '';
    navNext.style.opacity = ratio > 0.88 ? '1' : '';
  });
  slideContainer.addEventListener('mouseleave', () => {
    navPrev.style.opacity = '';
    navNext.style.opacity = '';
  });

  // Blackout dismiss
  blackoutEl.addEventListener('click', toggleBlackout);

  // Toolbar hover reset
  toolbar.addEventListener('mouseenter', resetToolbarTimer);
  toolbar.addEventListener('touchstart', resetToolbarTimer, { passive: true });
  slideContainer.addEventListener('mousemove', resetToolbarTimer);

  // Passage click: sentence underline + text highlight
  slideTrack.addEventListener('click', (e) => {
    if (STATE.drawingMode !== 'navigate') return;
    const sent = e.target.closest('.sentence');
    if (sent) {
      sent.classList.toggle('sentence-active');
      e.stopPropagation();
    }
  });

  // Notes area: 키보드 이벤트 전파 차단 (슬라이드 전환 방지)
  slideTrack.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('notes-area')) e.stopPropagation();
  }, true);

  // Passage notes resize handles
  initPassageResize();
  restoreNotes();

  // Fullscreen change
  document.addEventListener('fullscreenchange', () => {
    STATE.fullscreen = !!document.fullscreenElement;
  });
}

function handleKey(e) {
  // Ignore key events when user is typing in an input or textarea
  const activeTag = document.activeElement && document.activeElement.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

  // Blackout: any key dismisses
  if (STATE.blackout && e.key !== 'F5') {
    e.preventDefault();
    toggleBlackout();
    return;
  }

  const key = e.key;

  // Navigation
  if (key === 'PageDown' || key === 'ArrowRight' || (key === ' ' && !e.shiftKey)) {
    e.preventDefault(); nextSlide(); resetToolbarTimer(); return;
  }
  if (key === 'PageUp' || key === 'ArrowLeft') {
    e.preventDefault(); prevSlide(); resetToolbarTimer(); return;
  }

  // 2-F toggle
  if (key === 'f' || key === 'F') {
    if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); toggle2F(); return; }
  }

  // Background
  if ((key === 'b' || key === 'B') && !e.ctrlKey && !e.metaKey) {
    e.preventDefault(); cycleBackground(); return;
  }

  // Blackout
  if (key === '.') { e.preventDefault(); toggleBlackout(); return; }

  // Font size
  if (key === '=' || key === '+') { e.preventDefault(); adjustFontSize(2); return; }
  if (key === '-' || key === '_') { e.preventDefault(); adjustFontSize(-2); return; }

  // Undo/Redo
  if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'Z')) {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }

  // Palette toggle
  if ((key === 'p' || key === 'P') && !e.ctrlKey && !e.metaKey) {
    e.preventDefault(); togglePalette(); return;
  }

  // Escape
  if (key === 'Escape') {
    if (STATE.paletteLevel > 0) { collapsePalette(); return; }
    if ($('#cp-modal').classList.contains('open')) { closeClearPageModal(); return; }
    if ($('#media-modal').classList.contains('open')) { closeMediaModal(); return; }
    if ($('#lesson-modal').classList.contains('open')) { closeLessonModal(); return; }
    if (STATE.panelOpen) { togglePanel(); return; }
    if (STATE.drawingMode !== 'navigate') { setTool('navigate'); return; }
    if (STATE.fullscreen) { toggleFullscreen(); return; }
  }

  // Fullscreen
  if (key === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
  if (key === 'F5') { e.preventDefault(); toggleFullscreen(); return; }

  // 빈 페이지 추가
  if ((key === 'n' || key === 'N') && !e.ctrlKey && !e.metaKey) {
    e.preventDefault(); addBlankSlide(); return;
  }

  // 미디어 추가
  if ((key === 'm' || key === 'M') && !e.ctrlKey && !e.metaKey) {
    e.preventDefault(); openMediaModal(); return;
  }

  // Lesson Manager
  if ((key === 'l' || key === 'L') && !e.ctrlKey && !e.metaKey) {
    e.preventDefault(); openLessonModal(); return;
  }

  // Tool shortcuts
  if (key === '1') { setTool('navigate'); return; }
  if (key === '2') { setTool('pen'); return; }
  if (key === '3') { setTool('highlighter'); return; }
  if (key === '4') { setTool('eraser'); return; }

  resetToolbarTimer();
}

