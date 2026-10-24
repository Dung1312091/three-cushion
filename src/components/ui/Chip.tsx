import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Chip({ active, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-full border px-3.5 text-sm font-medium transition-colors',
        active ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface text-fg hover:border-muted',
        className,
      )}
      {...rest}
    />
  );
}

export function Pill({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'neutral' | 'warn' | 'ok' | 'info'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-2 text-muted',
    warn: 'bg-kiss/15 text-kiss',
    ok: 'bg-score/15 text-score',
    info: 'bg-cloth/12 text-accent',
  };
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}
