"""
validate_lesson.py
양영학원 화이트보드 수업 파일 자동 검증 스크립트

사용법: Claude Code가 각 지문 생성 직후 자동으로 호출
검증 항목 (결정적 오류만):
  1. grammar.highlight가 grammar.example 안에 존재하는지
  2. questions.answer가 0 이상 4 이하인지
  3. keysentence.en의 첫 5단어가 passage.content 안에 존재하는지
"""

import json
import sys


def validate(lesson: dict) -> list[str]:
    """단일 레슨 오브젝트를 검증하고 오류 목록을 반환."""
    errors = []
    slides = lesson.get("slides", [])

    # passage.content 추출 (두 번째 슬라이드 = passage 타입)
    content = ""
    for s in slides:
        if s.get("type") == "passage":
            content = s.get("content", "")
            break

    for s in slides:
        # ─── grammar 검증 ───
        if s.get("type") == "grammar":
            for i, p in enumerate(s.get("points", []), 1):
                highlight = p.get("highlight", "")
                example = p.get("example", "")
                if not highlight:
                    errors.append(f"[grammar] point {i}: highlight가 비어 있음")
                elif highlight not in example:
                    errors.append(
                        f"[grammar] point {i}: highlight 불일치\n"
                        f"  highlight : '{highlight}'\n"
                        f"  example   : '{example}'"
                    )

        # ─── questions 검증 ───
        if s.get("type") == "questions":
            for i, item in enumerate(s.get("items", []), 1):
                answer = item.get("answer", -1)
                if not isinstance(answer, int) or not (0 <= answer <= 4):
                    errors.append(
                        f"[questions] item {i}: answer 범위 오류 → {answer} (0~4 이어야 함)"
                    )

        # ─── keysentence 검증 ───
        if s.get("type") == "keysentence":
            for i, sent in enumerate(s.get("sentences", []), 1):
                en = sent.get("en", "")
                first_5 = " ".join(en.split()[:5])
                if first_5 and first_5 not in content:
                    errors.append(
                        f"[keysentence] sent {i}: 원문 불일치\n"
                        f"  첫 5단어 : '{first_5}'\n"
                        f"  passage  : (해당 텍스트 없음)"
                    )

    return errors


def validate_batch(lessons: list[dict]) -> dict:
    """복수 레슨 오브젝트를 순서대로 검증하고 결과 요약 반환."""
    results = {}
    all_pass = True
    for lesson in lessons:
        name = lesson.get("title", "Unknown")
        errors = validate(lesson)
        results[name] = errors
        if errors:
            all_pass = False
    return {"all_pass": all_pass, "results": results}


