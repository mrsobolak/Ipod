/**
 * game.js — Block Drop: a falling-block puzzle game for the Extras menu.
 *
 * Standard falling-tetromino gameplay (7 piece shapes, line clearing,
 * increasing speed) built from scratch for the click wheel: wheel rotation
 * moves left/right, the center button rotates, Next soft-drops, Play/Pause
 * hard-drops, and Menu exits back to Extras.
 */

import { state, elements } from './config.js';

const COLS = 10;
const ROWS = 16;

const COLORS = {
    1: '#4fc3f7', // I
    2: '#ffd54f', // O
    3: '#ba68c8', // T
    4: '#81c784', // S
    5: '#e57373', // Z
    6: '#7986cb', // J
    7: '#ffb74d'  // L
};

const SHAPES = {
    1: [[1, 1, 1, 1]],
    2: [[1, 1], [1, 1]],
    3: [[0, 1, 0], [1, 1, 1]],
    4: [[0, 1, 1], [1, 1, 0]],
    5: [[1, 1, 0], [0, 1, 1]],
    6: [[1, 0, 0], [1, 1, 1]],
    7: [[0, 0, 1], [1, 1, 1]]
};

let ctx = null;
let board = [];
let current = null;
let score = 0;
let level = 1;
let linesCleared = 0;
let tickIntervalId = null;
let tickDelay = 800;
let gameOver = false;
let cellSize = 0;

function rotateMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = [];
    for (let c = 0; c < cols; c++) {
        result.push([]);
        for (let r = rows - 1; r >= 0; r--) {
            result[c].push(matrix[r][c]);
        }
    }
    return result;
}

function randomPieceId() {
    return Math.floor(Math.random() * 7) + 1;
}

function spawnPiece() {
    const id = randomPieceId();
    const matrix = SHAPES[id];
    const piece = {
        id,
        matrix,
        row: 0,
        col: Math.floor((COLS - matrix[0].length) / 2)
    };
    if (collides(piece, 0, 0, piece.matrix)) {
        endGame();
        return null;
    }
    return piece;
}

function collides(piece, rowOffset, colOffset, matrix) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (!matrix[r][c]) continue;
            const newRow = piece.row + r + rowOffset;
            const newCol = piece.col + c + colOffset;
            if (newCol < 0 || newCol >= COLS || newRow >= ROWS) return true;
            if (newRow >= 0 && board[newRow][newCol]) return true;
        }
    }
    return false;
}

function lockPiece() {
    current.matrix.forEach((row, r) => {
        row.forEach((val, c) => {
            if (!val) return;
            const boardRow = current.row + r;
            const boardCol = current.col + c;
            if (boardRow >= 0) board[boardRow][boardCol] = current.id;
        });
    });
    clearLines();
    current = spawnPiece();
    render();
}

function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(0));
            cleared++;
            r++; // re-check same row index after shift
        }
    }
    if (cleared > 0) {
        const points = [0, 100, 300, 500, 800][cleared] || 800;
        score += points * level;
        linesCleared += cleared;
        const newLevel = Math.floor(linesCleared / 10) + 1;
        if (newLevel !== level) {
            level = newLevel;
            tickDelay = Math.max(120, 800 - (level - 1) * 70);
            restartTick();
        }
        if (elements.gameScore) elements.gameScore.textContent = String(score);
    }
}

function tick() {
    if (gameOver || !current) return;
    if (!collides(current, 1, 0, current.matrix)) {
        current.row += 1;
        render();
    } else {
        lockPiece();
    }
}

function restartTick() {
    if (tickIntervalId) clearInterval(tickIntervalId);
    tickIntervalId = setInterval(tick, tickDelay);
}

function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) drawCell(r, c, COLORS[board[r][c]]);
        }
    }

    if (current) {
        current.matrix.forEach((row, r) => {
            row.forEach((val, c) => {
                if (!val) return;
                const boardRow = current.row + r;
                if (boardRow < 0) return;
                drawCell(boardRow, current.col + c, COLORS[current.id]);
            });
        });
    }
}

function drawCell(row, col, color) {
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
}

function resizeCanvas() {
    const canvas = elements.gameCanvas;
    if (!canvas) return;
    const container = canvas.parentElement;
    const availW = container.clientWidth;
    const availH = container.clientHeight;
    cellSize = Math.floor(Math.min(availW / COLS, availH / ROWS));
    canvas.width = cellSize * COLS;
    canvas.height = cellSize * ROWS;
}

// ── Public API ────────────────────────────────────────────────

export function initGame() {
    if (elements.gameCanvas) ctx = elements.gameCanvas.getContext('2d');
}

export function startGame() {
    state.isPlayingGame = true;
    if (elements.gameView) elements.gameView.classList.add('active');
    if (elements.gameOverBanner) elements.gameOverBanner.classList.remove('active');

    resizeCanvas();
    board = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    score = 0;
    level = 1;
    linesCleared = 0;
    tickDelay = 800;
    gameOver = false;
    if (elements.gameScore) elements.gameScore.textContent = '0';

    current = spawnPiece();
    render();
    restartTick();
}

export function stopGame() {
    state.isPlayingGame = false;
    if (tickIntervalId) clearInterval(tickIntervalId);
    tickIntervalId = null;
    if (elements.gameView) elements.gameView.classList.remove('active');
}

function endGame() {
    gameOver = true;
    if (tickIntervalId) clearInterval(tickIntervalId);
    tickIntervalId = null;
    if (elements.gameOverBanner) elements.gameOverBanner.classList.add('active');
}

export function gameMoveLeft() {
    if (gameOver || !current) return;
    if (!collides(current, 0, -1, current.matrix)) {
        current.col -= 1;
        render();
    }
}

export function gameMoveRight() {
    if (gameOver || !current) return;
    if (!collides(current, 0, 1, current.matrix)) {
        current.col += 1;
        render();
    }
}

export function gameRotate() {
    if (gameOver || !current) return;
    const rotated = rotateMatrix(current.matrix);
    if (!collides(current, 0, 0, rotated)) {
        current.matrix = rotated;
        render();
    }
}

export function gameSoftDrop() {
    if (gameOver || !current) return;
    if (!collides(current, 1, 0, current.matrix)) {
        current.row += 1;
        render();
    } else {
        lockPiece();
    }
}

export function gameHardDrop() {
    if (gameOver || !current) return;
    while (!collides(current, 1, 0, current.matrix)) {
        current.row += 1;
    }
    lockPiece();
}

export function isGameOver() {
    return gameOver;
}
