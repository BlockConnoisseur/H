import { randomUUID } from "node:crypto";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  VersionedTransaction,
  SendTransactionError,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  OnlinePumpSdk,
  PUMP_SDK,
  PUMP_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
  bondingCurvePda,
  canonicalPumpPoolPdaWithQuote,
  feeSharingConfigPda,
  computeFeesBps,
  isSharingConfigEditable,
  creatorVaultPda,
} from "@pump-fun/pump-sdk";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import BN from "bn.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
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
import { sweepCreatorFee } from "./pump-sweep";
import {
  pumpComputeBudget,
  canReusePumpTransaction,
} from "./pump-compute-budget";

export type LaunchTx = {
  wire: string;
  messageHash: string;
  blockhash: string;
  lastValidBlockHeight: number;
  signature?: string;
  finalized?: boolean;
  confirmation?:
    "unsigned" | "pending" | "confirming" | "finalized" | "failed" | "expired";
};
export type PumpDraft = {
  id: string;
  requestId?: string;
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
  if (!d)
    throw new DomainError("Launch not found for this connected wallet.", 404);
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
    notice: d.abandoned
      ? "This creation transaction expired without landing. Your setup is saved. Refresh expired creation to get a new transaction and mint address."
      : undefined,
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
export async function packPumpTransaction(
  c: Connection,
  payer: PublicKey,
  ix: TransactionInstruction[],
  mint?: Keypair,
): Promise<LaunchTx> {
  const block = await c.getLatestBlockhash("confirmed");
  const tx = new Transaction({ ...block, feePayer: payer }).add(
    ...pumpComputeBudget(),
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
      `Wallet transaction simulation failed (${JSON.stringify(simulation.value.err)}). Nothing was submitted. ${simulation.value.logs?.some((line) => /insufficient (funds|lamports)/i.test(line)) ? "Your wallet needs more SOL for the launch charge, fees and account rent." : "The on-chain program rejected this step; your existing launch is saved."}`,
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
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(Buffer.from(signed, "base64"));
  } catch {
    throw new DomainError("Invalid signed transaction.");
  }
  const message = tx.message.serialize();
  if (tx.message.staticAccountKeys[0]?.toBase58() !== deployer)
    throw new DomainError(
      "The signing wallet differs from this launch's deployer. Select the original deployer wallet.",
      403,
    );
  if (hash(Buffer.from(message).toString("base64")) !== expected.messageHash)
    throw new DomainError(
      tx.message.recentBlockhash !== expected.blockhash
        ? "The signed transaction has a different blockhash from the prepared launch. Nothing was submitted; resume this launch for a fresh approval."
        : "The wallet changed the prepared transaction's message. Nothing was submitted. Your launch is saved; the operator can inspect the signing diagnostic.",
      403,
    );
  for (let i = 0; i < tx.message.header.numRequiredSignatures; i++) {
    const signature = tx.signatures[i];
    if (!signature || signature.every((b) => b === 0))
      throw new DomainError(
        `The wallet returned a transaction missing a signature (${i === 0 ? "deployer" : "token mint"}). Nothing was submitted.`,
        403,
      );
    if (
      !nacl.sign.detached.verify(
        message,
        signature,
        tx.message.staticAccountKeys[i].toBytes(),
      )
    )
      throw new DomainError(
        "The wallet signature does not verify against the returned transaction. Nothing was submitted.",
        403,
      );
  }
  // Verify and broadcast the exact wallet bytes, without legacy Transaction
  // recompilation (which can reorder account metadata and invalidate signatures).
  return {
    raw: Buffer.from(signed, "base64"),
    signature: bs58.encode(tx.signatures[0]),
  };
}
export function launchSigningDiagnostic(expected: LaunchTx, signed: string) {
  try {
    const received = VersionedTransaction.deserialize(
      Buffer.from(signed, "base64"),
    );
    const prepared = VersionedTransaction.deserialize(
      Buffer.from(expected.wire, "base64"),
    );
    const summarize = (tx: VersionedTransaction) => ({
      version: tx.version,
      messageHash: hash(Buffer.from(tx.message.serialize()).toString("base64")),
      blockhash: tx.message.recentBlockhash,
      signerKeys: tx.message.staticAccountKeys
        .slice(0, tx.message.header.numRequiredSignatures)
        .map((k) => k.toBase58()),
      validSignatures: tx.signatures.map((sig, i) =>
        nacl.sign.detached.verify(
          tx.message.serialize(),
          sig,
          tx.message.staticAccountKeys[i].toBytes(),
        ),
      ),
      instructions: tx.message.compiledInstructions.map((ix) => ({
        program: tx.message.staticAccountKeys[ix.programIdIndex]?.toBase58(),
        accounts: ix.accountKeyIndexes.map((i) =>
          tx.message.staticAccountKeys[i]?.toBase58(),
        ),
        dataHash: hash(Buffer.from(ix.data).toString("base64")),
      })),
    });
    return { prepared: summarize(prepared), received: summarize(received) };
  } catch {
    return { malformed: true };
  }
}
export async function latestPumpLaunch(actor: Actor) {
  requireActor(actor);
  const d = drafts(await readState()).findLast(
    (d) => d.deployer === actor.wallet,
  );
  return d ? view(d) : null;
}
export async function savedPumpLaunches(actor: Actor, id?: string) {
  requireActor(actor);
  const state = await readState();
  return {
    launch: id ? view(owned(state, actor, id)) : null,
    launches: drafts(state)
      .filter((d) => d.deployer === actor.wallet && !d.agentId && !d.abandoned)
      .map((d) => ({ id: d.id, name: d.name, symbol: d.symbol, mint: d.mint })),
  };
}
export function findLaunchForRequest(
  state: State,
  actor: Actor,
  requestId?: string,
) {
  return drafts(state).findLast(
    (d) =>
      d.deployer === actor.wallet &&
      !d.abandoned &&
      (requestId ? d.requestId === requestId : !d.agentId),
  );
}
export async function preparePumpLaunch(
  actor: Actor,
  raw: unknown,
  requestId?: string,
) {
  requireActor(actor);
  if (process.env.HALO_PUMP_LAUNCH_ENABLED !== "true")
    throw new DomainError(
      "Paid launches are not enabled yet. The live transaction checks must pass first.",
      503,
    );
  const input = inputSchema.parse(raw),
    c = pumpConnection();
  if (requestId) z.string().uuid().parse(requestId);
  const existing = findLaunchForRequest(await readState(), actor, requestId);
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
  const create = await packPumpTransaction(c, payer, [ix], mint);
  return transact((s) => {
    const raced = findLaunchForRequest(s, actor, requestId);
    if (raced) return view(raced);
    if (
      drafts(s).filter(
        (d) => d.deployer === actor.wallet && !d.abandoned && !d.agentId,
      ).length >= 5
    )
      throw new DomainError(
        "You have five unfinished launches. Finish a saved launch before starting another.",
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
      requestId,
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
export async function launchConfirmation(
  c: Connection,
  tx: LaunchTx,
): Promise<NonNullable<LaunchTx["confirmation"]>> {
  if (tx.finalized) return "finalized";
  if (!tx.signature) return "unsigned";
  const status = (
    await c.getSignatureStatuses([tx.signature], {
      searchTransactionHistory: true,
    })
  ).value[0];
  if (status?.err) return "failed";
  if (status?.confirmationStatus === "finalized") return "finalized";
  // An observed transaction can still be finalizing after its blockhash expires.
  if (status) return "confirming";
  return (await c.getBlockHeight("finalized")) > tx.lastValidBlockHeight
    ? "expired"
    : "pending";
}
export async function refreshPumpLaunch(
  actor: Actor,
  id: string,
  connection?: Connection,
) {
  const d = owned(await readState(), actor, id);
  if (d.abandoned) return view(d);
  const c = connection ?? pumpConnection();
  const createConfirmation = await launchConfirmation(c, d.create);
  const createOk = createConfirmation === "finalized";
  if (!createOk) {
    if (
      (await c.getBlockHeight("finalized")) > d.create.lastValidBlockHeight &&
      !(await c.getAccountInfo(new PublicKey(d.mint), "finalized"))
    ) {
      return transact((s) => {
        const current = owned(s, actor, id);
        if (
          !current.create.finalized &&
          current.create.messageHash === d.create.messageHash
        )
          current.abandoned = true;
        return view(current);
      });
    }
    return {
      ...view(d),
      create: { ...d.create, confirmation: createConfirmation },
    };
  }
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
  const routeConfirmation = d.route
    ? await launchConfirmation(c, d.route)
    : undefined;
  const routeOk = routeConfirmation === "finalized";
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
    return {
      ...view(current),
      create: { ...current.create, confirmation: createConfirmation },
      route: current.route
        ? { ...current.route, confirmation: routeConfirmation }
        : undefined,
    };
  });
}
export async function preparePumpRoute(actor: Actor, id: string) {
  const d = await refreshPumpLaunch(actor, id);
  if (!d.create.finalized)
    throw new DomainError("Wait for token creation to finalize first.", 409);
  if (d.route?.finalized) return d;
  if (d.route?.confirmation === "confirming") return d;
  const c = pumpConnection();
  if (
    d.route &&
    canReusePumpTransaction(d.route, await c.getBlockHeight("finalized"))
  )
    return d;
  const { q, sdk } = await pumpConfiguration(c),
    payer = new PublicKey(d.deployer),
    mint = new PublicKey(d.mint);
  const curve = await sdk.fetchBondingCurve(mint);
  const create = await PUMP_SDK.createFeeSharingConfig({
    creator: payer,
    mint,
    pool: curve.complete ? canonicalPumpPoolPdaWithQuote(mint, quote) : null,
  });
  const update = await PUMP_SDK.updateFeeSharesV2({
    authority: payer,
    mint,
    currentShareholders: [payer],
    newShareholders: [{ address: treasury, shareBps: 10000 }],
    quoteMint: quote,
    quoteTokenProgram: q.quoteTokenProgram,
  });
  const route = await packPumpTransaction(c, payer, [
    sweepCreatorFee(payer, mint, curve.creator, quote, q.quoteTokenProgram),
    create,
    ...[payer, creatorVaultPda(feeSharingConfigPda(mint))].map((owner) =>
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        getAssociatedTokenAddressSync(quote, owner, true, q.quoteTokenProgram),
        owner,
        quote,
        q.quoteTokenProgram,
      ),
    ),
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
      current.route?.signature !== d.route?.signature ||
      current.route?.finalized
    )
      throw new DomainError("Launch changed. Refresh before signing.", 409);
    current.route = route;
    return view(current);
  });
}
export async function checkPumpSigning(
  actor: Actor,
  id: string,
  stage: "create" | "route",
) {
  const d = await refreshPumpLaunch(actor, id);
  if (d.abandoned) throw new DomainError(d.notice!, 409);
  const tx = d[stage];
  if (!tx) throw new DomainError("Prepare this launch step first.", 409);
  if (tx.finalized)
    throw new DomainError(
      "This step already finalized. Refresh confirmation to continue.",
      409,
    );
  if (
    (await pumpConnection().getBlockHeight("confirmed")) >=
    tx.lastValidBlockHeight - 10
  )
    throw new DomainError(
      "This transaction is expiring. Refresh the launch step before signing; no payment was submitted.",
      409,
    );
  return d;
}
export async function submitPumpLaunch(
  actor: Actor,
  id: string,
  stage: "create" | "route",
  signed: string,
) {
  const d = owned(await readState(), actor, id),
    expected = d[stage];
  if (d.abandoned) return view(d);
  if (!expected) throw new DomainError("Prepare this launch step first.", 409);
  if (expected.finalized) return view(d);
  let validated: ReturnType<typeof validateSignedLaunch>;
  try {
    validated = validateSignedLaunch(expected, signed, actor.wallet);
  } catch (e) {
    // Public instruction metadata and hashes only; never log signed payloads,
    // session cookies, signatures, credentials or source patches.
    console.warn(
      "pump_signature_rejected",
      JSON.stringify({
        id,
        stage,
        ...launchSigningDiagnostic(expected, signed),
      }),
    );
    throw e;
  }
  const c = pumpConnection();
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
  if ((await c.getBlockHeight("finalized")) > expected.lastValidBlockHeight) {
    const current = await refreshPumpLaunch(actor, id);
    return {
      ...current,
      notice:
        current.notice ||
        "This transaction has expired. Refresh this launch step before signing again.",
    };
  }
  // Repeated submissions use identical signed bytes. If a node already sees
  // the transaction, only reconcile it; never create another payment.
  const confirmation = await launchConfirmation(c, {
    ...expected,
    signature: validated.signature,
  });
  if (confirmation !== "pending") return refreshPumpLaunch(actor, id);
  try {
    await c.sendRawTransaction(validated.raw, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 8,
    });
  } catch (e) {
    console.warn(
      "pump_broadcast_unconfirmed",
      JSON.stringify({
        id,
        stage,
        preflightRejected: e instanceof SendTransactionError,
        programFailures:
          e instanceof SendTransactionError
            ? e.logs?.filter((line) => /^Program \w+ failed:/.test(line))
            : undefined,
      }),
    );
    // Never turn an uncertain network response into permission to pay twice.
    return {
      ...view(owned(await readState(), actor, id)),
      notice:
        "Submission is not confirmed yet. Refresh this launch; do not start another payment.",
    };
  }
  return refreshPumpLaunch(actor, id);
}

export async function expirePumpDrafts() {
  const pending = drafts(await readState()).filter(
    (d) => !d.abandoned && !d.agentId && !d.create.finalized,
  );
  if (!pending.length) return;
  const c = pumpConnection(),
    height = await c.getBlockHeight("finalized");
  for (const draft of pending) {
    if (height <= draft.create.lastValidBlockHeight) continue;
    // Release only after finality proves the signature expired AND no mint exists.
    // A timeout or a merely missing signature is never enough to free a paid launch.
    if (await c.getAccountInfo(new PublicKey(draft.mint), "finalized"))
      continue;
    await transact((s) => {
      const current = drafts(s).find((d) => d.id === draft.id);
      if (
        current &&
        !current.agentId &&
        !current.create.finalized &&
        current.create.messageHash === draft.create.messageHash
      )
        current.abandoned = true;
    });
  }
}
