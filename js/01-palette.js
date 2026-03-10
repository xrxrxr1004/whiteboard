// ===== RADIAL PALETTE =====
const RP_INNER_RADIUS = 75;
const RP_OUTER_RADIUS = 130;
const RP_DRAG_THRESHOLD = 8;
const RP_PALETTE_KEY   = 'wb_palette_pos';
const DRAW_KEY_PREFIX  = 'wb_draw_';
const NOTES_KEY_PREFIX = 'wb_notes_';
const PANEL_WIDTH_KEY  = 'wb-panel-width';
const RP_TOOL_ICONS = {
  navigate: '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>',
  pen: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  highlighter: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>'
};

function initPalette() {
  const container = document.querySelector('#slide-container');
  const rect = container.getBoundingClientRect();
  const saved = loadPalettePos();
  const pos = saved || { x: rect.width - 80, y: rect.height - 80 };
  STATE.palettePos = pos;
  applyPalettePos(pos);
  computeRingPositions();
  updatePaletteHub();
  updatePaletteActiveStates();
}

function computeRingPositions() {
  document.querySelectorAll('.rp-ring-inner .rp-item').forEach(item => {
    const deg = parseInt(item.dataset.rpAngle);
    const rad = (deg - 90) * Math.PI / 180;
    item.style.setProperty('--rp-x', (RP_INNER_RADIUS * Math.cos(rad)) + 'px');
    item.style.setProperty('--rp-y', (RP_INNER_RADIUS * Math.sin(rad)) + 'px');
  });
  document.querySelectorAll('.rp-ring-outer .rp-item').forEach(item => {
    const deg = parseInt(item.dataset.rpAngle);
    const rad = (deg - 90) * Math.PI / 180;
    item.style.setProperty('--rp-x', (RP_OUTER_RADIUS * Math.cos(rad)) + 'px');
    item.style.setProperty('--rp-y', (RP_OUTER_RADIUS * Math.sin(rad)) + 'px');
  });
}

function updatePaletteHub() {
  const icon = document.querySelector('#rp-hub-icon');
  const palette = document.querySelector('#radial-palette');
  if (!icon || !palette) return;
  const tool = STATE.drawingMode;
  icon.innerHTML = RP_TOOL_ICONS[tool] || RP_TOOL_ICONS.pen;
  const isDrawing = (tool === 'pen' || tool === 'highlighter');
  palette.classList.toggle('rp-drawing', isDrawing);
  if (isDrawing) palette.style.setProperty('--rp-active-color', STATE.penColor);
}

function updatePaletteActiveStates() {
  document.querySelectorAll('.rp-tool').forEach(b => {
    const t = b.dataset.rpTool;
    b.classList.toggle('rp-active', t === STATE.drawingMode);
  });
  document.querySelectorAll('.rp-color').forEach(b => b.classList.toggle('rp-active', b.dataset.rpColor === STATE.penColor));
  document.querySelectorAll('.rp-width').forEach(b => b.classList.toggle('rp-active', b.dataset.rpWidth === String(STATE.penWidth)));
}

function setPaletteLevel(level) {
  const p = document.querySelector('#radial-palette');
  if (!p) return;
  p.classList.remove('rp-collapsed', 'rp-level1', 'rp-level2');
  if (level === 0) p.classList.add('rp-collapsed');
  else if (level === 1) p.classList.add('rp-level1');
  else if (level === 2) p.classList.add('rp-level2');
  STATE.paletteLevel = level;
  if (level === 1) updatePaletteActiveStates();
  // Clear rp-selected on all inner items when not level2
  if (level !== 2) {
    document.querySelectorAll('.rp-ring-inner .rp-item').forEach(b => b.classList.remove('rp-selected'));
  }
}

function collapsePalette() {
  const p = document.querySelector('#radial-palette');
  if (p) p.classList.remove('rp-eraser-l2');
  setPaletteLevel(0);
}

