import { createHash, timingSafeEqual } from "node:crypto";
import { applyPatch, parsePatch, createTwoFilesPatch } from "diff";
import { z } from "zod";
import source from "./research-source.json";
import { DomainError, hash } from "./domain";
import { readState, transact } from "./store";
import { event, finishResearch, labState, sessionJob } from "./lab-domain";
import { researchBrief } from "./research";

export function serviceAuthorized(
  header: string | null,
  secret = process.env.HALO_CONTROLLER_TOKEN,
) {
  if (!secret || secret.length < 32 || !header) return false;
  const a = createHash("sha256").update(header).digest(),
    b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}
const sourcePath = "halo2_proofs/src/arithmetic.rs";
export function replacementPatch(
  replacements: { oldText: string; newText: string }[],
) {
  let candidate = source[sourcePath];
  for (const { oldText, newText } of replacements) {
    if (!oldText || candidate.split(oldText).length !== 2)
      throw new DomainError(
        "Each oldText must match exactly once. Read the source again and include enough surrounding text.",
      );
    candidate = candidate.replace(oldText, () => newText);
  }
  const diff = createTwoFilesPatch(
    `a/${sourcePath}`,
    `b/${sourcePath}`,
    source[sourcePath],
    candidate,
  );
  validatePatch(diff);
  return diff;
}
export function validatePatch(diff: string) {
  if (diff.length > 24000 || /\r|\0/.test(diff))
    throw new DomainError(
      "Use a bounded UTF-8 unified diff with LF line endings.",
    );
  let patches;
  try {
    patches = parsePatch(diff);
  } catch {
    throw new DomainError(
      "Malformed unified diff. Re-read the exact source and regenerate the hunk counts.",
    );
  }
  if (
    patches.length !== 1 ||
    patches[0].oldFileName !== `a/${sourcePath}` ||
    patches[0].newFileName !== `b/${sourcePath}` ||
    !patches[0].hunks.length ||
    /(?:new file mode|old mode|new mode|rename |GIT binary|Binary files)/.test(
      diff,
    )
  )
    throw new DomainError("Only arithmetic.rs MSM edits are allowed.");
  // Exact application and unchanged prefix/suffix exclude tests, FFT, imports and new files.
  const original = source[sourcePath],
    result = applyPatch(original, patches[0], { fuzzFactor: 0 });
  const start = original.indexOf("#[derive(Clone, Copy)]"),
    end = original.indexOf("pub fn best_fft");
  if (
    typeof result !== "string" ||
    result === original ||
    !result.startsWith(original.slice(0, start)) ||
    !result.endsWith(original.slice(end))
  )
    throw new DomainError(
      "Patch must apply exactly and stay inside the MSM region before best_fft.",
    );
  const added = patches[0].hunks
    .flatMap((h) =>
      h.lines.filter((l) => l.startsWith("+")).map((l) => l.slice(1)),
    )
    .join("\n");
  if (
    /\b(unsafe|extern|include|include_bytes|include_str|asm|global_asm)\b|\b(std\s*::\s*(fs|net|process|env)|Command|File|TcpStream|UdpSocket)\b|#\s*\[|macro_rules|\bpanic!|\bunimplemented!|\btodo!/.test(
      added,
    )
  )
    throw new DomainError(
      "Patch includes disallowed capabilities or changes to compilation/test behavior.",
    );
  return { digest: hash(diff), candidate: result };
}
const envelope = z
  .object({
    sessionId: z.string().min(1).max(200),
    operation: z.string(),
    input: z.unknown(),
  })
  .strict();
