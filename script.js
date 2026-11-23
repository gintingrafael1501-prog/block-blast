const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const modalEl = document.getElementById("gameover-modal");
const finalScoreEl = document.getElementById("final-score");
const btnRestart = document.getElementById("btn-restart");
const btnSound = document.getElementById("btn-sound");

const GRID_SIZE = 8;
let board = [];
let score = 0;
let highScore = parseInt(localStorage.getItem("blockBlastBest")) || 0;
let comboCount = 0;
let soundEnabled = true;

highScoreEl.textContent = highScore;

let canvasW = 380;
let canvasH = 560;
let cellSize = 42;
let gap = 4;
let boardX = 0;
let boardY = 10;
let trayY = 390;

const COLORS = [
    { main: "#ff595e", light: "#ff8a8e", dark: "#c92a2f" },
    { main: "#ff924c", light: "#ffb885", dark: "#cc6623" },
    { main: "#ffca3a", light: "#ffe082", dark: "#cca01d" },
    { main: "#8ac926", light: "#b2e35f", dark: "#639614" },
    { main: "#1982c4", light: "#5cb3eb", dark: "#0f5a8a" },
    { main: "#6a4c93", light: "#9d7ec7", dark: "#462f66" }
];

const SHAPES = [
    ["1"], ["11"], ["1", "1"], ["111"], ["1", "1", "1"],
    ["1111"], ["1", "1", "1", "1"], ["11", "11"], ["111", "111", "111"],
    ["10", "11"], ["01", "11"], ["11", "10"], ["11", "01"],
    ["100", "100", "111"], ["001", "001", "111"], ["111", "100", "100"],
    ["111", "001", "001"], ["111", "010"], ["010", "111"],
    ["110", "011"], ["011", "110"]
];

let trayPieces = [null, null, null];
let draggingPiece = null;
let dragIndex = -1;
let dragX = 0;
let dragY = 0;
let snapRow = -1;
let snapCol = -1;

let particles = [];
let floatingTexts = [];
let previewClearRows = [];
let previewClearCols = [];

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioContextClass ? new AudioContextClass() : null;

function playTone(freq, type, duration, vol) {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function soundPick() { playTone(320, "sine", 0.08, 0.1); }
function soundDrop() { playTone(480, "triangle", 0.12, 0.18); }
function soundClear(combo) {
    let base = 520 + (combo * 80);
    playTone(base, "sine", 0.18, 0.2);
    setTimeout(function() { playTone(base * 1.25, "sine", 0.25, 0.2); }, 70);
}
function soundGameOver() {
    playTone(300, "sawtooth", 0.25, 0.15);
    setTimeout(function() { playTone(220, "sawtooth", 0.4, 0.15); }, 200);
}
function resizeCanvas() {
    const container = canvas.parentElement;
    const maxW = Math.min(container.clientWidth, 400);
    const maxH = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvasW = maxW;
    canvasH = maxH;
    canvas.style.width = canvasW + "px";
    canvas.style.height = canvasH + "px";
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const boardTotalW = Math.min(canvasW - 16, canvasH * 0.64);
    cellSize = Math.floor((boardTotalW - (GRID_SIZE + 1) * gap) / GRID_SIZE);
    const actualBoardW = GRID_SIZE * cellSize + (GRID_SIZE + 1) * gap;
    boardX = Math.floor((canvasW - actualBoardW) / 2);
    boardY = 10;
    trayY = boardY + actualBoardW + 28;

    const slotW = canvasW / 3;
    for (let i = 0; i < 3; i++) {
        if (trayPieces[i]) {
            trayPieces[i].homeX = slotW * i + slotW / 2;
            trayPieces[i].homeY = trayY + 55;
        }
    }
}

function initGame() {
    resizeCanvas();
    board = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        let row = [];
        for (let c = 0; c < GRID_SIZE; c++) row.push(null);
        board.push(row);
    }
    score = 0;
    comboCount = 0;
    particles = [];
    floatingTexts = [];
    updateScoreUI();
    modalEl.classList.add("hidden");
    spawnTrayPieces();
}

function spawnTrayPieces() {
    const slotW = canvasW / 3;
    for (let i = 0; i < 3; i++) {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        trayPieces[i] = {
            shape: shape, color: color,
            homeX: slotW * i + slotW / 2,
            homeY: trayY + 55, scale: 0.55
        };
    }
    checkGameOver();
}

function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
}

