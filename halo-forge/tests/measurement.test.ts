import { test } from "node:test";
import assert from "node:assert/strict";
import { measureHost, type Workload } from "../src/lib/measurement";
const workload = (ratio: number): Workload => ({
  id: "2-actions",
  weight: 1,
  blocks: Array.from({ length: 30 }, () => ({
    baseline: [10, 10],
    candidate: [10 * ratio, 10 * ratio],
  })),
});
test("known 10% time reduction uses matched geometric ratios", () => {
  const r = measureHost([workload(0.9)], 123);
  assert.ok(Math.abs(r.estimate - 10) < 1e-10);
  assert.ok(Math.abs(r.lower95 - 10) < 1e-10);
  assert.ok(Math.abs(r.maxSlowdownUpper + 10) < 1e-10);
});
test("balanced workload score retains per-case regression gate", () => {
  const a = { ...workload(0.8), id: "small", weight: 0.5 };
  const b = { ...workload(1.04), id: "large", weight: 0.5 };
  const r = measureHost([a, b], 123);
  assert.ok(r.estimate > 3);
  assert.ok(r.maxSlowdownUpper > 2);
});
test("bootstrap is deterministic and rejects incomplete or invalid evidence", () => {
  const a = workload(0.95);
  a.blocks[0].candidate = [11, 9];
  assert.deepEqual(measureHost([a], 5), measureHost([a], 5));
  assert.throws(() => measureHost([{ ...a, weight: 0.5 }], 5));
  assert.throws(() => measureHost([{ ...a, blocks: a.blocks.slice(1) }], 5));
  a.blocks[0].baseline = [0, 10];
  assert.throws(() => measureHost([a], 5));
});
