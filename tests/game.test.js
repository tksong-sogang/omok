const test = require('node:test');
const assert = require('node:assert');
const { SIZE, BLACK, WHITE, createBoard, placeStone, checkWin, isBoardFull } = require('../js/game.js');

function line(board, cells, color) {
  for (const [r, c] of cells) board[r][c] = color;
}

test('빈칸에만 돌을 놓을 수 있다', () => {
  const b = createBoard();
  assert.strictEqual(placeStone(b, 7, 7, BLACK), true);
  assert.strictEqual(placeStone(b, 7, 7, WHITE), false);
  assert.strictEqual(placeStone(b, -1, 0, BLACK), false);
  assert.strictEqual(placeStone(b, 0, SIZE, BLACK), false);
});

test('가로/세로/두 대각선 5목은 승리', () => {
  const shapes = [
    [[7, 3], [7, 4], [7, 5], [7, 6], [7, 7]],
    [[3, 7], [4, 7], [5, 7], [6, 7], [7, 7]],
    [[3, 3], [4, 4], [5, 5], [6, 6], [7, 7]],
    [[3, 11], [4, 10], [5, 9], [6, 8], [7, 7]],
  ];
  for (const cells of shapes) {
    const b = createBoard();
    line(b, cells, BLACK);
    const win = checkWin(b, 7, 7);
    assert.ok(win, JSON.stringify(cells));
    assert.strictEqual(win.length, 5);
  }
});

test('4목은 승리가 아니다', () => {
  const b = createBoard();
  line(b, [[0, 0], [0, 1], [0, 2], [0, 3]], WHITE);
  assert.strictEqual(checkWin(b, 0, 3), null);
});

test('자유룰: 6목도 승리', () => {
  const b = createBoard();
  line(b, [[14, 9], [14, 10], [14, 11], [14, 12], [14, 13], [14, 14]], BLACK);
  assert.strictEqual(checkWin(b, 14, 11).length, 6);
});

test('다른 색이 끼면 이어지지 않는다', () => {
  const b = createBoard();
  line(b, [[5, 0], [5, 1], [5, 3], [5, 4]], BLACK);
  b[5][2] = WHITE;
  assert.strictEqual(checkWin(b, 5, 4), null);
});

test('보드가 가득 차면 isBoardFull', () => {
  const b = createBoard();
  assert.strictEqual(isBoardFull(b), false);
  for (const row of b) row.fill(BLACK);
  assert.strictEqual(isBoardFull(b), true);
});
