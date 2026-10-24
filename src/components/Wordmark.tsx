import { cn } from '@/lib/cn';

/** "Ba Băng" set in condensed caps-free type, with the three balls as a carom line. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 30 10" className="h-3 w-9" aria-hidden="true">
        <circle cx="5" cy="5" r="3.6" fill="var(--color-ball-white)" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.6" />
        <circle cx="15" cy="5" r="3.6" fill="var(--color-ball-yellow)" />
        <circle cx="25" cy="5" r="3.6" fill="var(--color-ball-red)" />
      </svg>
      <span className="num text-[1.375rem] font-bold leading-none tracking-tight">Ba Băng</span>
    </span>
  );
}
