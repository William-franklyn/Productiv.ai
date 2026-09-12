export interface ChartRow {
  [key: string]: string | number;
}

export interface ChartSpec {
  kind: "bar" | "line" | "stat";
  title: string;
  categoryKey?: string;
  series: { key: string; label: string }[];
  data: ChartRow[];
  value?: number;
  unit?: string;
}
