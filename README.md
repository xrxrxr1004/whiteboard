# Whiteboard — 양영학원

영어 수업용 전자칠판 앱. 지문·문제·문법·핵심문장 슬라이드를 구성하고, 판서 도구로 수업 중 자유롭게 필기할 수 있습니다.

## 폴더 구조

```
whiteboard/
├── index.html          # 앱 진입점 (HTML + CSS + JS 통합)
├── vercel.json         # Vercel 배포 설정
├── lessons/
│   ├── TEMPLATE_GUIDE.md   # 레슨 파일 작성 가이드
│   ├── sample_lesson.js    # 레슨 템플릿
│   ├── ch03_gist.js        # 3과 — 요지 파악
│   ├── ch04_claim.js       # 4과 — 주장 파악
│   └── march25_types.js    # 25년 3월 — 유형별 문제
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

1. `lessons/` 폴더에 `.js` 파일 생성 (형식은 `lessons/TEMPLATE_GUIDE.md` 참고)
2. `index.html` 하단 레슨 로딩 블록에 `<script>` 태그 추가

```html
<!-- index.html 내 레슨 로딩 위치 -->
<script>window.LESSON_LIBRARY = [];</script>
<script src="lessons/sample_lesson.js"></script>
<script src="lessons/ch03_gist.js"></script>
<script src="lessons/ch04_claim.js"></script>
<script src="lessons/march25_types.js"></script>
<script src="lessons/새파일.js"></script>  <!-- 여기에 추가 -->
```

### 레슨 파일 기본 구조

```javascript
;(function(){
  window.LESSON_LIBRARY = window.LESSON_LIBRARY || [];
  window.LESSON_LIBRARY.push({
    title: "수업 제목",
    chapter: "3과",
    settings: {
      defaultBg: "white",        // white | grid | lined | dark | sepia
      defaultFontSize: 32,
      revealMode: "sequential"   // sequential | individual
    },
    slides: [
      { type: "title",      title, subtitle },
      { type: "passage",    title, content, reveals, vocabulary },
      { type: "questions",  items: [{ question, options, answer, explanation }] },
      { type: "grammar",    points: [{ rule, example, highlight }] },
      { type: "keysentence",sentences: [{ en, ko, grammar_note }] },
      { type: "freeform",   html },
      { type: "blank" }
    ]
  });
})();
```

자동 생성 방법: `lessons/TEMPLATE_GUIDE.md`의 프롬프트 템플릿을 Claude에 전달하고 지문 텍스트를 함께 제공하면 `.js` 파일을 생성해 줍니다.

## 키보드 단축키

| 키 | 기능 |
|----|------|
| `←` / `→` | 이전 / 다음 슬라이드 |
| `+` / `-` | 폰트 크기 조절 |
| `F` | 2-F 모드 (첫 2문장 + 끝 1문장 표시) |
| `R` | 지문 순차 reveal |
| `L` | 레슨 매니저 열기 |
| `B` | 배경 테마 전환 |
| `Esc` | 네비게이트 모드 |

## 배포

### GitHub Pages
`main` 브랜치에 push하면 자동 배포됩니다 (`.github/workflows/pages.yml`).

### Vercel
`vercel.json`이 `/`를 `index.html`로 리다이렉트하도록 설정되어 있습니다.
