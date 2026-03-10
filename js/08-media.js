// ===== MEDIA MODAL =====
function openMediaModal() {
  if (!STATE.lesson) { lmToast('⚠️ 수업을 먼저 로드하세요'); return; }
  $('#media-modal').classList.add('open');
}
function closeMediaModal() {
  $('#media-modal').classList.remove('open');
  $('#m-img-url').value = '';
  $('#m-img-caption').value = '';
  $('#m-video-url').value = '';
}

// STATE.lesson 변경사항을 localStorage + Supabase에 올바르게 반영
function persistCurrentLesson() {
  const id = getCurrentLessonId();
  if (!id || !STATE.lesson) return;
  const store = getLessonStore();
  if (!store[id]) store[id] = {};
  store[id].data    = STATE.lesson;
  store[id].savedAt = Date.now();
  store[id].source  = 'user';   // library 덮어쓰기 방지
  saveLessonStore(store);
}

function createOverlayWrap(ov) {
  const w = ov.width ?? 60;
  const x = ov.x ?? (100 - w) / 2;
  const y = ov.y ?? 10;
  const wrap = document.createElement('div');
  wrap.className = 'media-wrap';
  wrap.style.cssText = `left:${x}%;top:${y}%;width:${w}%`;
  if (ov.type === 'image') {
    wrap.innerHTML = `
      <img class="slide-image" src="${esc(ov.src||'')}" alt="${esc(ov.caption||'')}"
        style="object-fit:${ov.fit||'contain'}" onerror="this.alt='이미지를 찾을 수 없습니다'">
      ${ov.caption ? `<div class="image-caption">${esc(ov.caption)}</div>` : ''}
      <button class="media-delete-btn" title="삭제">✕</button>
      <div class="resize-handle tl"></div><div class="resize-handle tr"></div><div class="resize-handle bl"></div><div class="resize-handle br"></div>`;
  } else if (ov.type === 'video') {
    wrap.innerHTML = `
      <div class="video-drag-bar">⠿ 드래그하여 이동</div>
      <div class="video-wrapper">
        <iframe src="${esc(ov.src||'')}" allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
        </iframe>
      </div>
      <button class="media-delete-btn" title="삭제">✕</button>
      <div class="resize-handle tl"></div><div class="resize-handle tr"></div><div class="resize-handle bl"></div><div class="resize-handle br"></div>`;
  }
  return wrap;
}

function renderOverlays(el, data) {
  if (!data.overlays?.length) return;
  data.overlays.forEach(ov => {
    const wrap = createOverlayWrap(ov);
    el.appendChild(wrap);
    attachMediaHandles(el, wrap, ov);
  });
}

function addMediaSlide(slideData) {
  if (!STATE.lesson?.slides) return;
  const slide = STATE.lesson.slides[STATE.currentSlide];
  if (!slide) return;
  if (!slide.overlays) slide.overlays = [];
  const { title, ...ov } = slideData;
  slide.overlays.push(ov);
  const slideEl = slideTrack.children[STATE.currentSlide];
  if (slideEl) {
    const wrap = createOverlayWrap(ov);
    slideEl.appendChild(wrap);
    attachMediaHandles(slideEl, wrap, ov);
  }
  persistCurrentLesson();
  closeMediaModal();
}

function attachMediaHandles(slideEl, wrapEl, data) {
  const wrap    = wrapEl;
  const handles = Array.from(wrapEl.querySelectorAll('.resize-handle'));
  const deleteBtn = wrapEl.querySelector('.media-delete-btn');
  // 영상은 iframe이 마우스 이벤트를 흡수하므로 drag-bar를 사용
  const dragBar = wrapEl.querySelector('.video-drag-bar');
  const dragEl  = dragBar || wrap;
  if (!wrap) return;

  // ── 클릭 선택 / 해제 ──
  wrap.addEventListener('mousedown', e => {
    // 이미 selected인 경우엔 다른 핸들 동작에 영향 안 줌
    // 다른 wrap 선택 해제 후 현재 선택
    slideEl.querySelectorAll('.media-wrap.selected').forEach(w => { if (w !== wrap) w.classList.remove('selected'); });
    wrap.classList.add('selected');
  });

  // ── 삭제 ──
  if (deleteBtn) {
    deleteBtn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      openDeleteModal(
        '미디어 삭제',
        '이 미디어를 삭제합니다.',
        () => {
          closeDeleteModal();
          const snapIdx = STATE.currentSlide;
          const slide = STATE.lesson?.slides?.[snapIdx];
          if (slide?.overlays) slide.overlays = slide.overlays.filter(o => o !== data);
          wrap.remove();
          persistCurrentLesson();
          showUndoToast('미디어가 삭제됐습니다', () => {
            const s = STATE.lesson?.slides?.[snapIdx];
            if (!s) return;
            if (!s.overlays) s.overlays = [];
            s.overlays.push(data);
            const slideEl2 = slideTrack.children[snapIdx];
            if (slideEl2) {
              const newWrap = createOverlayWrap(data);
              slideEl2.appendChild(newWrap);
              attachMediaHandles(slideEl2, newWrap, data);
            }
            persistCurrentLesson();
          });
        }
      );
    });
  }

  // ── 이동 ──
  dragEl.addEventListener('mousedown', e => {
    if (handles.some(h => e.target === h || h.contains(e.target))) return;
    if (deleteBtn && (e.target === deleteBtn || deleteBtn.contains(e.target))) return;
    e.preventDefault(); e.stopPropagation();
    const sw = slideEl.offsetWidth, sh = slideEl.offsetHeight;
    const ox = e.clientX - parseFloat(wrap.style.left) / 100 * sw;
    const oy = e.clientY - parseFloat(wrap.style.top)  / 100 * sh;
    const onMove = mv => {
      const nx = Math.max(0, Math.min(100 - parseFloat(wrap.style.width), (mv.clientX - ox) / sw * 100));
      const ny = Math.max(0, Math.min(85, (mv.clientY - oy) / sh * 100));
      wrap.style.left = nx + '%';
      wrap.style.top  = ny + '%';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      data.x = parseFloat(wrap.style.left);
      data.y = parseFloat(wrap.style.top);
      persistCurrentLesson();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // ── 리사이즈 (4모서리) ──
  handles.forEach(handle => {
    const isLeft = handle.classList.contains('tl') || handle.classList.contains('bl');
    handle.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const sw = slideEl.offsetWidth;
      const startX    = e.clientX;
      const startW    = wrap.offsetWidth;
      const startWPct = startW / sw * 100;
      const startLeft = parseFloat(wrap.style.left) || 0;
      const onMove = mv => {
        const dx = mv.clientX - startX;
        if (isLeft) {
          // 오른쪽 끝 고정, 왼쪽 끝을 이동
          const rightEdge = startLeft + startWPct;
          const newLeft = Math.max(0, Math.min(rightEdge - 15, startLeft + dx / sw * 100));
          wrap.style.left  = newLeft + '%';
          wrap.style.width = (rightEdge - newLeft) + '%';
        } else {
          // 왼쪽 끝 고정, 오른쪽 끝을 이동
          const maxW = 100 - startLeft;
          const nw = Math.max(15, Math.min(maxW, startWPct + dx / sw * 100));
          wrap.style.width = nw + '%';
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        data.x     = parseFloat(wrap.style.left);
        data.width = parseFloat(wrap.style.width);
        persistCurrentLesson();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

function toEmbedUrl(url) {
  // YouTube watch → embed
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  return url; // already embed or other platform
}


