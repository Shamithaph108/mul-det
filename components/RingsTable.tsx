"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { FraudRing } from "@/lib/types";

const PAT: Record<string, { label: string; color: string }> = {
  cycle: { label: "CYCLE", color: "#ff3355" },
  fan_out: { label: "FAN-OUT", color: "#ff9900" },
  fan_in: { label: "FAN-IN", color: "#ff9900" },
  shell_chain: { label: "SHELL", color: "#cc44ff" },
};

export default function RingsTable({ rings }: { rings: FraudRing[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (!rings.length) {
    return (
      <div
        className="border px-6 py-10 text-center mono text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
      >
        No fraud rings detected.
      </div>
    );
  }

  return (
    <div className="border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "var(--bg3)", borderBottom: "1px solid var(--border)" }}>
            {["", "RING ID", "PATTERN TYPE", "MEMBER COUNT", "RISK SCORE", "MEMBER ACCOUNT IDs"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left mono font-normal"
                style={{ color: "var(--text-dim)", letterSpacing: "0.15em" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rings.map((ring, i) => {
            const isOpen = open.has(ring.ring_id);
            const pat = PAT[ring.pattern_type] ?? { label: ring.pattern_type.toUpperCase(), color: "#5a9a6a" };
            const riskColor = ring.risk_score > 80 ? "#ff3355" : ring.risk_score > 60 ? "#ff9900" : "#00aa55";

            return (
              <>
                <tr
                  key={ring.ring_id}
                  className="cursor-pointer transition-colors"
                  style={{
                    background: i % 2 === 0 ? "var(--bg2)" : "var(--bg)",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onClick={() => toggle(ring.ring_id)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "var(--bg2)" : "var(--bg)";
                  }}
                >
                  <td className="px-3 py-3" style={{ color: "var(--text-dim)" }}>
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </td>
                  <td className="px-4 py-3 mono font-bold" style={{ color: "var(--green)" }}>
                    {ring.ring_id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="mono text-[10px] px-2 py-0.5 border font-bold"
                      style={{ borderColor: `${pat.color}55`, color: pat.color }}
                    >
                      {pat.label}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#e0ffe8" }}>
                    {ring.member_accounts.length}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1" style={{ background: "var(--border2)" }}>
                        <div style={{ width: `${ring.risk_score}%`, height: "100%", background: riskColor }} />
                      </div>
                      <span className="mono" style={{ color: riskColor }}>{ring.risk_score.toFixed(1)}</span>
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 mono"
                    style={{ color: "var(--text-mid)", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={ring.member_accounts.join(", ")}
                  >
                    {ring.member_accounts.join(", ")}
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`${ring.ring_id}_exp`} style={{ background: "#050809", borderBottom: "1px solid var(--border)" }}>
                    <td colSpan={6} className="px-6 py-4">
                      <p className="mono text-[10px] mb-2" style={{ color: "var(--text-dim)", letterSpacing: "0.2em" }}>
                        MEMBER ACCOUNT IDs (comma-separated):
                      </p>
                      <p className="mono text-[10px]" style={{ color: "var(--green-dim)", lineHeight: 1.6, wordBreak: "break-word" }}>
                        {ring.member_accounts.join(", ")}
                      </p>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
