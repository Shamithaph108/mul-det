"use client";

import { Shield } from "lucide-react";

interface Props { onReset?: () => void; }

export default function Header({ onReset }: Props) {
  return (
    <header
      className="sticky top-0 z-40 border-b px-6 py-4 flex items-center justify-between"
      style={{
        borderColor: "var(--border)",
        background: "rgba(6,10,13,0.92)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 flex items-center justify-center border"
          style={{ borderColor: "var(--green)", color: "var(--green)" }}
        >
          <Shield size={14} />
        </div>
        <div>
          <div className="mono text-xs tracking-[0.2em]" style={{ color: "var(--green)" }}>
            FORENSICS ENGINE
          </div>
          <div className="mono text-[10px] tracking-widest" style={{ color: "var(--text-dim)" }}>
            RIFT 2026 // FINANCIAL CRIME DETECTION
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)", animation: "blink 2s step-end infinite" }}
          />
          <span className="mono text-[10px]" style={{ color: "var(--text-dim)" }}>ONLINE</span>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="mono text-[10px] px-3 py-1.5 border transition-all"
            style={{ borderColor: "var(--border2)", color: "var(--text-mid)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--green-dim)";
              (e.currentTarget as HTMLElement).style.color = "var(--green)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-mid)";
            }}
          >
            ← NEW SCAN
          </button>
        )}
      </div>
    </header>
  );
}
