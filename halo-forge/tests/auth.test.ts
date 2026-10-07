import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nacl from "tweetnacl";
import bs58 from "bs58";
const dir = mkdtempSync(join(tmpdir(), "halo-auth-test-"));
process.env.HALO_DATABASE_DRIVER = "sqlite";
process.env.HALO_DATABASE_PATH = join(dir, "test.sqlite");
let actorFor: typeof import("../src/lib/auth").actorFor;
let challenge: typeof import("../src/lib/auth").challenge;
let verifyChallenge: typeof import("../src/lib/auth").verifyChallenge;
let rateLimit: typeof import("../src/lib/auth").rateLimit;
let query: typeof import("../src/lib/store").query;
let closeStore: typeof import("../src/lib/store").closeStore;
let transact: typeof import("../src/lib/store").transact;
let readState: typeof import("../src/lib/store").readState;
before(async () => {
  ({ actorFor, challenge, verifyChallenge, rateLimit } =
    await import("../src/lib/auth"));
  ({ query, closeStore, transact, readState } =
    await import("../src/lib/store"));
});
after(async () => {
  await closeStore();
  rmSync(dir, { recursive: true, force: true });
});
test("wallet nonce verifies ownership once, binds origin, and rejects forged signatures", async () => {
  const pair = nacl.sign.keyPair();
  const wallet = bs58.encode(pair.publicKey);
  const c = await challenge(wallet, "https://halo.example");
  assert.ok(c.message.includes("Origin: https://halo.example"));
  await assert.rejects(() =>
    verifyChallenge(c.id, bs58.encode(new Uint8Array(64))),
  );
  const signature = bs58.encode(
    nacl.sign.detached(new TextEncoder().encode(c.message), pair.secretKey),
  );
  const token = await verifyChallenge(c.id, signature);
  assert.equal((await actorFor(token))?.wallet, wallet);
  assert.equal((await actorFor(token))?.preview, false);
  await assert.rejects(() => verifyChallenge(c.id, signature));
  assert.equal(await actorFor("made-up"), null);
});
test("expired challenges and sessions are rejected", async () => {
  const pair = nacl.sign.keyPair();
  const c = await challenge(
    bs58.encode(pair.publicKey),
    "https://halo.example",
  );
  await query("UPDATE halo_private.nonces SET expires=0 WHERE id=$1", [c.id]);
  await assert.rejects(() =>
    verifyChallenge(
      c.id,
      bs58.encode(
        nacl.sign.detached(new TextEncoder().encode(c.message), pair.secretKey),
      ),
    ),
  );
  await query("UPDATE halo_private.sessions SET expires=0");
  const [row] = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM halo_private.sessions WHERE expires>$1",
    [Date.now()],
  );
  assert.equal(row.n, 0);
});
test("failed state operations roll back and rate limits enforce the boundary", async () => {
  const before = await readState();
  await assert.rejects(() =>
    transact((s) => {
      s.prizeAvailable = "0";
      throw new Error("rollback");
    }),
  );
  assert.deepEqual(await readState(), before);
  await rateLimit("test", 2);
  await rateLimit("test", 2);
  await assert.rejects(() => rateLimit("test", 2));
});
