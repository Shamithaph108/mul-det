import { NextRequest, NextResponse } from "next/server";
import { parseCSV }            from "@/lib/parser";
import { buildGraph }          from "@/lib/graph";
import { detectCycles }        from "@/lib/algorithms/cycles";
import { detectSmurfing }      from "@/lib/algorithms/smurfing";
import { detectShellNetworks } from "@/lib/algorithms/shells";
import { buildDetectionResult } from "@/lib/scorer";

/**
 * POST /api/analyze
 *
 * Accepts:
 *   - multipart/form-data  with field "file" (CSV)
 *   - text/csv             raw body
 *
 * Returns: DetectionResult JSON (matches hackathon spec exactly)
 */
export async function POST(req: NextRequest) {
  const t0          = performance.now();
  const contentType = req.headers.get("content-type") ?? "";

  try {
    let csvText: string;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string")
        return err(400, "No file provided. Send CSV as multipart field named 'file'.");
      csvText = await (file as File).text();
    } else if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      csvText = await req.text();
    } else {
      return err(415, "Unsupported content-type. Use multipart/form-data (field: file) or text/csv.");
    }

    if (!csvText.trim()) return err(400, "Empty CSV.");

    // ── Pipeline ──────────────────────────────────────────────────────────
    const transactions = parseCSV(csvText);
    if (!transactions.length)
      return err(422, "No valid transactions found. Check CSV column names and row data.");

    const graph = buildGraph(transactions);

    const [cycleGroups, smurfResults, shellChains] = await Promise.all([
      Promise.resolve(detectCycles(graph.adj)),
      Promise.resolve(detectSmurfing(transactions)),
      Promise.resolve(detectShellNetworks(transactions, graph.adj, graph.txnCount)),
    ]);

    const processingTime = parseFloat(((performance.now() - t0) / 1000).toFixed(3));
    const result = buildDetectionResult({
      transactions, graph, cycleGroups, smurfResults, shellChains, processingTime,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "X-Processing-Time-Seconds":  String(result.summary.processing_time_seconds),
        "X-Accounts-Analyzed":        String(result.summary.total_accounts_analyzed),
        "X-Fraud-Rings-Detected":     String(result.summary.fraud_rings_detected),
        "X-Suspicious-Accounts":      String(result.summary.suspicious_accounts_flagged),
      },
    });
  } catch (e: unknown) {
    console.error("[/api/analyze]", e);
    return err(500, e instanceof Error ? e.message : "Internal server error");
  }
}

/** GET /api/analyze — usage instructions */
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/analyze",
    description: "Upload a transaction CSV to detect money muling rings.",
    content_types: ["multipart/form-data (field: file)", "text/csv"],
    required_columns: ["transaction_id", "sender_id", "receiver_id", "amount", "timestamp"],
    timestamp_format: "YYYY-MM-DD HH:MM:SS or ISO 8601",
    example_curl: "curl -X POST /api/analyze -F 'file=@transactions.csv'",
  });
}

const err = (status: number, message: string) =>
  NextResponse.json({ error: message }, { status });
