import { Sandbox } from "@vercel/sandbox";
import { readState, transact } from "./store";
import {
  activeStatuses,
  event,
  finishResearch,
  labState,
  queueResearch,
  type Evaluation,
} from "./lab-domain";
import { validatePatch } from "./lab-controller";
import { SOURCE_REVISION } from "./research";

export async function dispatchResearch() {
  const url = process.env.HALO_WORKER_URL,
    token = process.env.HALO_CONTROLLER_TOKEN;
  if (!url || !token) return;
  const job = await transact((s) => {
    const lab = labState(s);
    if (!lab.enabled) return null;
    // One funded experiment at a time across all agents. No overlapping sandbox bills.
    if (
      lab.jobs.some((j) =>
        ["researching", "evaluating", "dispatching"].includes(j.status),
      )
    )
      return null;
    const next = lab.jobs.find((j) => j.status === "queued");
    if (!next) return null;
    next.status = "dispatching";
    event(next, "dispatching", "Starting the authenticated research worker.");
    return { id: next.id };
  });
  if (!job) return;
  try {
    const response = await fetch(`${url}/research/start`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ runId: job.id }),
    });
    if (!response.ok) throw new Error("Worker rejected dispatch");
  } catch {
    // Do not retry uncertain acceptance: one reservation must not launch two paid sessions.
    await transact((s) => {
      const j = labState(s).jobs.find((j) => j.id === job.id)!;
      if (j.status === "dispatching")
        finishResearch(
          s,
          j,
          "failed",
          "Worker dispatch was not confirmed. No automatic retry; inspect the worker before retrying.",
        );
    });
  }
}

