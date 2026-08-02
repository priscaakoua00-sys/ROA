import { Phone, MessageCircle, Mail, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { whatsappHref } from '@/lib/whatsapp';

export interface QuickActionLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /** External/anchor targets (e.g. a same-page `#diagnosis` jump) shouldn't go through next-intl's locale-prefixing Link. */
  plain?: boolean;
}

/**
 * The row of "do something right now" buttons — call, WhatsApp, email, plus
 * whatever page-specific actions matter (new appointment, new quote, new
 * work order, add a photo) — kept identical across customer, vehicle, lead
 * and work-order detail pages so a mechanic's thumb learns one place to look.
 * `size-11` (44px) targets meet the minimum comfortable tap size; text stays
 * visible next to the icon since these are the page's primary actions, not
 * decoration.
 */
export function QuickActions({
  phone,
  email,
  links = [],
}: {
  phone?: string | null;
  email?: string | null;
  links?: QuickActionLink[];
}) {
  const pillClass =
    'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-sm font-medium transition hover:border-gold/40 active:bg-accent';

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {phone ? (
        <a href={`tel:${phone}`} className={pillClass}>
          <Phone className="size-4 shrink-0" aria-hidden />
          {phone}
        </a>
      ) : null}
      {phone ? (
        <a href={whatsappHref(phone)} target="_blank" rel="noreferrer" className={pillClass}>
          <MessageCircle className="size-4 shrink-0" aria-hidden />
          WhatsApp
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className={pillClass}>
          <Mail className="size-4 shrink-0" aria-hidden />
          {email}
        </a>
      ) : null}
      {links.map((l) =>
        l.plain ? (
          <a key={l.href} href={l.href} className={pillClass}>
            <l.icon className="size-4 shrink-0" aria-hidden />
            {l.label}
          </a>
        ) : (
          <Link key={l.href} href={l.href} className={pillClass}>
            <l.icon className="size-4 shrink-0" aria-hidden />
            {l.label}
          </Link>
        ),
      )}
    </div>
  );
}
