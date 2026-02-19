import type { Transaction, GraphData } from "./types";

/**
 * Build directed graph from transactions.
 * Time: O(T), Space: O(V + E)
 */
export function buildGraph(transactions: Transaction[]): GraphData {
  const adj        = new Map<string, Set<string>>();
  const reverseAdj = new Map<string, Set<string>>();
  const txnCount   = new Map<string, number>();
  const accounts   = new Set<string>();

  const ensure = (id: string) => {
    if (!adj.has(id))        adj.set(id, new Set());
    if (!reverseAdj.has(id)) reverseAdj.set(id, new Set());
    accounts.add(id);
  };

  for (const t of transactions) {
    ensure(t.sender_id);
    ensure(t.receiver_id);
    adj.get(t.sender_id)!.add(t.receiver_id);
    reverseAdj.get(t.receiver_id)!.add(t.sender_id);
    txnCount.set(t.sender_id,   (txnCount.get(t.sender_id)   ?? 0) + 1);
    txnCount.set(t.receiver_id, (txnCount.get(t.receiver_id) ?? 0) + 1);
  }

  return { adj, reverseAdj, txnCount, accounts };
}
