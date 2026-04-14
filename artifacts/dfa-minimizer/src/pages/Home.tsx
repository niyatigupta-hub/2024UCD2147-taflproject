import { useState, useMemo } from "react";
import type { DFA, RefinementStep } from "@/lib/dfa";
import { minimize, EXAMPLES } from "@/lib/dfa";
import DFAGraph from "@/components/DFAGraph";

// ─── Palette for partition groups ──────────────────────────────────────────
const GROUP_PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
];

function groupColorMap(partition: string[][]): Record<string, string> {
  const m: Record<string, string> = {};
  partition.forEach((grp, i) => {
    const c = GROUP_PALETTE[i % GROUP_PALETTE.length];
    grp.forEach((s) => (m[s] = c));
  });
  return m;
}

// ─── Partition pill ─────────────────────────────────────────────────────────
function PartitionDisplay({ partition }: { partition: string[][] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {partition.map((grp, i) => (
        <span
          key={i}
          className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold border"
          style={{
            borderColor: GROUP_PALETTE[i % GROUP_PALETTE.length] + "70",
            backgroundColor: GROUP_PALETTE[i % GROUP_PALETTE.length] + "18",
            color: GROUP_PALETTE[i % GROUP_PALETTE.length],
          }}
        >
          {"{"}
          {grp.join(", ")}
          {"}"}
        </span>
      ))}
    </div>
  );
}

// ─── Step card ──────────────────────────────────────────────────────────────
const STEP_ICONS: Record<RefinementStep["type"], string> = {
  remove_unreachable: "🔍",
  initial_partition: "✂️",
  refine: "⚡",
  stable: "🔒",
  build_result: "✅",
};

interface StepCardProps {
  step: RefinementStep;
  idx: number;
  total: number;
  origDFA: DFA;
}

