import { parseCSV }            from "../lib/parser";
import { buildGraph }          from "../lib/graph";
import { detectCycles, minCycleLength } from "../lib/algorithms/cycles";
import { detectSmurfing }      from "../lib/algorithms/smurfing";
import { detectShellNetworks } from "../lib/algorithms/shells";
import { isLegitimateAccount } from "../lib/legitimacy";
import { buildDetectionResult } from "../lib/scorer";
import type { Transaction }    from "../lib/types";

const tx = (id: string, from: string, to: string, amount: number, ts: string): Transaction => ({
  transaction_id: id, sender_id: from, receiver_id: to,
  amount, timestamp: new Date(ts),
});

// ─── Parser ───────────────────────────────────────────────────────────────────

describe("parseCSV", () => {
  it("parses valid CSV", () => {
    const csv = `transaction_id,sender_id,receiver_id,amount,timestamp\nT1,A,B,100,2024-01-01 10:00:00`;
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].sender_id).toBe("A");
    expect(rows[0].amount).toBe(100);
  });

  it("throws on missing columns", () => {
    expect(() => parseCSV("transaction_id,sender_id\nT1,A")).toThrow("missing required column");
  });

  it("handles quoted fields with commas", () => {
    const csv = `transaction_id,sender_id,receiver_id,amount,timestamp\n"T1","A,1","B,2",50,"2024-01-01 10:00:00"`;
    expect(parseCSV(csv)[0].sender_id).toBe("A,1");
  });

  it("skips rows with invalid amount silently", () => {
    const csv = `transaction_id,sender_id,receiver_id,amount,timestamp\nT1,A,B,NaN,2024-01-01 10:00:00\nT2,C,D,100,2024-01-01 10:00:00`;
    expect(parseCSV(csv)).toHaveLength(1);
  });
});

// ─── Graph builder ────────────────────────────────────────────────────────────

describe("buildGraph", () => {
  it("creates correct adjacency lists", () => {
    const txns = [tx("1","A","B",100,"2024-01-01")];
    const { adj, reverseAdj, txnCount, accounts } = buildGraph(txns);
    expect(adj.get("A")?.has("B")).toBe(true);
    expect(reverseAdj.get("B")?.has("A")).toBe(true);
    expect(txnCount.get("A")).toBe(1);
    expect(accounts.has("A")).toBe(true);
  });
});

// ─── Cycle detection ──────────────────────────────────────────────────────────

describe("detectCycles", () => {
  it("finds 3-node cycle A→B→C→A", () => {
    const txns = [tx("1","A","B",100,"2024-01-01"), tx("2","B","C",100,"2024-01-01"), tx("3","C","A",100,"2024-01-01")];
    const { adj } = buildGraph(txns);
    const groups = detectCycles(adj);
    const all = new Set(groups.flatMap(g => g.flatMap(c => [...c])));
    expect(groups.length).toBeGreaterThanOrEqual(1);
    expect(all.has("A") && all.has("B") && all.has("C")).toBe(true);
  });

  it("finds 5-node cycle", () => {
    const txns = ["A","B","C","D","E"].map((s,i,arr) => tx(`${i}`  ,s,arr[(i+1)%5],100,"2024-01-01"));
    const { adj } = buildGraph(txns);
    expect(detectCycles(adj).length).toBeGreaterThanOrEqual(1);
  });

  it("ignores 6-node cycle (above max)", () => {
    const txns = ["A","B","C","D","E","F"].map((s,i,arr) => tx(`${i}`,s,arr[(i+1)%6],100,"2024-01-01"));
    const { adj } = buildGraph(txns);
    expect(detectCycles(adj).length).toBe(0);
  });

  it("merges overlapping cycles", () => {
    const txns = [
      tx("1","A","B",100,"2024-01-01"), tx("2","B","C",100,"2024-01-01"),
      tx("3","C","A",100,"2024-01-01"), tx("4","B","D",100,"2024-01-01"),
      tx("5","D","A",100,"2024-01-01"),
    ];
    const { adj } = buildGraph(txns);
    expect(detectCycles(adj).length).toBe(1); // merged into 1 group
  });

  it("returns empty for acyclic graph", () => {
    const { adj } = buildGraph([tx("1","A","B",100,"2024-01-01"), tx("2","B","C",100,"2024-01-01")]);
    expect(detectCycles(adj).length).toBe(0);
  });

  it("minCycleLength returns correct value", () => {
    const cycle = new Set(["A","B","C"]);
    expect(minCycleLength([[cycle]])).toBe(3);
  });
});

// ─── Smurfing detection ───────────────────────────────────────────────────────

