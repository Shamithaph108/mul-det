"use client";

import { useState, useCallback, useRef } from "react";
import type { DetectionResult } from "@/lib/types";
import Header        from "@/components/Header";
import UploadZone    from "@/components/UploadZone";
import ProcessingView from "@/components/ProcessingView";
import Dashboard     from "@/components/Dashboard";

type AppState = "idle" | "processing" | "results" | "error";

export default function Home() {
  const [appState, setAppState]   = useState<AppState>("idle");
  const [result,   setResult]     = useState<DetectionResult | null>(null);
  const [fileName, setFileName]   = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const [progress, setProgress]   = useState(0);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMsg("Please upload a .csv file.");
      setAppState("error");
      return;
    }

    setFileName(file.name);
    setAppState("processing");
    setProgress(0);

    // Fake progress ticks while we wait
    const tick = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 12, 88)), 300);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/analyze", { method: "POST", body: form });
      clearInterval(tick);

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? `HTTP ${res.status}`);
      }

      setProgress(100);
      const data: DetectionResult = await res.json();
      setTimeout(() => { setResult(data); setAppState("results"); }, 400);
    } catch (e: unknown) {
      clearInterval(tick);
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setAppState("error");
    }
  }, []);

  const reset = () => {
    setAppState("idle");
    setResult(null);
    setFileName("");
    setErrorMsg("");
    setProgress(0);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)",
        }}
      />

      <Header onReset={appState === "results" ? reset : undefined} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {appState === "idle" && (
          <div className="animate-fade-up">
            <Hero />
            <UploadZone onFile={handleFile} />
            <SampleNote />
          </div>
        )}

        {appState === "processing" && (
          <ProcessingView fileName={fileName} progress={progress} />
        )}

        {appState === "error" && (
          <ErrorView message={errorMsg} onRetry={reset} />
        )}

        {appState === "results" && result && (
          <Dashboard result={result} fileName={fileName} onReset={reset} />
        )}
      </main>

      <Footer />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Hero() {
  return (
    <div className="mb-14">
      <p className="mono text-xs tracking-[0.4em] mb-5" style={{ color: "var(--green-dim)" }}>
        // GRAPH-BASED FINANCIAL CRIME DETECTION v1.0
      </p>
      <h1 className="text-6xl font-light leading-none mb-3 tracking-tight" style={{ fontFamily: "'Syne Mono', monospace" }}>
        FOLLOW
      </h1>
      <div className="relative inline-block mb-8">
        <h1
          className="text-6xl font-light leading-none tracking-tight"
          style={{ fontFamily: "'Syne Mono', monospace", color: "var(--green)" }}
        >
          THE MONEY
        </h1>
        {/* Glitch layers */}
        <span
          aria-hidden
          className="absolute inset-0 text-6xl font-light leading-none tracking-tight"
          style={{
            fontFamily: "'Syne Mono', monospace",
            color: "var(--red)",
            animation: "glitch1 4s infinite",
          }}
        >
          THE MONEY
        </span>
        <span
          aria-hidden
          className="absolute inset-0 text-6xl font-light leading-none tracking-tight"
          style={{
            fontFamily: "'Syne Mono', monospace",
            color: "var(--cyan)",
            animation: "glitch2 4s infinite",
          }}
        >
          THE MONEY
        </span>
      </div>
      <p className="text-sm leading-relaxed max-w-lg" style={{ color: "var(--text-mid)" }}>
        Upload transaction CSV data to automatically expose money muling networks through
        cycle detection, smurfing analysis, and layered shell chain identification.
      </p>
    </div>
  );
}

function SampleNote() {
  return (
    <p className="mono text-xs mt-6 text-center" style={{ color: "var(--text-dim)" }}>
      Required columns: transaction_id · sender_id · receiver_id · amount · timestamp
    </p>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fade-in">
      <div
        className="border px-8 py-6 max-w-lg w-full"
        style={{ borderColor: "var(--red)", background: "rgba(255,51,85,0.05)" }}
      >
        <p className="mono text-xs mb-2" style={{ color: "var(--red)" }}>// ERROR</p>
        <p className="text-sm" style={{ color: "#ff8899" }}>{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="mono text-xs px-6 py-3 border transition-colors"
        style={{ borderColor: "var(--border2)", color: "var(--text-mid)" }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.borderColor = "var(--green-dim)";
          (e.target as HTMLElement).style.color = "var(--green)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.borderColor = "var(--border2)";
          (e.target as HTMLElement).style.color = "var(--text-mid)";
        }}
      >
        ← TRY AGAIN
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer
      className="border-t px-8 py-4 flex items-center justify-between"
      style={{ borderColor: "var(--border)", background: "var(--bg2)" }}
    >
      <span className="mono text-xs" style={{ color: "var(--text-dim)" }}>
        RIFT 2026 · Graph Theory Track · Money Muling Detection
      </span>
      <span className="mono text-xs" style={{ color: "var(--text-dim)" }}>
        POST /api/analyze · POST /api/rings/:id · GET /api/health
      </span>
    </footer>
  );
}
