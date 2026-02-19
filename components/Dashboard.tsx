"use client";

import { useState } from "react";
import { Download }      from "lucide-react";
import type { DetectionResult } from "@/lib/types";
import SummaryCards      from "@/components/SummaryCards";
import GraphCanvas       from "@/components/GraphCanvas";
import RingsTable        from "@/components/RingsTable";
import AccountsTable     from "@/components/AccountsTable";
import SectionHeader     from "@/components/SectionHeader";

interface Props {
  result: DetectionResult;
  fileName: string;
  onReset: () => void;
}

export default function Dashboard({ result, fileName, onReset }: Props) {
  const handleDownload = () => {
    const out = {
      suspicious_accounts: result.suspicious_accounts,
      fraud_rings: result.fraud_rings,
      summary: result.summary,
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a    = Object.assign(document.createElement("a"), {
      href:     URL.createObjectURL(blob),
      download: `forensics_report_${Date.now()}.json`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-10 animate-fade-up">
      {/* Action bar */}
      <div
        className="flex items-center justify-between border-b pb-5"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <p className="mono text-[10px] tracking-[0.3em] mb-1" style={{ color: "var(--green)" }}>
            // ANALYSIS COMPLETE
          </p>
          <p className="text-sm" style={{ color: "var(--text-mid)" }}>{fileName}</p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 mono text-xs px-5 py-2.5 transition-colors"
          style={{ background: "var(--green)", color: "#000", fontWeight: 600 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--green-mid)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--green)"; }}
        >
          <Download size={13} />
          DOWNLOAD JSON
        </button>
      </div>

      {/* Summary cards */}
      <SummaryCards summary={result.summary} />

      {/* Graph */}
      <div>
        <SectionHeader icon="◈" title="TRANSACTION NETWORK GRAPH" />
        <div
          className="border"
          style={{ borderColor: "var(--border)", background: "var(--bg2)", height: 520 }}
        >
          <GraphCanvas result={result} />
        </div>
      </div>

      {/* Fraud rings */}
      <div>
        <SectionHeader icon="⬡" title="FRAUD RING SUMMARY" badge={result.fraud_rings.length} />
        <RingsTable rings={result.fraud_rings} />
      </div>

      {/* Suspicious accounts */}
      <div>
        <SectionHeader icon="◉" title="SUSPICIOUS ACCOUNTS" badge={result.suspicious_accounts.length} />
        <AccountsTable accounts={result.suspicious_accounts} />
      </div>
    </div>
  );
}
