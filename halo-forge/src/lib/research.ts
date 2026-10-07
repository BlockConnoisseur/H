// Shared, versioned research plans. These are hypotheses, not measured improvements.
export const RESEARCH_VERSION = "cpu-001-methods-v1";
export const SOURCE_REVISION = "4afa97f221b439450626f2fd03b390e252341e67";
export const methods = [
  {
    id: "S1-representation",
    track: "S1",
    name: "Cache scalar representations",
    hypothesis:
      "Convert each scalar to bytes once per MSM invocation and reuse it across bucket passes.",
    measure:
      "Count representation conversions; include preparation time and peak RSS in full-prover comparisons.",
    guardrail:
      "Keep scalar interpretation and bucket selection unchanged; never reuse private scalar material across sessions.",
  },
  {
    id: "S1-window",
    track: "S1",
    name: "Reuse public window offsets",
    hypothesis:
      "Precompute public window offsets and masks once per invocation instead of rebuilding them per scalar.",
    measure:
      "Profile window extraction and total proving time, including precomputation overhead.",
    guardrail:
      "Derive offsets only from public parameters; preserve boundary and partial-window semantics.",
  },
  {
    id: "S1-layout",
    track: "S1",
    name: "Improve representation locality",
    hypothesis:
      "Test contiguous storage of cached scalar representations to reduce repeated traversal overhead.",
    measure:
      "Compare cache behavior, allocation size and complete proof time against the pinned baseline.",
    guardrail:
      "Preserve scalar order, arithmetic and erasure; do not introduce unsafe code or dependencies.",
  },
  {
    id: "S2-scratch",
    track: "S2",
    name: "Reuse invocation scratch storage",
    hypothesis:
      "Reuse correctly reset bucket storage within one MSM invocation instead of repeatedly allocating it.",
    measure:
      "Record allocation counts, reset cost, peak RSS and full-prover time.",
    guardrail:
      "Every reused bucket must be reset correctly; no secret data may survive across sessions.",
  },
  {
    id: "S2-capacity",
    track: "S2",
    name: "Pre-size bucket capacity",
    hypothesis:
      "Reserve bucket capacity from public problem dimensions to avoid intermediate growth allocations.",
    measure:
      "Compare allocation/reallocation counts and RSS including small-workload regressions.",
    guardrail:
      "Capacity comes only from public lengths; keep initialization and overflow checks.",
  },
  {
    id: "S2-lifetime",
    track: "S2",
    name: "Shorten temporary buffer lifetimes",
    hypothesis:
      "Release redundant MSM temporaries earlier to reduce simultaneous live memory without extra recomputation.",
    measure:
      "Track peak live buffers, peak RSS and total proof time including deallocation work.",
    guardrail:
      "Retain all required initialization and secret erasure; no cross-invocation cache.",
  },
  {
    id: "S3-chunks",
    track: "S3",
    name: "Balance public-size work chunks",
    hypothesis:
      "Partition public-length MSM inputs into more evenly sized chunks under the same thread allowance.",
    measure:
      "Measure worker idle time, scheduling cost and end-to-end proof latency.",
    guardrail:
      "Partition only on public lengths; maintain deterministic arithmetic and the evaluator's thread cap.",
  },
  {
    id: "S3-cutoff",
    track: "S3",
    name: "Tune the parallel-work cutoff",
    hypothesis:
      "Use a public input-size cutoff to avoid scheduling overhead on small MSM tasks.",
    measure:
      "Compare fixed size bands including single-thread regression cases and total proof time.",
    guardrail:
      "No host or benchmark detection; the rule must depend only on public dimensions.",
  },
  {
    id: "S3-overhead",
    track: "S3",
    name: "Reduce task dispatch overhead",
    hypothesis:
      "Coalesce adjacent public-size work units where dispatch cost outweighs useful computation.",
    measure:
      "Record task counts, dispatch overhead, load imbalance and complete proof time.",
    guardrail:
      "Do not increase threads, alter compiler flags or change secret-dependent control flow.",
  },
] as const;
export type ResearchAssignment = {
  version: string;
  sourceRevision: string;
  track: string;
  methodId: string;
  actions: number;
  threads: number;
  key: string;
};
const cases = [8, 2, 4, 16] as const;
export function assignmentFor(
  methodId: string,
  actions = 8,
  threads = 4,
): ResearchAssignment {
  const method = methods.find((m) => m.id === methodId);
  if (
    !method ||
    !(cases as readonly number[]).includes(actions) ||
    ![4, 1].includes(threads)
  )
    throw new Error("Unknown research experiment.");
  return {
    version: RESEARCH_VERSION,
    sourceRevision: SOURCE_REVISION,
    track: method.track,
    methodId,
    actions,
    threads,
    key: `${RESEARCH_VERSION}/${methodId}/${actions}a/${threads}t`,
  };
}
export function allocateAssignment(
  agents: {
    example: boolean;
    archivedAt?: string;
    assignment?: ResearchAssignment;
  }[],
  track = "auto",
) {
  const active = agents
    .filter((a) => !a.example && !a.archivedAt && a.assignment)
    .map((a) => a.assignment!);
  const occupied = new Set(active.map((a) => a.key));
  const choices = methods
    .filter((m) => track === "auto" || m.track === track)
    .map((m, index) => ({
      method: m,
      index,
      trackCount: active.filter((a) => a.track === m.track).length,
      methodCount: active.filter((a) => a.methodId === m.id).length,
    }))
    .sort(
      (a, b) =>
        a.trackCount - b.trackCount ||
        a.methodCount - b.methodCount ||
        a.index - b.index,
    );
  for (const { method } of choices)
    for (const threads of [4, 1])
      for (const actions of cases) {
        const assignment = assignmentFor(method.id, actions, threads);
        if (!occupied.has(assignment.key)) return assignment;
      }
  return null; // Explicit waitlist instead of silently selling duplicate coverage.
}
export function researchBrief(assignment: ResearchAssignment) {
  const expected = assignmentFor(
    assignment.methodId,
    assignment.actions,
    assignment.threads,
  );
  if (
    (Object.keys(expected) as (keyof ResearchAssignment)[]).some(
      (key) => expected[key] !== assignment[key],
    )
  )
    throw new Error(
      "Assignment manifest does not match the pinned research catalog.",
    );
  const method = methods.find((m) => m.id === assignment.methodId)!;
  return {
    ...assignment,
    method: method.name,
    hypothesis: method.hypothesis,
    measurements: method.measure,
    guardrail: method.guardrail,
    sourcePath: "halo2_proofs/src/arithmetic.rs",
    focus: `${assignment.actions}-Action development proofs, ${assignment.threads} thread${assignment.threads === 1 ? "" : "s"}`,
    finalEvaluation:
      "All 2/4/8/16-Action workloads on both hosts; the focused development case never replaces final eligibility tests.",
    noveltyRule:
      "Read prior experiments for this method, record a new hypothesis, and stop duplicates before spending on compilation.",
  };
}
