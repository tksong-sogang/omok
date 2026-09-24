// 오목 AI (레벨 1~5). DOM에 의존하지 않는 순수 로직.
// 브라우저에서는 game.js의 전역을 그대로 쓰고, Node(테스트)에서는 require로 불러온다.
if (typeof require !== 'undefined') Object.assign(globalThis, require('./game.js'));

// 한 방향 모양 점수
const SCORE = {
  FIVE: 1000000,
  OPEN_FOUR: 100000,
  FOUR: 10000,
  OPEN_THREE: 3000,
  BROKEN_THREE: 2500,
  THREE: 300,
  OPEN_TWO: 200,
  TWO: 20,
  OPEN_ONE: 10,
  ONE: 1,
};
const WIN_SCORE = 100000000;

function opponent(color) {
  return color === BLACK ? WHITE : BLACK;
}

function shapeScore(count, openEnds, gapped) {
  if (gapped) {
    if (count >= 4) return SCORE.FOUR; // 빈칸 하나만 채우면 5목
    if (count === 3) return openEnds === 2 ? SCORE.BROKEN_THREE : openEnds === 1 ? SCORE.THREE : 0;
    return 0;
  }
  if (count >= 5) return SCORE.FIVE;
  if (openEnds === 0) return 0;
  if (count === 4) return openEnds === 2 ? SCORE.OPEN_FOUR : SCORE.FOUR;
  if (count === 3) return openEnds === 2 ? SCORE.OPEN_THREE : SCORE.THREE;
  if (count === 2) return openEnds === 2 ? SCORE.OPEN_TWO : SCORE.TWO;
  return openEnds === 2 ? SCORE.OPEN_ONE : SCORE.ONE;
}

function cellAt(board, r, c) {
  return inBounds(r, c) ? board[r][c] : -1; // -1: 보드 밖(막힘)
}

// 빈칸 (r, c)에 color를 둔다고 가정했을 때 (dr, dc) 방향의 점수
function directionScore(board, r, c, dr, dc, color) {
  const side = (sign) => {
    let n = 1;
    let run = 0;
    while (cellAt(board, r + dr * sign * n, c + dc * sign * n) === color) { run++; n++; }
    const open = cellAt(board, r + dr * sign * n, c + dc * sign * n) === EMPTY;
    // 빈칸 하나 건너 이어지는 돌 (예: XX_X)
    let gapRun = 0;
    let gapOpen = false;
    if (open) {
      let m = n + 1;
      while (cellAt(board, r + dr * sign * m, c + dc * sign * m) === color) { gapRun++; m++; }
      gapOpen = cellAt(board, r + dr * sign * m, c + dc * sign * m) === EMPTY;
    }
    return { run, open, gapRun, gapOpen };
  };
  const a = side(1);
  const b = side(-1);
  const main = 1 + a.run + b.run;
  let best = shapeScore(main, (a.open ? 1 : 0) + (b.open ? 1 : 0), false);
  if (a.gapRun > 0) {
    best = Math.max(best, shapeScore(main + a.gapRun, (a.gapOpen ? 1 : 0) + (b.open ? 1 : 0), true));
  }
  if (b.gapRun > 0) {
    best = Math.max(best, shapeScore(main + b.gapRun, (b.gapOpen ? 1 : 0) + (a.open ? 1 : 0), true));
  }
  return best;
}

// 빈칸 (r, c)에 color를 두었을 때의 가치 (방향 합 + 복합 위협 보너스)
function moveScore(board, r, c, color) {
  let total = 0;
  let fours = 0;
  let threes = 0;
  for (const [dr, dc] of DIRECTIONS) {
    const s = directionScore(board, r, c, dr, dc, color);
    total += s;
    if (s >= SCORE.FOUR && s < SCORE.FIVE) fours++;
    else if (s >= SCORE.BROKEN_THREE && s < SCORE.FOUR) threes++;
  }
  if (fours >= 2 || (fours >= 1 && threes >= 1)) total += 50000;
  else if (threes >= 2) total += 20000;
  return total;
}

// 기존 돌에서 거리 2 이내의 빈칸들. 빈 보드면 중앙.
function getCandidates(board) {
  const mid = Math.floor(SIZE / 2);
  const seen = new Set();
  const result = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === EMPTY) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          const key = nr * SIZE + nc;
          if (inBounds(nr, nc) && board[nr][nc] === EMPTY && !seen.has(key)) {
            seen.add(key);
            result.push([nr, nc]);
          }
        }
      }
    }
  }
  return result.length > 0 ? result : [[mid, mid]];
}

