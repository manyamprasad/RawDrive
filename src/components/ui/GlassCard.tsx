import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: 'low' | 'medium' | 'high';
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, intensity = 'medium', ...props }, ref) => {
    const intensityClasses = {
      low: 'bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl',
      medium: 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl',
      high: 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] transition-all duration-300',
          'before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:before:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
          intensityClasses[intensity],
          className
        )}
        {...props}
      />
    );
  }
);
GlassCard.displayName = 'GlassCard';
