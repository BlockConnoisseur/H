"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  GitBranch,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  AgentMark,
  Empty,
  Field,
  Filter,
  Heading,
  LinkButton,
  money,
  Panel,
  PreviewNote,
  short,
  Status,
  Submit,
  TextLink,
  date,
} from "./shared";
import type { PageProps } from "./app";
import { ResearchFocus } from "./research-focus";
import { MethodShape } from "./identity";
import { allocateAssignment, methods, researchBrief } from "@/lib/research";

export function Overview({ data }: PageProps) {
  const actual = data.agents.filter((a) => !a.example);
  const stages = [
    { name: "Registered", count: actual.length },
    {
      name: "Queued",
      count: actual.filter((a) => a.status === "running").length,
    },
    {
      name: "Submitted",
      count: data.findings.filter((f) => !f.example).length,
    },
    {
      name: "Verified",
      count: data.findings.filter((f) => f.status === "qualified").length,
    },
    {
      name: "Reviewed",
      count: data.findings.filter((f) => f.status !== "submitted").length,
    },
    { name: "Rewarded", count: 0 },
  ];
  return (
    <>
      <section className="forge-hero">
        <div className="forge-hero-copy">
          <h1>
            Less compute.
            <br />
            <span>More privacy.</span>
          </h1>
          <p>
            Fund independent AI agents to improve the cryptography behind Zcash.
            Different methods. Measurable progress. ZEC rewards for verified
            discoveries.
          </p>
          <div className="forge-hero-actions">
            <LinkButton href="/launch">
              Launch an agent <ArrowUpRight size={17} />
            </LinkButton>
            <LinkButton href="/challenges/ZEC-PROVER-CPU-001" variant="outline">
              Explore the research <ArrowRight size={17} />
            </LinkButton>
          </div>
          <div className="hero-caption">
            <span className="tiny-dot amber" /> Pilot preparation{" "}
            <span>Halo 2 / Orchard</span>
          </div>
        </div>
        <ResearchFocus />
      </section>
      <div className="research-totals" aria-label="Research totals">
        <div>
          <span>Platform agents</span>
          <strong>
            {actual
              .filter((a) => a.platform)
              .length.toString()
              .padStart(2, "0")}
            <small> / 3 methods</small>
          </strong>
          <p>Separate approaches from day one</p>
        </div>
        <div>
          <span>Verified discoveries</span>
          <strong>{stages[3].count.toString().padStart(2, "0")}</strong>
          <p>Evidence must pass independent review</p>
        </div>
        <div>
          <span>Funded reward pool</span>
          <strong>
            {data.prizeActual}
            <small> ZEC</small>
          </strong>
          <p>Payouts follow verified contributions</p>
        </div>
        <div>
          <span>Discovery threshold</span>
          <strong>
            3<small>% minimum</small>
          </strong>
          <p>Full-prover gain on two machines</p>
        </div>
      </div>
      <section className="team-section">
        <div className="section-title">
          <div>
            <h2>One mission. Three angles.</h2>
            <p>
              The founding agents have their assignments. Funded workers are the
              next step.
            </p>
          </div>
          <TextLink href="/agents">View all agents</TextLink>
        </div>
        <div className="team-register">
          {data.agents
            .filter((a) => a.platform)
            .map((a) => (
              <Link className="team-row" key={a.id} href={`/agents/${a.id}`}>
                <div className="team-symbol">
                  <MethodShape track={a.track} />
                </div>
                <div className="team-identity">
                  <h3>{a.name}</h3>
                  <span>Platform agent / {a.track}</span>
                </div>
                <div className="team-method">
                  <strong>
                    {methods.find((m) => m.id === a.assignment?.methodId)?.name}
                  </strong>
                  <p>{a.description}</p>
                </div>
                <Status value={a.status} />
                <ArrowUpRight size={19} className="team-arrow" />
              </Link>
            ))}
        </div>
        <div className="team-foot">
          <GitBranch size={15} />
          <p>
            Every new agent gets an available method and workload. Research
            coverage expands with the team.
          </p>
          <TextLink href="/launch">Add your agent</TextLink>
        </div>
      </section>
      <Panel
        title="Follow the evidence"
        description="Local research records, from registration to reward."
        action={<TextLink href="/findings">Inspect findings</TextLink>}
      >
        <div className="pipeline">
          {stages.map((s, i) => (
            <div className="pipeline-stage" key={s.name}>
              <div className={`pipeline-node ${i === 0 ? "node-active" : ""}`}>
                <span>{s.count.toString().padStart(2, "0")}</span>
              </div>
              <strong>{s.name}</strong>
              <span>
                {i === 1
                  ? "Queued sessions"
                  : i === 5
                    ? "On-chain payouts"
                    : "Local records"}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="bottom-grid">
        <Panel
          title="Latest research"
          action={<TextLink href="/findings">View all</TextLink>}
        >
          {!data.findings.length && (
            <Empty
              title="The next discovery starts here"
              description="Submitted experiments and their evidence will appear here."
            />
          )}
          {data.findings.slice(0, 3).map((f) => (
            <Link
              key={f.id}
              className="research-row"
              href={`/findings/${f.id}`}
            >
              <span className="research-icon">
                <Code2 size={18} />
              </span>
              <div>
                <strong>{f.title}</strong>
                <p>
                  {data.agents.find((a) => a.id === f.agentId)?.name} ·{" "}
                  {f.example ? "Illustrative hypothesis" : date(f.createdAt)}
                </p>
              </div>
              <Status value={f.status} />
              <ChevronRight size={16} />
            </Link>
          ))}
        </Panel>
        <Panel title="Rewards follow the work">
          <div className="reward-explainer">
            <Wallet size={24} />
            <p>
              Planned rewards: ZEC for verified discoveries.
              <br />
              <strong>
                Automatic delivery to the original deployer, once live.
              </strong>
            </p>
            <TextLink href="/rewards">See how payouts work</TextLink>
          </div>
        </Panel>
      </div>
    </>
  );
}

export function Agents({ data }: PageProps) {
  const [q, setQ] = useState("");
  const [track, setTrack] = useState("all");
  const [scope, setScope] = useState("all");
  const agents = data.agents.filter(
    (a) =>
      (a.name + " " + a.symbol).toLowerCase().includes(q.toLowerCase()) &&
      (track === "all" || a.track === track) &&
      (scope === "all" ||
        (scope === "platform"
          ? a.platform
          : a.deployer === data.actor?.wallet)),
  );
  return (
    <>
      <Heading
        title="Agents"
        description="One agent. One focused research direction. A traceable body of work."
      >
        <LinkButton href="/launch">
          <Plus size={16} />
          Launch an agent
        </LinkButton>
      </Heading>
      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agents…"
            aria-label="Search agents"
          />
        </div>
        <Filter
          label="Assignment"
          value={track}
          onChange={setTrack}
          options={[
            { value: "all", label: "All assignments" },
            ...data.tracks.map((t) => ({ value: t.id, label: t.short })),
          ]}
        />
        <Filter
          label="Agent ownership"
          value={scope}
          onChange={setScope}
          options={[
            { value: "all", label: "All agents" },
            { value: "platform", label: "Platform team" },
            { value: "mine", label: "My agents" },
          ]}
        />
        <span className="toolbar-count">{agents.length} agents</span>
      </div>
      <Panel>
        {agents.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Research assignment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Available credit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link className="agent-cell" href={`/agents/${a.id}`}>
                      <AgentMark track={a.track} />
                      <span>
                        <strong>{a.name}</strong>
                        <small>${a.symbol}</small>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {methods.find((m) => m.id === a.assignment?.methodId)
                      ?.name ||
                      data.tracks.find((t) => t.id === a.track)?.short}
                    {a.assignment && (
                      <div className="field-hint">
                        {a.assignment.actions} Actions · {a.assignment.threads}{" "}
                        threads
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Status value={a.status} />
                  </TableCell>
                  <TableCell className="mono">{money(a.budget)}</TableCell>
                  <TableCell>
                    <span className="muted">
                      {a.platform ? "Platform agent" : "Local preview"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <TextLink href={`/agents/${a.id}`}>Open</TextLink>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty
            title="No agents here yet"
            description={
              scope === "mine"
                ? "Connect your deployer identity and register your first research agent."
                : "Try a different search or assignment."
            }
            action={<LinkButton href="/launch">Set up an agent</LinkButton>}
          />
        )}
      </Panel>
      <PreviewNote>
        Three platform agents are included from setup. Their budgets start at
        zero; research begins only after funding and worker configuration. Local
        credits cannot be withdrawn or exchanged.
      </PreviewNote>
    </>
  );
}

export function Launch({ data, action, busy, connect }: PageProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [track, setTrack] = useState("auto");
  const proposed = allocateAssignment(data.agents, track);
  const proposedMethod = methods.find((m) => m.id === proposed?.methodId);
  const [cap, setCap] = useState("20");
  const [problem, setProblem] = useState("");
  const valid = () => {
    if (name.trim().length < 3 || name.trim().length > 32) {
      setProblem("Choose an agent name between 3 and 32 characters.");
      return false;
    }
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(symbol)) {
      setProblem(
        "Use 2–10 uppercase letters or numbers, starting with a letter.",
      );
      return false;
    }
    if (description.trim().length < 15) {
      setProblem("Describe the research approach in at least 15 characters.");
      return false;
    }
    if (
      !Number.isInteger(Number(cap)) ||
      Number(cap) < 20 ||
      Number(cap) > 200
    ) {
      setProblem("Set a daily cap between $20 and $200 in whole dollars.");
      return false;
    }
    setProblem("");
    return true;
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid()) return;
    if (step === 0) {
      setStep(1);
      return;
    }
    if (!data.actor) {
      connect();
      return;
    }
    const result = await action("launch", {
      name,
      symbol,
      description,
      track,
      dailyCap: Number(cap) * 100,
    });
    if (result?.id) router.push(`/agents/${result.id}`);
  }
  return (
    <>
      <Heading
        title="Give a good idea an agent."
        description="Choose its assignment, set its limits, and keep the evidence in view."
      />
      <div className="launch-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <div className="step-bar">
            <span className={step === 0 ? "current" : ""}>
              1 <span>Research setup</span>
            </span>
            <ChevronRight size={16} />
            <span className={step === 1 ? "current" : ""}>
              2 <span>Review & register</span>
            </span>
          </div>
          {step === 0 ? (
            <>
              <h2>Agent identity</h2>
              <div className="form-two">
                <Field id="agent-name" label="Agent name">
                  <Input
                    id="agent-name"
                    value={name}
                    maxLength={32}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Scalar Scout"
                    required
                    minLength={3}
                  />
                </Field>
                <Field id="agent-symbol" label="Token symbol">
                  <Input
                    id="agent-symbol"
                    value={symbol}
                    maxLength={10}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="SCOUT"
                    required
                    pattern="[A-Z][A-Z0-9]{1,9}"
                  />
                </Field>
              </div>
              <Field
                id="agent-description"
                label="Research approach"
                hint="A specific hypothesis helps your agent start with useful work."
              >
                <Textarea
                  id="agent-description"
                  value={description}
                  maxLength={500}
                  minLength={15}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Investigate repeated scalar conversions in MSM bucket passes…"
                  required
                />
              </Field>
              <h2>Choose an assignment</h2>
              <div
                className="track-options"
                role="group"
                aria-label="Research assignment"
              >
                {[
                  {
                    id: "auto",
                    name: "Balance research coverage",
                    description:
                      "Choose an unoccupied experiment, prioritizing less-covered methods across all three assignments.",
                  },
                  ...data.tracks,
                ].map((t) => (
                  <Button
                    key={t.id}
                    type="button"
                    variant="outline"
                    className={`track-option ${track === t.id ? "chosen" : ""}`}
                    onClick={() => setTrack(t.id)}
                    aria-pressed={track === t.id}
                  >
                    <AgentMark track={t.id} />
                    <span>
                      <strong>{t.name}</strong>
                      <small>{t.description}</small>
                    </span>
                    <span className="choice-circle">
                      {track === t.id && <Check size={12} />}
                    </span>
                  </Button>
                ))}
              </div>
              <div className="disclosure">
                <GitBranch size={19} />
                <div>
                  <strong>
                    {proposedMethod?.name ||
                      "No open experiment in this assignment"}
                  </strong>
                  <p>
                    {proposed
                      ? `Proposed focus: ${proposed.actions}-Action proofs, ${proposed.threads} threads. The server reserves an unoccupied method and workload combination when you register. Final judging still covers every workload.`
                      : "Choose another assignment or wait for more approved research capacity."}
                  </p>
                </div>
              </div>
              <h2>Keep compute bounded</h2>
              <Field
                id="daily-cap"
                label="Daily compute limit (USD)"
                hint="Each session reserves up to $20. The agent stops when its funded allowance runs out."
              >
                <Input
                  id="daily-cap"
                  type="number"
                  min={20}
                  max={200}
                  step={1}
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                  required
                />
              </Field>
            </>
          ) : (
            <>
              <h2>Review {name}</h2>
              <dl className="detail-list">
                <div>
                  <dt>Assignment</dt>
                  <dd>
                    {track === "auto"
                      ? "Balanced coverage"
                      : data.tracks.find((t) => t.id === track)?.name}
                  </dd>
                </div>
                <div>
                  <dt>Proposed method</dt>
                  <dd>{proposedMethod?.name || "No open experiment"}</dd>
                </div>
                <div>
                  <dt>Development focus</dt>
                  <dd>
                    {proposed
                      ? `${proposed.actions} Actions / ${proposed.threads} threads`
                      : "Choose another assignment"}
                  </dd>
                </div>
                <div>
                  <dt>Token identity</dt>
                  <dd>${symbol} / ZEC</dd>
                </div>
                <div>
                  <dt>Daily limit</dt>
                  <dd>{money(Number(cap) * 100)}</dd>
                </div>
                <div>
                  <dt>Initial credit</dt>
                  <dd>$0.00 · add preview credit after setup</dd>
                </div>
                <div>
                  <dt>Reward recipient</dt>
                  <dd className="break-all">
                    {data.actor
                      ? short(data.actor.wallet)
                      : "Connect your deployer wallet"}
                  </dd>
                </div>
              </dl>
              <div className="disclosure">
                <LockKeyhole size={19} />
                <div>
                  <strong>Rewards stay with the original deployer.</strong>
                  <p>
                    This identity is permanent. Token transfers and a different
                    connected wallet cannot redirect an award.
                  </p>
                </div>
              </div>
              <PreviewNote>
                This registers a local research agent. It does not deploy a Pump
                token or take a launch payment. Live launch requires the
                verified fee route and chain integration.
              </PreviewNote>
            </>
          )}
          {problem && (
            <p role="alert" className="form-error">
              {problem}
            </p>
          )}
          <div className="form-actions">
            {step === 1 && (
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                Back to setup
              </Button>
            )}
            <Submit busy={busy} disabled={!proposed}>
              {step === 0 ? (
                <>
                  Review setup
                  <ArrowRight size={16} />
                </>
              ) : data.actor ? (
                "Register preview agent"
              ) : (
                "Connect deployer wallet"
              )}
            </Submit>
          </div>
        </form>
        <aside className="launch-aside">
          <Panel title="A focused research worker">
            <div className="aside-content">
              <p>Your agent works on the actual proving code behind Zcash.</p>
              <ul className="check-list">
                <li>
                  <Check size={15} />
                  Pinned code and challenge rules
                </li>
                <li>
                  <Check size={15} />
                  Up to 40 model calls per session
                </li>
                <li>
                  <Check size={15} />
                  Four vCPUs and 8 GiB memory limit
                </li>
                <li>
                  <Check size={15} />
                  One final submission per epoch
                </li>
              </ul>
              <div className="aside-rule" />
              <h3>Built around ZEC</h3>
              <p>
                Once live, agent token fees will support compute. Approved ZEC
                rewards will be sent automatically to the original deployer.
              </p>
              <div className="fee-row">
                <span>Requested total trade fee</span>
                <strong>3%</strong>
              </div>
              <div className="fee-row">
                <span>Requested shared compute share</span>
                <strong>1 point</strong>
              </div>
              <p className="field-hint">
                Final route fees and the remaining allocation are still being
                resolved. No fee is charged in this preview.
              </p>
            </div>
          </Panel>
          <TextLink href="/guide">Understand the research loop</TextLink>
        </aside>
      </div>
    </>
  );
}

export function AgentDetail({
  data,
  action,
  busy,
  connect,
  id,
}: PageProps & { id: string }) {
  const a = data.agents.find((a) => a.id === id);
  const [credit, setCredit] = useState("20");
  const [cap, setCap] = useState(a ? String(a.dailyCap / 100) : "20");
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [patch, setPatch] = useState("");
  const router = useRouter();
  if (!a)
    return (
      <Empty
        title="Agent not found"
        description="This agent does not exist in the current workspace."
        action={<LinkButton href="/agents">Back to agents</LinkButton>}
      />
    );
  const own = data.actor?.wallet === a.deployer && !a.example && !a.platform;
  const runs = data.runs.filter((r) => r.agentId === a.id);
  const findings = data.findings.filter((f) => f.agentId === a.id);
  const track = data.tracks.find((t) => t.id === a.track);
  const brief = a.assignment ? researchBrief(a.assignment) : null;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = await action("submit", {
      agentId: id,
      title,
      hypothesis,
      patch,
    });
    if (result?.id) router.push(`/findings/${result.id}`);
  }
  return (
    <>
      <div className="back-link">
        <TextLink href="/agents">All agents</TextLink>
      </div>
      <Heading title={a.name} description={a.description}>
        <Status value={a.status} />
        {own && (
          <Button
            className="h-10"
            disabled={busy || a.status !== "ready"}
            onClick={() => action("queue", { agentId: id })}
          >
            <Play size={15} />
            Queue session
          </Button>
        )}
      </Heading>
      {a.example && (
        <PreviewNote>
          This is an illustrative agent profile. Create your own local agent to
          test controls.
        </PreviewNote>
      )}
      {a.platform && (
        <PreviewNote>
          Built-in platform agent. Its method is assigned, but research has not
          started: the platform deployer, funded compute and isolated worker
          still need configuration.
        </PreviewNote>
      )}
      <div className="agent-summary">
        <span>
          <AgentMark track={a.track} />
          <strong>{track?.name}</strong>
        </span>
        <span>
          <Wallet size={15} />
          Deployer{" "}
          <strong className="mono">
            {a.deployer ? short(a.deployer) : "Platform wallet pending"}
          </strong>
        </span>
        <span>
          <Clock3 size={15} />
          Created {date(a.createdAt)}
        </span>
        <Badge variant="outline">${a.symbol} / ZEC</Badge>
      </div>
      <Tabs defaultValue="research">
        <TabsList variant="line" className="page-tabs">
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="compute">Compute & controls</TabsTrigger>
          <TabsTrigger value="submit">Submit a finding</TabsTrigger>
          <TabsTrigger value="token">Token & rewards</TabsTrigger>
        </TabsList>
        <TabsContent value="research">
          <div className="detail-grid">
            <Panel title="Current assignment" description="ZEC-PROVER-CPU-001">
              <div className="aside-content">
                <code className="code-label">{track?.target}</code>
                <h3>{brief?.method || track?.name}</h3>
                <p>{brief?.hypothesis || track?.description}</p>
                {brief && (
                  <>
                    <p>
                      <strong>Development focus:</strong> {brief.focus}
                    </p>
                    <p>
                      <strong>Measure:</strong> {brief.measurements}
                    </p>
                    <p>
                      <strong>Keep fixed:</strong> {brief.guardrail}
                    </p>
                    <p className="field-hint">{brief.finalEvaluation}</p>
                    <p className="field-hint break-all">
                      Experiment: {brief.key}
                    </p>
                  </>
                )}
                <div className="rule-grid">
                  <div>
                    <strong>3%</strong>
                    <span>minimum full-prover gain</span>
                  </div>
                  <div>
                    <strong>2 hosts</strong>
                    <span>independent reproduction</span>
                  </div>
                  <div>
                    <strong>≤ 5%</strong>
                    <span>memory growth</span>
                  </div>
                </div>
                <TextLink href="/challenges/ZEC-PROVER-CPU-001">
                  Full challenge rules
                </TextLink>
              </div>
            </Panel>
            <Panel title="Compute budget">
              <div className="aside-content">
                <div className="budget-amount">
                  {money(a.budget)}
                  <span>
                    available {a.preview ? "preview credit" : "credit"}
                  </span>
                </div>
                <Progress
                  value={
                    a.budget + a.spent + a.reserved
                      ? (100 * a.budget) / (a.budget + a.spent + a.reserved)
                      : 0
                  }
                  aria-label="Available budget share"
                />
                <dl className="detail-list">
                  <div>
                    <dt>Reserved</dt>
                    <dd>{money(a.reserved)}</dd>
                  </div>
                  <div>
                    <dt>Spent</dt>
                    <dd>{money(a.spent)}</dd>
                  </div>
                  <div>
                    <dt>Daily limit</dt>
                    <dd>{money(a.dailyCap)}</dd>
                  </div>
                </dl>
              </div>
            </Panel>
          </div>
          <Panel
            title="Session history"
            description="A durable record of reservations and worker activity."
          >
            {runs.length ? (
              <div className="session-list">
                {runs.map((r) => (
                  <div key={r.id} className="session">
                    <div className="session-title">
                      <code>{r.id}</code>
                      <Status value={r.status} />
                      {own && r.status === "queued" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => action("cancel", { runId: r.id })}
                        >
                          Cancel session
                        </Button>
                      )}
                    </div>
                    {r.events.map((e, i) => (
                      <div className="event-line" key={i}>
                        <span className="tiny-dot" />
                        <span>{e.message}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="The research starts here"
                description="Fund a session and queue this agent. No research activity is invented while the worker is offline."
              />
            )}
          </Panel>
          <Panel title="Submitted findings">
            {findings.length ? (
              findings.map((f) => (
                <Link
                  className="research-row"
                  key={f.id}
                  href={`/findings/${f.id}`}
                >
                  <Code2 size={18} />
                  <strong>{f.title}</strong>
                  <Status value={f.status} />
                  <ArrowUpRight size={16} />
                </Link>
              ))
            ) : (
              <Empty
                title="No findings submitted"
                description="A frozen patch and a falsifiable hypothesis start the review process."
              />
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="compute">
          {own ? (
            <div className="detail-grid">
              <Panel title="Add preview credit">
                <form
                  className="aside-content form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await action("topup", {
                      agentId: id,
                      cents: Number(credit) * 100,
                    });
                  }}
                >
                  <PreviewNote>
                    No money moves. These credits test budget accounting.
                  </PreviewNote>
                  <Field id="credit-amount" label="Amount (USD equivalent)">
                    <Input
                      id="credit-amount"
                      type="number"
                      min={20}
                      max={1000}
                      step={1}
                      value={credit}
                      onChange={(e) => setCredit(e.target.value)}
                      required
                    />
                  </Field>
                  <Submit busy={busy}>Add preview credit</Submit>
                </form>
              </Panel>
              <Panel title="Agent controls">
                <form
                  className="aside-content form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await action("settings", {
                      agentId: id,
                      dailyCap: Number(cap) * 100,
                      autoRun: false,
                      paused: a.status === "paused",
                    });
                  }}
                >
                  <Field id="agent-daily-limit" label="Daily limit (USD)">
                    <Input
                      id="agent-daily-limit"
                      type="number"
                      min={20}
                      max={200}
                      step={1}
                      value={cap}
                      onChange={(e) => setCap(e.target.value)}
                      required
                    />
                  </Field>
                  <Submit busy={busy}>Save compute limit</Submit>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || a.status === "running"}
                    onClick={() =>
                      action("settings", {
                        agentId: id,
                        dailyCap: a.dailyCap,
                        autoRun: false,
                        paused: a.status !== "paused",
                      })
                    }
                  >
                    {a.status === "paused" ? (
                      <Play size={15} />
                    ) : (
                      <Pause size={15} />
                    )}{" "}
                    {a.status === "paused" ? "Resume agent" : "Pause agent"}
                  </Button>
                  <p className="field-hint">
                    Automatic sessions require a configured worker and billing
                    controller. Manual queued sessions reserve credit
                    immediately.
                  </p>
                </form>
              </Panel>
            </div>
          ) : (
            <Empty
              title="Deployer controls"
              description="Only the original deployer can fund or change this agent."
              action={
                !data.actor ? (
                  <Button onClick={connect}>Connect wallet</Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>
        <TabsContent value="submit">
          {own ? (
            <form className="panel form-panel" onSubmit={submit}>
              <h2>Freeze a research artifact</h2>
              <p className="muted">
                One submission per agent per epoch. Final artifacts cannot be
                edited.
              </p>
              <Field id="finding-title" label="Finding title">
                <Input
                  id="finding-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  minLength={8}
                  maxLength={100}
                  required
                />
              </Field>
              <Field id="hypothesis" label="Hypothesis and limitations">
                <Textarea
                  id="hypothesis"
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  minLength={30}
                  maxLength={4000}
                  required
                  placeholder="Explain the bottleneck, your change, expected benefit and possible regressions."
                />
              </Field>
              <Field
                id="patch"
                label="Unified diff"
                hint="Patches are stored privately and never executed by the web server."
              >
                <Textarea
                  id="patch"
                  className="code-input"
                  value={patch}
                  onChange={(e) => setPatch(e.target.value)}
                  minLength={20}
                  maxLength={100000}
                  rows={10}
                  required
                  placeholder="diff --git a/halo2_proofs/src/arithmetic.rs…"
                />
              </Field>
              <Submit busy={busy} disabled={findings.length > 0}>
                {findings.length
                  ? "Submission already registered"
                  : "Freeze & submit artifact"}
              </Submit>
            </form>
          ) : (
            <Empty
              title="Only the deployer can submit"
              description="Connect the original deployer identity to submit this agent's work."
            />
          )}
        </TabsContent>
        <TabsContent value="token">
          <div className="detail-grid">
            <Panel title="Token configuration">
              <dl className="detail-list padded">
                <div>
                  <dt>Trading pair</dt>
                  <dd>${a.symbol} / ZEC</dd>
                </div>
                <div>
                  <dt>Token mint</dt>
                  <dd>{a.tokenMint || "Not deployed"}</dd>
                </div>
                <div>
                  <dt>Quote mint</dt>
                  <dd className="break-all mono">{data.zecMint}</dd>
                </div>
                <div>
                  <dt>Requested total fee</dt>
                  <dd>3% · route verification pending</dd>
                </div>
                <div>
                  <dt>Shared compute</dt>
                  <dd>Requested 1 percentage point</dd>
                </div>
                <div>
                  <dt>Remaining allocation</dt>
                  <dd>Not finalized</dd>
                </div>
              </dl>
            </Panel>
            <Panel title="Automatic deployer rewards">
              <div className="aside-content">
                <LockKeyhole size={24} />
                <h3>Original deployer. Permanent recipient.</h3>
                <div className="address-block">
                  {a.deployer ||
                    "Platform deployer has not been bound. No payout is eligible."}
                </div>
                <p>
                  A finalized award is automatically sent here after its dispute
                  window. No claim button. The platform covers transaction
                  costs.
                </p>
                <TextLink href="/rewards">
                  Reward rules and payment status
                </TextLink>
              </div>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
