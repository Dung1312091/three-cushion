import { ChevronDown, ChevronUp, RotateCcw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { t } from '@/i18n/vi';
import { cn } from '@/lib/cn';
import { usePractice, type SheetSnap, type Tab } from '../store';
import { ManualStrikePanel } from './ManualStrikePanel';
import { PlacementPanel } from './PlacementPanel';
import { PlaybackBar } from './PlaybackBar';
import { ShotList } from './ShotList';

const COLLAPSED = 156;

function snapHeights(): Record<SheetSnap, number> {
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;
  return { collapsed: COLLAPSED, half: Math.round(h * 0.52), full: Math.round(h * 0.9) };
}

function Tabs({ onSelect }: { onSelect?: () => void }) {
  const tab = usePractice((s) => s.tab);
  const setTab = usePractice((s) => s.setTab);
  return (
    <Segmented
      label="Chế độ"
      value={tab}
      onChange={(v) => {
        setTab(v as Tab);
        onSelect?.();
      }}
      className="w-full"
      options={[
        { value: 'place', label: t.practice.place },
        { value: 'suggest', label: t.practice.suggest },
        { value: 'manual', label: t.practice.manual },
      ]}
    />
  );
}

function Body() {
  const tab = usePractice((s) => s.tab);
  if (tab === 'suggest') return <ShotList />;
  if (tab === 'manual') return <ManualStrikePanel />;
  return <PlacementPanel />;
}

/** Desktop / landscape: a right-hand panel. */
export function SidePanel() {
  const hasShot = usePractice((s) => !!s.current);
  const setInsets = usePractice((s) => s.setInsets);
  useEffect(() => setInsets({ right: 400, bottom: 0, top: 64 }), [setInsets]);
  return (
    <aside className="absolute bottom-0 right-0 top-0 z-20 flex w-[400px] flex-col border-l border-line bg-surface pt-16">
      <div className="flex flex-col gap-3 border-b border-line px-4 pb-3">
        <Tabs />
        {hasShot && <PlaybackBar />}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Body />
      </div>
    </aside>
  );
}

/** Portrait mobile: three-stop bottom sheet — collapsed (tabs + playback), half, full (§13.7). */
export function BottomSheet() {
  const snap = usePractice((s) => s.sheet);
  const setSheet = usePractice((s) => s.setSheet);
  const setInsets = usePractice((s) => s.setInsets);
  const hasShot = usePractice((s) => !!s.current);
  const tab = usePractice((s) => s.tab);
  const [heights, setHeights] = useState(snapHeights);
  const [dragH, setDragH] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number; moved: boolean } | null>(null);

  useEffect(() => {
    const onResize = () => setHeights(snapHeights());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const collapsedH = hasShot ? COLLAPSED + 96 : COLLAPSED;
  const h = dragH ?? (snap === 'collapsed' ? collapsedH : heights[snap]);

  useEffect(() => {
    // The table is framed above the sheet; at "full" keep the half-height framing so the table does not shrink to nothing.
    setInsets({ top: 60, right: 0, bottom: snap === 'full' ? heights.half : snap === 'collapsed' ? collapsedH : heights.half });
  }, [snap, heights, collapsedH, setInsets]);

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, h, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = start.current.y - e.clientY;
    if (Math.abs(dy) > 4) start.current.moved = true;
    setDragH(Math.min(heights.full, Math.max(collapsedH, start.current.h + dy)));
  };
  const onUp = () => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (!s.moved) {
      setDragH(null);
      setSheet(snap === 'collapsed' ? 'half' : 'collapsed');
      return;
    }
    const cur = dragH ?? s.h;
    const cands: Array<[SheetSnap, number]> = [
      ['collapsed', collapsedH],
      ['half', heights.half],
      ['full', heights.full],
    ];
    cands.sort((a, b) => Math.abs(a[1] - cur) - Math.abs(b[1] - cur));
    setDragH(null);
    setSheet(cands[0][0]);
  };

  return (
    <section
      className={cn('safe-bottom absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl border-t border-line bg-surface shadow-[0_-12px_32px_rgba(0,0,0,0.35)]', dragH === null && 'transition-[height] duration-300 ease-out')}
      style={{ height: h }}
      aria-label="Bảng điều khiển phòng tập"
    >
      <div
        className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-hidden="true"
      >
        <span className="h-1.5 w-11 rounded-full bg-line" />
      </div>
      <div className="flex shrink-0 flex-col gap-2 px-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Tabs onSelect={() => snap === 'collapsed' && setSheet('half')} />
          </div>
          <button
            type="button"
            onClick={() => setSheet(snap === 'collapsed' ? 'half' : snap === 'half' ? 'full' : 'collapsed')}
            aria-label={snap === 'full' ? 'Thu gọn bảng điều khiển' : 'Mở rộng bảng điều khiển'}
            aria-expanded={snap !== 'collapsed'}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-cloth text-white shadow-md transition-colors hover:bg-cloth-light active:scale-95"
          >
            {snap === 'full' ? <ChevronDown size={22} aria-hidden="true" /> : <ChevronUp size={22} aria-hidden="true" />}
          </button>
        </div>
        {hasShot && <PlaybackBar />}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
        {snap === 'collapsed' && tab === 'place' && !hasShot ? <CollapsedPlace /> : <Body />}
      </div>
    </section>
  );
}

/** Collapsed "Đặt bi": the two everyday actions without opening the sheet — reset first, then search. */
function CollapsedPlace() {
  const solving = usePractice((s) => s.solving);
  const findShots = usePractice((s) => s.findShots);
  const breakLayout = usePractice((s) => s.breakLayout);
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={breakLayout}
        className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-base font-semibold text-fg hover:bg-line/60"
      >
        <RotateCcw size={18} aria-hidden="true" /> {t.practice.reset}
      </button>
      <button
        type="button"
        disabled={solving}
        onClick={() => void findShots()}
        className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-cloth text-base font-semibold text-white hover:bg-cloth-light disabled:opacity-60"
      >
        <Search size={18} aria-hidden="true" /> {solving ? t.practice.searching : t.practice.findShots}
      </button>
    </div>
  );
}
