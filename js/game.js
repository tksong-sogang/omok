// 오목 게임 규칙 (자유룰: 5개 이상 연속이면 승리). DOM에 의존하지 않는 순수 로직.

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function createBoard() {
  return Array.from({ length: SIZE }, () => new Array(SIZE).fill(EMPTY));
}

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function placeStone(board, r, c, color) {
  if (!inBounds(r, c) || board[r][c] !== EMPTY) return false;
  board[r][c] = color;
  return true;
}

// (r, c)에 놓인 돌 기준으로 5개 이상 연속이면 그 줄의 좌표 배열을, 아니면 null을 반환.
function checkWin(board, r, c) {
  const color = board[r][c];
  if (color === EMPTY) return null;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [[r, c]];
    for (const sign of [1, -1]) {
      let nr = r + dr * sign;
      let nc = c + dc * sign;
      while (inBounds(nr, nc) && board[nr][nc] === color) {
        line.push([nr, nc]);
        nr += dr * sign;
        nc += dc * sign;
      }
    }
    if (line.length >= 5) return line;
  }
  return null;
}

function isBoardFull(board) {
  return board.every((row) => row.every((v) => v !== EMPTY));
}

if (typeof module !== 'undefined') {
  module.exports = { SIZE, EMPTY, BLACK, WHITE, DIRECTIONS, createBoard, inBounds, placeStone, checkWin, isBoardFull };
}
