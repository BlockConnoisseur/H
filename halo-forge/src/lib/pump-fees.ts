import { randomUUID } from "node:crypto";
import { EventParser } from "@coral-xyz/anchor";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  OnlinePumpSdk,
  PUMP_PROGRAM_ID,
  getPumpProgram,
  feeSharingConfigPda,
  type DistributeCreatorFeesEvent,
} from "@pump-fun/pump-sdk";
import { DomainError, ZEC_MINT, hash, type Actor } from "./domain";
import {
  pumpConnection,
  validateSignedLaunch,
  type LaunchTx,
} from "./pump-launch";
import { COMPUTE_WALLET, splitCreatorReceipt } from "./pump-policy";
import { readState, transact } from "./store";
import {
  pumpComputeBudget,
  canReusePumpTransaction,
} from "./pump-compute-budget";
export type FeeReceipt = {
  id: string;
  agentId: string;
  mint: string;
  signature: string;
  receivedRaw: string;
  sharedRaw: string;
  agentRaw: string;
  at: string;
};
export type FeeClaim = {
  id: string;
  agentId: string;
  deployer: string;
  tx: LaunchTx;
};
export function distributionReceipt(
  event: DistributeCreatorFeesEvent,
  mint: string,
) {
  if (
    event.mint.toBase58() !== mint ||
    event.quoteMint.toBase58() !== ZEC_MINT ||
    event.sharingConfig.toBase58() !==
      feeSharingConfigPda(new PublicKey(mint)).toBase58() ||
    event.shareholders.length !== 1 ||
    event.shareholders[0].address.toBase58() !== COMPUTE_WALLET ||
    event.shareholders[0].shareBps !== 10000 ||
    event.distributed.isNeg()
  )
    return null;
  const receivedRaw = event.distributed.toString();
  return { receivedRaw, ...splitCreatorReceipt(receivedRaw) };
}
export async function prepareFeeClaim(actor: Actor, agentId: string) {
  if (!actor.reviewer || actor.preview)
    throw new DomainError(
      "Operator sign-in required to collect compute fees.",
      403,
    );
  const state = await readState(),
    agent = state.agents.find(
      (a) => a.id === agentId && !a.preview && a.tokenMint,
    );
  if (!agent?.tokenMint)
    throw new DomainError("Verified agent token not found.", 404);
  const c = pumpConnection(),
    sdk = new OnlinePumpSdk(c),
    payer = new PublicKey(actor.wallet);
  const prior = state.feeClaims?.findLast(
    (f) =>
      f.agentId === agentId && f.deployer === actor.wallet && !f.tx.finalized,
  );
  if (
    prior &&
    canReusePumpTransaction(prior.tx, await c.getBlockHeight("finalized"))
  )
    return prior;
  const q = await sdk.resolveQuoteMint(new PublicKey(ZEC_MINT));
  const { instructions } = await sdk.buildDistributeCreatorFeesInstructions(
    new PublicKey(agent.tokenMint),
    { quoteMint: q.mint, quoteTokenProgram: q.quoteTokenProgram, payer },
  );
  const block = await c.getLatestBlockhash("finalized"),
    tx = new Transaction({ ...block, feePayer: payer }).add(
      ...pumpComputeBudget(),
      ...instructions,
    );
  const bytes = tx.serialize({ requireAllSignatures: false });
  if (bytes.length > 1232)
    throw new DomainError(
      "This fee collection requires a larger wallet transaction. Use Pump's fee collection interface.",
      409,
    );
  const sim = await c.simulateTransaction(
    VersionedTransaction.deserialize(bytes),
    { sigVerify: false, commitment: "confirmed" },
  );
  if (sim.value.err)
    throw new DomainError(
      "Fee collection simulation failed. There may be no distributable fees yet, or insufficient SOL for rent.",
      409,
    );
  const claim: FeeClaim = {
    id: randomUUID(),
    agentId,
    deployer: actor.wallet,
    tx: {
      ...block,
      wire: bytes.toString("base64"),
      messageHash: hash(tx.serializeMessage().toString("base64")),
    },
  };
  await transact((s) => {
    (s.feeClaims ??= []).push(claim);
  });
  return claim;
}
export async function submitFeeClaim(actor: Actor, id: string, signed: string) {
  if (!actor.reviewer || actor.preview)
    throw new DomainError("Operator sign-in required.", 403);
  const claim = (await readState()).feeClaims?.find(
    (f) => f.id === id && f.deployer === actor.wallet,
  );
  if (!claim) throw new DomainError("Fee collection not found.", 404);
  if (claim.tx.finalized) return { signature: claim.tx.signature };
  const { signature, raw } = validateSignedLaunch(
    claim.tx,
    signed,
    actor.wallet,
  );
  await transact((s) => {
    const current = s.feeClaims!.find((f) => f.id === id)!;
    if (current.tx.signature && current.tx.signature !== signature)
      throw new DomainError("Collection already submitted.", 409);
    current.tx.signature = signature;
  });
  try {
    await pumpConnection().sendRawTransaction(raw, {
      skipPreflight: false,
      maxRetries: 2,
    });
  } catch {
    /* Reconcile the recorded signature on the next scan. */
  }
  return { signature };
}
// Scan finalized Pump events by per-mint sharing PDA, never infer fees from a shared wallet balance.
// A cursor advances only after a complete batch; idempotent receipts survive retries and overlaps.
export async function syncPumpFees() {
  const state = await readState(),
    agents = state.agents.filter((a) => !a.preview && a.tokenMint);
  if (!agents.length) return;
  const c = pumpConnection(),
    parser = new EventParser(PUMP_PROGRAM_ID, getPumpProgram(c).coder);
  for (const agent of agents.slice(0, 100)) {
    const mint = agent.tokenMint!,
      cursor = state.feeCursors?.[mint];
    const scan = state.feeScans?.[mint];
    const entries = await c.getSignaturesForAddress(
      feeSharingConfigPda(new PublicKey(mint)),
      { limit: 100, until: scan?.until ?? cursor, before: scan?.before },
      "finalized",
    );
    const head = scan?.head ?? entries[0]?.signature;
    const signatures = entries.filter((e) => !e.err).map((e) => e.signature);
    let complete = true;
    const receipts: FeeReceipt[] = [];
    for (const signature of signatures) {
      const tx = await c.getTransaction(signature, {
        commitment: "finalized",
        maxSupportedTransactionVersion: 1,
      });
      if (!tx) {
        complete = false;
        break;
      }
      if (tx.meta?.err || !tx.meta?.logMessages) continue;
      let index = 0;
      for (const event of parser.parseLogs(tx.meta.logMessages)) {
        const eventIndex = index++;
        if (event.name !== "distributeCreatorFeesEvent") continue;
        const amounts = distributionReceipt(
          event.data as DistributeCreatorFeesEvent,
          mint,
        );
        if (amounts)
          receipts.push({
            id: `${signature}:${eventIndex}`,
            agentId: agent.id,
            mint,
            signature,
            ...amounts,
            at: new Date((tx.blockTime ?? 0) * 1000).toISOString(),
          });
      }
    }
    if (!complete) continue;
    await transact((s) => {
      for (const r of receipts)
        if (!(s.feeReceipts ??= []).some((old) => old.id === r.id))
          s.feeReceipts.push(r);
      if (
        head &&
        s.feeCursors?.[mint] === cursor &&
        s.feeScans?.[mint]?.before === scan?.before
      ) {
        if (entries.length === 100)
          (s.feeScans ??= {})[mint] = {
            head,
            before: entries.at(-1)!.signature,
            until: cursor,
          };
        else {
          (s.feeCursors ??= {})[mint] = head;
          if (s.feeScans) delete s.feeScans[mint];
        }
      }
      for (const claim of s.feeClaims ?? [])
        if (
          claim.agentId === agent.id &&
          claim.tx.signature &&
          signatures.includes(claim.tx.signature)
        )
          claim.tx.finalized = true;
    });
  }
}
