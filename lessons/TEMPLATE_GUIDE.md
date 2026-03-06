# 양영학원 화이트보드 수업 데이터 생성 가이드

## 워크플로우

```
① 교재 PDF에서 영어 지문 + 한국어 해석 복사
        ↓
② 입력 파일(input.txt) 만들기
   (지문 수 무관 — 5개든 20개든 동일 형식)
        ↓
③ Claude Code에 전달:
   "이 파일로 수업 .js 만들어줘" + input.txt 내용 붙여넣기
        ↓
④ Claude Code 내부 자동 처리 (선생님이 기다리기만 하면 됨):
   파싱 → [지문 1 생성 → 자동 검증] → [지문 2 생성 → 자동 검증] → ...
        ↓
⑤ 완성된 .js 파일 저장 (lessons/ 폴더)
⑥ index.html에 스크립트 태그 추가
⑦ 5분 spot-check → 완료
```

---

## ① 입력 파일 형식 (input.txt)

```
[CHAPTER] 05과
[TYPE] 빈칸추론

---PASSAGE 1: Gateway---
[EN]
We almost universally accept that playing video games is at best a pleasant break
from the more important business of living.

[KO]
우리는 비디오 게임을 하는 것이 기껏해야 더 중요한 삶의 일상으로부터의
즐거운 휴식이라는 것을 거의 보편적으로 받아들인다.

---PASSAGE 2: Ex01---
[EN]
We think it's important to overcome any tendency to not talk about climate change...

[KO]
우리는 기후 변화에 대해 이야기하지 않으려는 경향을 극복하는 것이 중요하다고 생각한다...

---PASSAGE 3: Ex02---
[EN]
...

[KO]
...

(지문 수에 맞게 계속)
```

**규칙:**
- `[CHAPTER]`와 `[TYPE]`은 파일 맨 위에 한 번만
- `---PASSAGE N: 이름---` 구분자 정확히 지키기
- `[EN]`과 `[KO]` 블록은 각 지문 내에 반드시 포함
- 지문 순서와 번호는 그대로 유지 (Gateway=1, Ex01=2, Ex02=3 ...)

---

## ② Claude Code 지시문 (복사해서 사용)

```
양영학원 화이트보드 앱용 수업 파일을 만들어줘.

아래 input.txt의 각 PASSAGE를 **순서대로 하나씩 독립적으로** 처리해서
하나의 .js 파일로 묶어줘.

처리 순서:
1. 전체 파일을 파싱해서 PASSAGE 목록 추출
2. 각 PASSAGE를 순서대로 처리:
   a. 해당 PASSAGE만 보고 슬라이드 데이터 생성
   b. 아래 오류 방지 규칙 자동 검증
   c. 오류 발견 시 해당 지문만 재생성
3. 모든 PASSAGE 완료 후 .js 파일 하나로 조립

[INPUT]
(여기에 input.txt 내용 전체 붙여넣기)

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
   - title (제목: "[CHAPTER] [이름] — [TYPE]")
   - passage (content: 영어 지문 한 줄, vocabulary 배열, reveals 없음)
   - questions (원본 1개 + 변형 1개, 5지선다, answer는 0-based 인덱스)
   - grammar (3개 포인트, rule + example + highlight)
   - keysentence (2문장, 지문에서 그대로 발췌)
   - blank

[오류 방지 규칙 — 각 지문 생성 후 자동 확인]
- grammar.highlight 는 반드시 grammar.example 문자열 안에 그대로 포함되어야 함
- questions.answer 는 0 이상 4 이하의 정수여야 함
- keysentence.en 의 첫 5단어가 passage.content 안에 존재해야 함
- 각 PASSAGE의 내용이 다른 PASSAGE에 섞이지 않도록
```

---

## ③ 출력 형식 (.js 파일 구조)

