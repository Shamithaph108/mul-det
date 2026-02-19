import type {
  Transaction,
  GraphData,
  CycleGroup,
  SmurfResult,
  ShellChain,
  SuspiciousAccount,
  FraudRing,
  DetectionResult,
} from "./types";

import { minCycleLength } from "./algorithms/cycles";
import { isLegitimateAccount } from "./legitimacy";

interface BuildInput {
  transactions: Transaction[];
  graph: GraphData;
  cycleGroups: CycleGroup[];
  smurfResults: SmurfResult[];
  shellChains: ShellChain[];
  processingTime: number;
}

interface InternalRing {
  key: string;
  member_accounts: string[];
  pattern_types: Set<string>;
  risk_score: number;
}

const safeRound2 = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export function buildDetectionResult(
  input: BuildInput
): DetectionResult {
  const {
    transactions,
    graph,
    cycleGroups,
    smurfResults,
    shellChains,
    processingTime,
  } = input;

  const ringsByKey = new Map<string, InternalRing>();
  const accountPatterns = new Map<string, Set<string>>();

  const addPattern = (id: string, pat: string) => {
    if (!accountPatterns.has(id)) {
      accountPatterns.set(id, new Set());
    }
    accountPatterns.get(id)!.add(pat);
  };

  const canonical = (members: string[]) =>
    [...new Set(members)].sort((a, b) => a.localeCompare(b));

  const keyFromMembers = (members: string[]) =>
    canonical(members).join("|");

  const addRing = (
    members: string[],
    patternType: string, riskScore: number
  ) => {
    const normalized = canonical(members);
    if (normalized.length < 2) return;

    const key = keyFromMembers(normalized);
    const existing = ringsByKey.get(key);

    if (existing) {
      existing.risk_score = safeRound2(
        Math.max(existing.risk_score, riskScore)
      );
      existing.pattern_types.add(patternType);
      return;
    }

    ringsByKey.set(key, {
      key,
      member_accounts: normalized,
      pattern_types: new Set([patternType]),
      risk_score: safeRound2(riskScore),
    });
  };

  // -----------------------------
  // CYCLES
  // -----------------------------
  for (const group of cycleGroups) {
    const members = new Set<string>();
    for (const c of group) for (const m of c) members.add(m);

    const arr = [...members];
    const minLen = minCycleLength(group);

    const avgTxn =
      arr.reduce((s, m) => s + (graph.txnCount.get(m) ?? 0), 0) /
      arr.length;

    const risk = Math.min(
      100,
      60 + (arr.length > 3 ? 15 : 0) + Math.min(20, avgTxn / 5)
    );

    addRing(arr, "cycle", risk);

    for (const m of arr) {
      addPattern(m, `cycle_length_${minLen}`);
    }
  }

  // -----------------------------
  // SMURFING
  // -----------------------------
  for (const s of smurfResults) {
    if (isLegitimateAccount(s.accountId, transactions)) continue;

    const members = canonical([
      s.accountId,
      ...s.counterparties.slice(0, 30),
    ]);

    const risk = Math.min(
      100,
      50 + Math.min(40, s.counterparties.length * 2)
    );

    addRing(members, s.type, risk);
    addPattern(s.accountId, s.type);

    if ((graph.txnCount.get(s.accountId) ?? 0) > 20) {
      addPattern(s.accountId, "high_velocity");
    }
  }

  // -----------------------------
  // SHELL CHAINS
  // -----------------------------
  for (const chain of shellChains) {
    const risk = Math.min(
      100,
      40 + Math.min(35, chain.length * 5)
    );

    addRing(chain, "shell_chain", risk);

    for (const m of chain) {
      addPattern(m, "shell_chain");
    }
  }

  // Apply ring deduplication to remove near-duplicates and subsets
  const collapsed = collapseNearDuplicateRings([...ringsByKey.values()]);

  // Sort rings by risk_score descending, then by member count descending
  collapsed.sort(
    (a, b) =>
      b.risk_score - a.risk_score ||
      b.member_accounts.length - a.member_accounts.length ||
      a.key.localeCompare(b.key)
  );

  // Pattern priority for single pattern_type (RIFT spec: must be one keyword only)
  const patternPriority: Record<string, number> = {
    "cycle": 4,
    "fan_in": 3,
    "fan_out": 3,
    "shell_chain": 2,
  };

  const fraudRings: FraudRing[] = collapsed.map(
    (ring, i) => {
      // Get the highest priority pattern type (single keyword per RIFT spec)
      const primaryPattern = [...ring.pattern_types].sort(
        (a, b) => (patternPriority[b] || 0) - (patternPriority[a] || 0)
      )[0] || "cycle";

      return {
        ring_id: `RING_${String(i + 1).padStart(3, "0")}`,
        member_accounts: ring.member_accounts,
        pattern_type: primaryPattern,
        risk_score: ring.risk_score,
      };
    }
  );

  const ringLookup = new Map<string, FraudRing>();
  for (const ring of fraudRings) {
    for (const m of ring.member_accounts) {
      const existing = ringLookup.get(m);
      if (!existing || ring.risk_score > existing.risk_score) {
        ringLookup.set(m, ring);
      }
    }
  }

  const suspiciousAccounts: SuspiciousAccount[] = [];

  for (const [accountId, patternSet] of accountPatterns) {
    const patterns = [...patternSet];
    const ring = ringLookup.get(accountId);

    let score = scoreAccount(
      accountId,
      patterns,
      graph.txnCount,
      ring?.risk_score
    );

    if (isLegitimateAccount(accountId, transactions)) {
      score = Math.max(0, score - 40);
    }

    if (score <= 0) continue;

    suspiciousAccounts.push({
      account_id: accountId,
      suspicion_score: safeRound2(score),
      detected_patterns: patterns.sort((a, b) => a.localeCompare(b)),
      ring_id: ring?.ring_id ?? "UNASSIGNED",
    });
  }

  suspiciousAccounts.sort(
    (a, b) =>
      b.suspicion_score - a.suspicion_score ||
      a.account_id.localeCompare(b.account_id)
  );

  return {
    suspicious_accounts: suspiciousAccounts,
    fraud_rings: fraudRings,
    summary: {
      total_accounts_analyzed: graph.accounts.size,
      suspicious_accounts_flagged: suspiciousAccounts.length,
      fraud_rings_detected: fraudRings.length,
      processing_time_seconds: processingTime,
    },
  };
}