function togglePalette() {
  STATE.paletteLevel === 0 ? setPaletteLevel(1) : setPaletteLevel(0);
}

function enterLevel2(toolName) {
  const palette = document.querySelector('#radial-palette');
  // Mark selected tool
  const selectedBtn = document.querySelector(`.rp-tool[data-rp-tool="${toolName}"]`);
  document.querySelectorAll('.rp-ring-inner .rp-item').forEach(b => {
    b.classList.toggle('rp-selected', b === selectedBtn);
  });
  const toolAngle = parseInt(selectedBtn.dataset.rpAngle);

  if (toolName === 'eraser') {
    // Eraser level2: show eraser sub-ring
    palette.classList.add('rp-eraser-l2');
    const eraserItems = document.querySelectorAll('.rp-ring-eraser .rp-item');
    const count = eraserItems.length;
    const spacing = 30;
    const startAngle = toolAngle - (count - 1) * spacing / 2;
    eraserItems.forEach((item, i) => {
      const deg = startAngle + i * spacing;
      const rad = (deg - 90) * Math.PI / 180;
      item.style.setProperty('--rp-x', (RP_OUTER_RADIUS * Math.cos(rad)) + 'px');
      item.style.setProperty('--rp-y', (RP_OUTER_RADIUS * Math.sin(rad)) + 'px');
    });
    updateEraserActiveStates();
  } else {
    // Pen/highlighter level2: show color/width ring
    palette.classList.remove('rp-eraser-l2');
    const outerItems = document.querySelectorAll('.rp-ring-outer .rp-item');
    const count = outerItems.length;
    const spacing = 20;
    const startAngle = toolAngle - (count - 1) * spacing / 2;
    outerItems.forEach((item, i) => {
      const deg = startAngle + i * spacing;
      const rad = (deg - 90) * Math.PI / 180;
      item.style.setProperty('--rp-x', (RP_OUTER_RADIUS * Math.cos(rad)) + 'px');
      item.style.setProperty('--rp-y', (RP_OUTER_RADIUS * Math.sin(rad)) + 'px');
    });
  }
  setPaletteLevel(2);
}

function updateEraserActiveStates() {
  document.querySelectorAll('.rp-eraser-opt').forEach(b => {
    const mode = b.dataset.rpEraser;
    const size = b.dataset.rpEsize;
    if (mode === 'stroke') {
      b.classList.toggle('rp-active', STATE.eraserMode === 'stroke');
    } else {
      b.classList.toggle('rp-active', STATE.eraserMode === 'pixel' && String(STATE.pixelEraserSize) === size);
    }
  });
}

function applyPalettePos(pos) {
  const p = document.querySelector('#radial-palette');
  if (!p) return;
  p.style.left = pos.x + 'px';
  p.style.top = pos.y + 'px';
}

function clampPalettePos(x, y) {
  const rect = document.querySelector('#slide-container').getBoundingClientRect();
  // 허브 중심이 화면 내에만 있으면 됨 (30px)
  const m = 30;
  return { x: Math.max(m, Math.min(rect.width - m, x)), y: Math.max(m, Math.min(rect.height - m, y)) };
}

function savePalettePos(pos) {
  try { localStorage.setItem(RP_PALETTE_KEY, JSON.stringify(pos)); } catch(e) {}
}

function loadPalettePos() {
  try {
    const r = localStorage.getItem(RP_PALETTE_KEY);
    if (!r) return null;
    const p = JSON.parse(r);
    if (typeof p.x === 'number' && typeof p.y === 'number') return p;
  } catch(e) {}
  return null;
}

