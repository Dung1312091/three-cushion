import { cn } from '@/lib/cn';

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  label: string;
  className?: string;
  size?: 'md' | 'sm';
}

export function Segmented<T extends string>({ value, onChange, options, label, className, size = 'md' }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-xl bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 font-medium transition-colors',
              size === 'md' ? 'min-h-10 text-[0.9375rem]' : 'min-h-9 text-sm',
              active ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
