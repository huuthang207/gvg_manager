import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

type AppSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const AppSelect = React.forwardRef<HTMLSelectElement, AppSelectProps>(({ className, children, disabled, ...props }, ref) => {
  return (
    <div className={cn('relative min-w-0', className)}>
      <select
        ref={ref}
        disabled={disabled}
        className="min-w-0 w-full appearance-none rounded-lg border border-slate-700/80 bg-slate-950/60 py-2 pl-3 pr-9 text-xs font-medium text-slate-200 shadow-sm shadow-slate-950/15 transition-colors focus:border-sky-400/70 focus:bg-slate-950 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
    </div>
  );
});

AppSelect.displayName = 'AppSelect';
