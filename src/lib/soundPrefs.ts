import { create } from 'zustand';

/** Background music is temporarily disabled: no playback and no music toggles. Flip to re-enable. */
export const MUSIC_FEATURE = false;

/** Per-device sound preferences, both on by default. */
interface SoundPrefs {
  musicOn: boolean;
  sfxOn: boolean;
  setMusic: (on: boolean) => void;
  setSfx: (on: boolean) => void;
}

function read(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function write(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    /* private mode */
  }
}

export const useSoundPrefs = create<SoundPrefs>()((set) => ({
  musicOn: read('music-on', true),
  sfxOn: read('sfx-on', true),
  setMusic: (on) => {
    write('music-on', on);
    set({ musicOn: on });
  },
  setSfx: (on) => {
    write('sfx-on', on);
    set({ sfxOn: on });
  },
}));
