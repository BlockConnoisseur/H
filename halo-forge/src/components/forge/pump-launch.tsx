"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import dynamic from "next/dynamic";
const WalletConnection = dynamic(() => import("./wallet-connection"), {
  ssr: false,
});
import type { Actor } from "@/lib/domain";
import type { PumpDraft } from "@/lib/pump-launch";
import { COMPUTE_WALLET } from "@/lib/pump-policy";
type Props = {
  actor: Actor;
  input: {
    name: string;
    symbol: string;
    description: string;
    image: string | null;
    track: string;
  };
};
export function PumpLaunch({ actor, input }: Props) {
  const [launch, setLaunch] = useState<PumpDraft | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void fetch("/api/pump/current", { cache: "no-store" })
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
    };
  }, [actor.wallet]);
  const pending =
    launch &&
    !launch.abandoned &&
    ((!launch.create.finalized && launch.create.signature) ||
      (launch.route?.signature && !launch.route.finalized));
  const launchId = launch?.id;
  useEffect(() => {
    if (!pending || !launchId) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const id = launchId;
    async function poll() {
      try {
        const r = await fetch("/api/pump/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refresh", id }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (live) {
          setLaunch(d.launch);
          setError(d.launch.notice || "");
        }
      } catch (e) {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "Confirmation check failed. Refresh to retry.",
          );
        return;
      }
      if (live) timer = setTimeout(poll, 6000);
    }
    timer = setTimeout(poll, 6000);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [pending, launchId]);
  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/pump/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setLaunch(d.launch);
      if (d.launch.notice) setError(d.launch.notice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Launch request failed.");
    } finally {
      setBusy(false);
    }
  }
  const stage = launch?.create.finalized ? "route" : "create",
    tx = launch?.[stage];
  return (
    <section className="pump-launch" aria-busy={busy || loading}>
      <h3>Launch on Pump</h3>
      <p>
        Launch charge: <strong>0.3 SOL</strong>, plus Solana transaction fees
        and account rent. Creation and fee setup require two separate wallet
        approvals. Token creation is permanent even if you stop before fee
        setup.
      </p>
      <dl className="detail-list">
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
        These are the currently checked bonding-curve rates, excluding network
        costs. Pump can change its protocol rates. Both creator-fee portions
        collect in <span className="break-all">{COMPUTE_WALLET}</span>;
        per-agent records keep their allocation separate. Ongoing compute
        requires funded allowance. Review and reward payouts are manual.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription role="alert">{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <p role="status">Checking for an unfinished launch…</p>
      ) : !launch ? (
        <Button
          type="button"
          disabled={busy}
          onClick={() => action({ action: "prepare", input })}
        >
          {busy ? "Checking Pump & simulating…" : "Prepare launch transactions"}
        </Button>
      ) : (
        <>
          <div className="disclosure">
            <div>
              <strong>
                {launch.name} · ${launch.symbol}
              </strong>
              <p className="break-all">Mint: {launch.mint}</p>
              <p>
                Frozen research assignment: {launch.assignment.methodId} ·{" "}
                {launch.assignment.actions} Actions /{" "}
                {launch.assignment.threads} threads
              </p>
            </div>
          </div>
          <ol>
            <li>
              {launch.create.finalized ? "✓ " : ""}Create the ZEC-paired token ·
              network fees and rent
            </li>
            <li>
              {launch.route?.finalized ? "✓ " : ""}Lock compute fee routing and
              pay 0.3 SOL
            </li>
            <li>
              {launch.agentId ? "✓ " : ""}Verify the chain record and schedule
              the initial experiment
            </li>
          </ol>
          {launch.agentId ? (
            <>
              <p role="status">
                Token and fee route verified. Your initial experiment will run
                when the shared daily allowance has capacity.
              </p>
              <Link href={`/agents/${launch.agentId}`}>Open your agent →</Link>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLaunch(null)}
              >
                Prepare another agent
              </Button>
            </>
          ) : (
            <>
              {launch.abandoned && (
                <p role="status">
                  This transaction expired without creating a token. Your setup
                  is saved. Refresh expired creation below; the new transaction
                  will have a new mint address.
                </p>
              )}
              {launch.create.finalized && !launch.route?.finalized && (
                <p role="status">
                  Token creation is confirmed. Next, prepare fee setup and
                  approve the separate 0.3 SOL payment in your wallet.
                </p>
              )}
              {tx && !busy && !launch.abandoned && !pending && (
                <WalletConnection
                  actor={actor}
                  previewAvailable={false}
                  onChanged={async () => {}}
                  transaction={{
                    wire: tx.wire,
                    label:
                      stage === "create"
                        ? "Sign token creation"
                        : "Sign fee setup · 0.3 SOL",
                    beforeSign: async () => {
                      const r = await fetch("/api/pump/actions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "check_signing",
                          id: launch.id,
                          stage,
                        }),
                      });
                      const d = await r.json();
                      if (!r.ok) {
                        setError(d.error);
                        throw new Error(d.error);
                      }
                      setLaunch(d.launch);
                      return d.launch[stage].wire;
                    },
                    onSigned: async (signed) => {
                      await action({
                        action: "submit",
                        id: launch.id,
                        stage,
                        signed,
                      });
                    },
                  }}
                />
              )}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || launch.abandoned}
                  onClick={() => action({ action: "refresh", id: launch.id })}
                >
                  {busy ? "Checking…" : "Refresh confirmation"}
                </Button>
                <Button
                  type="button"
                  variant={
                    stage === "route" || launch.abandoned ? "default" : "ghost"
                  }
                  disabled={busy}
                  onClick={() =>
                    action(
                      stage === "route"
                        ? { action: "route", id: launch.id }
                        : {
                            action: "prepare",
                            input: {
                              name: launch.name,
                              symbol: launch.symbol,
                              description: launch.description,
                              image: launch.image,
                              track: launch.assignment.track,
                            },
                          },
                    )
                  }
                >
                  {stage === "route"
                    ? "Prepare fee setup · 0.3 SOL"
                    : "Refresh expired creation"}
                </Button>
              </div>
              <p className="field-hint">
                {pending ? "Checking confirmation automatically. " : ""}If a
                request times out, resume this launch; your recorded signature
                prevents duplicate payment. An expired transaction must be
                refreshed before signing again.
              </p>
            </>
          )}
          {[launch.create, launch.route]
            .filter((t) => t?.signature)
            .map((t) => (
              <p key={t!.signature}>
                <a
                  href={`https://solscan.io/tx/${t!.signature}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction on Solscan ↗
                </a>
              </p>
            ))}
        </>
      )}
    </section>
  );
}