function setupPaletteEvents() {
  const hub = document.querySelector('#rp-hub');
  const palette = document.querySelector('#radial-palette');
  const cvs = document.querySelector('#drawing-canvas');
  if (!hub || !palette) return;
  let drag = null;

  hub.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    hub.setPointerCapture(e.pointerId);
    drag = { sx: e.clientX, sy: e.clientY, px: STATE.palettePos.x, py: STATE.palettePos.y, moving: false, id: e.pointerId };
  });

  hub.addEventListener('pointermove', e => {
    if (!drag) return;
    e.preventDefault();
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moving && Math.sqrt(dx*dx + dy*dy) > RP_DRAG_THRESHOLD) {
      drag.moving = true;
      palette.classList.add('rp-dragging');
      if (STATE.paletteLevel > 0) collapsePalette();
    }
    if (drag.moving) {
      const c = clampPalettePos(drag.px + dx, drag.py + dy);
      STATE.palettePos = c;
      applyPalettePos(c);
    }
  });

  hub.addEventListener('pointerup', e => {
    if (!drag) return;
    e.preventDefault();
    if (drag.moving) {
      savePalettePos(STATE.palettePos);
      palette.classList.remove('rp-dragging');
    } else {
      togglePalette();
    }
    hub.releasePointerCapture(drag.id);
    drag = null;
  });

  hub.addEventListener('pointercancel', e => {
    if (!drag) return;
    palette.classList.remove('rp-dragging');
    hub.releasePointerCapture(drag.id);
    drag = null;
  });

  // Tool selection (inner ring)
  document.querySelectorAll('.rp-tool').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const t = btn.dataset.rpTool;

      if (t === 'navigate') {
        setTool('navigate');
        updatePaletteHub();
        updatePaletteActiveStates();
        collapsePalette();
      } else if (t === 'pen' || t === 'highlighter') {
        // If already in level2 for this tool, collapse
        if (STATE.paletteLevel === 2 && btn.classList.contains('rp-selected')) {
          collapsePalette();
          return;
        }
        setTool(t);
        updatePaletteHub();
        updatePaletteActiveStates();
        enterLevel2(t);
      } else if (t === 'eraser') {
        // If already in level2 for eraser, collapse
        if (STATE.paletteLevel === 2 && btn.classList.contains('rp-selected')) {
          collapsePalette();
          return;
        }
        setTool(t);
        updatePaletteHub();
        updatePaletteActiveStates();
        enterLevel2(t);
      } else if (t === 'sidepanel') {
        // Toggle side panel
        const panel = document.querySelector('#side-panel');
        if (panel) panel.classList.toggle('open');
        setTimeout(collapsePalette, 200);
      }
    });
  });

  // Color selection (outer ring)
  document.querySelectorAll('.rp-color').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setColor(btn.dataset.rpColor);
      updatePaletteHub();
      updatePaletteActiveStates();
      setTimeout(collapsePalette, 150);
    });
  });

  // Width selection (outer ring)
  document.querySelectorAll('.rp-width').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setPenWidth(btn.dataset.rpWidth);
      updatePaletteActiveStates();
      setTimeout(collapsePalette, 150);
    });
  });

  // Eraser mode selection (eraser sub-ring)
  document.querySelectorAll('.rp-eraser-opt').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const mode = btn.dataset.rpEraser;
      if (mode === 'stroke') {
        STATE.eraserMode = 'stroke';
      } else {
        STATE.eraserMode = 'pixel';
        STATE.pixelEraserSize = parseInt(btn.dataset.rpEsize) || 24;
      }
      setTool('eraser');
      updatePaletteHub();
      updateEraserActiveStates();
      setTimeout(collapsePalette, 200);
    });
  });

  // Auto-collapse on outside tap
  document.addEventListener('pointerdown', e => {
    if (STATE.paletteLevel === 0) return;
    if (palette.contains(e.target)) return;
    collapsePalette();
  }, true);

  // Auto-collapse when drawing starts
  if (cvs) cvs.addEventListener('pointerdown', () => { if (STATE.paletteLevel > 0) collapsePalette(); });

  // Re-clamp on resize
  new ResizeObserver(() => {
    if (STATE.palettePos) {
      STATE.palettePos = clampPalettePos(STATE.palettePos.x, STATE.palettePos.y);
      applyPalettePos(STATE.palettePos);
    }
  }).observe(document.querySelector('#slide-container'));
}

