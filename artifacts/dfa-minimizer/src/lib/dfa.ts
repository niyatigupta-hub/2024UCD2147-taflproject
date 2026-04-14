export interface DFA {
  states: string[];
  alphabet: string[];
  transitions: Record<string, Record<string, string>>;
  startState: string;
  acceptStates: string[];
}

export type StepType =
  | "remove_unreachable"
  | "initial_partition"
  | "refine"
  | "stable"
  | "build_result";

export interface RefinementStep {
  type: StepType;
  title: string;
  description: string;
  partition: string[][];
  splitGroupIndex?: number;
  splitBySymbol?: string;
  newGroups?: string[][];
  splitterGroup?: string[];
  workingStates?: string[];
  unreachable?: string[];
  resultDFA?: DFA;
  stateMap?: Record<string, string>;
  iteration?: number;
}

export interface MinimizationResult {
  steps: RefinementStep[];
  minimizedDFA: DFA;
  stateMap: Record<string, string>;
  equivalenceClasses: string[][];
  unreachableStates: string[];
  isAlreadyMinimal: boolean;
}

function getReachable(dfa: DFA): Set<string> {
  const visited = new Set<string>([dfa.startState]);
  const queue = [dfa.startState];
  while (queue.length > 0) {
    const s = queue.shift()!;
    for (const sym of dfa.alphabet) {
      const t = dfa.transitions[s]?.[sym];
      if (t && !visited.has(t)) {
        visited.add(t);
        queue.push(t);
      }
    }
  }
  return visited;
}

function partitionIndex(state: string, partition: string[][]): number {
  return partition.findIndex((g) => g.includes(state));
}

export function minimize(dfa: DFA): MinimizationResult {
  const steps: RefinementStep[] = [];

  // Step 1: Remove unreachable states
  const reachable = getReachable(dfa);
  const unreachable = dfa.states.filter((s) => !reachable.has(s));
  const workingStates = dfa.states.filter((s) => reachable.has(s));

  steps.push({
    type: "remove_unreachable",
    title: "Step 1 — Remove Unreachable States",
    description:
      unreachable.length === 0
        ? `All ${workingStates.length} states are reachable from '${dfa.startState}'. Nothing to remove.`
        : `States {${unreachable.join(", ")}} cannot be reached from '${dfa.startState}' and are discarded. Working with ${workingStates.length} states.`,
    partition: workingStates.map((s) => [s]),
    workingStates,
    unreachable,
  });

  const wDFA: DFA = {
    ...dfa,
    states: workingStates,
    acceptStates: dfa.acceptStates.filter((s) => reachable.has(s)),
  };

  // Step 2: Initial partition {accept, non-accept}
  const accept = workingStates.filter((s) => wDFA.acceptStates.includes(s));
  const nonAccept = workingStates.filter(
    (s) => !wDFA.acceptStates.includes(s)
  );
  let P: string[][] = [];
  if (accept.length > 0) P.push([...accept]);
  if (nonAccept.length > 0) P.push([...nonAccept]);

  steps.push({
    type: "initial_partition",
    title: "Step 2 — Initial Partition",
    description: `Split states into accept group {${accept.join(", ") || "∅"}} and non-accept group {${nonAccept.join(", ") || "∅"}}. Partition refinement starts with P = { ${P.map((g) => "{" + g.join(",") + "}").join(", ")} }.`,
    partition: P.map((g) => [...g]),
  });

  // Step 3: Partition refinement
  let changed = true;
  let iter = 1;

  while (changed) {
    changed = false;
    for (let gi = 0; gi < P.length; gi++) {
      const group = P[gi];
      if (group.length <= 1) continue;

      for (const sym of wDFA.alphabet) {
        // Try to split group by symbol sym
        // Two states p, q are in the same partition block iff δ(p,sym) and δ(q,sym) land in the same block
        const buckets: Map<number, string[]> = new Map();
        for (const state of group) {
          const target = wDFA.transitions[state]?.[sym];
          const blockIdx =
            target !== undefined ? partitionIndex(target, P) : -1;
          if (!buckets.has(blockIdx)) buckets.set(blockIdx, []);
          buckets.get(blockIdx)!.push(state);
        }

        if (buckets.size > 1) {
          // Split!
          const newGroups = [...buckets.values()];
          const splitterSym = sym;
          const oldGroup = [...group];

          const descParts = newGroups.map((ng) => {
            const sample = ng[0];
            const target = wDFA.transitions[sample]?.[sym];
            const blockIdx = target !== undefined ? partitionIndex(target, P) : -1;
            const destBlock =
              blockIdx >= 0
                ? "{" + P[blockIdx].join(",") + "}"
                : "∅ (no transition)";
            return `  {${ng.join(",")}} → ${destBlock} on '${splitterSym}'`;
          });

          steps.push({
            type: "refine",
            title: `Step 3 (Iteration ${iter}) — Split on '${splitterSym}'`,
            description: `Group {${oldGroup.join(", ")}} is split by symbol '${splitterSym}' because its states go to different blocks:\n${descParts.join("\n")}\nPartition becomes P = { ${[...P.slice(0, gi), ...newGroups, ...P.slice(gi + 1)].map((g) => "{" + g.join(",") + "}").join(", ")} }`,
            partition: [...P.slice(0, gi), ...newGroups, ...P.slice(gi + 1)].map((g) => [...g]),
            splitGroupIndex: gi,
            splitBySymbol: sym,
            newGroups: newGroups.map((g) => [...g]),
            iteration: iter,
          });

          P = [...P.slice(0, gi), ...newGroups, ...P.slice(gi + 1)];
          changed = true;
          iter++;
          break; // restart outer loop since P changed
        }
      }
      if (changed) break;
    }
  }

  steps.push({
    type: "stable",
    title: "Step 4 — Partition Stable",
    description: `No group can be split further. Final partition has ${P.length} equivalence class${P.length !== 1 ? "es" : ""}:\n${P.map((g, i) => `  Class ${i + 1}: {${g.join(", ")}}`).join("\n")}`,
    partition: P.map((g) => [...g]),
    iteration: iter,
  });

  // Step 4: Build minimized DFA
  const stateMap: Record<string, string> = {};
  const newNames: string[] = [];
  for (const group of P) {
    const sorted = [...group].sort();
    const name = sorted.length === 1 ? sorted[0] : `{${sorted.join(",")}}`;
    for (const s of group) stateMap[s] = name;
    newNames.push(name);
  }

  const newTransitions: Record<string, Record<string, string>> = {};
  for (const group of P) {
    const rep = group[0];
    const name = stateMap[rep];
    newTransitions[name] = {};
    for (const sym of wDFA.alphabet) {
      const t = wDFA.transitions[rep]?.[sym];
      if (t) newTransitions[name][sym] = stateMap[t];
    }
  }

  const minDFA: DFA = {
    states: newNames,
    alphabet: wDFA.alphabet,
    transitions: newTransitions,
    startState: stateMap[wDFA.startState],
    acceptStates: [...new Set(wDFA.acceptStates.map((s) => stateMap[s]))],
  };

  const isAlreadyMinimal =
    minDFA.states.length === wDFA.states.length && unreachable.length === 0;

  steps.push({
    type: "build_result",
    title: "Step 5 — Construct Minimized DFA",
    description: isAlreadyMinimal
      ? `The DFA is already minimal — no states could be merged. Result: ${minDFA.states.length} states.`
      : `Map each equivalence class to one state. Reduced from ${wDFA.states.length} → ${minDFA.states.length} states.\n${P.map((g) => `  {${g.join(",")}} → ${stateMap[g[0]]}`).join("\n")}`,
    partition: P.map((g) => [...g]),
    resultDFA: minDFA,
    stateMap,
  });

  return {
    steps,
    minimizedDFA: minDFA,
    stateMap,
    equivalenceClasses: P,
    unreachableStates: unreachable,
    isAlreadyMinimal,
  };
}

