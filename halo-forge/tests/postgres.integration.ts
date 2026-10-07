import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  query,
  transact,
  readState,
  closeStore,
  storageDriver,
} from "../src/lib/store";
import {
  actorFor,
  challenge,
  verifyChallenge,
  deleteSession,
  rateLimit,
} from "../src/lib/auth";

// Explicitly opt-in against a migrated database. All fixtures have unique IDs
// and are removed in finally blocks; never reset a remote table or app state.
assert.equal(storageDriver, "postgres");
after(closeStore);

test("Supabase restricts data access to the server role", async () => {
  const [row] = await query<{
    role: string;
    superuser: boolean;
    bypass: boolean;
    anon: boolean;
    authenticated: boolean;
  }>(`
    SELECT current_user AS role, rolsuper AS superuser, rolbypassrls AS bypass,
      has_schema_privilege('anon','halo_private','USAGE') AS anon,
      has_schema_privilege('authenticated','halo_private','USAGE') AS authenticated
    FROM pg_roles WHERE rolname=current_user`);
  assert.equal(row.role, "halo_app");
  assert.equal(row.superuser, false);
  assert.equal(row.bypass, false);
  assert.equal(row.anon, false);
  assert.equal(row.authenticated, false);
  await assert.rejects(query("SELECT id FROM auth.users LIMIT 0"), {
    code: "42501",
  });
});

test("concurrent state writes preserve every update and roll back failures", async () => {
  const key = `db-check-${randomUUID()}`;
  try {
    await transact((s) => {
      s.commands[key] = {
        actor: "integration-check",
        fingerprint: key,
        result: 0,
      };
    });
    await Promise.all(
      Array.from({ length: 12 }, () =>
        transact((s) => {
          s.commands[key].result = Number(s.commands[key].result) + 1;
        }),
      ),
    );
    assert.equal((await readState()).commands[key].result, 12);
    await assert.rejects(
      transact((s) => {
        s.commands[key].result = 999;
        throw new Error("intentional rollback");
      }),
      /intentional rollback/,
    );
    assert.equal((await readState()).commands[key].result, 12);
  } finally {
    await transact((s) => {
      delete s.commands[key];
    });
  }
});

test("wallet nonce replay races issue exactly one usable session", async () => {
  const pair = nacl.sign.keyPair();
  const wallet = bs58.encode(pair.publicKey);
  const c = await challenge(wallet, "https://integration.invalid");
  try {
    const signature = bs58.encode(
      nacl.sign.detached(new TextEncoder().encode(c.message), pair.secretKey),
    );
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => verifyChallenge(c.id, signature)),
    );
    const accepted = results.filter((r) => r.status === "fulfilled");
    assert.equal(accepted.length, 1);
    const token = accepted[0].value;
    assert.equal((await actorFor(token))?.wallet, wallet);
    await deleteSession(token);
    assert.equal(await actorFor(token), null);
  } finally {
    await query("DELETE FROM halo_private.sessions WHERE wallet=$1", [wallet]);
    await query("DELETE FROM halo_private.nonces WHERE id=$1", [c.id]);
  }
});

test("concurrent rate limits do not lose increments", async () => {
  const key = `db-check-${randomUUID()}`;
  try {
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () => rateLimit(key, 3)),
    );
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 3);
    const [row] = await query<{ count: number }>(
      "SELECT count FROM halo_private.rate_limits WHERE key=$1",
      [key],
    );
    assert.equal(row.count, 8);
  } finally {
    await query("DELETE FROM halo_private.rate_limits WHERE key=$1", [key]);
  }
});
