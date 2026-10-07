import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  Connection,
} from "@solana/web3.js";
import { feeSharingConfigPda } from "@pump-fun/pump-sdk";
import BN from "bn.js";
import { NextRequest } from "next/server";
import { hash, ZEC_MINT } from "../src/lib/domain";
import {
  splitCreatorReceipt,
  COMPUTE_WALLET,
  LAUNCH_LAMPORTS,
} from "../src/lib/pump-policy";
const dir = mkdtempSync(join(tmpdir(), "halo-pump-test-"));
process.env.HALO_DATABASE_DRIVER = "sqlite";
process.env.HALO_DATABASE_PATH = join(dir, "test.sqlite");
process.env.HALO_EMPTY_STATE = "true";
process.env.HALO_APP_ORIGIN = "http://localhost:3210";
let pump: typeof import("../src/lib/pump-launch"),
  fees: typeof import("../src/lib/pump-fees"),
  route: typeof import("../src/app/api/pump/[...path]/route"),
  store: typeof import("../src/lib/store");
before(async () => {
  pump = await import("../src/lib/pump-launch");
  fees = await import("../src/lib/pump-fees");
  route = await import("../src/app/api/pump/[...path]/route");
  store = await import("../src/lib/store");
});
after(async () => {
  await store.closeStore();
  rmSync(dir, { recursive: true, force: true });
});
test("public wallets can prepare launches without an operator launch, while the enable flag and real-wallet check remain", async () => {
  const previous = process.env.HALO_PUMP_LAUNCH_ENABLED;
  const actor = {
    wallet: Keypair.generate().publicKey.toBase58(),
    preview: false,
    reviewer: false,
  };
  try {
    process.env.HALO_PUMP_LAUNCH_ENABLED = "false";
    await assert.rejects(
      pump.preparePumpLaunch(actor, {}),
      /Paid launches are not enabled/,
    );
    process.env.HALO_PUMP_LAUNCH_ENABLED = "true";
    await assert.rejects(
      pump.preparePumpLaunch({ ...actor, preview: true }, {}),
      /real wallet signature/,
    );
    // Input validation is reached before RPC with no completed operator launch.
    await assert.rejects(pump.preparePumpLaunch(actor, {}), {
      name: "ZodError",
    });
    assert.equal((await store.readState()).pumpLaunches?.length ?? 0, 0);
  } finally {
    if (previous === undefined) delete process.env.HALO_PUMP_LAUNCH_ENABLED;
    else process.env.HALO_PUMP_LAUNCH_ENABLED = previous;
  }
});
test("creator receipt splitting conserves all ZEC base units, including rounding and large values", () => {
  for (const raw of [
    "0",
    "1",
    "204",
    "205",
    "100000000",
    "9999999999999999999999999",
  ]) {
    const p = splitCreatorReceipt(raw);
    assert.equal(BigInt(p.sharedRaw) + BigInt(p.agentRaw), BigInt(raw));
    assert.equal(BigInt(p.sharedRaw), (BigInt(raw) * 100n) / 205n);
  }
  assert.throws(() => splitCreatorReceipt("-1"));
  assert.throws(() => splitCreatorReceipt("0.1"));
});
test("launch signature binding rejects changed fee recipient, amount, payer and partial signatures", () => {
  const owner = Keypair.generate(),
    other = Keypair.generate();
  const build = (
    to = new PublicKey(COMPUTE_WALLET),
    amount = LAUNCH_LAMPORTS,
  ) =>
    new Transaction({
      feePayer: owner.publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
    }).add(
      SystemProgram.transfer({
        fromPubkey: owner.publicKey,
        toPubkey: to,
        lamports: amount,
      }),
    );
  const tx = build();
  const expected = {
    wire: "",
    messageHash: hash(tx.serializeMessage().toString("base64")),
    blockhash: tx.recentBlockhash!,
    lastValidBlockHeight: 1,
  };
  assert.throws(
    () =>
      pump.validateSignedLaunch(
        expected,
        tx.serialize({ requireAllSignatures: false }).toString("base64"),
        owner.publicKey.toBase58(),
      ),
    /missing a signature/,
  );
  tx.sign(owner);
  assert.ok(
    pump.validateSignedLaunch(
      expected,
      tx.serialize().toString("base64"),
      owner.publicKey.toBase58(),
    ).signature,
  );
  assert.throws(
    () =>
      pump.validateSignedLaunch(
        expected,
        tx.serialize().toString("base64"),
        other.publicKey.toBase58(),
      ),
    /differs/,
  );
  for (const modified of [build(other.publicKey), build(undefined, 1)]) {
    modified.sign(owner);
    assert.throws(
      () =>
        pump.validateSignedLaunch(
          expected,
          modified.serialize().toString("base64"),
          owner.publicKey.toBase58(),
        ),
      /differs/,
    );
  }
});
test("fee accounting accepts only the agent mint, ZEC, its sharing PDA and the fixed compute recipient", () => {
  const mint = Keypair.generate().publicKey;
  const event = {
    timestamp: new BN(1),
    mint,
    sharingConfig: feeSharingConfigPda(mint),
    admin: Keypair.generate().publicKey,
    quoteMint: new PublicKey(ZEC_MINT),
    distributed: new BN(205),
    shareholders: [{ address: new PublicKey(COMPUTE_WALLET), shareBps: 10000 }],
  };
  assert.deepEqual(fees.distributionReceipt(event, mint.toBase58()), {
    receivedRaw: "205",
    sharedRaw: "100",
    agentRaw: "105",
  });
  assert.equal(
    fees.distributionReceipt(
      { ...event, quoteMint: Keypair.generate().publicKey },
      mint.toBase58(),
    ),
    null,
  );
  assert.equal(
    fees.distributionReceipt(
      {
        ...event,
        shareholders: [
          { address: Keypair.generate().publicKey, shareBps: 10000 },
        ],
      },
      mint.toBase58(),
    ),
    null,
  );
  assert.equal(
    fees.distributionReceipt(event, Keypair.generate().publicKey.toBase58()),
    null,
  );
});
test("live launch API rejects cross-origin and unsigned callers before accessing RPC", async () => {
  for (const [origin, status] of [
    ["https://evil.example", 403],
    ["http://localhost:3210", 401],
  ] as const) {
    const response = await route.POST(
      new NextRequest("http://localhost:3210/api/pump/actions", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare", input: {} }),
      }),
    );
    assert.equal(response.status, status);
  }
  const state = await store.readState();
  assert.equal(state.pumpLaunches?.length ?? 0, 0);
  assert.equal(state.feeReceipts?.length ?? 0, 0);
});
test("public metadata does not expose signed transactions, deployer secrets or private research state", async () => {
  const { assignmentFor } = await import("../src/lib/research");
  await store.transact((s) => {
    s.pumpLaunches = [
      {
        id: "test-id",
        deployer: COMPUTE_WALLET,
        mint: Keypair.generate().publicKey.toBase58(),
        name: "Test Coin",
        symbol: "TEST",
        description: "A test of source metadata.",
        image: null,
        assignment: assignmentFor("S1-window", 2, 4),
        createdAt: new Date().toISOString(),
        create: {
          wire: "PRIVATE",
          messageHash: "PRIVATE",
          blockhash: "PRIVATE",
          lastValidBlockHeight: 1,
        },
      },
    ];
  });
  const response = await route.GET(
    new NextRequest("http://localhost:3210/api/pump/metadata/test-id"),
  );
  const metadata = await response.json();
  assert.equal(metadata.name, "Test Coin");
  assert.equal(JSON.stringify(metadata).includes("PRIVATE"), false);
  assert.equal("create" in metadata, false);
});
test("expired launch stays visible to its owner and can be inspected without another broadcast", async () => {
  const { assignmentFor } = await import("../src/lib/research");
  const actor = {
    wallet: Keypair.generate().publicKey.toBase58(),
    preview: false,
    reviewer: false,
  };
  const id = "expired-launch";
  const priorRpc = process.env.SOLANA_MAINNET_RPC_URL;
  process.env.SOLANA_MAINNET_RPC_URL = "https://rpc.invalid";
  try {
    await store.transact((s) => {
      s.pumpLaunches = [
        {
          id,
          deployer: actor.wallet,
          mint: Keypair.generate().publicKey.toBase58(),
          name: "Preserved Test",
          symbol: "TEST",
          description: "Keep the original launch setup.",
          image: null,
          assignment: assignmentFor("S1-window"),
          createdAt: new Date().toISOString(),
          create: {
            wire: "PRIVATE",
            messageHash: "hash",
            blockhash: "expired",
            lastValidBlockHeight: 100,
            signature: "unlanded",
          },
        },
      ];
    });
    let mintExists = false;
    const broadcast = mock.fn(async () => {
      throw new Error("Must not broadcast an expired draft");
    });
    const c = {
      getSignatureStatuses: async () => ({
        context: { slot: 200 },
        value: [null],
      }),
      getBlockHeight: async () => 200,
      getAccountInfo: async () =>
        mintExists
          ? {
              data: Buffer.alloc(0),
              executable: false,
              lamports: 1,
              owner: new PublicKey(COMPUTE_WALLET),
              rentEpoch: 1,
            }
          : null,
      sendRawTransaction: broadcast,
    } as unknown as Connection;
    const refreshed = await pump.refreshPumpLaunch(actor, id, c);
    assert.equal(refreshed.abandoned, true);
    assert.match(refreshed.notice!, /expired without landing/);
    assert.equal((await pump.latestPumpLaunch(actor))?.name, "Preserved Test");
    assert.equal((await pump.refreshPumpLaunch(actor, id)).id, id);
    assert.equal(
      (await pump.submitPumpLaunch(actor, id, "create", "unused")).abandoned,
      true,
    );
    await assert.rejects(pump.checkPumpSigning(actor, id, "create"), /expired/);
    await assert.rejects(
      pump.refreshPumpLaunch({ ...actor, wallet: COMPUTE_WALLET }, id),
      /not found for this connected wallet/,
    );
    assert.equal(broadcast.mock.callCount(), 0);
    // A minted token must never be discarded just because its signature lookup is temporarily missing.
    await store.transact((s) => {
      s.pumpLaunches![0].abandoned = false;
    });
    mintExists = true;
    assert.equal((await pump.refreshPumpLaunch(actor, id, c)).abandoned, false);
  } finally {
    mock.restoreAll();
    if (priorRpc === undefined) delete process.env.SOLANA_MAINNET_RPC_URL;
    else process.env.SOLANA_MAINNET_RPC_URL = priorRpc;
  }
});
