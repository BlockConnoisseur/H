import { randomUUID } from "node:crypto";
import { DomainError, type State, type Actor } from "./domain";
import { researchBrief, type ResearchAssignment } from "./research";

export type LabEvent = {
  sequence: number;
  at: string;
  stage: string;
  message: string;
};
export type Evaluation = {
  scope: "halo2-msm-development";
  status: "passed" | "failed";
  correctness: boolean;
  baselineNs?: number;
  candidateNs?: number;
  changePercent?: number;
  baselineSingleNs?: number;
  candidateSingleNs?: number;
  sourceRevision: string;
  snapshotId: string;
  patchDigest: string;
  commands: {
    name: string;
    exitCode: number;
    stdout: string;
    stderr: string;
  }[];
  limitation: string;
  durationSeconds: number;
};
export type LabJob = {
  id: string;
  agentId: string;
  deployer: string;
  tokenMint: string | null;
  assignment: ResearchAssignment;
  status:
    | "queued"
    | "dispatching"
    | "researching"
    | "evaluating"
    | "awaiting_review"
    | "failed"
    | "cancelled";
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
  reservationCents: number;
  modelSteps: string[];
  modelReceipts: Record<
    string,
    { costUsd: number; inputTokens: number; outputTokens: number }
  >;
  events: LabEvent[];
  patches: {
    digest: string;
    diff: string;
    hypothesis: string;
    expectedTradeoff: string;
    createdAt: string;
  }[];
  evaluation?: Evaluation;
  evaluationHistory?: Evaluation[];
  evaluationClaimedAt?: string;
  review?: {
    decision: "accepted" | "rejected";
    note: string;
    reviewer: string;
    at: string;
  };
  commands: Record<string, { fingerprint: string; result: unknown }>;
};
export type LabState = {
  allocatedCents: number;
  dailyCapCents: number;
  enabled: boolean;
  jobs: LabJob[];
};
export const activeStatuses = [
  "queued",
  "dispatching",
  "researching",
  "evaluating",
];
export function labState(s: State): LabState {
  return (s.lab ??= {
    allocatedCents: 0,
    dailyCapCents: 1000,
    enabled: false,
    jobs: [],
  });
}
export function event(job: LabJob, stage: string, message: string) {
  job.updatedAt = new Date().toISOString();
  job.events.push({
    sequence: job.events.length + 1,
    at: job.updatedAt,
    stage,
    message,
  });
}
export function queueResearch(
  s: State,
  agentId: string,
  actor?: Actor,
): LabJob {
  const lab = labState(s),
    agent = s.agents.find((a) => a.id === agentId);
  if (!lab.enabled) throw new DomainError("Research execution is paused.", 503);
  if (!agent?.assignment || !agent.deployer)
    throw new DomainError("Agent needs an assignment and deployer.");
  if (actor && actor.wallet !== agent.deployer && !actor.reviewer)
    throw new DomainError(
      "Only this agent's deployer or the operator can queue research.",
      403,
    );
  if (agent.status === "paused")
    throw new DomainError("This agent is paused.", 409);
  if (
    !agent.platform &&
    (agent.preview || !agent.tokenMint || agent.budget < 300)
  )
    throw new DomainError(
      "This agent needs a verified token and a funded $3 experiment allowance.",
      409,
    );
  if (
    lab.jobs.some(
      (j) => j.agentId === agentId && activeStatuses.includes(j.status),
    )
  )
    throw new DomainError("This agent already has an active experiment.", 409);
  const today = new Date().toISOString().slice(0, 10);
  if (
    !agent.platform &&
    lab.jobs
      .filter((j) => j.agentId === agent.id && j.createdAt.startsWith(today))
      .reduce((n, j) => n + j.reservationCents, 0) +
      300 >
      agent.dailyCap
  )
    throw new DomainError(
      "This agent has reached its daily compute limit.",
      409,
    );
  const daily = lab.jobs
    .filter((j) => j.createdAt.startsWith(today))
    .reduce((n, j) => n + j.reservationCents, 0);
  const reserved =
    lab.jobs.reduce((n, j) => n + j.reservationCents, 0) +
    (s.pumpLaunches ?? []).filter((d) => !d.abandoned && !d.agentId).length *
      300 +
    s.agents
      .filter((a) => !a.platform && !a.preview)
      .reduce((n, a) => n + a.budget, 0) -
    (agent.platform ? 0 : 300);
  if (daily + 300 > lab.dailyCapCents || reserved + 300 > lab.allocatedCents)
    throw new DomainError(
      "The operator-funded research allowance is exhausted. No model call was made.",
      409,
    );
  researchBrief(agent.assignment);
  const job: LabJob = {
    id: randomUUID(),
    agentId,
    deployer: agent.deployer,
    tokenMint: agent.tokenMint,
    assignment: { ...agent.assignment },
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reservationCents: 300,
    modelSteps: [],
    modelReceipts: {},
    events: [],
    patches: [],
    commands: {},
  };
  event(
    job,
    "queued",
    "Experiment queued with a $3 maximum allocation. Review and payouts are manual.",
  );
  lab.jobs.push(job);
  if (agent.platform) agent.preview = false;
  if (!agent.platform) {
    agent.budget -= 300;
    agent.reserved += 300;
  }
  agent.status = "running";
  return job;
}
export function sessionJob(s: State, sessionId: string) {
  const job = labState(s).jobs.find((j) => j.sessionId === sessionId);
  if (!job) throw new DomainError("Unknown research session.", 403);
  if (!["researching", "evaluating"].includes(job.status))
    throw new DomainError("This session is no longer active.", 409);
  if (Date.now() - Date.parse(job.createdAt) > 45 * 60_000)
    throw new DomainError("Research session expired.", 409);
  return job;
}
export function finishResearch(
  s: State,
  job: LabJob,
  status: LabJob["status"],
  message: string,
) {
  job.status = status;
  event(job, status, message);
  const agent = s.agents.find((a) => a.id === job.agentId);
  if (agent) agent.status = "ready";
}
export function reviewResearch(
  s: State,
  actor: Actor,
  id: string,
  decision: "accepted" | "rejected",
  note: string,
) {
  if (!actor.reviewer || actor.preview)
    throw new DomainError("Operator wallet sign-in is required.", 403);
  const job = labState(s).jobs.find((j) => j.id === id);
  if (!job || job.status !== "awaiting_review")
    throw new DomainError(
      "This experiment is not ready for manual review.",
      409,
    );
  if (job.review) throw new DomainError("The review is already recorded.", 409);
  if (note.trim().length < 15 || note.length > 2000)
    throw new DomainError("Add a review note between 15 and 2000 characters.");
  job.review = {
    decision,
    note: note.trim(),
    reviewer: actor.wallet,
    at: new Date().toISOString(),
  };
  event(
    job,
    "manual_review",
    `Operator ${decision} this experiment. This decision does not send a payment or certify a full-prover gain.`,
  );
}
export function publicLab(s: State, actor: Actor | null) {
  const lab = labState(s);
  return {
    enabled: lab.enabled,
    allocatedCents: lab.allocatedCents,
    dailyCapCents: lab.dailyCapCents,
    committedCents: lab.jobs.reduce((n, j) => n + j.reservationCents, 0),
    feeReceipts: (s.feeReceipts ?? []).filter(
      (r) =>
        actor?.reviewer ||
        s.agents.some(
          (a) => a.id === r.agentId && a.deployer === actor?.wallet,
        ),
    ),
    jobs: lab.jobs
      .slice(-150)
      .reverse()
      .map((j) => ({
        id: j.id,
        agentId: j.agentId,
        deployer: j.deployer,
        tokenMint: j.tokenMint,
        assignment: j.assignment,
        status: j.status,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        events: j.events,
        reservationCents: j.reservationCents,
        modelCalls: j.modelSteps.length,
        modelCostUsd: Object.values(j.modelReceipts).reduce(
          (n, r) => n + r.costUsd,
          0,
        ),
        inputTokens: Object.values(j.modelReceipts).reduce(
          (n, r) => n + r.inputTokens,
          0,
        ),
        outputTokens: Object.values(j.modelReceipts).reduce(
          (n, r) => n + r.outputTokens,
          0,
        ),
        patches: j.patches.map((p) => ({
          ...p,
          diff:
            actor?.reviewer || actor?.wallet === j.deployer
              ? p.diff
              : undefined,
        })),
        evaluation: j.evaluation
          ? {
              ...j.evaluation,
              commands:
                actor?.reviewer || actor?.wallet === j.deployer
                  ? j.evaluation.commands
                  : undefined,
            }
          : undefined,
        review: j.review,
      })),
  };
}
export type PublicLab = ReturnType<typeof publicLab>;
