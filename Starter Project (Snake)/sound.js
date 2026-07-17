// sound.js — simple Web Audio beeps, no external files needed
// exposes: playEatSound(), playGameOverSound()

var audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    var AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  // Browsers suspend audio until a user gesture — resume every time just in case
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep(freq, duration, type, startTime, volume) {
  var ctxA = getAudioCtx();
  var osc  = ctxA.createOscillator();
  var gain = ctxA.createGain();

  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, ctxA.currentTime + startTime);

  gain.gain.setValueAtTime(0, ctxA.currentTime + startTime);
  gain.gain.linearRampToValueAtTime(volume, ctxA.currentTime + startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctxA.currentTime + startTime + duration);

  osc.connect(gain);
  gain.connect(ctxA.destination);

  osc.start(ctxA.currentTime + startTime);
  osc.stop(ctxA.currentTime + startTime + duration);
}

// Short cheerful "pop" when the snake eats the food
function playEatSound() {
  try {
    beep(880, 0.09, 'triangle', 0,    0.25);
    beep(1320, 0.11, 'triangle', 0.06, 0.2);
  } catch (e) { /* audio not available — fail silently */ }
}

// Descending "womp" when the snake dies
function playGameOverSound() {
  try {
    beep(300, 0.18, 'sawtooth', 0,    0.2);
    beep(220, 0.18, 'sawtooth', 0.15, 0.2);
    beep(140, 0.30, 'sawtooth', 0.30, 0.2);
  } catch (e) { /* audio not available — fail silently */ }
}