```javascript
;(function(){ window.LESSON_LIBRARY = window.LESSON_LIBRARY || [];

// ─── PASSAGE 1: Gateway ───
window.LESSON_LIBRARY.push({
  title: "수능특강 05과 Gateway — 빈칸추론",
  chapter: "05과",
  settings: { defaultBg: "white", defaultFontSize: 30 },

  translation: [
    { en: "First sentence of the passage.", ko: "지문의 첫 번째 문장." },
    { en: "Second sentence.", ko: "두 번째 문장." }
  ],

  summary: {
    topic: "비디오 게임이 진정한 학습 도구가 될 수 있다",
    points: [
      "흐름: 게임 편견 → 학습 잠재력 인식 → 교육적 활용 가능성",
      "게임은 즉각적 피드백과 몰입을 통해 효과적 학습 유도",
      "전통 교육이 놓치는 동기 부여 요소를 게임이 제공"
    ]
  },

  slides: [
    { type: "title", title: "수능특강 05과 Gateway", subtitle: "빈칸추론" },
    {
      type: "passage",
      title: "Reading Passage",
      content: "We almost universally accept that playing video games is...",
      vocabulary: [
        { word: "universally", meaning: "보편적으로" },
        { word: "inherently", meaning: "본질적으로" }
      ]
      // reveals 없음
    },
    {
      type: "questions",
      title: "Comprehension Check",
      items: [
        {
          question: "원본 문제: 빈칸에 들어갈 말로 가장 적절한 것은?",
          options: ["선지①", "선지②", "선지③", "선지④", "선지⑤"],
          answer: 1,
          explanation: "해설"
        },
        {
          question: "변형 문제: 이 글의 주제로 가장 적절한 것은?",
          options: ["선지①", "선지②", "선지③", "선지④", "선지⑤"],
          answer: 3,
          explanation: "해설"
        }
      ]
    },
    {
      type: "grammar",
      title: "핵심 문법",
      points: [
        {
          rule: "문법 규칙 설명",
          example: "예문 (지문에서 그대로 발췌)",
          highlight: "예문 내 verbatim 부분"   // ← example 안에 반드시 포함
        }
      ]
    },
    {
      type: "keysentence",
      title: "Key Sentences",
      sentences: [
        {
          en: "지문에서 그대로 발췌한 문장",   // ← content에 verbatim
          ko: "한국어 해석",
          grammar_note: "문법 포인트"
        }
      ]
    },
    { type: "blank" }
  ],

  resources: [
    {
      type: "vocabulary",
      items: [
        { word: "universally", meaning: "보편적으로" },
        { word: "inherently", meaning: "본질적으로" }
      ]
    }
  ]
});

// ─── PASSAGE 2: Ex01 ───
window.LESSON_LIBRARY.push({ /* ... 동일 구조 ... */ });

// (지문 수만큼 반복)

})();
```

---

## ④ 파일 저장 및 등록

### lessons/ 폴더에 저장

생성된 .js 파일을 `lessons/` 폴더에 저장:
```
whiteboard/
  lessons/
    sample_lesson.js
    ch03_gist.js
    ch05_blank.js    ← 새 파일 저장
```

### index.html에 스크립트 태그 추가

`index.html` 파일 안에서 `<!-- LESSON LIBRARY -->` 블록 찾기:

```html
<!-- LESSON LIBRARY -->
<script>window.LESSON_LIBRARY = [];</script>
<script src="lessons/sample_lesson.js"></script>
<script src="lessons/ch03_gist.js"></script>
<script src="lessons/ch05_blank.js"></script>   <!-- ← 새 줄 추가 -->
```

저장 후 브라우저에서 새로고침하면 레슨 목록에 자동 추가됨.

---

## ⑤ Spot-check 체크리스트 (5분)

자동 검증 통과 후 브라우저에서 빠르게 확인:

```
□ 브라우저에서 새 레슨 로드 확인 (콘솔에 JS 에러 없음)
□ 각 지문의 questions — 정답이 지문 내용과 실제로 일치하는지 확인
□ vocabulary — 다른 지문 단어가 혼입되지 않았는지 훑어보기
□ summary.topic — 지문 요지와 맞는지 한 줄 확인
```

---

## 슬라이드 타입 참조

| type | 용도 | 필수 필드 |
|------|------|-----------|
| `title` | 표지 | `title`, `subtitle` |
| `passage` | 영어 지문 | `content`, `vocabulary[]` |
| `questions` | 문제 | `items[{question, options[], answer, explanation}]` |
| `grammar` | 문법 | `points[{rule, example, highlight}]` |
| `keysentence` | 핵심문장 | `sentences[{en, ko, grammar_note}]` |
| `freeform` | 자유 HTML | `html` |
| `blank` | 빈 화면 (필기용) | (없음) |

> **주의:** `reveals[]`는 사용하지 않음. passage 슬라이드에 포함하더라도 무시됨.
