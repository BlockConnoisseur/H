import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  execute,
  initialState,
  qualifyFinding,
  rankFindings,
  finalizeAwards,
  settlePreviewAwards,
  hash,
  ZEC_MINT,
  type Actor,
  type State,
} from "../src/lib/domain";
const alice: Actor = { wallet: "alice", preview: true, reviewer: false };
const bob: Actor = { wallet: "bob", preview: true, reviewer: true };
function run(
  s: State,
  action: string,
  input: Record<string, unknown>,
  actor = alice,
  key = randomUUID(),
) {
  return execute(s, actor, action, input, key) as { id: string };
}
function agent(s: State, actor = alice) {
  return run(
    s,
    "launch",
    {
      name: "Scalar Scout",
      symbol: "SCOUT",
      description: "Reduce repeated scalar conversion in MSM.",
      track: "S1",
      dailyCap: 2000,
    },
    actor,
  ).id;
}
function finding(s: State, owner = alice, suffix = "A") {
  const a = agent(s, owner);
  return run(
    s,
    "submit",
    {
      agentId: a,
      title: `Test scalar optimization ${suffix}`,
      hypothesis:
        "Reduce repeated representation conversion; watch memory overhead.",
      patch: `diff --git a/arithmetic.rs b/arithmetic.rs\n+ test_change_${suffix}`,
    },
    owner,
  ).id;
}
function qualify(s: State, id: string, score = 8) {
  qualifyFinding(s, id, {
    lowerBounds: [score, score + 0.2],
    estimates: [score + 1, score + 1.2],
    maxSlowdownUpper: 1,
    memoryIncrease: 2,
    correctness: true,
    novelty: true,
    performanceReviewer: "reviewer-a",
    cryptoReviewer: "reviewer-b",
    evidenceDigest: hash("evidence"),
  });
}
test("original deployer binding rejects recipient injection", () => {
  const s = initialState(false);
  assert.throws(() =>
    run(s, "launch", {
      name: "Scalar Scout",
      symbol: "SCOUT",
      description: "A sufficiently described experiment",
      track: "S1",
      dailyCap: 2000,
      deployer: "bob",
    }),
  );
  const a = agent(s);
  assert.equal(s.agents[0].deployer, "alice");
  assert.throws(
    () => run(s, "topup", { agentId: a, cents: 2000 }, bob),
    /original deployer/,
  );
});
test("idempotent credits cannot double apply or change payload", () => {
  const s = initialState(false),
    a = agent(s),
    key = randomUUID();
  run(s, "topup", { agentId: a, cents: 2000 }, alice, key);
  run(s, "topup", { agentId: a, cents: 2000 }, alice, key);
  assert.equal(s.agents[0].budget, 2000);
  assert.equal(s.ledger.length, 1);
  assert.throws(
    () => run(s, "topup", { agentId: a, cents: 4000 }, alice, key),
    /different request/,
  );
});
test("reserve and cancellation conserve balances; duplicate active run rejected", () => {
  const s = initialState(false),
    a = agent(s);
  assert.throws(() => run(s, "queue", { agentId: a }), /needs \$20/);
  run(s, "topup", { agentId: a, cents: 4000 });
  const r = run(s, "queue", { agentId: a });
  assert.equal(s.agents[0].budget, 2000);
  assert.equal(s.agents[0].reserved, 2000);
  assert.throws(() => run(s, "queue", { agentId: a }), /current session/);
  run(s, "cancel", { runId: r.id });
  assert.equal(s.agents[0].budget, 4000);
  assert.equal(s.agents[0].reserved, 0);
  assert.throws(() => run(s, "cancel", { runId: r.id }), /no longer queued/);
  assert.equal(s.agents[0].spent, 0);
});
test("paused agents cannot start and immutable submission cannot repeat", () => {
  const s = initialState(false),
    a = agent(s);
  run(s, "settings", {
    agentId: a,
    dailyCap: 2000,
    autoRun: false,
    paused: true,
  });
  assert.throws(() => run(s, "queue", { agentId: a }), /Resume/);
  const f = finding(s);
  assert.ok(f);
  assert.throws(
    () =>
      run(s, "submit", {
        agentId: s.findings[0].agentId,
        title: "Second attempt",
        hypothesis: "This is a new sufficiently detailed hypothesis.",
        patch: "A different patch with a sufficiently long body",
      }),
    /one submission/,
  );
});
test("no live money path silently becomes simulation", () => {
  const s = initialState(false);
  assert.throws(
    () => run(s, "launch", {}, { ...alice, preview: false }),
    /not enabled/,
  );
  assert.equal(s.agents.length, 0);
});
test("self-review, untrusted approvals and weak evidence fail", () => {
  const s = initialState(false),
    f = finding(s);
  assert.throws(
    () =>
      run(
        s,
        "review",
        {
          findingId: f,
          decision: "reject",
          reason: "This artifact has insufficient correctness evidence.",
        },
        { ...alice, reviewer: true },
      ),
    /own agent/,
  );
  assert.throws(() =>
    run(
      s,
      "review",
      {
        findingId: f,
        decision: "approve",
        reason: "This artifact is very fast.",
      },
      bob,
    ),
  );
  assert.throws(() => qualify(s, f, 2.99), /qualification gates/);
  assert.equal(s.findings[0].status, "submitted");
});
test("ranking handles tied slots and base-unit conservation", () => {
  const s = initialState(false);
  const f1 = finding(s, alice, "A"),
    f2 = finding(s, bob, "B"),
    f3 = finding(s, { ...alice, wallet: "carol" }, "C");
  qualify(s, f1, 8);
  qualify(s, f2, 7.9);
  qualify(s, f3, 5);
  const rank = rankFindings(s.findings);
  assert.deepEqual(
    rank.map((r) => r.rank),
    [1, 1, 3],
  );
  assert.deepEqual(
    rank.map((r) => r.amount),
    ["250000000", "250000000", "100000000"],
  );
  assert.equal(
    rank.reduce((s, r) => s + BigInt(r.amount), 0n),
    600000000n,
  );
});
test("no qualification means no discovery payout", () => {
  const s = initialState(false);
  finding(s);
  finalizeAwards(s, "2026-10-10T12:00:00Z");
  assert.equal(s.awards.length, 0);
  assert.equal(s.prizeAvailable, "1000000000");
});
test("awards are frozen, auto-routed to original deployer and replay-safe", () => {
  const s = initialState(false);
  const f = finding(s);
  qualify(s, f);
  const close = "2026-10-10T12:00:00Z";
  finalizeAwards(s, close);
  finalizeAwards(s, close);
  assert.equal(s.awards.length, 1);
  assert.equal(s.awards[0].recipient, "alice");
  assert.equal(s.awards[0].mint, ZEC_MINT);
  assert.equal(s.prizeAvailable, "700000000");
  settlePreviewAwards(s, Date.parse(close) + 1000);
  assert.equal(s.awards[0].status, "dispute");
  settlePreviewAwards(s, Date.parse(close) + 73 * 3600000);
  settlePreviewAwards(s, Date.parse(close) + 74 * 3600000);
  assert.equal(s.awards[0].status, "preview_settled");
  assert.equal(s.awards[0].signature, null);
  assert.equal(s.awards.length, 1);
  assert.throws(() => finding(s, bob, "later"), /epoch is closed/);
});
test("payout rejects destination tampering", () => {
  const s = initialState(false);
  const f = finding(s);
  qualify(s, f);
  finalizeAwards(s, "2026-10-10T12:00:00Z");
  s.awards[0].recipient = "attacker";
  assert.throws(
    () => settlePreviewAwards(s, Date.parse("2026-10-20")),
    /immutable deployer/,
  );
  assert.equal(s.awards[0].status, "dispute");
});