describe("detectSmurfing", () => {
  it("detects fan-in (10+ senders → 1 receiver within 72h)", () => {
    const txns = Array.from({length:12},(_,i) => tx(`T${i}`,`S${i}`,"COLL",500,`2024-01-01T${10+i}:00:00`));
    const r = detectSmurfing(txns).find(r => r.type === "fan_in" && r.accountId === "COLL");
    expect(r).toBeDefined();
    expect(r!.counterparties.length).toBeGreaterThanOrEqual(10);
  });

  it("detects fan-out (1 sender → 10+ receivers within 72h)", () => {
    const txns = Array.from({length:12},(_,i) => tx(`T${i}`,"DISP",`R${i}`,500,`2024-01-01T${10+i}:00:00`));
    const r = detectSmurfing(txns).find(r => r.type === "fan_out" && r.accountId === "DISP");
    expect(r).toBeDefined();
  });

  it("does NOT flag fewer than 10 counterparties", () => {
    const txns = Array.from({length:5},(_,i) => tx(`T${i}`,`S${i}`,"X",100,"2024-01-01T10:00:00"));
    expect(detectSmurfing(txns).length).toBe(0);
  });

  it("respects 72h window — no flag if spread over 10 days", () => {
    const txns = Array.from({length:12},(_,i) =>
      tx(`T${i}`,`S${i}`,"X",100,`2024-01-${String(i+1).padStart(2,"0")}T10:00:00`));
    const r = detectSmurfing(txns).find(x => x.accountId === "X" && x.type === "fan_in");
    expect(r).toBeUndefined();
  });
});

// ─── Shell networks ───────────────────────────────────────────────────────────

describe("detectShellNetworks", () => {
  it("detects a 3-hop shell chain", () => {
    const txns = [
      tx("1","ENTRY","SH1",10000,"2024-01-01"), tx("2","SH1","SH2",9800,"2024-01-01"),
      tx("3","SH2","SH3",9600,"2024-01-01"),    tx("4","SH3","EXIT",9400,"2024-01-01"),
    ];
    const { adj, txnCount } = buildGraph(txns);
    const chains = detectShellNetworks(txns, adj, txnCount);
    expect(chains.length).toBeGreaterThan(0);
    expect(chains.some(c => c.includes("SH1") && c.includes("SH2"))).toBe(true);
  });

  it("does NOT start chain from high-activity node (>3 txns)", () => {
    // BUSY has 11 transactions — should not be a shell start
    const txns = Array.from({length:11},(_,i) => tx(`T${i}`,"SRC","BUSY",100,"2024-01-01"));
    txns.push(tx("T11","BUSY","DEST",100,"2024-01-01"));
    const { adj, txnCount } = buildGraph(txns);
    const chains = detectShellNetworks(txns, adj, txnCount);
    expect(chains.filter(c => c[0] === "BUSY" && c.length >= 3).length).toBe(0);
  });
});

// ─── Legitimacy filter ────────────────────────────────────────────────────────

describe("isLegitimateAccount", () => {
  it("flags payroll: many recipients, uniform amounts", () => {
    const txns = Array.from({length:20},(_,i) => tx(`T${i}`,"PAY",`EMP${i}`,3000,"2024-01-01"));
    expect(isLegitimateAccount("PAY", txns)).toBe(true);
  });

  it("flags merchant: overwhelmingly incoming", () => {
    const txns = [
      ...Array.from({length:50},(_,i) => tx(`T${i}`,`C${i}`,"MERCH",50,"2024-01-01")),
      tx("OUT","MERCH","BANK",2500,"2024-01-01"),
    ];
    expect(isLegitimateAccount("MERCH", txns)).toBe(true);
  });

  it("does NOT flag normal cycling account", () => {
    const txns = [tx("1","A","B",100,"2024-01-01"), tx("2","B","A",100,"2024-01-01")];
    expect(isLegitimateAccount("A", txns)).toBe(false);
  });
});

// ─── Integration ──────────────────────────────────────────────────────────────

describe("buildDetectionResult (e2e)", () => {
  it("produces spec-compliant output with correct sort order", () => {
    const txns = [
      tx("1","R1","R2",1000,"2024-01-01"), tx("2","R2","R3",900,"2024-01-01"),
      tx("3","R3","R1",800,"2024-01-01"),
      ...Array.from({length:12},(_,i) => tx(`S${i}`,`M${i}`,"AGG",500,`2024-01-01T${10+i}:00:00`)),
    ];
    const graph   = buildGraph(txns);
    const result  = buildDetectionResult({
      transactions: txns, graph,
      cycleGroups:  detectCycles(graph.adj),
      smurfResults: detectSmurfing(txns),
      shellChains:  detectShellNetworks(txns, graph.adj, graph.txnCount),
      processingTime: 0.1,
    });

    expect(result.suspicious_accounts.length).toBeGreaterThan(0);
    expect(result.fraud_rings.length).toBeGreaterThan(0);
    expect(result.summary.total_accounts_analyzed).toBeGreaterThan(0);

    // Sorted descending
    for (let i = 1; i < result.suspicious_accounts.length; i++) {
      expect(result.suspicious_accounts[i-1].suspicion_score)
        .toBeGreaterThanOrEqual(result.suspicious_accounts[i].suspicion_score);
    }

    // Field types
    for (const acc of result.suspicious_accounts) {
      expect(typeof acc.account_id).toBe("string");
      expect(typeof acc.suspicion_score).toBe("number");
      expect(acc.suspicion_score).toBeGreaterThan(0);
      expect(acc.suspicion_score).toBeLessThanOrEqual(100);
      expect(Array.isArray(acc.detected_patterns)).toBe(true);
      expect(typeof acc.ring_id).toBe("string");
    }
  });
});