function drawBevelBlock(x, y, size, colorObj, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const radius = Math.max(4, size * 0.16);
    const bevel = Math.max(3, size * 0.14);

    roundRect(ctx, x, y, size, size, radius);
    ctx.fillStyle = colorObj.main;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + size - radius, y);
    ctx.lineTo(x + size - bevel, y + bevel);
    ctx.lineTo(x + bevel, y + bevel);
    ctx.lineTo(x + bevel, y + size - bevel);
    ctx.lineTo(x, y + size - radius);
    ctx.closePath();
    ctx.fillStyle = colorObj.light;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + size, y + radius);
    ctx.lineTo(x + size, y + size - radius);
    ctx.lineTo(x + radius, y + size);
    ctx.lineTo(x + bevel, y + size - bevel);
    ctx.lineTo(x + size - bevel, y + size - bevel);
    ctx.lineTo(x + size - bevel, y + bevel);
    ctx.closePath();
    ctx.fillStyle = colorObj.dark;
    ctx.fill();
    ctx.restore();
}

function canPlace(shape, startR, startC) {
    if (startR < 0 || startC < 0) return false;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === "1") {
                const tr = startR + r;
                const tc = startC + c;
                if (tr >= GRID_SIZE || tc >= GRID_SIZE || board[tr][tc] !== null) return false;
            }
        }
    }
    return true;
}

function updatePreviewClears() {
    previewClearRows = [];
    previewClearCols = [];
    if (!draggingPiece || snapRow === -1 || snapCol === -1) return;

    let tempBoard = board.map(function(row) { return [...row]; });
    const shape = draggingPiece.shape;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === "1") tempBoard[snapRow + r][snapCol + c] = draggingPiece.color;
        }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
        if (tempBoard[r].every(function(cell) { return cell !== null; })) previewClearRows.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (tempBoard[r][c] === null) full = false;
        }
        if (full) previewClearCols.push(c);
    }
}

function placePiece(piece, startR, startC) {
    let blocksPlaced = 0;
    const shape = piece.shape;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === "1") {
                board[startR + r][startC + c] = piece.color;
                blocksPlaced++;
            }
        }
    }
    score += blocksPlaced * 10;
    soundDrop();
    checkAndClearLines(startR, startC);
    updateScoreUI();
}
function checkAndClearLines(dropR, dropC) {
    let rowsToClear = [];
    let colsToClear = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r].every(function(cell) { return cell !== null; })) rowsToClear.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (board[r][c] === null) full = false;
        }
        if (full) colsToClear.push(c);
    }

    const totalLines = rowsToClear.length + colsToClear.length;
    if (totalLines > 0) {
        comboCount++;
        soundClear(comboCount);

        rowsToClear.forEach(function(r) {
            for (let c = 0; c < GRID_SIZE; c++) spawnParticles(r, c, board[r][c]);
        });
        colsToClear.forEach(function(c) {
            for (let r = 0; r < GRID_SIZE; r++) {
                if (!rowsToClear.includes(r)) spawnParticles(r, c, board[r][c]);
            }
        });

        rowsToClear.forEach(function(r) {
            for (let c = 0; c < GRID_SIZE; c++) board[r][c] = null;
        });
        colsToClear.forEach(function(c) {
            for (let r = 0; r < GRID_SIZE; r++) board[r][c] = null;
        });

        const totalGained = (totalLines * 100 * totalLines) + (comboCount > 1 ? comboCount * 50 : 0);
        score += totalGained;

        const centerX = boardX + (dropC + 1) * (cellSize + gap);
        const centerY = boardY + (dropR + 1) * (cellSize + gap);
        let label = "+" + totalGained + (comboCount > 1 ? " COMBO x" + comboCount + "!" : "");
        floatingTexts.push({
            text: label,
            x: Math.min(Math.max(centerX, 80), canvasW - 80),
            y: centerY, alpha: 1, vy: -1.8
        });
    } else {
        comboCount = 0;
    }
}

function spawnParticles(r, c, colorObj) {
    if (!colorObj) return;
    const cx = boardX + gap + c * (cellSize + gap) + cellSize / 2;
    const cy = boardY + gap + r * (cellSize + gap) + cellSize / 2;
    for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 5, color: colorObj.main, alpha: 1
        });
    }
}

function updateScoreUI() {
    scoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
        localStorage.setItem("blockBlastBest", highScore);
    }
}

function checkGameOver() {
    let canMove = false;
    for (let i = 0; i < 3; i++) {
        const p = trayPieces[i];
        if (!p) continue;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (canPlace(p.shape, r, c)) { canMove = true; break; }
            }
            if (canMove) break;
        }
    }
    if (!canMove) {
        soundGameOver();
        finalScoreEl.textContent = score;
        setTimeout(function() { modalEl.classList.remove("hidden"); }, 450);
    }
}

const FINGER_OFFSET_Y = 95;
function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener("pointerdown", function(e) {
    e.preventDefault();
    const pos = getPointerPos(e);
    const slotW = canvasW / 3;
    if (pos.y >= trayY - 25) {
        const idx = Math.floor(pos.x / slotW);
        if (idx >= 0 && idx < 3 && trayPieces[idx] !== null) {
            dragIndex = idx;
            draggingPiece = trayPieces[idx];
            dragX = pos.x;
            dragY = pos.y - FINGER_OFFSET_Y;
            soundPick();
            updateSnapPosition();
        }
    }
});

