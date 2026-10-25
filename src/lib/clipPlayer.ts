/**
 * Plays instruction steps from pre-recorded clips with Web Audio: clips are trimmed of
 * leading/trailing silence and scheduled back to back, so it works offline and does not
 * depend on the browser's speech engine (which can hang on Chrome/macOS).
 */

import { resumeAudio } from './audio';

const cache = new Map<string, Promise<AudioBuffer>>();
let session = 0;
let sources: AudioBufferSourceNode[] = [];
let timers: Array<ReturnType<typeof setTimeout>> = [];

const GAP_IN_STEP = 0.03;
const GAP_BETWEEN_STEPS = 0.45;

/** Create/resume the audio context. Call synchronously inside the click handler. */
export function primeAudio(): AudioContext {
  return resumeAudio();
}

function trimSilence(c: AudioContext, buf: AudioBuffer, threshold = 0.008): AudioBuffer {
  const data = buf.getChannelData(0);
  let start = 0;
  let end = data.length - 1;
  while (start < end && Math.abs(data[start]) < threshold) start++;
  while (end > start && Math.abs(data[end]) < threshold) end--;
  const pad = Math.floor(0.02 * buf.sampleRate);
  start = Math.max(0, start - pad);
  end = Math.min(data.length - 1, end + pad);
  const len = Math.max(1, end - start + 1);
  const out = c.createBuffer(buf.numberOfChannels, len, buf.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) out.copyToChannel(buf.getChannelData(ch).subarray(start, start + len), ch);
  return out;
}

function load(c: AudioContext, key: string): Promise<AudioBuffer> {
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/voice/${key}.m4a`)
      .then((r) => {
        if (!r.ok) throw new Error(`missing clip ${key}`);
        return r.arrayBuffer();
      })
      .then((b) => c.decodeAudioData(b))
      .then((b) => trimSilence(c, b));
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export interface ClipOptions {
  onStep?: (index: number) => void;
  onDone?: () => void;
  onError?: (code: string) => void;
}

/** Each step is a list of clip keys (see voiceClips.ts). */
export async function playClipSteps(steps: string[][], opts: ClipOptions = {}): Promise<void> {
  stopClips();
  const id = ++session;
  const c = primeAudio();
  let bufs: AudioBuffer[][];
  try {
    bufs = await Promise.all(steps.map((s) => Promise.all(s.map((k) => load(c, k)))));
  } catch (e) {
    console.warn('[voice]', e);
    if (id === session) opts.onError?.('clips-missing');
    return;
  }
  if (id !== session) return;
  if (c.state !== 'running') await c.resume().catch(() => undefined);
  const t0 = c.currentTime;
  let t = t0 + 0.05;
  bufs.forEach((stepBufs, i) => {
    const at = t;
    timers.push(setTimeout(() => id === session && opts.onStep?.(i), (at - t0) * 1000));
    for (const b of stepBufs) {
      const src = c.createBufferSource();
      src.buffer = b;
      src.connect(c.destination);
      src.start(t);
      sources.push(src);
      t += b.duration + GAP_IN_STEP;
    }
    t += GAP_BETWEEN_STEPS;
  });
  timers.push(setTimeout(() => id === session && opts.onDone?.(), (t - t0) * 1000));
}

export function stopClips(): void {
  session++;
  for (const s of sources) {
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  }
  sources = [];
  for (const t of timers) clearTimeout(t);
  timers = [];
}

export type VoiceEngine = 'speech' | 'clips';
const KEY = 'tts-engine';

/** Per-device memory of which engine works (the browser's speech engine or the clips). */
export function preferredEngine(): VoiceEngine {
  try {
    return localStorage.getItem(KEY) === 'clips' ? 'clips' : 'speech';
  } catch {
    return 'speech';
  }
}

export function rememberEngine(e: VoiceEngine): void {
  try {
    localStorage.setItem(KEY, e);
  } catch {
    /* private mode */
  }
}
