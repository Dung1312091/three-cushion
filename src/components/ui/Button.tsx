import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm' | 'icon';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-cloth text-white hover:bg-cloth-deep active:bg-cloth-deep disabled:bg-cloth/50',
  secondary: 'bg-surface-2 text-fg hover:bg-line/60 border border-line',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-ball-red text-white hover:brightness-95',
};

const SIZE: Record<Size, string> = {
  md: 'min-h-11 px-4 text-[0.9375rem]',
  sm: 'min-h-11 px-3 text-sm',
  icon: 'h-11 w-11 justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex cursor-pointer select-none items-center gap-2 rounded-xl font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  );
});
