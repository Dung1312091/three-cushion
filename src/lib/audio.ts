/** One shared Web Audio context for music, sound effects and recorded voice clips. */

let ctx: AudioContext | null = null;

export const hasWebAudio = (): boolean => typeof window !== 'undefined' && 'AudioContext' in window;

export function getAudioContext(): AudioContext {
  ctx ??= new AudioContext({ latencyHint: 'interactive' });
  return ctx;
}

/** Create/resume the context. Call inside a user gesture the first time (autoplay policy). */
export function resumeAudio(): AudioContext {
  const c = getAudioContext();
  if (c.state === 'suspended') void c.resume();
  return c;
}
