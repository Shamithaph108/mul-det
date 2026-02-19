import type { Transaction } from "./types";

/**
 * Return true if this account exhibits patterns of a LEGITIMATE high-volume account:
 *   1. Payroll   — sends to many recipients with highly uniform amounts (CV < 5%)
 *   2. Merchant  — receives from many senders, rarely sends out (receive ratio > 90%)
 *   3. Utility   — receives very high volume of round-number amounts
 */
export function isLegitimateAccount(accountId: string, transactions: Transaction[]): boolean {
  const sent     = transactions.filter((t) => t.sender_id   === accountId);
  const received = transactions.filter((t) => t.receiver_id === accountId);
  const total    = sent.length + received.length;
  if (!total) return false;

  // Payroll: many recipients, very uniform send amounts
  if (sent.length >= 15) {
    const cv = coefficientOfVariation(sent.map((t) => t.amount));
    if (cv < 0.05) return true;
  }

  // Merchant: overwhelmingly incoming, rarely sends
  if (received.length >= 30 && received.length / total > 0.90) return true;

  // Utility/subscription: high volume of round amounts
  if (received.length >= 50) {
    const roundFrac = received.filter((t) => t.amount % 5 === 0).length / received.length;
    if (roundFrac > 0.85) return true;
  }

  return false;
}

function coefficientOfVariation(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (!mean) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}
