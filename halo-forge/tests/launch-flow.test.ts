import { test } from "node:test";
import assert from "node:assert/strict";
import { deployPumpAgent } from "../src/lib/launch-flow";
import type { PumpDraft, LaunchTx } from "../src/lib/pump-launch";
const tx = (wire: string): LaunchTx => ({
  wire,
  messageHash: wire,
  blockhash: "block",
  lastValidBlockHeight: 100,
});
const draft = (): PumpDraft => ({
  id: "saved",
  deployer: "wallet",
  mint: "mint",
  name: "Coin",
  symbol: "COIN",
  description: "Saved research",
  image: null,
  assignment: {
    track: "S1",
    methodId: "window",
    actions: 8,
    threads: 4,
  } as PumpDraft["assignment"],
  createdAt: "now",
  create: tx("create"),
});
function scenario(
  initial: PumpDraft | null,
  options: {
    delayed?: boolean;
    timeout?: boolean;
    rejectRoute?: boolean;
    uncertainSubmit?: boolean;
  } = {},
) {
  const state = initial ? structuredClone(initial) : draft();
  const calls: string[] = [],
    signed: string[] = [],
    progress: string[] = [];
  let refreshes = 0;
  const run = () =>
    deployPumpAgent({
      initial:
        state.create.signature || state.create.finalized
          ? structuredClone(state)
          : initial,
      input: {},
      progress: (m) => progress.push(m),
      wait: async () => {},
      sign: async (wire) => {
        signed.push(wire);
        if (wire === "route" && options.rejectRoute)
          throw new Error("Wallet cancelled");
        return `signed-${wire}`;
      },
      request: async (body) => {
        calls.push(`${body.action}:${body.stage ?? ""}`);
        if (body.action === "route") state.route ??= tx("route");
        if (body.action === "submit") {
          const stage = body.stage as "create" | "route";
          state[stage]!.signature = `sig-${stage}`;
          if (!options.delayed && !options.timeout)
            state[stage]!.finalized = true;
          if (options.uncertainSubmit) throw new Error("Network interrupted");
        }
        if (body.action === "refresh") {
          refreshes++;
          if (!options.timeout && refreshes > 1)
            for (const stage of ["create", "route"] as const)
              if (state[stage]?.signature) state[stage]!.finalized = true;
        }
        if (state.route?.finalized) state.agentId = "agent-saved";
        return structuredClone(state);
      },
    });
  return {
    run,
    calls,
    signed,
    progress,
    getState: () => structuredClone(state),
  };
}

test("one action creates, funds and verifies with two wallet approvals", async () => {
  const s = scenario(null, { delayed: true });
  assert.equal((await s.run()).agentId, "agent-saved");
  assert.deepEqual(s.signed, ["create", "route"]);
  assert.equal(s.calls.filter((x) => x === "prepare:").length, 1);
  assert.ok(s.calls.indexOf("route:") > s.calls.indexOf("refresh:"));
});
test("resume a created coin only signs fee setup", async () => {
  const d = draft();
  d.create.finalized = true;
  d.create.signature = "existing";
  const s = scenario(d);
  await s.run();
  assert.deepEqual(s.signed, ["route"]);
  assert.ok(!s.calls.includes("prepare:"));
});
test("pending signatures are reconciled without a second signature or payment", async () => {
  const d = draft();
  d.create.finalized = true;
  d.route = { ...tx("route"), signature: "already-paid" };
  const s = scenario(d);
  await s.run();
  assert.deepEqual(s.signed, []);
  assert.ok(!s.calls.some((x) => x.startsWith("submit:")));
});
test("wallet cancellation stops before fee submission and supports resume", async () => {
  const s = scenario(null, { rejectRoute: true });
  await assert.rejects(s.run(), /cancelled/);
  assert.ok(!s.calls.includes("submit:route"));
  const resumed = scenario(s.getState());
  await resumed.run();
  assert.deepEqual(resumed.signed, ["route"]);
});
test("confirmation timeout never proceeds to payment or resubmits creation", async () => {
  const s = scenario(null, { timeout: true });
  await assert.rejects(s.run(), /taking longer/);
  assert.deepEqual(s.signed, ["create"]);
  assert.ok(!s.calls.includes("route:"));
});
test("uncertain submission resumes from stored signature instead of paying twice", async () => {
  const d = draft();
  d.create.finalized = true;
  const s = scenario(d, { uncertainSubmit: true });
  await assert.rejects(s.run(), /interrupted/);
  const resumed = scenario(s.getState());
  await resumed.run();
  assert.deepEqual(resumed.signed, []);
});
test("completed launch never requests another approval", async () => {
  const d = draft();
  d.create.finalized = true;
  d.route = { ...tx("route"), finalized: true };
  d.agentId = "agent-saved";
  const s = scenario(d);
  await s.run();
  assert.deepEqual(s.signed, []);
});

test("a dropped submission retries identical signed bytes without another wallet approval", async () => {
  const d = draft();
  d.create.finalized = true;
  d.route = tx("route");
  const submissions: unknown[] = [];
  let approvals = 0;
  const result = await deployPumpAgent({
    initial: d,
    input: {},
    progress: () => {},
    wait: async () => {},
    sign: async () => {
      approvals++;
      return "same-signed-payment";
    },
    request: async (body) => {
      if (body.action === "submit") {
        submissions.push(body.signed);
        d.route!.signature = "same-signature";
        if (submissions.length === 2) {
          d.route!.finalized = true;
          d.agentId = "registered";
        }
      }
      return structuredClone(d);
    },
  });
  assert.equal(result.agentId, "registered");
  assert.equal(approvals, 1);
  assert.deepEqual(submissions, ["same-signed-payment", "same-signed-payment"]);
});

test("an expired payment stops the spinner without another approval or claiming the fee was paid", async () => {
  const d = draft();
  d.create.finalized = true;
  d.route = { ...tx("route"), signature: "expired" };
  let polls = 0,
    approvals = 0;
  await assert.rejects(
    deployPumpAgent({
      initial: d,
      input: {},
      progress: () => {},
      wait: async () => {},
      sign: async () => {
        approvals++;
        return "must-not-sign";
      },
      request: async (body) => {
        if (body.action === "refresh" && ++polls > 1)
          d.route!.confirmation = "expired";
        return structuredClone(d);
      },
    }),
    /expired without landing.*not transferred/,
  );
  assert.equal(approvals, 0);
  assert.equal(polls, 2);
});
