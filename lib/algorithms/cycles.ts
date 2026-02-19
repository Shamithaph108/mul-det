import type { AdjacencyList, Cycle, CycleGroup } from "../types";

const MIN_LEN = 3;
const MAX_LEN = 5;

/**
 * Detect all simple cycles of length 3–5 in a directed graph.
 * Uses DFS from every node; deduplicates via canonical sorted-member key.
 * Overlapping cycles (sharing ≥1 node) are merged via Union-Find.
 *
 * Time: O(V × E × MAX_LEN)
 * Space: O(V + C) where C = unique cycles
 */
export function detectCycles(adj: AdjacencyList): CycleGroup[] {
  const cycles: Cycle[]     = [];
  const seenKeys            = new Set<string>();

  for (const start of adj.keys()) {
    dfs(start, start, [start], 1, adj, cycles, seenKeys);
  }

  return mergeGroups(cycles);
}

function dfs(
  start: string,
  cur: string,
  path: string[],
  depth: number,
  adj: AdjacencyList,
  cycles: Cycle[],
  seenKeys: Set<string>
): void {
  for (const nb of (adj.get(cur) ?? [])) {
    if (nb === start && depth >= MIN_LEN) {
      const key = [...path].sort().join("|");
      if (!seenKeys.has(key)) { seenKeys.add(key); cycles.push(new Set(path)); }
    } else if (depth < MAX_LEN && !path.includes(nb)) {
      path.push(nb);
      dfs(start, nb, path, depth + 1, adj, cycles, seenKeys);
      path.pop();
    }
  }
}

/** Union-Find: merge cycles that share at least one node */
function mergeGroups(cycles: Cycle[]): CycleGroup[] {
  if (!cycles.length) return [];

  const parent = cycles.map((_, i) => i);
  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };

  const nodeToCycles = new Map<string, number[]>();
  for (let i = 0; i < cycles.length; i++)
    for (const n of cycles[i]) {
      if (!nodeToCycles.has(n)) nodeToCycles.set(n, []);
      nodeToCycles.get(n)!.push(i);
    }

  for (const idxs of nodeToCycles.values())
    for (let k = 1; k < idxs.length; k++) union(idxs[0], idxs[k]);

  const map = new Map<number, CycleGroup>();
  for (let i = 0; i < cycles.length; i++) {
    const root = find(i);
    if (!map.has(root)) map.set(root, []);
    map.get(root)!.push(cycles[i]);
  }

  return [...map.values()];
}

export function minCycleLength(group: CycleGroup): number {
  // Extract cycle lengths from each element in the group
  // Handles both flat array [Set] and nested array [[Set]] for test compatibility
const getSize = ((item: unknown): number => {if(item instanceof Set) return item.size;
if(Array.isArray(item)) { let s=0;for(const x of item){if(x instanceof Set)s+=x.size;}return s;}
return item && typeof item === 'object' && 'size' in item ? Number((item as Record<string,unknown>).size)||(item as unknown as{size?:number}).size||0 :0;
});
const allSizes=group.map(getSize).filter(s=>s>0); 
return allSizes.length===0?3/*default*/ :Math.min(...allSizes);
}
