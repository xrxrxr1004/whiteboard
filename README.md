# Whiteboard — 양영학원

영어 수업용 전자칠판 앱. 지문·문제·문법·핵심문장 슬라이드를 구성하고, 판서 도구로 수업 중 자유롭게 필기할 수 있습니다.

## 폴더 구조

```
whiteboard/
├── index.html          # 앱 진입점 (HTML + CSS + JS 통합)
├── vercel.json         # Vercel 배포 설정
├── lessons/
│   ├── validate_node.js    # 레슨 파일 자동 검증 스크립트
│   ├── yder_ch03.js        # 수특독해연습 3강
│   └── yder_ch04.js        # 수특독해연습 4강
└── .github/
    └── workflows/
        └── pages.yml       # GitHub Pages 자동 배포
```

## 로컬 실행

```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## 새 수업 파일 추가

### 방법 1: `/generate-lesson` 슬래시 명령 (권장)

Claude Code에서 `/generate-lesson` 명령을 실행하면 PDF 또는 텍스트에서 레슨 `.js` 파일을 자동 생성합니다.

```
/generate-lesson 교재/ch05.pdf
/generate-lesson 교재/ch05_EN.pdf 교재/ch05_KO.pdf
```

파일 생성 → 검증 → `index.html` 등록까지 자동으로 처리됩니다.

### 방법 2: 수동 추가

1. `lessons/` 폴더에 `.js` 파일 생성 (아래 구조 참고)
2. `index.html`의 `<!-- LESSON LIBRARY -->` 블록에 `<script>` 태그 추가:

```html
<!-- LESSON LIBRARY -->
<script>window.LESSON_LIBRARY = [];</script>
<script src="lessons/yder_ch03.js"></script>
<script src="lessons/yder_ch04.js"></script>
<script src="lessons/새파일.js"></script>  <!-- 여기에 추가 -->
```

### 레슨 파일 기본 구조

```javascript
;(function(){
  window.LESSON_LIBRARY = window.LESSON_LIBRARY || [];
  window.LESSON_LIBRARY.push({
    title: "수특독해연습 N강",
    chapter: "수특독해연습 N강",
    settings: {
      defaultBg: "white",   // white | grid | lined | dark | sepia
      defaultFontSize: 30
    },
    exercises: [
      {
        id: "Ex01",
        subtitle: "지문 부제",
        page: "p.30",
        translation: [
          { en: "English sentence.", ko: "한국어 번역." }
          // 문장 수만큼 반복
        ],
        summary: {
          title_ko: "요지 (한국어)",
          flow: ["흐름1", "흐름2", "흐름3"],
          points: [
            { label: "레이블", text: "핵심 내용" }
          ],
          quote: "지문에서 발췌한 핵심 문장 (verbatim)"
        },
        resources: [
          {
            type: "vocabulary",
            items: [{ word: "단어", meaning: "뜻" }]
          }
        ],
        variant_questions: {
          // 유형별 변형문제 (선택 사항)
          "제목": { ... },
          "빈칸추론_A": { ... },
          "어법분석": { ... }
        }
      }
    ],
    slides: [
      { type: "title",       title, subtitle },
      { type: "passage",     title, content, vocabulary },
      { type: "questions",   title, items: [{ question, options, answer, explanation }] },
      { type: "grammar",     title, points: [{ rule, example, highlight }] },
      { type: "keysentence", title, sentences: [{ en, ko, grammar_note }] },
      { type: "freeform",    html },
      { type: "blank" }
    ]
  });
})();
```

## 키보드 단축키

| 키 | 기능 |
|----|------|
| `←` / `→` | 이전 / 다음 슬라이드 |
| `+` / `-` | 폰트 크기 조절 |
| `F` | 2-F 모드 (첫 2문장 + 끝 1문장 표시) |
| `.` | 블랙아웃 (화면 가리기) |
| `N` | 빈 페이지 추가 |
| `L` | 레슨 매니저 열기 |
| `B` | 배경 테마 전환 |
| `P` | 색상 팔레트 토글 |
| `1` | 포인터(네비게이트) 모드 |
| `2` | 펜 도구 |
| `3` | 형광펜 도구 |
| `4` | 지우개 도구 |
| `Esc` | 네비게이트 모드 |

## 배포

### GitHub Pages
`main` 브랜치에 push하면 자동 배포됩니다 (`.github/workflows/pages.yml`).

### Vercel
`vercel.json`이 `/`를 `index.html`로 리다이렉트하도록 설정되어 있습니다.
