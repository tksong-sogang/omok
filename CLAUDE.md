# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요
브라우저용 오목 게임 (15×15, 자유룰: 5개 **이상** 연속이면 승리, 금수 없음). 모드는 사람 대 사람, 사람 대 AI(레벨 1~5, 사람은 항상 흑·선공). 빌드 도구·외부 의존성 없음.

## 명령어
- 실행: `index.html`을 브라우저로 열기. 로컬 서버가 필요하면 `python -m http.server 8765` (`.claude/launch.json`의 `omok` 설정과 동일)
- 전체 테스트: `node --test tests`
- 단일 파일: `node --test tests/ai.test.js`
- 단일 테스트: `node --test --test-name-pattern="열린 3" tests`

## 구조
- `js/game.js` — 규칙(보드 생성, 착수, `checkWin`: 마지막 수 기준 4방향 검사 후 승리 라인 좌표 반환). DOM 무관.
- `js/ai.js` — `getAIMove(board, color, level)`. 입력 보드를 복사해서 쓰므로 원본을 바꾸지 않음. DOM 무관.
- `js/main.js` — canvas 렌더링, 클릭→교차점 변환, 턴 진행. 전역 `state` 하나로 게임 상태 관리. AI 차례에는 `state.thinking`으로 입력을 잠그고 `setTimeout`으로 계산을 미룸(화면 갱신 먼저).

### 모듈 로딩 방식 (중요)
`file://`에서 ES 모듈이 막히므로 세 파일을 classic `<script>`로 순서대로 로드하고 **전역 스코프를 공유**한다 (game → ai → main). Node 테스트에서는 각 파일 끝의 `module.exports`와, `ai.js` 첫 줄의 `Object.assign(globalThis, require('./game.js'))`로 같은 이름을 쓴다. 따라서:
- 여러 파일에서 같은 최상위 이름(`const`/`function`)을 선언하면 브라우저에서 SyntaxError가 난다.
- `import`/`export` 문법을 쓰지 말 것.

### AI 설계 (`js/ai.js`)
- 후보 수: 기존 돌에서 거리 2 이내 빈칸 (`getCandidates`).
- `moveScore`: 빈칸에 둔다고 가정한 방향별 모양 점수(`SCORE`, 한 칸 띈 모양 포함) + 복합 위협(4-4, 4-3, 3-3) 보너스.
- `orderedMoves`: 공격·방어 점수로 정렬. 즉시 5목이 있으면 그 수만, 상대 5목 자리가 있으면 막는 수만 반환 → 모든 탐색이 강제수를 자동으로 따름.
- `evaluateBoard`: 모든 5칸 창(window) 가중치 합 기반 정적 평가 (탐색 말단용).
- 레벨: 1 무작위 / 2 공격 위주 상위 4개 중 무작위 / 3 1수 탐욕 / 4 negamax 알파-베타 깊이 2, 후보 12 / 5 반복 심화 깊이 6, 후보 10, 시간 제한 1.5초.
- 레벨 강도를 바꿀 때는 인접 레벨끼리 자체 대국으로 상위 레벨이 이기는지 확인할 것 (`tests/ai.test.js`의 `playGame` 참고).
