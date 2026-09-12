"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { ChartSpec } from "@/lib/charts/types";

const SERIES_VARS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];

function DataTable({ spec }: { spec: ChartSpec }) {
  const columns = [spec.categoryKey!, ...spec.series.map((s) => s.key)];
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[var(--text-xs)] text-[var(--chart-muted)]">
        Show as table
      </summary>
      <table className="tabular-nums mt-2 w-full text-[var(--text-xs)]">
        <thead>
          <tr className="border-b border-[var(--chart-gridline)]">
            {columns.map((c) => (
              <th key={c} className="p-1.5 text-left font-medium">
                {c === spec.categoryKey
                  ? c
                  : spec.series.find((s) => s.key === c)?.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.data.map((row, i) => (
            <tr key={i} className="border-b border-[var(--chart-gridline)]">
              {columns.map((c) => (
                <td key={c} className="p-1.5">
                  {row[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function ChartRenderer({ spec }: { spec: ChartSpec }) {
  if (spec.kind === "stat") {
    return (
      <Card className="viz-root p-5" style={{ background: "var(--chart-surface)" }}>
        <p className="text-[var(--text-sm)] text-[var(--chart-text-secondary)]">
          {spec.title}
        </p>
        <p className="mt-1 text-5xl font-semibold text-[var(--chart-text-primary)]">
          {spec.unit === "$" ? "$" : ""}
          {spec.value?.toLocaleString()}
          {spec.unit && spec.unit !== "$" ? spec.unit : ""}
        </p>
      </Card>
    );
  }

  const multiSeries = spec.series.length >= 2;

  return (
    <Card className="viz-root p-5" style={{ background: "var(--chart-surface)" }}>
      <p className="text-[var(--text-sm)] font-medium text-[var(--chart-text-primary)]">
        {spec.title}
      </p>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer>
          {spec.kind === "bar" ? (
            <BarChart data={spec.data} barCategoryGap={8}>
              <CartesianGrid
                vertical={false}
                stroke="var(--chart-gridline)"
                strokeDasharray="0"
              />
              <XAxis
                dataKey={spec.categoryKey}
                tick={{ fill: "var(--chart-text-secondary)", fontSize: 12 }}
                axisLine={{ stroke: "var(--chart-baseline)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--chart-text-secondary)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "var(--chart-gridline)", opacity: 0.4 }}
                contentStyle={{
                  background: "var(--chart-surface)",
                  border: "1px solid var(--chart-gridline)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {multiSeries && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {spec.series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={SERIES_VARS[i % SERIES_VARS.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart data={spec.data}>
              <CartesianGrid
                vertical={false}
                stroke="var(--chart-gridline)"
                strokeDasharray="0"
              />
              <XAxis
                dataKey={spec.categoryKey}
                tick={{ fill: "var(--chart-text-secondary)", fontSize: 12 }}
                axisLine={{ stroke: "var(--chart-baseline)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--chart-text-secondary)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--chart-surface)",
                  border: "1px solid var(--chart-gridline)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {multiSeries && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {spec.series.map((s, i) => {
                const color = SERIES_VARS[i % SERIES_VARS.length];
                return (
                  <Line
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    type="monotone"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, stroke: "var(--chart-surface)", fill: color }}
                  />
                );
              })}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <DataTable spec={spec} />
    </Card>
  );
}
