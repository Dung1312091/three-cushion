import { Pause, Play, Repeat, SkipBack, SkipForward, StepForward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/cn';
import { numVi } from '@/lib/format';
import { CUE_ANIM, playClock, usePractice } from '../store';

/** §13.6 — play/pause, scrubber, speed, previous/next event, loop. */
export function PlaybackBar() {
  const current = usePractice((s) => s.current);
  const playing = usePractice((s) => s.playback.playing);
  const speed = usePractice((s) => s.playback.speed);
  const loop = usePractice((s) => s.playback.loop);
  const { setPlaying, seek, setSpeed, setLoop, continueFromShot } = usePractice.getState();
  const [t, setT] = useState(playClock.t);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = () => {
      if (Math.abs(playClock.t - last) > 0.02) {
        last = playClock.t;
        setT(playClock.t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!current) return null;
  const end = current.result.tEnd;
  const times = current.result.events.filter((e) => e.type === 'ball-cushion' || e.type === 'ball-ball').map((e) => e.t);
  const jump = (dir: 1 | -1) => {
    const now = playClock.t;
    const next = dir > 0 ? times.find((x) => x > now + 0.01) : [...times].reverse().find((x) => x < now - 0.01);
    seek(next ?? (dir > 0 ? end : -CUE_ANIM));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <button type="button" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-fg hover:bg-surface-2" onClick={() => jump(-1)} aria-label="Sự kiện trước">
          <SkipBack size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-cloth text-white hover:bg-cloth-light"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Tạm dừng' : 'Phát'}
        >
          {playing ? <Pause size={22} aria-hidden="true" /> : <Play size={22} className="translate-x-[1px]" aria-hidden="true" />}
        </button>
        <button type="button" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-fg hover:bg-surface-2" onClick={() => jump(1)} aria-label="Sự kiện sau">
          <SkipForward size={20} aria-hidden="true" />
        </button>
        <label className="relative mx-1 flex flex-1 items-center">
          <span className="sr-only">Tua</span>
          <input
            type="range"
            min={-CUE_ANIM}
            max={end}
            step={0.01}
            value={Math.min(end, t)}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-11 w-full cursor-pointer accent-[var(--accent)]"
          />
        </label>
        <span className="num w-12 text-right text-base tabular-nums text-muted">{numVi(Math.max(0, Math.min(t, end)), 1)}s</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Segmented
          size="sm"
          label="Tốc độ phát"
          value={String(speed) as '0.25' | '0.5' | '1'}
          onChange={(v) => setSpeed(Number(v) as 0.25 | 0.5 | 1)}
          options={[
            { value: '0.25', label: '0,25×' },
            { value: '0.5', label: '0,5×' },
            { value: '1', label: '1×' },
          ]}
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLoop(!loop)}
            aria-pressed={loop}
            aria-label="Lặp lại"
            className={cn('inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium', loop ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2')}
          >
            <Repeat size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Lặp lại</span>
          </button>
          <button
            type="button"
            onClick={continueFromShot}
            title="Đặt bi theo thế sau cú đánh này và tìm cách đánh tiếp"
            className={cn(
              'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
              t >= end ? 'bg-cloth text-white hover:bg-cloth-light' : 'border border-line text-fg hover:bg-surface-2',
            )}
          >
            <StepForward size={16} aria-hidden="true" /> Đánh tiếp
          </button>
        </div>
      </div>
    </div>
  );
}
