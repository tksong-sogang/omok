// 화면 표시와 입력 처리. 규칙은 game.js, AI는 ai.js에 있다.

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const menuEl = document.getElementById('menu');
const gameEl = document.getElementById('game');
const levelSelect = document.getElementById('level-select');

const PADDING = 20;
const CELL = (canvas.width - PADDING * 2) / (SIZE - 1);
const COLOR_NAME = { [BLACK]: '흑', [WHITE]: '백' };
const HUMAN = BLACK; // 사람 대 AI 모드에서 사람은 항상 흑(선공)

let state = null;

function newGame(mode, level) {
  state = {
    mode, // 'pvp' | 'ai'
    level,
    board: createBoard(),
    turn: BLACK,
    lastMove: null,
    winLine: null,
    over: false,
    thinking: false,
  };
  render();
}

function updateStatus() {
  if (state.winLine) {
    const winner = state.board[state.winLine[0][0]][state.winLine[0][1]];
    if (state.mode === 'ai') statusEl.textContent = winner === HUMAN ? '승리했습니다!' : 'AI가 이겼습니다.';
    else statusEl.textContent = `${COLOR_NAME[winner]} 승리!`;
  } else if (state.over) {
    statusEl.textContent = '무승부입니다.';
  } else if (state.thinking) {
    statusEl.textContent = `AI(레벨 ${state.level})가 생각 중...`;
  } else if (state.mode === 'ai') {
    statusEl.textContent = '당신(흑)의 차례';
  } else {
    statusEl.textContent = `${COLOR_NAME[state.turn]}의 차례`;
  }
}

function render() {
  ctx.fillStyle = '#dcb35c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  for (let i = 0; i < SIZE; i++) {
    const p = PADDING + i * CELL;
    ctx.beginPath();
    ctx.moveTo(PADDING, p);
    ctx.lineTo(canvas.width - PADDING, p);
    ctx.moveTo(p, PADDING);
    ctx.lineTo(p, canvas.height - PADDING);
    ctx.stroke();
  }

  // 화점
  ctx.fillStyle = '#333';
  for (const r of [3, 7, 11]) {
    for (const c of [3, 7, 11]) {
      ctx.beginPath();
      ctx.arc(PADDING + c * CELL, PADDING + r * CELL, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.board[r][c] !== EMPTY) drawStone(r, c, state.board[r][c]);
    }
  }

  if (state.lastMove) {
    const [r, c] = state.lastMove;
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(PADDING + c * CELL, PADDING + r * CELL, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.winLine) {
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 3;
    for (const [r, c] of state.winLine) {
      ctx.beginPath();
      ctx.arc(PADDING + c * CELL, PADDING + r * CELL, CELL * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  updateStatus();
}

function drawStone(r, c, color) {
  const x = PADDING + c * CELL;
  const y = PADDING + r * CELL;
  const radius = CELL * 0.43;
  const grad = ctx.createRadialGradient(x - radius / 3, y - radius / 3, radius / 6, x, y, radius);
  if (color === BLACK) {
    grad.addColorStop(0, '#666');
    grad.addColorStop(1, '#111');
  } else {
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#ccc');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// 착수 후 승패를 판정하고 차례를 넘긴다.
function play(r, c) {
  if (!placeStone(state.board, r, c, state.turn)) return false;
  state.lastMove = [r, c];
  state.winLine = checkWin(state.board, r, c);
  state.over = Boolean(state.winLine) || isBoardFull(state.board);
  if (!state.over) state.turn = state.turn === BLACK ? WHITE : BLACK;
  render();
  return true;
}

function aiTurn() {
  state.thinking = true;
  render();
  const game = state;
  // 화면이 먼저 갱신되도록 잠시 뒤에 계산한다.
  setTimeout(() => {
    if (game !== state) return; // 그 사이 새 게임을 시작함
    const [r, c] = getAIMove(state.board, state.turn, state.level);
    state.thinking = false;
    play(r, c);
  }, 50);
}

canvas.addEventListener('click', (e) => {
  if (!state || state.over || state.thinking) return;
  if (state.mode === 'ai' && state.turn !== HUMAN) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const c = Math.round((x - PADDING) / CELL);
  const r = Math.round((y - PADDING) / CELL);
  if (!play(r, c)) return;
  if (state.mode === 'ai' && !state.over) aiTurn();
});

document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener('change', () => {
    levelSelect.disabled = document.querySelector('input[name="mode"]:checked').value !== 'ai';
  });
});

document.getElementById('start-btn').addEventListener('click', () => {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const level = Number(document.querySelector('input[name="level"]:checked').value);
  menuEl.hidden = true;
  gameEl.hidden = false;
  newGame(mode, level);
});

document.getElementById('restart-btn').addEventListener('click', () => newGame(state.mode, state.level));

document.getElementById('menu-btn').addEventListener('click', () => {
  state = null;
  gameEl.hidden = true;
  menuEl.hidden = false;
});
