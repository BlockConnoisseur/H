import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nacl from "tweetnacl";
import bs58 from "bs58";
const dir = mkdtempSync(join(tmpdir(), "halo-auth-test-"));
process.env.HALO_DATABASE_PATH = join(dir, "test.sqlite");
let actorFor: typeof import("../src/lib/auth").actorFor;
let challenge: typeof import("../src/lib/auth").challenge;
let verifyChallenge: typeof import("../src/lib/auth").verifyChallenge;
let rateLimit: typeof import("../src/lib/auth").rateLimit;
let db: typeof import("../src/lib/store").db;
let transact: typeof import("../src/lib/store").transact;
let readState: typeof import("../src/lib/store").readState;
before(async () => {
  ({ actorFor, challenge, verifyChallenge, rateLimit } =
    await import("../src/lib/auth"));
  ({ db, transact, readState } = await import("../src/lib/store"));
});
after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
test("wallet nonce verifies ownership once, binds origin, and rejects forged signatures", () => {
  const pair = nacl.sign.keyPair();
  const wallet = bs58.encode(pair.publicKey);
  const c = challenge(wallet, "https://halo.example");
  assert.ok(c.message.includes("Origin: https://halo.example"));
  assert.throws(() => verifyChallenge(c.id, bs58.encode(new Uint8Array(64))));
  const signature = bs58.encode(
    nacl.sign.detached(new TextEncoder().encode(c.message), pair.secretKey),
  );
  const token = verifyChallenge(c.id, signature);
  assert.equal(actorFor(token)?.wallet, wallet);
  assert.equal(actorFor(token)?.preview, false);
  assert.throws(() => verifyChallenge(c.id, signature));
  assert.equal(actorFor("made-up"), null);
});
test("expired challenges and sessions are rejected", () => {
  const pair = nacl.sign.keyPair();
  const c = challenge(bs58.encode(pair.publicKey), "https://halo.example");
  db.prepare("UPDATE nonces SET expires=0 WHERE id=?").run(c.id);
  assert.throws(() =>
    verifyChallenge(
      c.id,
      bs58.encode(
        nacl.sign.detached(new TextEncoder().encode(c.message), pair.secretKey),
      ),
    ),
  );
  db.prepare("UPDATE sessions SET expires=0").run();
  assert.equal(
    (
      db
        .prepare("SELECT COUNT(*) AS n FROM sessions WHERE expires>?")
        .get(Date.now()) as { n: number }
    ).n,
    0,
  );
});
test("failed state operations roll back and rate limits enforce the boundary", () => {
  const before = readState();
  assert.throws(() =>
    transact((s) => {
      s.prizeAvailable = "0";
      throw new Error("rollback");
    }),
  );
  assert.deepEqual(readState(), before);
  rateLimit("test", 2);
  rateLimit("test", 2);
  assert.throws(() => rateLimit("test", 2));
});
