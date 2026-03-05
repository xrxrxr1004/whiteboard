양영학원 화이트보드 앱용 수업 .js 파일을 생성합니다.

## 사용법

```
/generate-lesson [파일경로 또는 경로들]
```

**예시:**
```
/generate-lesson                              # 텍스트 직접 붙여넣기
/generate-lesson input.txt                   # txt 파일
/generate-lesson 교재/ch05.pdf               # PDF 단일 파일
/generate-lesson 교재/ch05_EN.pdf 교재/ch05_KO.pdf   # EN·KO 분리 PDF
/generate-lesson 교재/ch05*.pdf              # 글로브 패턴
```

---

## 처리 지시

아래 단계를 **순서대로 자동 실행**합니다. 선생님은 기다리기만 하면 됩니다.

---

### STEP 0 — 입력 감지 및 전처리

`$ARGUMENTS`를 보고 입력 유형을 판별한 뒤 아래 규칙에 따라 처리합니다.

#### 분기 A: 인자 없음 (텍스트 붙여넣기)

사용자가 이 명령 직후 붙여넣은 텍스트를 입력으로 사용합니다.
→ STEP 1(파싱)으로 바로 진행합니다.

#### 분기 B: `.txt` 파일 경로

해당 파일을 읽어 내용을 입력으로 사용합니다.
→ STEP 1(파싱)으로 진행합니다.

#### 분기 C: `.pdf` 파일 (단일 또는 복수)

**모든 PDF를 먼저 읽은 뒤** 아래 레이아웃 판별 절차를 따릅니다.

##### C-1. 레이아웃 자동 판별

각 페이지를 읽으면서 다음 신호로 레이아웃을 판별합니다:

| 신호 | 판정 |
|---|---|
| 한 페이지 안에 영어 단락과 한국어 단락이 **좌/우 또는 상/하로 구분**됨 | 2컬럼 병렬 레이아웃 |
| `①②③④⑤` 선지, `정답`, `해설` 텍스트가 지문과 **혼재** | 혼합(잡음) 레이아웃 |
| 파일이 2개이고 하나는 영어만, 다른 하나는 한국어만 | EN/KO 분리 파일 |

##### C-2. 레이아웃별 추출 규칙

**[레이아웃 ①] 좌영어 · 우한국어 (2컬럼 병렬)**

```
페이지 왼쪽 절반 → EN 지문 텍스트
페이지 오른쪽 절반 → KO 번역 텍스트
```

- 두 컬럼을 **같은 지문**으로 페어링합니다.
- 지문 구분: 새 문제 번호(`1.` `2.` 등), 새 섹션 헤더, 빈 행 패턴으로 경계를 탐지합니다.
- **버릴 것**: 페이지 번호(단독 숫자), 머리글/꼬리글, 교재 제목 반복 텍스트.

**[레이아웃 ②] 혼합(잡음) — 지문 + 문제 + 선지 + 해설이 섞인 경우**

각 텍스트 블록에 대해 아래 규칙으로 **유지/버림**을 결정합니다:

| 패턴 | 처리 |
|---|---|
| 영어 연속 산문 (대문자 시작, 마침표로 끝나는 여러 문장) | ✅ EN 지문으로 유지 |
| 한국어 연속 산문 (영어 지문과 내용 대응) | ✅ KO 번역으로 유지 |
| `①` `②` `③` `④` `⑤` 로 시작하는 행 | ❌ 선지 — 버림 |
| `1.` `2.` `3.` 등 문제 번호로 시작하는 행 | ❌ 문제 지시문 — 버림 (지문 경계 마커로만 사용) |
| `정답`, `해설`, `Answer`, `[해설]` 포함 블록 | ❌ 해설 — 버림 |
| 단독 숫자 (페이지 번호) | ❌ 버림 |
| 10자 미만 단독 행 (헤더·레이블) | ❌ 버림 |
| `Week N`, `Chapter N`, `과` 패턴 | ℹ️ 챕터 정보로 보존 (지문 구분자) |

> **판단 원칙**: 애매한 경우, 해당 텍스트가 **독립된 영어 지문의 일부로 읽히는가**를 기준으로 결정합니다. 지문은 하나의 논지를 이어가는 연속 산문입니다. 선지나 해설은 지문의 논지와 무관한 단편적 문장입니다.

**[레이아웃 ③] EN/KO 분리 파일 (파일 2개)**

