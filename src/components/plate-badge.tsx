const COUNTRY_BY_LANGUAGE: Record<string, string> = {
  nl: 'NL',
  fr: 'FR',
  en: 'NL',
};

export function countryForLanguage(language: string | null | undefined): string {
  return COUNTRY_BY_LANGUAGE[language ?? 'nl'] ?? 'NL';
}

/** European-style number plate chip: blue country band + yellow plate. */
export function PlateBadge({ plate, country = 'NL' }: { plate: string; country?: string }) {
  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-[4px] border border-foreground/80 font-mono shadow-sm">
      <span className="flex items-center bg-[#0b3aa5] px-1 text-[9px] font-bold leading-none text-white">
        {country}
      </span>
      <span className="bg-[#f6ce00] px-1.5 py-0.5 text-[13px] font-bold leading-none tracking-wide text-[#111]">
        {plate}
      </span>
    </span>
  );
}
