import { useMemo } from "react";
import type { DFA } from "@/lib/dfa";

interface DFAGraphProps {
  dfa: DFA;
  groupColors?: Record<string, string>;
  highlightStates?: Set<string>;
  compact?: boolean;
}

const STATE_R = 24;
const COMPACT_R = 18;

function layoutStates(states: string[], compact: boolean) {
  const n = states.length;
  const r = compact ? COMPACT_R : STATE_R;
  if (n === 0) return { pos: {}, w: 200, h: 200, r };
  if (n === 1) return { pos: { [states[0]]: { x: 90, y: 90 } }, w: 180, h: 180, r };
  const ring = Math.max(compact ? 70 : 100, n * (compact ? 22 : 28));
  const cx = ring + 55;
  const cy = ring + 55;
  const pos: Record<string, { x: number; y: number }> = {};
  states.forEach((s, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    pos[s] = { x: cx + ring * Math.cos(a), y: cy + ring * Math.sin(a) };
  });
  return { pos, w: 2 * (ring + 55), h: 2 * (ring + 55), r };
}

export default function DFAGraph({ dfa, groupColors, highlightStates, compact = false }: DFAGraphProps) {
  const { pos, w, h, r } = useMemo(
    () => layoutStates(dfa.states, compact),
    [dfa.states, compact]
  );

  const edgeMap = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const from of dfa.states) {
      for (const sym of dfa.alphabet) {
        const to = dfa.transitions[from]?.[sym];
        if (!to) continue;
        const k = `${from}|${to}`;
        if (!m[k]) m[k] = [];
        m[k].push(sym);
      }
    }
    return m;
  }, [dfa]);

  if (dfa.states.length === 0) {
    return <div className="text-slate-500 text-sm p-4 text-center">No states</div>;
  }

  const getColor = (s: string) => {
    if (groupColors?.[s]) return groupColors[s];
    if (dfa.acceptStates.includes(s)) return "#10b981";
    if (s === dfa.startState) return "#6366f1";
    return "#334155";
  };

  const renderedEdgePairs = new Set<string>();

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ maxWidth: "100%", height: "auto", overflow: "visible" }}
    >
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="#64748b" />
        </marker>
        <marker id="arr-hi" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="#f59e0b" />
        </marker>
      </defs>

      {/* Start arrow */}
      {pos[dfa.startState] && (
        <line
          x1={pos[dfa.startState].x - r - 28}
          y1={pos[dfa.startState].y}
          x2={pos[dfa.startState].x - r - 3}
          y2={pos[dfa.startState].y}
          stroke="#6366f1" strokeWidth={2} markerEnd="url(#arr)"
        />
      )}

      {/* Edges */}
      {Object.entries(edgeMap).map(([key, syms]) => {
        const [from, to] = key.split("|");
        if (!pos[from] || !pos[to]) return null;
        const label = syms.sort().join(",");
        const isSelf = from === to;

        if (isSelf) {
          const lp = pos[from];
          const loopR = r * 1.3;
          return (
            <g key={key}>
              <path
                d={`M ${lp.x - loopR * 0.5} ${lp.y - r}
                    A ${loopR} ${loopR} 0 1 1 ${lp.x + loopR * 0.5} ${lp.y - r}`}
                fill="none" stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arr)"
              />
              <text x={lp.x} y={lp.y - r - loopR * 1.1}
                textAnchor="middle" fontSize={10} fill="#94a3b8" fontFamily="monospace">
                {label}
              </text>
            </g>
          );
        }

        const pairKey = [from, to].sort().join("|");
        const hasBoth = !!edgeMap[`${to}|${from}`] && from !== to;
        const isSecond = renderedEdgePairs.has(pairKey);
        if (!renderedEdgePairs.has(pairKey)) renderedEdgePairs.add(pairKey);

        const x1 = pos[from].x, y1 = pos[from].y;
        const x2 = pos[to].x, y2 = pos[to].y;
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / dist, ny = dy / dist;
        const sx = x1 + nx * r, sy = y1 + ny * r;
        const ex = x2 - nx * (r + 4), ey = y2 - ny * (r + 4);

        const curveDir = hasBoth ? (isSecond ? -1 : 1) : 0;
        const bend = curveDir * 22;
        const mx = (sx + ex) / 2 - ny * bend;
        const my = (sy + ey) / 2 + nx * bend;

        if (hasBoth) {
          return (
            <g key={key}>
              <path d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
                fill="none" stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arr)" />
              <rect x={mx - 10} y={my - 8} width={20} height={13}
                fill="rgba(15,23,42,0.9)" rx={3} />
              <text x={mx} y={my + 1} textAnchor="middle" fontSize={10}
                fill="#94a3b8" fontFamily="monospace">{label}</text>
            </g>
          );
        }

        const lx = (sx + ex) / 2;
        const ly = (sy + ey) / 2 - 8;
        return (
          <g key={key}>
            <line x1={sx} y1={sy} x2={ex} y2={ey}
              stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arr)" />
            <rect x={lx - 10} y={ly - 8} width={20} height={13}
              fill="rgba(15,23,42,0.9)" rx={3} />
            <text x={lx} y={ly + 1} textAnchor="middle" fontSize={10}
              fill="#94a3b8" fontFamily="monospace">{label}</text>
          </g>
        );
      })}

      {/* States */}
      {dfa.states.map((s) => {
        if (!pos[s]) return null;
        const { x, y } = pos[s];
        const fill = getColor(s);
        const isAccept = dfa.acceptStates.includes(s);
        const isHi = highlightStates?.has(s);
        return (
          <g key={s}>
            {isAccept && (
              <circle cx={x} cy={y} r={r + 5} fill="none"
                stroke={fill} strokeWidth={1.5} opacity={0.45} />
            )}
            {isHi && (
              <circle cx={x} cy={y} r={r + 8} fill="none"
                stroke="#f59e0b" strokeWidth={2} opacity={0.6}
                strokeDasharray="4 2" />
            )}
            <circle cx={x} cy={y} r={r} fill={fill}
              stroke={isHi ? "#f59e0b" : fill} strokeWidth={isHi ? 2.5 : 2} />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={s.length > 5 ? 9 : s.length > 3 ? 10 : 12}
              fontWeight="600" fill="#fff" fontFamily="monospace">
              {s}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
