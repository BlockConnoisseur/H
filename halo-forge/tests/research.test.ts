import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  initialState,
  ensureResearchSetup,
  execute,
  type State,
} from "../src/lib/domain";
import {
  allocateAssignment,
  researchBrief,
  assignmentFor,
  methods,
} from "../src/lib/research";
const actor = { wallet: "research-owner", preview: true, reviewer: false };
function launch(s: State, track = "auto") {
  const result = execute(
    s,
    actor,
    "launch",
    {
      name: "New Research Agent",
      symbol: "METHOD",
      description: "Investigate a distinct bounded research hypothesis.",
      track,
      dailyCap: 2000,
    },
    randomUUID(),
  ) as { id: string };
  return s.agents.find((a) => a.id === result.id)!;
}
test("fresh site has exactly three platform methods with no fabricated activity", () => {
  const s = initialState();
  assert.equal(s.agents.length, 3);
  assert.deepEqual(
    s.agents.map((a) => a.track),
    ["S1", "S2", "S3"],
  );
  assert.equal(new Set(s.agents.map((a) => a.assignment?.methodId)).size, 3);
  for (const a of s.agents) {
    assert.equal(a.platform, true);
    assert.equal(a.example, false);
    assert.equal(a.status, "awaiting_setup");
    assert.equal(a.budget + a.reserved + a.spent, 0);
    assert.equal(a.deployer, "");
    assert.equal(a.tokenMint, null);
    assert.throws(
      () =>
        execute(
          s,
          actor,
          "topup",
          { agentId: a.id, cents: 2000 },
          randomUUID(),
        ),
      /original deployer/,
    );
  }
  assert.equal(s.runs.length + s.findings.length + s.awards.length, 0);
});
test("automatic assignments cover all nine methods before reusing a method", () => {
  const s = initialState();
  for (let i = 0; i < 6; i++) launch(s);
  assert.equal(
    new Set(s.agents.map((a) => a.assignment?.methodId)).size,
    methods.length,
  );
  assert.equal(new Set(s.agents.map((a) => a.assignment?.key)).size, 9);
});
test("explicit tracks stay in scope and exhausted coverage refuses duplicates", () => {
  const s = initialState(false);
  for (let i = 0; i < 24; i++) assert.equal(launch(s, "S2").track, "S2");
  assert.equal(new Set(s.agents.map((a) => a.assignment?.key)).size, 24);
  const before = structuredClone(s);
  assert.throws(() => launch(s, "S2"), /allocated/);
  assert.deepEqual(s, before);
  assert.equal(allocateAssignment(s.agents, "S2"), null);
  assert.ok(allocateAssignment(s.agents, "auto"));
});
test("setup migration preserves owners, funds and submissions and is idempotent", () => {
  const s = initialState(false);
  const a = launch(s, "S1");
  delete a.assignment;
  a.budget = 5600;
  execute(
    s,
    actor,
    "submit",
    {
      agentId: a.id,
      title: "Existing private artifact",
      hypothesis:
        "A pre-existing hypothesis must survive the platform setup migration.",
      patch: "frozen original artifact before migration",
    },
    randomUUID(),
  );
  const f = structuredClone(s.findings[0]);
  assert.equal(ensureResearchSetup(s), true);
  assert.equal(s.agents.filter((a) => a.platform).length, 3);
  assert.equal(a.budget, 5600);
  assert.equal(a.deployer, actor.wallet);
  assert.deepEqual(s.findings[0], f);
  assert.ok(a.assignment);
  const snapshot = structuredClone(s);
  assert.equal(ensureResearchSetup(s), false);
  assert.deepEqual(s, snapshot);
});
test("queued sessions freeze a concrete research brief and reject occupied experiments", () => {
  const s = initialState();
  const a = launch(s);
  execute(s, actor, "topup", { agentId: a.id, cents: 2000 }, randomUUID());
  execute(s, actor, "queue", { agentId: a.id }, randomUUID());
  const run = s.runs[0];
  assert.deepEqual(run.assignment, a.assignment);
  assert.notEqual(run.assignment, a.assignment);
  const brief = researchBrief(run.assignment!);
  assert.ok(brief.hypothesis);
  assert.ok(brief.guardrail);
  assert.match(brief.finalEvaluation, /All 2\/4\/8\/16/);
  const b = launch(s);
  b.assignment = { ...a.assignment! };
  execute(s, actor, "topup", { agentId: b.id, cents: 2000 }, randomUUID());
  assert.throws(
    () => execute(s, actor, "queue", { agentId: b.id }, randomUUID()),
    /active session/,
  );
  assert.equal(b.budget, 2000);
  assert.throws(
    () =>
      researchBrief({
        ...assignmentFor("S1-representation"),
        sourceRevision: "tampered",
      }),
    /manifest/,
  );
});
