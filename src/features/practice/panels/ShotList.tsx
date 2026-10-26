import { ChevronLeft, ChevronRight, ChevronUp, Star } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Pill } from '@/components/ui/Chip';
import { Segmented } from '@/components/ui/Segmented';
import type { BallId } from '@/engine/types';
import type { SkillLevel } from '@/solver/types';
import { t } from '@/i18n/vi';
import { cn } from '@/lib/cn';
import { pct } from '@/lib/format';
import { usePractice, type SortKey } from '../store';
import { InstructionPanel } from './InstructionPanel';

const DOT: Record<BallId, string> = { white: 'bg-ball-white', yellow: 'bg-ball-yellow', red: 'bg-ball-red' };
const ENGLISH: Record<string, string> = { running: 'ép phê thuận', reverse: 'ép phê nghịch', none: 'không ép phê' };
const NAV_BTN = 'flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-3 text-sm font-semibold text-fg hover:bg-surface-2 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent';

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Độ khó ${n} trên 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} className={i < n ? 'fill-ball-yellow text-ball-yellow' : 'text-line'} aria-hidden="true" />
      ))}
    </span>
  );
}

export function ShotList() {
  const options = usePractice((s) => s.options);
  const solving = usePractice((s) => s.solving);
  const stats = usePractice((s) => s.solveStats);
  const selectedId = usePractice((s) => s.selectedId);
  const skill = usePractice((s) => s.skill);
  const sort = usePractice((s) => s.sort);
  const { setSkill, setSort, selectOption, closeOption, findShots } = usePractice.getState();
  const items = useRef(new Map<string, HTMLLIElement>());
  const prevSelected = useRef(selectedId);

  // Bring the opened option's header to the top; on collapse keep that item in view so its neighbours are right there.
  useEffect(() => {
    const prev = prevSelected.current;
    prevSelected.current = selectedId;
    const el = items.current.get(selectedId ?? prev ?? '');
    if (!el) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    el.scrollIntoView({ block: selectedId ? 'start' : 'nearest', behavior });
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        size="sm"
        label={t.practice.skill}
        value={skill}
        onChange={(v) => setSkill(v as SkillLevel)}
        options={(['beginner', 'intermediate', 'advanced', 'pro'] as const).map((k) => ({ value: k, label: t.skills[k] }))}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {solving ? `${t.practice.searching} ${options.length} phương án` : options.length ? `${options.length} phương án${stats ? `, ${(stats.elapsedMs / 1000).toFixed(1).replace('.', ',')} s` : ''}` : ''}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Xếp theo</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-10 rounded-lg border border-line bg-surface px-2 font-medium">
            {Object.entries(t.sort).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      {solving && options.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-bg px-4 py-6 text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          Đang thử hàng nghìn cú đánh trên bàn của bạn…
        </div>
      )}
      {!solving && options.length === 0 && (
        <div className="rounded-xl bg-bg px-4 py-6">
          <p className="text-muted">{stats ? t.practice.noOptions : 'Bấm “Tìm cách đánh” để app gợi ý các đường ghi điểm.'}</p>
          <button type="button" onClick={() => void findShots()} className="mt-3 min-h-11 cursor-pointer font-semibold text-accent">
            {t.practice.findShots}
          </button>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {options.map((o, i) => {
          const open = o.id === selectedId;
          return (
            <li
              key={o.id}
              ref={(el) => {
                if (el) items.current.set(o.id, el);
                else items.current.delete(o.id);
              }}
              className={cn('scroll-mt-2 rounded-2xl border', open ? 'border-accent bg-surface' : 'border-line')}
            >
              <button type="button" onClick={() => void selectOption(o.id)} aria-expanded={open} className="flex w-full cursor-pointer items-start gap-3 p-3 text-left">
                <span className={cn('mt-1.5 h-4 w-4 shrink-0 rounded-full ring-1 ring-black/25', DOT[o.firstObject])} aria-label={`Bi mục tiêu thứ nhất`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug">{o.family.labelVi}</span>
                  <span className="block text-sm text-muted">
                    {o.family.firstContact === 'ball' ? 'Bi trước' : 'Băng trước'}
                    {o.family.railCode && `, ${o.family.railCode.split('').join('-')}`}, {ENGLISH[o.family.english]}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Stars n={o.difficulty} />
                    {o.kissRisk >= 0.1 && <Pill tone="warn">Rủi ro đá bi {pct(o.kissRisk)}</Pill>}
                    <Pill>Thế để lại {Math.round(o.leaveScore * 10)}/10</Pill>
                  </span>
                  {o.system && <span className="num mt-1 block text-[0.9375rem] font-semibold text-accent">{o.system.text}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="num block text-3xl font-bold leading-none">{pct(o.pScore)}</span>
                  <span className="num block text-xs text-muted">
                    {pct(o.pScoreCI[0])}–{pct(o.pScoreCI[1])}
                  </span>
                </span>
              </button>
              {open && (
                <div className="border-t border-line px-3 pb-3">
                  <InstructionPanel option={o} />
                </div>
              )}
              {open && (
                // Sticks to the bottom of the scroll area while the long instruction is read, so switching never needs a scroll.
                <nav aria-label="Chuyển cách đánh" className="sticky bottom-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-b-2xl border-t border-line bg-surface/95 p-1.5 backdrop-blur">
                  <button type="button" disabled={i === 0} onClick={() => void selectOption(options[i - 1].id)} className={cn(NAV_BTN, 'justify-self-start')}>
                    <ChevronLeft size={18} aria-hidden="true" /> Cách trước
                  </button>
                  <button type="button" onClick={closeOption} className={NAV_BTN}>
                    <ChevronUp size={18} aria-hidden="true" /> Thu gọn
                    <span className="num font-normal text-muted">
                      {i + 1}/{options.length}
                    </span>
                  </button>
                  <button type="button" disabled={i === options.length - 1} onClick={() => void selectOption(options[i + 1].id)} className={cn(NAV_BTN, 'justify-self-end')}>
                    Cách sau <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </li>
          );
        })}
      </ul>
      {options.length > 0 && <p className="text-xs text-muted">{t.practice.simNote}</p>}
    </div>
  );
}
