"use client";

import { useEffect, useRef, useMemo } from "react";
import type { DetectionResult } from "@/lib/types";

interface NodeData {
  id: string; x: number; y: number; vx: number; vy: number;
  suspicious: boolean; score: number; ringId: string | null; color: string;
}
interface EdgeData { src: string; tgt: string; suspicious: boolean; }

const RING_PALETTE = ["#ff3355","#ff9900","#cc44ff","#00e5ff","#ff6600","#88ff00"];

export default function GraphCanvas({ result }: { result: DetectionResult }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>();
  const hoverRef   = useRef<NodeData | null>(null);

  const suspMap = useMemo(() => {
    const m = new Map<string, { score: number; ring_id: string; patterns: string[] }>();
    for (const a of result.suspicious_accounts) m.set(a.account_id, { score: a.suspicion_score, ring_id: a.ring_id, patterns: a.detected_patterns });
    return m;
  }, [result]);

  const ringColorMap = useMemo(() => {
    const m = new Map<string, string>();
    result.fraud_rings.forEach((r, i) => m.set(r.ring_id, RING_PALETTE[i % RING_PALETTE.length]));
    return m;
  }, [result]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W   = canvas.offsetWidth;
    const H   = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;

    // Sample accounts (suspicious first, up to 120)
    const allAccs = [...new Set([
      ...result.suspicious_accounts.map(a => a.account_id),
      ...result.suspicious_accounts.flatMap(a => {
        const ring = result.fraud_rings.find(r => r.ring_id === a.ring_id);
        return ring?.member_accounts ?? [];
      }),
    ])].slice(0, 120);

    const dispSet = new Set(allAccs);

    const nodes: NodeData[] = allAccs.map(id => {
      const info = suspMap.get(id);
      const color = info ? (ringColorMap.get(info.ring_id) ?? "#ff3355") : "#1a4a2a";
      return {
        id, color,
        x: W / 2 + (Math.random() - 0.5) * W * 0.65,
        y: H / 2 + (Math.random() - 0.5) * H * 0.65,
        vx: 0, vy: 0,
        suspicious: !!info,
        score: info?.score ?? 0,
        ringId: info?.ring_id ?? null,
      };
    });

    const edges: EdgeData[] = result.suspicious_accounts
      .flatMap(acc => {
        const ring = result.fraud_rings.find(r => r.ring_id === acc.ring_id);
        if (!ring) return [];
        return ring.member_accounts
          .filter(m => m !== acc.account_id && dispSet.has(m))
          .slice(0, 3)
          .map(m => ({ src: acc.account_id, tgt: m, suspicious: true }));
      })
      .slice(0, 350);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Force simulation
    let simStep = 0;
    const REPULSION = 900, LINK_DIST = 75, LINK_K = 0.25, DAMPING = 0.84;

    const simulate = () => {
      const α = 0.12;
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
          const d  = Math.sqrt(dx*dx + dy*dy) || 1;
          const f  = (REPULSION / (d * d)) * α;
          nodes[i].vx -= dx/d*f; nodes[i].vy -= dy/d*f;
          nodes[j].vx += dx/d*f; nodes[j].vy += dy/d*f;
        }
      }
      // Links
      for (const e of edges) {
        const s = nodeMap.get(e.src), t = nodeMap.get(e.tgt);
        if (!s || !t) continue;
        const dx = t.x - s.x, dy = t.y - s.y;
        const d  = Math.sqrt(dx*dx + dy*dy) || 1;
        const f  = ((d - LINK_DIST) * LINK_K) * α;
        s.vx += dx/d*f; s.vy += dy/d*f;
        t.vx -= dx/d*f; t.vy -= dy/d*f;
      }
      // Center gravity
      for (const n of nodes) {
        n.vx += (W/2 - n.x) * 0.0015 * α;
        n.vy += (H/2 - n.y) * 0.0015 * α;
        n.vx *= DAMPING; n.vy *= DAMPING;
        n.x = Math.max(16, Math.min(W-16, n.x + n.vx));
        n.y = Math.max(16, Math.min(H-16, n.y + n.vy));
      }
    };

    const draw = () => {
      ctx.fillStyle = "#080d10";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(0,80,30,0.10)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // Edges
      for (const e of edges) {
        const s = nodeMap.get(e.src), t = nodeMap.get(e.tgt);
        if (!s || !t) continue;
        const ang = Math.atan2(t.y - s.y, t.x - s.x);
        const ex  = t.x - Math.cos(ang) * 7, ey = t.y - Math.sin(ang) * 7;
        ctx.strokeStyle = e.suspicious ? "rgba(255,51,85,0.35)" : "rgba(0,160,70,0.12)";
        ctx.lineWidth = e.suspicious ? 1.2 : 0.7;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(ex, ey); ctx.stroke();
        if (e.suspicious) {
          ctx.fillStyle = "rgba(255,51,85,0.55)";
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - 6*Math.cos(ang-0.4), ey - 6*Math.sin(ang-0.4));
          ctx.lineTo(ex - 6*Math.cos(ang+0.4), ey - 6*Math.sin(ang+0.4));
          ctx.closePath(); ctx.fill();
        }
      }

      // Nodes
      const now = Date.now() / 1000;
      for (const n of nodes) {
        const hov = hoverRef.current?.id === n.id;
        const r   = hov ? 9 : n.suspicious ? 6 : 3.5;

        if (n.suspicious) {
          // Glow
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.5);
          g.addColorStop(0, n.color + "55"); g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(n.x, n.y, r*3.5, 0, Math.PI*2); ctx.fill();
          // Pulse
          const pr = r * (1.8 + Math.sin(now * 2.5 + n.x * 0.01) * 0.4);
          ctx.strokeStyle = n.color + "40"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(n.x, n.y, pr, 0, Math.PI*2); ctx.stroke();
        }

        ctx.fillStyle = n.suspicious ? n.color : "#0f2a18";
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2); ctx.fill();

        if (n.suspicious || hov) {
          ctx.strokeStyle = n.suspicious ? n.color : "#00ff88";
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2); ctx.stroke();
        }

        // Label
        if (hov || (n.suspicious && n.score > 70)) {
          ctx.fillStyle = hov ? "#fff" : n.color;
          ctx.font = `${hov ? 11 : 9}px 'Syne Mono', monospace`;
          ctx.textAlign = "center";
          ctx.fillText(n.id.length > 14 ? n.id.slice(-10) : n.id, n.x, n.y - r - 5);
        }
      }

      // Tooltip
      const hov = hoverRef.current;
      if (hov) {
        const info = suspMap.get(hov.id);
        const lines = [
          hov.id,
          info ? `Score: ${info.score.toFixed(1)}` : "Normal account",
          info ? `Ring: ${info.ring_id}` : "",
          ...(info?.patterns ?? []),
        ].filter(Boolean);
        const pad = 8, lh = 15, bw = 190, bh = lines.length * lh + pad * 2;
        const bx = Math.min(hov.x + 12, W - bw - 4);
        const by = Math.max(hov.y - bh - 8, 4);
        ctx.fillStyle   = "rgba(6,10,13,0.96)";
        ctx.strokeStyle = hov.suspicious ? hov.color : "#00ff88";
        ctx.lineWidth   = 1;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.textAlign = "left";
        lines.forEach((l, i) => {
          ctx.fillStyle = i === 0 ? "#fff" : i === 1 ? "#ff8899" : "#3a7a4a";
          ctx.font = `${i === 0 ? "bold " : ""}10px 'Syne Mono', monospace`;
          ctx.fillText(l, bx + pad, by + pad + lh * i + 11);
        });
      }
    };

    const loop = () => {
      if (simStep < 220) { simulate(); simStep++; }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // Mouse interaction
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let found: NodeData | null = null;
      for (const n of nodes) {
        const dx = n.x - mx, dy = n.y - my;
        if (Math.sqrt(dx*dx + dy*dy) < 12) { found = n; break; }
      }
      hoverRef.current  = found;
      canvas.style.cursor = found ? "pointer" : "default";
    };
    canvas.addEventListener("mousemove", onMove);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove", onMove);
    };
  }, [result, suspMap, ringColorMap]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
      <Legend />
    </div>
  );
}

function Legend() {
  const items = [
    { dot: true, color: "#ff3355", label: "Suspicious node" },
    { dot: true, color: "#0f2a18", border: "#2a5a2a", label: "Normal node" },
    { line: true, color: "rgba(255,51,85,0.5)", label: "Suspicious flow" },
  ];
  return (
    <div
      className="absolute bottom-4 left-4 border text-[10px] mono"
      style={{ background: "rgba(6,10,13,0.9)", borderColor: "var(--border)", padding: "10px 12px" }}
    >
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 mb-1.5 last:mb-0">
          {it.dot && (
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: it.color, border: it.border ? `1px solid ${it.border}` : undefined }}
            />
          )}
          {it.line && <div className="w-4 h-px flex-shrink-0" style={{ background: it.color }} />}
          <span style={{ color: "var(--text-mid)" }}>{it.label}</span>
        </div>
      ))}
      <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <span style={{ color: "var(--text-dim)" }}>HOVER NODES FOR DETAILS</span>
      </div>
    </div>
  );
}
