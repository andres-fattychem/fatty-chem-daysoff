// Fatty Chem brand assets.
//
// The official logo PNGs have BLACK backgrounds, so they look best on
// surfaces that are already dark (bg-ink / #0A0A0A). For light surfaces
// or contexts where image loading is unreliable (e.g. transactional email),
// use the styled <FattyChemWordmark /> instead.

export function FattyChemMark({
  className = "",
  size = 32,
  variant = "white",
}: {
  className?: string;
  size?: number;
  variant?: "white" | "orange";
}) {
  const src =
    variant === "white"
      ? "/fatty-chem-mark-white.png"
      : "/fatty-chem-mark-orange.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt="Fatty Chem"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

export function FattyChemFullLogo({
  className = "",
  width = 280,
}: {
  className?: string;
  width?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/fatty-chem-logo-full.png"
      width={width}
      alt="Fatty Chem · Byproducts"
      className={className}
      style={{ height: "auto" }}
    />
  );
}

// Styled HTML wordmark — used when the image asset isn't appropriate
// (e.g. inside email HTML where remote images get blocked by default).
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