window.addEventListener("pointermove", function(e) {
    if (!draggingPiece) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    dragX = pos.x;
    dragY = pos.y - FINGER_OFFSET_Y;
    updateSnapPosition();
}, { passive: false });

window.addEventListener("pointerup", function() {
    if (!draggingPiece) return;
    if (snapRow !== -1 && snapCol !== -1) {
        placePiece(draggingPiece, snapRow, snapCol);
        trayPieces[dragIndex] = null;
        if (trayPieces.every(function(p) { return p === null; })) spawnTrayPieces();
        else checkGameOver();
    }
    draggingPiece = null;
    dragIndex = -1;
    snapRow = -1;
    snapCol = -1;
    previewClearRows = [];
    previewClearCols = [];
});

function updateSnapPosition() {
    if (!draggingPiece) return;
    const shape = draggingPiece.shape;
    const pieceW = shape.length * (cellSize + gap) - gap;
    const pieceH = shape.length * (cellSize + gap) - gap;
    const col = Math.round(((dragX - pieceW / 2) - (boardX + gap)) / (cellSize + gap));
    const row = Math.round(((dragY - pieceH / 2) - (boardY + gap)) / (cellSize + gap));

    if (canPlace(shape, row, col)) { snapRow = row; snapCol = col; }
    else { snapRow = -1; snapCol = -1; }
    updatePreviewClears();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvasW, canvasH);
    const actualBoardW = GRID_SIZE * cellSize + (GRID_SIZE + 1) * gap;
    roundRect(ctx, boardX - 4, boardY - 4, actualBoardW + 8, actualBoardW + 8, 14);
    ctx.fillStyle = "#12182b";
    ctx.fill();

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const x = boardX + gap + c * (cellSize + gap);
            const y = boardY + gap + r * (cellSize + gap);
            roundRect(ctx, x, y, cellSize, cellSize, 6);
            ctx.fillStyle = "#1e2746";
            ctx.fill();

            if (board[r][c] !== null) {
                const isClear = previewClearRows.includes(r) || previewClearCols.includes(c);
                drawBevelBlock(x, y, cellSize, isClear && draggingPiece ? draggingPiece.color : board[r][c], 1);
                if (isClear) {
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2;
                    roundRect(ctx, x, y, cellSize, cellSize, 6);
                    ctx.stroke();
                }
            }
        }
    }

    if (draggingPiece && snapRow !== -1 && snapCol !== -1) {
        const shape = draggingPiece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === "1") {
                    drawBevelBlock(
                        boardX + gap + (snapCol + c) * (cellSize + gap),
                        boardY + gap + (snapRow + r) * (cellSize + gap),
                        cellSize, draggingPiece.color, 0.35
                    );
                }
            }
        }
    }

    for (let i = 0; i < 3; i++) {
        const p = trayPieces[i];
        if (!p || i === dragIndex) continue;
        const miniSize = cellSize * p.scale;
        const miniGap = 2;
        const totalW = p.shape.length * (miniSize + miniGap) - miniGap;
        const totalH = p.shape.length * (miniSize + miniGap) - miniGap;
        const startX = p.homeX - totalW / 2;
        const startY = p.homeY - totalH / 2;

        for (let r = 0; r < p.shape.length; r++) {
            for (let c = 0; c < p.shape[r].length; c++) {
                if (p.shape[r][c] === "1") {
                    drawBevelBlock(startX + c * (miniSize + miniGap), startY + r * (miniSize + miniGap), miniSize, p.color, 1);
                }
            }
        }
    }

    if (draggingPiece) {
        const shape = draggingPiece.shape;
        const totalW = shape.length * (cellSize + gap) - gap;
        const totalH = shape.length * (cellSize + gap) - gap;
        const startX = dragX - totalW / 2;
        const startY = dragY - totalH / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === "1") {
                    drawBevelBlock(startX + c * (cellSize + gap), startY + r * (cellSize + gap), cellSize, draggingPiece.color, 0.95);
                }
            }
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.alpha -= 0.03;
        if (pt.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = pt.alpha; ctx.fillStyle = pt.color;
        roundRect(ctx, pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size, 3);
        ctx.fill(); ctx.restore();
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy; ft.alpha -= 0.02;
        if (ft.alpha <= 0) { floatingTexts.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = ft.alpha;
        ctx.font = "900 22px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = "#ffd166"; ctx.strokeStyle = "#12182b"; ctx.lineWidth = 4;
        ctx.strokeText(ft.text, ft.x, ft.y); ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

btnRestart.addEventListener("click", initGame);
btnSound.addEventListener("click", function() {
    soundEnabled = !soundEnabled;
    btnSound.textContent = soundEnabled ? "🔊" : "🔇";
});
window.addEventListener("resize", resizeCanvas);

initGame();
gameLoop();
