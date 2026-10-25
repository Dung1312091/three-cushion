import { Music2, VolumeOff } from 'lucide-react';
import { MUSIC_FEATURE, useSoundPrefs } from '@/lib/soundPrefs';
import { cn } from '@/lib/cn';

/** Background music on/off. `tone="dark"` for the practice room's floating controls. */
export function MusicToggle({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  const on = useSoundPrefs((s) => s.musicOn);
  const setMusic = useSoundPrefs((s) => s.setMusic);
  if (!MUSIC_FEATURE) return null;
  return (
    <button
      type="button"
      onClick={() => setMusic(!on)}
      aria-pressed={on}
      aria-label={on ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
      title={on ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
      className={cn(
        'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors',
        tone === 'dark' ? 'bg-ink-2/85 text-white backdrop-blur hover:bg-ink-3' : 'text-muted hover:bg-surface-2 hover:text-fg',
        className,
      )}
    >
      {on ? <Music2 size={20} aria-hidden="true" /> : <VolumeOff size={20} aria-hidden="true" />}
    </button>
  );
}
