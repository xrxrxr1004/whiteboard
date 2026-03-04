양영학원 화이트보드 앱용 수업 .js 파일을 생성합니다.

## 사용법

```
/generate-lesson
```

호출 후 input.txt 내용을 붙여넣거나, 파일 경로를 $ARGUMENTS로 전달합니다.

---

## 처리 지시

아래 단계를 **순서대로 자동 실행**합니다. 선생님은 기다리기만 하면 됩니다.

### STEP 1 — 입력 파싱

`$ARGUMENTS` 가 파일 경로이면 해당 파일을 읽습니다.
아니면 이 명령 직후 사용자가 붙여넣은 텍스트를 입력으로 사용합니다.

파싱 규칙:
- `[CHAPTER]`, `[TYPE]` 헤더 추출
- `---PASSAGE N: 이름---` 구분자로 지문 분리
- 각 지문에서 `[EN]` 블록(영어 원문)과 `[KO]` 블록(한국어 해석) 추출
- 지문 목록을 순서대로 정렬

### STEP 2 — 지문별 직렬 생성 + 검증

각 PASSAGE에 대해 다음을 반복합니다:

#### 2-a. 슬라이드 데이터 생성

아래 구조로 `window.LESSON_LIBRARY.push({...})` 블록 하나를 생성합니다:

```javascript
window.LESSON_LIBRARY.push({
  title: "[CHAPTER] [이름] — [TYPE]",
  chapter: "[CHAPTER]",
  settings: { defaultBg: "white", defaultFontSize: 30 },

  // 1. 문장 단위 영한 쌍 — [KO] 텍스트를 문장별로 대응
  translation: [
    { en: "영어 문장.", ko: "한국어 문장." }
    // ... (지문 전체 문장 수만큼)
  ],

  // 2. 요약 — 30자 이내 topic + 3개 points
  summary: {
    topic: "한국어 요지 (30자 이내)",
    points: [
      "흐름: A → B → C",
      "핵심 포인트 1",
      "핵심 포인트 2"
    ]
  },

  slides: [
    // 3. 표지
    { type: "title", title: "[CHAPTER] [이름] — [TYPE]", subtitle: "수능특강 영어 · 유형편 Part I" },

    // 4. 지문 슬라이드 — reveals 없음
    {
      type: "passage",
      title: "[이름] — 부제",
      content: "영어 지문 전체 (줄바꿈 없이 한 줄)",
      vocabulary: [
        { word: "단어", meaning: "뜻" }
        // 6~8개
      ]
    },

    // 5. 문제 — 원본 1개 + 변형 1개, answer는 0-based 인덱스
    {
      type: "questions",
      title: "[이름] 문제",
      items: [
        {
          question: "[유형] 원본 문제 지문",
          options: ["①", "②", "③", "④", "⑤"],
          answer: 0,          // 0~4 정수
          explanation: "해설"
        },
        {
          question: "[변형유형] 변형 문제",
          options: ["①", "②", "③", "④", "⑤"],
          answer: 0,
          explanation: "해설"
        }
      ]
    },

    // 6. 문법 — 3개 포인트
    {
      type: "grammar",
      title: "핵심 문법",
      points: [
        {
          rule: "문법 규칙 설명",
          example: "지문에서 그대로 발췌한 예문",
          highlight: "예문 안에 verbatim으로 존재하는 부분문자열"
          // ⚠️ highlight는 반드시 example 문자열의 부분문자열이어야 함
        }
        // 총 3개
      ]
    },

    // 7. 핵심 문장 — 2개, 지문에서 verbatim
    {
      type: "keysentence",
      title: "Key Sentences",
      sentences: [
        {
          en: "지문에서 그대로 발췌한 문장",
          // ⚠️ en의 첫 5단어가 passage.content 안에 존재해야 함
          ko: "한국어 해석",
          grammar_note: "문법 포인트"
        }
        // 총 2개
      ]
    },

    // 8. 빈 화면
    { type: "blank" }
  ],

  // 9. 어휘 리소스
  resources: [
    {
      type: "vocabulary",
      items: [
        { word: "단어", meaning: "뜻" }
        // 6~8개 (slides.passage.vocabulary와 동일)
      ]
    }
  ]
});
```

#### 2-b. 자동 검증

생성한 블록을 `lessons/validate_lesson.py`로 검증합니다.

검증 항목:
1. `grammar.highlight` ⊂ `grammar.example` (부분문자열 포함 여부)
2. `questions.answer` ∈ [0, 4] (정수 범위)
3. `keysentence.en` 첫 5단어 ⊂ `passage.content` (verbatim 확인)

오류 발생 시: **해당 지문만 재생성** 후 재검증. 통과할 때까지 반복.
통과 시: 다음 지문으로 진행.

### STEP 3 — .js 파일 조립 및 저장

모든 지문이 검증을 통과하면:

1. 파일명 결정: `[CHAPTER 숫자]_[TYPE 축약].js`
   예: `[CHAPTER] 05과` + `[TYPE] 빈칸추론` → `ch05_blank.js`

2. 전체 파일 구조로 조립:

```javascript
;(function(){ window.LESSON_LIBRARY = window.LESSON_LIBRARY || [];

// ─── PASSAGE 1: [이름] ───
window.LESSON_LIBRARY.push({ ... });

// ─── PASSAGE 2: [이름] ───
window.LESSON_LIBRARY.push({ ... });

// ... (지문 수만큼 반복)

})();
```

3. `lessons/` 폴더에 저장

### STEP 4 — index.html 등록

`index.html`의 `<!-- LESSON LIBRARY -->` 블록 안에 스크립트 태그 추가:

```html
<script src="lessons/[생성된파일명].js"></script>
```

이미 동일한 태그가 있으면 추가하지 않습니다.

### STEP 5 — 완료 보고

아래 형식으로 보고합니다:

```
✅ 생성 완료

파일: lessons/[파일명].js
지문: [N]개

검증 결과:
  ✅ PASS  [지문1 title]
  ✅ PASS  [지문2 title]
  ...

index.html 등록: 완료

▶ 브라우저에서 새로고침 후 spot-check:
  □ 각 지문의 questions — 정답이 지문 내용과 실제로 일치하는지
  □ vocabulary — 다른 지문 단어가 혼입되지 않았는지
  □ summary.topic — 지문 요지와 맞는지
```

---

## 오류 방지 규칙 (생성 시 항상 준수)

- `grammar.highlight`는 반드시 `grammar.example` 문자열 안에 **그대로** 존재해야 함
- `questions.answer`는 **0 이상 4 이하의 정수** (첫 번째 선지=0, 다섯 번째=4)
- `keysentence.en`은 지문에서 **verbatim** 인용 (paraphrase 금지)
- 각 PASSAGE의 내용이 다른 PASSAGE에 **절대 섞이지 않도록** 주의
- `reveals[]` 사용 금지 — passage 슬라이드에 포함하지 않음
