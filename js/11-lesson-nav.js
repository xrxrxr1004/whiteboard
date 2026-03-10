// ===== LESSON NAV DROPDOWN =====
function extractChapter(title) {
  if (!title) return '기타';
  // Match patterns: Ch3, Chapter 3, L3, Lesson 3, 3과, Unit 3, etc.
  const m = title.match(/(?:ch(?:apter)?|l(?:esson)?|unit|과)\s*(\d+)/i)
    || title.match(/(\d+)\s*과/);
  if (m) return (m[0].match(/과/) ? m[1] + '과' : m[0]).replace(/\s+/g, ' ');
  return null;
}

const lnavExpanded = new Set();

function buildLnavSubItems(data) {
  const items = [];
  const slides = data.slides || [];
  if (data.exercises && data.exercises.length > 0) {
    data.exercises.forEach((ex, ei) => {
      const slideIdx = slides.findIndex(s => s.type === 'passage' && s.exercise_idx === ei);
      const label = [ex.id, ex.subtitle].filter(Boolean).join(' · ');
      items.push({ label, slideIdx: slideIdx >= 0 ? slideIdx : -1 });
    });
  } else {
    slides.forEach((s, i) => {
      if (s.type === 'passage') items.push({ label: s.title || 'Passage', slideIdx: i });
    });
  }
  return items;
}

let lnavSearchQuery = '';

function renderLessonNavItems(dd) {
  let itemsEl = dd.querySelector('.lnav-items');
  if (!itemsEl) {
    itemsEl = document.createElement('div');
    itemsEl.className = 'lnav-items';
    dd.appendChild(itemsEl);

    // Delegated listener registered ONCE on itemsEl creation
    itemsEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const curId = getCurrentLessonId();

      // ▶ arrow: toggle only
      const arrow = e.target.closest('.lnav-arrow');
      if (arrow) {
        const id = arrow.dataset.arrowId;
        if (lnavExpanded.has(id)) lnavExpanded.delete(id); else lnavExpanded.add(id);
        renderLessonNavItems(dd);
        return;
      }

      // ✏️ rename
      const renameBtn = e.target.closest('.lnav-rename-btn');
      if (renameBtn) {
        const id = renameBtn.dataset.renameId;
        const storeItem = getLessonStore()[id];
        const currentTitle = (storeItem && storeItem.data && storeItem.data.title) || id;
        const lnavItem = renameBtn.closest('.lnav-item');
        const inp = document.createElement('input');
        inp.className = 'lnav-rename-input';
        inp.value = currentTitle;
        lnavItem.innerHTML = '';
        lnavItem.appendChild(inp);
        inp.focus();
        inp.select();
        let committed = false;
        const commit = () => {
          if (committed) return;
          committed = true;
          renameLessonInStore(id, inp.value.trim() || currentTitle);
        };
        inp.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
          if (ev.key === 'Escape') { committed = true; renderLessonNav(); }
        });
        inp.addEventListener('blur', commit);
        return;
      }

      // Sub-item: jump to slide
      const subItem = e.target.closest('.lnav-sub-item');
      if (subItem) {
        const id = subItem.dataset.subId;
        const slideIdx = parseInt(subItem.dataset.slideIdx);
        if (id !== curId) {
          const storeItem = getLessonStore()[id];
          if (storeItem && storeItem.data) { setCurrentLessonId(id); loadLessonData(storeItem.data, id); }
        }
        if (slideIdx >= 0) goToSlide(slideIdx);
        closeLessonNav();
        return;
      }

      // Manage button
      if (e.target.closest('.lnav-manage-btn')) { closeLessonNav(); openLessonModal(); return; }

      // Lesson row: load lesson
      const item = e.target.closest('.lnav-item');
      if (item) {
        const id = item.dataset.navId;
        if (id !== curId) {
          const storeItem = getLessonStore()[id];
          if (storeItem && storeItem.data) {
            setCurrentLessonId(id);
            loadLessonData(storeItem.data, id);
            lnavExpanded.add(id);
            renderLessonNavItems(dd);
          }
        }
      }
    });
  }

  // Re-render HTML only (listener already set up)
  const store = getLessonStore();
  const keys = Object.keys(store).sort((a, b) => (store[a].savedAt || 0) - (store[b].savedAt || 0));
  const currentId = getCurrentLessonId();

  function renderItem(id, item) {
    const active = id === currentId ? ' active' : '';
    const isExpanded = lnavExpanded.has(id);
    const expandedCls = isExpanded ? ' expanded' : '';
    const title = (item.data && item.data.title) || id;

    let subHtml = '';
    if (isExpanded && item.data) {
      const subItems = buildLnavSubItems(item.data);
      if (subItems.length > 0) {
        const curSlide = id === currentId ? STATE.currentSlide : -1;
        subHtml = `<div class="lnav-sub-list">` +
          subItems.map(({ label, slideIdx }) => {
            const cur = slideIdx >= 0 && slideIdx === curSlide ? ' current-slide' : '';
            return `<div class="lnav-sub-item${cur}" data-sub-id="${esc(id)}" data-slide-idx="${slideIdx}">${esc(label)}</div>`;
          }).join('') +
        `</div>`;
      }
    }

    return `<div class="lnav-item${active}${expandedCls}" data-nav-id="${esc(id)}">
      <span class="lnav-arrow" data-arrow-id="${esc(id)}">▶</span>
      <span class="lnav-item-title">${esc(title)}</span>
      <button class="lnav-rename-btn" data-rename-id="${esc(id)}" title="제목 수정">✏️</button>
    </div>${subHtml}`;
  }

  const q = lnavSearchQuery.trim().toLowerCase();
  const filtered = q
    ? keys.filter(k => ((store[k].data && store[k].data.title) || k).toLowerCase().includes(q))
    : keys;

  let html = '';
  if (keys.length === 0) {
    html = '<div class="lnav-empty">저장된 수업이 없습니다.<br>📚 버튼으로 수업을 추가하세요.</div>';
  } else {
    filtered.forEach(k => { html += renderItem(k, store[k]); });
  }
  html += '<div class="lnav-footer"><button class="lnav-manage-btn">📚 수업 관리 열기</button></div>';
  itemsEl.innerHTML = html;
}

