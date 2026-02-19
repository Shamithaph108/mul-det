"use client";

import { useRef, useState, useCallback } from "react";
import { Upload } from "lucide-react";

interface Props { onFile: (f: File) => void; }

export default function UploadZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      className="relative cursor-pointer transition-all duration-300"
      style={{
        border: `2px dashed ${dragging ? "var(--green)" : "var(--border2)"}`,
        background: dragging ? "rgba(0,255,136,0.03)" : "var(--bg2)",
        padding: "72px 32px",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
      />

      {/* Corner markers */}
      {(["tl","tr","bl","br"] as const).map((pos) => (
        <div
          key={pos}
          className="absolute w-4 h-4"
          style={{
            top:    pos.startsWith("t") ? 0 : "auto",
            bottom: pos.startsWith("b") ? 0 : "auto",
            left:   pos.endsWith("l")   ? 0 : "auto",
            right:  pos.endsWith("r")   ? 0 : "auto",
            borderTop:    pos.startsWith("t") ? `2px solid var(--green)` : "none",
            borderBottom: pos.startsWith("b") ? `2px solid var(--green)` : "none",
            borderLeft:   pos.endsWith("l")   ? `2px solid var(--green)` : "none",
            borderRight:  pos.endsWith("r")   ? `2px solid var(--green)` : "none",
          }}
        />
      ))}

      <div className="flex flex-col items-center gap-5">
        <div
          className="w-16 h-16 border flex items-center justify-center"
          style={{
            borderColor: dragging ? "var(--green)" : "var(--border2)",
            color: dragging ? "var(--green)" : "var(--text-mid)",
            transition: "all 0.2s",
          }}
        >
          <Upload size={24} />
        </div>

        <div className="text-center">
          <p className="mono text-sm tracking-widest mb-1" style={{ color: dragging ? "var(--green)" : "#e0ffe8" }}>
            DROP CSV FILE HERE
          </p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            or click to browse
          </p>
        </div>

        <div
          className="mono text-[10px] tracking-[0.15em] text-center"
          style={{ color: "var(--text-dim)" }}
        >
          transaction_id · sender_id · receiver_id · amount · timestamp
        </div>
      </div>
    </div>
  );
}