function StepCard({ step, idx, total, origDFA }: StepCardProps) {
  const colors = groupColorMap(step.partition);
  const hiStates =
    step.type === "remove_unreachable" && step.unreachable?.length
      ? new Set(step.unreachable)
      : undefined;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-slate-700/60">
        <span className="text-2xl mt-0.5">{STEP_ICONS[step.type]}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-tight">{step.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {idx + 1} of {total}
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed font-mono">
          {step.description}
        </p>
      </div>

      {/* Current partition pills */}
      {step.type !== "build_result" && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Current partition P
          </p>
          <PartitionDisplay partition={step.partition} />
        </div>
      )}

      {/* Remove unreachable: show graph with bad states highlighted */}
      {step.type === "remove_unreachable" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">
              Original DFA
            </p>
            <div className="flex justify-center overflow-auto">
              <DFAGraph dfa={origDFA} highlightStates={hiStates}
                groupColors={hiStates ? Object.fromEntries([...(hiStates ?? [])].map((s) => [s, "#ef4444"])) : undefined}
              />
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">
              After removal
            </p>
            <div className="flex justify-center overflow-auto">
              <DFAGraph
                dfa={{ ...origDFA, states: step.workingStates ?? origDFA.states, acceptStates: origDFA.acceptStates.filter((s) => step.workingStates?.includes(s) ?? true) }}
              />
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <span className="text-xs text-emerald-400 font-mono">
                Reachable: {"{"}
                {step.workingStates?.join(", ")}
                {"}"}
              </span>
              {(step.unreachable?.length ?? 0) > 0 && (
                <span className="text-xs text-rose-400 font-mono">
                  Removed: {"{"}
                  {step.unreachable?.join(", ")}
                  {"}"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refine: graph with colored groups + split detail */}
      {step.type === "refine" && step.newGroups && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {step.newGroups.map((ng, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border"
                style={{
                  borderColor: GROUP_PALETTE[(step.splitGroupIndex ?? 0) + i] + "50",
                  backgroundColor: GROUP_PALETTE[(step.splitGroupIndex ?? 0) + i] + "10",
                }}
              >
                <p
                  className="text-xs font-mono font-bold mb-1"
                  style={{ color: GROUP_PALETTE[(step.splitGroupIndex ?? 0) + i] }}
                >
                  Sub-group {i + 1}: {"{"}
                  {ng.join(", ")}
                  {"}"}
                </p>
                <p className="text-xs text-slate-400">
                  on <code className="text-amber-400">'{step.splitBySymbol}'</code> →{" "}
                  goes to same partition block
                </p>
              </div>
            ))}
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 flex justify-center overflow-auto">
            <DFAGraph dfa={{ ...origDFA, states: step.workingStates ?? origDFA.states, acceptStates: origDFA.acceptStates.filter((s) => step.workingStates?.includes(s) ?? true) }} groupColors={colors} compact />
          </div>
        </div>
      )}

      {/* Stable: final partition graph */}
      {step.type === "stable" && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 flex justify-center overflow-auto">
          <DFAGraph
            dfa={{ ...origDFA, states: step.workingStates ?? origDFA.states, acceptStates: origDFA.acceptStates.filter((s) => step.workingStates?.includes(s) ?? true) }}
            groupColors={colors}
          />
        </div>
      )}

      {/* Build result: before/after */}
      {step.type === "build_result" && step.resultDFA && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
                Original ({origDFA.states.length} states)
              </p>
              <div className="flex justify-center overflow-auto">
                <DFAGraph dfa={origDFA} compact />
              </div>
            </div>
            <div className="bg-slate-900/60 border border-emerald-700/40 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider text-center mb-3">
                Minimized ({step.resultDFA.states.length} states)
              </p>
              <div className="flex justify-center overflow-auto">
                <DFAGraph dfa={step.resultDFA} compact />
              </div>
            </div>
          </div>

          {/* Minimized transition table */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 overflow-auto">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Transition Table
            </p>
            <table className="text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-3 py-1.5 text-left text-slate-400 font-semibold">δ</th>
                  {step.resultDFA.alphabet.map((sym) => (
                    <th key={sym} className="px-4 py-1.5 text-center text-slate-300">
                      '{sym}'
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {step.resultDFA.states.map((s) => (
                  <tr key={s} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-3 py-1.5">
                      <span className={
                        step.resultDFA!.acceptStates.includes(s)
                          ? "text-emerald-400"
                          : s === step.resultDFA!.startState
                          ? "text-indigo-400"
                          : "text-slate-300"
                      }>
                        {s === step.resultDFA!.startState ? "→ " : "  "}
                        {step.resultDFA!.acceptStates.includes(s) ? "*" : " "}
                        {s}
                      </span>
                    </td>
                    {step.resultDFA!.alphabet.map((sym) => (
                      <td key={sym} className="px-4 py-1.5 text-center text-slate-300">
                        {step.resultDFA!.transitions[s]?.[sym] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* State mapping */}
          {step.stateMap && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                State Mapping
              </p>
              <div className="flex flex-wrap gap-2">
                {step.partition.map((grp, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg border text-xs font-mono"
                    style={{
                      borderColor: GROUP_PALETTE[i % GROUP_PALETTE.length] + "60",
                      backgroundColor: GROUP_PALETTE[i % GROUP_PALETTE.length] + "12",
                      color: GROUP_PALETTE[i % GROUP_PALETTE.length],
                    }}
                  >
                    {"{"}
                    {grp.join(", ")}
                    {"}"} <span className="text-slate-400">→</span>{" "}
                    <span className="font-bold">
                      {step.stateMap![grp[0]]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial partition: colored graph */}
      {step.type === "initial_partition" && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 flex justify-center overflow-auto">
          <DFAGraph
            dfa={{ ...origDFA, states: step.workingStates ?? origDFA.states, acceptStates: origDFA.acceptStates.filter((s) => step.workingStates?.includes(s) ?? true) }}
            groupColors={colors}
          />
        </div>
      )}
    </div>
  );
}

// ─── DFA Editor ─────────────────────────────────────────────────────────────
function Editor({ dfa, onChange }: { dfa: DFA; onChange: (d: DFA) => void }) {
  const [ns, setNs] = useState("");
  const [na, setNa] = useState("");

  const addState = () => {
    const s = ns.trim();
    if (!s || dfa.states.includes(s)) return;
    onChange({ ...dfa, states: [...dfa.states, s] });
    setNs("");
  };
  const removeState = (s: string) => {
    if (dfa.states.length <= 1) return;
    const states = dfa.states.filter((x) => x !== s);
    const trans = Object.fromEntries(
      Object.entries(dfa.transitions)
        .filter(([k]) => k !== s)
        .map(([k, v]) => [
          k,
          Object.fromEntries(Object.entries(v).filter(([, val]) => val !== s)),
        ])
    );
    onChange({
      ...dfa,
      states,
      transitions: trans,
      startState: dfa.startState === s ? states[0] : dfa.startState,
      acceptStates: dfa.acceptStates.filter((x) => x !== s),
    });
  };
  const addSym = () => {
    const sym = na.trim();
    if (!sym || dfa.alphabet.includes(sym)) return;
    onChange({ ...dfa, alphabet: [...dfa.alphabet, sym] });
    setNa("");
  };
  const removeSym = (sym: string) => {
    if (dfa.alphabet.length <= 1) return;
    const trans = Object.fromEntries(
      Object.entries(dfa.transitions).map(([k, v]) => {
        const nv = { ...v };
        delete nv[sym];
        return [k, nv];
      })
    );
    onChange({ ...dfa, alphabet: dfa.alphabet.filter((x) => x !== sym), transitions: trans });
  };
  const setTrans = (from: string, sym: string, to: string) => {
    const t = { ...dfa.transitions, [from]: { ...dfa.transitions[from] } };
    if (to) t[from][sym] = to; else delete t[from][sym];
    onChange({ ...dfa, transitions: t });
  };
  const toggleAccept = (s: string) =>
    onChange({
      ...dfa,
      acceptStates: dfa.acceptStates.includes(s)
        ? dfa.acceptStates.filter((x) => x !== s)
        : [...dfa.acceptStates, s],
    });

  return (
    <div className="space-y-5">
      {/* Examples */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(EXAMPLES).map(([k, ex]) => (
          <button key={k} onClick={() => onChange(ex.dfa)}
            className="px-3 py-1.5 text-xs bg-indigo-950/60 border border-indigo-700/40 text-indigo-300 rounded-lg hover:bg-indigo-900/50 transition-colors">
            {ex.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* States */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">States</p>
          <div className="flex gap-2">
            <input value={ns} onChange={(e) => setNs(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addState()}
              placeholder="e.g. q0" className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            <button onClick={addState} className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dfa.states.map((s) => (
              <span key={s} className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${dfa.acceptStates.includes(s) ? "bg-emerald-900/30 border-emerald-700 text-emerald-300" : s === dfa.startState ? "bg-indigo-900/30 border-indigo-700 text-indigo-300" : "bg-slate-800 border-slate-600 text-slate-300"}`}>
                {s === dfa.startState && <span className="text-indigo-400">→</span>}
                {dfa.acceptStates.includes(s) && <span className="text-emerald-400">*</span>}
                {s}
                <button onClick={() => removeState(s)} className="text-slate-500 hover:text-rose-400 ml-0.5">×</button>
              </span>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-slate-500">Start state</p>
            <select value={dfa.startState} onChange={(e) => onChange({ ...dfa, startState: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500">
              {dfa.states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="text-xs text-slate-500 pt-1">Accept states — click to toggle</p>
            <div className="flex flex-wrap gap-1.5">
              {dfa.states.map((s) => (
                <button key={s} onClick={() => toggleAccept(s)}
                  className={`px-2 py-0.5 rounded border text-xs font-mono transition-colors ${dfa.acceptStates.includes(s) ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-slate-600 text-slate-400 hover:border-emerald-600"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alphabet */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alphabet</p>
          <div className="flex gap-2">
            <input value={na} onChange={(e) => setNa(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSym()}
              placeholder="e.g. 0, 1, a" className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            <button onClick={addSym} className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dfa.alphabet.map((sym) => (
              <span key={sym} className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-600 bg-slate-800 text-xs font-mono text-slate-300">
                '{sym}'
                <button onClick={() => removeSym(sym)} className="text-slate-500 hover:text-rose-400">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Transition table */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Transition Function δ
        </p>
        <div className="overflow-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                <th className="px-3 py-2 text-left text-xs text-slate-500">δ</th>
                {dfa.alphabet.map((sym) => (
                  <th key={sym} className="px-3 py-2 text-center text-xs font-mono text-slate-300">'{sym}'</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dfa.states.map((from, i) => (
                <tr key={from} className={i % 2 === 0 ? "bg-slate-900/40" : "bg-slate-800/20"}>
                  <td className="px-3 py-1.5 font-mono text-xs border-r border-slate-700">
                    <span className={dfa.acceptStates.includes(from) ? "text-emerald-400" : from === dfa.startState ? "text-indigo-400" : "text-slate-300"}>
                      {from === dfa.startState ? "→ " : "  "}{dfa.acceptStates.includes(from) ? "* " : "  "}{from}
                    </span>
                  </td>
                  {dfa.alphabet.map((sym) => (
                    <td key={sym} className="px-2 py-1 text-center">
                      <select value={dfa.transitions[from]?.[sym] ?? ""}
                        onChange={(e) => setTrans(from, sym, e.target.value)}
                        className="w-20 px-2 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-indigo-500 font-mono">
                        <option value="">—</option>
                        {dfa.states.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
type Tab = "editor" | "steps" | "result";

export default function Home() {
  const [dfa, setDfa] = useState<DFA>(EXAMPLES.classic.dfa);
  const [tab, setTab] = useState<Tab>("editor");
  const [step, setStep] = useState(0);

  const result = useMemo(() => {
    if (!dfa.states.length || !dfa.alphabet.length || !dfa.startState) return null;
    try { return minimize(dfa); } catch { return null; }
  }, [dfa]);

  const steps = result?.steps ?? [];

  const handleRun = () => {
    setStep(0);
    setTab("steps");
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));
  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));

  // Compute workingStates for step graphs
  const enrichedSteps = useMemo(() => {
    if (!result) return steps;
    const unreachableSet = new Set(result.unreachableStates);
    const ws = dfa.states.filter((s) => !unreachableSet.has(s));
    return steps.map((st) => ({ ...st, workingStates: st.workingStates ?? ws }));
  }, [result, steps, dfa.states]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-5 py-3 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold select-none">
              DFA
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                DFA Minimizer
              </h1>
              <p className="text-xs text-slate-500">Partition Refinement (Hopcroft's Algorithm)</p>
            </div>
          </div>
          {result && (
            <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
              <span className="px-2.5 py-1 bg-slate-800 rounded-full text-slate-400">
                {dfa.states.length} states
              </span>
              <span className="text-slate-600">→</span>
              <span className="px-2.5 py-1 bg-emerald-900/30 border border-emerald-700/40 rounded-full text-emerald-400 font-bold">
                {result.minimizedDFA.states.length} states
              </span>
              {result.isAlreadyMinimal ? (
                <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400">Already minimal</span>
              ) : (
                <span className="px-2.5 py-1 bg-violet-900/30 border border-violet-700/40 rounded-full text-violet-300 font-semibold">
                  −{dfa.states.length - result.minimizedDFA.states.length} states
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-800 px-5 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex gap-0">
          {(["editor", "steps", "result"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => t !== "steps" ? setTab(t) : result && handleRun()}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t === "steps" ? "Step-by-Step" : t === "result" ? "Final Result" : "Editor"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 py-6">

          {/* ── EDITOR ── */}
          {tab === "editor" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Define DFA</p>
                  <Editor dfa={dfa} onChange={setDfa} />
                </div>
                <div className="xl:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Preview</p>
                  <div className="flex-1 flex items-center justify-center overflow-auto">
                    <DFAGraph dfa={dfa} />
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <button onClick={handleRun} disabled={!result}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-colors">
                  Run Partition Refinement →
                </button>
              </div>
            </div>
          )}

          {/* ── STEPS ── */}
          {tab === "steps" && result && (
            <div className="space-y-4">
              {/* Step nav bar */}
              <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                <button onClick={prev} disabled={step === 0}
                  className="px-4 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-lg transition-colors">
                  ← Prev
                </button>
                <div className="flex-1 flex gap-1.5 overflow-auto py-0.5">
                  {enrichedSteps.map((s, i) => (
                    <button key={i} onClick={() => setStep(i)} title={s.title}
                      className={`flex-shrink-0 h-2 rounded-full transition-all ${
                        i === step ? "bg-indigo-500 w-8" : i < step ? "bg-indigo-800 w-2.5" : "bg-slate-700 w-2.5"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {step + 1} / {enrichedSteps.length}
                </span>
                <button onClick={next} disabled={step === enrichedSteps.length - 1}
                  className="px-4 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-lg transition-colors">
                  Next →
                </button>
              </div>

              {/* Step chips */}
              <div className="flex flex-wrap gap-1.5">
                {enrichedSteps.map((s, i) => (
                  <button key={i} onClick={() => setStep(i)}
                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                      i === step
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                    }`}>
                    {s.title}
                  </button>
                ))}
              </div>

              {/* Active step */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <StepCard
                  step={enrichedSteps[step]}
                  idx={step}
                  total={enrichedSteps.length}
                  origDFA={dfa}
                />
              </div>

              {/* Algorithm legend */}
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
                <p className="text-xs font-semibold text-slate-500 mb-2">Partition Refinement (Hopcroft's Algorithm)</p>
                <div className="text-xs text-slate-600 space-y-0.5 leading-relaxed font-mono">
                  <p>1. Remove states not reachable from q₀</p>
                  <p>2. P ← {"{ F, Q\\F }"} (accept vs non-accept)</p>
                  <p>3. For each group G in P, for each symbol a:</p>
                  <p className="ml-4">If δ(p,a) and δ(q,a) land in different blocks → split G into sub-groups</p>
                  <p className="ml-4">Repeat until no more splits occur in any iteration</p>
                  <p>4. Partition is stable — all groups are indistinguishable</p>
                  <p>5. Each stable block → one state in the minimized DFA</p>
                </div>
              </div>
            </div>
          )}

          {/* ── RESULT ── */}
          {tab === "result" && result && (
            <div className="space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-slate-900/60 border border-slate-700 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Original</p>
                  <p className="text-3xl font-bold text-white">{dfa.states.length}</p>
                  <p className="text-xs text-slate-600 mt-0.5">states</p>
                </div>
                <div className="p-4 bg-emerald-900/20 border border-emerald-700/40 rounded-xl">
                  <p className="text-xs text-emerald-500 uppercase tracking-wider mb-1">Minimized</p>
                  <p className="text-3xl font-bold text-emerald-400">{result.minimizedDFA.states.length}</p>
                  <p className="text-xs text-emerald-700 mt-0.5">states</p>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-700 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Removed</p>
                  <p className="text-3xl font-bold text-amber-400">{dfa.states.length - result.minimizedDFA.states.length}</p>
                  <p className="text-xs text-slate-600 mt-0.5">states</p>
                </div>
              </div>

              {/* Graphs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
                    Original DFA
                  </p>
                  <div className="flex justify-center overflow-auto"><DFAGraph dfa={dfa} /></div>
                </div>
                <div className="bg-slate-900/60 border border-emerald-700/30 rounded-xl p-5">
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider text-center mb-3">
                    Minimized DFA
                  </p>
                  <div className="flex justify-center overflow-auto"><DFAGraph dfa={result.minimizedDFA} /></div>
                </div>
              </div>

              {/* Equivalence classes */}
              <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Equivalence Classes</p>
                <div className="flex flex-wrap gap-2">
                  {result.equivalenceClasses.map((cls, i) => (
                    <div key={i} className="px-3 py-2 rounded-lg border text-xs font-mono"
                      style={{
                        borderColor: GROUP_PALETTE[i % GROUP_PALETTE.length] + "60",
                        backgroundColor: GROUP_PALETTE[i % GROUP_PALETTE.length] + "12",
                        color: GROUP_PALETTE[i % GROUP_PALETTE.length],
                      }}>
                      {"{"}
                      {cls.join(", ")}
                      {"}"} <span className="text-slate-500">→</span>{" "}
                      <span className="text-white font-bold">{result.stateMap[cls[0]]}</span>
                      {result.minimizedDFA.acceptStates.includes(result.stateMap[cls[0]]) && (
                        <span className="text-emerald-400 ml-1">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Minimized transition table */}
              <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-5 overflow-auto">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Minimized Transition Table
                </p>
                <table className="text-sm font-mono">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-3 py-1.5 text-left text-slate-400">δ</th>
                      {result.minimizedDFA.alphabet.map((sym) => (
                        <th key={sym} className="px-4 py-1.5 text-center text-slate-300">'{sym}'</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.minimizedDFA.states.map((s) => (
                      <tr key={s} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                        <td className="px-3 py-1.5">
                          <span className={result.minimizedDFA.acceptStates.includes(s) ? "text-emerald-400" : s === result.minimizedDFA.startState ? "text-indigo-400" : "text-slate-300"}>
                            {s === result.minimizedDFA.startState ? "→ " : "  "}
                            {result.minimizedDFA.acceptStates.includes(s) ? "*" : " "} {s}
                          </span>
                        </td>
                        {result.minimizedDFA.alphabet.map((sym) => (
                          <td key={sym} className="px-4 py-1.5 text-center text-slate-300">
                            {result.minimizedDFA.transitions[s]?.[sym] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state if no result */}
          {(tab === "steps" || tab === "result") && !result && (
            <div className="text-center py-16 text-slate-500">
              <p className="text-4xl mb-3">🤔</p>
              <p>Define a valid DFA in the Editor first.</p>
              <button onClick={() => setTab("editor")} className="mt-4 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                Go to Editor
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
