// ===== STATE =====
const STATE = {
  currentSlide: 0,
  totalSlides: 0,
  drawingMode: 'navigate',
  penColor: '#e11d48',
  penWidth: 4,
  isDrawing: false,
  currentStroke: null,
  slideDrawings: {},
  undoStack: {},
  twoFActive: false,
  toolbarVisible: true,
  toolbarTimer: null,
  panelOpen: false,
  panelTab: 'vocab',
  panelDrawings: [],
  panelCurrentStroke: null,
  fullscreen: false,
  fontSize: 32,
  bgIndex: 0,
  lesson: null,
  blackout: false,
  textHighlighting: false,
  eraserMode: 'stroke',    // 'stroke' or 'pixel'
  pixelEraserSize: 24,     // pixel eraser brush diameter
  isErasing: false,
  paletteLevel: 0,   // 0=collapsed, 1=level1(tools), 2=level2(colors/eraser-options)
  palettePos: null
};

const BACKGROUNDS = ['white', 'grid', 'lined', 'dark', 'sepia'];
const TOOL_LABELS = { navigate: '포인터', pen: '펜', highlighter: '형광펜', eraser: '지우개' };
const OPTION_LABELS = ['①', '②', '③', '④', '⑤'];


// ===== DOM REFS =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const app = $('#app-container');
const toolbar = $('#toolbar');
const slideTrack = $('#slide-track');
const slideContainer = $('#slide-container');
const canvas = $('#drawing-canvas');
const ctx = canvas.getContext('2d');
const sidePanel = $('#side-panel');
const blackoutEl = $('#blackout');


// ===== UTILITIES =====
// Hit-test through the canvas overlay to find elements underneath
function hitTestThrough(x, y) {
  canvas.style.pointerEvents = 'none';
  const el = document.elementFromPoint(x, y);
  canvas.style.pointerEvents = '';
  return el;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
function escRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
