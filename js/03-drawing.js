// ===== DRAWING ENGINE =====
function setupCanvas() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const rect = slideContainer.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawCanvas(STATE.currentSlide);
}

function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure || 0.5 };
}

function onPointerDown(e) {
  if (STATE.drawingMode === 'navigate') return;
  if (STATE.drawingMode === 'clear') return;
  e.preventDefault();
  const pos = getPointerPos(e);

  if (STATE.drawingMode === 'eraser') {
    // Check text-hl FIRST (before stroke/pixel which always returns)
    const hitEl = hitTestThrough(e.clientX, e.clientY);
    if (hitEl) {
      const sent = hitEl.closest('.sentence');
      if (sent && sent.classList.contains('text-hl')) {
        sent.classList.remove('text-hl');
        STATE.textErasing = true;
        return;
      }
    }
    STATE.isErasing = true;
    if (STATE.eraserMode === 'stroke') {
      handleEraser(pos.x, pos.y);
    } else {
      // Pixel eraser: start eraser stroke
      STATE.currentStroke = {
        points: [pos],
        color: '#000000',
        width: STATE.pixelEraserSize,
        tool: 'pixelEraser',
        slideIndex: STATE.currentSlide
      };
    }
    return;
  }

  // Text-following highlighter: if highlighter tool over passage text, apply CSS highlight
  if (STATE.drawingMode === 'highlighter') {
    const hitEl = hitTestThrough(e.clientX, e.clientY);
    if (hitEl) {
      const sent = hitEl.closest('.sentence');
      if (sent) {
        sent.classList.add('text-hl');
        STATE.textHighlighting = true;
        return;
      }
      const ptxt = hitEl.closest('.passage-text');
      if (ptxt) {
        STATE.textHighlighting = true;
        return;
      }
    }
  }

  STATE.textHighlighting = false;
  STATE.isDrawing = true;
  STATE.currentStroke = {
    points: [pos],
    color: STATE.penColor,
    width: STATE.drawingMode === 'highlighter' ? STATE.penWidth * 5 : STATE.penWidth,
    tool: STATE.drawingMode,
    slideIndex: STATE.currentSlide
  };
}

function onPointerMove(e) {
  // Eraser drag
  if (STATE.isErasing && STATE.drawingMode === 'eraser') {
    e.preventDefault();
    const pos = getPointerPos(e);
    if (STATE.eraserMode === 'stroke') {
      handleEraser(pos.x, pos.y);
    } else if (STATE.currentStroke) {
      STATE.currentStroke.points.push(pos);
      const pts = STATE.currentStroke.points;
      if (pts.length >= 2) {
        drawSegment(pts[pts.length - 2], pts[pts.length - 1], STATE.currentStroke);
      }
    }
    return;
  }
  // Text-following eraser: remove CSS highlight on dragged sentences
  if (STATE.textErasing && STATE.drawingMode === 'eraser') {
    e.preventDefault();
    const hitEl = hitTestThrough(e.clientX, e.clientY);
    if (hitEl) {
      const sent = hitEl.closest('.sentence');
      if (sent) sent.classList.remove('text-hl');
    }
    return;
  }
  // Text-following highlighter: highlight sentences as pointer drags over them
  if (STATE.textHighlighting && STATE.drawingMode === 'highlighter') {
    e.preventDefault();
    const hitEl = hitTestThrough(e.clientX, e.clientY);
    if (hitEl) {
      const sent = hitEl.closest('.sentence');
      if (sent) sent.classList.add('text-hl');
    }
    return;
  }
  if (!STATE.isDrawing) return;
  e.preventDefault();
  const pos = getPointerPos(e);
  STATE.currentStroke.points.push(pos);
  const pts = STATE.currentStroke.points;
  if (pts.length >= 2) {
    drawSegment(pts[pts.length - 2], pts[pts.length - 1], STATE.currentStroke);
  }
}

function onPointerUp(e) {
  // Eraser end
  if (STATE.isErasing) {
    STATE.isErasing = false;
    if (STATE.eraserMode === 'pixel' && STATE.currentStroke && STATE.currentStroke.points.length > 1) {
      const idx = STATE.currentSlide;
      if (!STATE.slideDrawings[idx]) STATE.slideDrawings[idx] = [];
      STATE.slideDrawings[idx].push(STATE.currentStroke);
      STATE.undoStack[idx] = [];
    }
    STATE.currentStroke = null;
    return;
  }
  if (STATE.textErasing) { STATE.textErasing = false; return; }
  if (STATE.textHighlighting) { STATE.textHighlighting = false; return; }
  if (!STATE.isDrawing) return;
  STATE.isDrawing = false;
  const idx = STATE.currentSlide;
  if (!STATE.slideDrawings[idx]) STATE.slideDrawings[idx] = [];
  STATE.slideDrawings[idx].push(STATE.currentStroke);
  STATE.undoStack[idx] = [];
  STATE.currentStroke = null;
  saveDrawings();
}

function drawSegment(from, to, stroke) {
  ctx.save();
  if (stroke.tool === 'pixelEraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.25;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
  } else {
    ctx.globalAlpha = 1.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawFullStroke(stroke) {
  if (stroke.points.length < 2) return;
  for (let i = 1; i < stroke.points.length; i++) {
    drawSegment(stroke.points[i - 1], stroke.points[i], stroke);
  }
}

function redrawCanvas(slideIndex) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const strokes = STATE.slideDrawings[slideIndex] || [];
  strokes.forEach(s => drawFullStroke(s));
}


// ===== DRAWINGS PERSISTENCE (localStorage only — 기기별 독립) =====
function drawingsKey() { return DRAW_KEY_PREFIX + (getCurrentLessonId() || '__default'); }
function saveDrawings() {
  try { localStorage.setItem(drawingsKey(), JSON.stringify(STATE.slideDrawings)); } catch(e) {}
}
function loadDrawingsLocal(lessonKey) {
  try {
    const key = DRAW_KEY_PREFIX + (lessonKey || '__default');
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

