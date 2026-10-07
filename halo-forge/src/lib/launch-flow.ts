import type { PumpDraft } from "./pump-launch";

type Draft = PumpDraft & { notice?: string };
type Request = (body: Record<string, unknown>) => Promise<Draft>;
function checkConfirmation(draft: Draft, stage: "create" | "route") {
  if (draft[stage]?.confirmation === "expired")
    throw new Error(
      "This transaction expired without landing. The 0.3 SOL launch charge was not transferred by this attempt. Resume deployment for a fresh wallet approval; your existing token is saved.",
    );
  if (draft[stage]?.confirmation === "failed")
    throw new Error(
      "Solana rejected this transaction. Its instructions were rolled back; a network fee may still apply. Your existing token is saved. Resume deployment after the transaction expires to retry.",
    );
}
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
    let signedForRetry: string | undefined;
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
        signedForRetry = signed;
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
      checkConfirmation(draft, stage);
      if (draft.abandoned)
        throw new Error(
          "Token creation expired without landing. Resume deployment to refresh it.",
        );
      await wait(8000);
      draft =
        signedForRetry && attempt % 2 === 1
          ? await request({
              action: "submit",
              id: draft.id,
              stage,
              signed: signedForRetry,
            })
          : await request({ action: "refresh", id: draft.id });
      checkConfirmation(draft, stage);
      if (draft[stage]?.confirmation === "confirming")
        progress(
          stage === "route"
            ? "Payment detected on Solana. Waiting for final confirmation…"
            : "Token creation detected on Solana. Waiting for final confirmation…",
        );
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