export const EXAMPLES: Record<string, { label: string; dfa: DFA }> = {
  classic: {
    label: "Classic 5→3 states",
    dfa: {
      states: ["q0", "q1", "q2", "q3", "q4"],
      alphabet: ["0", "1"],
      transitions: {
        q0: { "0": "q1", "1": "q2" },
        q1: { "0": "q1", "1": "q3" },
        q2: { "0": "q1", "1": "q2" },
        q3: { "0": "q1", "1": "q4" },
        q4: { "0": "q1", "1": "q2" },
      },
      startState: "q0",
      acceptStates: ["q2", "q4"],
    },
  },
  textbook: {
    label: "Textbook 6→4 states",
    dfa: {
      states: ["a", "b", "c", "d", "e", "f"],
      alphabet: ["0", "1"],
      transitions: {
        a: { "0": "b", "1": "c" },
        b: { "0": "a", "1": "d" },
        c: { "0": "e", "1": "f" },
        d: { "0": "e", "1": "f" },
        e: { "0": "e", "1": "f" },
        f: { "0": "f", "1": "f" },
      },
      startState: "a",
      acceptStates: ["c", "d", "e"],
    },
  },
  unreachable: {
    label: "With unreachable state",
    dfa: {
      states: ["A", "B", "C", "D", "X"],
      alphabet: ["a", "b"],
      transitions: {
        A: { a: "B", b: "C" },
        B: { a: "B", b: "D" },
        C: { a: "B", b: "C" },
        D: { a: "B", b: "D" },
        X: { a: "A", b: "A" },
      },
      startState: "A",
      acceptStates: ["D"],
    },
  },
  minimal: {
    label: "Already minimal",
    dfa: {
      states: ["s0", "s1", "s2"],
      alphabet: ["a", "b"],
      transitions: {
        s0: { a: "s1", b: "s0" },
        s1: { a: "s1", b: "s2" },
        s2: { a: "s1", b: "s0" },
      },
      startState: "s0",
      acceptStates: ["s2"],
    },
  },
};
