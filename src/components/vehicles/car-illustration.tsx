// Neutral, on-brand vehicle silhouette shown when a vehicle has no photo yet.
// Two body types keep the grid lively without pretending to be the real car.
export function CarIllustration({
  kind = 'hatch',
  className,
}: {
  kind?: 'hatch' | 'van';
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 96"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="100" cy="87" rx="82" ry="6" fill="#16233e" opacity="0.08" />
      {kind === 'van' ? (
        <>
          <path
            d="M14 64 Q14 34 30 32 L120 31 Q150 33 168 47 L186 52 Q192 55 192 63 L192 70 Q192 74 188 74 L20 74 Q14 74 14 66 Z"
            fill="#aab4c4"
          />
          <path d="M128 40 Q142 42 152 49 L130 49 Z" fill="#ccd5e1" />
          <rect x="42" y="38" width="24" height="12" rx="2.5" fill="#ccd5e1" />
          <rect x="72" y="38" width="24" height="12" rx="2.5" fill="#ccd5e1" />
        </>
      ) : (
        <>
          <path
            d="M16 66 Q18 50 34 47 L58 46 Q70 30 96 29 L128 30 Q150 32 162 47 L182 52 Q190 55 190 63 L190 70 Q190 74 186 74 L22 74 Q16 74 16 68 Z"
            fill="#aab4c4"
          />
          <path d="M64 45 Q73 34 94 34 L122 35 Q140 37 150 47 Z" fill="#ccd5e1" />
          <path d="M104 35 L104 46" stroke="#aab4c4" strokeWidth="3" />
        </>
      )}
      <circle cx="56" cy="74" r="15" fill="#3a4658" />
      <circle cx="56" cy="74" r="6.5" fill="#dfe4ec" />
      <circle cx="152" cy="74" r="15" fill="#3a4658" />
      <circle cx="152" cy="74" r="6.5" fill="#dfe4ec" />
    </svg>
  );
}
