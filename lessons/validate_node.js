#!/usr/bin/env node
// validate_node.js — 레슨 JS 파일 검증 스크립트
// 사용: node lessons/validate_node.js lessons/ch04_blank.js

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

  // passage slide content 추출 (Rule 3용)
  const passageSlide = (lesson.slides || []).find(s => s.type === 'passage');
  const content = passageSlide ? (passageSlide.content || '') : '';

  // Rule 1: grammar.highlight ⊂ grammar.example
  const grammarSlide = (lesson.slides || []).find(s => s.type === 'grammar');
  if (grammarSlide) {
    (grammarSlide.points || []).forEach((p, i) => {
      if (p.highlight && !p.example.includes(p.highlight)) {
        errors.push(`grammar.points[${i}].highlight 불일치: "${p.highlight}"`);
      }
    });
  }

  // Rule 2: questions.answer 0-4 범위
  const questionsSlide = (lesson.slides || []).find(s => s.type === 'questions');
  if (questionsSlide) {
    (questionsSlide.items || []).forEach((item, i) => {
      if (typeof item.answer !== 'number' || item.answer < 0 || item.answer > 4) {
        errors.push(`questions.items[${i}].answer 범위 오류: ${item.answer}`);
      }
    });
  }

  // Rule 3: keysentence.en 첫 5단어 ⊂ passage.content
  const keySlide = (lesson.slides || []).find(s => s.type === 'keysentence');
  if (keySlide && content) {
    (keySlide.sentences || []).forEach((sent, i) => {
      const first5 = (sent.en || '').split(/\s+/).slice(0, 5).join(' ');
      if (first5 && !content.includes(first5)) {
        errors.push(`keysentence.sentences[${i}] 원문 불일치: "${first5}..."`);
      }
    });
  }

  // Rule 4: translation 배열 + en/ko 키
  if (!Array.isArray(lesson.translation) || lesson.translation.length === 0) {
    errors.push('translation 배열 없음 또는 비어있음');
  } else {
    lesson.translation.forEach((t, i) => {
      if (!t.en) errors.push(`translation[${i}].en 없음`);
      if (!t.ko) errors.push(`translation[${i}].ko 없음`);
    });
  }

  // Rule 5: summary 객체 + topic + points
  if (!lesson.summary || typeof lesson.summary !== 'object') {
    errors.push('summary 객체 없음');
  } else {
    if (!lesson.summary.topic) errors.push('summary.topic 없음');
    if (!Array.isArray(lesson.summary.points) || lesson.summary.points.length === 0) {
      errors.push('summary.points 없음 또는 비어있음');
    }
  }

  return errors;
}