export async function controllerOperation(body: unknown, key: string) {
  const p = envelope.parse(body),
    fingerprint = hash(JSON.stringify(p));
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new DomainError("Invalid idempotency key.");
  return transact((s) => {
    if (p.operation === "bind_session") {
      const input = z
        .object({ runId: z.string().uuid() })
        .strict()
        .parse(p.input);
      const job = labState(s).jobs.find((j) => j.id === input.runId);
      if (!job || !["dispatching", "researching"].includes(job.status))
        throw new DomainError("No authorized dispatched run.", 403);
      if (job.sessionId && job.sessionId !== p.sessionId)
        throw new DomainError("Run already belongs to another session.", 409);
      if (!job.sessionId) {
        job.sessionId = p.sessionId;
        job.status = "researching";
        event(
          job,
          "researching",
          "Worker authenticated. Reading the pinned source and assigned method.",
        );
      }
      return { bound: true };
    }
    const job = sessionJob(s, p.sessionId);
    if (job.commands[key]) {
      if (job.commands[key].fingerprint !== fingerprint)
        throw new DomainError("Idempotency key collision.", 409);
      return job.commands[key].result;
    }
    if (Object.keys(job.commands).length >= 80)
      throw new DomainError("Tool operation limit reached.", 409);
    let result: unknown;
    if (p.operation === "reserve_model") {
      const input = z
        .object({ stepKey: z.string().max(150) })
        .strict()
        .parse(p.input);
      if (job.status !== "researching" || job.modelSteps.length >= 12)
        throw new DomainError(
          "This experiment reached its model-call limit.",
          409,
        );
      if (!job.modelSteps.includes(input.stepKey))
        job.modelSteps.push(input.stepKey);
      event(
        job,
        "model",
        `Model call ${job.modelSteps.length}/12 authorized within the reserved allowance.`,
      );
      result = { authorized: true };
    } else if (p.operation === "model_receipt") {
      const input = z
        .object({
          stepKey: z.string().max(150),
          costUsd: z.number().min(0).max(1),
          inputTokens: z.number().int().min(0),
          outputTokens: z.number().int().min(0),
        })
        .strict()
        .parse(p.input);
      if (!job.modelSteps.includes(input.stepKey))
        throw new DomainError("Model step was not authorized.", 403);
      job.modelReceipts[input.stepKey] = input;
      result = { recorded: true };
    } else if (p.operation === "read_assignment") {
      result = {
        ...researchBrief(job.assignment),
        editAllowlist: [sourcePath],
        allowedRegion:
          "MSM region before pub fn best_fft; imports, FFT, tests and dependencies stay unchanged",
        evaluationScope:
          "Fixed halo2_proofs library tests and MSM k=12 benchmarks with 1 and 4 threads. This is development evidence, NOT full Orchard proof timing.",
        remainingModelCalls: 12 - job.modelSteps.length,
        previousExperiments: labState(s)
          .jobs.filter(
            (j) =>
              j.id !== job.id &&
              j.assignment.methodId === job.assignment.methodId,
          )
          .slice(-8)
          .map((j) => ({
            status: j.status,
            hypotheses: j.patches.map((p) => p.hypothesis),
            evaluation: j.evaluation
              ? {
                  status: j.evaluation.status,
                  changePercent: j.evaluation.changePercent,
                }
              : null,
            review: j.review,
          })),
      };
      event(
        job,
        "assignment",
        `Assigned ${job.assignment.methodId}. Earlier experiments checked before proposing changes.`,
      );
    } else if (p.operation === "read_source") {
      const input = z
        .object({
          path: z.enum([sourcePath, "halo2_proofs/src/multicore.rs"]),
          startLine: z.number().int().min(1),
          lineCount: z.number().int().min(1).max(200),
        })
        .strict()
        .parse(p.input);
      const text = source[input.path];
      result = {
        path: input.path,
        sourceRevision: job.assignment.sourceRevision,
        sha256: hash(text),
        startLine: input.startLine,
        totalLines: text.split("\n").length,
        text: text
          .split("\n")
          .slice(input.startLine - 1, input.startLine - 1 + input.lineCount)
          .join("\n"),
      };
      event(
        job,
        "source",
        `Read ${input.path}, lines ${input.startLine}–${input.startLine + input.lineCount - 1}.`,
      );
    } else if (p.operation === "propose_patch") {
      const input = z
        .object({
          hypothesis: z.string().min(30).max(4000),
          diff: z.string().min(20).max(24000).optional(),
          replacements: z
            .array(
              z
                .object({
                  oldText: z.string().min(1).max(12000),
                  newText: z.string().max(12000),
                })
                .strict(),
            )
            .min(1)
            .max(6)
            .optional(),
          expectedTradeoff: z.string().min(15).max(2000),
        })
        .strict()
        .parse(p.input);
      if (job.patches.length >= 2 || job.status !== "researching")
        throw new DomainError("Patch allowance exhausted.", 409);
      if (!!input.diff === !!input.replacements)
        throw new DomainError("Supply either a diff or exact replacements.");
      const diff = input.diff ?? replacementPatch(input.replacements!);
      const { digest } = validatePatch(diff);
      if (
        labState(s).jobs.some((j) => j.patches.some((p) => p.digest === digest))
      )
        throw new DomainError(
          "This exact patch was already tested. Read previous experiments.",
          409,
        );
      job.patches.push({
        hypothesis: input.hypothesis,
        expectedTradeoff: input.expectedTradeoff,
        diff,
        digest,
        createdAt: new Date().toISOString(),
      });
      event(
        job,
        "patch",
        "Candidate patch frozen with a SHA-256 digest. No performance claim has been verified.",
      );
      job.status = "evaluating";
      event(
        job,
        "evaluating",
        "Frozen candidate queued for isolated correctness tests and development benchmarks.",
      );
      result = {
        artifactDigest: digest,
        acceptedForEvaluation: true,
        jobId: job.id,
        status: "evaluating",
      };
    } else if (p.operation === "request_evaluation") {
      const input = z
        .object({ artifactDigest: z.string().regex(/^[a-f0-9]{64}$/) })
        .strict()
        .parse(p.input);
      if (
        job.status !== "researching" ||
        !job.patches.some((p) => p.digest === input.artifactDigest)
      )
        throw new DomainError("Unknown or already evaluated patch.", 409);
      if (job.patches.at(-1)?.digest !== input.artifactDigest)
        throw new DomainError("Evaluate the most recent frozen patch.");
      job.status = "evaluating";
      event(
        job,
        "evaluating",
        "Isolated development evaluation queued. Fixed commands, network disabled, no wallet or production credentials.",
      );
      result = {
        jobId: job.id,
        status: "evaluating",
        message:
          "Stop this agent turn. Evaluation continues on the server and will be shown in the activity page for manual review.",
      };
    } else if (p.operation === "read_evaluation") {
      const input = z.object({ jobId: z.string() }).strict().parse(p.input);
      if (input.jobId !== job.id)
        throw new DomainError("Evaluation belongs to another session.", 403);
      result = {
        jobId: job.id,
        status: job.status,
        evaluation: job.evaluation ?? null,
      };
    } else if (p.operation === "finish") {
      const input = z.object({ failed: z.boolean() }).strict().parse(p.input);
      if (job.status === "researching")
        finishResearch(
          s,
          job,
          job.patches.length ? "awaiting_review" : "failed",
          input.failed
            ? "Worker stopped with an error. No result is claimed."
            : "Worker completed without requesting a benchmark. Operator review is required.",
        );
      result = { recorded: true };
    } else throw new DomainError("Unsupported research operation.", 404);
    job.commands[key] = { fingerprint, result };
    return result;
  });
}
export async function getPublicLab(actor: import("./domain").Actor | null) {
  const { publicLab } = await import("./lab-domain");
  return publicLab(await readState(), actor);
}
