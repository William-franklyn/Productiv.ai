import type { Dataset } from "./tabular";

export interface ColumnSummary {
  column: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
}

export type Aggregate = "sum" | "avg" | "min" | "max" | "count";

function numericValues(rows: Dataset["rows"], column: string): number[] {
  return rows
    .map((r) => r[column])
    .filter((v): v is number => typeof v === "number");
}

export function summarizeDataset(dataset: Dataset): ColumnSummary[] {
  const summaries: ColumnSummary[] = [];
  for (const column of dataset.columns) {
    const values = numericValues(dataset.rows, column);
    if (values.length === 0) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    summaries.push({
      column,
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      sum,
    });
  }
  return summaries;
}

function aggregate(values: number[], kind: Aggregate): number {
  if (kind === "count") return values.length;
  if (values.length === 0) return 0;
  if (kind === "sum") return values.reduce((a, b) => a + b, 0);
  if (kind === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
  if (kind === "min") return Math.min(...values);
  return Math.max(...values);
}

export interface GroupedRow {
  category: string;
  value: number;
}

/**
 * Groups rows by a category-like column and aggregates a numeric column per
 * group — the thing embeddings genuinely can't do, since it has to touch
 * every row rather than the ones most semantically similar to the question.
 */
export function groupByAggregate(
  dataset: Dataset,
  groupByColumn: string,
  metricColumn: string,
  kind: Aggregate,
): GroupedRow[] {
  const groups = new Map<string, number[]>();
  for (const row of dataset.rows) {
    const key = String(row[groupByColumn] ?? "(blank)");
    const value = row[metricColumn];
    if (typeof value !== "number") continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(value);
  }

  return [...groups.entries()]
    .map(([category, values]) => ({ category, value: aggregate(values, kind) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);
}
