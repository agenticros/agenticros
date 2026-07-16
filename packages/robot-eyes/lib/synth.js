/**
 * Procedural R2D2-style synthesizer.
 *
 * Adapted from https://github.com/chrismatthieu/r2d2 (Apache License 2.0).
 * See ../NOTICE.
 */
const SAMPLE_RATE = 22050;
const AMPLITUDE = 0.35;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Soft attack/decay envelope to avoid clicks. */
function envelope(i, n, attack = 0.02, release = 0.08) {
  const a = Math.max(1, Math.floor(n * attack));
  const r = Math.max(1, Math.floor(n * release));
  if (i < a) return i / a;
  if (i > n - r) return (n - i) / r;
  return 1;
}

function encodeWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // audio format = PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

function concatSamples(parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function silence(seconds) {
  return new Float32Array(Math.max(0, Math.floor(seconds * SAMPLE_RATE)));
}

/** Constant-frequency sine with envelope. */
function tone(freq, seconds) {
  const n = Math.max(1, Math.floor(seconds * SAMPLE_RATE));
  const samples = new Float32Array(n);
  let phase = 0;
  const step = (2 * Math.PI * freq) / SAMPLE_RATE;
  for (let i = 0; i < n; i++) {
    samples[i] = Math.sin(phase) * AMPLITUDE * envelope(i, n);
    phase += step;
  }
  return samples;
}

/** Linear frequency sweep (chirp). */
function chirpSamples(f0, f1, seconds) {
  const n = Math.max(1, Math.floor(seconds * SAMPLE_RATE));
  const samples = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1 || 1);
    const freq = f0 + (f1 - f0) * t;
    samples[i] = Math.sin(phase) * AMPLITUDE * envelope(i, n, 0.03, 0.12);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
  }
  return samples;
}

function makeChirp() {
  const up = Math.random() < 0.55;
  const low = rand(700, 1200);
  const high = rand(1600, 2800);
  const seconds = rand(0.08, 0.25);
  return chirpSamples(up ? low : high, up ? high : low, seconds);
}

function makeWarble() {
  const center = rand(900, 1800);
  const count = randInt(3, 6);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const offset = (i % 2 === 0 ? 1 : -1) * rand(120, 450);
    const freq = Math.max(400, center + offset);
    parts.push(tone(freq, rand(0.04, 0.09)));
    if (i < count - 1) parts.push(silence(rand(0.008, 0.025)));
  }
  return concatSamples(parts);
}

function makeBeeps() {
  const count = randInt(2, 5);
  const base = rand(800, 2000);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const freq = base * rand(0.85, 1.25);
    parts.push(tone(freq, rand(0.035, 0.08)));
    if (i < count - 1) parts.push(silence(rand(0.02, 0.07)));
  }
  return concatSamples(parts);
}

/** Fast, high, dense — used on active cmd_vel (excited). */
function makeExcited() {
  const parts = [];
  const bursts = randInt(2, 4);
  for (let b = 0; b < bursts; b++) {
    const kind = randInt(0, 2);
    if (kind === 0) {
      parts.push(chirpSamples(rand(1400, 2200), rand(2600, 3800), rand(0.05, 0.12)));
    } else if (kind === 1) {
      const center = rand(1600, 2600);
      const count = randInt(4, 8);
      for (let i = 0; i < count; i++) {
        const offset = (i % 2 === 0 ? 1 : -1) * rand(200, 600);
        parts.push(tone(Math.max(800, center + offset), rand(0.025, 0.05)));
        if (i < count - 1) parts.push(silence(rand(0.004, 0.012)));
      }
    } else {
      const count = randInt(3, 6);
      const base = rand(1500, 2800);
      for (let i = 0; i < count; i++) {
        parts.push(tone(base * rand(0.9, 1.35), rand(0.02, 0.045)));
        if (i < count - 1) parts.push(silence(rand(0.01, 0.03)));
      }
    }
    if (b < bursts - 1) parts.push(silence(rand(0.02, 0.06)));
  }
  return concatSamples(parts);
}

const GESTURES = [
  { name: 'chirp', fn: makeChirp },
  { name: 'warble', fn: makeWarble },
  { name: 'beeps', fn: makeBeeps },
];

/**
 * Synthesize a random R2D2-style gesture.
 * @returns {{ name: string, wav: Buffer }}
 */
export function synthesizeRandom() {
  const gesture = pick(GESTURES);
  const samples = gesture.fn();
  return { name: gesture.name, wav: encodeWav(samples) };
}

/**
 * Synthesize an excited R2D2 burst (higher, faster, denser).
 * @returns {{ name: string, wav: Buffer }}
 */
export function synthesizeExcited() {
  return { name: 'excited', wav: encodeWav(makeExcited()) };
}

export { SAMPLE_RATE };
