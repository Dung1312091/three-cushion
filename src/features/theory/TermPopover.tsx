import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { findTerm } from '@/content/loader';

/** Inline glossary term with a tap-to-open definition (§11.2 <Term />). */
export function Term({ id, children }: { id: string; children?: React.ReactNode }) {
  const entry = findTerm(id);
  const [open, setOpen] = useState(false);
  const pid = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);
  if (!entry) return <>{children ?? id}</>;
  return (
    <span ref={ref} className="relative inline">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={pid}
        onClick={() => setOpen((o) => !o)}
        className="cursor-help font-medium underline decoration-accent decoration-dotted decoration-2 underline-offset-4"
      >
        {children ?? entry.term}
      </button>
      {open && (
        <span
          id={pid}
          role="dialog"
          aria-label={entry.term}
          className="absolute left-0 top-full z-20 mt-2 block w-72 max-w-[80vw] rounded-xl border border-line bg-surface p-3 text-left text-sm leading-relaxed shadow-lg"
        >
          <span className="block font-semibold">
            {entry.term} <span className="font-normal text-muted">({entry.en})</span>
          </span>
          <span className="mt-1 block text-fg">{entry.definition}</span>
          <Link to={`/thuat-ngu#${entry.id}`} className="mt-2 inline-block font-semibold text-accent">
            Xem trong thuật ngữ
          </Link>
        </span>
      )}
    </span>
  );
}
