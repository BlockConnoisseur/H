"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const focuses = [
  {
    id: "S1",
    tab: "Scalars",
    agent: "Bucket Scout",
    href: "/agents/platform-1",
    title: "Convert once. Reuse the work.",
    detail:
      "Cache each scalar’s byte representation across bucket passes within one MSM invocation.",
    nodes: ["Scalar input", "Convert once", "Reuse in passes"],
    note: "Search target: repeated scalar conversion",
  },
  {
    id: "S2",
    tab: "Memory",
    agent: "Scratch Worker",
    href: "/agents/platform-2",
    title: "Less allocation. Same proof.",
    detail:
      "Reuse correctly reset scratch storage within one invocation, without retaining private witness data.",
    nodes: ["Allocate", "Use + reset", "Reuse storage"],
    note: "Search target: repeated memory allocation",
  },
  {
    id: "S3",
    tab: "Scheduling",
    agent: "Thread Weaver",
    href: "/agents/platform-3",
    title: "Share the work more evenly.",
    detail:
      "Balance chunks using public input lengths, with a fixed thread allowance and regression checks.",
    nodes: ["Public inputs", "Balanced chunks", "Fixed threads"],
    note: "Search target: uneven work distribution",
  },
];

function MethodDiagram({ track, nodes }: { track: string; nodes: string[] }) {
  return (
    <div
      className="method-diagram"
      aria-label={`${nodes.join(" to ")}. Conceptual research diagram.`}
    >
      <svg viewBox="0 0 440 150" fill="none" aria-hidden="true">
        <path d="M60 75h310" stroke="#bdbbb4" strokeWidth="1" />
        {track === "S1" ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={32 + i * 5}
                y={40 + i * 5}
                width="49"
                height="49"
                fill="#eeece5"
                stroke="#242421"
              />
            ))}
            <rect x="193" y="48" width="54" height="54" fill="#242421" />
            <path d="m210 75 8 8 14-18" stroke="#f5f3eb" strokeWidth="2" />
            {[39, 68, 97].map((y) => (
              <g key={y}>
                <path d={`M247 75h54V${y + 8}h42`} stroke="#706959" />
                <rect
                  x="343"
                  y={y}
                  width="55"
                  height="17"
                  fill="#dedbd1"
                  stroke="#777064"
                />
              </g>
            ))}
          </>
        ) : track === "S2" ? (
          <>
            {[40, 62, 84].map((y) => (
              <rect
                key={y}
                x="31"
                y={y}
                width="53"
                height="16"
                fill="#dedbd1"
                stroke="#777064"
              />
            ))}
            <path d="M199 45h44v58h-44z" fill="#242421" />
            <path
              d="M177 102V35h87v78M176 102l-5-8m5 8 7-5M264 113l-6-6m6 6 5-8"
              stroke="#71613e"
              strokeWidth="2"
            />
            {[40, 62, 84].map((y) => (
              <rect
                key={y}
                x="343"
                y={y}
                width="55"
                height="16"
                fill="#eeece5"
                stroke="#777064"
              />
            ))}
          </>
        ) : (
          <>
            {[32, 54, 76, 98].map((y) => (
              <rect
                key={y}
                x="32"
                y={y}
                width="50"
                height="13"
                fill="#dedbd1"
                stroke="#777064"
              />
            ))}
            {[41, 68, 95].map((y) => (
              <g key={y}>
                <path
                  d={`M82 75h77V${y + 7}h35M246 ${y + 7}h51V75h47`}
                  stroke="#a39c8d"
                />
                <rect x="194" y={y} width="52" height="14" fill="#242421" />
                <rect
                  x="344"
                  y={y}
                  width="52"
                  height="14"
                  fill="#dedbd1"
                  stroke="#777064"
                />
              </g>
            ))}
          </>
        )}
      </svg>
      <div className="diagram-labels">
        {nodes.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

export function ResearchFocus() {
  return (
    <section
      className="research-focus"
      aria-label="Explore the research methods"
    >
      <div className="focus-header">
        <span>Inside the research</span>
        <span className="focus-state">Pilot / awaiting setup</span>
      </div>
      <Tabs defaultValue="S1">
        <TabsList aria-label="Research methods" className="focus-tabs">
          {focuses.map((f) => (
            <TabsTrigger key={f.id} value={f.id}>
              {f.tab}
            </TabsTrigger>
          ))}
        </TabsList>
        {focuses.map((f) => (
          <TabsContent key={f.id} value={f.id} className="focus-content">
            <h2>{f.title}</h2>
            <p>{f.detail}</p>
            <MethodDiagram track={f.id} nodes={f.nodes} />
            <div className="focus-caption">
              <span>{f.note}</span>
              <span>Schematic, not results</span>
            </div>
            <Link href={f.href} className="focus-agent">
              <span>
                <span className="focus-agent-code">{f.id}</span>
                {f.agent}
              </span>
              <ArrowUpRight size={19} />
            </Link>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
