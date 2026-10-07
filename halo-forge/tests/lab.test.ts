import { test, before, after } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createTwoFilesPatch } from "diff";
import { initialState } from "../src/lib/domain";
import {
  labState,
  queueResearch,
  reviewResearch,
  publicLab,
} from "../src/lib/lab-domain";
const dir = mkdtempSync(join(tmpdir(), "halo-lab-test-"));
process.env.HALO_DATABASE_DRIVER = "sqlite";
process.env.HALO_DATABASE_PATH = join(dir, "test.sqlite");
let validatePatch: typeof import("../src/lib/lab-controller").validatePatch,
  serviceAuthorized: typeof import("../src/lib/lab-controller").serviceAuthorized,
  replacementPatch: typeof import("../src/lib/lab-controller").replacementPatch;
before(async () => {
  ({ validatePatch, serviceAuthorized, replacementPatch } =
    await import("../src/lib/lab-controller"));
});
after(async () => {
  await (await import("../src/lib/store")).closeStore();
  rmSync(dir, { recursive: true, force: true });
});
import source from "../src/lib/research-source.json";

function ready() {
  const s = initialState();
  for (const a of s.agents) {
    a.deployer = "operator-wallet";
    a.status = "ready";
  }
  Object.assign(labState(s), { enabled: true, allocatedCents: 6000 });
  return s;
}
const actor = { wallet: "operator-wallet", preview: false, reviewer: true };
test("lab enforces ownership, one active experiment and shared daily allowance", () => {
  const s = ready();
  assert.throws(
    () =>
      queueResearch(s, "platform-1", {
        ...actor,
        wallet: "outsider",
        reviewer: false,
      }),
    /Only/,
  );
  const j = queueResearch(s, "platform-1", actor);
  assert.equal(j.reservationCents, 300);
  assert.throws(() => queueResearch(s, "platform-1", actor), /already/);
  queueResearch(s, "platform-2", actor);
  queueResearch(s, "platform-3", actor);
  j.status = "failed";
  assert.throws(() => queueResearch(s, "platform-1", actor), /allowance/);
});
test("manual review is operator-only, immutable and never creates payouts", () => {
  const s = ready(),
    j = queueResearch(s, "platform-1", actor);
  j.status = "awaiting_review";
  assert.throws(
    () =>
      reviewResearch(
        s,
        { ...actor, preview: true },
        j.id,
        "accepted",
        "Checked source and test evidence.",
      ),
    /Operator/,
  );
  reviewResearch(
    s,
    actor,
    j.id,
    "accepted",
    "Checked source and test evidence.",
  );
  assert.equal(j.review?.reviewer, actor.wallet);
  assert.equal(s.awards.length, 0);
  assert.throws(
    () =>
      reviewResearch(
        s,
        actor,
        j.id,
        "rejected",
        "Changing a previously frozen decision.",
      ),
    /already/,
  );
});
test("public activity omits private patches, command logs and controller state", () => {
  const s = ready(),
    j = queueResearch(s, "platform-1", actor);
  j.patches.push({
    digest: "a".repeat(64),
    diff: "PRIVATE PATCH",
    hypothesis: "Public hypothesis",
    expectedTradeoff: "Memory cost",
    createdAt: j.createdAt,
  });
  const view = publicLab(s, null);
  assert.equal(view.jobs[0].patches[0].diff, undefined);
  assert.equal("commands" in view.jobs[0], false);
  assert.equal(publicLab(s, actor).jobs[0].patches[0].diff, "PRIVATE PATCH");
});
test("patch validator confines changes to MSM and rejects test changes and unsafe additions", () => {
  const path = "halo2_proofs/src/arithmetic.rs",
    original = source[path];
  const diff = (candidate: string) =>
    createTwoFilesPatch(`a/${path}`, `b/${path}`, original, candidate);
  assert.equal(
    validatePatch(
      diff(
        original.replace(
          "// get segmentation and add coeff to buckets content",
          "// Read scalar windows for this invocation.",
        ),
      ),
    ).digest.length,
    64,
  );
  assert.throws(
    () =>
      validatePatch(
        diff(original.replace("fn test_multiexp()", "fn disabled_multiexp()")),
      ),
    /MSM region/,
  );
  assert.throws(
    () =>
      validatePatch(
        diff(
          original.replace(
            "// get segmentation and add coeff to buckets content",
            "unsafe { std::process::exit(0); }",
          ),
        ),
      ),
    /disallowed/,
  );
  assert.throws(
    () =>
      validatePatch(
        "--- a/../Cargo.toml\n+++ b/../Cargo.toml\n@@ -1 +1 @@\n-a\n+b\n",
      ),
    /Only arithmetic/,
  );
});
test("controller authentication rejects missing and wrong service credentials", () => {
  assert.equal(serviceAuthorized(null, "s".repeat(64)), false);
  assert.equal(serviceAuthorized("Bearer wrong", "s".repeat(64)), false);
  assert.equal(
    serviceAuthorized(`Bearer ${"s".repeat(64)}`, "s".repeat(64)),
    true,
  );
});
test("exact replacements generate valid diffs and reject ambiguous or privileged edits", () => {
  assert.equal(
    validatePatch(
      replacementPatch([
        {
          oldText: "// get segmentation and add coeff to buckets content",
          newText: "// Read the current public window.",
        },
      ]),
    ).digest.length,
    64,
  );
  assert.throws(
    () => replacementPatch([{ oldText: "{", newText: "}" }]),
    /exactly once/,
  );
  assert.throws(
    () =>
      replacementPatch([
        { oldText: "fn test_multiexp()", newText: "fn disabled_multiexp()" },
      ]),
    /MSM region/,
  );
});
test("non-platform compute cannot spend without a verified token and funded allowance", () => {
  const s = ready(),
    a = {
      ...s.agents[0],
      id: "paid-agent",
      platform: false,
      preview: false,
      tokenMint: null,
      budget: 300,
    };
  s.agents.push(a);
  assert.throws(() => queueResearch(s, a.id, actor), /verified token/);
  a.tokenMint = "verified-mint" as never;
  queueResearch(s, a.id, actor);
  assert.equal(a.budget, 0);
});
test("controller binds one dispatched session, records idempotent calls and queues exact candidate evaluation", async () => {
  const { transact } = await import("../src/lib/store"),
    { controllerOperation } = await import("../src/lib/lab-controller"),
    { hash } = await import("../src/lib/domain");
  const id = await transact((s) => {
    const seed = ready();
    Object.assign(s, seed);
    const j = queueResearch(s, "platform-1", actor);
    j.status = "dispatching";
    return j.id;
  });
  const call = (sessionId: string, operation: string, input: unknown) => {
    const body = { sessionId, operation, input };
    return controllerOperation(body, hash(JSON.stringify(body)));
  };
  await call("session-one", "bind_session", { runId: id });
  await assert.rejects(
    call("session-two", "bind_session", { runId: id }),
    /another session/,
  );
  await call("session-one", "reserve_model", { stepKey: "step-1" });
  await call("session-one", "reserve_model", { stepKey: "step-1" });
  await transact((s) => assert.equal(s.lab!.jobs[0].modelSteps.length, 1));
  const result = (await call("session-one", "propose_patch", {
    hypothesis:
      "A controller contract test of exact replacement transport, not a performance claim.",
    expectedTradeoff: "Comment-only fixture; no timing claim.",
    replacements: [
      {
        oldText: "// get segmentation and add coeff to buckets content",
        newText: "// Controller contract fixture.",
      },
    ],
  })) as { status: string; jobId: string };
  assert.equal(result.status, "evaluating");
  assert.equal(result.jobId, id);
  await assert.rejects(
    call("session-one", "reserve_model", { stepKey: "step-2" }),
    /limit/,
  );
  await assert.rejects(
    call("unknown", "read_assignment", {}),
    /Unknown research session/,
  );
});
test("authenticated malformed controller JSON returns 400 without throwing", async () => {
  process.env.HALO_CONTROLLER_TOKEN = "test-only-secret-".repeat(4);
  const route = await import("../src/app/api/research/controller/route");
  const response = await route.POST(
    new Request("http://localhost/api/research/controller", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.HALO_CONTROLLER_TOKEN}` },
      body: "{",
    }),
  );
  assert.equal(response.status, 400);
});
