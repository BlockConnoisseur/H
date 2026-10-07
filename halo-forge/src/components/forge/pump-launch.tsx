"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Actor } from "@/lib/domain";
import type { PumpDraft } from "@/lib/pump-launch";
import { deployPumpAgent, type SignLaunchTransaction } from "@/lib/launch-flow";
import { COMPUTE_WALLET } from "@/lib/pump-policy";
import { launchRequest } from "@/lib/launch-request";
const WalletConnection = dynamic(() => import("./wallet-connection"), {
  ssr: false,
});

type Props = {
  actor: Actor;
  onBusyChange?: (busy: boolean) => void;
  requestId: string;
  resumeId?: string;
  onNewLaunch: () => void;
  input: {
    name: string;
    symbol: string;
    description: string;
    image: string | null;
    track: string;
  };
};
export function PumpLaunch({
  actor,
  input,
  onBusyChange,
  requestId,
  resumeId,
  onNewLaunch,
}: Props) {
  const mounted = useRef(true);
  const [launch, setLaunch] = useState<PumpDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!resumeId);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  useEffect(() => {
    mounted.current = true;
    let live = true;
    if (resumeId)
      void fetch(`/api/pump/current?id=${encodeURIComponent(resumeId)}`, {
        cache: "no-store",
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          if (live) setLaunch(d.launch);
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [actor.wallet, resumeId]);

  async function deploy(sign: SignLaunchTransaction) {
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      await deployPumpAgent({
        initial: launch,
        input,
        requestId,
        sign: async (wire) => {
          if (!mounted.current)
            throw new Error("Deployment paused after leaving the page.");
          return sign(wire);
        },
        progress: setProgress,
        request: async (body) => {
          // Always save a signature the user already approved, even on navigation.
          if (!mounted.current && body.action !== "submit")
            throw new Error("Deployment paused after leaving the page.");
          const next = await launchRequest(body);
          setLaunch(next);
          return next;
        },
      });
    } catch (e) {
      setProgress("Deployment paused. Your confirmed steps are saved.");
      throw e; // WalletConnection displays wallet and server errors together.
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <section className="pump-launch" aria-busy={busy || loading}>
      <h3>Deploy your agent</h3>
      <p>
        One action creates your ZEC-paired coin, sets compute fees, pays the
        launch charge and verifies everything on-chain. Approve each prompt in
        your wallet; we handle the steps between them.
      </p>
      <dl className="detail-list">
        <div>
          <dt>Launch charge</dt>
          <dd>0.3 SOL + network fees and rent</dd>
        </div>
        <div>
          <dt>Pump protocol fee</dt>
          <dd>0.95%</dd>
        </div>
        <div>
          <dt>Shared compute</dt>
          <dd>1.00%</dd>
        </div>
        <div>
          <dt>This agent’s compute</dt>
          <dd>1.05%</dd>
        </div>
        <div>
          <dt>Initial research</dt>
          <dd>One experiment · up to $3 allocation</dd>
        </div>
      </dl>
      <p className="field-hint">
        These are the currently checked bonding-curve rates. Pump can change its
        protocol rates. Both compute portions collect in{" "}
        <span className="break-all">{COMPUTE_WALLET}</span>, with separate
        per-agent records. Ongoing compute requires funded allowance. Review and
        reward payouts are manual.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription role="alert">{error}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Retry saved launch check
        </Button>
      )}
      {loading && <p role="status">Checking for a saved launch…</p>}
      {launch && (
        <div className="disclosure">
          <div>
            <strong>
              {launch.name} · ${launch.symbol}
            </strong>
            <p className="break-all">Mint: {launch.mint}</p>
            <p>
              Research assignment: {launch.assignment.methodId} ·{" "}
              {launch.assignment.actions} Actions / {launch.assignment.threads}{" "}
              threads
            </p>
          </div>
        </div>
      )}
      <ol className="launch-progress-list">
        <li>
          <strong>
            {launch?.create.finalized ? "✓ " : ""}Create your coin
          </strong>
          <p>ZEC-paired token on Pump. Wallet approval required.</p>
        </li>
        <li>
          <strong>
            {launch?.route?.finalized ? "✓ " : ""}Fund and configure compute
          </strong>
          <p>
            Lock fee routing and pay 0.3 SOL together. Wallet approval required.
          </p>
        </li>
        <li>
          <strong>{launch?.agentId ? "✓ " : ""}Verify and activate</strong>
          <p>
            Check finalized on-chain records and register the agent
            automatically.
          </p>
        </li>
      </ol>
      {progress && (
        <p className="launch-progress-status" role="status" aria-live="polite">
          {progress}
        </p>
      )}
      {/* Keep the wallet provider mounted through preparation and confirmation. */}
      {!loading && !error && !launch?.agentId && (
        <WalletConnection
          actor={actor}
          previewAvailable={false}
          onChanged={async () => {}}
          deployment={{
            label: launch ? "Resume deployment" : "Deploy agent · 0.3 SOL",
            run: deploy,
          }}
        />
      )}
      {launch?.agentId ? (
        <>
          <p role="status">
            Token, payment and compute fee route verified. Your agent is
            registered; its first experiment runs when the shared daily
            allowance has capacity.
          </p>
          <Link href={`/agents/${launch.agentId}`}>Open your agent →</Link>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onNewLaunch();
            }}
          >
            Deploy another agent
          </Button>
        </>
      ) : (
        <p className="field-hint">
          Keep this page open through both wallet approvals. Token creation is
          permanent even if you cancel the second approval. If interrupted, use
          Resume deployment: confirmed steps are skipped and recorded signatures
          are checked before another payment.
        </p>
      )}
      {[launch?.create, launch?.route]
        .filter((tx) => tx?.signature)
        .map((tx) => (
          <p key={tx!.signature}>
            <a
              href={`https://solscan.io/tx/${tx!.signature}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction on Solscan ↗
            </a>
          </p>
        ))}
    </section>
  );
}
