'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  clearLabel?: string;
}

/** Standard search input: leading icon, optional clear button, same look everywhere. */
const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, value, onClear, clearLabel = 'Clear', ...props }, ref) => {
    const hasValue = typeof value === 'string' ? value.length > 0 : Boolean(value);
    return (
      <div className={cn('relative', className)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={ref}
          type="search"
          value={value}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 text-sm shadow-soft transition-colors',
            hasValue && onClear ? 'pr-9' : 'pr-3',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
          {...props}
        />
        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  },
);
SearchField.displayName = 'SearchField';

export { SearchField };
