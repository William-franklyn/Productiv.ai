export interface Dataset {
  columns: string[];
  rows: Record<string, string | number>[];
}

const MAX_ROWS = 5000;

function coerce(value: string): string | number {
  if (value.trim() === "") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(text: string): Dataset | null {
  const lines = text.split(/\r\n|\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return null;

  const columns = parseCSVLine(lines[0]).map((c) => c.trim());
  const rows = lines.slice(1, MAX_ROWS + 1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string | number> = {};
    columns.forEach((col, i) => {
      row[col] = coerce(values[i] ?? "");
    });
    return row;
  });

  return { columns, rows };
}

function arrayToDataset(records: Record<string, unknown>[]): Dataset | null {
  if (records.length === 0) return null;
  const columns = [...new Set(records.flatMap((r) => Object.keys(r)))];
  const rows = records.slice(0, MAX_ROWS).map((record) => {
    const row: Record<string, string | number> = {};
    for (const col of columns) {
      const value = record[col];
      row[col] = typeof value === "number" ? value : String(value ?? "");
    }
    return row;
  });
  return { columns, rows };
}

/**
 * Best-effort parse of an uploaded file into a flat row/column shape usable
 * for real aggregation — the chunk/embedding pipeline is for semantic search
 * over prose and can't answer "what's the average of column X," so a source
 * that looks tabular also gets a queryable dataset stored alongside it.
 */
export function parseTabular(text: string, mimeType: string): Dataset | null {
  if (mimeType === "text/csv") return parseCSV(text);

  if (mimeType === "application/json") {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
        return arrayToDataset(data as Record<string, unknown>[]);
      }
    } catch {
      return null;
    }
  }

  return null;
}
