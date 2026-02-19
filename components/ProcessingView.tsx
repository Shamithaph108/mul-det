"use client";

interface Props { fileName: string; progress: number; }

const STEPS = [
  "Parsing CSV structure...",
  "Building transaction graph...",
  "Running cycle detection (DFS)...",
  "Scanning smurfing patterns...",
  "Tracing shell networks...",
  "Scoring suspicious accounts...",
  "Assembling fraud rings...",
];

export default function ProcessingView({ fileName, progress }: Props) {
  const stepIdx = Math.floor((progress / 100) * STEPS.length);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10 animate-fade-in">
      {/* Radar animation */}
      <div className="relative w-32 h-32">
        {[0,1,2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: "var(--green)",
              opacity: 0.2 - i * 0.06,
              transform: `scale(${1 + i * 0.35})`,
              animation: `pulseRing 2s ease-out ${i * 0.5}s infinite`,
            }}
          />
        ))}
        <div
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: "var(--green)", opacity: 0.4 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "var(--green)", boxShadow: "0 0 16px var(--green)" }}
          />
        </div>
        {/* Sweep line */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ opacity: 0.6 }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(var(--green) 0deg, transparent 60deg, transparent 360deg)`,
              animation: "spin 2s linear infinite",
            }}
          />
        </div>
      </div>

      <div className="text-center space-y-3">
        <p className="mono text-xs tracking-[0.3em]" style={{ color: "var(--green)" }}>
          ANALYZING NETWORK
        </p>
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>{fileName}</p>
        <p className="mono text-xs" style={{ color: "var(--text-mid)" }}>
          {STEPS[Math.min(stepIdx, STEPS.length - 1)]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-72">
        <div
          className="h-px w-full relative overflow-hidden"
          style={{ background: "var(--border2)" }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--green-dim), var(--green))",
              boxShadow: "0 0 8px var(--green)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="mono text-[10px]" style={{ color: "var(--text-dim)" }}>0%</span>
          <span className="mono text-[10px]" style={{ color: "var(--green)" }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
