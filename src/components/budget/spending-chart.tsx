import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Slice } from "@/lib/budget/calc";
import { formatMoney, percentOf } from "@/lib/budget/format";

function usePrefersReducedMotion() {
  const [reduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  return reduced;
}

function ChartTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Slice }>;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0]?.payload;
  if (!slice) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2">
      <p className="text-sm font-semibold">{slice.label}</p>
      <p className="text-sm text-muted">{formatMoney(slice.cents)}</p>
    </div>
  );
}

export function SpendingChart({ slices, total }: { slices: Slice[]; total: number }) {
  const reduced = usePrefersReducedMotion();

  if (slices.length === 0) {
    return <p className="text-sm text-pretty text-muted">No expenses yet this month.</p>;
  }

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <div className="relative mx-auto h-44 w-full max-w-44" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="cents"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="var(--color-surface)"
              strokeWidth={2}
              isAnimationActive={!reduced}
            >
              {slices.map((slice) => (
                <Cell key={slice.id} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTip />} wrapperStyle={{ outline: "none", zIndex: 5 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-xs font-medium text-muted">Spent</span>
          <span className="text-sm font-semibold">{formatMoney(total)}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {slices.map((slice) => {
          const pct = percentOf(slice.cents, total);
          return (
            <li key={slice.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium">
                  {slice.label}
                  <span className="ml-2 text-sm font-normal text-muted">{pct}%</span>
                </span>
                <span className="shrink-0 font-semibold">{formatMoney(slice.cents)}</span>
              </div>
              <div className="cat-track mt-1.5" aria-hidden="true">
                <span style={{ width: `${Math.max(pct, 2)}%`, background: slice.color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
