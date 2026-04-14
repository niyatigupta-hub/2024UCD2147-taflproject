# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### DFA Minimization Visualizer (`artifacts/dfa-minimizer`)
- **Type**: react-vite, frontend-only (no backend required)
- **Preview path**: `/`
- **Description**: Interactive step-by-step DFA minimization visualizer using the Myhill-Nerode / Table-Filling algorithm
- **Features**:
  - Define custom DFAs via editor (states, alphabet, transitions, start/accept states)
  - Live SVG graph preview of DFA
  - 4 built-in example DFAs
  - Step-by-step visualization:
    1. Remove unreachable states
    2. Initial partition (accept vs non-accept)
    3. Distinguishability table (Myhill-Nerode)
    4. Iterative pair marking with propagation
    5. Equivalence classes
    6. Final minimized DFA side-by-side comparison
  - Final result page with state mapping and before/after graphs
- **Key files**:
  - `src/lib/dfa.ts` — DFA types, minimization algorithm, example DFAs
  - `src/components/DFAGraph.tsx` — SVG-based DFA graph renderer
  - `src/components/DistinguishabilityTable.tsx` — Table-filling table
  - `src/components/DFAEditor.tsx` — DFA definition editor
  - `src/components/StepViewer.tsx` — Per-step visualization component
  - `src/pages/Home.tsx` — Main page with tabs

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
