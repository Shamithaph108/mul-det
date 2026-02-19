import { NextRequest, NextResponse } from "next/server";
import type { FraudRing, Transaction } from "@/lib/types";

/**
 * POST /api/rings/[ringId]
 * Body: { ring: FraudRing, transactions: Transaction[] }
 *
 * Returns the ring enriched with volume, timeline, and flow analysis.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { ringId: string } }
) {
  try {
    const body = await req.json();
    const ring: FraudRing       = body.ring;
    const transactions: Transaction[] = body.transactions;

    if (!ring?.member_accounts || !Array.isArray(transactions))
      return NextResponse.json({ error: "Body must include 'ring' (FraudRing) and 'transactions' (array)." }, { status: 400 });

    const members = new Set<string>(ring.member_accounts);

    const internal   = transactions.filter((t) => members.has(t.sender_id)  && members.has(t.receiver_id));
    const externalIn = transactions.filter((t) => !members.has(t.sender_id) && members.has(t.receiver_id));
    const externalOut= transactions.filter((t) => members.has(t.sender_id)  && !members.has(t.receiver_id));

    const sum = (txns: Transaction[]) =>
      parseFloat(txns.reduce((s, t) => s + t.amount, 0).toFixed(2));

    const timestamps = transactions
      .filter((t) => members.has(t.sender_id) || members.has(t.receiver_id))
      .map((t) => new Date(t.timestamp).getTime())
      .filter((n) => !isNaN(n));

    const firstSeen = timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null;
    const lastSeen  = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;

    return NextResponse.json({
      ...ring,
      enrichment: {
        internal_transaction_count: internal.length,
        total_internal_volume:      sum(internal),
        total_external_inflow:      sum(externalIn),
        total_external_outflow:     sum(externalOut),
        first_seen:   firstSeen,
        last_seen:    lastSeen,
        active_days:  firstSeen && lastSeen
          ? Math.ceil((new Date(lastSeen).getTime() - new Date(firstSeen).getTime()) / 86_400_000)
          : 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}
