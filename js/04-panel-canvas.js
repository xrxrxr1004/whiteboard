// ===== PANEL CANVAS =====
const panelCanvas = document.getElementById('panel-canvas');
const panelCtx = panelCanvas.getContext('2d');

function setupPanelCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = sidePanel.offsetWidth;
  const h = sidePanel.offsetHeight;
  if (!w || !h) return;
  panelCanvas.width = Math.round(w * dpr);
  panelCanvas.height = Math.round(h * dpr);
  panelCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawPanelCanvas();
}

function drawPanelSegment(from, to, stroke) {
  panelCtx.save();
  if (stroke.tool === 'pixelEraser') {
    panelCtx.globalCompositeOperation = 'destination-out';
    panelCtx.globalAlpha = 1.0;
    panelCtx.lineCap = 'round'; panelCtx.lineJoin = 'round';
  } else if (stroke.tool === 'highlighter') {
    panelCtx.globalAlpha = 0.25;
    panelCtx.lineCap = 'square'; panelCtx.lineJoin = 'miter';
  } else {
    panelCtx.globalAlpha = 1.0;
    panelCtx.lineCap = 'round'; panelCtx.lineJoin = 'round';
  }
  panelCtx.strokeStyle = stroke.color;
  panelCtx.lineWidth = stroke.width;
  panelCtx.beginPath();
  panelCtx.moveTo(from.x, from.y);
  panelCtx.lineTo(to.x, to.y);
  panelCtx.stroke();
  panelCtx.restore();
}

function drawPanelFullStroke(stroke) {
  if (stroke.points.length < 2) return;
  for (let i = 1; i < stroke.points.length; i++) {
    drawPanelSegment(stroke.points[i - 1], stroke.points[i], stroke);
  }
}

function redrawPanelCanvas() {
  const dpr = window.devicePixelRatio || 1;
  panelCtx.clearRect(0, 0, panelCanvas.width / dpr, panelCanvas.height / dpr);
  (STATE.panelDrawings || []).forEach(s => drawPanelFullStroke(s));
}

function handlePanelEraser(x, y) {
  const strokes = STATE.panelDrawings;
  if (!strokes || !strokes.length) return;
  const THRESHOLD = 20;
  for (let i = strokes.length - 1; i >= 0; i--) {
    for (const pt of strokes[i].points) {
      if (Math.hypot(pt.x - x, pt.y - y) < THRESHOLD) {
        strokes.splice(i, 1);
        redrawPanelCanvas();
        return;
      }
    }
  }
}

function getPanelPointerPos(e) {
  const rect = panelCanvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure || 0.5 };
}

function setupPanelCanvasEvents() {
  let panelDrawing = false, panelErasing = false;

  panelCanvas.addEventListener('pointerdown', e => {
    if (STATE.drawingMode === 'navigate') return;
    e.preventDefault(); e.stopPropagation();
    panelCanvas.setPointerCapture(e.pointerId);
    const pos = getPanelPointerPos(e);

    if (STATE.drawingMode === 'eraser') {
      panelErasing = true;
      if (STATE.eraserMode === 'stroke' || STATE.eraserMode === 'element') {
        handlePanelEraser(pos.x, pos.y);
      } else {
        STATE.panelCurrentStroke = { points: [pos], color: '#000000', width: STATE.pixelEraserSize, tool: 'pixelEraser' };
      }
      return;
    }

    panelDrawing = true;
    STATE.panelCurrentStroke = {
      points: [pos],
      color: STATE.penColor,
      width: STATE.drawingMode === 'highlighter' ? STATE.penWidth * 5 : STATE.penWidth,
      tool: STATE.drawingMode
    };
  });

  panelCanvas.addEventListener('pointermove', e => {
    if (!panelDrawing && !panelErasing) return;
    e.preventDefault();
    const pos = getPanelPointerPos(e);

    if (panelErasing) {
      if (STATE.eraserMode === 'stroke' || STATE.eraserMode === 'element') {
        handlePanelEraser(pos.x, pos.y);
      } else if (STATE.panelCurrentStroke) {
        STATE.panelCurrentStroke.points.push(pos);
        const pts = STATE.panelCurrentStroke.points;
        drawPanelSegment(pts[pts.length - 2], pts[pts.length - 1], STATE.panelCurrentStroke);
      }
      return;
    }

    if (STATE.panelCurrentStroke) {
      STATE.panelCurrentStroke.points.push(pos);
      const pts = STATE.panelCurrentStroke.points;
      if (pts.length >= 2) drawPanelSegment(pts[pts.length - 2], pts[pts.length - 1], STATE.panelCurrentStroke);
    }
  });

  const endPanelDraw = () => {
    if (panelErasing) {
      if (STATE.eraserMode === 'pixel' && STATE.panelCurrentStroke && STATE.panelCurrentStroke.points.length > 1) {
        STATE.panelDrawings.push(STATE.panelCurrentStroke);
        redrawPanelCanvas();
      }
      STATE.panelCurrentStroke = null;
      panelErasing = false;
      return;
    }
    if (panelDrawing && STATE.panelCurrentStroke) {
      STATE.panelDrawings.push(STATE.panelCurrentStroke);
      STATE.panelCurrentStroke = null;
    }
    panelDrawing = false;
  };
  panelCanvas.addEventListener('pointerup', endPanelDraw);
  panelCanvas.addEventListener('pointercancel', endPanelDraw);

  new ResizeObserver(() => setupPanelCanvas()).observe(sidePanel);
}

function handleEraser(x, y) {
  const strokes = STATE.slideDrawings[STATE.currentSlide];
  if (!strokes || !strokes.length) return;
  const THRESHOLD = 20;
  for (let i = strokes.length - 1; i >= 0; i--) {
    for (const pt of strokes[i].points) {
      if (Math.hypot(pt.x - x, pt.y - y) < THRESHOLD) {
        const removed = strokes.splice(i, 1)[0];
        if (!STATE.undoStack[STATE.currentSlide]) STATE.undoStack[STATE.currentSlide] = [];
        STATE.undoStack[STATE.currentSlide].push(removed);
        redrawCanvas(STATE.currentSlide);
        return;
      }
    }
  }
}

function clearDrawing() {
  const idx = STATE.currentSlide;
  const strokes = STATE.slideDrawings[idx];
  if (strokes && strokes.length) {
    STATE.undoStack[idx] = strokes.slice();
    STATE.slideDrawings[idx] = [];
    redrawCanvas(idx);
    saveDrawings();
  }
}

function undo() {
  const idx = STATE.currentSlide;
  const strokes = STATE.slideDrawings[idx];
  if (!strokes || !strokes.length) return;
  const removed = strokes.pop();
  if (!STATE.undoStack[idx]) STATE.undoStack[idx] = [];
  STATE.undoStack[idx].push(removed);
  redrawCanvas(idx);
  saveDrawings();
}

function redo() {
  const idx = STATE.currentSlide;
  const stack = STATE.undoStack[idx];
  if (!stack || !stack.length) return;
  const restored = stack.pop();
  if (!STATE.slideDrawings[idx]) STATE.slideDrawings[idx] = [];
  STATE.slideDrawings[idx].push(restored);
  redrawCanvas(idx);
  saveDrawings();
}

