/** Thin wrapper over the Web Speech API for reading shot instructions aloud in Vietnamese. */

export const ttsSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** Speech is refused ('not-allowed') until the page has had a user gesture. */
export const canAutoSpeak = (): boolean =>
  typeof navigator !== 'undefined' && (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive !== false;

/** Voices load asynchronously in Chrome; resolve once they are known (or after 1.5 s). Never caches an empty list. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

export function vietnameseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const vi = voices.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('vi'));
  // Prefer local (offline) voices, then any Vietnamese voice.
  return vi.find((v) => v.localService) ?? vi[0];
}

export interface SpeakOptions {
  rate?: number;
  onStep?: (index: number) => void;
  onDone?: () => void;
  /** Speech engine refused or never started ('not-allowed', 'synthesis-failed', 'no-start', …). */
  onError?: (code: string) => void;
  /** How many voice strategies to try when the engine is stuck (default 1 — callers fall back to clips). */
  attempts?: number;
}

/**
 * How to configure an utterance, tried in order when the engine gets stuck
 * (Chrome on macOS can report speaking=true forever without producing sound).
 */
type Strategy = 'vi-voice' | 'vi-lang' | 'default';
const STRATEGIES: Strategy[] = ['vi-voice', 'vi-lang', 'default'];
/** Remember the strategy that worked so later readings start with it. */
let preferred = 0;

let session = 0;
/** Keep a reference to the utterance in flight: Chrome can garbage-collect it and drop the speech. */
let current: SpeechSynthesisUtterance | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

const START_TIMEOUT_MS = 1500;
const SETTLE_MS = 120;

function clearWatchdog(): void {
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
}

/**
 * Read the steps one utterance at a time (the next is queued only when the previous
 * ends) so the UI can highlight the current step and Chrome's queue cannot stall.
 */
export function speakSteps(lines: string[], opts: SpeakOptions = {}): void {
  if (!ttsSupported() || lines.length === 0) return;
  const synth = window.speechSynthesis;
  const id = ++session;
  clearWatchdog();
  // Always flush whatever is (or claims to be) queued, then let the engine settle.
  synth.cancel();

  const sayLine = (index: number, attempt: number) => {
    if (id !== session) return;
    if (index >= lines.length) {
      current = null;
      opts.onDone?.();
      return;
    }
    const strategy = STRATEGIES[(preferred + attempt) % STRATEGIES.length];
    const u = new SpeechSynthesisUtterance(lines[index]);
    const voice = vietnameseVoice(synth.getVoices());
    if (strategy === 'vi-voice' && voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else if (strategy === 'vi-lang' || (strategy === 'vi-voice' && !voice)) {
      u.lang = 'vi-VN';
    }
    u.rate = opts.rate ?? 1;
    let started = false;
    u.onstart = () => {
      started = true;
      clearWatchdog();
      if (id !== session) return;
      if (attempt > 0) {
        preferred = (preferred + attempt) % STRATEGIES.length;
        console.info('[tts] using strategy', strategy);
      }
      opts.onStep?.(index);
    };
    u.onend = () => {
      if (id !== session || !started) return;
      sayLine(index + 1, 0);
    };
    u.onerror = (e) => {
      clearWatchdog();
      if (id !== session || e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('[tts]', e.error, strategy, lines[index]);
      session++;
      opts.onError?.(e.error);
    };
    current = u;
    if (synth.paused) synth.resume();
    synth.speak(u);
    clearWatchdog();
    watchdog = setTimeout(() => {
      if (id !== session || started) return;
      console.warn('[tts] stuck', { strategy, speaking: synth.speaking, pending: synth.pending, paused: synth.paused });
      synth.cancel();
      synth.resume();
      if (attempt + 1 < Math.min(STRATEGIES.length, opts.attempts ?? 1)) {
        setTimeout(() => sayLine(index, attempt + 1), SETTLE_MS);
      } else {
        session++;
        current = null;
        opts.onError?.('no-start');
      }
    }, START_TIMEOUT_MS);
  };

  const begin = () => setTimeout(() => sayLine(0, 0), SETTLE_MS);
  if (synth.getVoices().length) begin();
  else void loadVoices().then(() => id === session && begin());
}

export function stopSpeaking(): void {
  session++;
  clearWatchdog();
  current = null;
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** For debugging in DevTools: the utterance currently held. */
export const currentUtterance = (): SpeechSynthesisUtterance | null => current;
