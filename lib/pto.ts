// Fatty Chem PTO tier rules
//
//   Year 0 - 4  →  5 days
//   Year 5 - 9  →  10 days
//   Year 10+    →  15 days
//
// "Year N" is defined by the employee's anniversary date — i.e. their tier
// bumps up on the literal anniversary (start_date + N years), not on
// Jan 1 of the year they hit N years of service.

export const PTO_TIERS = [
  { minYears: 0, days: 5, label: "Year 1–4" },
  { minYears: 5, days: 10, label: "Year 5–9" },
  { minYears: 10, days: 15, label: "Year 10+" },
] as const;

/** Whole years between the start date and `asOf` (default: today),
 *  counted from anniversary to anniversary. Returns 0 if start_date is
 *  in the future or unparseable. */
export function yearsEmployed(
  startDate: string | null | undefined,
  asOf: Date = new Date()
): number {
  if (!startDate) return 0;
  const start = parseDate(startDate);
  if (!start || start > asOf) return 0;
  let years = asOf.getFullYear() - start.getFullYear();
  // Adjust if the anniversary hasn't occurred yet this year
  const anniversaryThisYear = new Date(
    asOf.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  if (asOf < anniversaryThisYear) years -= 1;
  return Math.max(0, years);
}

/** Returns the annual PTO days an employee is entitled to as of `asOf`. */
export function calculatePtoDays(
  startDate: string | null | undefined,
  asOf: Date = new Date()
): number {
  const years = yearsEmployed(startDate, asOf);
  let days = PTO_TIERS[0].days;
  for (const tier of PTO_TIERS) {
    if (years >= tier.minYears) days = tier.days;
  }
  return days;
}

/** Returns the date when the employee will move to their next tier, or null
 *  if they're already at the top tier (or have no start date). */
export function nextTierDate(
  startDate: string | null | undefined,
  asOf: Date = new Date()
): { date: Date; newDays: number } | null {
  if (!startDate) return null;
  const start = parseDate(startDate);
  if (!start) return null;
  const years = yearsEmployed(startDate, asOf);

  // Find the next tier above the current one
  const nextTier = PTO_TIERS.find((t) => t.minYears > years);
  if (!nextTier) return null;

  const target = new Date(start);
  target.setFullYear(start.getFullYear() + nextTier.minYears);
  return { date: target, newDays: nextTier.days };
}

/** Days remaining until next tier change (rounded down). null if no next tier. */
export function daysUntilNextTier(
  startDate: string | null | undefined,
  asOf: Date = new Date()
): number | null {
  const next = nextTierDate(startDate, asOf);
  if (!next) return null;
  const ms = next.date.getTime() - asOf.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function parseDate(s: string): Date | null {
  // Accept YYYY-MM-DD (most common in this app)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
