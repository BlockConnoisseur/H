import { randomUUID } from "node:crypto";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  ComputeBudgetProgram,
  SystemProgram,
  VersionedTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  OnlinePumpSdk,
  PUMP_SDK,
  PUMP_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
  bondingCurvePda,
  feeSharingConfigPda,
  computeFeesBps,
  isSharingConfigEditable,
} from "@pump-fun/pump-sdk";
import BN from "bn.js";
import bs58 from "bs58";
import { z } from "zod";
import { DomainError, hash, ZEC_MINT, type Actor, type State } from "./domain";
import { allocateAssignment, type ResearchAssignment } from "./research";
import { readState, transact } from "./store";
import { normalizeCoinImage } from "./coin-image";
import {
  COMPUTE_WALLET,
  LAUNCH_LAMPORTS,
  PROTOCOL_BPS,
  CREATOR_BPS,
} from "./pump-policy";
import { labState } from "./lab-domain";

export type LaunchTx = {
  wire: string;
  messageHash: string;
  blockhash: string;
  lastValidBlockHeight: number;
  signature?: string;
  finalized?: boolean;
};
export type PumpDraft = {
  id: string;
  deployer: string;
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string | null;
  assignment: ResearchAssignment;
  createdAt: string;
  abandoned?: boolean;
  agentId?: string;
  create: LaunchTx;
  route?: LaunchTx;
};
const inputSchema = z
  .object({
    name: z.string().trim().min(3).max(32),
    symbol: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/),
    description: z.string().trim().min(15).max(500),
    image: z.string().max(90000).nullable(),
    track: z.enum(["auto", "S1", "S2", "S3"]),
  })
  .strict();
const quote = new PublicKey(ZEC_MINT),
  treasury = new PublicKey(COMPUTE_WALLET);
