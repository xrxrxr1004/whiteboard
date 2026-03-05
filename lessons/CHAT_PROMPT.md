# 양영학원 화이트보드 — Claude.ai 채팅용 프롬프트

> **이 파일의 용도**: Claude.ai 채팅(claude.ai)에서 수업 파일을 생성할 때 아래 프롬프트를 복사해 사용합니다.
> Claude Code에서는 `/generate-lesson` 스킬을 사용하세요 (파일 저장·검증 자동화 포함).

---

## 채팅용 제약 사항

| 기능 | Claude Code `/generate-lesson` | Claude.ai 채팅 |
|---|---|---|
| PDF 자동 파싱 | ✅ 자동 | ⚠️ 텍스트 직접 붙여넣기 필요 |
| validate_lesson.py 실행 | ✅ 자동 | ❌ 생성 후 직접 실행 필요 |
| lessons/*.js 자동 저장 | ✅ 자동 | ❌ 출력 코드 복사 후 수동 저장 |
| index.html 자동 등록 | ✅ 자동 | ❌ 수동 추가 필요 |

---

## 사용 방법

1. 아래 프롬프트를 복사합니다.
2. `[여기에 붙여넣기]` 자리에 영어 지문과 한국어 해석을 넣습니다.
3. Claude.ai 채팅에 전송합니다.
4. 출력된 JS 코드를 `lessons/` 폴더에 저장합니다.
5. `index.html`에 스크립트 태그를 수동으로 추가합니다.
6. `python3 lessons/validate_lesson.py`로 검증합니다.

---

## 프롬프트 (복사해서 사용)

```
양영학원 화이트보드 앱용 수업 파일을 만들어줘.

아래 입력에서 각 PASSAGE를 **순서대로 하나씩 독립적으로** 처리해서
하나의 .js 파일 코드로 출력해줘.

[INPUT]
[여기에 붙여넣기 — 아래 형식 참고]

---PASSAGE 1: Gateway---
[EN]
(영어 지문 전체)

[KO]
(한국어 해석 전체)

---PASSAGE 2: Ex01---
[EN]
...
[KO]
...

(지문 수만큼 반복)

---

[각 PASSAGE에 생성할 항목]

1. translation: [{en, ko}]
   — [EN] 지문의 문장 단위 영한 쌍 (한국어는 [KO] 그대로 사용)

2. summary: { topic, points[] }
   — topic: 30자 이내 한국어 요지
   — points: ["흐름: A→B→C", "핵심1", "핵심2"]

3. resources: [{ type:"vocabulary", items:[{word,meaning}] }]
   — 해당 지문에서 핵심 단어 6~8개

4. slides:
   - title (제목 슬라이드)
   - passage (content: 영어 지문 한 줄, vocabulary 배열, reveals 없음)
   - questions (원본 1개 + 변형 1개, 5지선다, answer는 0-based 인덱스)
   - grammar (3개 포인트, rule + example + highlight)
   - keysentence (2문장, 지문에서 verbatim 발췌)
   - blank

[출력 형식]
;(function(){ window.LESSON_LIBRARY = window.LESSON_LIBRARY || [];

// ─── PASSAGE 1: [이름] ───
window.LESSON_LIBRARY.push({ ... });

// ─── PASSAGE 2: [이름] ───
window.LESSON_LIBRARY.push({ ... });

})();

[오류 방지 규칙 — 생성 후 스스로 검증]
- grammar.highlight 는 반드시 grammar.example 문자열 안에 그대로 포함되어야 함
- questions.answer 는 0 이상 4 이하의 정수
- keysentence.en 의 첫 5단어가 passage.content 안에 존재해야 함
- 각 PASSAGE의 내용이 다른 PASSAGE에 섞이지 않도록
- reveals[] 사용 금지
```

---

## 생성 후 수동 처리 순서

```
① 출력된 JS 코드를 lessons/ch[N]_[유형].js 로 저장
② index.html 에 스크립트 태그 추가:
   <script src="lessons/ch[N]_[유형].js"></script>
③ 검증 실행:
   python3 lessons/validate_lesson.py
   (validate_lesson.py 내 TEST_LESSONS 배열에 생성한 데이터 추가 필요)
④ 브라우저 새로고침 후 spot-check
```
