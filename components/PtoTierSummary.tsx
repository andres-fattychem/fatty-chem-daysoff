import { PTO_TIERS } from "@/lib/pto";

/** Small summary card explaining the PTO tier rule. */
export default function PtoTierSummary() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            How annual PTO is calculated
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Each employee's annual PTO bucket is based on their tenure. Tiers
            bump up on the literal anniversary of their start date.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PTO_TIERS.map((tier, idx) => (
          <div
            key={tier.minYears}
            className="border border-slate-200 rounded-lg p-3 bg-slate-50/50"
          >
            <div className="text-xs uppercase tracking-wider text-slate-500">
              {tier.label}
            </div>
            <div className="text-2xl font-semibold text-brand mt-1 tabular-nums">
              {tier.days}{" "}
              <span className="text-sm font-normal text-slate-500">days</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {idx === PTO_TIERS.length - 1
                ? "Top tier"
                : `Until year ${PTO_TIERS[idx + 1].minYears - 1} of service`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
