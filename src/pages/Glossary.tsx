import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { glossary } from '@/content/loader';
import { Pill } from '@/components/ui/Chip';
import { viFold } from '@/lib/viFold';

export function GlossaryPage() {
  const [q, setQ] = useState('');
  const { hash } = useLocation();
  const sorted = useMemo(() => [...glossary.entries].sort((a, b) => viFold(a.term).localeCompare(viFold(b.term), 'vi')), []);
  const fq = viFold(q.trim());
  const shown = fq
    ? sorted.filter((e) => [e.term, e.en, ...e.aliases, e.definition].some((s) => viFold(s).includes(fq)))
    : sorted;

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ block: 'start' });
    el?.focus({ preventScroll: true });
  }, [hash]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-5">
      <h1 className="text-2xl font-bold">Thuật ngữ</h1>
      <p className="mt-2 max-w-[60ch] text-muted">Tên gọi trong giới bida Việt Nam, kèm tên tiếng Anh. Mục ghi “chưa kiểm chứng” đang chờ HLV xác nhận.</p>
      <label className="relative mt-4 block">
        <span className="sr-only">Lọc thuật ngữ</span>
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Lọc: ep phe, cule, kiss…"
          className="h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-base outline-none focus:border-accent"
        />
      </label>
      <dl className="mt-4 divide-y divide-line">
        {shown.map((e) => (
          <div key={e.id} id={e.id} tabIndex={-1} className="scroll-mt-20 py-4 outline-none target:bg-surface-2">
            <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-lg font-bold">{e.term}</span>
              <span className="text-muted">{e.en}</span>
              {e.confidence === 'unverified' && <Pill tone="warn">Chưa kiểm chứng</Pill>}
            </dt>
            {e.aliases.length > 0 && <dd className="mt-0.5 text-sm text-muted">Còn gọi: {e.aliases.join(', ')}</dd>}
            <dd className="mt-1.5 max-w-[65ch] leading-relaxed">{e.definition}</dd>
            {e.origin && <dd className="mt-1 text-sm text-muted">Gốc: {e.origin}</dd>}
          </div>
        ))}
      </dl>
      {shown.length === 0 && <p className="py-10 text-muted">Không có thuật ngữ nào khớp “{q}”.</p>}
    </div>
  );
}
