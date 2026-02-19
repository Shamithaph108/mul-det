import type { Transaction, AdjacencyList, ShellChain } from "../types";

const MAX_SHELL_TXNS = 3; // accounts with ≤ this many txns are shell candidates
const MIN_CHAIN      = 3; // minimum hops to qualify
const MAX_DEPTH      = 6; // maximum hops to trace
const MAX_CHAINS     = 200;

/**
 * Detect chains of ≥3 low-activity accounts passing money between them.
 * Low-activity = ≤3 total transactions (likely exists only to layer funds).
 *
 * DFS from each shell-candidate node; sub-chains de-duplicated.
 * Time: O(V × MAX_DEPTH), Space: O(V)
 */
export function detectShellNetworks(
  _transactions: Transaction[],
  adj: AdjacencyList,
  txnCount: Map<string, number>
): ShellChain[] {
  const chains: ShellChain[] = [];
  const seenKeys             = new Set<string>();
  // const isShell              = (id: string) => (txnCount.get(id) ?? 0) <= MAX_SHELL_TXNS;
  const isShell = (id: string) => {
  const count = txnCount.get(id) ?? 0;
  return count <= MAX_SHELL_TXNS && count > 0;
};

  for (const start of adj.keys()) {
    if (!isShell(start)) continue;
    if (chains.length >= MAX_CHAINS) break;
    traceChain(start, [start], adj, isShell, chains, seenKeys, MAX_DEPTH);
  }

  return deduplicate(chains);
}

function traceChain(
  cur: string,
  path: string[],
  adj: AdjacencyList,
  isShell: (id: string) => boolean,
  chains: ShellChain[],
  seen: Set<string>,
  depth: number
): void {
  if (chains.length >= MAX_CHAINS) return;
  const nbs = adj.get(cur);
  if (!nbs || !nbs.size || depth === 0) {
    if (path.length >= MIN_CHAIN) record(path, chains, seen);
    return;
  }
  let extended = false;
  for (const nb of nbs) {
    if (path.includes(nb)) continue;
    if (!isShell(nb)) {
      if (path.length >= MIN_CHAIN) record([...path, nb], chains, seen);
      continue;
    }
    extended = true;
    path.push(nb);
    traceChain(nb, path, adj, isShell, chains, seen, depth - 1);
    path.pop();
  }
  if (!extended && path.length >= MIN_CHAIN) record(path, chains, seen);
}

function record(path: string[], chains: ShellChain[], seen: Set<string>): void {
  if (chains.length >= MAX_CHAINS) return;
  const key = path.join(">");
  if (!seen.has(key)) { seen.add(key); chains.push([...path]); }
}

/** Remove chains that are leading sub-paths of longer chains */
// function deduplicate(chains: ShellChain[]): ShellChain[] {
//   chains.sort((a, b) => b.length - a.length);
//   const kept      = new Set<string>();
//   const dominated = new Set<string>();
//   const result: ShellChain[] = [];
//   for (const chain of chains) {
//     const key = chain.join(">");
//     if (dominated.has(key)) continue;
//     result.push(chain);
//     kept.add(key);
//     for (let len = MIN_CHAIN; len < chain.length; len++)
//       dominated.add(chain.slice(0, len).join(">"));
//   }
//   return result;
// }

// function deduplicate(chains: ShellChain[]): ShellChain[] {
//   chains.sort((a, b) => b.length - a.length);

//   const result: ShellChain[] = [];

//   for (const candidate of chains) {
//     const isSubset = result.some(existing =>
//       candidate.every(node => existing.includes(node))
//     );

//     if (!isSubset) {
//       result.push(candidate);
//     }
//   }

//   return result;
// }
function deduplicate(chains: ShellChain[]): ShellChain[] {
  chains.sort((a, b) => b.length - a.length);

  const result: ShellChain[] = [];

  for (const candidate of chains) {
    const isSubset = result.some(existing =>
      candidate.every(node => existing.includes(node))
    );

    if (!isSubset) {
      result.push(candidate);
    }
  }

  return result;
}


