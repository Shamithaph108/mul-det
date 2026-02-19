import type { Transaction } from "./types";

const REQUIRED_COLUMNS = [
  "transaction_id",
  "sender_id",
  "receiver_id",
  "amount",
  "timestamp",
] as const;

/**
 * Parse CSV into Transaction[].
 * - RFC 4180 quoted fields
 * - Case-insensitive headers
 * - Skips invalid rows without crashing
 * Time: O(n), Space: O(n)
 */
export function parseCSV(csv: string): Transaction[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2)
    throw new Error("CSV must have a header row and at least one data row.");

  const headers = splitLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z_]/g, "")
  );
  validateHeaders(headers);

  const idx = Object.fromEntries(
    REQUIRED_COLUMNS.map((c) => [c, headers.indexOf(c)])
  ) as Record<(typeof REQUIRED_COLUMNS)[number], number>;

  const transactions: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const cols = splitLine(line);
      const sender_id   = cols[idx.sender_id]?.trim();
      const receiver_id = cols[idx.receiver_id]?.trim();
      if (!sender_id || !receiver_id) continue;

      const amount = parseFloat(cols[idx.amount]);
      if (isNaN(amount)) continue;

      const timestamp = parseTimestamp(cols[idx.timestamp]?.trim() ?? "");
      if (!timestamp) continue;

      transactions.push({
        transaction_id: cols[idx.transaction_id]?.trim() ?? `ROW_${i}`,
        sender_id,
        receiver_id,
        amount,
        timestamp,
      });
    } catch {
      // skip bad rows
    }
  }

  return transactions;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateHeaders(headers: string[]): void {
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length)
    throw new Error(
      `CSV missing required column(s): ${missing.join(", ")}. Found: ${headers.join(", ")}`
    );
}

/** RFC 4180-compliant CSV line splitter */
export function splitLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { current += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseTimestamp(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}
