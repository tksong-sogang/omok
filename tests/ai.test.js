const test = require('node:test');
const assert = require('node:assert');
const { BLACK, WHITE, EMPTY, createBoard, checkWin, isBoardFull } = require('../js/game.js');
const { getAIMove } = require('../js/ai.js');

function setup(stones) {
  const b = createBoard();
  for (const [r, c, color] of stones) b[r][c] = color;
  return b;
}

test('빈 보드에서는 모든 레벨이 합법 수를 둔다', () => {
  for (let level = 1; level <= 5; level++) {
    const b = createBoard();
    const [r, c] = getAIMove(b, BLACK, level);
    assert.strictEqual(b[r][c], EMPTY);
  }
});

test('AI는 보드를 변경하지 않는다', () => {
  const b = setup([[7, 7, BLACK], [7, 8, WHITE]]);
  const before = JSON.stringify(b);
  for (let level = 1; level <= 5; level++) getAIMove(b, WHITE, level);
  assert.strictEqual(JSON.stringify(b), before);
});

test('레벨 2 이상: 즉시 5목이 가능하면 둔다', () => {
  // 백 4개 (한쪽 막힘), 흑 열린 3
  const stones = [
    [7, 3, BLACK], [7, 4, WHITE], [7, 5, WHITE], [7, 6, WHITE], [7, 7, WHITE],
    [3, 3, BLACK], [3, 4, BLACK], [3, 5, BLACK],
  ];
  for (let level = 2; level <= 5; level++) {
    const [r, c] = getAIMove(setup(stones), WHITE, level);
    assert.deepStrictEqual([r, c], [7, 8], `level ${level}`);
  }
});

test('레벨 2 이상: 상대 4목을 막는다', () => {
  const stones = [
    [5, 5, BLACK], [6, 6, BLACK], [7, 7, BLACK], [8, 8, BLACK], [4, 4, WHITE],
    [10, 2, WHITE],
  ];
  for (let level = 2; level <= 5; level++) {
    const [r, c] = getAIMove(setup(stones), WHITE, level);
    assert.deepStrictEqual([r, c], [9, 9], `level ${level}`);
  }
});

test('레벨 3 이상: 상대의 열린 3을 막는다', () => {
  const stones = [[7, 5, BLACK], [7, 6, BLACK], [7, 7, BLACK], [8, 6, WHITE]];
  for (let level = 3; level <= 5; level++) {
    const [r, c] = getAIMove(setup(stones), WHITE, level);
    assert.ok(r === 7 && (c === 4 || c === 8), `level ${level}: ${r},${c}`);
  }
});

function playGame(blackLevel, whiteLevel) {
  const b = createBoard();
  let color = BLACK;
  for (;;) {
    const [r, c] = getAIMove(b, color, color === BLACK ? blackLevel : whiteLevel);
    assert.strictEqual(b[r][c], EMPTY);
    b[r][c] = color;
    if (checkWin(b, r, c)) return color;
    if (isBoardFull(b)) return EMPTY;
    color = color === BLACK ? WHITE : BLACK;
  }
}

test('레벨 5는 레벨 1을 흑/백 모두로 이긴다', () => {
  for (let i = 0; i < 2; i++) {
    assert.strictEqual(playGame(5, 1), BLACK);
    assert.strictEqual(playGame(1, 5), WHITE);
  }
});

test('레벨 5의 한 수 계산은 2초 이내', () => {
  const b = setup([
    [7, 7, BLACK], [7, 8, WHITE], [8, 7, BLACK], [6, 7, WHITE],
    [8, 8, BLACK], [9, 9, WHITE], [6, 6, BLACK], [5, 5, WHITE],
  ]);
  const start = Date.now();
  getAIMove(b, BLACK, 5);
  assert.ok(Date.now() - start < 2000);
});
