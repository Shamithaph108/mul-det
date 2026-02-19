import type { SuspiciousAccount } from "@/lib/types";

export default function AccountsTable({ accounts }: { accounts: SuspiciousAccount[] }) {
  if (!accounts.length)
    return (
      <div
        className="border px-6 py-10 text-center mono text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
      >
        No suspicious accounts detected.
      </div>
    );

  const display = accounts.slice(0, 25);

  return (
    <div className="border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "var(--bg3)", borderBottom: "1px solid var(--border)" }}>
            {["#", "ACCOUNT ID", "SUSPICION SCORE", "RING ID", "DETECTED PATTERNS"].map((h) => (
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
          {display.map((acc, i) => {
            const rc = acc.suspicion_score > 70 ? "#ff3355" : acc.suspicion_score > 40 ? "#ff9900" : "#00aa55";
            return (
              <tr
                key={acc.account_id}
                style={{
                  background: i % 2 === 0 ? "var(--bg2)" : "var(--bg)",
                  borderBottom: "1px solid var(--border)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "var(--bg2)" : "var(--bg)"; }}
              >
                <td className="px-4 py-3 mono" style={{ color: "var(--text-dim)" }}>{i + 1}</td>
                <td className="px-4 py-3 mono font-bold" style={{ color: "var(--green)" }}>
                  {acc.account_id}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-20 h-1.5 flex-shrink-0" style={{ background: "var(--border2)" }}>
                      <div
                        style={{
                          width: `${acc.suspicion_score}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${rc}99, ${rc})`,
                        }}
                      />
                    </div>
                    <span className="mono font-bold" style={{ color: rc }}>
                      {acc.suspicion_score.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 mono" style={{ color: "var(--text-mid)" }}>
                  {acc.ring_id}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {acc.detected_patterns.map((p) => (
                      <span
                        key={p}
                        className="mono text-[10px] px-1.5 py-0.5 border"
                        style={{ borderColor: "var(--border2)", color: "#3a7a4a" }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {accounts.length > 25 && (
        <div
          className="px-4 py-3 border-t mono text-xs text-center"
          style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
        >
          Showing top 25 of {accounts.length} — download JSON for full list
        </div>
      )}
    </div>
  );
}
