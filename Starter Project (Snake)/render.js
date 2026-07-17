// render.js — canvas setup and all drawing code
// Reads globals defined in game.js: CELL, COLS, ROWS, snake, food, score, best, phase

var canvas = document.getElementById('canvas');
var ctx    = canvas.getContext('2d');

var COLORS = {
  bg:        '#000000',
  grid:      '#16213e',
  border:    '#ffd166',
  snakeRed:  '#7ee639',
  snakeWhite:'#f5f5f5',
  snakeEdge: '#7a0e17',
  food:      '#ff5e57',
  foodDark:  '#c0392b',
  foodShine: '#ffd7a8',
  leaf:      '#2ecc71',
  text:      '#ffffff',
  dimText:   'rgba(255,255,255,0.5)',
  overlay:   'rgba(0,0,0,0.55)',
};

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// ── Color helpers (for smooth head→tail gradients) ─────────────────────────
function hexToRgb(hex) {
  var v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
function clamp255(v) { return Math.max(0, Math.min(255, v)); }
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(function(v) {
    return clamp255(Math.round(v)).toString(16).padStart(2, '0');
  }).join('');
}
function lerpColor(c1, c2, t) {
  var a = hexToRgb(c1), b = hexToRgb(c2);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}
function shade(hex, amt) {
  var c = hexToRgb(hex);
  return rgbToHex(c.r + amt, c.g + amt, c.b + amt);
}

function cell(x, y, color) {
  var pad = 1;
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL + pad, y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
}

// ── Food: a glossy, gently pulsing "apple" ──────────────────────────────────
function drawFood() {
  var cx = food.x * CELL + CELL / 2;
  var cy = food.y * CELL + CELL / 2;
  var t  = Date.now() / 300;
  var pulse = 1 + Math.sin(t) * 0.06;
  var r = (CELL / 2 - 2) * pulse;

  var glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.2);
  glow.addColorStop(0, 'rgba(255,94,87,0.35)');
  glow.addColorStop(1, 'rgba(255,94,87,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
  ctx.fill();

  var body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.15, cx, cy, r);
  body.addColorStop(0, COLORS.foodShine);
  body.addColorStop(0.35, COLORS.food);
  body.addColorStop(1, COLORS.foodDark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.35, cy - r * 0.35, Math.max(1, r * 0.18), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.9);
  ctx.lineTo(cx + r * 0.15, cy - r * 1.35);
  ctx.stroke();

  ctx.fillStyle = COLORS.leaf;
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.55, cy - r * 1.25, r * 0.32, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

// ── Snake: real snake shape — thick head tapering to a thin tail ───────────
// Colors still alternate red / white per segment (checkerboard look)
function drawSnake() {
  var n = snake.length;

  for (var i = n - 1; i >= 0; i--) {
    var s = snake[i];
    var isHead = i === 0;

    // t goes 0 (head) → 1 (tail tip); scale shrinks the box as we go back
    var t = n > 1 ? i / (n - 1) : 0;
    var scale = Math.max(0.28, 1 - t * 0.75);

    var full = CELL - 2;
    var size = full * scale;
    var cx = s.x * CELL + CELL / 2;
    var cy = s.y * CELL + CELL / 2;
    var x = cx - size / 2;
    var y = cy - size / 2;
    var r = size * 0.32;

    // Every other box is red, every other is white
    var base = (i % 2 === 0) ? COLORS.snakeRed : COLORS.snakeWhite;

    roundedRect(x, y, size, size, r);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.strokeStyle = isHead ? '#4a0a10' : COLORS.snakeEdge;
    ctx.lineWidth = Math.max(0.5, size * 0.06);
    ctx.stroke();

    if (isHead) {
      var ex = dir.x, ey = dir.y;
      var eyeOffset = size * 0.22;
      var perpX = -ey, perpY = ex;
      var forwardX = ex * size * 0.15, forwardY = ey * size * 0.15;

      [-1, 1].forEach(function(side) {
        var eyeX = cx + forwardX + perpX * eyeOffset * side;
        var eyeY = cy + forwardY + perpY * eyeOffset * side;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, Math.max(1.2, size * 0.15), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#123';
        ctx.beginPath();
        ctx.arc(eyeX + ex * size * 0.05, eyeY + ey * size * 0.05, Math.max(0.7, size * 0.08), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

function draw() {
  var W = canvas.width, H = canvas.height;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  for (var x = 0; x <= COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
  }
  for (var y = 0; y <= ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
  }

  drawFood();
  drawSnake();

  // Border around the whole play field (the area the snake can travel in)
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = Math.max(3, CELL * 0.12);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);

  var fontSize = Math.max(12, CELL * 0.8);
  ctx.font = 'bold ' + fontSize + 'px monospace';
  ctx.fillStyle = COLORS.dimText;
  ctx.textAlign = 'right';
  ctx.fillText(score, W - CELL * 0.5, CELL * 1.2);
  if (best) {
    ctx.font = Math.max(10, CELL * 0.6) + 'px monospace';
    ctx.fillText('best ' + best, W - CELL * 0.5, CELL * 2.0);
  }
  ctx.textAlign = 'left';

  if (phase === 'idle') {
    drawOverlay('SNAKE', 'swipe or press  ← ↑ → ↓  to start');
  } else if (phase === 'dead') {
    drawOverlay('GAME OVER', 'score ' + score + '   tap or press arrow to play again');
  }
}

function drawOverlay(title, sub) {
  var W = canvas.width, H = canvas.height;
  var titleSize = Math.max(20, CELL * 1.6);
  var subSize   = Math.max(11, CELL * 0.65);

  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.font = 'bold ' + titleSize + 'px monospace';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(title, W / 2, H / 2 - titleSize * 0.6);

  ctx.font = subSize + 'px monospace';
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText(sub, W / 2, H / 2 + subSize * 1.4);
  ctx.textAlign = 'left';
}