// ===== SUPABASE =====
const SB_URL = 'https://kaucebkhvnzgtgzgnrvy.supabase.co';
const SB_KEY = 'sb_publishable_jen7RSuHUMU6Or5tN126xQ_OFJ7AZ2e';
let sb = null;
try {
  sb = window.supabase.createClient(SB_URL, SB_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
} catch(e) { console.warn('Supabase init failed', e); }

// DB → 로컬 동기화 (last-write-wins by saved_at)
async function syncFromSupabase() {
  if (!sb) return;
  const { data, error } = await sb.from('lessons')
    .select('lesson_key,title,data,saved_at')
    .is('deleted_at', null);
  if (error || !data) return;
  const store = getLessonStore();
  let changed = false;
  let currentUpdated = false;
  const currentId = getCurrentLessonId();
  data.forEach(row => {
    const local = store[row.lesson_key];
    // library 항목은 사용자 저장 데이터(클라우드)가 항상 우선
    if (!local || local.source === 'library' || row.saved_at > (local.savedAt ?? 0)) {
      store[row.lesson_key] = { data: row.data, savedAt: row.saved_at, source: 'cloud' };
      changed = true;
      if (row.lesson_key === currentId) currentUpdated = true;
    }
  });
  if (changed) { saveLessonStoreLocal(store); renderSavedList?.(); }
  // 현재 열려있는 레슨이 업데이트됐으면 슬라이드 재렌더링
  if (currentUpdated && STATE.lesson) {
    const savedIdx = STATE.currentSlide;
    loadLessonData(store[currentId].data, currentId);
    goToSlide(savedIdx);
  }
}

// 로컬 → DB 동기화 (upsert)
async function pushLessonsToSB(store) {
  if (!sb) return;
  const rows = Object.entries(store)
    .filter(([key, entry]) => entry.data)
    .map(([lesson_key, entry]) => ({
      lesson_key,
      title: entry.data?.title ?? lesson_key,
      data: entry.data,
      saved_at: entry.savedAt ?? Date.now(),
      deleted_at: null,
      updated_at: new Date().toISOString()
    }));
  if (!rows.length) return;
  try {
    const { error } = await sb.from('lessons').upsert(rows, { onConflict: 'lesson_key' });
    if (error) throw error;
  } catch(e) {
    console.error('SB push failed', e);
    lmToast?.('⚠️ DB 저장 실패 — 로컬에만 저장됨');
  }
}

// 소프트 삭제
async function deleteFromSB(key) {
  if (!sb) return;
  try {
    await sb.from('lessons')
      .update({ deleted_at: new Date().toISOString() })
      .eq('lesson_key', key);
  } catch(e) { console.warn('SB delete failed', e); }
}