function renderLessonNav() {
  const dd = $('#lesson-nav-dropdown');
  const store = getLessonStore();
  const keys = Object.keys(store).sort((a, b) => (store[a].savedAt || 0) - (store[b].savedAt || 0));
  const currentId = getCurrentLessonId();

  if (currentId) lnavExpanded.add(currentId);

  // Build skeleton once (search stays in DOM across re-renders)
  if (!dd.querySelector('.lnav-search-wrap')) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'lnav-search-wrap';
    searchWrap.innerHTML = '<input class="lnav-search" type="text" placeholder="수업 검색...">';
    dd.appendChild(searchWrap);

    const searchEl = searchWrap.querySelector('.lnav-search');
    searchEl.addEventListener('compositionend', (e) => {
      lnavSearchQuery = e.target.value;
      renderLessonNavItems(dd);
    });
    searchEl.addEventListener('input', (e) => {
      if (e.isComposing) return;
      lnavSearchQuery = e.target.value;
      renderLessonNavItems(dd);
    });
    searchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { lnavSearchQuery = ''; closeLessonNav(); }
      e.stopPropagation();
    });
  }

  // Sync search value if cleared externally
  const searchEl = dd.querySelector('.lnav-search');
  if (searchEl && searchEl.value !== lnavSearchQuery) searchEl.value = lnavSearchQuery;

  renderLessonNavItems(dd);
}

function toggleLessonNav() {
  const dd = $('#lesson-nav-dropdown');
  if (dd.classList.contains('open')) {
    closeLessonNav();
  } else {
    renderLessonNav();
    dd.classList.add('open');
  }
}

function closeLessonNav() {
  $('#lesson-nav-dropdown').classList.remove('open');
}

function renameLessonInStore(oldId, newTitle) {
  if (!newTitle.trim() || newTitle === oldId) { renderLessonNav(); return; }
  const store = getLessonStore();
  if (!store[oldId]) { renderLessonNav(); return; }
  store[newTitle] = { ...store[oldId], data: { ...store[oldId].data, title: newTitle } };
  delete store[oldId];
  saveLessonStore(store);
  deleteFromSB(oldId); // 논블로킹 (새 key는 pushLessonsToSB가 처리)
  if (getCurrentLessonId() === oldId) {
    setCurrentLessonId(newTitle);
    STATE.lesson.title = newTitle;
    $('#lesson-title-bar').textContent = newTitle;
    const sl = $('#status-lesson');
    if (sl) sl.textContent = newTitle;
    // Re-render title slides (renderer reads STATE.lesson.title)
    (STATE.lesson.slides || []).forEach((data, i) => {
      if (data.type === 'title') {
        const el = slideTrack.children[i];
        if (el) { el.innerHTML = ''; RENDERERS.title(el, data, i); }
      }
    });
  }
  renderLessonNav();
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#lesson-nav-wrap')) closeLessonNav();
});

// Wire up title bar button
$('#lesson-title-bar').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleLessonNav();
});

// Load saved lesson on startup (if exists)
function loadSavedOnStartup() {
  const id = getCurrentLessonId();
  if (!id) return false;
  const store = getLessonStore();
  const item = store[id];
  if (item && item.data && item.data.slides) {
    STATE.lesson = item.data;
    return true;
  }
  return false;
}

