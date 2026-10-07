import type { PumpDraft } from "./pump-launch";

type Draft = PumpDraft & { notice?: string };
type Request = (body: Record<string, unknown>) => Promise<Draft>;
export type SignLaunchTransaction = (wire: string) => Promise<string>;

// A single user action coordinates both wallet approvals. Only server-finalized
// records advance stages; never re-sign a transaction with a recorded signature.
export async function deployPumpAgent({
  initial,
  input,
  requestId,
  request,
  sign,
  progress,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: {
  initial: Draft | null;
  input: Record<string, unknown>;
  requestId?: string;
  request: Request;
  sign: SignLaunchTransaction;
  progress: (message: string) => void;
  wait?: (ms: number) => Promise<unknown>;
}) {
  progress("Checking your saved launch and Pump configuration…");
  let draft = initial
    ? await request({ action: "refresh", id: initial.id })
    : null;
  if (!draft || draft.abandoned) {
    const savedInput = draft
      ? {
          name: draft.name,
          symbol: draft.symbol,
          description: draft.description,
          image: draft.image,
          track: draft.assignment.track,
        }
      : input;
    draft = await request({
      action: "prepare",
      input: savedInput,
      ...(requestId ? { requestId } : {}),
    });
  }
  for (const stage of ["create", "route"] as const) {
    if (draft.agentId || draft[stage]?.finalized) continue;
    if (stage === "route") {
      progress("Preparing compute fee routing and the 0.3 SOL payment…");
      draft = await request({ action: "route", id: draft.id });
    }
    if (draft[stage]?.finalized) continue;
    if (!draft[stage]?.signature) {
      draft = await request({ action: "check_signing", id: draft.id, stage });
      const tx = draft[stage];
      if (!tx || draft.abandoned)
        throw new Error(
          "This launch needs a fresh transaction. Resume deployment to continue.",
        );
      // Another tab may have submitted while the server checked freshness.
      if (!tx.finalized && !tx.signature) {
        progress(
          stage === "create"
            ? "Approve token creation in your wallet…"
            : "Approve fee setup and 0.3 SOL in your wallet…",
        );
        const signed = await sign(tx.wire);
        progress("Submitting your approved transaction…");
        draft = await request({
          action: "submit",
          id: draft.id,
          stage,
          signed,
        });
      }
    }
    progress(
      stage === "create"
        ? "Confirming token creation on Solana…"
        : "Verifying the payment and compute fee route on-chain…",
    );
    // Eight-second polling stays below the API's 20/minute per-wallet limit.
    for (let attempt = 0; !draft[stage]?.finalized && attempt < 18; attempt++) {
      if (draft.abandoned)
        throw new Error(
          "Token creation expired without landing. Resume deployment to refresh it.",
        );
      await wait(8000);
      draft = await request({ action: "refresh", id: draft.id });
    }
    if (!draft[stage]?.finalized)
      throw new Error(
        "Confirmation is taking longer than usual. Your launch is saved; resume deployment to check it without paying twice.",
      );
  }
  if (!draft.agentId)
    throw new Error(
      "Transactions are confirmed but agent registration is still pending. Resume deployment to reconcile it.",
    );
  progress("Token, payment and fee route verified. Your agent is registered.");
  return draft;
}
