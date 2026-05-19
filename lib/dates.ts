import { eachDayOfInterval, parseISO, isWeekend, format } from "date-fns";

/**
 * Count business days (Mon-Fri) in [startDate, endDate] inclusive.
 * Both dates are YYYY-MM-DD strings.
 */
export function businessDaysInclusive(
  startDate: string,
  endDate: string
): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (end < start) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter((d) => !isWeekend(d)).length;
}

export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}
