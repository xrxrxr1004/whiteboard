---
name: generate-lesson
description: 양영학원 화이트보드 앱용 수업 .js 파일을 텍스트에서 자동 생성합니다. 지문 파싱 → 직렬 생성 → 자동 검증 → lessons/ 저장 → index.html 등록까지 전 과정을 자동 실행합니다.
argument-hint: [input.txt 또는 없으면 텍스트 직접 붙여넣기]
---

양영학원 화이트보드 앱용 수업 .js 파일을 생성합니다.

## 사용법

```
/generate-lesson               # 텍스트 직접 붙여넣기
/generate-lesson input.txt     # txt 파일 경로
```

---

## 처리 지시

아래 단계를 **순서대로 자동 실행**합니다.

---

### STEP 0 — 입력 감지

`$ARGUMENTS`를 보고 입력 유형을 판별합니다.

#### 분기 A: 인자 없음 (텍스트 붙여넣기)
사용자가 이 명령 직후 붙여넣은 텍스트를 입력으로 사용합니다. → STEP 1로 진행.

#### 분기 B: `.txt` 파일 경로
파일을 읽어 내용을 입력으로 사용합니다. → STEP 1로 진행.

---

### STEP 1 — 지문 목록 파싱

추출된 내용에서:
- `[CHAPTER]`, `[TYPE]` 헤더 추출
- `---PASSAGE N: 이름---` 구분자로 지문 분리
- 각 지문의 `[EN]`과 `[KO]` 블록 추출
- 지문 목록 순서 정렬

`[CHAPTER]`나 `[TYPE]`이 불명확한 경우 사용자에게 한 번만 확인.

**챕터 단위 엔트리 원칙:**
- 한 입력 파일 = 한 챕터 = 하나의 LESSON_LIBRARY 엔트리
- 입력 파일에 복수의 `[CHAPTER]`가 발견되면 → 사용자에게 확인 요청 후, 챕터당 1개 엔트리로 분리

---

### STEP 1.5 — 레슨 제목 확인

파싱된 지문 목록을 바탕으로 생성될 레슨 제목 후보를 표시하고,
사용자 컨펌을 받은 뒤 STEP 2를 시작합니다.

출력 예시:
```
📋 생성 예정 레슨 제목 (총 N개):
  • 수능특강 04강 Ex01 — 빈칸추론
  • 수능특강 04강 Ex02 — 빈칸추론
  ...
수정할 제목이 있으면 알려주세요. 없으면 그대로 진행합니다.
```

규칙:
- 전체 목록을 **한 번에** 보여주고 한 번만 컨펌 요청
- 사용자가 "OK" / "진행" / "없어" 등 이상 없음을 표현하면 즉시 STEP 2 시작
- 수정 지시 시 해당 항목만 교체 후 재확인 없이 진행

---

### STEP 2 — 지문별 직렬 생성 + 검증

각 PASSAGE에 대해 반복:

#### 2-a. 슬라이드 데이터 생성

```javascript
window.LESSON_LIBRARY.push({
  title: "[CHAPTER] [이름] — [TYPE]",
  chapter: "[CHAPTER]",
  settings: { defaultBg: "white", defaultFontSize: 30 },

  // KO는 입력 파일 [KO] 블록 원문 그대로 — 대괄호 내용 유지, 어미 수정 금지
  translation: [
    { en: "영어 문장 (verbatim).", ko: "한국어 문장 (입력 원문 verbatim)." }
    // 지문 전체 문장 수만큼 — 줄바꿈 병합만 허용, 내용 변경 금지
  ],

  // topic 30자 이내 한국어, points ≥ 3개
  summary: {
    topic: "한국어 요지 (30자 이내)",
    points: ["흐름: A → B → C", "핵심 포인트 1", "핵심 포인트 2"]
  },

  slides: [
    { type: "title", title: "[CHAPTER] [이름] — [TYPE]", subtitle: "수능특강 영어독해연습 · [CHAPTER]" },
    {
      type: "passage",
      title: "[이름] — 부제",
      content: "영어 지문 전체 (줄바꿈 없이 한 줄, 빈칸은 _____로 표시)",
      vocabulary: [{ word: "단어", meaning: "뜻" }]  // 6~8개, reveals 없음
    },
    {
      type: "questions",
      title: "문제",
      items: [
        { question: "[유형] 원본 문제", options: ["①","②","③","④","⑤"], answer: 0, explanation: "해설" },
        { question: "[변형유형] 변형 문제", options: ["①","②","③","④","⑤"], answer: 0, explanation: "해설" }
      ]
    },
    {
      type: "grammar",
      title: "핵심 문법",
      points: [
        { rule: "문법 규칙", example: "지문 verbatim 예문", highlight: "example 안의 부분 문자열" }
        // 총 3개 — highlight는 반드시 example 안에 그대로 존재해야 함
      ]
    },
    {
      type: "keysentence",
      title: "Key Sentences",
      sentences: [
        { en: "지문 verbatim 문장", ko: "한국어 해석", grammar_note: "문법 포인트" }
        // 총 2개 — en의 첫 5단어가 passage.content 안에 존재해야 함
      ]
    },
    { type: "blank" }
  ],

  resources: [{ type: "vocabulary", items: [{ word: "단어", meaning: "뜻" }] }]
});
```

