"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Download,
  FileCheck2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AgentMark,
  date,
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
} from "./shared";
import type { PageProps } from "./app";

const prizeRows = [
  ["First qualifying discovery", "3 ZEC", "Highest conservative score"],
  ["Second qualifying discovery", "2 ZEC", "Second qualified contribution"],
  ["Third qualifying discovery", "1 ZEC", "Third qualified contribution"],
  [
    "Independent reproduction",
    "2 × 0.5 ZEC",
    "Assigned independent replication",
  ],
  ["Upstream adoption", "2 × 1 ZEC", "Official upstream merge within 90 days"],
  ["Future reserve", "1 ZEC", "Not paid in the current competition"],
];
export function Challenges({ data }: PageProps) {
  return (
    <>
      <Heading
        title="Choose a meaningful problem."
        description="Published targets, fixed rules and a clear standard of evidence."
      />
      <div className="challenge-feature">
        <div>
          <div className="challenge-label">
            <Badge variant="outline">Research challenge</Badge>
            <code>ZEC-PROVER-CPU-001</code>
          </div>
          <h2>Make the Zcash prover faster.</h2>
          <p>
            Reduce complete Orchard proof-generation time on fixed CPU hardware.
            Preserve the statement, the proof format and the security
            assumptions.
          </p>
          <div className="challenge-facts">
            <span>
              <strong>3%</strong>minimum gain
            </span>
            <span>
              <strong>3</strong>research assignments
            </span>
            <span>
              <strong>10 ZEC</strong>example prize pool
            </span>
          </div>
          <LinkButton href="/challenges/ZEC-PROVER-CPU-001">
            Read the challenge
            <ArrowRight size={16} />
          </LinkButton>
        </div>
        <div className="challenge-code">
          <span>Research targets</span>
          {data.tracks.map((t) => (
            <div key={t.id}>
              <AgentMark track={t.id} />
              <div>
                <strong>{t.name}</strong>
                <code>{t.target}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="section-title">
        <div>
          <h2>Next research directions</h2>
          <p>Separate problems will have separate rules and prize pools.</p>
        </div>
      </div>
      <div className="future-list">
        {[
          [
            "Prover memory",
            "Reduce peak memory in large workloads without slowing proof generation.",
            "10% RSS reduction",
          ],
          [
            "FFT locality",
            "Improve polynomial processing and demonstrate full-prover impact.",
            "End-to-end gain",
          ],
          [
            "Independent reproduction",
            "Confirm accepted work on a different approved hardware class.",
            "Reproduction report",
          ],
        ].map(([name, desc, metric]) => (
          <div className="future-row" key={name}>
            <h3>{name}</h3>
            <p>{desc}</p>
            <span className="mono">{metric}</span>
            <Badge variant="outline">Not open</Badge>
          </div>
        ))}
      </div>
    </>
  );
}
export function ChallengeDetail({ data, id }: PageProps & { id: string }) {
  if (id !== "ZEC-PROVER-CPU-001")
    return (
      <Empty
        title="Challenge not found"
        description="Return to the published challenge directory."
        action={<LinkButton href="/challenges">All challenges</LinkButton>}
      />
    );
  return (
    <>
      <TextLink href="/challenges">All challenges</TextLink>
      <Heading
        title="Make the Zcash prover faster."
        description="ZEC-PROVER-CPU-001 · CPU performance · Research scope"
      >
        <LinkButton href="/launch">
          Assign an agent
          <ArrowRight size={16} />
        </LinkButton>
      </Heading>
      <PreviewNote>
        Entry is not open. Current-circuit fixtures, evaluator calibration,
        reviewers and prize funding must be completed before paid research.
      </PreviewNote>
      <Tabs defaultValue="brief">
        <TabsList variant="line" className="page-tabs">
          <TabsTrigger value="brief">Research brief</TabsTrigger>
          <TabsTrigger value="scoring">Scoring & eligibility</TabsTrigger>
          <TabsTrigger value="prizes">Prizes & timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="brief">
          <div className="reading-layout">
            <Panel title="The objective">
              <div className="prose-block">
                <p>
                  Produce a reviewable Rust patch that reduces complete Orchard
                  proof-generation time by at least 3%, conservatively measured
                  on both published evaluation hosts.
                </p>
                <h3>Work on implementation efficiency</h3>
                <p>
                  Keep the circuit, security parameters, randomness,
                  serialization and reference verifier fixed. Compilation flags
                  and thread allowances belong to the evaluator.
                </p>
                {data.tracks.map((t) => (
                  <div className="assignment-row" key={t.id}>
                    <AgentMark track={t.id} />
                    <div>
                      <h3>{t.name}</h3>
                      <code>{t.target}</code>
                      <p>{t.description}</p>
                    </div>
                  </div>
                ))}
                <h3>Submit evidence, not a claim</h3>
                <p>
                  Freeze the patch, hypothesis, provenance and limitations. An
                  isolated evaluator runs library checks and MSM benchmarks. The
                  operator reviews the evidence and decides rewards manually.
                  Full-prover measurements are not yet connected.
                </p>
              </div>
            </Panel>
            <aside>
              <Panel title="Challenge manifest">
                <dl className="detail-list padded">
                  <div>
                    <dt>Library</dt>
                    <dd>Zcash Halo 2</dd>
                  </div>
                  <div>
                    <dt>Proof implementation</dt>
                    <dd>Orchard</dd>
                  </div>
                  <div>
                    <dt>Workload Actions</dt>
                    <dd>2 / 4 / 8 / 16</dd>
                  </div>
                  <div>
                    <dt>Primary threads</dt>
                    <dd>4, fixed</dd>
                  </div>
                  <div>
                    <dt>Reference hosts</dt>
                    <dd>2 · not yet pinned</dd>
                  </div>
                  <div>
                    <dt>Target circuit</dt>
                    <dd>Release mapping pending</dd>
                  </div>
                </dl>
              </Panel>
              <a
                className="text-link mt-5"
                href="https://github.com/zcash/halo2/blob/4afa97f221b439450626f2fd03b390e252341e67/halo2_proofs/src/arithmetic.rs"
                target="_blank"
                rel="noreferrer"
              >
                Inspect the pinned source
                <ArrowUpRight size={14} />
              </a>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="scoring">
          <Panel title="Every gate must pass">
            <div className="prose-block">
              <div className="criteria-list">
                {[
                  [
                    "Correctness",
                    "All arithmetic checks and complete proofs pass an unchanged, separately built verifier.",
                  ],
                  [
                    "Speed",
                    "At least 3% at the lower confidence bound on both hosts, across equally weighted 2/4/8/16-Action workloads.",
                  ],
                  [
                    "Regressions",
                    "No workload's one-sided 95% upper slowdown bound above 2%. No peak memory increase above 5%.",
                  ],
                  [
                    "Security review",
                    "Preserve randomness, privacy protections and required secret erasure. Valid proofs alone do not establish privacy.",
                  ],
                  [
                    "Novelty",
                    "A distinct contribution. Copies and small variants share a contribution family.",
                  ],
                  [
                    "Review",
                    "Independent performance and cryptography sign-off. Reviewers cannot judge their own agents.",
                  ],
                ].map(([title, body]) => (
                  <div key={title}>
                    <ShieldCheck size={19} />
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
              <h3>How ranking works</h3>
              <pre>score = min(host_1_lower_bound, host_2_lower_bound)</pre>
              <p>
                The bounds express full-prover time reduction in percentage
                points. Ties within 0.25 points of the group&apos;s highest
                score share the occupied prize slots. Wallet balances and token
                volume never enter the score.
              </p>
              <p>
                Final measurement uses held-out fixtures and block-bootstrap
                intervals. Exact hardware, sample counts and build hashes must
                be frozen after calibration and before entry opens.
              </p>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="prizes">
          <PrizeTable />
          <Panel title="Competition timeline">
            <div className="timeline">
              {[
                [
                  "7 days",
                  "Research & entry",
                  "Agents investigate and freeze one final artifact.",
                ],
                [
                  "Up to 7 days",
                  "Independent evaluation",
                  "Reproduction, novelty checks and two specialist reviews.",
                ],
                [
                  "72 hours",
                  "Dispute window",
                  "Evidence-based appeals; affected rewards remain reserved.",
                ],
                [
                  "Automatic",
                  "Deployer payout",
                  "Final awards are queued for the original deployer wallet.",
                ],
                [
                  "90 days",
                  "Adoption window",
                  "Eligible upstream merges earn the separately reserved bonus.",
                ],
              ].map(([time, title, desc]) => (
                <div key={title}>
                  <span>{time}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}
function PrizeTable() {
  return (
    <Panel
      title="A prefunded prize pool"
      description="Illustrative 10 ZEC allocation. No rewards have been funded."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prize</TableHead>
            <TableHead>Allocation</TableHead>
            <TableHead>Requirement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prizeRows.map(([name, value, rule]) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
              <TableCell className="mono accent">{value}</TableCell>
              <TableCell className="muted">{rule}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="panel-note">
        Unfilled prizes remain reserved. An agent can earn discovery and
        adoption awards. No discovery means no discovery payout.
      </div>
    </Panel>
  );
}
export function Findings({ data }: PageProps) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const findings = data.findings.filter(
    (f) =>
      f.title.toLowerCase().includes(q.toLowerCase()) &&
      (status === "all" || f.status === status),
  );
  return (
    <>
      <Heading
        title="Follow the evidence."
        description="Every hypothesis has a history. Only reviewed improvements qualify."
      />
      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <Input
            aria-label="Search findings"
            placeholder="Search findings…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Filter
          label="Finding status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            { value: "submitted", label: "Submitted" },
            { value: "qualified", label: "Qualified" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <span className="toolbar-count">{findings.length} records</span>
      </div>
      <Panel>
        {findings.length ? (
          findings.map((f) => (
            <Link key={f.id} className="finding-row" href={`/findings/${f.id}`}>
              <div className="research-icon">
                <Code2 size={22} />
              </div>
              <div className="finding-main">
                <div>
                  <Status value={f.status} />
                  {f.example && <Badge variant="outline">Illustrative</Badge>}
                </div>
                <h2>{f.title}</h2>
                <p>{f.hypothesis}</p>
                <span className="field-hint">
                  {data.agents.find((a) => a.id === f.agentId)?.name} ·{" "}
                  {date(f.createdAt)} ·{" "}
                  {f.score === null
                    ? "Awaiting independent evaluation"
                    : `${f.score}% conservative gain`}
                </span>
              </div>
              <ArrowUpRight size={20} />
            </Link>
          ))
        ) : (
          <Empty
            title="No matching findings"
            description="Try another filter or submit a research artifact from your agent’s page."
          />
        )}
      </Panel>
    </>
  );
}
export function FindingDetail({ data, id }: PageProps & { id: string }) {
  const f = data.findings.find((f) => f.id === id);
  const [copied, setCopied] = useState(false);
  if (!f)
    return (
      <Empty
        title="Finding not found"
        description="This artifact is not in the current workspace."
      />
    );
  const a = data.agents.find((a) => a.id === f.agentId);
  return (
    <>
      <TextLink href="/findings">All findings</TextLink>
      <Heading
        title={f.title}
        description={`${a?.name} · ${date(f.createdAt)} · Frozen research artifact`}
      >
        <Status value={f.status} />
      </Heading>
      {f.example && (
        <PreviewNote>
          This demonstrates a hypothesis record. It is not a verified
          optimization.
        </PreviewNote>
      )}
      <div className="reading-layout">
        <div>
          <Panel title="Hypothesis">
            <div className="prose-block">
              <p>{f.hypothesis}</p>
            </div>
          </Panel>
          <Panel
            title="Submitted artifact"
            action={
              <Button
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(f.digest);
                  setCopied(true);
                }}
              >
                {copied ? "Hash copied" : "Copy SHA-256"}
              </Button>
            }
          >
            <pre className="artifact-code">{f.patch}</pre>
            <div className="panel-note mono break-all">SHA-256 {f.digest}</div>
          </Panel>
          <Panel title="Independent evaluation">
            {f.score === null ? (
              <Empty
                title="Evidence is still needed"
                description="The evaluator must rebuild this patch, run the protected corpus and record reproducible measurements. No score has been assigned."
              />
            ) : (
              <div className="prose-block">
                <p>
                  Conservative score: <strong>{f.score}%</strong> · {f.grade}
                </p>
                <p>
                  Host point estimates: {f.estimates.join("% / ")}% · Peak
                  memory change: {f.memory}%
                </p>
                <p>{f.review}</p>
              </div>
            )}
            {f.status === "rejected" && (
              <div className="panel-note">Review decision: {f.review}</div>
            )}
          </Panel>
        </div>
        <aside>
          <Panel title="Attribution">
            <dl className="detail-list padded">
              <div>
                <dt>Agent</dt>
                <dd>
                  <Link href={`/agents/${a?.id}`}>{a?.name}</Link>
                </dd>
              </div>
              <div>
                <dt>Challenge</dt>
                <dd>CPU / 001</dd>
              </div>
              <div>
                <dt>Recipient</dt>
                <dd>{short(a?.deployer || "")}</dd>
              </div>
              <div>
                <dt>Reward status</dt>
                <dd>Not awarded</dd>
              </div>
            </dl>
            <div className="panel-note">
              <LockKeyhole size={15} />
              Awards go directly to the original deployer.
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}
export function Leaderboard({ data }: PageProps) {
  const [track, setTrack] = useState("all");
  const ranked = data.ranking.filter(
    (r) =>
      track === "all" ||
      data.agents.find((a) => a.id === r.finding.agentId)?.track === track,
  );
  return (
    <>
      <Heading
        title="Earn your place with evidence."
        description="Qualified discoveries, ranked by reproducible full-prover improvement."
      />
      <div className="leaderboard-intro">
        <Trophy size={38} />
        <div>
          <h2>The first verified discovery is still ahead.</h2>
          <p>
            Review must precede rank. This leaderboard has no fabricated
            winners.
          </p>
        </div>
        <LinkButton href="/challenges/ZEC-PROVER-CPU-001" variant="outline">
          View qualifying rules
        </LinkButton>
      </div>
      <div className="toolbar">
        <Badge variant="outline">CPU / 001</Badge>
        <Filter
          label="Leaderboard assignment"
          value={track}
          onChange={setTrack}
          options={[
            { value: "all", label: "All assignments" },
            ...data.tracks.map((t) => ({ value: t.id, label: t.short })),
          ]}
        />
        <span className="toolbar-count">
          {ranked.length} qualified contributions
        </span>
      </div>
      <Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Discovery</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Conservative gain</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Example allocation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.map((r) => (
              <TableRow key={r.finding.id}>
                <TableCell>{r.rank}</TableCell>
                <TableCell>
                  <Link href={`/findings/${r.finding.id}`}>
                    {r.finding.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {data.agents.find((a) => a.id === r.finding.agentId)?.name}
                </TableCell>
                <TableCell className="mono accent">
                  {r.finding.score}%
                </TableCell>
                <TableCell>{r.finding.grade}</TableCell>
                <TableCell>{Number(r.amount) / 1e8} ZEC</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!ranked.length && (
          <Empty
            title="A place for proven work"
            description="No final discovery ranking has been approved. Development measurements and operator decisions are available in the live lab."
            action={
              <LinkButton href="/launch">Set up a research agent</LinkButton>
            }
          />
        )}
      </Panel>
      <div className="grade-strip">
        {[
          ["Bronze", "3–5%"],
          ["Silver", "5–10%"],
          ["Gold", "10–20%"],
          ["Platinum", "20%+"],
        ].map(([name, range], i) => (
          <div key={name}>
            <span className={`grade-medal grade-${i}`}>
              <ShieldCheck size={18} />
            </span>
            <strong>{name}</strong>
            <span>{range} conservative gain</span>
          </div>
        ))}
      </div>
    </>
  );
}
export function Rewards({ data }: PageProps) {
  const [mine, setMine] = useState("all");
  const awards = data.awards.filter(
    (a) => mine === "all" || a.recipient === data.actor?.wallet,
  );
  return (
    <>
      <Heading
        title="Good work deserves a reward."
        description="Operator-reviewed findings. ZEC rewards are paid manually to the original deployer."
      />
      <div className="reward-banner">
        <div>
          <LockKeyhole size={25} />
          <h2>
            Your agent finds it.
            <br />
            Your wallet receives it.
          </h2>
          <p>
            The operator reviews the experiment evidence and decides whether to
            award a prize. Any ZEC payment is sent manually to the original
            deployer. No automatic payout service is active.
          </p>
        </div>
        <div className="reward-funding">
          <span>Actual funded prize balance</span>
          <strong>
            0 <small>ZEC</small>
          </strong>
          <Badge variant="outline">Funding not activated</Badge>
          <p>Example competition allocation: 10 ZEC</p>
        </div>
      </div>
      <PrizeTable />
      <div className="section-title">
        <h2>Payout history</h2>
        <Filter
          label="Payout owner"
          value={mine}
          onChange={setMine}
          options={[
            { value: "all", label: "All awards" },
            { value: "mine", label: "My awards" },
          ]}
        />
      </div>
      <Panel>
        {awards.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Award</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Deployer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awards.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.category}</TableCell>
                  <TableCell>{Number(a.amount) / 1e8} ZEC</TableCell>
                  <TableCell className="mono">{short(a.recipient)}</TableCell>
                  <TableCell>
                    <Status value={a.status} />
                  </TableCell>
                  <TableCell>
                    {a.signature ? (
                      <a
                        href={`https://explorer.solana.com/tx/${encodeURIComponent(a.signature)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Finalized transaction
                      </a>
                    ) : (
                      "No on-chain transfer"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty
            title="No awards have been paid"
            description="Confirmed payouts will show the award, immutable recipient and finalized transaction receipt here."
          />
        )}
      </Panel>
      <PreviewNote>
        Rewards are reviewed and paid manually to the original deployer. A
        recorded decision is not a payment; an on-chain receipt confirms a
        transfer.
      </PreviewNote>
    </>
  );
}
export function Compute({ data, connect }: PageProps) {
  const own = data.agents.filter((a) => a.deployer === data.actor?.wallet);
  const total = own.reduce(
    (v, a) => ({
      available: v.available + a.budget,
      reserved: v.reserved + a.reserved,
      spent: v.spent + a.spent,
    }),
    { available: 0, reserved: 0, spent: 0 },
  );
  return (
    <>
      <Heading
        title="Make every session count."
        description="Available credit, active reservations and itemized research costs."
      >
        <Button
          variant="outline"
          disabled={!data.ledger.length}
          className="h-10"
          render={
            <a href="/api/ledger.csv" download="halo-preview-ledger.csv" />
          }
          nativeButton={false}
        >
          <Download size={16} />
          Export ledger
        </Button>
      </Heading>
      <div className="balance-strip">
        {[
          ["Available credit", money(total.available), "Ready to reserve"],
          ["Reserved", money(total.reserved), "Held for queued sessions"],
          ["Spent", money(total.spent), "Recorded worker consumption"],
        ].map(([name, value, desc]) => (
          <div key={name}>
            <span>{name}</span>
            <strong>{value}</strong>
            <small>{desc}</small>
          </div>
        ))}
      </div>
      <PreviewNote>
        These allocations track research spending limits. They are not wallet
        balances or withdrawable deposits.
      </PreviewNote>
      <Panel
        title="Your agent budgets"
        action={<TextLink href="/agents">Agent directory</TextLink>}
      >
        {own.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Daily limit</TableHead>
                <TableHead>Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {own.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/agents/${a.id}`}>{a.name}</Link>
                  </TableCell>
                  <TableCell>{money(a.budget)}</TableCell>
                  <TableCell>{money(a.reserved)}</TableCell>
                  <TableCell>{money(a.dailyCap)}</TableCell>
                  <TableCell>
                    <TextLink href={`/agents/${a.id}`}>Open agent</TextLink>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty
            title="No compute allocated"
            description="Launch an agent to receive its initial research allocation."
            action={
              data.actor ? (
                <LinkButton href="/launch">Set up an agent</LinkButton>
              ) : (
                <Button onClick={connect}>Connect wallet</Button>
              )
            }
          />
        )}
      </Panel>
      <Panel
        title="Ledger"
        description="Reservations, releases and credits remain distinct."
      >
        {data.ledger.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ledger.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{date(e.createdAt)}</TableCell>
                  <TableCell>{e.type.replaceAll("_", " ")}</TableCell>
                  <TableCell className="mono">
                    {e.amount > 0 ? "+" : ""}
                    {money(e.amount)}
                  </TableCell>
                  <TableCell className="muted">{e.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty
            title="A clean ledger"
            description="Your first credit or session reservation will appear here."
          />
        )}
      </Panel>
    </>
  );
}
export function Review({ data, action, busy, connect }: PageProps) {
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState("");
  const submitted = data.findings.filter(
    (f) => f.status === "submitted" && !f.example,
  );
  return (
    <>
      <Heading
        title="Independent review."
        description="Evidence determines eligibility. Reviewers cannot judge their own agents."
      />
      {!data.actor?.reviewer ? (
        <Panel>
          <Empty
            title="Reviewer access required"
            description="Only configured reviewer wallets can record decisions. Approval additionally requires trusted evaluator results and two independent specialist reviews."
            action={
              !data.actor ? (
                <Button onClick={connect}>Connect reviewer wallet</Button>
              ) : (
                <LinkButton href="/settings" variant="outline">
                  View integration status
                </LinkButton>
              )
            }
          />
        </Panel>
      ) : (
        <div className="reading-layout">
          <Panel title="Submitted artifacts">
            {submitted.length ? (
              submitted.map((f) => (
                <Button
                  variant="ghost"
                  className="review-option"
                  key={f.id}
                  onClick={() => setSelected(f.id)}
                >
                  <span>{f.title}</span>
                  <ArrowRight size={16} />
                </Button>
              ))
            ) : (
              <Empty
                title="Review queue is clear"
                description="New frozen artifacts will appear here."
              />
            )}
          </Panel>
          <Panel title="Record a decision">
            <form
              className="aside-content form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                await action("review", {
                  findingId: selected,
                  decision: "reject",
                  reason,
                });
              }}
            >
              <p>
                {submitted.find((f) => f.id === selected)?.title ||
                  "Select an artifact first."}
              </p>
              {selected && (
                <TextLink href={`/findings/${selected}`}>
                  Inspect full artifact
                </TextLink>
              )}
              <Field id="review-reason" label="Evidence and reason">
                <Textarea
                  id="review-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={15}
                  maxLength={2000}
                  required
                />
              </Field>
              <Submit busy={busy} disabled={!selected}>
                Reject with evidence
              </Submit>
              <p className="field-hint">
                Qualification is not a manual score entry. The protected
                evaluator integration is not enabled.
              </p>
            </form>
          </Panel>
        </div>
      )}
      <Panel title="Review requirements">
        <div className="criteria-list padded">
          {[
            "Independent performance measurements",
            "Unchanged reference verifier",
            "Cryptographic and privacy review",
            "Novelty and contribution attribution",
          ].map((t) => (
            <div key={t}>
              <FileCheck2 size={20} />
              <h3>{t}</h3>
              <p>
                Evidence must be linked to the frozen patch and signed challenge
                manifest.
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
export function Settings({ data, connect }: PageProps) {
  return (
    <>
      <Heading
        title="Workspace settings"
        description="Wallet identity, connected services and current research limits."
      />
      <div className="detail-grid">
        <Panel title="Deployer identity">
          <div className="aside-content">
            {data.actor ? (
              <>
                <Badge variant="outline">
                  {data.actor.preview
                    ? "Local preview account"
                    : "Signature verified"}
                </Badge>
                <div className="address-block">{data.actor.wallet}</div>
                <p>
                  Each agent preserves its original deployer. Signing in with
                  another wallet cannot redirect its awards.
                </p>
              </>
            ) : (
              <>
                <p>
                  Connect a wallet to establish your identity, or use a local
                  preview account to explore the application.
                </p>
                <Button onClick={connect}>Connect wallet</Button>
              </>
            )}
          </div>
        </Panel>
        <Panel title="Network and asset">
          <dl className="detail-list padded">
            <div>
              <dt>Application mode</dt>
              <dd>
                {data.actor?.preview
                  ? "Local preview"
                  : "Live research · manual rewards"}
              </dd>
            </div>
            <div>
              <dt>Target network</dt>
              <dd>Solana mainnet</dd>
            </div>
            <div>
              <dt>Quote / reward asset</dt>
              <dd>ZEC representation</dd>
            </div>
            <div>
              <dt>Mint</dt>
              <dd className="mono break-all">{data.zecMint}</dd>
            </div>
            <div>
              <dt>Reward treasury</dt>
              <dd>Manual payouts · balance not tracked</dd>
            </div>
          </dl>
        </Panel>
      </div>
      <Panel
        title="Production readiness"
        description="What is connected, and what still needs a live wallet check."
      >
        <div className="readiness-list">
          {[
            [
              "Research database",
              data.storage === "postgres"
                ? "Supabase connected"
                : "Local SQLite",
              data.storage === "postgres"
                ? "Research records and wallet sessions persist in Postgres through a restricted server account."
                : "Research records and wallet sessions are stored on this local server.",
            ],
            [
              "Wallet identity",
              "Implemented",
              "Nonce-based sign-in and server-verified Solana signatures.",
            ],
            [
              "Agent budgets",
              "Bounded execution",
              "$3 experiment reservations, shared daily limits and server-authorized model calls.",
            ],
            [
              "Pump launch & fee routing",
              "Operator canary pending",
              "ZEC-paired creation passed mainnet simulation. Two wallet-approved transactions establish the mint, compute fee route and 0.3 SOL launch charge.",
            ],
            [
              "Research execution",
              "Connected",
              "Eve workers read pinned source, propose patches and record actual model usage in the live lab.",
            ],
            [
              "Protected evaluator",
              "Source validation live",
              "Network-isolated library checks and MSM timing with one and four threads. Full Orchard proof timing is not connected.",
            ],
            [
              "ZEC rewards",
              "Manual",
              "The operator reviews findings and sends approved rewards to the original deployer wallet manually.",
            ],
          ].map(([name, status, description]) => (
            <div key={name}>
              <div>
                <h3>{name}</h3>
                <p>{description}</p>
              </div>
              <Badge variant="outline">{status}</Badge>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Your audit trail">
        {data.audit.length ? (
          data.audit.map((e) => (
            <div key={e.id} className="audit-row">
              <ShieldCheck size={16} />
              <div>
                <strong>{e.action}</strong>
                <p>{e.detail}</p>
              </div>
              <span>{date(e.createdAt)}</span>
            </div>
          ))
        ) : (
          <Empty
            title="No account activity yet"
            description="Registration, artifact submission and review decisions will be recorded here."
          />
        )}
      </Panel>
    </>
  );
}
export function Guide() {
  return (
    <>
      <Heading
        title="Research you can follow."
        description="How an idea becomes a measured improvement and a deployer reward."
      />
      <div className="reading-layout">
        <Panel title="The research loop">
          <div className="prose-block">
            {[
              [
                "Choose a specific problem",
                "Launch an agent assigned to scalar reuse, MSM allocation or public-size scheduling. It starts from pinned Zcash source and a defined benchmark.",
              ],
              [
                "Fund a bounded experiment",
                "A session reserves its budget before work starts. The agent proposes small patches, runs allowed checks and saves failed hypotheses as well as promising results.",
              ],
              [
                "Freeze the evidence",
                "Submit one immutable patch per agent per epoch. The agent cannot rewrite final fixtures, the scoring method or the verifier.",
              ],
              [
                "Review the measured evidence",
                "An isolated evaluator runs fixed Halo2 library checks and MSM timing with one and four threads. The operator manually reviews candidates. These checks do not establish a full Orchard proving speedup.",
              ],
              [
                "Receive an earned reward",
                "The operator sends approved rewards manually to the original deployer. Token purchases do not buy leaderboard rank or rights to the research reward.",
              ],
            ].map(([title, body]) => (
              <section key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </section>
            ))}
            <h3>What improves, exactly?</h3>
            <p>
              The target is proof-generation software: the CPU time and memory
              needed to prepare cryptographic proofs. This does not
              automatically lower ZEC&apos;s market price, change consensus fees
              or shorten block confirmation time.
            </p>
            <h3>What is working here?</h3>
            <p>
              This local application supports setup, persistent research
              records, protected identity, preview budgets and submission
              workflows. Model execution, real token launch and on-chain reward
              settlement are not active. Every example is labeled.
            </p>
          </div>
        </Panel>
        <aside>
          <Panel title="Research standards">
            <div className="aside-content">
              <p>
                Benchmarks can demonstrate performance. They cannot, on their
                own, establish cryptographic security.
              </p>
              <ul className="check-list">
                <li>
                  <Check size={15} />
                  Fixed circuit and reference verifier
                </li>
                <li>
                  <Check size={15} />
                  Fresh hidden evaluation fixtures
                </li>
                <li>
                  <Check size={15} />
                  Independent reproduction
                </li>
                <li>
                  <Check size={15} />
                  Human cryptographic review
                </li>
              </ul>
              <LinkButton
                href="/challenges/ZEC-PROVER-CPU-001"
                variant="outline"
              >
                Read the first challenge
              </LinkButton>
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}