// 후보 수에 공격/방어 점수를 매겨 정렬. 이길 수 있으면 그 수만, 상대 5목을 막아야 하면 막는 수만 반환.
function orderedMoves(board, color, limit, attackWeight = 1.1, defenseWeight = 1) {
  const opp = opponent(color);
  const scored = getCandidates(board).map(([r, c]) => {
    const attack = moveScore(board, r, c, color);
    const defense = moveScore(board, r, c, opp);
    return { r, c, attack, defense, score: attack * attackWeight + defense * defenseWeight };
  });
  const win = scored.find((m) => m.attack >= SCORE.FIVE);
  if (win) return [win];
  const blocks = scored.filter((m) => m.defense >= SCORE.FIVE);
  if (blocks.length > 0) return blocks;
  scored.sort((x, y) => y.score - x.score);
  return limit ? scored.slice(0, limit) : scored;
}

// 모든 가로/세로/대각선의 5칸 창을 훑어, 한 색만 들어 있는 창에 가중치를 준다.
const WINDOW_WEIGHT = [0, 1, 10, 100, 2000, 1000000];
function evaluateBoard(board, color) {
  const opp = opponent(color);
  let mine = 0;
  let theirs = 0;
  for (const [dr, dc] of DIRECTIONS) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const er = r + dr * 4;
        const ec = c + dc * 4;
        if (!inBounds(er, ec)) continue;
        let m = 0;
        let t = 0;
        for (let k = 0; k < 5; k++) {
          const v = board[r + dr * k][c + dc * k];
          if (v === color) m++;
          else if (v === opp) t++;
        }
        if (t === 0) mine += WINDOW_WEIGHT[m];
        else if (m === 0) theirs += WINDOW_WEIGHT[t];
      }
    }
  }
  return mine * 1.2 - theirs; // 둘 차례인 쪽에 약간의 가산
}

class Timeout extends Error {}

function negamax(board, depth, alpha, beta, color, limit, deadline) {
  if (Date.now() > deadline) throw new Timeout();
  if (depth === 0) return evaluateBoard(board, color);
  const moves = orderedMoves(board, color, limit);
  let best = -Infinity;
  for (const { r, c } of moves) {
    board[r][c] = color;
    let value;
    if (checkWin(board, r, c)) value = WIN_SCORE + depth; // 빨리 이길수록 높게
    else value = -negamax(board, depth - 1, -beta, -alpha, opponent(color), limit, deadline);
    board[r][c] = EMPTY;
    if (value > best) best = value;
    if (value > alpha) alpha = value;
    if (alpha >= beta) break;
  }
  return best;
}

function searchBestMove(board, color, maxDepth, limit, timeLimitMs) {
  const deadline = Date.now() + timeLimitMs;
  let rootMoves = orderedMoves(board, color, limit);
  if (rootMoves.length === 1) return [rootMoves[0].r, rootMoves[0].c];
  let bestMove = [rootMoves[0].r, rootMoves[0].c];
  for (let depth = 1; depth <= maxDepth; depth++) {
    try {
      let alpha = -Infinity;
      let depthBest = null;
      const results = [];
      for (const m of rootMoves) {
        board[m.r][m.c] = color;
        let value;
        if (checkWin(board, m.r, m.c)) value = WIN_SCORE + depth;
        else value = -negamax(board, depth - 1, -Infinity, -alpha, opponent(color), limit, deadline);
        board[m.r][m.c] = EMPTY;
        results.push({ m, value });
        if (value > alpha) { alpha = value; depthBest = m; }
      }
      bestMove = [depthBest.r, depthBest.c];
      if (alpha >= WIN_SCORE) break; // 필승 수를 찾음
      // 다음 깊이에서는 이번 결과가 좋은 수부터 탐색
      results.sort((x, y) => y.value - x.value);
      rootMoves = results.map((x) => x.m);
    } catch (e) {
      // 시간 초과 시 마지막으로 끝까지 탐색한 깊이의 수를 쓴다. (board는 복사본이라 복구하지 않음)
      if (e instanceof Timeout) break;
      throw e;
    }
  }
  return bestMove;
}

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// 레벨(1~5)에 맞춰 color의 다음 수 [r, c]를 반환. board는 변경하지 않는다.
function getAIMove(board, color, level) {
  const work = board.map((row) => row.slice());
  switch (level) {
    case 1: {
      const wins = orderedMoves(work, color, 0).filter((m) => m.attack >= SCORE.FIVE);
      if (wins.length > 0 && Math.random() < 0.5) return [wins[0].r, wins[0].c];
      return randomPick(getCandidates(work));
    }
    case 2: {
      const moves = orderedMoves(work, color, 4, 1, 0.3);
      const m = randomPick(moves);
      return [m.r, m.c];
    }
    case 3: {
      const m = orderedMoves(work, color, 1)[0];
      return [m.r, m.c];
    }
    case 4:
      return searchBestMove(work, color, 2, 12, 3000);
    default:
      return searchBestMove(work, color, 6, 10, 1500);
  }
}

if (typeof module !== 'undefined') {
  module.exports = { SCORE, getAIMove, getCandidates, moveScore, orderedMoves, evaluateBoard };
}
