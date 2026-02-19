import type { Transaction, SmurfResult } from "../types";

const WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours
const THRESHOLD = 10;                   // min unique counterparties

/**
 * Detect fan-in (≥10 senders → 1 account) and fan-out (1 account → ≥10 receivers)
 * within any 72-hour window.
 *
 * Two-pointer sliding window per account after sort.
 * Time: O(T log T), Space: O(T)
 */
export function detectSmurfing(transactions: Transaction[]): SmurfResult[] {
  const sentBy     = new Map<string, { peer: string; ts: number }[]>();
  const receivedBy = new Map<string, { peer: string; ts: number }[]>();

  for (const t of transactions) {
    const ts = t.timestamp.getTime();
    if (!sentBy.has(t.sender_id))       sentBy.set(t.sender_id, []);
    if (!receivedBy.has(t.receiver_id)) receivedBy.set(t.receiver_id, []);
    sentBy.get(t.sender_id)!.push({ peer: t.receiver_id, ts });
    receivedBy.get(t.receiver_id)!.push({ peer: t.sender_id, ts });
  }

  const results: SmurfResult[] = [];

  // for (const [accountId, records] of sentBy) {
  //   const peers = bestWindowPeers(records);
  //   if (peers.length >= THRESHOLD)
  //     results.push({ accountId, type: "fan_out", counterparties: peers });
  // }
  for (const [accountId, records] of sentBy) {
  const { peers, txnCount } = bestWindowPeers(records);

  if (peers.length >= THRESHOLD && txnCount >= THRESHOLD) {
    results.push({
      accountId,
      type: "fan_out",
      counterparties: peers,
    });
  }
}




  // for (const [accountId, records] of receivedBy) {
  //   const peers = bestWindowPeers(records);
  //   if (peers.length >= THRESHOLD)
  //     results.push({ accountId, type: "fan_in", counterparties: peers });
  // }

  for (const [accountId, records] of receivedBy) {
  const { peers, txnCount } = bestWindowPeers(records);

  if (peers.length >= THRESHOLD && txnCount >= THRESHOLD) {
    results.push({
      accountId,
      type: "fan_in",
      counterparties: peers,
    });
  }
}


  return results;
}

/**
 * Two-pointer: find the 72h window with the most unique peers.
 * Returns the unique peer IDs in that optimal window.
 */
// function bestWindowPeers(records: { peer: string; ts: number }[]):{peers: string[] ; txnCount: number}{
//   if (!records.length) return [];
//   records.sort((a, b) => a.ts - b.ts);

//   // if (records[records.length - 1].ts - records[0].ts <= WINDOW_MS)
//   //   return [...new Set(records.map((r) => r.peer))];
//   if (records[records.length - 1].ts - records[0].ts <= WINDOW_MS) {
//   const peers = [...new Set(records.map((r) => r.peer))];
//   return { peers, txnCount: records.length };
// }


//   let bestPeers  = new Set<string>();
//   let right      = 0;
//   const peerCnt  = new Map<string, number>();

//   for (let left = 0; left < records.length; left++) {
//     while (right < records.length && records[right].ts - records[left].ts <= WINDOW_MS) {
//       const p = records[right].peer;
//       peerCnt.set(p, (peerCnt.get(p) ?? 0) + 1);
//       right++;
//     }
//     if (peerCnt.size > bestPeers.size) bestPeers = new Set(peerCnt.keys());

//     const lp = records[left].peer;
//     const c  = peerCnt.get(lp) ?? 0;
//     if (c <= 1) peerCnt.delete(lp);
//     else peerCnt.set(lp, c - 1);
//   }

//   // return [...bestPeers];
//   return { peers: [...bestPeers], txnCount: bestPeers.size };

// }


function bestWindowPeers(
  records: { peer: string; ts: number }[]
): { peers: string[]; txnCount: number } {

  if (!records.length) {
    return { peers: [], txnCount: 0 };
  }

  records.sort((a, b) => a.ts - b.ts);

  if (records[records.length - 1].ts - records[0].ts <= WINDOW_MS) {
    const peers = [...new Set(records.map(r => r.peer))];
    return { peers, txnCount: records.length };
  }

  let bestPeers = new Set<string>();
  let right = 0;
  const peerCnt = new Map<string, number>();

  for (let left = 0; left < records.length; left++) {

    while (
      right < records.length &&
      records[right].ts - records[left].ts <= WINDOW_MS
    ) {
      const p = records[right].peer;
      peerCnt.set(p, (peerCnt.get(p) ?? 0) + 1);
      right++;
    }

    if (peerCnt.size > bestPeers.size) {
      bestPeers = new Set(peerCnt.keys());
    }

    const lp = records[left].peer;
    const c = peerCnt.get(lp) ?? 0;

    if (c <= 1) peerCnt.delete(lp);
    else peerCnt.set(lp, c - 1);
  }

  return { peers: [...bestPeers], txnCount: bestPeers.size };
}
