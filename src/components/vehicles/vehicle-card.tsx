import { Link } from '@/i18n/navigation';
import { CarIllustration } from '@/components/vehicles/car-illustration';

export const VAN_MODEL_PATTERN =
  /sprinter|transit|transporter|traffic|kangoo|berlingo|partner|combo|ducato|jumper|boxer|crafter|vito|bestel|caddy|expert|vivaro|master|movano|daily/i;

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return initials || '?';
}

type Props = {
  href: string;
  make: string | null;
  model: string | null;
  plate: string | null;
  year: number | null;
  mileage: number | null;
  owner: string;
  /** Reserved for the next step: the garage's own photo of the car. */
  photoUrl?: string | null;
  labels: { year: string; km: string; vehicle: string };
};

export function VehicleCard({
  href,
  make,
  model,
  plate,
  year,
  mileage,
  owner,
  photoUrl,
  labels,
}: Props) {
  const title = [make, model].filter(Boolean).join(' ') || labels.vehicle;
  const kind = VAN_MODEL_PATTERN.test(`${make ?? ''} ${model ?? ''}`) ? 'van' : 'hatch';

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-gradient-to-b from-muted to-accent">
        <CarIllustration kind={kind} className="absolute inset-0 m-auto h-[78%] w-[88%]" />
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="p-3">
        {plate ? (
          <span className="inline-flex items-stretch overflow-hidden rounded-[4px] border-[1.5px] border-black font-mono shadow-sm">
            <span className="flex items-center bg-[#0b3aa5] px-1 text-[9px] font-bold leading-none text-white">
              NL
            </span>
            <span className="bg-[#f6ce00] px-1.5 py-0.5 text-[13px] font-bold tracking-wider text-black">
              {plate}
            </span>
          </span>
        ) : null}

        <div className="mt-2 text-sm font-semibold leading-tight tracking-tight">{title}</div>

        {year || mileage ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {year ? (
              <span>
                {labels.year} {year}
              </span>
            ) : null}
            {year && mileage ? <span className="text-border">·</span> : null}
            {mileage ? (
              <span className="font-mono">{mileage.toLocaleString('nl-NL')} km</span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-primary">
            {initialsOf(owner)}
          </span>
          <span className="truncate text-xs text-muted-foreground">{owner}</span>
        </div>
      </div>
    </Link>
  );
}