export function pumpConnection() {
  const url = process.env.SOLANA_MAINNET_RPC_URL;
  if (!url) throw new DomainError("Mainnet RPC is not configured.", 503);
  return new Connection(url, {
    commitment: "finalized",
    disableRetryOnRateLimit: true,
  });
}
function requireActor(actor: Actor) {
  if (actor.preview)
    throw new DomainError("A real wallet signature is required.", 403);
}
function drafts(s: State) {
  return (s.pumpLaunches ??= []);
}
function owned(s: State, actor: Actor, id: string) {
  requireActor(actor);
  const d = drafts(s).find((d) => d.id === id && d.deployer === actor.wallet);
  if (!d || d.abandoned) throw new DomainError("Launch not found.", 404);
  return d;
}
function view(d: PumpDraft) {
  return {
    ...d,
    create: { ...d.create },
    route: d.route ? { ...d.route } : undefined,
    feeWallet: COMPUTE_WALLET,
    launchLamports: LAUNCH_LAMPORTS,
    quoteMint: ZEC_MINT,
    protocolBps: PROTOCOL_BPS,
    creatorBps: CREATOR_BPS,
  };
}
export async function pumpConfiguration(c = pumpConnection()) {
  const sdk = new OnlinePumpSdk(c);
  const [global, feeConfig, q] = await Promise.all([
    sdk.fetchGlobal(),
    sdk.fetchFeeConfig(),
    sdk.resolveQuoteMint(quote),
  ]);
  const fees = computeFeesBps({
    global,
    feeConfig,
    mintSupply: global.tokenTotalSupply,
    virtualQuoteReserves: q.initialVirtualQuoteReserves,
    virtualTokenReserves: global.initialVirtualTokenReserves,
    quoteMint: quote,
    creatorFeeBps: new BN(CREATOR_BPS),
  });
  if (
    !global.createV2Enabled ||
    !global.creatorFeeConfigurable ||
    global.maxConfigurableCreatorFeeBps.toNumber() < CREATOR_BPS ||
    fees.protocolFeeBps.toNumber() !== PROTOCOL_BPS ||
    fees.creatorFeeBps.toNumber() !== CREATOR_BPS ||
    q.decimals !== 8
  )
    throw new DomainError(
      "Pump's live configuration no longer matches the reviewed 3% ZEC launch. Launches are paused until the fee plan is updated.",
      503,
    );
  return { sdk, q };
}
async function pack(
  c: Connection,
  payer: PublicKey,
  ix: TransactionInstruction[],
  mint?: Keypair,
): Promise<LaunchTx> {
  const block = await c.getLatestBlockhash("finalized");
  const tx = new Transaction({ ...block, feePayer: payer }).add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
    ...ix,
  );
  if (mint) tx.partialSign(mint);
  const bytes = tx.serialize({ requireAllSignatures: false });
  if (bytes.length > 1232)
    throw new DomainError(
      "Launch transaction exceeds the supported wallet size.",
      503,
    );
  const simulation = await c.simulateTransaction(
    VersionedTransaction.deserialize(bytes),
    { sigVerify: false, commitment: "confirmed" },
  );
  if (simulation.value.err)
    throw new DomainError(
      `Wallet transaction simulation failed (${JSON.stringify(simulation.value.err)}). Check your SOL balance; nothing was submitted.`,
      409,
    );
  return {
    wire: bytes.toString("base64"),
    messageHash: hash(tx.serializeMessage().toString("base64")),
    ...block,
  };
}
export function validateSignedLaunch(
  expected: LaunchTx,
  signed: string,
  deployer: string,
) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signed) || signed.length > 1800)
    throw new DomainError("Invalid signed transaction.");
  let tx: Transaction;
  try {
    tx = Transaction.from(Buffer.from(signed, "base64"));
  } catch {
    throw new DomainError("Invalid signed transaction.");
  }
  if (
    hash(tx.serializeMessage().toString("base64")) !== expected.messageHash ||
    tx.feePayer?.toBase58() !== deployer ||
    !tx.verifySignatures() ||
    !tx.signature
  )
    throw new DomainError(
      "The signed transaction differs from your reviewed launch or is missing a signature.",
      403,
    );
  return { raw: tx.serialize(), signature: bs58.encode(tx.signature) };
}
export async function latestPumpLaunch(actor: Actor) {
  requireActor(actor);
  const d = drafts(await readState()).findLast(
    (d) => d.deployer === actor.wallet && !d.abandoned,
  );
  return d ? view(d) : null;
}
export async function preparePumpLaunch(actor: Actor, raw: unknown) {
  requireActor(actor);
  if (process.env.HALO_PUMP_LAUNCH_ENABLED !== "true")
    throw new DomainError(
      "Paid launches are not enabled yet. The live transaction checks must pass first.",
      503,
    );
  if (
    actor.wallet !== COMPUTE_WALLET &&
    !drafts(await readState()).some(
      (d) => d.deployer === COMPUTE_WALLET && d.agentId,
    )
  )
    throw new DomainError(
      "The operator's first live launch must finish before public paid launches open.",
      503,
    );
  const input = inputSchema.parse(raw),
    c = pumpConnection();
  const existing = drafts(await readState()).find(
    (d) => d.deployer === actor.wallet && !d.abandoned && !d.agentId,
  );
  if (existing) {
    await refreshPumpLaunch(actor, existing.id);
    const current = owned(await readState(), actor, existing.id);
    if (
      current.create.finalized ||
      (await c.getBlockHeight("finalized")) <=
        current.create.lastValidBlockHeight
    )
      return view(current);
    if (await c.getAccountInfo(new PublicKey(current.mint), "finalized"))
      throw new DomainError(
        "The token exists. Reconcile its original transaction before restarting.",
        409,
      );
    await transact((s) => {
      const d = owned(s, actor, current.id);
      if (d.create.finalized)
        throw new DomainError("Launch state changed. Refresh.", 409);
      d.abandoned = true;
    });
  }
  const { q } = await pumpConfiguration(c),
    mint = Keypair.generate(),
    payer = new PublicKey(actor.wallet),
    id = randomUUID();
  const image = await normalizeCoinImage(input.image);
  const origin = process.env.HALO_APP_ORIGIN || "https://halozec.tech";
  const ix = await PUMP_SDK.createV2Instruction({
    mint: mint.publicKey,
    name: input.name,
    symbol: input.symbol,
    uri: `${origin}/api/pump/metadata/${id}`,
    creator: payer,
    user: payer,
    mayhemMode: false,
    cashback: false,
    quoteMint: quote,
    quoteTokenProgram: q.quoteTokenProgram,
    creatorFeeBps: new BN(CREATOR_BPS),
    holderReward: false,
  });
  const create = await pack(c, payer, [ix], mint);
  return transact((s) => {
    if (
      drafts(s).some(
        (d) => d.deployer === actor.wallet && !d.abandoned && !d.agentId,
      )
    )
      throw new DomainError(
        "Another launch is already prepared. Resume it.",
        409,
      );
    if (drafts(s).filter((d) => !d.abandoned && !d.agentId).length >= 100)
      throw new DomainError("Launch queue is full.", 503);
    const lab = labState(s),
      held =
        drafts(s).filter((d) => !d.abandoned && !d.agentId).length * 300 +
        s.agents
          .filter((a) => !a.platform && !a.preview)
          .reduce((n, a) => n + a.budget, 0);
    if (
      !lab.enabled ||
      lab.jobs.reduce((n, j) => n + j.reservationCents, 0) + held + 300 >
        lab.allocatedCents
    )
      throw new DomainError(
        "Initial research capacity is currently full. No payment was submitted.",
        503,
      );
    const assignment = allocateAssignment(
      [
        ...s.agents,
        ...drafts(s)
          .filter((d) => !d.abandoned && !d.agentId)
          .map((d) => ({ example: false, assignment: d.assignment })),
      ],
      input.track,
    );
    if (!assignment)
      throw new DomainError(
        "No unoccupied experiment is available in this track.",
        409,
      );
    const d: PumpDraft = {
      id,
      deployer: actor.wallet,
      mint: mint.publicKey.toBase58(),
      name: input.name,
      symbol: input.symbol,
      description: input.description,
      image,
      assignment,
      createdAt: new Date().toISOString(),
      create,
    };
    drafts(s).push(d);
    return view(d);
  });
}
async function finalized(c: Connection, tx: LaunchTx) {
  if (tx.finalized) return true;
  if (!tx.signature) return false;
  const status = (
    await c.getSignatureStatuses([tx.signature], {
      searchTransactionHistory: true,
    })
  ).value[0];
  if (status?.err) return false;
  return status?.confirmationStatus === "finalized";
}
export async function refreshPumpLaunch(actor: Actor, id: string) {
  const d = owned(await readState(), actor, id),
    c = pumpConnection();
  const createOk = await finalized(c, d.create);
  if (!createOk) return view(d);
  const mint = new PublicKey(d.mint),
    curveInfo = await c.getAccountInfo(bondingCurvePda(mint), "finalized");
  if (!curveInfo?.owner.equals(PUMP_PROGRAM_ID))
    throw new DomainError("Pump curve ownership could not be verified.", 409);
  const curve = PUMP_SDK.decodeBondingCurve(curveInfo);
  if (
    !curve.quoteMint.equals(quote) ||
    curve.creatorFeeBps.toNumber() !== CREATOR_BPS ||
    curve.isMayhemMode ||
    curve.isCashbackCoin ||
    curve.isHolderReward
  )
    throw new DomainError(
      "On-chain token configuration differs from the launch plan.",
      409,
    );
  const routeOk = d.route && (await finalized(c, d.route));
  if (routeOk) {
    const sharingAddress = feeSharingConfigPda(mint),
      info = await c.getAccountInfo(sharingAddress, "finalized");
    if (!info?.owner.equals(PUMP_FEE_PROGRAM_ID))
      throw new DomainError("Fee route account could not be verified.", 409);
    const sharing = PUMP_SDK.decodeSharingConfig(info);
    if (
      !curve.creator.equals(sharingAddress) ||
      !sharing.mint.equals(mint) ||
      sharing.shareholders.length !== 1 ||
      !sharing.shareholders[0].address.equals(treasury) ||
      sharing.shareholders[0].shareBps !== 10000 ||
      isSharingConfigEditable({ sharingConfig: sharing })
    )
      throw new DomainError(
        "The fixed compute fee recipient could not be verified.",
        409,
      );
  } else if (!curve.creator.equals(new PublicKey(d.deployer))) {
    throw new DomainError(
      "The token creator changed before fee setup. Operator assistance is required.",
      409,
    );
  }
  // Successful signatures are bound to exact server-built messages, including the 0.3 SOL transfer.
  return transact((s) => {
    const current = owned(s, actor, id);
    current.create.finalized = true;
    if (routeOk && current.route) {
      current.route.finalized = true;
      if (!current.agentId) {
        current.agentId = `agent-${current.id}`;
        s.agents.unshift({
          id: current.agentId,
          name: d.name,
          symbol: d.symbol,
          description: d.description,
          image: d.image,
          track: d.assignment.track,
          assignment: d.assignment,
          deployer: d.deployer,
          status: "ready",
          budget: 300,
          reserved: 0,
          spent: 0,
          dailyCap: 300,
          autoRun: true,
          createdAt: new Date().toISOString(),
          preview: false,
          example: false,
          tokenMint: d.mint,
        });
        s.ledger.push({
          id: randomUUID(),
          agentId: current.agentId,
          amount: 300,
          type: "included_research_allowance",
          note: "One initial experiment allocation, funded from the operator's prepaid compute budget. Not a SOL/USD conversion.",
          createdAt: new Date().toISOString(),
        });
        s.audit.push({
          id: randomUUID(),
          actor: d.deployer,
          action: "Pump launch finalized",
          detail: `Mint ${d.mint}; launch charge ${LAUNCH_LAMPORTS} lamports; fee recipient ${COMPUTE_WALLET}; transaction ${current.route.signature}`,
          createdAt: new Date().toISOString(),
        });
      }
    }
    return view(current);
  });
}
export async function preparePumpRoute(actor: Actor, id: string) {
  const d = await refreshPumpLaunch(actor, id);
  if (!d.create.finalized)
    throw new DomainError("Wait for token creation to finalize first.", 409);
  if (d.route?.finalized) return d;
  const c = pumpConnection();
  if (
    d.route &&
    (await c.getBlockHeight("finalized")) <= d.route.lastValidBlockHeight
  )
    return d;
  const { q } = await pumpConfiguration(c),
    payer = new PublicKey(d.deployer),
    mint = new PublicKey(d.mint);
  const create = await PUMP_SDK.createFeeSharingConfig({
    creator: payer,
    mint,
    pool: null,
  });
  const update = await PUMP_SDK.updateFeeSharesV2({
    authority: payer,
    mint,
    currentShareholders: [payer],
    newShareholders: [{ address: treasury, shareBps: 10000 }],
    quoteMint: quote,
    quoteTokenProgram: q.quoteTokenProgram,
  });
  const route = await pack(c, payer, [
    create,
    update,
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: treasury,
      lamports: LAUNCH_LAMPORTS,
    }),
  ]);
  return transact((s) => {
    const current = owned(s, actor, id);
    if (
      current.route?.messageHash !== d.route?.messageHash ||
      current.route?.finalized
    )
      throw new DomainError("Launch changed. Refresh before signing.", 409);
    current.route = route;
    return view(current);
  });
}
export async function submitPumpLaunch(
  actor: Actor,
  id: string,
  stage: "create" | "route",
  signed: string,
) {
  const d = owned(await readState(), actor, id),
    expected = d[stage];
  if (!expected) throw new DomainError("Prepare this launch step first.", 409);
  if (expected.finalized) return view(d);
  const validated = validateSignedLaunch(expected, signed, actor.wallet),
    c = pumpConnection();
  if (stage === "route" && !d.create.finalized)
    throw new DomainError("Token creation is not finalized.", 409);
  // Save the expected signature before broadcast: a timeout can safely be reconciled or re-broadcast.
  await transact((s) => {
    const current = owned(s, actor, id)[stage];
    if (!current || current.messageHash !== expected.messageHash)
      throw new DomainError(
        "Transaction expired or was replaced. Refresh.",
        409,
      );
    if (current.signature && current.signature !== validated.signature)
      throw new DomainError("Another signature was already submitted.", 409);
    current.signature = validated.signature;
  });
  try {
    await c.sendRawTransaction(validated.raw, {
      skipPreflight: false,
      maxRetries: 2,
    });
  } catch {
    // Never turn an uncertain network response into permission to pay twice.
    return {
      ...view(owned(await readState(), actor, id)),
      notice:
        "Submission is not confirmed yet. Refresh this launch; do not start another payment.",
    };
  }
  return refreshPumpLaunch(actor, id);
}
