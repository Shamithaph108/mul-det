interface Props {
  icon: string;
  title: string;
  badge?: number;
}

export default function SectionHeader({ icon, title, badge }: Props) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span style={{ color: "var(--green)", fontSize: 14 }}>{icon}</span>
      <span className="mono text-xs tracking-[0.22em]" style={{ color: "var(--text-mid)" }}>
        {title}
      </span>
      {badge !== undefined && (
        <span
          className="mono text-[10px] px-2 py-0.5 border"
          style={{ borderColor: "var(--border2)", color: "var(--green-dim)" }}
        >
          {badge}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}
