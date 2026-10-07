import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  allocateAssignment,
  assignmentFor,
  researchBrief,
  type ResearchAssignment,
} from "./research";

export const ZEC_MINT = "A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS";
export const CHALLENGE_ID = "ZEC-PROVER-CPU-001";
export const tracks = [
  {
    id: "S1",
    name: "Scalar representation",
    short: "Scalar reuse",
    target: "Buckets::sum",
    description:
      "Cache scalar representations across MSM bucket passes. Measure the cost of conversion against the extra memory traffic.",
  },
  {
    id: "S2",
    name: "Memory allocation",
    short: "MSM memory",
    target: "Buckets storage",
    description:
      "Reduce repeated allocation and initialization of MSM scratch storage without retaining private witness data.",
  },
  {
    id: "S3",
    name: "Parallel scheduling",
    short: "Scheduling",
    target: "best_multiexp",
    description:
      "Tune work distribution using public vector lengths. Keep thread limits fixed and measure single-thread regressions.",
  },
] as const;
export type Actor = { wallet: string; preview: boolean; reviewer: boolean };
export type Agent = {
  id: string;
  name: string;
  symbol: string;
  description: string;
  track: string;
  deployer: string;
  status: "ready" | "paused" | "running" | "awaiting_setup";
  platform?: boolean;
  assignment?: ResearchAssignment;
  budget: number;
  reserved: number;
  spent: number;
  dailyCap: number;
  autoRun: boolean;
  createdAt: string;
  preview: boolean;
  example: boolean;
  tokenMint: string | null;
  image?: string | null;
};
export type Run = {
  id: string;
  agentId: string;
  status: "queued" | "completed" | "cancelled";
  createdAt: string;
  reservation: number;
  cost: number;
  events: { time: string; message: string }[];
  preview: boolean;
  assignment?: ResearchAssignment;
};
export type Finding = {
  id: string;
  agentId: string;
  title: string;
  hypothesis: string;
  patch: string;
  digest: string;
  family: string;
  status: "submitted" | "qualified" | "rejected";
  createdAt: string;
  score: number | null;
  estimates: number[];
  memory: number | null;
  grade: string | null;
  review: string | null;
  preview: boolean;
  example: boolean;
};
export type Award = {
  id: string;
  findingId: string;
  agentId: string;
  recipient: string;
  amount: string;
  mint: string;
  category: string;
  status: "dispute" | "queued" | "preview_settled";
  eligibleAt: string;
  signature: string | null;
  preview: boolean;
  createdAt: string;
};
export type Entry = {
  id: string;
  agentId: string | null;
  amount: number;
  type: string;
  note: string;
  createdAt: string;
};
export type Audit = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
};
export type State = {
  lab?: import("./lab-domain").LabState;
  version: number;
  schemaVersion?: number;
  epochFinalizedAt?: string;
  agents: Agent[];
  runs: Run[];
  findings: Finding[];
  awards: Award[];
  ledger: Entry[];
  audit: Audit[];
  prizeAvailable: string;
  commands: Record<
    string,
    { actor: string; fingerprint: string; result: unknown }
  >;
};
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const grade = (score: number) =>
  score >= 20
    ? "Platinum"
    : score >= 10
      ? "Gold"
      : score >= 5
        ? "Silver"
        : score >= 3
          ? "Bronze"
          : null;
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${randomUUID().slice(0, 12)}`;
export function initialState(withPlatformAgents = true): State {
  const state: State = {
    version: 1,
    agents: [],
    runs: [],
    findings: [],
    awards: [],
    ledger: [],
    audit: [],
    prizeAvailable: "1000000000",
    commands: {},
  };
  if (withPlatformAgents) ensureResearchSetup(state);
  return state;
}

export function ensureResearchSetup(state: State, platform = true) {
  let changed = false;
  if (platform)
    for (const [index, methodId] of [
      "S1-representation",
      "S2-scratch",
      "S3-chunks",
    ].entries()) {
      const agentId = `platform-${index + 1}`;
      if (state.agents.some((a) => a.id === agentId)) continue;
      const assignment = assignmentFor(methodId);
      const brief = researchBrief(assignment);
      state.agents.push({
        id: agentId,
        name: ["Bucket Scout", "Scratch Worker", "Thread Weaver"][index],
        symbol: ["BUCKET", "SCRATCH", "THREAD"][index],
        description: brief.hypothesis,
        track: assignment.track,
        assignment,
        platform: true,
        deployer: "",
        status: "awaiting_setup",
        budget: 0,
        reserved: 0,
        spent: 0,
        dailyCap: 2000,
        autoRun: false,
        createdAt: now(),
        preview: true,
        example: false,
        tokenMint: null,
      });
      changed = true;
    }
  for (const agent of state.agents.filter((a) => !a.example && !a.assignment)) {
    const assignment = allocateAssignment(state.agents, agent.track);
    if (!assignment)
      throw new DomainError(
        "Research coverage is full; migration needs another approved experiment.",
        409,
      );
    agent.assignment = assignment;
    changed = true;
  }
  for (const run of state.runs.filter(
    (r) => r.status === "queued" && !r.assignment,
  )) {
    const assignment = state.agents.find(
      (a) => a.id === run.agentId,
    )?.assignment;
    if (assignment) {
      run.assignment = { ...assignment };
      changed = true;
    }
  }
  if (state.schemaVersion !== 2) {
    state.schemaVersion = 2;
    changed = true;
  }
  if (changed) state.version++;
  return changed;
}

const launchSchema = z
  .object({
    name: z.string().trim().min(3).max(32),
    symbol: z
      .string()
      .trim()
      .regex(/^[A-Z][A-Z0-9]{1,9}$/),
    description: z.string().trim().min(15).max(500),
    track: z.enum(["auto", "S1", "S2", "S3"]),
    dailyCap: z.number().int().min(2000).max(20000),
    image: z
      .string()
      .max(90000)
      .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/)
      .nullable()
      .optional(),
  })
  .strict();
const submissionSchema = z
  .object({
    agentId: z.string(),
    title: z.string().trim().min(8).max(100),
    hypothesis: z.string().trim().min(30).max(4000),
    patch: z.string().min(20).max(100000),
  })
  .strict();
const getAgent = (s: State, agentId: unknown) => {
  const a = s.agents.find((a) => a.id === agentId);
  if (!a) throw new DomainError("Agent not found.", 404);
  return a;
};
const owner = (s: State, actor: Actor, agentId: unknown) => {
  const a = getAgent(s, agentId);
  if (a.platform || a.example || a.deployer !== actor.wallet)
    throw new DomainError(
      "Only this agent's original deployer can change it.",
      403,
    );
  return a;
};
function record(s: State, actor: Actor, action: string, detail: string) {
  s.audit.unshift({
    id: id("event"),
    actor: actor.wallet,
    action,
    detail,
    createdAt: now(),
  });
}
function ledger(
  s: State,
  agentId: string | null,
  amount: number,
  type: string,
  note: string,
) {
  s.ledger.unshift({
    id: id("entry"),
    agentId,
    amount,
    type,
    note,
    createdAt: now(),
  });
}
export function execute(
  s: State,
  actor: Actor,
  action: string,
  input: Record<string, unknown>,
  key: string,
): unknown {
  if (!/^[\w-]{8,100}$/.test(key))
    throw new DomainError("A valid operation ID is required.");
  const fingerprint = hash(JSON.stringify({ action, input }));
  const previous = s.commands[key];
  if (previous) {
    if (previous.actor !== actor.wallet || previous.fingerprint !== fingerprint)
      throw new DomainError(
        "Operation ID was already used for a different request.",
        409,
      );
    return previous.result;
  }
  // Public-chain operations cannot silently fall back to preview settlement.
  if (!actor.preview)
    throw new DomainError(
      "Live launch and spending are not enabled. The fee route, evaluator and reward program must be verified first.",
      503,
    );
  let result: unknown;
  if (action === "launch") {
    const p = launchSchema.parse(input);
    const assignment = allocateAssignment(s.agents, p.track);
    if (!assignment)
      throw new DomainError(
        "All approved experiments in this assignment are allocated. Choose another assignment or wait for new research capacity.",
        409,
      );
    const a: Agent = {
      ...p,
      track: assignment.track,
      assignment,
      id: id("agent"),
      deployer: actor.wallet,
      status: "ready",
      budget: 0,
      reserved: 0,
      spent: 0,
      autoRun: false,
      createdAt: now(),
      preview: true,
      example: false,
      tokenMint: null,
    };
    s.agents.unshift(a);
    record(
      s,
      actor,
      "Agent registered",
      `${a.name} · ${assignment.key} · deployer fixed at registration · local preview, no token minted`,
    );
    result = { id: a.id };
  } else if (action === "topup") {
    const p = z
      .object({
        agentId: z.string(),
        cents: z.number().int().min(2000).max(100000),
      })
      .strict()
      .parse(input);
    const a = owner(s, actor, p.agentId);
    if (a.budget + p.cents > 1000000)
      throw new DomainError("Preview credit limit reached.");
    a.budget += p.cents;
    ledger(
      s,
      a.id,
      p.cents,
      "preview_credit",
      "Local test credit. No payment received.",
    );
    result = { balance: a.budget };
  } else if (action === "settings") {
    const p = z
      .object({
        agentId: z.string(),
        dailyCap: z.number().int().min(2000).max(20000),
        autoRun: z.boolean(),
        paused: z.boolean(),
      })
      .strict()
      .parse(input);
    const a = owner(s, actor, p.agentId);
    if (a.status === "running")
      throw new DomainError(
        "Stop the queued session before changing its limits.",
        409,
      );
    if (p.autoRun)
      throw new DomainError(
        "Automatic research is unavailable until the isolated worker and billing controller are configured.",
        503,
      );
    a.dailyCap = p.dailyCap;
    a.autoRun = false;
    a.status = p.paused ? "paused" : "ready";
    result = { id: a.id };
  } else if (action === "queue") {
    const p = z.object({ agentId: z.string() }).strict().parse(input);
    const a = owner(s, actor, p.agentId);
    if (a.status !== "ready")
      throw new DomainError(
        "Resume this agent or finish its current session first.",
        409,
      );
    if (!a.assignment)
      throw new DomainError(
        "This agent needs a research assignment before queuing.",
        409,
      );
    const brief = researchBrief(a.assignment);
    if (
      s.runs.some(
        (r) => r.status === "queued" && r.assignment?.key === a.assignment!.key,
      )
    )
      throw new DomainError(
        "This experiment already has an active session.",
        409,
      );
    const reservation = 2000;
    if (a.budget < reservation)
      throw new DomainError(
        "This session needs $20.00 of available compute credit.",
        409,
      );
    const today = now().slice(0, 10);
    const dayUse = s.runs
      .filter(
        (r) =>
          r.agentId === a.id &&
          r.createdAt.startsWith(today) &&
          r.status !== "cancelled",
      )
      .reduce(
        (sum, r) => sum + (r.status === "queued" ? r.reservation : r.cost),
        0,
      );
    if (dayUse + reservation > a.dailyCap)
      throw new DomainError(
        "This session would exceed your daily compute limit.",
        409,
      );
    a.budget -= reservation;
    a.reserved += reservation;
    a.status = "running";
    const run: Run = {
      id: id("run"),
      agentId: a.id,
      status: "queued",
      createdAt: now(),
      reservation,
      cost: 0,
      preview: true,
      assignment: { ...a.assignment },
      events: [
        {
          time: now(),
          message: `${brief.method} · ${brief.focus} · ${brief.key}`,
        },
        { time: now(), message: "$20 preview credit reserved atomically." },
        {
          time: now(),
          message:
            "Waiting for a research worker. No model call has been made.",
        },
      ],
    };
    s.runs.unshift(run);
    ledger(
      s,
      a.id,
      -reservation,
      "reservation",
      "Session funds reserved, not spent.",
    );
    result = { id: run.id };
  } else if (action === "cancel") {
    const p = z.object({ runId: z.string() }).strict().parse(input);
    const run = s.runs.find((r) => r.id === p.runId);
    if (!run) throw new DomainError("Session not found.", 404);
    const a = owner(s, actor, run.agentId);
    if (run.status !== "queued")
      throw new DomainError("This session is no longer queued.", 409);
    run.status = "cancelled";
    a.reserved -= run.reservation;
    a.budget += run.reservation;
    a.status = "ready";
    run.events.push({
      time: now(),
      message: "Cancelled. Full unused reservation returned.",
    });
    ledger(
      s,
      a.id,
      run.reservation,
      "release",
      "Unused session reservation returned.",
    );
    result = { id: run.id };
  } else if (action === "submit") {
    if (s.epochFinalizedAt) throw new DomainError("This epoch is closed.", 409);
    const p = submissionSchema.parse(input);
    const a = owner(s, actor, p.agentId);
    const digest = hash(p.patch.replace(/\r\n/g, "\n").trim());
    if (s.findings.some((f) => f.digest === digest))
      throw new DomainError(
        "This exact artifact is already registered. Disclose its parent contribution.",
        409,
      );
    if (s.findings.some((f) => f.agentId === a.id))
      throw new DomainError(
        "This agent already used its one submission for this epoch.",
        409,
      );
    const f: Finding = {
      ...p,
      id: id("finding"),
      digest,
      family: digest,
      status: "submitted",
      createdAt: now(),
      score: null,
      estimates: [],
      memory: null,
      grade: null,
      review: null,
      preview: true,
      example: false,
    };
    s.findings.unshift(f);
    record(s, actor, "Artifact frozen", `${f.title} · ${digest}`);
    result = { id: f.id };
  } else if (action === "review") {
    if (!actor.reviewer)
      throw new DomainError("Reviewer access is required.", 403);
    const p = z
      .object({
        findingId: z.string(),
        decision: z.literal("reject"),
        reason: z.string().trim().min(15).max(2000),
      })
      .strict()
      .parse(input);
    const f = s.findings.find((f) => f.id === p.findingId);
    if (!f || f.example)
      throw new DomainError("A submitted user artifact is required.", 404);
    if (getAgent(s, f.agentId).deployer === actor.wallet)
      throw new DomainError("You cannot review your own agent.", 403);
    if (f.status !== "submitted")
      throw new DomainError("This review has already been finalized.", 409);
    f.status = "rejected";
    f.review = p.reason;
    record(s, actor, "Review finalized", `${f.id} · rejected · ${p.reason}`);
    result = { id: f.id };
  } else throw new DomainError("Unknown action.", 404);
  s.commands[key] = { actor: actor.wallet, fingerprint, result };
  s.version += 1;
  return result;
}

// Only a trusted evaluator can construct these results. There is no browser API for approval.
export function qualifyFinding(
  s: State,
  findingId: string,
  evidence: {
    lowerBounds: [number, number];
    estimates: [number, number];
    maxSlowdownUpper: number;
    memoryIncrease: number;
    correctness: boolean;
    novelty: boolean;
    performanceReviewer: string;
    cryptoReviewer: string;
    evidenceDigest: string;
  },
): void {
  if (s.epochFinalizedAt)
    throw new DomainError("This epoch's ranking is already frozen.", 409);
  const f = s.findings.find((x) => x.id === findingId);
  if (!f || f.example || f.status !== "submitted")
    throw new DomainError("Finding is not eligible for adjudication.");
  const a = getAgent(s, f.agentId);
  if (!a.deployer || (a.platform && a.status === "awaiting_setup"))
    throw new DomainError(
      "This agent needs a verified deployer and operational setup before qualification.",
    );
  const nums = [
    ...evidence.lowerBounds,
    ...evidence.estimates,
    evidence.maxSlowdownUpper,
    evidence.memoryIncrease,
  ];
  if (
    nums.some((n) => !Number.isFinite(n)) ||
    evidence.lowerBounds.some(
      (n, i) => n < 0 || n >= 100 || n > evidence.estimates[i],
    ) ||
    evidence.estimates.some((n) => n >= 100)
  )
    throw new DomainError("Invalid measurement evidence.");
  if (!/^[a-f0-9]{64}$/.test(evidence.evidenceDigest))
    throw new DomainError("Evaluator evidence digest is required.");
  if (
    !evidence.performanceReviewer ||
    !evidence.cryptoReviewer ||
    evidence.performanceReviewer === evidence.cryptoReviewer ||
    [evidence.performanceReviewer, evidence.cryptoReviewer].includes(a.deployer)
  )
    throw new DomainError(
      "Two independent, non-conflicted reviews are required.",
    );
  const score = Math.min(...evidence.lowerBounds);
  if (
    score < 3 ||
    evidence.maxSlowdownUpper > 2 ||
    evidence.memoryIncrease > 5 ||
    !evidence.correctness ||
    !evidence.novelty
  )
    throw new DomainError("Finding does not pass all qualification gates.");
  f.status = "qualified";
  f.score = score;
  f.estimates = evidence.estimates;
  f.memory = evidence.memoryIncrease;
  f.grade = grade(score);
  f.review = `Independent evidence ${evidence.evidenceDigest}`;
}
export function rankFindings(findings: Finding[]) {
  const sorted = findings
    .filter((f) => f.status === "qualified" && f.score !== null && !f.example)
    .sort((a, b) => b.score! - a.score! || a.id.localeCompare(b.id));
  const prizes = [300000000n, 200000000n, 100000000n];
  const ranked: { finding: Finding; rank: number; amount: string }[] = [];
  const families = new Set<string>();
  const distinct = sorted.filter((f) => {
    if (families.has(f.family)) return false;
    families.add(f.family);
    return true;
  });
  let position = 0;
  while (position < distinct.length) {
    let end = position + 1;
    while (
      end < distinct.length &&
      distinct[position].score! - distinct[end].score! <= 0.25 + 1e-9
    )
      end++;
    const group = distinct
      .slice(position, end)
      .sort((a, b) => a.id.localeCompare(b.id));
    const pot = prizes.slice(position, end).reduce((a, b) => a + b, 0n);
    const each = pot / BigInt(group.length);
    const remainder = pot % BigInt(group.length);
    group.forEach((finding, i) =>
      ranked.push({
        finding,
        rank: position + 1,
        amount: (each + (BigInt(i) < remainder ? 1n : 0n)).toString(),
      }),
    );
    position = end;
  }
  return ranked;
}
export function finalizeAwards(s: State, closeTime: string) {
  if (s.epochFinalizedAt) return;
  if (!Number.isFinite(Date.parse(closeTime)))
    throw new DomainError("Invalid finalization time.");
  const ranked = rankFindings(s.findings);
  const pending = ranked.filter(
    (r) =>
      BigInt(r.amount) > 0 &&
      !s.awards.some(
        (a) => a.findingId === r.finding.id && a.category === "discovery",
      ),
  );
  const needed = pending.reduce((sum, r) => sum + BigInt(r.amount), 0n);
  if (needed > BigInt(s.prizeAvailable))
    throw new DomainError("Prize reserve is insufficient.");
  if (pending.some((r) => !getAgent(s, r.finding.agentId).deployer))
    throw new DomainError("Every award requires a bound original deployer.");
  for (const r of pending) {
    const a = getAgent(s, r.finding.agentId);
    s.awards.push({
      id: `award-${r.finding.id}`,
      findingId: r.finding.id,
      agentId: a.id,
      recipient: a.deployer,
      amount: r.amount,
      mint: ZEC_MINT,
      category: "discovery",
      status: "dispute",
      eligibleAt: new Date(Date.parse(closeTime) + 72 * 3600000).toISOString(),
      signature: null,
      preview: a.preview,
      createdAt: closeTime,
    });
  }
  s.prizeAvailable = (BigInt(s.prizeAvailable) - needed).toString();
  s.epochFinalizedAt = closeTime;
}
export function settlePreviewAwards(s: State, at: number) {
  for (const award of s.awards) {
    if (
      !award.preview ||
      award.status === "preview_settled" ||
      Date.parse(award.eligibleAt) > at
    )
      continue;
    if (
      award.recipient !== getAgent(s, award.agentId).deployer ||
      award.mint !== ZEC_MINT
    )
      throw new DomainError(
        "Award destination does not match the immutable deployer.",
      );
    award.status = "preview_settled";
    award.signature = null; // Never invent an on-chain receipt.
  }
}
