---
name: generate-lesson
description: 양영학원 화이트보드 앱용 수업 .js 파일을 PDF 또는 텍스트에서 자동 생성합니다. PDF 파싱 → 지문별 직렬 생성 → 자동 검증 → lessons/ 저장 → index.html 등록까지 전 과정을 자동 실행합니다.
argument-hint: [파일경로.pdf 또는 input.txt]
---

양영학원 화이트보드 앱용 수업 .js 파일을 생성합니다.

## 사용법

```
/generate-lesson [파일경로 또는 경로들]
```

예시:
```
/generate-lesson                                      # 텍스트 직접 붙여넣기
/generate-lesson input.txt                           # txt 파일
/generate-lesson 교재/ch05.pdf                       # PDF 단일 파일
/generate-lesson 교재/ch05_EN.pdf 교재/ch05_KO.pdf   # EN·KO 분리 PDF
/generate-lesson 교재/ch05*.pdf                      # 글로브 패턴
```

---

## 처리 지시

아래 단계를 **순서대로 자동 실행**합니다. 선생님은 기다리기만 하면 됩니다.

---

### STEP 0 — 입력 감지 및 전처리

`$ARGUMENTS`를 보고 입력 유형을 판별합니다.

#### 분기 A: 인자 없음 (텍스트 붙여넣기)
사용자가 이 명령 직후 붙여넣은 텍스트를 입력으로 사용합니다. → STEP 1로 진행.

#### 분기 B: `.txt` 파일 경로
파일을 읽어 내용을 입력으로 사용합니다. → STEP 1로 진행.

#### 분기 C: `.pdf` 파일 (단일 또는 복수)

모든 PDF를 읽은 뒤 아래 레이아웃 판별 절차를 따릅니다.

**C-1. 레이아웃 자동 판별**

| 신호 | 판정 |
|---|---|
| 한 페이지 안에 영어·한국어 단락이 좌/우 또는 상/하로 구분 | 2컬럼 병렬 레이아웃 |
| `①②③④⑤` 선지, `정답`, `해설` 텍스트가 지문과 혼재 | 혼합(잡음) 레이아웃 |
| 파일이 2개이고 하나는 영어만, 다른 하나는 한국어만 | EN/KO 분리 파일 |

**C-2. 레이아웃별 추출 규칙**

**[레이아웃 ①] 좌영어·우한국어 2컬럼**
- 왼쪽 절반 → EN, 오른쪽 절반 → KO로 페어링
- 버릴 것: 페이지 번호(단독 숫자), 머리글/꼬리글, 교재 제목 반복 텍스트

**[레이아웃 ②] 혼합(잡음)**

| 패턴 | 처리 |
|---|---|
| 영어 연속 산문 (대문자 시작, 마침표로 끝나는 여러 문장) | ✅ EN 지문으로 유지 |
| 한국어 연속 산문 (영어 지문과 내용 대응) | ✅ KO 번역으로 유지 |
| `①②③④⑤`로 시작하는 행 | ❌ 선지 — 버림 |
| `1.` `2.` `3.` 등 문제 번호로 시작하는 행 | ❌ 문제 지시문 — 버림 (지문 경계 마커로만 사용) |
| `정답`, `해설`, `Answer`, `[해설]` 포함 블록 | ❌ 해설 — 버림 |
| 단독 숫자 (페이지 번호) | ❌ 버림 |
| 10자 미만 단독 행 | ❌ 버림 |
| `Week N`, `Chapter N`, `N과` 패턴 | ℹ️ 챕터 정보로 보존 |

**[레이아웃 ③] EN/KO 분리 파일 2개**
- 첫 번째 파일 = EN 전체, 두 번째 = KO 전체
- 지문 순서 기준으로 순서대로 페어링
- 페이지 수가 다를 경우 사용자에게 확인 요청

**C-3. 추출 결과 확인**

추출 후 아래 두 항목을 사용자에게 보고하고 진행 여부를 확인합니다:
- 탐지된 레이아웃 유형
- 추출된 지문 수 및 이름 목록

사용자 확인 후 STEP 1 자동 실행.

---

### STEP 1 — 지문 목록 파싱

추출된 내용에서:
- `[CHAPTER]`, `[TYPE]` 헤더 추출
- `---PASSAGE N: 이름---` 구분자로 지문 분리
- 각 지문의 `[EN]`과 `[KO]` 블록 추출
- 지문 목록 순서 정렬

`[CHAPTER]`나 `[TYPE]`이 불명확한 경우 사용자에게 한 번만 확인.

---

### STEP 2 — 지문별 직렬 생성 + 검증

각 PASSAGE에 대해 반복:

#### 2-a. 슬라이드 데이터 생성

```javascript
window.LESSON_LIBRARY.push({
  title: "[CHAPTER] [이름] — [TYPE]",
  chapter: "[CHAPTER]",
  settings: { defaultBg: "white", defaultFontSize: 30 },

  translation: [
    { en: "영어 문장.", ko: "한국어 문장." }
    // 지문 전체 문장 수만큼
  ],

  summary: {
    topic: "한국어 요지 (30자 이내)",
    points: ["흐름: A → B → C", "핵심 포인트 1", "핵심 포인트 2"]
  },

  slides: [
    { type: "title", title: "[CHAPTER] [이름] — [TYPE]", subtitle: "수능특강 영어 · 유형편 Part I" },
    {
      type: "passage",
      title: "[이름] — 부제",
      content: "영어 지문 전체 (줄바꿈 없이 한 줄)",
      vocabulary: [{ word: "단어", meaning: "뜻" }]  // 6~8개, reveals 없음
    },
    {
      type: "questions",
      title: "[이름] 문제",
      items: [
        { question: "[유형] 원본 문제", options: ["①","②","③","④","⑤"], answer: 0, explanation: "해설" },
        { question: "[변형유형] 변형 문제", options: ["①","②","③","④","⑤"], answer: 0, explanation: "해설" }
      ]
    },
    {
      type: "grammar",
      title: "핵심 문법",
      points: [
        { rule: "문법 규칙", example: "지문 verbatim 예문", highlight: "example 내 부분문자열" }
        // 총 3개 — highlight는 반드시 example 안에 존재해야 함
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

생성한 블록을 `lessons/validate_lesson.py`로 검증합니다.

```bash
python3 lessons/validate_lesson.py
```

검증 항목:
1. `grammar.highlight` ⊂ `grammar.example`
2. `questions.answer` ∈ [0, 4]
3. `keysentence.en` 첫 5단어 ⊂ `passage.content`

오류 시 해당 지문만 재생성 → 재검증. 통과 시 다음 지문으로 진행.

---

### STEP 3 — .js 파일 조립 및 저장

파일명: `ch[N]_[TYPE축약].js` (예: 05과 + 빈칸추론 → `ch05_blank.js`)

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
```

---

## 오류 방지 규칙

- `grammar.highlight`는 반드시 `grammar.example` 안에 **그대로** 존재해야 함
- `questions.answer`는 **0 이상 4 이하의 정수**
- `keysentence.en`은 지문에서 **verbatim** 인용
- 각 PASSAGE 내용이 다른 PASSAGE에 **절대 섞이지 않도록**
- `reveals[]` 사용 금지
- PDF에서 추출한 선지·해설 텍스트를 지문으로 오인하지 않도록
