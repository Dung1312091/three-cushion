import { useEffect } from 'react';
import { ambient } from '@/lib/ambient';
import { hasWebAudio, resumeAudio } from '@/lib/audio';
import { MUSIC_FEATURE, useSoundPrefs } from '@/lib/soundPrefs';

const activated = (): boolean =>
  (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? false;

/**
 * Starts the background music once the user has interacted with the page (autoplay policy),
 * pauses it while the tab is hidden, and follows the on/off preference.
 */
export function SoundManager() {
  const musicOn = useSoundPrefs((s) => s.musicOn);

  // Unlock Web Audio on the first gesture even with music off, so impact sounds and voice clips can play.
  useEffect(() => {
    if (!hasWebAudio()) return;
    const unlock = () => {
      resumeAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!hasWebAudio()) return;
    if (!MUSIC_FEATURE || !musicOn) {
      ambient.stop();
      return;
    }
    let gestured = activated();
    const tryStart = () => {
      if (gestured && document.visibilityState === 'visible') ambient.start();
    };
    const onGesture = () => {
      gestured = true;
      tryStart();
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? ambient.stop() : tryStart());
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    document.addEventListener('visibilitychange', onVisibility);
    tryStart();
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [musicOn]);

  return null;
}