export async function evaluateResearch(id: string) {
  const snapshotId = process.env.HALO_SANDBOX_SNAPSHOT_ID;
  const job = await transact((s) => {
    const j = labState(s).jobs.find((j) => j.id === id);
    if (!j || j.status !== "evaluating" || j.evaluationClaimedAt) return null;
    if (!snapshotId) {
      finishResearch(
        s,
        j,
        "failed",
        "Evaluation snapshot is unavailable. No candidate was executed.",
      );
      return null;
    }
    j.evaluationClaimedAt = new Date().toISOString();
    return structuredClone(j);
  });
  if (!job || !snapshotId) return;
  const started = Date.now();
  let sandbox: Sandbox | undefined;
  const results: Evaluation["commands"] = [];
  try {
    const patch = job.patches.at(-1)!;
    const { candidate, digest } = validatePatch(patch.diff);
    if (digest !== patch.digest) throw new Error("Artifact digest mismatch");
    sandbox = await Sandbox.create({
      source: { type: "snapshot", snapshotId },
      resources: { vcpus: 4 },
      timeout: 720_000,
      persistent: false,
      networkPolicy: "deny-all",
    });
    const vm = sandbox;
    const run = async (name: string, command: string, threads = 4) => {
      await transact((s) => {
        const j = labState(s).jobs.find((j) => j.id === id)!;
        event(j, "benchmark", name);
      });
      const r = await vm.runCommand({
        cmd: "bash",
        args: ["-lc", `source "$HOME/.cargo/env"; timeout 180s ${command}`],
        cwd: "/vercel/sandbox/halo2",
        env: { RAYON_NUM_THREADS: String(threads), CARGO_NET_OFFLINE: "true" },
      });
      const result = {
        name,
        exitCode: r.exitCode,
        stdout: (await r.stdout()).slice(-12000),
        stderr: (await r.stderr()).slice(-12000),
      };
      results.push(result);
      if (r.exitCode !== 0) throw new Error("Fixed command failed");
    };
    await run(
      "Check immutable baseline revision",
      `bash -c 'test "$(git rev-parse HEAD)" = "${SOURCE_REVISION}" && git diff --exit-code'`,
    );
    const bench =
      "cargo bench --offline --locked -p halo2_proofs --bench msm -- 'msm/k/12$' --warm-up-time 1 --measurement-time 2 --sample-size 10 --noplot";
    const measurement = async () => {
      const file = await vm.readFileToBuffer({
        path: "/vercel/sandbox/halo2/target/criterion/msm/k/12/new/estimates.json",
      });
      const value = file
        ? JSON.parse(file.toString()).mean.point_estimate
        : undefined;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
        throw new Error("Missing measurement");
      return value as number;
    };
    await run("Baseline MSM · 4 threads", bench, 4);
    const baselineNs = await measurement();
    await run("Baseline MSM · 1 thread", bench, 1);
    const baselineSingleNs = await measurement();
    await vm.writeFiles([
      {
        path: "/vercel/sandbox/halo2/halo2_proofs/src/arithmetic.rs",
        content: Buffer.from(candidate),
      },
    ]);
    await run(
      "Candidate correctness · halo2_proofs library tests",
      "cargo test --offline --locked -p halo2_proofs --lib --release",
      4,
    );
    await run("Candidate MSM · 4 threads", bench, 4);
    const candidateNs = await measurement();
    await run("Candidate MSM · 1 thread", bench, 1);
    const candidateSingleNs = await measurement();
    const evaluation: Evaluation = {
      scope: "halo2-msm-development",
      status: "passed",
      correctness: true,
      baselineNs,
      candidateNs,
      baselineSingleNs,
      candidateSingleNs,
      changePercent: (100 * (baselineNs - candidateNs)) / baselineNs,
      sourceRevision: SOURCE_REVISION,
      snapshotId,
      patchDigest: digest,
      commands: results,
      durationSeconds: Math.ceil((Date.now() - started) / 1000),
      limitation:
        "Single-host MSM microbenchmark and library tests only. Not a full Orchard proof benchmark, memory qualification, security review or reward approval. Timing is noisy; reproduce before accepting.",
    };
    await transact((s) => {
      const j = labState(s).jobs.find((j) => j.id === id)!;
      j.evaluation = evaluation;
      finishResearch(
        s,
        j,
        "awaiting_review",
        "Development tests completed. Measurements are available for manual review; no reward was issued.",
      );
    });
  } catch {
    await transact((s) => {
      const j = labState(s).jobs.find((j) => j.id === id)!;
      j.evaluation = {
        scope: "halo2-msm-development",
        status: "failed",
        correctness: false,
        sourceRevision: SOURCE_REVISION,
        snapshotId,
        patchDigest: job.patches.at(-1)!.digest,
        commands: results,
        limitation:
          "Evaluation failed or timed out. Inspect the command evidence; no improvement is claimed.",
        durationSeconds: Math.ceil((Date.now() - started) / 1000),
      };
      finishResearch(
        s,
        j,
        "awaiting_review",
        "Candidate evaluation failed or timed out. Failure evidence retained for manual review.",
      );
    });
  } finally {
    await sandbox?.stop().catch(() => undefined);
  }
}

export async function researchTick() {
  await transact((s) => {
    const lab = labState(s);
    for (const j of lab.jobs)
      if (
        activeStatuses.includes(j.status) &&
        j.status !== "queued" &&
        Date.now() - Date.parse(j.updatedAt) > 35 * 60_000
      )
        finishResearch(
          s,
          j,
          "failed",
          "Worker heartbeat expired. Allocation retained conservatively; no automatic retry or invented result.",
        );
    if (!lab.enabled) return;
    const today = new Date().toISOString().slice(0, 10);
    for (const agent of s.agents.filter(
      (a) => a.platform && a.autoRun && a.status !== "paused",
    )) {
      if (
        lab.jobs.some(
          (j) => j.agentId === agent.id && j.createdAt.startsWith(today),
        )
      )
        continue;
      try {
        queueResearch(s, agent.id);
      } catch {
        break;
      }
    }
  });
  const pending = (await readState()).lab?.jobs.find(
    (j) => j.status === "evaluating" && !j.evaluationClaimedAt,
  );
  if (pending) await evaluateResearch(pending.id);
  await dispatchResearch();
}