#### 2-b. 자동 검증

생성한 블록을 아래 명령으로 검증합니다:

```bash
node lessons/validate_node.js lessons/[파일명].js
```

검증 항목:
1. `grammar.highlight` ⊂ `grammar.example`
2. `questions.answer` ∈ [0, 4]
3. `keysentence.en` 첫 5단어 ⊂ `passage.content`
4. `translation` 배열 존재 + 각 항목에 `en`/`ko` 키 있음
5. `summary` 객체 존재 + `topic`(문자열) + `points`(배열, ≥1)

오류 시 해당 지문만 재생성 → 재검증. 통과 시 다음 지문으로 진행.

---

### STEP 3 — .js 파일 조립 및 저장

파일명: `ch[N]_[TYPE축약].js` (예: 05강 + 빈칸추론 → `ch05_blank.js`)

```javascript
;(function(){ window.LESSON_LIBRARY = window.LESSON_LIBRARY || [];

// ─── PASSAGE 1: [이름] ───
window.LESSON_LIBRARY.push({ ... });

// ─── PASSAGE 2: [이름] ───
window.LESSON_LIBRARY.push({ ... });

})();
```

`lessons/` 폴더에 저장합니다.

---

### STEP 4 — index.html 등록

`index.html`의 `<!-- LESSON LIBRARY -->` 블록 안에 추가:

```html
<script src="lessons/[파일명].js"></script>
```

이미 동일한 태그가 있으면 추가하지 않습니다.

---

### STEP 5 — 완료 보고

```
✅ 생성 완료

파일: lessons/[파일명].js
지문: [N]개
입력: [파일명]

검증 결과:
  ✅ PASS  [지문1 title]
  ✅ PASS  [지문2 title]
  ...

index.html 등록: 완료

▶ 브라우저 새로고침 후 spot-check:
  □ questions — 정답이 지문 내용과 실제로 일치하는지
  □ vocabulary — 다른 지문 단어 혼입 없는지
  □ summary.topic — 지문 요지와 맞는지
  □ 한국어 해석 탭 — KO 원문 verbatim 확인 (대괄호 내용 포함)
```

---

## 오류 방지 규칙

- `grammar.highlight`는 반드시 `grammar.example` 안에 **그대로** 존재해야 함
- `questions.answer`는 **0 이상 4 이하의 정수**
- `keysentence.en`은 지문에서 **verbatim** 인용
- 각 PASSAGE 내용이 다른 PASSAGE에 **절대 섞이지 않도록**
- `reveals[]` 사용 금지
- **KO 번역은 입력 파일 `[KO]` 블록 원문 그대로** — 대괄호 `[...]` 내용 유지, 어미·조사 임의 수정 금지, 줄바꿈 병합만 허용
- **freeform(7단계 분석) 슬라이드 생성 금지** — 슬라이드 순서: title → passage → questions → grammar → keysentence → blank
- **한 입력 파일 = 한 챕터 = 한 엔트리** 기본 원칙; 복수 챕터 발견 시 유저 컨펌 후 챕터당 1개 엔트리
