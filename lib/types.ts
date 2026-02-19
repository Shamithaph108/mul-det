// ─── Raw input ────────────────────────────────────────────────────────────────

export interface Transaction {
  transaction_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  timestamp: Date;
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export type AdjacencyList = Map<string, Set<string>>;

export interface GraphData {
  /** sender → {receivers} */
  adj: AdjacencyList;
  /** receiver → {senders} */
  reverseAdj: AdjacencyList;
  /** total txns (sent + received) per account */
  txnCount: Map<string, number>;
  /** all unique account IDs */
  accounts: Set<string>;
}

// ─── Detection intermediates ──────────────────────────────────────────────────

export type Cycle      = Set<string>;
export type CycleGroup = Cycle[];

export interface SmurfResult {
  accountId: string;
  type: "fan_in" | "fan_out";
  counterparties: string[];
}

export type ShellChain = string[];

// ─── API output (matches spec exactly) ───────────────────────────────────────

export interface SuspiciousAccount {
  account_id: string;
  suspicion_score: number; // Float 0–100, sorted descending
  detected_patterns: string[];
  ring_id: string;
}

export interface FraudRing {
  ring_id: string;
  member_accounts: string[];
  pattern_type: string;
  risk_score: number;
}

export interface DetectionSummary {
  total_accounts_analyzed: number;
  suspicious_accounts_flagged: number;
  fraud_rings_detected: number;
  processing_time_seconds: number;
}

export interface DetectionResult {
  suspicious_accounts: SuspiciousAccount[];
  fraud_rings: FraudRing[];
  summary: DetectionSummary;
}
