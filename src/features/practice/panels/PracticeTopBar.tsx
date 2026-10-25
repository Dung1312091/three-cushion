import { ArrowLeft, Eye, Layers, Rotate3d, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { PRESET_ORDER, PRESETS, makeTable, type TablePreset } from '@/engine/table';
import { t } from '@/i18n/vi';
import { cn } from '@/lib/cn';
import { MUSIC_FEATURE, useSoundPrefs } from '@/lib/soundPrefs';
import { MusicToggle } from '@/components/MusicToggle';
import { usePractice, type CameraMode } from '../store';

const PRESET_LABEL: Record<string, string> = {
  UMB_MATCH: '2,84 m (thi đấu)',
  MID_2540: '2,54 m (bàn trung)',
  KR_DOMESTIC_MID: '2,45 m (Hàn nội địa)',
  HALF_MATCH: '2,30 m (half-match)',
  SMALL: '2,10 m (bàn nhỏ)',
};

function LayersMenu() {
  const [open, setOpen] = useState(false);
  const layers = usePractice((s) => s.layers);
  const toggle = usePractice((s) => s.toggleLayer);
  const { musicOn, sfxOn, setMusic, setSfx } = useSoundPrefs();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const items: Array<[keyof typeof layers, string]> = [
    ['trails', t.practice.layers.trails],
    ['cue', t.practice.layers.cue],
    ['systemOverlay', 'Số bộ 50 trên khung'],
  ];
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Lớp hiển thị" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-ink-2/85 text-white backdrop-blur hover:bg-ink-3">
        <Layers size={20} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-60 rounded-xl border border-line bg-surface p-2 shadow-xl">
          {items.map(([k, label]) => (
            <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-2">
              <input type="checkbox" checked={layers[k]} onChange={() => toggle(k)} className="h-5 w-5 accent-[var(--accent)]" />
              {label}
            </label>
          ))}
          <div className="my-1 border-t border-line" />
          {MUSIC_FEATURE && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-2">
              <input type="checkbox" checked={musicOn} onChange={(e) => setMusic(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
              Nhạc nền
            </label>
          )}
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-2">
            <input type="checkbox" checked={sfxOn} onChange={(e) => setSfx(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
            Tiếng cơ và bi va chạm
          </label>
        </div>
      )}
    </div>
  );
}

const CAMS: Array<{ v: CameraMode; icon: typeof Eye; label: string }> = [
  { v: 'top', icon: Square, label: t.practice.camTop },
  { v: 'shooter', icon: Eye, label: t.practice.camShooter },
  { v: 'free', icon: Rotate3d, label: t.practice.camFree },
];

export function PracticeTopBar() {
  const table = usePractice((s) => s.table);
  const saved = usePractice((s) => s.savedTables);
  const cue = usePractice((s) => s.cue);
  const camera = usePractice((s) => s.camera);
  const { setTable, setCue, setCamera } = usePractice.getState();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2 p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <Link to="/" aria-label="Về trang chủ" className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-2/85 text-white backdrop-blur hover:bg-ink-3">
        <ArrowLeft size={20} aria-hidden="true" />
      </Link>
      <label className="pointer-events-auto min-w-0 shrink">
        <span className="sr-only">{t.practice.table}</span>
        <select
          value={table.id}
          onChange={(e) => {
            const v = e.target.value;
            const custom = saved.find((x) => x.id === v);
            setTable(custom ?? makeTable(v.replace('preset:', '') as Exclude<TablePreset, 'CUSTOM'>));
          }}
          className="h-11 max-w-[44vw] truncate rounded-full border-0 bg-ink-2/85 pl-3.5 pr-8 text-sm font-semibold text-white backdrop-blur"
        >
          {PRESET_ORDER.map((p) => (
            <option key={p} value={`preset:${p}`}>
              {PRESET_LABEL[p]}
              {PRESETS[p].unverified ? ' *' : ''}
            </option>
          ))}
          {saved.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="pointer-events-auto flex shrink-0 rounded-full bg-ink-2/85 p-1 backdrop-blur" role="radiogroup" aria-label={t.practice.cue}>
        {(['white', 'yellow'] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={cue === c}
            aria-label={c === 'white' ? 'Bi cái trắng' : 'Bi cái vàng'}
            onClick={() => setCue(c)}
            className={cn('flex h-9 w-9 cursor-pointer items-center justify-center rounded-full', cue === c && 'bg-white/20')}
          >
            <span className={cn('h-4 w-4 rounded-full ring-2', c === 'white' ? 'bg-ball-white' : 'bg-ball-yellow', cue === c ? 'ring-white' : 'ring-transparent')} />
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <div className="pointer-events-auto flex shrink-0 rounded-full bg-ink-2/85 p-1 backdrop-blur" role="radiogroup" aria-label="Góc nhìn">
        {CAMS.map((c) => (
          <button
            key={c.v}
            type="button"
            role="radio"
            aria-checked={camera === c.v}
            aria-label={c.label}
            title={c.label}
            onClick={() => setCamera(c.v)}
            className={cn('flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/75', camera === c.v && 'bg-white/20 text-white')}
          >
            <c.icon size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="pointer-events-auto flex gap-2">
        <MusicToggle tone="dark" className="hidden sm:flex" />
        <LayersMenu />
      </div>
    </div>
  );
}