// ----------------------------------------------------
// RING DEDUPLICATION - Removes near-duplicates and subsets
// ----------------------------------------------------
function collapseNearDuplicateRings(rings: InternalRing[]): InternalRing[] {
  // Sort by member count (desc) then risk score (desc) to keep larger rings
  const sorted = [...rings].sort(
    (a, b) =>
      b.member_accounts.length - a.member_accounts.length ||
      b.risk_score - a.risk_score
  );

  const kept: InternalRing[] = [];

  for (const candidate of sorted) {
    const candidateSet = new Set(candidate.member_accounts);
    let merged = false;

    for (const existing of kept) {
      const existingSet = new Set(existing.member_accounts);

      // Calculate overlap
      const overlap = candidate.member_accounts.filter((m) =>
        existingSet.has(m)
      ).length;

      // Check for exact match
      const isExactMatch =
        overlap === candidate.member_accounts.length &&
        overlap === existing.member_accounts.length;

      // Check if candidate is a subset of existing
      const isSubset =
        overlap === candidate.member_accounts.length &&
        existing.member_accounts.length > candidate.member_accounts.length;

      // Calculate Jaccard similarity
      const unionSize = new Set([...candidate.member_accounts, ...existing.member_accounts]).size;
      const jaccard = overlap / unionSize;

      // Merge if exact match, subset, or very high similarity (>= 85%)
      if (isExactMatch || isSubset || jaccard >= 0.85) {
        // Keep the higher risk score
        existing.risk_score = safeRound2(
          Math.max(existing.risk_score, candidate.risk_score)
        );
        // Add all pattern types
        for (const p of candidate.pattern_types) {
          existing.pattern_types.add(p);
        }
        merged = true;
        break;
      }
    }

    if (!merged) {
      kept.push({
        key: candidate.key,
        member_accounts: [...candidate.member_accounts],
        pattern_types: new Set(candidate.pattern_types),
        risk_score: candidate.risk_score,
      });
    }
  }

  return kept;
}

function scoreAccount(
  id: string,
  patterns: string[],
  txnCount: Map<string, number>,
  ringRisk?: number
): number {
  let score = 0;

  if (patterns.some(p => p.startsWith("cycle"))) score += 45;
  if (patterns.includes("fan_in")) score += 35;
  if (patterns.includes("fan_out")) score += 35;
  if (patterns.includes("shell_chain")) score += 30;

  if (patterns.length >= 2) score += 8;
  if (patterns.length >= 3) score += 4;

  const tx = txnCount.get(id) ?? 0;
  if (tx > 0) {
    score += Math.min(15, Math.log10(tx + 1) * 5);
  }

  if (ringRisk) {
    score += ringRisk * 0.1;
  }

  return Math.min(100, score);
}


