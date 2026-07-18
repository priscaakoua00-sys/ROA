import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-baseline gap-0.5 text-xl font-semibold tracking-tight"
          >
            Roavaa<span className="text-gold">.</span>
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
          {children}
        </div>
      </div>
    </main>
  );
}

export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </div>
  );
}
