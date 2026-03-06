#!/usr/bin/env node
// validate_node.js — 레슨 JS 파일 검증 스크립트
// 사용: node lessons/validate_node.js lessons/ch04_blank.js
// 신규 exercises[] 포맷 및 구 포맷 모두 지원

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('사용법: node lessons/validate_node.js <파일경로>');
  process.exit(1);
}

const src = fs.readFileSync(path.resolve(filePath), 'utf8');

// LESSON_LIBRARY.push() 호출 내용 수집
const fakeWindow = {};
const lessons = [];
fakeWindow.LESSON_LIBRARY = { push: (obj) => lessons.push(obj) };

try {
  const fn = new Function('window', src);
  fn(fakeWindow);
} catch (e) {
  console.error(`❌ JS 파싱 오류: ${e.message}`);
  process.exit(1);
}

if (lessons.length === 0) {
  console.error('❌ LESSON_LIBRARY.push() 호출 없음');
  process.exit(1);
}

let totalErrors = 0;

lessons.forEach((lesson, idx) => {
  const label = lesson.title || `lesson[${idx}]`;
  const errors = validate(lesson);
  if (errors.length === 0) {
    console.log(`✅ ${label}`);
  } else {
    console.log(`❌ ${label}`);
    errors.forEach(e => console.log(`   - ${e}`));
    totalErrors += errors.length;
  }
});

console.log('');
if (totalErrors === 0) {
  console.log(`✅ 전체 ${lessons.length}개 레슨 검증 통과`);
} else {
  console.log(`❌ 총 ${totalErrors}개 오류 발견`);
  process.exit(1);
}

function validate(lesson) {
  const errors = [];
  const slides = lesson.slides || [];
  const exercises = lesson.exercises || [];

  // passage content map: exercise_idx → content (신규), fallback → 첫 번째 passage
  const passageByIdx = {};
  slides.filter(s => s.type === 'passage').forEach(s => {
    if (s.exercise_idx !== undefined) {
      passageByIdx[s.exercise_idx] = s.content || '';
    }
  });
  const firstPassage = slides.find(s => s.type === 'passage');
  const defaultContent = firstPassage ? (firstPassage.content || '') : '';

  // Rule 1: grammar.highlight ⊂ grammar.example (모든 grammar 슬라이드 검사)
  slides.filter(s => s.type === 'grammar').forEach((grammarSlide, gsIdx) => {
    const exTag = grammarSlide.exercise_idx !== undefined
      ? `Ex${String(grammarSlide.exercise_idx + 1).padStart(2, '0')} ` : '';
    (grammarSlide.points || []).forEach((p, i) => {
      if (p.highlight && !p.example.includes(p.highlight)) {
        errors.push(`${exTag}grammar.points[${i}].highlight 불일치: "${p.highlight}"`);
      }
    });
  });

  // Rule 2: questions.answer 0-4 범위 (모든 questions 슬라이드 검사)
  slides.filter(s => s.type === 'questions').forEach((qSlide) => {
    const exTag = qSlide.exercise_idx !== undefined
      ? `Ex${String(qSlide.exercise_idx + 1).padStart(2, '0')} ` : '';
    (qSlide.items || []).forEach((item, i) => {
      if (typeof item.answer !== 'number' || item.answer < 0 || item.answer > 4) {
        errors.push(`${exTag}questions.items[${i}].answer 범위 오류: ${item.answer}`);
      }
    });
  });

  // Rule 3: keysentence.en 첫 5단어 ⊂ passage.content (exercise_idx 기준 대응)
  slides.filter(s => s.type === 'keysentence').forEach((keySlide) => {
    const idx = keySlide.exercise_idx;
    const content = (idx !== undefined && passageByIdx[idx] !== undefined)
      ? passageByIdx[idx] : defaultContent;
    if (content) {
      const exTag = idx !== undefined ? `Ex${String(idx + 1).padStart(2, '0')} ` : '';
      (keySlide.sentences || []).forEach((sent, i) => {
        const first5 = (sent.en || '').split(/\s+/).slice(0, 5).join(' ');
        if (first5 && !content.includes(first5)) {
          errors.push(`${exTag}keysentence.sentences[${i}] 원문 불일치: "${first5}..."`);
        }
      });
    }
  });

  // Rule 4: translation 배열 + en/ko 키
  // 신규: exercises[].translation / 구: lesson.translation
  if (exercises.length > 0) {
    exercises.forEach((ex, ei) => {
      const exId = ex.id || `exercises[${ei}]`;
      if (!Array.isArray(ex.translation) || ex.translation.length === 0) {
        errors.push(`${exId}: translation 배열 없음`);
      } else {
        ex.translation.forEach((t, i) => {
          if (!t.en) errors.push(`${exId}: translation[${i}].en 없음`);
          if (!t.ko) errors.push(`${exId}: translation[${i}].ko 없음`);
        });
      }
    });
  } else {
    if (!Array.isArray(lesson.translation) || lesson.translation.length === 0) {
      errors.push('translation 배열 없음 또는 비어있음');
    } else {
      lesson.translation.forEach((t, i) => {
        if (!t.en) errors.push(`translation[${i}].en 없음`);
        if (!t.ko) errors.push(`translation[${i}].ko 없음`);
      });
    }
  }

  // Rule 5: summary 구조 (신규: exercises[].summary / 구: lesson.summary)
  const summariesToCheck = exercises.length > 0
    ? exercises.map((ex, ei) => ({ label: ex.id || `exercises[${ei}]`, summary: ex.summary }))
    : [{ label: '', summary: lesson.summary }];

  summariesToCheck.forEach(({ label, summary: s }) => {
    const pre = label ? `${label}: ` : '';
    if (!s || typeof s !== 'object') {
      errors.push(`${pre}summary 객체 없음`);
    } else {
      if (!s.title_ko) errors.push(`${pre}summary.title_ko 없음`);
      if (!Array.isArray(s.flow) || s.flow.length < 2)
        errors.push(`${pre}summary.flow 배열 2개 이상 필요`);
      if (!Array.isArray(s.points) || s.points.length < 2) {
        errors.push(`${pre}summary.points 배열 2개 이상 필요`);
      } else {
        s.points.forEach((pt, i) => {
          if (typeof pt !== 'object' || !pt.label || !pt.text)
            errors.push(`${pre}summary.points[${i}] {label, text} 구조 필요`);
        });
      }
      if (!s.quote) errors.push(`${pre}summary.quote 없음`);
    }
  });

  return errors;
}
