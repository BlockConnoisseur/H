/** Pure implementation of the published matched-block score. Inputs must come
 * from an authenticated evaluator; statistics alone never approve a finding. */
export type Block = { baseline: [number, number]; candidate: [number, number] };
export type Workload = { id: string; weight: number; blocks: Block[] };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function quantile(sorted: number[], p: number) {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  return sorted[lo] + (sorted[Math.ceil(pos)] - sorted[lo]) * (pos - lo);
}
// Reproducible bootstrap PRNG, never used for cryptography or proof randomness.
function generator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function measureHost(
  workloads: Workload[],
  seed: number,
  resamples = 10_000,
) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error("A uint32 bootstrap seed is required.");
  if (!Number.isInteger(resamples) || resamples < 10_000 || resamples > 100_000)
    throw new Error("Use 10,000–100,000 predeclared resamples.");
  if (
    !workloads.length ||
    new Set(workloads.map((w) => w.id)).size !== workloads.length ||
    Math.abs(workloads.reduce((s, w) => s + w.weight, 0) - 1) > 1e-9
  )
    throw new Error(
      "Unique workloads with weights summing to one are required.",
    );
  const logs = workloads.map((w) => {
    if (!Number.isFinite(w.weight) || w.weight <= 0 || w.blocks.length < 30)
      throw new Error(
        "Each workload needs a positive weight and at least 30 matched blocks.",
      );
    return w.blocks.map((b) => {
      if (
        b.baseline.length !== 2 ||
        b.candidate.length !== 2 ||
        [...b.baseline, ...b.candidate].some(
          (t) => !Number.isFinite(t) || t <= 0,
        )
      )
        throw new Error(
          "Every block needs two positive finite timings per implementation.",
        );
      return mean(b.candidate.map(Math.log)) - mean(b.baseline.map(Math.log));
    });
  });
  const rng = generator(seed);
  const reductions: number[] = [];
  const perCase = workloads.map(() => [] as number[]);
  for (let k = 0; k < resamples; k++) {
    let weighted = 0;
    for (let j = 0; j < logs.length; j++) {
      const values = logs[j];
      let sum = 0;
      for (let i = 0; i < values.length; i++)
        sum += values[Math.floor(rng() * values.length)];
      const average = sum / values.length;
      weighted += workloads[j].weight * average;
      perCase[j].push(100 * Math.expm1(average));
    }
    reductions.push(-100 * Math.expm1(weighted));
  }
  reductions.sort((a, b) => a - b);
  const cases = workloads.map((w, j) => ({
    id: w.id,
    slowdownUpper95: quantile(
      perCase[j].sort((a, b) => a - b),
      0.95,
    ),
  }));
  return {
    estimate:
      -100 *
      Math.expm1(
        logs.reduce((s, x, j) => s + workloads[j].weight * mean(x), 0),
      ),
    lower95: quantile(reductions, 0.025),
    upper95: quantile(reductions, 0.975),
    cases,
    maxSlowdownUpper: Math.max(...cases.map((c) => c.slowdownUpper95)),
    seed,
    resamples,
  };
}
