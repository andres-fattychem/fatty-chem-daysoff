// Inline SVG of the Fatty Chem sunburst mark.
// Uses currentColor so it inherits the parent text color — works on white
// surfaces (set className="text-brand") or on the dark inverted nav
// (text-brand-light against ink background). To swap in the official
// raster/SVG logo file, see README → "Customizing the logo".

export function FattyChemMark({
  className = "",
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-120 -120 240 240"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {Array.from({ length: 16 }).map((_, i) => (
        <rect
          key={i}
          x="-5"
          y="-105"
          width="10"
          height="58"
          rx="3"
          transform={`rotate(${(360 / 16) * i})`}
        />
      ))}
    </svg>
  );
}

export function FattyChemWordmark({
  className = "",
  showByproducts = false,
}: {
  className?: string;
  showByproducts?: boolean;
}) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="font-semibold tracking-tight">fattychem</span>
      {showByproducts && (
        <span className="text-[9px] tracking-[0.25em] mt-0.5 text-slate-400">
          BYPRODUCTS
        </span>
      )}
    </span>
  );
}

export function FattyChemLogo({
  className = "",
  iconSize = 28,
  showByproducts = false,
}: {
  className?: string;
  iconSize?: number;
  showByproducts?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <FattyChemMark size={iconSize} className="text-brand shrink-0" />
      <FattyChemWordmark
        className="text-brand"
        showByproducts={showByproducts}
      />
    </span>
  );
}
