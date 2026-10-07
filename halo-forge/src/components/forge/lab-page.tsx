"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  RefreshCw,
  Play,
  Pause,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heading, Panel, Empty, money, short } from "./shared";
import type { PageProps } from "./app";
import type { PublicLab } from "@/lib/lab-domain";

const active = ["dispatching", "researching", "evaluating"];
const labels: Record<string, string> = {
  queued: "Queued",
  dispatching: "Starting worker",
  researching: "Reading & proposing",
  evaluating: "Running tests",
  awaiting_review: "Awaiting your review",
  failed: "Stopped with an error",
  cancelled: "Cancelled",
};
export function LabPage({ data, connect }: PageProps) {
  const [lab, setLab] = useState<PublicLab | null>(null),
    [error, setError] = useState(""),
    [updated, setUpdated] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [note, setNote] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/lab", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setLab(d);
      setUpdated(new Date().toISOString());
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Activity could not be refreshed.",
      );
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);
  const act = async (body: Record<string, unknown>) => {
    if (!data.actor) {
      connect();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/lab/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };
  const job = lab?.jobs.find((j) => j.id === selected) ?? lab?.jobs[0];
  const running =
    lab?.jobs.filter((j) => active.includes(j.status)).length ?? 0;
  return (
    <>
      <Heading
        title="Inside the lab."
        description="Watch experiments move from pinned source to a patch, then to measured evidence."
      >
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </Heading>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error} Last loaded data is kept below.
          </AlertDescription>
        </Alert>
      )}
      <div className="lab-signal">
        <div>
          <span className={`lab-beacon ${running ? "is-active" : ""}`} />
          <strong>
            {running
              ? "An experiment is in progress"
              : lab?.enabled
                ? "Lab ready"
                : "Research paused"}
          </strong>
          <span>
            {running
              ? "Recorded events, refreshed every 5 seconds"
              : "Work appears here only after a real job starts."}
          </span>
        </div>
        <span>
          {updated
            ? `Updated ${new Date(updated).toLocaleTimeString()}`
            : "Connecting…"}
        </span>
      </div>
      <div className="lab-team">
        {data.agents
          .filter((a) => a.platform)
          .map((a, i) => {
            const latest = lab?.jobs.find((j) => j.agentId === a.id);
            return (
              <section key={a.id} className="lab-station">
                <div className="lab-station-top">
                  <span className="lab-index">
                    0{i + 1} / {a.track}
                  </span>
                  <Badge variant="outline">
                    {latest ? labels[latest.status] : "No experiment yet"}
                  </Badge>
                </div>
                <Link href={`/agents/${a.id}`}>
                  <h2>
                    {a.name}
                    <ArrowUpRight size={18} />
                  </h2>
                </Link>
                <p>{a.description}</p>
                <div className="lab-station-bottom">
                  <span>
                    {latest
                      ? `${latest.modelCalls} model calls`
                      : "Assigned method"}
                  </span>
                  {(data.actor?.reviewer ||
                    data.actor?.wallet === a.deployer) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        busy ||
                        !lab?.enabled ||
                        (!!latest &&
                          [...active, "queued"].includes(latest.status))
                      }
                      onClick={() =>
                        void act({ action: "queue", agentId: a.id })
                      }
                    >
                      <Play size={13} />
                      Run experiment
                    </Button>
                  )}
                </div>
              </section>
            );
          })}
      </div>
      <div className="lab-workbench">
        <section className="lab-register" aria-label="Experiment history">
          <div className="section-title">
            <h2>Experiment register</h2>
            <span className="muted">{lab?.jobs.length ?? 0} recorded</span>
          </div>
          {!lab?.jobs.length ? (
            <Empty
              title="Waiting for the first run"
              description="Source reads, candidate patches and test results will be recorded here. No activity is simulated."
            />
          ) : (
            lab.jobs.map((j) => (
              <button
                key={j.id}
                className={`lab-job ${job?.id === j.id ? "selected" : ""}`}
                onClick={() => {
                  setSelected(j.id);
                  setNote("");
                }}
              >
                <span className="lab-job-heading">
                  <strong>
                    {data.agents.find((a) => a.id === j.agentId)?.name ??
                      "Research agent"}
                  </strong>
                  <ArrowUpRight size={15} />
                </span>
                <span>
                  {labels[j.status]}
                  {j.review ? ` · ${j.review.decision}` : ""}
                </span>
                <span className="lab-job-date">
                  {new Date(j.createdAt).toLocaleString()} · {short(j.id)}
                </span>
              </button>
            ))
          )}
        </section>
        <section className="lab-evidence" aria-label="Selected experiment">
          {job ? (
            <>
              <div className="lab-evidence-heading">
                <div>
                  <span className="lab-index">{job.assignment.methodId}</span>
                  <h2>{labels[job.status]}</h2>
                </div>
                <Badge variant="outline">Manual review</Badge>
              </div>
              <div className="lab-receipts">
                <div>
                  <span>Model calls</span>
                  <strong>{job.modelCalls} / 12</strong>
                </div>
                <div>
                  <span>Reported model cost</span>
                  <strong>${job.modelCostUsd.toFixed(4)}</strong>
                </div>
                <div>
                  <span>Maximum allocation</span>
                  <strong>{money(job.reservationCents)}</strong>
                </div>
              </div>
              <p className="field-hint">
                Allocation includes a reserve for evaluation. It is a spending
                ceiling, not an invoice. Missing provider usage is not treated
                as a final bill.
              </p>
              <ol className="lab-timeline">
                {job.events.map((e) => (
                  <li key={e.sequence}>
                    <time dateTime={e.at}>
                      {new Date(e.at).toLocaleTimeString()}
                    </time>
                    <div>
                      <span>{e.stage.replaceAll("_", " ")}</span>
                      <p>{e.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {job.patches.map((p) => (
                <div key={p.digest} className="lab-artifact">
                  <h3>Candidate hypothesis</h3>
                  <p>{p.hypothesis}</p>
                  <p className="muted">{p.expectedTradeoff}</p>
                  <code>SHA-256 {p.digest}</code>
                  {p.diff ? (
                    <details>
                      <summary>Inspect patch</summary>
                      <pre>{p.diff}</pre>
                    </details>
                  ) : (
                    <p className="field-hint">
                      The deployer and operator can sign in to inspect the
                      frozen patch.
                    </p>
                  )}
                </div>
              ))}
              {job.evaluation && (
                <div className="lab-artifact">
                  <h3>Development evidence</h3>
                  <Badge variant="outline">
                    {job.evaluation.status === "passed"
                      ? "Commands passed"
                      : "Failed / incomplete"}
                  </Badge>
                  {job.evaluation.changePercent !== undefined && (
                    <p className="lab-measurement">
                      {job.evaluation.changePercent.toFixed(2)}%{" "}
                      <span>MSM time reduction · 4 threads</span>
                    </p>
                  )}
                  {job.evaluation.baselineNs !== undefined && (
                    <p className="muted">
                      Baseline {(job.evaluation.baselineNs / 1e6).toFixed(3)} ms
                      → candidate{" "}
                      {((job.evaluation.candidateNs ?? 0) / 1e6).toFixed(3)} ms
                    </p>
                  )}
                  {job.evaluation.baselineSingleNs !== undefined && (
                    <p className="muted">
                      1 thread:{" "}
                      {(job.evaluation.baselineSingleNs / 1e6).toFixed(3)} ms →{" "}
                      {((job.evaluation.candidateSingleNs ?? 0) / 1e6).toFixed(
                        3,
                      )}{" "}
                      ms
                    </p>
                  )}
                  <p>{job.evaluation.limitation}</p>
                  {job.evaluation.commands?.map((c, i) => (
                    <details key={i}>
                      <summary>
                        {c.name} · exit {c.exitCode}
                      </summary>
                      <pre>
                        {c.stdout}
                        {"\n"}
                        {c.stderr}
                      </pre>
                    </details>
                  ))}
                </div>
              )}
              {job.review ? (
                <div className="lab-artifact">
                  <h3>Operator decision: {job.review.decision}</h3>
                  <p>{job.review.note}</p>
                  <p className="field-hint">
                    Reviewed by {short(job.review.reviewer)}. Payouts are
                    handled manually.
                  </p>
                </div>
              ) : data.actor?.reviewer && job.status === "awaiting_review" ? (
                <div className="lab-artifact">
                  <h3>Your review</h3>
                  <Textarea
                    aria-label="Review note"
                    placeholder="What did you verify, and what should happen next?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="lab-review-buttons">
                    <Button
                      disabled={busy || note.trim().length < 15}
                      onClick={() =>
                        void act({
                          action: "review",
                          jobId: job.id,
                          decision: "accepted",
                          note,
                        })
                      }
                    >
                      <Check size={15} />
                      Accept for follow-up
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || note.trim().length < 15}
                      onClick={() =>
                        void act({
                          action: "review",
                          jobId: job.id,
                          decision: "rejected",
                          note,
                        })
                      }
                    >
                      <X size={15} />
                      Reject
                    </Button>
                  </div>
                  <p className="field-hint">
                    This records your decision. It does not transfer money or
                    certify a full-prover improvement.
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="lab-idle">
              <Activity size={36} />
              <h2>Evidence belongs here.</h2>
              <p>Select an experiment to follow its recorded work.</p>
            </div>
          )}
        </section>
      </div>
      <Panel
        title="A bounded research lab"
        description="Small experiments, visible receipts, human decisions."
      >
        <div className="aside-content">
          <p>
            The operator-funded allowance is {money(lab?.allocatedCents ?? 0)},
            with {money(lab?.committedCents ?? 0)} committed across experiments
            and a {money(lab?.dailyCapCents ?? 0)} daily ceiling. Jobs run
            sequentially. Development tests use pinned Halo2 source in a
            network-isolated sandbox; improvements are not guaranteed.
          </p>
          <p>
            Research is separate from token trading. A symbol is not proof of a
            launched mint. You review findings and handle any ZEC reward
            manually.
          </p>
          {data.actor?.reviewer && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void act({ action: "pause", paused: !!lab?.enabled })
              }
            >
              {lab?.enabled ? <Pause size={15} /> : <Play size={15} />}{" "}
              {lab?.enabled ? "Pause new experiments" : "Resume experiments"}
            </Button>
          )}
        </div>
      </Panel>
    </>
  );
}
