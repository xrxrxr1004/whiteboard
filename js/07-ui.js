// ===== TOOL MANAGEMENT =====
function setTool(tool) {
  if (tool === 'clear') {
    clearDrawing();
    return;
  }
  STATE.drawingMode = tool;
  if (tool === 'eraser') {
    canvas.className = STATE.eraserMode === 'pixel' ? 'mode-eraser-pixel' : 'mode-eraser';
    panelCanvas.className = 'mode-eraser';
  } else if (tool === 'navigate') {
    canvas.className = 'mode-navigate';
    panelCanvas.className = '';
  } else {
    canvas.className = '';
    panelCanvas.className = 'mode-draw';
  }

  $$('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  updatePaletteHub();
  updatePaletteActiveStates();
  updateUI();
}

function setColor(color) {
  STATE.penColor = color;
  if (STATE.drawingMode === 'navigate' || STATE.drawingMode === 'eraser') {
    setTool('pen');
  }
  updatePaletteHub();
  updatePaletteActiveStates();
}

function setPenWidth(w) {
  STATE.penWidth = parseInt(w);
  updatePaletteActiveStates();
}

// ===== BACKGROUND & FONT =====
function cycleBackground() {
  STATE.bgIndex = (STATE.bgIndex + 1) % BACKGROUNDS.length;
  applyBackground();
}

function applyBackground() {
  BACKGROUNDS.forEach(b => app.classList.remove('theme-' + b));
  app.classList.add('theme-' + BACKGROUNDS[STATE.bgIndex]);
}

function adjustFontSize(delta) {
  STATE.fontSize = Math.max(18, Math.min(60, STATE.fontSize + delta));
  slideContainer.style.fontSize = STATE.fontSize + 'px';
}

// ===== FULLSCREEN =====
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    app.requestFullscreen().catch(() => {});
    STATE.fullscreen = true;
  } else {
    document.exitFullscreen().catch(() => {});
    STATE.fullscreen = false;
  }
}

// ===== PANEL =====
function togglePanel() {
  STATE.panelOpen = !STATE.panelOpen;
  sidePanel.classList.toggle('open', STATE.panelOpen);
  if (STATE.panelOpen) requestAnimationFrame(setupPanelCanvas);
  updateUI();
}

// ===== BLACKOUT =====
function toggleBlackout() {
  STATE.blackout = !STATE.blackout;
  blackoutEl.classList.toggle('active', STATE.blackout);
}

// ===== TOOLBAR AUTO-HIDE (비활성 — 항상 표시) =====
function resetToolbarTimer() {
  toolbar.classList.remove('hidden');
  STATE.toolbarVisible = true;
  clearTimeout(STATE.toolbarTimer);
}

// ===== UI UPDATE =====
function updateUI() {
  $('#slide-counter-text').textContent = `${STATE.currentSlide + 1} / ${STATE.totalSlides}`;
  $('#status-slide').textContent = `Slide ${STATE.currentSlide + 1}/${STATE.totalSlides}`;
  $('#btn-prev').disabled = STATE.currentSlide === 0;
  $('#btn-next').disabled = STATE.currentSlide === STATE.totalSlides - 1;
  const toolName = TOOL_LABELS[STATE.drawingMode] || STATE.drawingMode;
  const extra = STATE.drawingMode === 'pen' || STATE.drawingMode === 'highlighter' ? ` (${STATE.penWidth}px)` : '';
  $('#status-tool').textContent = toolName + extra;
  // 토글 버튼 active 상태 동기화
  $('#btn-twoF').classList.toggle('active', STATE.twoFActive);
  $('#btn-panel').classList.toggle('active', STATE.panelOpen);
}

