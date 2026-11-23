// Tiny synthesized sound effects (no audio files needed).
let ctx = null;
let enabled = true;
let noiseBuffer = null;

export function setSound(on) { enabled = on; }

export function unlockAudio() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } catch { ctx = null; }
}

function tone(freq, dur, { type = "sine", vol = 0.12, delay = 0, slide = 0 } = {}) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.08, freq = 1800, delay = 0 } = {}) {
  if (!ctx || !enabled || !noiseBuffer) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
  src.stop(t + dur);
}

export const sfx = {
  tap: () => tone(520, 0.06, { type: "triangle", vol: 0.06 }),
  sizzle: () => noise(0.35, { vol: 0.06, freq: 3200 }),
  flip: () => tone(380, 0.18, { type: "triangle", slide: 500 }),
  perfect: () => { tone(880, 0.1, { type: "triangle" }); tone(1320, 0.16, { type: "triangle", delay: 0.07 }); },
  ready: () => tone(1046, 0.14, { type: "sine", vol: 0.1 }),
  coin: () => { tone(988, 0.07, { type: "square", vol: 0.05 }); tone(1318, 0.16, { type: "square", vol: 0.05, delay: 0.06 }); },
  bad: () => tone(220, 0.3, { type: "sawtooth", vol: 0.06, slide: -90 }),
  warn: () => { tone(660, 0.12, { type: "square", vol: 0.05 }); tone(660, 0.12, { type: "square", vol: 0.05, delay: 0.2 }); },
  arrive: () => tone(600, 0.2, { type: "sine", vol: 0.06, slide: 300 }),
  whoosh: () => noise(0.4, { vol: 0.07, freq: 700 }),
  star: (i = 0) => tone(660 + i * 220, 0.25, { type: "triangle", vol: 0.12 }),
  fanfare: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, { type: "triangle", delay: i * 0.1 }))
};
