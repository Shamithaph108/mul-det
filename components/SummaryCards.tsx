import type { DetectionSummary } from "@/lib/types";

interface Props { summary: DetectionSummary; }

export default function SummaryCards({ summary }: Props) {
  const cards = [
    { label: "ACCOUNTS ANALYZED",   value: summary.total_accounts_analyzed.toLocaleString(), accent: "var(--green)"  },
    { label: "SUSPICIOUS FLAGGED",  value: summary.suspicious_accounts_flagged.toLocaleString(), accent: "var(--red)" },
    { label: "FRAUD RINGS",         value: summary.fraud_rings_detected.toLocaleString(), accent: "var(--orange)" },
    { label: "PROCESSING TIME",     value: `${summary.processing_time_seconds}s`, accent: "var(--cyan)" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className="relative border overflow-hidden animate-fade-up"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg3)",
            padding: "20px",
            animationDelay: `${i * 0.08}s`,
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: c.accent, opacity: 0.6 }}
          />
          <div className="text-3xl font-light mb-1 mono" style={{ color: c.accent, letterSpacing: "-0.02em" }}>
            {c.value}
          </div>
          <div className="mono text-[10px] tracking-[0.2em]" style={{ color: "var(--text-dim)" }}>
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