# ────────────────────────────────────────────────────────────
# 직접 실행 시: ch03 5개 지문 인라인 테스트
# ────────────────────────────────────────────────────────────
if __name__ == "__main__":

    # 지문별 데이터 (ch03_gist_v2.js 와 동일한 내용)
    GATEWAY_CONTENT = (
        "The ability to understand emotions \u2014 to have a diverse emotion vocabulary "
        "and to understand the causes and consequences of emotion \u2014 is particularly "
        "relevant in group settings. Individuals who are skilled in this domain are able "
        "to express emotions, feelings and moods accurately and thus, may facilitate clear "
        "communication between co-workers. Furthermore, they may be more likely to act in "
        "ways that accommodate their own needs as well as the needs of others (i.e. "
        "cooperate). In a group conflict situation, for example, a member with a strong "
        "ability to understand emotion will be able to express how he feels about the "
        "problem and why he feels this way. He also should be able to take the perspective "
        "of the other group members and understand why they are reacting in a certain "
        "manner. Appreciation of differences creates an arena for open communication and "
        "promotes constructive conflict resolution and improved group functioning."
    )

    EX01_CONTENT = (
        "The higher prevalence of environmental consciousness among younger generations "
        "means that a company's environmental reputation may affect its ability to recruit "
        "talent. \"We know that it makes a hiring difference when we're out recruiting at "
        "universities. People ask about sustainability, and our recruiters do talk about "
        "our packaging, so it is a draw for talent,\" said Oliver Campbell, director of "
        "procurement at Dell. A Rutgers University study of worker priorities found that "
        "nearly half of college students (45 percent) said in 2012 that they would give "
        "up a 15 percent higher salary to have a job \"that seeks to make a social or "
        "environmental difference in the world.\" Naturally, such responses to surveys "
        "may or may not correlate with actual behavior, but they may be an indicator."
    )

    EX02_CONTENT = (
        "We can all become vulnerable to doubts about our belonging at any given moment, "
        "depending on the situations we find ourselves in and how we interpret them. Greg "
        "Walton and I coined the term \"belonging uncertainty\" to refer to the state of "
        "mind in which one suffers from doubts about whether one is fully accepted in a "
        "particular environment or ever could be. We can experience it in the workplace, "
        "at school, at a fancy restaurant, or even in a brief social encounter. Belonging "
        "uncertainty has adverse effects. When we perceive threats to our sense of "
        "belonging, our horizon of possibility shrinks. We tend to interpret ourselves, "
        "other people, and the situation in a defensive and self-protective way. We more "
        "readily infer that we are incapable or that we aren't meant to be there, that we "
        "will not understand or be understood. We're less likely to express our views, "
        "especially if they differ from those of others. We're more sensitive to perceived "
        "criticism. We're less inclined to accept challenges that pose a risk of failure."
    )

    EX03_CONTENT = (
        "A group of psychologists looked at the effects of everyday good and bad events "
        "\u2014 getting a compliment from your boss, bad weather, getting stuck in traffic, "
        "etc. Not surprisingly, good events had a positive impact on people's mood and "
        "negative events brought people down. But the duration of the experiences differed "
        "dramatically. Positive events were short-lived. The negative events stayed longer. "
        "In one study, having a good day did not have any noticeable impact on the "
        "subsequent day. That is, a good Monday didn't carry over to Tuesday. But negative "
        "events had a sustained impact \u2014 a bad Monday predicted a gloomy Tuesday. "
        "This pattern is so strong that it is considered a \"law\" of human behavior. "
        "Specifically, the law of hedonic asymmetry states that \"pleasure is always "
        "dependent on change and disappears with continuous satisfaction, whereas pain "
        "persists under persisting unpleasant conditions.\""
    )

    EX04_CONTENT = (
        "People have a strong desire to define categories using rules. It is a natural "
        "human goal to impose order and sense on the world, to be able to know what boxes "
        "everything should go into, with no ambiguity. The disappointing aspect is that "
        "this urge has failed in almost every attempt. Most natural categories simply do "
        "not have a definition or rule that comes close to working. Even human-made "
        "categories in systems of rules, like games, legal systems, official diagnostic "
        "categories, and the like can put only so much order into the universe. There are "
        "always test cases that seem to break the rules \u2014 unclear category membership, "
        "not fitting into any category, or just giving the wrong answer. This is not due "
        "to any human failing, I believe, but simply to the natural complexity and "
        "messiness of the world. No religion, legal system, or bureaucracy can completely "
        "control the variation and weird events that occur even in limited worlds like "
        "baseball or disease classification."
    )

    LESSONS = [
        {
            "title": "수능특강 03과 Gateway — 요지 파악",
            "slides": [
                {"type": "title"},
                {"type": "passage", "content": GATEWAY_CONTENT},
                {"type": "questions", "items": [
                    {"answer": 1},
                    {"answer": 1}
                ]},
                {"type": "grammar", "points": [
                    {
                        "rule": "관계대명사 who — 주격 관계절",
                        "example": "Individuals who are skilled in this domain are able to express emotions, feelings and moods accurately and thus, may facilitate clear communication between co-workers.",
                        "highlight": "who are skilled in this domain"
                    },
                    {
                        "rule": "as well as — A뿐만 아니라 B도",
                        "example": "they may be more likely to act in ways that accommodate their own needs as well as the needs of others (i.e. cooperate).",
                        "highlight": "as well as"
                    },
                    {
                        "rule": "and 병렬구조",
                        "example": "Appreciation of differences creates an arena for open communication and promotes constructive conflict resolution and improved group functioning.",
                        "highlight": "creates an arena for open communication and promotes"
                    }
                ]},
                {"type": "keysentence", "sentences": [
                    {"en": "Appreciation of differences creates an arena for open communication and promotes constructive conflict resolution and improved group functioning.", "ko": "차이에 대한 이해는 열린 소통의 장을 만들고 건설적인 갈등 해결과 향상된 집단 기능을 촉진한다."},
                    {"en": "Individuals who are skilled in this domain are able to express emotions, feelings and moods accurately and thus, may facilitate clear communication between co-workers.", "ko": "이 분야에 능숙한 개인들은 감정, 느낌, 기분을 정확하게 표현할 수 있어서 동료들 사이의 명확한 소통을 촉진할 수 있다."}
                ]}
            ]
        },
        {
            "title": "수능특강 03과 Ex01 — 요지 파악",
            "slides": [
                {"type": "title"},
                {"type": "passage", "content": EX01_CONTENT},
                {"type": "questions", "items": [
                    {"answer": 4},
                    {"answer": 2}
                ]},
                {"type": "grammar", "points": [
                    {
                        "rule": "that절 명사절 — means that",
                        "example": "The higher prevalence of environmental consciousness among younger generations means that a company's environmental reputation may affect its ability to recruit talent.",
                        "highlight": "means that"
                    },
                    {
                        "rule": "may + 동사원형 — 가능성/추측",
                        "example": "a company's environmental reputation may affect its ability to recruit talent.",
                        "highlight": "may affect"
                    },
                    {
                        "rule": "may or may not — 불확실성 표현",
                        "example": "such responses to surveys may or may not correlate with actual behavior, but they may be an indicator.",
                        "highlight": "may or may not"
                    }
                ]},
                {"type": "keysentence", "sentences": [
                    {"en": "The higher prevalence of environmental consciousness among younger generations means that a company's environmental reputation may affect its ability to recruit talent.", "ko": "젊은 세대에서 환경 의식이 더 높게 나타난다는 것은 기업의 환경적 평판이 인재를 채용하는 능력에 영향을 미칠 수 있음을 의미한다."},
                    {"en": "Naturally, such responses to surveys may or may not correlate with actual behavior, but they may be an indicator.", "ko": "물론, 설문조사에 대한 이러한 반응이 실제 행동과 일치할 수도 있고 그렇지 않을 수도 있지만, 하나의 지표가 될 수 있다."}
                ]}
            ]
        },
        {
            "title": "수능특강 03과 Ex02 — 요지 파악",
            "slides": [
                {"type": "title"},
                {"type": "passage", "content": EX02_CONTENT},
                {"type": "questions", "items": [
                    {"answer": 4},
                    {"answer": 2}
                ]},
                {"type": "grammar", "points": [
                    {
                        "rule": "depending on — '~에 따라' 분사구문",
                        "example": "We can all become vulnerable to doubts about our belonging at any given moment, depending on the situations we find ourselves in and how we interpret them.",
                        "highlight": "depending on"
                    },
                    {
                        "rule": "whether — 간접의문문",
                        "example": "one suffers from doubts about whether one is fully accepted in a particular environment or ever could be.",
                        "highlight": "whether"
                    },
                    {
                        "rule": "be less likely to — 가능성이 낮음",
                        "example": "We're less likely to express our views, especially if they differ from those of others.",
                        "highlight": "less likely to"
                    }
                ]},
                {"type": "keysentence", "sentences": [
                    {"en": "Belonging uncertainty has adverse effects.", "ko": "소속 불확실성은 부정적인 영향을 미친다."},
                    {"en": "When we perceive threats to our sense of belonging, our horizon of possibility shrinks.", "ko": "우리가 소속감에 대한 위협을 인식할 때, 가능성의 지평이 좁아진다."}
                ]}
            ]
        },
        {
            "title": "수능특강 03과 Ex03 — 요지 파악",
            "slides": [
                {"type": "title"},
                {"type": "passage", "content": EX03_CONTENT},
                {"type": "questions", "items": [
                    {"answer": 1},
                    {"answer": 2}
                ]},
                {"type": "grammar", "points": [
                    {
                        "rule": "so ~ that ... — 결과 구문",
                        "example": "This pattern is so strong that it is considered a \"law\" of human behavior.",
                        "highlight": "so strong that"
                    },
                    {
                        "rule": "whereas — 대조 접속사",
                        "example": "pleasure is always dependent on change and disappears with continuous satisfaction, whereas pain persists under persisting unpleasant conditions.",
                        "highlight": "whereas"
                    },
                    {
                        "rule": "동명사 주어 — V-ing가 주어 역할",
                        "example": "having a good day did not have any noticeable impact on the subsequent day.",
                        "highlight": "having a good day"
                    }
                ]},
                {"type": "keysentence", "sentences": [
                    {"en": "But negative events had a sustained impact \u2014 a bad Monday predicted a gloomy Tuesday.", "ko": "그러나 부정적인 사건은 지속적인 영향을 미쳤다 — 나쁜 월요일은 우울한 화요일을 예측했다."},
                    {"en": "pleasure is always dependent on change and disappears with continuous satisfaction, whereas pain persists under persisting unpleasant conditions.", "ko": "쾌락은 항상 변화에 의존하고 지속적인 만족과 함께 사라지는 반면, 고통은 지속적인 불쾌한 조건하에서 계속된다."}
                ]}
            ]
        },
        {
            "title": "수능특강 03과 Ex04 — 요지 파악",
            "slides": [
                {"type": "title"},
                {"type": "passage", "content": EX04_CONTENT},
                {"type": "questions", "items": [
                    {"answer": 1},
                    {"answer": 2}
                ]},
                {"type": "grammar", "points": [
                    {
                        "rule": "가주어-진주어 — It is ... to V",
                        "example": "It is a natural human goal to impose order and sense on the world, to be able to know what boxes everything should go into, with no ambiguity.",
                        "highlight": "It is a natural human goal to"
                    },
                    {
                        "rule": "not A but B — 대조 구문",
                        "example": "This is not due to any human failing, I believe, but simply to the natural complexity and messiness of the world.",
                        "highlight": "not due to"
                    },
                    {
                        "rule": "관계대명사 that — 선행사 수식",
                        "example": "There are always test cases that seem to break the rules \u2014 unclear category membership, not fitting into any category, or just giving the wrong answer.",
                        "highlight": "that seem to break"
                    }
                ]},
                {"type": "keysentence", "sentences": [
                    {"en": "This is not due to any human failing, I believe, but simply to the natural complexity and messiness of the world.", "ko": "이것은 어떤 인간의 실패 때문이 아니라, 단순히 세상의 자연적인 복잡성과 무질서 때문이라고 나는 믿는다."},
                    {"en": "No religion, legal system, or bureaucracy can completely control the variation and weird events that occur even in limited worlds like baseball or disease classification.", "ko": "어떤 종교, 법적 체계, 또는 관료주의도 야구나 질병 분류와 같은 제한된 세계에서조차 발생하는 변이와 기이한 사건들을 완전히 통제할 수 없다."}
                ]}
            ]
        }
    ]

    print("=" * 60)
    print("  양영학원 수능특강 03과 — 자동 검증 결과")
    print("=" * 60)

    all_pass = True
    for lesson in LESSONS:
        name = lesson["title"]
        errors = validate(lesson)
        status = "✅ PASS" if not errors else "❌ FAIL"
        print(f"\n{status}  {name}")
        for e in errors:
            print(f"      └─ {e}")
        if errors:
            all_pass = False

    print("\n" + "=" * 60)
    if all_pass:
        print("  결과: 전체 5개 지문 검증 통과 ✅")
    else:
        print("  결과: 오류 발견 — 위 지문 재생성 필요 ❌")
    print("=" * 60)