- 첫 번째 파일(또는 영어가 주인 파일) → 전체가 EN 지문
- 두 번째 파일(또는 한국어가 주인 파일) → 전체가 KO 번역
- 지문 순서가 일치한다고 가정하고 순서대로 페어링합니다.
- 페이지 수가 다를 경우: 사용자에게 확인을 요청합니다.

##### C-3. 추출 결과를 내부 구조로 변환

PDF 전처리가 끝나면 아래 구조로 변환합니다 (이후 STEP 1 파싱과 동일하게 처리):

```
[CHAPTER] {탐지된 챕터 정보}
[TYPE] {탐지된 유형 또는 사용자에게 확인}

---PASSAGE 1: {이름 또는 번호}---
[EN]
{추출된 영어 지문}

[KO]
{추출된 한국어 번역}

---PASSAGE 2: ...---
...
```

> **중요**: 추출 결과를 확정하기 전에, 아래 두 항목을 사용자에게 간략히 보고하고 진행 여부를 확인합니다:
> - 탐지된 레이아웃 유형
> - 추출된 지문 수 및 지문 이름 목록
>
> 사용자가 확인하면 STEP 1부터 자동 실행합니다.

---

### STEP 1 — 지문 목록 파싱

내부 구조(또는 붙여넣은 텍스트)에서 다음을 추출합니다:

- `[CHAPTER]`, `[TYPE]` 헤더
- `---PASSAGE N: 이름---` 구분자로 지문 분리
- 각 지문의 `[EN]`(영어 원문)과 `[KO]`(한국어 해석)
- 지문 목록을 순서대로 정렬

`[CHAPTER]`나 `[TYPE]`이 불명확한 경우 사용자에게 한 번만 확인합니다.

---

### STEP 2 — 지문별 직렬 생성 + 검증

각 PASSAGE에 대해 다음을 반복합니다:

#### 2-a. 슬라이드 데이터 생성

```javascript
window.LESSON_LIBRARY.push({
  title: "[CHAPTER] [이름] — [TYPE]",
  chapter: "[CHAPTER]",
  settings: { defaultBg: "white", defaultFontSize: 30 },

  translation: [
    { en: "영어 문장.", ko: "한국어 문장." }
    // 지문 전체 문장 수만큼, [KO] 텍스트를 문장 단위로 대응
  ],

  summary: {
    topic: "한국어 요지 (30자 이내)",
    points: [
      "흐름: A → B → C",
      "핵심 포인트 1",
      "핵심 포인트 2"
    ]
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
        {
          question: "[유형] 원본 문제",
          options: ["①", "②", "③", "④", "⑤"],
          answer: 0,          // 0-based 정수, 0~4
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
    {
      type: "grammar",
      title: "핵심 문법",
      points: [
        {
          rule: "문법 규칙 설명",
          example: "지문에서 그대로 발췌한 예문",
          highlight: "example 안에 verbatim으로 존재하는 부분문자열"  // ⚠️ 필수
        }
        // 총 3개
      ]
    },
    {
      type: "keysentence",
      title: "Key Sentences",
      sentences: [
        {
          en: "지문에서 그대로 발췌한 문장",   // ⚠️ verbatim, 첫 5단어가 content 안에 존재해야 함
          ko: "한국어 해석",
          grammar_note: "문법 포인트"
        }
        // 총 2개
      ]
    },
    { type: "blank" }
  ],

  resources: [
    {
      type: "vocabulary",
      items: [{ word: "단어", meaning: "뜻" }]  // passage.vocabulary와 동일
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

오류 발생 시: 해당 지문만 재생성 후 재검증. 통과할 때까지 반복.
통과 시: 다음 지문으로 진행.

---

### STEP 3 — .js 파일 조립 및 저장

파일명: `ch[N]_[TYPE축약].js`
예: `05과` + `빈칸추론` → `ch05_blank.js`

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

`index.html`의 `<!-- LESSON LIBRARY -->` 블록 안에 추가합니다:

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
입력: [PDF 파일명 또는 txt]  ← PDF 경로인 경우 명시

검증 결과:
  ✅ PASS  [지문1 title]
  ✅ PASS  [지문2 title]
  ...

index.html 등록: 완료

▶ 브라우저 새로고침 후 spot-check:
  □ questions — 정답이 지문 내용과 실제로 일치하는지
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
- **PDF에서 추출한 선지·해설 텍스트를 지문으로 오인하지 않도록** 주의
